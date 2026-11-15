#!/usr/bin/env bash
# 一键发布到 GitHub Pages（需要先 gh auth login）
# 用法：dev/publish.sh [仓库名]        默认 musical-english
#       dev/publish.sh musical-english --watch   构建时盯日志
set -euo pipefail

cd "$(dirname "$0")/.."

REPO="${1:-musical-english}"
WATCH="${2:-}"

if ! command -v gh >/dev/null 2>&1; then
  echo "找不到 gh。装一个：brew install gh，或用 GitHub Desktop 手动发布。"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "还没登录 GitHub。先运行："
  echo "  gh auth login"
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "工作区有未提交的改动，先 commit 再发布："
  git status --short
  exit 1
fi

if git remote get-url origin >/dev/null 2>&1; then
  echo "已有 remote，直接推送…"
  git push -u origin main
else
  echo "创建公开仓库 $REPO 并推送（首次约 152 MB）…"
  gh repo create "$REPO" --public --source=. --remote=origin --push
fi

OWNER_REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
OWNER="${OWNER_REPO%%/*}"
NAME="${OWNER_REPO##*/}"

# 把 Pages 的发布方式设为 GitHub Actions（已开启时返回 409，忽略）
gh api -X POST "repos/$OWNER_REPO/pages" -f build_type=workflow >/dev/null 2>&1 || true

# 触发部署（首次 push 时若 Pages 未开，那次会失败；这里补一次）
gh workflow run pages.yml >/dev/null 2>&1 || true

if [ "$WATCH" = "--watch" ]; then
  sleep 3
  gh run watch "$(gh run list --workflow=pages.yml --limit=1 --json databaseId -q '.[0].databaseId')" || true
fi

echo ""
echo "仓库：https://github.com/$OWNER_REPO"
echo "站点：https://$OWNER.github.io/$NAME/"
echo ""
echo "构建进度：gh run list --workflow=pages.yml"
echo "首次部署约 1–3 分钟；失败就去 Actions 里 Re-run all jobs。"
