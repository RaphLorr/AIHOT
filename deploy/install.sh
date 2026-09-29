#!/usr/bin/env bash
# 在服务器上启用一个发布版本（由 retailhot-deploy 以 root 调用，工作目录是解压后的发布包）：
#   1. 检查 /etc/retailhot/.env 里的必填项，并确认容器能连上宿主机的 PostgreSQL
#   2. 安装自己的部署脚本和 nginx 站点配置（配置有变化时才重载）
#   3. docker compose 构建镜像并重启（数据库迁移由 setup 容器在每次启动时执行，失败则不会切换服务）
#   4. 健康检查
# 密钥只在 /etc/retailhot/.env，发布包里没有。
set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE=/etc/retailhot/.env
NGINX_CONF=/etc/nginx/conf.d/retailhot.conf
CERT_DIR=/etc/nginx/cert/butik.com.cn
NPM_REGISTRY_MIRROR=https://registry.npmmirror.com

die() { printf '[错误] %s\n' "$*" >&2; exit 1; }
ok() { printf '  ✓ %s\n' "$*"; }
env_get() { grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- || true; }

[ "$(id -u)" -eq 0 ] || die "需要 root 权限"
[ -f "$ENV_FILE" ] || die "找不到 $ENV_FILE，先按 deploy/retailhot.env.example 创建（见 DEPLOY-JENKINS.md）"
command -v docker >/dev/null && docker compose version >/dev/null || die "服务器上没有 docker compose"

echo "[1/4] 检查配置"
for key in SITE_URL SITE_DOMAIN ADMIN_PASSWORD SESSION_SECRET IMG_PROXY_SIGN_SECRET RETAILHOT_DATABASE_URL COMPOSE_FILE LLM_API_KEY; do
  [ -n "$(env_get "$key")" ] || die "$ENV_FILE 里的 $key 还没有填"
done
ADMIN_PASSWORD="$(env_get ADMIN_PASSWORD)"
[ "${#ADMIN_PASSWORD}" -ge 12 ] || die "ADMIN_PASSWORD 至少 12 位"
SITE_DOMAIN="$(env_get SITE_DOMAIN)"
[ "$(env_get PORT)" = "127.0.0.1:3000" ] || die "PORT 必须是 127.0.0.1:3000（网页只给本机的 nginx 用）"
[ "$(env_get TRUST_PROXY)" = "true" ] || die "TRUST_PROXY 必须是 true（前面有 nginx）"
[ -f "$CERT_DIR/fullchain.pem" ] && [ -f "$CERT_DIR/privkey.pem" ] || die "找不到证书 $CERT_DIR"
[ "$(env_get COMPOSE_FILE)" = "docker-compose.yml:deploy/compose.host-db.yml" ] || die "COMPOSE_FILE 必须是 docker-compose.yml:deploy/compose.host-db.yml（用宿主机的 PostgreSQL）"
ok "配置完整，域名 $SITE_DOMAIN"
# 容器要能连上宿主机的库；连不上就在这里停下，不动正在运行的版本。用 compose 会用到的 postgres 镜像里的 psql。
docker run --rm --add-host host.docker.internal:host-gateway postgres:17-alpine \
  psql "$(env_get RETAILHOT_DATABASE_URL)" -Atq -c "select 1" >/dev/null 2>&1 \
  || die "容器连不上宿主机的 PostgreSQL（检查 RETAILHOT_DATABASE_URL 和 pg_hba.conf 里 retailhot 那一行）"
ok "容器能连上宿主机的 PostgreSQL"

echo "[2/4] 安装脚本和 nginx 配置"
install -m 755 "$DIR/deploy/retailhot-deploy.sh" /usr/local/sbin/.retailhot-deploy.new
mv -f /usr/local/sbin/.retailhot-deploy.new /usr/local/sbin/retailhot-deploy
ok "retailhot-deploy"
NEW_CONF="$(mktemp)"
sed -e "s|__SITE_DOMAIN__|$SITE_DOMAIN|g" -e "s|__CERT_DIR__|$CERT_DIR|g" "$DIR/deploy/nginx.conf.template" > "$NEW_CONF"
if ! cmp -s "$NEW_CONF" "$NGINX_CONF" 2>/dev/null; then
  [ -f "$NGINX_CONF" ] && cp -a "$NGINX_CONF" "$NGINX_CONF.bak"
  install -m 644 "$NEW_CONF" "$NGINX_CONF"
  if nginx -t 2>/dev/null; then
    ok "nginx 配置已更新"
    NGINX_RELOAD=1
  else
    if [ -f "$NGINX_CONF.bak" ]; then mv -f "$NGINX_CONF.bak" "$NGINX_CONF"; else rm -f "$NGINX_CONF"; fi
    rm -f "$NEW_CONF"
    nginx -t || true
    die "nginx 配置检查没通过，已恢复原配置"
  fi
else
  ok "nginx 配置无变化"
fi
rm -f "$NEW_CONF"

echo "[3/4] 构建并启动"
cd "$DIR"
ln -sfn "$ENV_FILE" "$DIR/.env"
# 服务器在国内：npm 走国内镜像。compose 项目名固定为 aihot（docker-compose.yml 里），数据卷 db/data 跨版本保留。
docker compose build --build-arg "NPM_REGISTRY=$NPM_REGISTRY_MIRROR"
docker compose up -d --remove-orphans
ok "容器已启动"
[ "${NGINX_RELOAD:-0}" = "1" ] && { systemctl reload nginx && ok "nginx 已重载"; }

echo "[4/4] 健康检查"
for i in $(seq 1 60); do
  if curl -fsS -o /dev/null -m 5 http://127.0.0.1:3000/; then ok "网页 http://127.0.0.1:3000/"; break; fi
  [ "$i" -lt 60 ] || { docker compose ps; docker compose logs --tail 40 setup api web; die "网页 120 秒内没有起来"; }
  sleep 2
done
bad="$(docker compose ps --format '{{.Service}} {{.State}}' | grep -vE '^(setup exited|[a-z]+ running)' || true)"
[ -z "$bad" ] || { docker compose ps; die "有容器不在运行：$bad"; }
ok "api、worker、web 都在运行"
if curl -fsS -o /dev/null -m 10 --resolve "$SITE_DOMAIN:443:127.0.0.1" "https://$SITE_DOMAIN/"; then ok "经 nginx 的 HTTPS https://$SITE_DOMAIN/"; else echo "  ! 经 nginx 的 HTTPS 没通（检查域名解析和证书）"; fi
docker image prune -f >/dev/null
echo "完成。"
