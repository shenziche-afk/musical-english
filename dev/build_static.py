#!/usr/bin/env python3
"""生成 dist/：只包含运行所需的静态文件（不含 dev / server / 启动脚本）。

支持多剧目：扫描 content/<id>/show.json，按其中的 files 列表复制。
用法：python dev/build_static.py
GitHub Actions / Cloudflare Pages 也用这个脚本构建。
"""
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"

if DIST.exists():
    shutil.rmtree(DIST)
DIST.mkdir()

for name in ("index.html", "assets", "js"):
    src = ROOT / name
    if src.is_dir():
        shutil.copytree(src, DIST / name)
    else:
        shutil.copy2(src, DIST / name)

content = DIST / "content"
content.mkdir()
shutil.copy2(ROOT / "content" / "shows.js", content / "shows.js")

shows = []
for folder in sorted((ROOT / "content").iterdir()):
    manifest = folder / "show.json"
    if not folder.is_dir() or not manifest.is_file():
        continue
    data = json.loads(manifest.read_text(encoding="utf-8"))
    shows.append((folder.name, data))
    for rel in data.get("files", []):
        src = ROOT / rel
        dest = DIST / rel
        if not src.is_file():
            print("MISSING:", rel)
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
    audio = ROOT / "audio" / folder.name
    if audio.is_dir():
        shutil.copytree(audio, DIST / "audio" / folder.name)

# 声明文件与 Cloudflare Pages 响应头（GitHub Pages 会忽略 _headers，不影响）
for name in ("NOTICE.md", "_headers"):
    src = ROOT / name
    if src.is_file():
        shutil.copy2(src, DIST / name)

# GitHub Pages 不跑 Jekyll；robots 只是减少被搜索引擎收录，不是访问控制
(DIST / ".nojekyll").write_text("", encoding="utf-8")
(DIST / "robots.txt").write_text("User-agent: *\nDisallow: /\n", encoding="utf-8")

files = [p for p in DIST.rglob("*") if p.is_file()]
size = sum(p.stat().st_size for p in files)
print("shows:", len(shows), [s[0] for s in shows])
print("dist ready: %d files, %.1f MB" % (len(files), size / 1024 / 1024))
print("index:", DIST / "index.html")
