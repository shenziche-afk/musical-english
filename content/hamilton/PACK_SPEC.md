# 精读 Pack 写作规范

每个 Pack 是一个 JS 文件，给 `window.MUSICAL_SONGS` 增加一首歌的完整内容。
参考样板：`content/hamilton/aaron-burr-sir.js`、`content/hamilton/my-shot.js`。

## 文件格式

```js
/* 剧读 · <歌名> 全曲内容 */
window.MUSICAL_SONGS = window.MUSICAL_SONGS || {};
window.MUSICAL_SONGS["<id>"] = { ... };
```

文件末尾必须能通过 `node --check`。

## 顶层字段

| 字段 | 要求 |
| --- | --- |
| `id` | 小写连字符，如 `the-schuyler-sisters` |
| `showId` | 固定 `"hamilton"` |
| `n` | 曲目号（1–46，与 `lyrics.js` 的键一致） |
| `title` | 英文歌名，与 `tracks.js` 一致 |
| `show` | 固定 `"Hamilton: An American Musical"` |
| `writer` | 固定 `"Lin-Manuel Miranda"` |
| `year` | `2015` |
| `runtime` | 从 `tracks.js` 抄（如 `"3:07"`） |
| `audioSrc` | 从 `tracks.js` 抄（如 `"audio/hamilton/05-the-schuyler-sisters.m4a"`） |
| `tagline` | 一句中文副标题 |
| `intro` | 80–150 字中文导语：这首歌在剧情里的位置、听点 |
| `sections` | 2–6 个分区 |
| `background` | 3–5 张卡片（见下） |
| `timeline` | 3–5 条 `{year, event}` |

## sections 与逐行内容

- 歌词来源：`content/hamilton/lyrics.js` → `hamilton["<n>"].lines`，每行是 `[英文, 中文, 演唱者(可选)]`。
- **每个分区的 lines 必须按顺序、不重不漏覆盖整首歌**；总行数必须等于歌词行数。
- 每行对象：
  ```js
  { id: "l1", text: "<英文>", zh: "<中文>", speaker: "<可选>", note: "<中文讲解>" }
  ```
- `note` **必填**，1–2 句，讲清这句在说什么、语法点/俚语/双关/历史梗。
- 每首歌至少 **8 行**额外带 `grammar` / `words` / `phrases`（结构照样板，短语带 `ex` 和 `exZh`）。
- 不要改歌词原文；`speaker` 有就带，没有就省略。

## background 卡片

每张卡：

```js
{
  id: "kebab-case",
  title: "English Title",
  titleEn: "English Title",
  kind: "story",          // 历史事件用 story；讲创作手法用 craft
  bodyEn: "110–160 词英文记叙文",
  glossary: [{ w: "word", zh: "中文" }],   // 3–5 个，正文里出现
  quiz: [
    {
      q: "English question",
      options: ["A", "B", "C", "D"],
      answer: 0,
      explain: "中文解析"
    }
  ],
  sources: [{ title: "来源标题", url: "https://..." }]
}
```

- `bodyEn` 用记叙文：**场景 → 人物 → 冲突 → 转折 → 结局**，讲一个真实历史事件，不要写成百科条目。
- 史实必须联网核对：优先 Britannica、Mount Vernon、National Park Service、Library of Congress、Smithsonian、美国国家档案馆、剧组官方资料。
- 每张卡至少 1 条 `sources`，URL 必须真实可打开；不确定的不要写。
- `quiz` 固定 2 题，四选一，考文中的事实或推断；解析用中文。
- `glossary` 的词要真的出现在 `bodyEn` 里。

## 校验

写完在仓库根目录跑：

```bash
node --check musical-english/content/hamilton/<file>.js
```

再自查：

1. `sections` 覆盖行数 == 歌词行数；
2. 每一行都有 `note`；
3. 每张 background 有 `bodyEn`、2 道 quiz、至少 1 条 `sources`。

## 边界

- 只写自己任务指定的文件；不要改 `lyrics.js`、`tracks.js`、`show.json`、`app.js` 或别人的 pack。
- 不复制整首歌词到聊天里；内容只写进文件。
