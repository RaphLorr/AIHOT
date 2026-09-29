#!/usr/bin/env bash
# 服务器端的发布脚本，install.sh 会把它安装为 /usr/local/sbin/retailhot-deploy。
# Jenkins 通过 SSH 调用它（sudoers 只允许这一个命令，见 DEPLOY-JENKINS.md）。
#
#   发布：sudo retailhot-deploy /tmp/retailhot-<版本>.tar.gz <版本>
#   回滚：sudo retailhot-deploy --rollback <版本>
#   查看：sudo retailhot-deploy --list
#
# 发布包会解压到 /opt/retailhot-releases/<版本>，然后执行其中的 deploy/install.sh。
# install.sh 读取服务器上的 /etc/retailhot/.env，发布包里不包含任何密钥。只保留最近 5 个版本。
set -euo pipefail

RELEASES=/opt/retailhot-releases
KEEP=5
VERSION_RE='^[0-9]{14}-[0-9a-f]{7,40}$'

die() { printf '[错误] %s\n' "$*" >&2; exit 1; }
[ "$(id -u)" -eq 0 ] || die "需要 root 权限：sudo retailhot-deploy …"
mkdir -p "$RELEASES"

activate() { # 版本目录
  local dir="$1"
  [ -x "$dir/deploy/install.sh" ] || die "发布包不完整：$dir/deploy/install.sh 不存在"
  "$dir/deploy/install.sh"
  ln -sfn "$dir" "$RELEASES/current"
  echo "当前版本：$(basename "$dir")"
}

prune() {
  local current
  current="$(readlink -f "$RELEASES/current" || true)"
  # 版本号以时间戳开头，按名字排序就是按时间排序。
  find "$RELEASES" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | grep -E "$VERSION_RE" | sort -r |
    tail -n +$((KEEP + 1)) | while read -r v; do
      [ "$RELEASES/$v" = "$current" ] && continue
      rm -rf "${RELEASES:?}/$v" && echo "清理旧版本 $v"
    done
}

case "${1:-}" in
  --list)
    current="$(readlink -f "$RELEASES/current" 2>/dev/null || true)"
    find "$RELEASES" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | grep -E "$VERSION_RE" | sort -r |
      while read -r v; do [ "$RELEASES/$v" = "$current" ] && echo "* $v" || echo "  $v"; done || echo "（还没有发布过）"
    ;;
  --rollback)
    v="${2:-}"
    [[ "$v" =~ $VERSION_RE ]] || die "版本号格式不对：$v（用 --list 查看已有版本）"
    [ -d "$RELEASES/$v" ] || die "没有这个版本：$v"
    activate "$RELEASES/$v"
    ;;
  -*|"")
    sed -n '2,11p' "$0"; exit 1
    ;;
  *)
    pkg="$1"; v="${2:-}"
    [[ "$v" =~ $VERSION_RE ]] || die "版本号格式不对：$v"
    case "$pkg" in /tmp/retailhot-"$v".tar.gz) ;; *) die "发布包必须是 /tmp/retailhot-$v.tar.gz" ;; esac
    [ -f "$pkg" ] && [ -f "$pkg.sha256" ] || die "找不到发布包或校验文件：$pkg(.sha256)"
    (cd /tmp && sha256sum -c "$(basename "$pkg").sha256") || die "发布包校验失败"
    dir="$RELEASES/$v"
    [ -e "$dir" ] && die "版本 $v 已经存在；要重新启用请用 --rollback $v"
    mkdir -p "$dir"
    tar -xzf "$pkg" -C "$dir" --no-same-owner
    chown -R root:root "$dir"
    rm -f "$pkg" "$pkg.sha256"
    activate "$dir"
    prune
    ;;
esac
