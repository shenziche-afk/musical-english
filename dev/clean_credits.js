/* 清理歌词末尾混入的专辑制作名单，并同步 lyrics.js / times.js / 所有 pack。
 * 用法：node dev/clean_credits.js [showId]（默认 hamilton）
 * 可重复运行；没有可清理内容时直接退出。
 */
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const showId = process.argv[2] || "hamilton";
const DIR = path.join(__dirname, "..", "content", showId);
const CREDIT = /^(音频助理|附加编程|录音师|低音吉他|混音工程师)\s*[:：]/;
const CORE = new Set(["lyrics.js", "times.js", "tracks.js"]);

function read(rel) {
  return fs.readFileSync(path.join(DIR, rel), "utf8");
}

global.window = {};
vm.runInThisContext(read("lyrics.js"), { filename: "lyrics.js" });
vm.runInThisContext(read("times.js"), { filename: "times.js" });
const LYR = global.window.MUSICAL_LYRICS;
const TIMES = global.window.MUSICAL_TIMES;
const lyrics = LYR[showId];
const times = TIMES[showId];

if (!lyrics) {
  console.error("no lyrics for show:", showId);
  process.exit(1);
}

const removed = {};
for (const n of Object.keys(lyrics)) {
  const rows = lyrics[n].lines;
  const idx = [];
  rows.forEach((row, i) => {
    if (CREDIT.test(row[0])) idx.push(i);
  });
  if (!idx.length) continue;
  const set = new Set(idx);
  removed[n] = rows.filter((row, i) => set.has(i)).map((row) => row[0]);
  lyrics[n].lines = rows.filter((row, i) => !set.has(i));
  if (times[n]) times[n] = times[n].filter((_, i) => !set.has(i));
  console.log("song", n, "removed", idx.length);
}

if (!Object.keys(removed).length) {
  console.log("no credits found");
  process.exit(0);
}

fs.writeFileSync(
  path.join(DIR, "lyrics.js"),
  "/* 剧读 · 46 首歌词 + 中文对照（已去制作名单） */\nwindow.MUSICAL_LYRICS = " +
    JSON.stringify(LYR, null, 2) +
    ";\n",
  "utf8"
);

fs.writeFileSync(
  path.join(DIR, "times.js"),
  "/* 剧读 · 逐行时间轴（秒，起止） */\nwindow.MUSICAL_TIMES = " +
    JSON.stringify(TIMES, null, 2) +
    ";\n",
  "utf8"
);

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".js") && !CORE.has(f));
let touched = 0;
for (const f of files) {
  global.window = {};
  vm.runInThisContext(read(f), { filename: f });
  const ids = Object.keys(global.window.MUSICAL_SONGS || {});
  if (!ids.length) continue;
  const id = ids[0];
  const pack = global.window.MUSICAL_SONGS[id];
  if (!removed[pack.n]) continue;

  pack.sections.forEach((sec) => {
    sec.lines = sec.lines.filter((line) => !CREDIT.test(line.text));
  });
  pack.sections = pack.sections.filter((sec) => sec.lines.length);
  const js =
    "/* 剧读 · " +
    pack.title +
    " 内容\n" +
    " * 歌词与译文来自《Hamilton 全曲歌词（英中对照）.txt》；背景为英文记叙文 + 生词 + 阅读题 + 参考来源。\n" +
    " */\n" +
    "window.MUSICAL_SONGS = window.MUSICAL_SONGS || {};\n" +
    'window.MUSICAL_SONGS["' +
    id +
    '"] = ' +
    JSON.stringify(pack, null, 2) +
    ";\n";
  fs.writeFileSync(path.join(DIR, f), js, "utf8");
  touched++;
  console.log("cleaned pack", f, "->", pack.sections.reduce((a, s) => a + s.lines.length, 0), "lines");
}

console.log("packs touched:", touched);
