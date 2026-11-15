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

精听（2026-11-15 加）：每句有 ▶ 单句播放、「环」单句循环，播放器底部有 环 / 跟 / 录 三个键——
跟读是「播完一句 → 静音留白（默认 2.5 s，设置页 1.5–5 s）→ 重放这一句」，录音回放只在内存里、不落盘。
快捷键 `R` 循环、`S` 跟读、`Esc` 停。

## 3. 数据与代码结构

```
index.html            选剧目 → 写 :root 主题变量 → document.write 核心三件套 + 首个 pack
js/app.js             全部交互（ES5 IIFE，约 2900 行）：曲库/精读/歌词/短语/复习/播放器；
                      单句循环 + 跟读在「单句循环 / 跟读」小节（armSegment / finishSegment / startGap）；
                      按需加载 pack：content/<showId>/<packId>.js
js/core.js            localStorage 状态、SM-2、每日快照、文本归一化
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
node dev/smoke.js               # UI 回归（~130 条，只跑 hamilton；含循环/跟读/快捷键）
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
- **README 面向访客**：开头三问（这是什么/怎么用/数据在哪）+ 内容表格 + 两张截图。

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

## 7. 下一步（按优先级）

1. 第三部剧：`python3 dev/new_show.py <id> "Title" "Subtitle"` → 放 tracks/lyrics/times/音频 → 写 pack → `integrate_packs` → `build_shows` → 校验。本机 `~/Desktop` 目前只有 Hamilton 与魅影两套音源，第三部要先找音频。
2. 跟读评分：拿录音和原句做对比（音量包络/时长已经够用，别上 ASR）。
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
