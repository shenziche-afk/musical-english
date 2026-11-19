# 剧读 · 交接文档（2026-11-19 晚）

> 给下一个接手的会话/同事。项目现状、命令、时间码怎么做、哪些坑已经踩过，都在这里。

## 1. 一句话

纯静态、无后端的音乐剧英语精读站：Hamilton 46 首 + 歌剧魅影 21 首，逐行中文讲解、英文历史背景、短语库、SM-2 复习；音频按需加载，手机可听。

- **线上**：<https://shenziche-afk.github.io/musical-english/>
- **仓库**：<https://github.com/shenziche-afk/musical-english>（公开；Pages 由 Actions 部署，**手动触发**）
- **本地**：`/Users/shenjiahao/Documents/deepseek-harness/default-workspace/musical-english-mac`
- **Node**：`/Users/shenjiahao/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node`（不在系统 PATH）
- **音频源**：`~/Desktop/Hamilton - Original Broadway Cast Recording (2015)/`、`~/Desktop/The Phantom of the Opera - Original London Cast (1986)/`
- **人工 LRC**：`~/Desktop/Hamilton 歌词（单独）/分曲 lrc/`、魅影专辑目录（时间码校准的参考源）

## 2. 现在有什么

| 剧目 | 曲目 | 精读 | 背景卡 | 阅读题 | 音频 |
| --- | --- | --- | --- | --- | --- |
| Hamilton（2015） | 46 | 46/46 | 154 | 308 | 98 MB，单声道 96k |
| The Phantom of the Opera（1986） | 21 | 21/21 | 50 | 100 | 46 MB，单声道 64k |

合计 67 个 pack、4,625 行、204 张背景卡、408 题、395 条来源。

功能（截至今天）：

- 曲库：学习概览（已掌握/今日到期/连续天数）、筛选（全部/未学完/已学完/有精读）、排序（幕次/掌握度/时长/标题）、每首掌握百分比
- 精读：逐行讲解、分区、语法/词汇/短语浮层、中文默认隐藏（每行「中」单独显示）、✓ 已掌握
- 背景：英文记叙文 + 划线词 + 2 道题 + 来源；标题中英并列
- 短语库、复习（SM-2）、保存/每日快照/导出 JSON
- 播放器：单句 ▶、单句循环「环」、倍速、换音频、断点续播、整首连播时当前行高亮跟随
- 地址栏深链：`?show=poto&n=7&view=study&line=l12`，前进/后退可用
- 主题：`show.json.theme`（CSS 变量），Hamilton 金 / 魅影黑蓝

**已删除（别找了）**：A-B 复读、录音回放、跟读（听→留白→重放），2026-11-19 全部移除，dock 里只剩「环」。

## 3. 结构与约定

```
index.html            选剧目 → 写 :root 主题变量 → document.write 核心三件套 + 首个 pack
js/app.js             全部交互（ES5 IIFE，约 2900 行）；pack 懒加载 content/<showId>/<id>.js
js/core.js            localStorage、SM-2、快照、播放位置（musical-en.pos）
content/<showId>/     show.json + tracks.js / lyrics.js / times.js + 每首一个 pack
audio/<showId>/       m4a（单声道）
assets/app.css        CSS 变量主题
studio/ + dev/studio.py  本地内容工作台（不进 dist，线上无写接口）
```

- `show.json.files` 顺序：tracks → lyrics → times → packs；`build_shows.py` 生成 `content/shows.js`。
- **pack 文件名必须等于 pack 的 `id`**（懒加载按这个规则取文件）。
- `tracks[].content` 只在有 pack 时写，`integrate_packs.js` 会补。
- 时间码改完必须跑 `validate_packs.js`（文本/行数/音频/题目/来源）。

## 4. 命令

```bash
export PATH="/Users/shenjiahao/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin:$PATH"
cd /Users/shenjiahao/Documents/deepseek-harness/default-workspace/musical-english-mac

node dev/validate_packs.js      # 内容校验
node dev/smoke.js               # UI 回归（约 120 条，只跑 hamilton）
python3 dev/build_static.py     # → dist/（约 148 MB）
python3 server.py               # 本地 127.0.0.1:8765，手机同 Wi-Fi 可访问
python3 dev/studio.py           # 本地工作台（断句/译文/背景，带令牌）
```

发布（push **不会**自动上线）：

```bash
git add -A && git commit -m "..." && git push origin main
gh workflow run pages.yml        # 约 40 秒
gh run list --workflow=pages.yml
```

## 5. 时间码：最重要的一节

时间码被返工过三轮，最终方案是 **wav2vec2 强制对齐**，不是识别：

- `dev/force_align.py`：把整首歌词按字符对齐到音频（torchaudio `forced_align`），输出 `dev/aligned/<show>/<n>.json`，帧精度 20ms。
  环境：`.venv-align/`（`/usr/bin/python3` + torch 2.8 + torchaudio 2.8 + soundfile），模型 `WAV2VEC2_ASR_BASE_960H`（自动下载 ~360MB）。
- 已应用：Hamilton 3,301/3,416 行、魅影 780/1,209 行；之后 `dev/pad_times.py --pad 0.15 --overlap 0.1` 加句尾旷量。
- 历史方案（保留作参考，不要当主方案）：
  - `dev/retime_lrc.py`：用桌面人工 LRC 校正起点，LRC 落在静音里的行保留原值（Prologue 的「Sold.」就是被这条规则救回来的）；
  - `dev/asr_times.py`（`.venv-whisper/`，mlx-whisper）：whisper 词时间戳会整段漂移（Wait for It 偏 1.3s），只能补 LRC 没有的行；
  - `dev/check_times.py`：能量体检，找零长度/过短/落在静音里的异常。
- `content/<show>/times.js.bak-*` 是每次写回前的备份；`dev/asr/`、`dev/aligned/` 已在 `.gitignore`。
- 想重跑某首：

```bash
.venv-align/bin/python dev/force_align.py --show hamilton --n 13
python3 - <<'PY'   # 应用到 times.js（逻辑见当日提交 /tmp/apply_align.py）
PY
python3 dev/pad_times.py --pad 0.15 --overlap 0.1
```

遗留：对齐时出于保守跳过的行（Hamilton 113、魅影 428）仍是旧时间；Entr'acte 是纯音乐，没有对齐。

## 6. 坑（都踩过）

1. **GitHub 推送经常失败**：`Empty reply` / 连不上 / 慢于 1KB/s；重试循环（`perl -e 'alarm 150; exec @ARGV' git push`）基本能过。
2. **iOS 音频**：不能 `display:none`；不要 `src→load()→play()` 同帧；已用「有 src 即 ready + 重试 + 1.6s 卡顿恢复」。
3. **微信内置浏览器**可能无声/不能下载，页面有提示条。
4. **`python -m http.server` 不支持 Range**，逐句播放/拖进度条要用 `server.py`。
5. **whisper 时间戳不可全信**（见第 5 节），人工 LRC 也有个别错行；最终用强制对齐。
6. **`.venv-*` 不要提交**（曾误提交 3GB，已清理；`.gitignore` 已加）。
7. **工作台重叠判定**阈值 0.15s（因为有句尾旷量）；更大会标红。
8. **`_headers` 只对 Cloudflare/Netlify 有效**，GitHub Pages 忽略；noindex 靠 meta + robots.txt。

## 7. 下一步（按优先级）

1. **全文搜索**：4,625 行 + 542 短语 + 485 词，建议构建期生成本地索引，顶栏一个入口，短语页原有的分类 chips 保留、文本框改成「当前分类内过滤」。
2. **多端同步**：不用账号，同步码 = 身份（128 位随机码，客户端 AES-GCM 加密）；后端三选一：Cloudflare Worker + KV（推荐，~50 行）、Supabase 表、GitHub Gist + token。
3. 第三部剧：`python3 dev/new_show.py <id> "标题" "副标题"` → 音频/歌词/时间轴 → 写 pack（`SHOWS.md`）。
4. 每首多张背景卡的中文摘要（现在正文只有英文）。

## 8. 给新会话的启动提示

```text
项目在 /Users/shenjiahao/Documents/deepseek-harness/default-workspace/musical-english-mac
先读 HANDOFF.md、README.md、SHOWS.md、DEPLOY.md，再动手。
线上 https://shenziche-afk.github.io/musical-english/，仓库 shenziche-afk/musical-english。
Node 不在 PATH：/Users/shenjiahao/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node
发布手动：改完跑 node dev/validate_packs.js + node dev/smoke.js，再 git push，最后 gh workflow run pages.yml。
时间码不要再用 whisper 当主方案，见 HANDOFF 第 5 节（wav2vec2 强制对齐）。
```
