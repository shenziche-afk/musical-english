/* 全量校验（多剧目）：扫描 content/<id>/show.json，逐个剧目校验 pack 与歌词对齐、
 * 逐行讲解、分区、背景、题目、来源。用法：node dev/validate_packs.js
 */
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CONTENT = path.join(ROOT, "content");
const CORE = new Set(["lyrics.js", "times.js", "tracks.js"]);

const errors = [];
const warnings = [];
let totalPacks = 0;
let totalLines = 0;
let totalBg = 0;
let totalSources = 0;

function load(file) {
  vm.runInThisContext(fs.readFileSync(file, "utf8"), { filename: file });
}

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const showDirs = fs
  .readdirSync(CONTENT)
  .filter((name) => {
    const d = path.join(CONTENT, name);
    return fs.statSync(d).isDirectory() && fs.existsSync(path.join(d, "show.json"));
  })
  .sort();

if (!showDirs.length) errors.push("content/ 下没有找到 show.json");

for (const folder of showDirs) {
  const DIR = path.join(CONTENT, folder);
  const manifest = JSON.parse(fs.readFileSync(path.join(DIR, "show.json"), "utf8"));
  const showId = manifest.id || folder;
  const tag = "[" + showId + "] ";

  let TRACKS = [];
  let LYRICS = {};
  let TIMES = {};
  try {
    global.window = {};
    load(path.join(DIR, "tracks.js"));
    load(path.join(DIR, "lyrics.js"));
    const timesPath = path.join(DIR, "times.js");
    if (fs.existsSync(timesPath)) load(timesPath);
    TRACKS = ((global.window.MUSICAL_TRACKS || {})[showId] || {}).tracks || [];
    LYRICS = (global.window.MUSICAL_LYRICS || {})[showId] || {};
    TIMES = (global.window.MUSICAL_TIMES || {})[showId] || {};
  } catch (e) {
    errors.push(tag + "核心数据加载失败：" + e.message);
    continue;
  }

  const packRels = (manifest.files || []).filter(
    (f) => f.endsWith(".js") && !CORE.has(path.basename(f))
  );
  for (const rel of packRels) {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) {
      errors.push(tag + "缺少文件 " + rel);
      continue;
    }
    try {
      load(file);
    } catch (e) {
      errors.push(tag + "无法加载 " + rel + "：" + e.message);
    }
  }

  const songs = global.window.MUSICAL_SONGS || {};
  const list = Object.values(songs);
  if (!list.length) warnings.push(tag + "还没有 pack");
  if (list.length !== packRels.length) {
    warnings.push(tag + "pack 数 " + list.length + " ≠ files 数 " + packRels.length);
  }

  for (const p of list) {
    const id = p.id || "(no id)";
    const pt = tag + id;
    if (p.showId !== showId) errors.push(pt + "：showId 不是 " + showId);

    const track = TRACKS.filter((t) => t.n === p.n)[0];
    if (!track) errors.push(pt + "：n 找不到对应曲目");
    if (track && p.title !== track.title) errors.push(pt + "：title 与 tracks.js 不一致");
    if (track && p.audioSrc !== track.file) errors.push(pt + "：audioSrc 与 tracks.js 不一致");
    if (track && !fs.existsSync(path.join(ROOT, track.file))) {
      errors.push(pt + "：音频文件不存在");
    }

    const lyr = LYRICS[String(p.n)];
    if (!lyr) {
      errors.push(pt + "：没有歌词");
      continue;
    }

    if (TIMES[String(p.n)] && TIMES[String(p.n)].length !== lyr.lines.length) {
      errors.push(pt + "：时间轴 " + TIMES[String(p.n)].length + " ≠ 歌词 " + lyr.lines.length);
    }

    /* 断句是否说得通：起点 ≥ 终点是硬的错，等于（零长度）只提示。
     * 时间轴来自 LRC，句与句之间有正常重叠，所以重叠不算问题。 */
    (TIMES[String(p.n)] || []).forEach((seg, i) => {
      const at = pt + "：时间轴第 " + (i + 1) + " 句";
      if (!Array.isArray(seg) || seg.length !== 2) {
        errors.push(at + "不是 [起点, 终点]");
        return;
      }
      const [s, e] = seg.map(Number);
      if (!isFinite(s) || !isFinite(e)) {
        errors.push(at + "不是数字");
        return;
      }
      if (s < 0 || e < 0) errors.push(at + "出现负数");
      if (s > e) errors.push(at + "起点 " + s + " > 终点 " + e);
      else if (s === e) warnings.push(at + "起点 = 终点（" + s + "s，这句播不出声音）");
    });

    const rows = [];
    (p.sections || []).forEach((sec) => (sec.lines || []).forEach((l) => rows.push(l)));
    if (rows.length !== lyr.lines.length) {
      errors.push(pt + "：行数 " + rows.length + " ≠ 歌词 " + lyr.lines.length);
    }
    rows.forEach((l, i) => {
      if (l.id !== "l" + (i + 1)) errors.push(pt + "：第 " + (i + 1) + " 行 id 是 " + l.id);
      if (!l.note) errors.push(pt + "：" + l.id + " 缺 note");
      const src = lyr.lines[i];
      if (src && norm(l.text) !== norm(src[0])) {
        errors.push(pt + "：" + l.id + " 文本与歌词不一致");
      }
    });

    const rich = rows.filter(
      (l) => (l.grammar || []).length || (l.words || []).length || (l.phrases || []).length
    ).length;
    if (rich < 8) warnings.push(pt + "：只有 " + rich + " 行有语法/词汇/短语（建议 8+）");

    (p.background || []).forEach((b) => {
      const bt = pt + "/" + (b.id || "?");
      if (!b.bodyEn || b.bodyEn.split(/\s+/).length < 80) {
        errors.push(bt + "：bodyEn 太短或缺失");
      }
      if (!b.quiz || b.quiz.length !== 2) errors.push(bt + "：需要 2 道题");
      (b.quiz || []).forEach((q, qi) => {
        if (!q.options || q.options.length !== 4) {
          errors.push(bt + "：第 " + (qi + 1) + " 题不是四选一");
        }
        if (!(q.answer >= 0 && q.answer <= 3)) {
          errors.push(bt + "：第 " + (qi + 1) + " 题 answer 越界");
        }
        if (!q.explain) errors.push(bt + "：第 " + (qi + 1) + " 题缺解析");
      });
      if (!b.sources || !b.sources.length) warnings.push(bt + "：缺参考来源");
      (b.sources || []).forEach((s) => {
        if (!/^https?:\/\//.test(s.url || "")) errors.push(bt + "：来源 URL 无效");
      });
      if (!b.glossary || b.glossary.length < 3) warnings.push(bt + "：生词少于 3 个");
    });

    totalPacks++;
    totalLines += rows.length;
    totalBg += (p.background || []).length;
    totalSources += (p.background || []).reduce((a, b) => a + (b.sources || []).length, 0);
  }
}

console.log(
  "shows:",
  showDirs.length,
  "| packs:",
  totalPacks,
  "| lines:",
  totalLines,
  "| backgrounds:",
  totalBg,
  "| sources:",
  totalSources
);

if (warnings.length) {
  console.log("\nWARN");
  warnings.forEach((w) => console.log(" -", w));
}
if (errors.length) {
  console.log("\nERROR");
  errors.forEach((e) => console.log(" -", e));
  process.exit(1);
}
console.log("\nOK");
