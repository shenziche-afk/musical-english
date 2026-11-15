/* 把某个剧目的所有 pack 自动接进 show.json 与 tracks.js。
 * 用法：node dev/integrate_packs.js [showId]（默认 hamilton）
 * 可重复运行：按 n 排序，更新 files 列表和 track.content。
 */
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const showId = process.argv[2] || "hamilton";
const DIR = path.join(__dirname, "..", "content", showId);
const CORE = new Set(["lyrics.js", "times.js", "tracks.js"]);

if (!fs.existsSync(path.join(DIR, "show.json"))) {
  console.error("no show.json:", DIR);
  process.exit(1);
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".js") && !CORE.has(f));
const packs = [];
for (const f of files) {
  global.window = {};
  vm.runInThisContext(fs.readFileSync(path.join(DIR, f), "utf8"), { filename: f });
  const ids = Object.keys(global.window.MUSICAL_SONGS || {});
  if (!ids.length) continue;
  const id = ids[0];
  packs.push({ id, pack: global.window.MUSICAL_SONGS[id], file: f });
}
packs.sort((a, b) => a.pack.n - b.pack.n);

/* show.json */
const showPath = path.join(DIR, "show.json");
const show = JSON.parse(fs.readFileSync(showPath, "utf8"));
const base = [
  "content/" + showId + "/tracks.js",
  "content/" + showId + "/lyrics.js",
  "content/" + showId + "/times.js"
];
show.files = base.concat(packs.map((x) => "content/" + showId + "/" + x.file));
fs.writeFileSync(showPath, JSON.stringify(show, null, 2) + "\n", "utf8");

/* tracks.js */
const trackPath = path.join(DIR, "tracks.js");
global.window = {};
vm.runInThisContext(fs.readFileSync(trackPath, "utf8"), { filename: "tracks.js" });
const data = global.window.MUSICAL_TRACKS;
const byN = {};
packs.forEach((x) => (byN[x.pack.n] = x.id));
(data[showId].tracks || []).forEach((t) => {
  if (byN[t.n]) t.content = byN[t.n];
  else delete t.content;
});
const js =
  "/* 剧读 · " +
  (show.title || showId) +
  " 曲目清单（时长来自音频元数据） */\n" +
  "window.MUSICAL_TRACKS = " +
  JSON.stringify(data, null, 2) +
  ";\n";
fs.writeFileSync(trackPath, js, "utf8");

console.log("show:", showId, "packs:", packs.length);
packs.forEach((x) => console.log(" ", x.pack.n, x.id, x.file));
console.log("show.files:", show.files.length);
