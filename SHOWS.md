# 增加剧目与维护

## 数据契约

每个剧目一个目录：

```
content/<showId>/
├─ show.json          { id, title, subtitle, files: [...] }
├─ tracks.js          window.MUSICAL_TRACKS[showId] = { tracks: [...] }
├─ lyrics.js          window.MUSICAL_LYRICS[showId] = { "1": { title, lines } }
├─ times.js           window.MUSICAL_TIMES[showId] = { "1": [[start,end], ...] }
└─ <song>.js          window.MUSICAL_SONGS["<song>"] = { showId, n, ... }
audio/<showId>/       音频，路径写进 tracks.js 的 file
```

约束：

- `tracks[].n` 与歌词、times、pack 的 `n` 一致；
- pack 的 `showId` 必须等于目录 id；
- pack 的 `sections` 按顺序覆盖全部歌词行，行 id `l1..lN`，`text` 与 `lyrics.js` 完全一致；
- 每个背景卡有 `bodyEn`、2 道四选一、至少 1 条来源。

## 主题色

`show.json` 可选 `theme`：一组 CSS 变量（键名不带 `--`），进页面时写到 `:root`，切剧目整站换色。

```json
"theme": {
  "gold": "#78a9e0", "gold-dim": "#4c6f9b", "gold-rgb": "120, 169, 224",
  "bg": "#07090e", "panel": "#0f131a", "panel-2": "#151b24",
  "line": "#222b38", "line-soft": "#19212c",
  "ink": "#e9eff8", "muted": "#97a7bb", "muted-2": "#6c7c90",
  "glow-a": "#101a2e", "glow-b": "#0b1119",
  "surface-a": "#121824", "surface-b": "#0d121b",
  "tip-bg": "#16202e", "on-accent": "#07111d"
}
```

- `gold` / `gold-dim` / `gold-rgb`：主强调色（按钮、高亮、下划线、进度条），`gold-rgb` 写 `R, G, B`；
- `bg` / `panel` / `line`：底色层次；`glow-a` / `glow-b`：页面背景的两团光晕；
- `surface-a` / `surface-b`：卡片渐变；`tip-bg`：生词浮层；`on-accent`：强调色上的文字色；
- 不写 `theme` 就用默认黄铜金（Hamilton 的配色）。

## 新建剧目

```bash
python3 dev/new_show.py <id> "<Title>" "<Subtitle>"
```

然后：

1. 按 `content/hamilton/` 的结构放 `tracks.js`、`lyrics.js`、`times.js`。
2. 写 pack：照 `content/hamilton/PACK_SPEC.md`，每首歌一个文件，带 `showId`。
   **文件名必须等于 pack 的 `id`**（`content/<showId>/<packId>.js`）——前端按需加载就是按这个规则取文件。
3. 音频放 `audio/<id>/`，并让 `tracks.js` 的 `file` 指向它。
4. 接入：

   ```bash
   node dev/integrate_packs.js <id>
   python3 dev/build_shows.py
   node dev/validate_packs.js
   ```

5. 本地预览：

   ```bash
   python3 dev/build_static.py
   python3 -m http.server 8791 --directory dist
   ```

6. 提交推送；托管按 `DEPLOY.md`（推荐 Cloudflare Pages，接 Git 后每次 push 自动构建）。

## 维护

| 做什么 | 命令 / 注意 |
| --- | --- |
| 改某首歌的讲解 | 直接改 pack；跑 `node dev/validate_packs.js` |
| 加一首歌 | 补 track / lyrics / times / pack；`node dev/integrate_packs.js <id>`；`build_shows.py` |
| 歌词行数变了 | times 和 pack 必须同步；校验器会报行数/文本不一致 |
| 清制作名单 | `node dev/clean_credits.js <id>` |
| 全量测试 | `node dev/smoke.js`（UI，目前只跑 hamilton） |
| 构建静态站 | `python3 dev/build_static.py`（多剧目） |
| 发布 | push 到 main，Cloudflare Pages（或 Netlify / GitHub Actions）自动构建 `dist/` |

## 脚本的多剧目支持

| 脚本 | 范围 |
| --- | --- |
| `build_shows.py` | 扫描所有 `content/*/show.json` |
| `build_static.py` | 所有剧目的 files + `audio/<id>` |
| `validate_packs.js` | 所有剧目 |
| `integrate_packs.js [id]` | 指定剧目，默认 hamilton |
| `clean_credits.js [id]` | 指定剧目，默认 hamilton |
| `smoke.js` | 只加载 hamilton 的 show.json（UI 回归） |
| `build_lyrics.py` / `build_lrc.py` | 以 hamilton 为模板，新剧需改输入路径/歌曲 ID |

## 版权

新剧目同样受版权约束：页面底部与设置页共用 `NOTICE.md` 那段声明，新增内容前先确认权利归属；站点保持 `noindex`（`index.html` meta + `_headers` + `robots.txt`）。

## 托管容量

- GitHub Pages：站点 ≤1 GB、带宽软限 100 GB/月（全剧 98 MB ≈ 1000 次）；国内线路时通时不通。
- Cloudflare Pages：带宽不计费，单文件 25 MB；现在 100 MB，够放十几部剧。
- 更多剧目：用 Cloudflare Pages（无总额度，单文件 25 MB），或把音频放到对象存储（R2/B2），Git 只存文本。
- 每部剧音频：Hamilton 约 98 MB、歌剧魅影约 46 MB（均为单声道）；仓库超过 1 GB 时 GitHub 会变慢。
