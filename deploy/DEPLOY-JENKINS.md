# 用 Jenkins 部署 RetailHOT 到 ai_demo

和 Raphare 用同一套方式：Jenkins 打发布包 → SSH 上传到服务器 → `sudo retailhot-deploy` → Docker Compose 构建并重启。nginx 终止 HTTPS，反代到 `127.0.0.1:3000`。

## 服务器上有什么

| 项目 | 位置 |
|---|---|
| 配置（密钥） | `/etc/retailhot/.env`，root 所有、权限 600，模板是 `deploy/retailhot.env.example`。**不要提交到 Git** |
| 发布记录 | `/opt/retailhot-releases/<时间戳>-<提交号>`，`current` 指向当前版本，保留 5 个 |
| 容器 | Compose 项目 `aihot`：`setup`（迁移，跑完退出）、`api`、`worker`、`web`（只监听 127.0.0.1:3000）。**不启动自带的 `db` 容器** |
| 数据库 | 宿主机的 PostgreSQL 16，库和角色都叫 `retailhot`（连接数上限 30，每个进程的连接池上限 6）。容器通过 `host.docker.internal` 连它，`pg_hba.conf` 里只放行 Docker 私有网段 `172.16.0.0/12`。覆盖文件是 `deploy/compose.host-db.yml`，由 `.env` 里的 `COMPOSE_FILE` 自动合并 |
| 文件 | Docker 卷 `aihot_data`（上传的图片、缓存）。`docker compose down` 不会删，`down -v` 会 |
| nginx | `/etc/nginx/conf.d/retailhot.conf`，由 `deploy/nginx.conf.template` 生成；证书用 `/etc/nginx/cert/butik.com.cn/` 的泛域名证书 |

## 每次发布做了什么

1. Jenkins：检出 `retailhot` 分支 → `git archive` 打包 → 上传 → `sudo retailhot-deploy`。
2. `retailhot-deploy` 解压到 `/opt/retailhot-releases/<版本>`，执行其中的 `deploy/install.sh`。
3. `install.sh`：检查 `/etc/retailhot/.env` → 更新 nginx 配置（有变化才重载，检查不过会恢复旧配置）→ `docker compose build`（npm 走国内镜像）→ `up -d`（`setup` 先跑数据库迁移，失败则不会切换服务）→ 健康检查。

网页的构建（`npm run build -w @aihot/web`）在 Docker 构建里执行，失败时旧版本继续运行。类型检查不在 Jenkins 里跑（项目需要 Node 24，这台 Jenkins 只有 Node 22），发版前在本地跑 `npm run typecheck`。

## 回滚

```bash
sudo retailhot-deploy --list
sudo retailhot-deploy --rollback 20260929101500-abcdef123456
```

数据库迁移只向前，回滚不会撤销；项目的迁移都是向后兼容的增量。

## 日常操作

```bash
cd /opt/retailhot-releases/current
sudo docker compose ps
sudo docker compose logs -f --tail 100 api worker web
sudo -u postgres pg_dump retailhot | gzip > retailhot-$(date +%F).sql.gz   # 手动备份（数据库在宿主机上，不在容器里）
sudo -u postgres psql retailhot                                               # 查数据库
```

改了 `/etc/retailhot/.env` 之后，重新启用当前版本才会生效：`sudo retailhot-deploy --rollback <当前版本>`。

## 一次性准备

1. **DNS**：把域名（默认 `retailhot.butik.com.cn`）解析到 `1.13.174.35`。
2. **配置文件**：
   ```bash
   sudo install -d -m 700 /etc/retailhot
   sudo install -m 600 deploy/retailhot.env.example /etc/retailhot/.env
   sudo -e /etc/retailhot/.env     # 填 ADMIN_PASSWORD、SESSION_SECRET、IMG_PROXY_SIGN_SECRET、RETAILHOT_DATABASE_URL、LLM_API_KEY
   ```
   数据库：在宿主机建角色和库，并在 `pg_hba.conf` 里加一行，然后 reload（不用重启）：
   ```bash
   sudo -u postgres psql -c "CREATE ROLE retailhot LOGIN PASSWORD '<openssl rand -hex 32>' CONNECTION LIMIT 30" -c "CREATE DATABASE retailhot OWNER retailhot" -c "REVOKE ALL ON DATABASE retailhot FROM PUBLIC"
   echo "host    retailhot       retailhot       172.16.0.0/12           scram-sha-256" | sudo tee -a /etc/postgresql/16/main/pg_hba.conf
   sudo -u postgres psql -c "select pg_reload_conf()"
   ```
   `.env` 里的 `RETAILHOT_DATABASE_URL` 用同一个密码，主机名写 `host.docker.internal`。
3. **部署脚本和 sudoers**（只允许 `deploy` 用户免密执行这一个命令）：
   ```bash
   sudo install -m 755 deploy/retailhot-deploy.sh /usr/local/sbin/retailhot-deploy
   echo 'deploy ALL=(root) NOPASSWD: /usr/local/sbin/retailhot-deploy' | sudo tee /etc/sudoers.d/retailhot-deploy
   sudo chmod 440 /etc/sudoers.d/retailhot-deploy && sudo visudo -cf /etc/sudoers.d/retailhot-deploy
   ```
4. **Jenkins 任务**：Pipeline script from SCM，仓库 `https://github.com/RaphLorr/AIHOT.git`，分支 `*/retailhot`，Script Path 填 `Jenkinsfile`，GitHub 凭据沿用 `github-token-raph`。参数默认值已经指向 ai_demo 和 `raphare-spike-ssh` 凭据，一般不用改。
