# 第二批：第 11–46 首

通用要求见 `PACK_SPEC.md`。每组只写自己列出的文件，不要改共享文件（`lyrics.js`、`times.js`、`tracks.js`、`show.json`、`app.js`、别人的 pack）。

- 每首歌：分区按顺序覆盖全部歌词行；**每行都要有中文 note**；至少 8 行带 grammar/words/phrases。
- 背景卡：短歌 2–3 张，长歌 3–4 张；每张 110–160 词英文记叙文、3–5 个 glossary、2 道四选一（中文解析）、**至少 1 条真实可打开的权威来源**（NPS / Britannica / National Archives / Library of Congress / Smithsonian / Mount Vernon / Gilder Lehrman 等），联网核对后再写。
- `runtime`、`audioSrc` 从 `tracks.js` 抄。
- 写完 `node --check`；自查行数、note、背景、题目、来源。
- 只报告文件、行数、背景数、来源数、存疑史实。

## 分组

| 组 | 曲目（n / 标题 / 行数） | 输出文件 | id |
| --- | --- | --- | --- |
| G1 | 11 Satisfied / 163；12 The Story of Tonight (Reprise) / 56；13 Wait for It / 92 | satisfied.js；the-story-of-tonight-reprise.js；wait-for-it.js | satisfied；the-story-of-tonight-reprise；wait-for-it |
| G2 | 14 Stay Alive / 78；15 Ten Duel Commandments / 50；16 Meet Me Inside / 48；17 That Would Be Enough / 48；18 Guns and Ships / 52 | stay-alive.js；ten-duel-commandments.js；meet-me-inside.js；that-would-be-enough.js；guns-and-ships.js | stay-alive；ten-duel-commandments；meet-me-inside；that-would-be-enough；guns-and-ships |
| G3 | 19 History Has Its Eyes on You / 18；20 Yorktown (The World Turned Upside Down) / 100；21 What Comes Next? / 27；22 Dear Theodosia / 38 | history-has-its-eyes-on-you.js；yorktown.js；what-comes-next.js；dear-theodosia.js | history-has-its-eyes-on-you；yorktown；what-comes-next；dear-theodosia |
| G4 | 23 Non-Stop / 203；24 What'd I Miss / 91 | non-stop.js；whatd-i-miss.js | non-stop；whatd-i-miss |
| G5 | 25 Cabinet Battle #1 / 81；26 Take a Break / 137 | cabinet-battle-1.js；take-a-break.js | cabinet-battle-1；take-a-break |
| G6 | 27 Say No to This / 121；28 The Room Where It Happens / 149；29 Schuyler Defeated / 31 | say-no-to-this.js；the-room-where-it-happens.js；schuyler-defeated.js | say-no-to-this；the-room-where-it-happens；schuyler-defeated |
| G7 | 30 Cabinet Battle #2 / 65；31 Washington on Your Side / 63；32 One Last Time / 74；33 I Know Him / 26；34 The Adams Administration / 27 | cabinet-battle-2.js；washington-on-your-side.js；one-last-time.js；i-know-him.js；the-adams-administration.js | cabinet-battle-2；washington-on-your-side；one-last-time；i-know-him；the-adams-administration |
| G8 | 35 We Know / 56；36 Hurricane / 44；37 The Reynolds Pamphlet / 50；38 Burn / 55；39 Blow Us All Away / 80 | we-know.js；hurricane.js；the-reynolds-pamphlet.js；burn.js；blow-us-all-away.js | we-know；hurricane；the-reynolds-pamphlet；burn；blow-us-all-away |
| G9 | 40 Stay Alive (Reprise) / 49；41 It's Quiet Uptown / 63；42 The Election of 1800 / 111；43 Your Obedient Servant / 61；44 Best of Wives and Best of Women / 13 | stay-alive-reprise.js；its-quiet-uptown.js；the-election-of-1800.js；your-obedient-servant.js；best-of-wives-and-best-of-women.js | stay-alive-reprise；its-quiet-uptown；the-election-of-1800；your-obedient-servant；best-of-wives-and-best-of-women |
| G10 | 45 The World Was Wide Enough / 104；46 Who Lives, Who Dies, Who Tells Your Story / 87 | the-world-was-wide-enough.js；who-lives-who-dies-who-tells-your-story.js | the-world-was-wide-enough；who-lives-who-dies-who-tells-your-story |

## 史实提示

- 11–18：独立战争早期、决斗文化、纽约战役、特伦顿；汉密尔顿与华盛顿的关系。
- 19–24：约克镇、战后、建国初期、内阁；汉密尔顿的财政方案。
- 25–34：内阁之争、华盛顿的告别、亚当斯政府；杰斐逊与汉密尔顿的路线冲突。
- 35–39：雷诺兹丑闻、飓风信、小册子、伯恩；1800 年前后的政治。
- 40–46：1800 年大选、决斗、汉密尔顿之死、Eliza 的余生。

优先使用：NPS、Britannica、National Archives / Founders Online、Library of Congress、Smithsonian、Mount Vernon、Gilder Lehrman。找不到可打开的权威来源时，宁可少写一篇背景，也不要编造 URL。
