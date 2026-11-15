# 剧读 · Mac 交接

> 这是一份自包含的交接文档。DSH 会话不能直接跨机器迁移；把这个项目和本文档带到 Mac，就可以继续。
>
> **状态更新（2026-11-14 晚）**：本文记录的是交接时的原始状态。之后已完成：阅读题选项打散 + 作答持久化、四选一干扰项兜底、`server.py` HEAD 修复、生词屈折/重音匹配、首屏按需加载（2.4 MB → 0.6 MB）、`NOTICE.md` + `_headers` + `netlify.toml` + `.gitattributes`，部署以 GitHub Pages 为主（实测国内更快），需要私有仓库再用 Cloudflare Pages。冲突时以 `README.md` / `DEPLOY.md` / `NOTICE.md` 为准。

## 1. 项目是什么

「剧读」是一个纯静态、无后端的英语学习工具：以音乐剧歌曲为单位，把歌词拆成**句子 → 词汇 → 语法 → 短语**，配英文历史故事阅读、逐句音频、间隔重复复习。

当前只有一部剧：**Hamilton**，46 首已全部完成。

## 2. 当前状态（2026-11-14）

- 46 / 46 首完整 pack：逐行中文讲解 + 分区 + 短语 + 复习卡
- 3416 行歌词（4 首歌末尾的 20 行制作名单已清理）
- 154 篇英文历史故事，308 道阅读题
- 300 条权威参考来源（NPS / Britannica / National Archives / Smithsonian / 等）
- 46 首音频（151.9 MB，m4a）
- 校验：`node dev/validate_packs.js` → `shows: 1 | packs: 46 | lines: 3416 | backgrounds: 154 | sources: 300 | OK`
- UI 回归：`node dev/smoke.js` → 全部通过
- 还没有推到 GitHub；Mac 压缩包是 `musical-english-mac.zip`（152.7 MB）

## 3. Mac 上跑起来

解压到 `~/Documents/musical-english`。

本地服务（音频必需，不能直接双击 index.html）：

```bash
cd ~/Documents/musical-english
chmod +x start.command
./start.command
```

或：

```bash
python3 server.py
```

终端会打印：

- 本机：`http://127.0.0.1:8765/`
- 手机（同一 Wi-Fi）：`http://<LAN-IP>:8765/`

只想本机：`python3 server.py --local`。

建仓发布见第 9 节和 `MAC_SETUP.md` / `DEPLOY.md`。

## 4. 目录与关键文件

```
musical-english/
├─ index.html                 页面骨架 + 剧目加载器（document.write）
├─ assets/app.css             全部样式（暖黑 + 金色，响应式）
├─ js/core.js                 存储、SRS、文本归一化、格式化
├─ js/app.js                  全部交互（约 2000 行，ES5，无构建步骤）
├─ content/
│  ├─ shows.js                剧目清单（build_shows.py 生成）
│  └─ hamilton/
│     ├─ show.json            剧目信息 + files 列表
│     ├─ tracks.js            46 首曲目
│     ├─ lyrics.js            46 首歌词 + 中文
│     ├─ times.js             46 首逐行时间轴
│     ├─ <46 个 pack>.js      每首一个
│     ├─ PACK_SPEC.md         pack 写作规范
│     └─ BATCH_2.md           第 11–46 首的分组生产记录
├─ audio/hamilton/            46 首 m4a
├─ dev/                       构建、校验、导入脚本
├─ .github/workflows/pages.yml GitHub Pages 自动部署
├─ server.py                  本地 HTTP（Range、m4a MIME）
├─ start.command / start.bat  Mac / Windows 启动
├─ README.md / DEPLOY.md / MAC_SETUP.md / SHOWS.md
└─ HANDOFF.md                 本文档
```

## 5. 数据契约

全局对象（普通 `<script>` 注入，不是 ES module）：

```js
window.MUSICAL_TRACKS[showId] = { tracks: [
  { n, act, title, file, seconds, content? }
] };

window.MUSICAL_LYRICS[showId] = {
  "1": { title, lines: [[en, zh, speaker?], ...] }
};

window.MUSICAL_TIMES[showId] = {
  "1": [[start, end], ...]   // 与 lines 等长，秒
};

window.MUSICAL_SONGS[packId] = {
  id, showId, n, title, runtime, audioSrc,
  sections: [{ id, title, zh, lines: [
    { id: "l1", text, zh, speaker?, note,
      grammar?: [{ t, d, card? }],
      words?: [{ w, ipa, pos, zh, d }],
      phrases?: [{ p, type, zh, ex, exZh, d }] }
  ]}],
  background: [{ id, title, titleEn, kind, bodyEn,
    glossary: [{ w, zh }],
    quiz: [{ q, options, answer, explain }],
    sources: [{ title, url }] }],
  timeline: [{ year, event }]
};
```

硬约束：

- `sections` 按顺序覆盖全部歌词行；行 id `l1..lN`；`text` 必须与 `lyrics.js` 一致；
- 每行有 `note`；
- `tracks[].n` = pack `n` = 歌词/times 的键；
- 音频路径相对项目根，例如 `audio/hamilton/01-alexander-hamilton.m4a`；
- `show.json.files` 的顺序：tracks → lyrics → times → packs；`index.html` 按这个顺序加载。

## 6. 功能地图

- **导航**：顶部 `曲库 / 歌词`；右上角剧目下拉；剧集页顶部 `剧目 › 第 N 首` 面包屑 + 全剧曲目下拉 + `精读 / 背景 / 短语 / 复习`。
- **精读**：逐行讲解；展开语法/词汇/短语；右侧 ✓ 掌握；每行 ▶ 只播这一句。
- **背景**：英文记叙文；生词虚线查中文；2 道四选一；底部“参考”链接。
- **短语**：卡片（中文释义 + 英文例句 + 例句翻译 + 用法），可筛选/搜索/跳回原句。
- **复习**：词汇/短语四选一；语法翻面 + 四档自评；简化 SM-2。
- **歌词**：英中对照；逐句 ▶；播放时高亮当前句并自动滚动。
- **播放器**：底部 dock，播放/暂停、进度、倍速、换音频；逐句播放到句尾自动停。
- **存储**：`localStorage` key `musical-en.v1`；掌握键 `songId:lineId`（如 `my-shot:l12`）。
- **设置**：中文显隐、歌词导入、重置等。

## 7. 内容生产（已完成的流水线）

1. 歌词/译文：`lyrics.js`（来源 txt 整理；已去制作名单）
2. 逐行时间轴：`times.js`（LRC 抓取 + 对齐；`build_lrc.py` 是 Hamilton 模板）
3. pack：按 `PACK_SPEC.md`，每首一个文件；46 首由多批子代理并行写，再统一校验
4. 接入：`integrate_packs.js` 更新 `show.json` + `tracks.js`
5. 校验：`validate_packs.js`（全量）+ `smoke.js`（UI）
6. 构建：`build_static.py` → `dist/`
7. 发布：GitHub Actions → Pages

## 8. 常用命令

```bash
cd ~/Documents/musical-english

python3 dev/build_shows.py            # 扫描 content/*/show.json → shows.js
node dev/integrate_packs.js hamilton  # 更新 show.json + tracks.js 的 content
node dev/validate_packs.js            # 全剧目内容校验（推荐每次改完跑）
node dev/smoke.js                     # UI 回归（目前只跑 hamilton）
python3 dev/build_static.py           # 生成 dist/
python3 -m http.server 8791 --directory dist   # 静态预览（不支持 Range）
```

Node 18+、Python 3.8+ 即可。Mac 没有 Node 也能发布（Actions 云端跑校验/构建）；本地改内容才需要。

## 9. 建仓发布

> 现在推荐 Cloudflare Pages（国内可达性更好、带宽不计费）；下面的 GitHub Pages 流程保留作备用，`github.io` 在国内线路实测时通时不通。

详见 `MAC_SETUP.md` 与 `DEPLOY.md`。GitHub Pages 最短路径：

1. GitHub Desktop → Add local repository → create repository here；
2. Name `musical-english`，不要 Initialize with README；
3. Commit → Publish repository（取消 Keep private）；
4. 仓库 Settings → Pages → Source 选 **GitHub Actions**；
5. Actions 里跑 `Deploy to GitHub Pages`；
6. 地址 `https://<用户名>.github.io/musical-english/`。

## 10. 已知限制 / 坑

- **版权**：歌词和录音有版权；公开仓库 = 所有人可下载。当前决定是公开，后续可加 Cloudflare Access / Netlify Pro。
- **GitHub Pages 没有登录**：个人账号无访问控制；私有仓库的 Pages 仍是公开站点（访问控制只有 GitHub Enterprise Cloud）。
- **容量**：GitHub Pages 站点 ≤1 GB；现在 100 MB，约 10 部剧。更多剧用 Cloudflare Pages 或对象存储。
- **首次加载**：已改为按需加载——核心三件套 + 首曲 pack 预载（约 0.6 MB），其余 pack 打开时注入；原来是一次性 49 个脚本 2.4 MB。
- **`smoke.js` 只测 Hamilton**：加新剧后先跑 `validate_packs.js`，UI 再手动点。
- **`build_lyrics.py` / `build_lrc.py` 是 Hamilton 模板**：新剧要改输入路径和歌曲 ID。
- **清制作名单**：`node dev/clean_credits.js <showId>`；重跑 `build_lyrics.py` 可能把名单带回来。
- **本地预览的 Range**：`python -m http.server` 不支持 Range，进度条拖动会怪；用 `server.py` 或线上 Pages 测。
- **iOS 音频**：已处理“先在手势里 play，再 seek”；真机最好再验一次。
- **无同步**：进度只在本机 localStorage；换设备/域名不同步。
- **无 PWA/离线**：没有 service worker；音频 98 MB 也不适合全量缓存。

## 11. 下一步建议

1. **发布并验证** Pages：首页、46 首角标、音频拖动、手机。
2. **加访问控制**（可选）：Cloudflare Access（免费 ≤50 人）或 Netlify Pro。
3. **第二部剧**：按 `SHOWS.md`；先跑 `new_show.py`。
4. **PWA**：manifest + service worker，缓存外壳/文本，音频按需流式。
5. ~~优化首屏~~：已完成（按需加载）；下一步可按剧目拆包、加 service worker。

## 12. 给新会话的启动提示（复制粘贴）

```text
我在 Mac 上继续一个叫「剧读」的项目，目录 ~/Documents/musical-english。
请先读 HANDOFF.md、README.md、DEPLOY.md、SHOWS.md、content/hamilton/PACK_SPEC.md，再开始。

项目现状：Hamilton 46 首已全部完成（46 个 pack、3416 行、154 篇背景、300 条来源），
本地校验 node dev/validate_packs.js 和 node dev/smoke.js 都通过；
还没发布到 GitHub Pages，Mac 压缩包是 musical-english-mac.zip。

当前目标：把项目发布到 GitHub Pages（公开仓库），验证 46 首在静态站上正常，
再决定是否加访问控制。不要改动歌词/音频的版权说明。

约束：
- 改完内容必须跑 node dev/validate_packs.js 和 node dev/smoke.js；
- 不要直接编辑 dist/，它由 python3 dev/build_static.py 生成；
- 新剧按 SHOWS.md 的流程，先 new_show.py，再 integrate/build_shows/validate；
- 遇到不确定的史实，联网核对后再写，保留 sources。

第一步：检查仓库是否已建、Pages 是否已启用，缺什么补什么。
```

## 13. 关键文件索引

| 文件 | 用途 |
| --- | --- |
| `README.md` | 项目介绍、打开方式、内容规模 |
| `MAC_SETUP.md` | Mac 解压/建仓 5 步 |
| `DEPLOY.md` | GitHub Pages / Cloudflare / 登录保护 |
| `SHOWS.md` | 加新剧目、维护命令、容量 |
| `content/hamilton/PACK_SPEC.md` | pack 写作规范 |
| `dev/validate_packs.js` | 全量校验 |
| `dev/build_static.py` | 生成 dist |
| `js/app.js` | 全部交互 |
| `js/core.js` | 存储/SRS |
