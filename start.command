#!/bin/bash
# 剧读 · macOS 启动脚本：双击运行（第一次可能需要 chmod +x start.command）
cd "$(dirname "$0")" || exit 1

if command -v python3 >/dev/null 2>&1; then
  python3 server.py "$@"
elif command -v python >/dev/null 2>&1; then
  python server.py "$@"
else
  echo "没有找到 Python 3。请先从 https://www.python.org/downloads/ 安装，再双击本文件。"
  read -r -p "按回车关闭…"
fi
