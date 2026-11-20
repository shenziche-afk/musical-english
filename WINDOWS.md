# 在 Windows 上继续开发

## 1. 拿到代码

```powershell
git clone https://github.com/shenziche-afk/musical-english.git
cd musical-english
```

仓库里已经包含 `audio/`（约 145 MB），所以 clone 会慢一点，但克隆完就能直接跑。

## 2. 本地预览

需要 Python 3.10+。项目根目录有 `start.bat`，双击即可；或者：

```powershell
python server.py
```

然后打开 <http://127.0.0.1:8765/>。手机同 Wi-Fi 用启动时打印的局域网地址。

> 不要用 `python -m http.server`，它不支持 Range，逐句播放和拖进度条会坏。

## 3. 改内容后的检查

Node 需要单独装（<https://nodejs.org/>，LTS 即可）：

```powershell
node dev\validate_packs.js
node dev\smoke.js
python dev\build_static.py
```

## 4. 发布

```powershell
git add -A
git commit -m "说明"
git push origin main
gh workflow run pages.yml
```

`gh` 是 GitHub CLI（<https://cli.github.com/>），登录一次 `gh auth login` 即可。**push 不会自动上线**，必须手动跑 workflow。

## 5. 时间码工具（可选）

时间码目前是用 **wav2vec2 强制对齐**做的（见 `HANDOFF.md` 第 5 节）。在 Windows 上跑需要：

1. 安装 ffmpeg（`winget install Gyan.FFmpeg` 或官网 zip 解压后加 PATH）；
2. 建虚拟环境并装依赖：

```powershell
py -m venv .venv-align
.venv-align\Scripts\pip install torch torchaudio soundfile numpy
```

3. 跑对齐：

```powershell
.venv-align\Scripts\python dev\force_align.py --show hamilton --n 13
```

`dev/audio_decode.py` 会自动优先用 `afconvert`（macOS），没有就退回 `ffmpeg`。

注意：

- `dev/asr_times.py` 用的是 **mlx-whisper，只能在 Apple Silicon 上跑**；Windows 上不要用，时间码以强制对齐为准。
- `dev/retime_lrc.py` 里写死了 macOS 的 LRC 路径（`~/Desktop/...`），在 Windows 上要么把 LRC 放到对应目录，要么改脚本顶部的 `LRC_DIRS`。
- `dev/check_times.py`、`dev/snap_starts.py` 里也有 `afconvert` 调用，需要的话按 `audio_decode.py` 的方式替换。

## 6. 目录速查

```
index.html        入口
js/app.js         全部交互
js/core.js        本地存储 / SM-2
content/<剧>/      show.json + tracks/lyrics/times + 每首一个 pack
audio/<剧>/        m4a（单声道）
dev/              校验、构建、对齐、工作台
studio/           本地内容工作台（python dev/studio.py）
docs/             README 用的截图
```

## 7. 常见问题

- **推送失败**（`Empty reply` / 超时）：多试几次，或 `git config http.version HTTP/1.1`。
- **音频不响**：确认是通过 `python server.py` 打开，不是双击 `index.html`。
- **改了 pack 但页面没变**：pack 是懒加载的，硬刷新（Ctrl+F5）；另外检查 `show.json.files` 里有没有这个文件、`tracks[].content` 是否指向它。
