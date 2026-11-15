#!/bin/bash
# 双击启动「剧读 · 本地工作台」（只监听 127.0.0.1，只有本机能用）
cd "$(dirname "$0")" || exit 1

if command -v python3 >/dev/null 2>&1; then
  python3 dev/studio.py "$@"
elif command -v python >/dev/null 2>&1; then
  python dev/studio.py "$@"
else
  echo "没有找到 Python 3。请先从 https://www.python.org/downloads/ 安装，再双击本文件。"
fi
read -r -p "按回车关闭这个窗口…"
