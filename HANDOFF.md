# 剧读 · 交接文档（2026-11-15 晚）

> 给下一个会话用。项目现状、约定、坑、下一步都在这里；细节以 `README.md` / `SHOWS.md` / `DEPLOY.md` 为准。

## 1. 一句话

纯静态、无后端的音乐剧英语精读站：Hamilton 46 首 + 歌剧魅影 21 首，逐行中文讲解、英文历史背景、短语库、SM-2 复习；音频按需加载，手机上可听。

- **线上**：<https://shenziche-afk.github.io/musical-english/>
- **仓库**：<https://github.com/shenziche-afk/musical-english>（公开，Pages 由 GitHub Actions 部署，**手动触发**）
- **本地**：`/Users/shenjiahao/Documents/deepseek-harness/default-workspace/musical-english-mac`
- **Node**：`/Users/shenjiahao/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node`（系统 PATH 里没有 node）

## 2. 现在有什么

| 剧目 | 曲目 | 精读 | 背景卡 | 阅读题 | 音频 |
| --- | --- | --- | --- | --- | --- |
| Hamilton（2015） | 46 | 46/46 | 154 | 308 | 98 MB，单声道 96k |
| The Phantom of the Opera（1986 原伦敦卡司） | 21 | 21/21 | 50 | 100 | 46 MB，单声道 64k |

合计 67 个 pack、4,625 行、204 张背景卡、408 题、395 条来源（Hamilton 300 + 魅影 95）。
魅影 95 条来源只用了 4 个已实测可打开的域名：Gutenberg / Opéra national de Paris / 官方剧组 / 韦伯官网。

本地工作台（2026-11-15 加）：`python3 dev/studio.py` 起一个只绑 127.0.0.1、带令牌的服务，
三个页签改「断句（时间 + 译文一起改）/ 精读（词句语法）/ 背景」，保存走定点改写（diff 只有改过的那几行）+ 自动备份 + 自动校验，失败回滚。
线上没有后台：`studio/` 不进 `dist/`，GitHub Pages 那份没有任何写接口。细节见 `STUDIO.md`。

学习体验（2026-11-19 加）：地址栏深链 `?show=poto&n=7&view=study&line=l12`，前进/后退可用；
曲库顶部一条概览（已掌握行数 / 今日到期 / 连续天数）；中文译文默认隐藏，每行右侧「中」只看这一句；
播放位置断点续播；整首连播时当前句高亮并自动跟随；
曲库支持筛选（全部/未学完/已学完/有精读）与排序（幕次/掌握度/时长/标题）。

精听（2026-11-15 加，11-19 改）：每句有 ▶ 单句播放、「环」单句循环，播放器底部只剩「环」一个键——
跟读与录音功能已整体移除（2026-11-19），dock 里只保留「环」单句循环。
录音回放功能已整体移除（11-19），dock 里不再有「录 / 听」键。
快捷键 `R` 循环、`Esc` 停。

## 3. 数据与代码结构

```
index.html            选剧目 → 写 :root 主题变量 → document.write 核心三件套 + 首个 pack
js/app.js             全部交互（ES5 IIFE，约 2900 行）：曲库/精读/歌词/短语/复习/播放器；
                      单句循环在「单句循环」小节（armSegment / finishSegment）；
                      按需加载 pack：content/<showId>/<packId>.js
js/core.js            localStorage 状态、SM-2、每日快照、文本归一化
studio/               本地工作台前端（index/studio.js/studio.css，不进 dist）
dev/studio.py         工作台服务：静态站 + /api（ping/tracks/pack/times/save/revert/diff/backups/publish）
dev/jsonedit.py       JSON 定点改写引擎：记录每个值的字节区间，只替换改动处（有 --self-test）
content/<showId>/     show.json + tracks.js / lyrics.js / times.js + 每首一个 pack
audio/<showId>/       m4a
assets/app.css        CSS 变量主题（--gold/--bg/--text-* 等）
```

- `show.json.files` 顺序：tracks → lyrics → times → packs；`build_shows.py` 生成 `content/shows.js`。
- **pack 文件名必须等于 pack 的 `id`**，前端懒加载按这个规则取文件。
- `tracks[].content` 只有在 pack 存在时才写（`integrate_packs.js` 会补）；没 pack 的曲目显示「未收录」，点行看歌词。
- 主题：`show.json.theme` 是一组 CSS 变量（键名不带 `--`），Hamilton 金、歌剧魅影黑蓝。

## 4. 常用命令

```bash
export PATH="/Users/shenjiahao/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin:$PATH"
cd /Users/shenjiahao/Documents/deepseek-harness/default-workspace/musical-english-mac

node dev/validate_packs.js      # 全剧目内容校验（行数/文本/音频/题目/来源）
node dev/smoke.js               # UI 回归（~120 条，只跑 hamilton；含循环/快捷键）
python3 dev/studio.py           # 本地工作台（改断句/译文/背景），打印带 ?t= 的地址
python3 dev/jsonedit.py --self-test
node dev/integrate_packs.js poto
python3 dev/build_shows.py
python3 dev/build_static.py     # → dist/（147 MB）
python3 server.py               # 本地 127.0.0.1:8765，手机同 Wi-Fi 可访问
```

发布（push **不会**自动上线）：

```bash
git add -A && git commit -m "..." && git push origin main
gh workflow run pages.yml        # 手动部署，约 40 秒
gh run list --workflow=pages.yml
```

## 5. 已经做过的关键决定

- **音频单声道**：Hamilton 128k 立体声 → 96k 单声道（原文件备份在 `~/Desktop/musical-english-original-audio/`）；魅影源就是 64k 立体声 → 64k 单声道（源在 `~/Desktop/The Phantom of the Opera - Original London Cast (1986)/`）。
- **仓库重建过**：现在是单条提交，`.git` 约 144 MB；以后音频大改可再来一次（`rm -rf .git && git init && commit && push -f`）。
- **发布手动化**：`.github/workflows/pages.yml` 只保留 `workflow_dispatch`，避免本地改动一 push 就上线。
- **免责声明**：页面底部 + 设置页 + `NOTICE.md`，邮箱 `shenziche@gmail.com`（改的话三处一起改）；`index.html` 有 noindex。
- **赞赏**：页面底部 + README 末尾，图片 `assets/support-qr.png`（微信赞赏码，文案「投喂」）。
- **工作台只在本地**：写接口不做进静态站。只监听 127.0.0.1 + 自定义令牌头（跨站表单带不了，
  等于天然挡住别的网页偷偷 POST）+ 包 id 必须在 `show.json` 的 files 里。
- **内容改动走定点改写**：`jsonedit.py` 记下每个值的字节区间，只替换改过的值。
  整份 `json.dumps` 重写会把 3000 行 pack 全变成「已修改」，diff 就没法看了。
- **每次保存都先备份再校验**：`dev/_backup/<时间戳>/` + `manifest.json`；写完跑 `node --check`
  和 `validate_packs`，任何一步不过就自动写回原文件。打开时记 `sha1`，对不上拒绝保存（防 pull 覆盖）。
- **README 面向访客**：开头三问（这是什么/怎么用/数据在哪）+ 内容表格 + 两张截图。

## 5.5 音频时间码校准（已装未跑）

- 环境：项目内 `.venv-whisper/`（`/usr/bin/python3` 3.9 + `mlx-whisper`，mlx 0.29.3），**不要**用 DSH 自带 python——它加载 mlx 的 .so 会被 Team ID 校验拦掉。
- 模型还没下、转写还没跑。首次运行会从 hf-mirror 拉 `mlx-community/whisper-large-v3-turbo`（约 1.6 GB）：

```bash
cd /Users/shenjiahao/Documents/deepseek-harness/default-workspace/musical-english-mac
HF_ENDPOINT=https://hf-mirror.com .venv-whisper/bin/mlx_whisper \
  audio/hamilton/01-alexander-hamilton.m4a \
  --model mlx-community/whisper-large-v3-turbo \
  --output-format json --output-dir /tmp/asr
```

- 能量体检脚本：`dev/check_times.py`（输出 `dev/times_report.json`），只能抓「时长 <0.4s」「起点落在长静音里」这类极端异常，不能当自动修正依据。
- 对齐工具：`dev/asr_times.py`，四步全部本地、默认只出报告：

```bash
.venv-whisper/bin/python dev/asr_times.py transcribe --show poto --n 17   # 词级时间戳 → dev/asr/
.venv-whisper/bin/python dev/asr_times.py align     --show poto --n 17   # 候选 + 报告（不写数据）
.venv-whisper/bin/python dev/asr_times.py apply     --show poto --n 17 --dry-run
.venv-whisper/bin/python dev/asr_times.py apply     --show poto --n 17   # 写 times.js，自动 .bak
python3 dev/asr_times.py self-test                                       # 合成词流，不碰模型
```

- 对齐算法：token 级编辑距离（容忍拼写/漏词）+ 单调化 + 位移上限 8s；低于 0.55 置信度保留原值；`--synthetic --shift 1.2` 可模拟「整体偏移」验证检测能力。
- 当前状态：环境已装、模型未下、真实音频未跑；自检通过（22 行合成数据，整体平移 1.2s 能被全部识别）。
- 计划：先跑 POTO #17 和 Hamilton #46 对比，再决定是否全量。

## 5.6 时间码 ASR 校准（2026-11-19 已跑）

- 67 首全部用 `mlx-whisper`（large-v3-turbo）转写，词级时间戳存 `dev/asr/<show>/<n>.json`；
  `dev/asr_times.py align` 生成候选，`apply` 写回（自动 `.bak`）。
- 采纳门槛：匹配分 ≥0.9、位移 ≤3s；其余保留原值（重复副歌容易匹配到别处，宁可不动）。
- 结果：poto 347/1209 行、hamilton 1880/3416 行被校正，位移中位数 0.49s / 0.36s；
  写回后再用 `repair` 保证无重叠、无零长度（脚本见当日提交历史）。
- 想重跑某首：`.venv-whisper/bin/python dev/asr_times.py transcribe|align|apply --show <id> --n <n>`。

## 5.7 句尾旷量（2026-11-19）

`dev/pad_times.py` 给每句结尾加 `--pad 0.18s`（默认），最多压到下一句开头 `+0.12s`，避免最后一个词被切掉；
工作台的「重叠」判定阈值同步放宽到 0.15s，红色警告不会因此刷屏。想调：

```bash
python3 dev/pad_times.py --pad 0.25 --overlap 0.15   # 更大旷量
python3 dev/pad_times.py --dry-run                   # 只看会改多少
```

## 5.8 人工 LRC 对照校正（2026-11-19）

桌面留着原始人工 LRC：`~/Desktop/Hamilton 歌词（单独）/分曲 lrc/`、`~/Desktop/The Phantom of the Opera - Original London Cast (1986)/`。
`dev/retime_lrc.py` 按文本逐行匹配（单调指针），用人工 LRC 的起点覆盖；**如果 LRC 时间点落在静音里（明显标错），保留原值**。
这一轮改了 hamilton 1,564 行、poto 255 行；之后再跑 `dev/pad_times.py` 加旷量。

教训：whisper 的词级时间戳会整段漂移（Wait for It 第 1 句被推到 11.07s，人工 LRC 与能量都在 9.7s）。
以后先用 LRC 对照，ASR 只补 LRC 没有的行。

## 6. 坑（都踩过）

1. **GitHub 推送经常失败**：`Empty reply` / `Couldn't connect` / 慢于 1 KB/s。用重试循环（`perl -e 'alarm 120; exec @ARGV' git push ...` 最多 10 次）基本都能过。`github.com` 的 DNS 有时给到 `20.205.243.166`（不通），换 IP（如 `20.27.177.113`）可通，但没有 sudo 改 hosts。
2. **iOS 音频**：不能给 audio 元素 `display:none`（要移出屏幕）；不要 `src → load() → play()` 同帧；`audio.ready` 不能依赖 `loadedmetadata`。已改成「有 src 即 ready + safePlay 重试 + 1.6s 卡顿恢复」。
3. **微信内置浏览器**：可能无声音/下载被拦；页面有提示条，建议在 Safari 打开。
4. **首次播放慢**是正常的：单曲 2–4 MB，GitHub Pages 首包 0.6–1 s。
5. **`Entr'acte` 是纯音乐**：1 行占位 + 校验器会给「富注释不足」warning，属预期。
6. **`line.bg` 行内背景链接很少**（作者手挂），精读页底部有「本曲背景阅读」入口兜底。
7. **`_headers` 只对 Cloudflare/Netlify 有效**，GitHub Pages 忽略；noindex 靠 meta + robots.txt。
8. **`python -m http.server` 不支持 Range**，逐句播放/拖进度条要用 `server.py`。
9. **句尾收尾别只靠 `timeupdate`**：它 4 次/秒，循环会多播 0~250 ms。现在的做法是 `armSegment()` 按播放速度排一个精确 `setTimeout`，到点还差一点就再排一次（音频钟和墙钟有几十毫秒漂移），`timeupdate` 只做兜底。
10. **`.w::after` 提示气泡曾是窄屏横向滚动的元凶**：`content: attr(data-tip)` 写在基础规则里，300 px 的绝对定位盒子即使 `opacity:0` 也会把 `scrollWidth` 撑到 471 px。现在 `content` 只在 `:hover/:focus` 里声明，不悬停就不生成盒子。
11. **按钮字形用汉字而不是 emoji**：🔁/🎤 在暗色主题下会渲染成彩色小方块，和 ▶/✓ 不搭；现在统一成「环 / 跟 / 录 / 听」。
12. **录音**：`getUserMedia` + `MediaRecorder` 需要 https 或 localhost；iOS 上回放元素要 `appendChild` 到 body 并移出屏幕，否则容易播不出声。
13. **`[hidden]` 会被 `display:grid/flex` 盖掉**：工作台的弹窗和底部脏条一开始是空的却挡住整页点击，加 `[hidden]{display:none!important}` 才好。
14. **工作台在 `/studio/` 下，音频要写站点根路径**：`track.file` 得拼成 `/audio/...`，否则会去 `/studio/audio/` 找（404）。
15. **`validate_packs.js` 现在会查时间轴**：起点 > 终点算 error，起点 = 终点算 warning（历史数据里 `wait-for-it` 第 31 句就是零长度，用工作台调一下就好）。重叠不算问题——LRC 本来就叠。
16. **`dev/.studio_token` 和 `dev/_backup/` 已 gitignore**；换令牌删文件或 `--token`。

## 7. 下一步（按优先级）

1. 第三部剧：`python3 dev/new_show.py <id> "Title" "Subtitle"` → 放 tracks/lyrics/times/音频 → 写 pack → `integrate_packs` → `build_shows` → 校验。本机 `~/Desktop` 目前只有 Hamilton 与魅影两套音源，第三部要先找音频。
2. 工作台增强（按需要再加）：背景卡整段替换、批量平移整段断句、导出/导入改动补丁（多台机器同步用）。
3. PWA：外壳与文本离线缓存（音频不全量缓存）。
4. 音频上对象存储/CDN（R2 或国内 OSS），`tracks.js` 的 `file` 写绝对 URL 即可。
5. 访问控制（可选）：Cloudflare Access 需要自定义域名。

## 8. 给新会话的启动提示

```text
项目在 /Users/shenjiahao/Documents/deepseek-harness/default-workspace/musical-english-mac
先读 HANDOFF.md、README.md、SHOWS.md、DEPLOY.md，再动手。
线上 https://shenziche-afk.github.io/musical-english/ ，仓库 shenziche-afk/musical-english。
Node 不在 PATH，用 /Users/shenjiahao/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node。
发布是手动的：git push 后跑 gh workflow run pages.yml。
改完内容先 node dev/validate_packs.js 和 node dev/smoke.js。
```
