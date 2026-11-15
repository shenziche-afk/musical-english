/* 剧读 · 冒烟测试
 * 用最小 DOM 桩在 Node 里跑一遍 app.js：四个视图、曲库播放、复习流程、歌词导入、
 * 单句循环 / 跟读留白 / 快捷键（用 FakeAudio 的 timeupdate 模拟句尾）。
 * 运行：node musical-english/dev/smoke.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");

let store = {};
const localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => {
    store[k] = String(v);
  },
  removeItem: (k) => {
    delete store[k];
  }
};

class ClassList {
  constructor() {
    this.s = new Set();
  }
  add(...c) {
    c.forEach((x) => this.s.add(x));
  }
  remove(...c) {
    c.forEach((x) => this.s.delete(x));
  }
  toggle(c, force) {
    if (force === undefined) this.s.has(c) ? this.s.delete(c) : this.s.add(c);
    else force ? this.s.add(c) : this.s.delete(c);
    return this.s.has(c);
  }
  contains(c) {
    return this.s.has(c);
  }
}

class El {
  constructor(id) {
    this.id = id;
    this.innerHTML = "";
    this.textContent = "";
    this.value = "";
    this.hidden = false;
    this.style = {};
    this.classList = new ClassList();
    this._l = {};
    this._attrs = {};
  }
  addEventListener(t, f) {
    (this._l[t] = this._l[t] || []).push(f);
  }
  dispatch(t, e) {
    (this._l[t] || []).forEach((f) => f.call(this, e || {}));
  }
  setAttribute(k, v) {
    this._attrs[k] = String(v);
  }
  getAttribute(k) {
    return this._attrs[k] === undefined ? null : this._attrs[k];
  }
  querySelector() {
    return null;
  }
  querySelectorAll() {
    return [];
  }
  closest() {
    return null;
  }
  appendChild() {}
  removeChild() {}
  click() {
    this.dispatch("click", { target: this });
  }
  scrollIntoView() {}
  matches() {
    return false;
  }
  focus() {}
}

const els = new Map();
function el(id) {
  if (!els.has(id)) els.set(id, new El(id));
  return els.get(id);
}

const docListeners = { click: [], input: [], change: [], keydown: [] };
const document = {
  getElementById: el,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => new El("created"),
  addEventListener: (t, f) => {
    (docListeners[t] = docListeners[t] || []).push(f);
  },
  body: new El("body"),
  activeElement: null
};

class FakeAudio {
  constructor() {
    this.paused = true;
    this.duration = 0;
    this.currentTime = 0;
    this.playbackRate = 1;
    this.src = "";
    this.style = {};
    this._l = {};
    FakeAudio.instances.push(this);
  }
  addEventListener(t, f) {
    (this._l[t] = this._l[t] || []).push(f);
  }
  setAttribute() {}
  getAttribute() {
    return null;
  }
  removeEventListener(t, f) {
    this._l[t] = (this._l[t] || []).filter((x) => x !== f);
  }
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  load() {}
}

FakeAudio.instances = [];

global.window = { scrollTo() {}, MUSICAL_SONGS: {}, MUSICAL_TRACKS: {} };
global.document = document;
global.location = { protocol: "http:", href: "http://127.0.0.1:8765/" };
global.localStorage = localStorage;
global.Audio = FakeAudio;
global.URL = { createObjectURL: () => "blob:x", revokeObjectURL() {} };
global.Blob = function () {};
global.FileReader = function () {};
global.confirm = () => false;

function load(rel) {
  const p = path.join(ROOT, rel);
  vm.runInThisContext(fs.readFileSync(p, "utf8"), { filename: p });
}

load("js/core.js");
load("content/shows.js");
global.window.MUSICAL_CURRENT_SHOW = "hamilton";
const showMeta = JSON.parse(
  fs.readFileSync(path.join(ROOT, "content", "hamilton", "show.json"), "utf8")
);
showMeta.files.forEach((f) => load(f));
load("js/app.js");

const song = global.window.MUSICAL_SONGS["alexander-hamilton"];
const allPacks = Object.values(global.window.MUSICAL_SONGS || {}).sort((a, b) => a.n - b.n);
const lastPack = allPacks[allPacks.length - 1];
const trackData = global.window.MUSICAL_TRACKS["hamilton"];
const lyricData = global.window.MUSICAL_LYRICS["hamilton"];
const ME = global.window.ME;
const fails = [];
function check(name, cond, extra) {
  if (!cond) fails.push(name + (extra ? " :: " + extra : ""));
  else console.log("ok  " + name);
}

/* 内容 */
const ids = new Set();
let lineCount = 0;
let wordCount = 0;
let phraseCount = 0;
song.sections.forEach((s) =>
  s.lines.forEach((l) => {
    lineCount++;
    if (ids.has(l.id)) fails.push("重复 line id: " + l.id);
    ids.add(l.id);
    if (!l.text) fails.push("缺 text: " + l.id);
    (l.words || []).forEach((w) => {
      wordCount++;
      if (!w.w || !w.zh) fails.push("词条字段缺失: " + l.id);
    });
    (l.phrases || []).forEach((p) => {
      phraseCount++;
      if (!p.p || !p.zh || !p.type) fails.push("短语字段缺失: " + l.id);
    });
    (l.bg || []).forEach((b) => {
      if (!song.background.some((x) => x.id === b)) fails.push("背景引用不存在: " + b);
    });
  })
);
console.log("内容: " + lineCount + " 行 / " + wordCount + " 词 / " + phraseCount + " 短语");
check(
  "短语例句齐全",
  song.sections.every((s) =>
    s.lines.every((l) => (l.phrases || []).every((p) => p.zh && p.ex && p.exZh))
  )
);

/* 曲库数据 */
check("46 首曲目", trackData.tracks.length === 46);
check("总时长", trackData.totalSeconds > 8000);
check("时长格式", ME.formatHours(trackData.totalSeconds) === "2 小时 23 分", ME.formatHours(trackData.totalSeconds));
const missing = trackData.tracks.filter((t) => !fs.existsSync(path.join(ROOT, t.file)));
check("音频文件齐全", missing.length === 0, missing.map((t) => t.file).join(", "));
check("每首 pack 都有 content", trackData.tracks.filter((t) => t.content).length === allPacks.length);

/* 歌词数据 */
check("46 首歌词", Object.keys(lyricData).length === 46);
check(
  "歌词总行数",
  Object.values(lyricData).reduce((a, s) => a + s.lines.length, 0) === 3416
);
check("AH 全曲 80 行", lyricData["1"].lines.length === 80);
check("AH 精读行数", song.sections.reduce((a, s) => a + s.lines.length, 0) === 80);
check("每行都有讲解", song.sections.every((s) => s.lines.every((l) => !!l.note)));
check("五个分区", song.sections.length === 5);
check("无制作名单", !JSON.stringify(lyricData).includes("混音师"));
check("行首标签已拆", lyricData["2"].lines.some((l) => l[2] === "BURR"));

const song2 = global.window.MUSICAL_SONGS["aaron-burr-sir"];
check("第 2 首 68 行", song2.sections.reduce((a, s) => a + s.lines.length, 0) === 68);
check("第 2 首每行有讲解", song2.sections.every((s) => s.lines.every((l) => !!l.note)));
check("第 2 首四个分区", song2.sections.length === 4);
check("第 1 首背景有英文", song.background.every((b) => !!b.bodyEn));
check("第 2 首背景有英文", song2.background.every((b) => !!b.bodyEn));

const song3 = global.window.MUSICAL_SONGS["my-shot"];
check("第 3 首 163 行", song3.sections.reduce((a, s) => a + s.lines.length, 0) === 163);
check("第 3 首每行有讲解", song3.sections.every((s) => s.lines.every((l) => !!l.note)));
check("第 3 首六个分区", song3.sections.length === 6);
check("第 3 首背景有英文", song3.background.every((b) => !!b.bodyEn));

const song4 = global.window.MUSICAL_SONGS["the-story-of-tonight"];
check("第 4 首 32 行", song4.sections.reduce((a, s) => a + s.lines.length, 0) === 32);
check("第 4 首每行有讲解", song4.sections.every((s) => s.lines.every((l) => !!l.note)));
check("第 4 首两个分区", song4.sections.length === 2);
check("第 4 首背景有英文", song4.background.every((b) => !!b.bodyEn));
const showIds = (global.window.MUSICAL_SHOWS || []).map((x) => x.id);
check("剧目清单", showIds.includes("hamilton") && showIds.includes("poto"), JSON.stringify(showIds));
check(
  "剧目选择器",
  el("showSelect").innerHTML.includes("Hamilton") &&
    el("showSelect").innerHTML.includes("The Phantom of the Opera")
);

/* 时间轴 */
const times = global.window.MUSICAL_TIMES["hamilton"];
check("46 首时间轴", Object.keys(times).length === 46);
check("AH 80 句时间轴", times["1"].length === 80 && times["1"].every((t) => Array.isArray(t)));
check("第 3 首 163 句时间轴", times["3"].length === 163 && times["3"].every((t) => Array.isArray(t)));
check("第 4 首 32 句时间轴", times["4"].length === 32 && times["4"].every((t) => Array.isArray(t)));
check("时间轴递增", times["1"][1][0] > times["1"][0][0]);

/* 工具 */
const plain = (s) => String(s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
const study = () => plain(el("view-study").innerHTML);

/* 默认曲库 */
check("默认曲库", el("view-library").innerHTML.includes("全剧 46 首"));

/* 首屏 */
tabClick("study");
check("首屏渲染", study().includes("How does a bastard"));
check("首屏含进度", study().includes("行已掌握"));
check("曲目子导航", el("songbar").hidden === false);
check("下一首入口", study().includes("下一首 · Aaron Burr, Sir"));
check("精读逐句播放键", el("view-study").innerHTML.includes('data-action="play-line"'));
check("精读页背景入口", el("view-study").innerHTML.includes("bg-entry-btn"));
act("play-line", { "data-n": "1", "data-i": "0" });
check("播放这一句", FakeAudio.instances[0].currentTime === times["1"][0][0]);

/* 精读切曲 */
check("曲目下拉有全剧", el("songSelect").innerHTML.includes("My Shot"));
check("面包屑", el("songbarMeta").innerHTML.includes("Hamilton"));
docListeners.change.forEach((f) => f({ target: { id: "songSelect", value: "2" } }));
check("切到第 2 首", study().includes("Aaron Burr, Sir"));
check("第 2 首 68 行渲染", (el("view-study").innerHTML.match(/data-line="/g) || []).length === 68);
check("第 2 首歌手标签", el("view-study").innerHTML.includes('class="speaker"'));
docListeners.change.forEach((f) => f({ target: { id: "songSelect", value: "1" } }));
check("切回第 1 首", study().includes("How does a bastard"));

function tabClick(view) {
  el("tabs").dispatch("click", {
    target: { closest: (s) => (s === ".tab" ? { getAttribute: () => view } : null) }
  });
}
function act(action, attrs) {
  const btn = {
    getAttribute: (k) => (k === "data-action" ? action : attrs && attrs[k] !== undefined ? attrs[k] : null)
  };
  docListeners.click.forEach((f) => f({ target: { closest: (s) => (s === "[data-action]" ? btn : null) } }));
}

/* 曲库 */
tabClick("library");
const lib = () => el("view-library").innerHTML;
check("曲库渲染", lib().includes("全剧 46 首"));
check("曲库两幕", lib().includes("Act 1") && lib().includes("Act 2"));
check("曲库 46 行", (lib().match(/<li class="track/g) || []).length === 46);
check("第 1 首标记精读", lib().includes('class="track-badge is-content"'));
check("每首 pack 都有精读角标", (lib().match(/track-badge is-content/g) || []).length === allPacks.length);
check("时长显示", lib().includes("3:57"));

act("play-track", { "data-n": "2" });
check("切歌后 dock 标题", el("dock").innerHTML.includes("Aaron Burr, Sir"));
check("切歌设置音频源", /02-aaron-burr-sir\.m4a$/.test(FakeAudio.instances[0].src));

tabClick("library");
check("当前曲高亮", el("view-library").innerHTML.includes("is-current"));
check("播放图标为暂停", el("view-library").innerHTML.includes("❚❚"));
const libHtml = el("view-library").innerHTML;
check(
  "曲库行全部进精读",
  !libHtml.includes('data-action="open-lyrics"') &&
    (libHtml.match(/data-action="open-song"/g) || []).length >= allPacks.length
);
check("曲库行打开精读", el("view-library").innerHTML.includes('data-action="open-song"'));

/* 歌词对照 */
tabClick("lyrics");
check("歌词视图", el("view-lyrics").innerHTML.includes("歌词 · 第 1 首"));
check("歌词 80 行", (el("view-lyrics").innerHTML.match(/class="lyric-line"/g) || []).length === 80);
check("歌词逐句播放键", el("view-lyrics").innerHTML.includes('data-action="play-line"'));
check("歌词行带序号", el("view-lyrics").innerHTML.includes('data-idx="0"'));
check("歌词演唱者", el("view-lyrics").innerHTML.includes("Leslie Odom"));

docListeners.change.forEach((f) => f({ target: { id: "lyricsSong", value: "5" } }));
check("切到第 5 首", el("view-lyrics").innerHTML.includes("歌词 · 第 5 首"));
check("第 5 首标题", el("view-lyrics").innerHTML.includes("The Schuyler Sisters"));

docListeners.change.forEach((f) => f({ target: { id: "lyricsSong", value: "2" } }));
check("行首演唱者标签", el("view-lyrics").innerHTML.includes('class="speaker"'));
check("标签独立显示", el("view-lyrics").innerHTML.includes(">BURR<"));

/* 视图 */
tabClick("phrases");
check("短语库渲染", el("view-phrases").innerHTML.includes("短语库"));
check("短语数量", (el("phraseList").innerHTML.match(/phrase-card/g) || []).length >= 8);
check(
  "短语例句渲染",
  el("phraseList").innerHTML.includes("She grew up to be a lawyer") &&
    el("phraseList").innerHTML.includes("她长大后成了一名律师")
);

tabClick("story");
check("背景渲染", el("view-story").innerHTML.includes("时间线"));
check("英文背景", el("view-story").innerHTML.includes("Who He Was"));
check("历史故事标签", el("view-story").innerHTML.includes("Historical Story"));
check("划线查词", (el("view-story").innerHTML.match(/class="w"/g) || []).length > 0);
check("参考来源", el("view-story").innerHTML.includes("bg-sources"));
check("无人物速查", !el("view-story").innerHTML.includes("人物速查"));
check("无中文译文", !el("view-story").innerHTML.includes("他到底是谁"));
check("阅读题", el("view-story").innerHTML.includes("读后自测"));
act("bg-answer", { "data-card": "bio", "data-q": "0", "data-o": "0" });
check("阅读题有解析", el("view-story").innerHTML.includes("bq-exp"));

/* 复习 */
tabClick("review");
check("复习概览", el("view-review").innerHTML.includes("今天要复习"));
act("start-review");
check("复习会开始（四选一）", el("view-review").innerHTML.includes("quiz-opt"));
check("选项不少于四个", (el("view-review").innerHTML.match(/quiz-opt/g) || []).length >= 4);
act("answer", { "data-o": "0" });
check(
  "作答有反馈",
  el("view-review").innerHTML.includes("正确答案") || el("view-review").innerHTML.includes("答对")
);
act("quiz-next");
const saved = JSON.parse(store["musical-en.v1"] || "{}");
check("评分已持久化", saved.srs && Object.keys(saved.srs).length >= 1);

/* 精读交互 */
tabClick("study");
act("master", { "data-id": "l1" });
check("掌握标记持久化", JSON.parse(store["musical-en.v1"]).lines["alexander-hamilton:l1"].mastered === true);
check("进度条更新", el("progressFill").style.width !== "0%");

/* 歌词导入 */
tabClick("settings");
el("lyricsInput").value =
  "How does a bastard, orphan, son of a whore and a\n" +
  "Scotsman, dropped in the middle of a\n" +
  "（自定义的未匹配行）";
act("apply-lyrics");
const saved3 = JSON.parse(store["musical-en.v1"]);
check("歌词已导入", saved3.lyrics["alexander-hamilton"].lines.length === 3);
check("锚点匹配 2 行", saved3.lyrics["alexander-hamilton"].matched === 2);
tabClick("study");
check("导入后含自定义行", study().includes("自定义的未匹配行"));
act("restore-lyrics");
tabClick("study");
check("恢复样板歌词", study().includes("How does a bastard"));

/* 下一首自选 */
tabClick("study");
check("下一首入口", study().includes("下一首 · Aaron Burr, Sir"));
act("next-song");
check("切到下一首", study().includes("Aaron Burr, Sir"));
check("第 2 首下一首", study().includes("下一首 · My Shot"));
act("next-song");
check("切到第 3 首", study().includes("My Shot"));
check("第 3 首下一首", study().includes("下一首 · The Story of Tonight"));
docListeners.change.forEach((f) => f({ target: { id: "songSelect", value: String(lastPack.n) } }));
check("切到末首", study().includes(lastPack.title));
check("末首无下一首", !study().includes("下一首 · "));

/* 每日快照 */
const snaps = Object.keys(store).filter((k) => k.indexOf("musical-en.snap.") === 0 && k !== "musical-en.snap.index");
check("每日快照已生成", snaps.length >= 1, JSON.stringify(Object.keys(store)));
check("快照索引存在", !!store["musical-en.snap.index"]);

/* 复习四选一：每首歌的词/短语释义种类要够 3 个干扰项 */
const thin = allPacks.filter((p) => {
  const backs = new Set();
  p.sections.forEach((sec) =>
    sec.lines.forEach((l) => {
      (l.words || []).forEach((w) => backs.add(w.zh));
      (l.phrases || []).forEach((x) => backs.add(x.zh));
    })
  );
  return backs.size < 4;
});
check(
  "每首都有足够干扰项（≥4 种释义）",
  thin.length === 0,
  thin.map((p) => p.id + ":" + "?").join(",")
);

/* 阅读题：选项顺序被打散（不能总是 0,1,2,3） */
tabClick("story");
const storyHtml = el("view-story").innerHTML;
const seqs = [];
const qBlocks = storyHtml.split('<div class="bq">').slice(1);
qBlocks.forEach((blk) => {
  const os = [];
  let m;
  const re = /data-o="(\d+)"/g;
  while ((m = re.exec(blk))) os.push(m[1]);
  if (os.length) seqs.push(os.join(","));
});
check(
  "阅读题选项顺序已打散",
  seqs.length >= 6 && seqs.filter((x) => x !== "0,1,2,3").length >= seqs.length - 1,
  seqs.join(" | ")
);

/* 单句循环 / 跟读 / 录音 */
docListeners.change.forEach((f) => f({ target: { id: "songSelect", value: "1" } }));
tabClick("study");
const au = FakeAudio.instances[0];
const tick = () => (au._l.timeupdate || []).forEach((f) => f());
const line0 = times["1"][0];
const line1 = times["1"][1];

check("精读每行都有循环键", (el("view-study").innerHTML.match(/data-action="loop-line"/g) || []).length === 80);
check("循环键带句子下标", el("view-study").innerHTML.includes('data-action="loop-line" data-n="1" data-i="0"'));

act("loop-line", { "data-n": "1", "data-i": "0" });
check("进入单句循环", !au.paused && au.currentTime === line0[0], au.currentTime + " vs " + line0[0]);

au.currentTime = line0[1] + 0.2;
tick();
check("句尾回头重放", !au.paused && Math.abs(au.currentTime - line0[0]) < 0.001, String(au.currentTime));
check("循环次数写入状态条", el("segChip").innerHTML.includes("×1"), el("segChip").innerHTML);
check("dock 有循环/跟读键", el("dock").innerHTML.includes('data-action="toggle-loop"') && el("dock").innerHTML.includes('data-action="toggle-shadow"'));

act("stop-seg");
check("停止循环后暂停", au.paused === true);
check("状态条已清空", el("segChip").innerHTML === "");

/* 普通模式仍然播完就停 */
act("play-line", { "data-n": "1", "data-i": "1" });
check("普通模式定位到句首", au.currentTime === line1[0] && !au.paused);
au.currentTime = line1[1] + 0.2;
tick();
check("普通模式播完即停", au.paused === true);
check("普通模式不残留状态条", el("segChip").innerHTML === "");

/* 跟读留白 */
tabClick("settings");
check("设置页有跟读留白", el("view-settings").innerHTML.includes("跟读留白"));
docListeners.change.forEach((f) => f({ target: { id: "shadowGap", value: "1500" } }));
check("跟读留白已保存", JSON.parse(store["musical-en.v1"]).settings.shadowGap === 1500);
tabClick("study");

act("toggle-shadow");
check("跟读模式开始播放", !au.paused);
check("跟读状态条", el("segChip").innerHTML.includes("跟读"), el("segChip").innerHTML);
au.currentTime = line1[1] + 0.2;
tick();
check("跟读句尾暂停留白", au.paused === true);
check("留白倒计时可见", /留白/.test(el("segChip").innerHTML), el("segChip").innerHTML);

act("stop-seg");
check("退出跟读", au.paused === true && el("segChip").innerHTML === "");

/* 快捷键 */
docListeners.keydown.forEach((f) =>
  f({ key: "r", target: { matches: () => false }, preventDefault() {}, metaKey: false, ctrlKey: false })
);
check("R 键进循环", !au.paused && el("segChip").innerHTML.includes("循环"));
docListeners.keydown.forEach((f) =>
  f({ key: "Escape", target: { matches: () => false }, preventDefault() {}, metaKey: false, ctrlKey: false })
);
check("Esc 停止循环", au.paused === true && el("segChip").innerHTML === "");

/* 整首播放会退出单句控制 */
act("loop-line", { "data-n": "1", "data-i": "0" });
act("play-track", { "data-n": "1" });
check("整首播放退出循环", el("segChip").innerHTML === "");

/* 没有麦克风的环境不该出现录音键 */
check("无麦克风不显示录音键", !el("dock").innerHTML.includes('data-action="record"'));

console.log("");
if (fails.length) {
  console.error("失败 " + fails.length + " 项：");
  fails.forEach((f) => console.error(" - " + f));
  process.exit(1);
}
console.log("全部通过");
