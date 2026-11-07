import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { parseHTML } from "linkedom";

const root = "/workspace";
const read = (name) => fs.readFileSync(`${root}/${name}`, "utf8");

function lin(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }
function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}
function contrast(a, b) {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function loadRewards() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(read("rewards.js"), sandbox);
  return sandbox.window.SchoolRewards;
}

function boot({ stored, kid } = {}) {
  const { document, window } = parseHTML(read("index.html"));
  const store = {};
  if (stored) store.schoolhub_v1 = JSON.stringify(stored);
  if (kid) store.schoolhub_v1_kid = kid;
  const localStorage = {
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; }
  };
  const sandbox = { document, window, localStorage, location: { hash: "" }, console, alert() {}, confirm() { return true; } };
  vm.createContext(sandbox);
  vm.runInContext([read("seed.js"), read("soccer.js"), read("rewards.js"), read("app.js")].join("\n"), sandbox);
  return { document, window, store, sandbox };
}
const saved = (store) => JSON.parse(store.schoolhub_v1);

function addHw(page, title, due) {
  page.document.querySelector("#hwForm").onsubmit({
    preventDefault() {},
    target: { subject: { value: "Math" }, title: { value: title }, due: { value: due }, reset() {} }
  });
}
function showDone(page) {
  page.document.querySelector('#homework .bar button[data-f="done"]').onclick();
}
function rowBox(page, title) {
  const row = [...page.document.querySelectorAll("#hwList .hw")].find((r) => r.textContent.includes(title));
  assert.ok(row, title);
  return row.querySelector("input");
}
function setChecked(box, checked) {
  box.checked = checked;
  box.onchange();
}
function approve(page, points = 10, days = 1) {
  page.document.querySelector("#ruleForm").onsubmit({
    preventDefault() {},
    target: { points: { value: String(points) }, days: { value: String(days) } }
  });
}

test("student colors meet contrast on buttons, text, cards, and calendar accents", () => {
  const css = read("style.css");
  assert.match(css, /nav a\.active\{background:var\(--k\);color:#fff\}/);
  assert.match(css, /\.day\{[^}]*border-top:4px solid var\(--k\)/);
  assert.match(css, /\.cell\.today\{outline:2px solid var\(--k\)/);
  assert.match(css, /h2\{color:var\(--ice\);border-left:5px solid var\(--k\)/);
  assert.match(css, /details\.waag summary\{[^}]*color:var\(--k-ink\)/);
  assert.match(css, /a\{color:var\(--k-ink\)\}/);
  const jay = ["#5B21B6", "#C4B5FD"];
  const sky = ["#BE185D", "#F9A8D4"];
  for (const [fill, ink] of [jay, sky]) {
    assert.ok(contrast("#ffffff", fill) >= 4.5, fill);
    assert.ok(contrast("#EEF8FD", fill) >= 4.5, fill);
    for (const bg of ["#0d2c4f", "#06213f", "#021F3D"]) assert.ok(contrast(ink, bg) >= 4.5, ink + " " + bg);
  }
  const page = boot();
  const root = page.document.documentElement;
  assert.equal(root.style.getPropertyValue("--k").toLowerCase(), "#be185d");
  assert.equal(root.style.getPropertyValue("--k-ink").toLowerCase(), "#f9a8d4");
  [...page.document.querySelectorAll("#kids button")].find((b) => b.dataset.k === "jaylin").onclick();
  assert.equal(root.style.getPropertyValue("--k").toLowerCase(), "#5b21b6");
  assert.equal(root.style.getPropertyValue("--k-ink").toLowerCase(), "#c4b5fd");
  const rewards = page.document.querySelector("#rewardsBody").textContent;
  assert.match(rewards, /Suggested/);
  assert.match(rewards, /not approved yet/);
  assert.match(rewards, /No prizes yet/);
  assert.match(rewards, /no parent login/);
  assert.doesNotMatch(rewards, /\$|purchase|cash|dollar/i);
});

test("early timing uses the New York calendar day and skips quizzes, tests, and undated work", () => {
  const R = loadRewards();
  assert.equal(R.nyDay(new Date("2026-11-13T04:30:00Z")), "2026-11-12");
  assert.equal(R.nyDay(new Date("2026-11-13T05:00:00Z")), "2026-11-13");
  const early = { id: "a", title: "Workbook page", due: "2026-11-13", completedOn: "2026-11-12", completedDue: "2026-11-13" };
  assert.equal(R.eligible(early, 1), true);
  assert.equal(R.eligible({ ...early, completedOn: "2026-11-13" }, 1), false);
  assert.equal(R.eligible({ ...early, completedOn: "2026-11-14" }, 1), false);
  assert.equal(R.excluded({ title: "Workbook page", due: "" }), true);
  assert.equal(R.excluded({ title: "Spelling quiz", due: "2026-11-13" }), true);
  assert.equal(R.excluded({ title: "Unit exam", due: "2026-11-13" }), true);
  assert.equal(R.excluded({ title: "Chapter test", due: "2026-11-13" }), true);
  assert.equal(R.excluded({ title: "Study for the chapter test", due: "2026-11-13" }), false);
  const ids = () => "id1";
  const blank = R.blankKid();
  const once = R.onCheck(blank, { id: "hw", title: "Workbook page", subject: "Math", due: "2026-11-13" }, { today: "2026-11-12", earlyDays: 1, ids });
  const twice = R.onCheck(once.rewards, once.homework, { today: "2026-11-07", earlyDays: 1, ids: () => "id2" });
  assert.equal(twice.rewards.pending.length, 1);
  assert.equal(twice.homework.completedOn, "2026-11-12");
  assert.equal(twice.rewards.balance, 0);
  const quiz = R.onCheck(blank, { id: "q", title: "Spelling quiz", subject: "ELA", due: "2026-11-13" }, { today: "2026-11-07", earlyDays: 1, ids });
  assert.equal(quiz.rewards.pending.length, 0);
  const undated = R.onCheck(blank, { id: "u", title: "Read", subject: "ELA", due: "" }, { today: "2026-11-07", earlyDays: 1, ids });
  assert.equal(undated.rewards.pending.length, 0);
});

test("parent review, duplicates, undo, prizes, and separate balances persist", () => {
  const page = boot({ kid: "skyla" });
  page.window.SCHOOLHUB_NOW = "2026-11-07T15:00:00Z";
  addHw(page, "Early reading log", "2026-11-20");
  setChecked(rowBox(page, "Early reading log"), true);
  let body = page.document.querySelector("#rewardsBody");
  assert.match(body.textContent, /Early reading log/);
  assert.match(body.textContent, /Skyla · 0 points/);
  assert.equal(page.document.querySelector("[data-award]").disabled, true);
  let data = saved(page.store);
  assert.equal(data.kids.skyla.rewards.balance, 0);
  assert.equal(data.kids.skyla.rewards.pending.length, 1);
  assert.equal(data.kids.jaylin.rewards.balance, 0);
  assert.equal(data.kids.skyla.homework.find((h) => h.title === "Early reading log").completedOn, "2026-11-07");
  const before = data.kids.skyla.rewards.pending.length;
  [...page.document.querySelectorAll("#kids button")].find((b) => b.dataset.k === "jaylin").onclick();
  [...page.document.querySelectorAll("#kids button")].find((b) => b.dataset.k === "skyla").onclick();
  assert.equal(saved(page.store).kids.skyla.rewards.pending.length, before);

  showDone(page);
  const box = rowBox(page, "Early reading log");
  setChecked(box, false);
  assert.equal(page.document.querySelectorAll("[data-award]").length, 0);
  page.document.querySelector('#homework .bar button[data-f="open"]').onclick();
  setChecked(rowBox(page, "Early reading log"), true);
  data = saved(page.store);
  const item = data.kids.skyla.homework.find((h) => h.title === "Early reading log");
  assert.equal(item.completedOn, "2026-11-07");
  assert.equal(item.completedDue, "2026-11-20");
  assert.equal(data.kids.skyla.rewards.pending.length, 1);
  item.due = "2026-11-07";
  const again = boot({ stored: data, kid: "skyla" });
  again.window.SCHOOLHUB_NOW = "2026-11-18T15:00:00Z";
  showDone(again);
  setChecked(rowBox(again, "Early reading log"), false);
  again.document.querySelector('#homework .bar button[data-f="open"]').onclick();
  setChecked(rowBox(again, "Early reading log"), true);
  data = saved(again.store);
  assert.equal(data.kids.skyla.rewards.pending.length, 1);
  assert.equal(data.kids.skyla.rewards.pending[0].due, "2026-11-20");
  assert.equal(data.kids.skyla.rewards.balance, 0);

  approve(again, 10, 1);
  assert.equal(again.document.querySelector("[data-rule]").dataset.rule, "approved");
  assert.equal(again.document.querySelector("[data-award]").disabled, false);
  again.document.querySelector("[data-award]").onclick();
  data = saved(again.store);
  assert.equal(data.kids.skyla.rewards.balance, 10);
  assert.equal(data.kids.jaylin.rewards.balance, 0);
  assert.equal(data.kids.jaylin.rewards.history.length, 0);
  assert.equal(data.kids.skyla.rewards.pending.length, 0);
  showDone(again);
  setChecked(rowBox(again, "Early reading log"), false);
  again.document.querySelector('#homework .bar button[data-f="open"]').onclick();
  setChecked(rowBox(again, "Early reading log"), true);
  assert.equal(saved(again.store).kids.skyla.rewards.balance, 10);
  assert.equal(saved(again.store).kids.skyla.rewards.history.filter((h) => h.kind === "award" && !h.undone).length, 1);

  again.document.querySelector("[data-undo]").onclick();
  assert.equal(saved(again.store).kids.skyla.rewards.balance, 0);
  assert.equal(again.document.querySelectorAll("[data-award]").length, 1);
  again.document.querySelector("[data-award]").onclick();
  assert.equal(saved(again.store).kids.skyla.rewards.balance, 10);

  again.document.querySelector("#prizeForm").onsubmit({
    preventDefault() {},
    target: { name: { value: "Story time" }, cost: { value: "10" }, reset() {} }
  });
  assert.match(again.document.querySelector("#rewardsBody").textContent, /Story time/);
  again.document.querySelector("[data-ask-prize]").onclick();
  again.document.querySelector("[data-redeem]").onclick();
  assert.equal(saved(again.store).kids.skyla.rewards.balance, 0);
  assert.equal(saved(again.store).kids.jaylin.rewards.prizes.length, 0);
  const undoButtons = [...again.document.querySelectorAll("[data-undo]")];
  const awardUndo = undoButtons.find((b) => b.parentElement.textContent.includes("Added 10 points"));
  awardUndo.onclick();
  assert.match(again.document.querySelector("#rewardsBody").textContent, /already recorded toward a prize/);
  assert.equal(saved(again.store).kids.skyla.rewards.balance, 0);
  const redeemUndo = [...again.document.querySelectorAll("[data-undo]")].find((b) => b.parentElement.textContent.includes("Recorded prize"));
  redeemUndo.onclick();
  assert.equal(saved(again.store).kids.skyla.rewards.balance, 10);

  const restored = boot({ stored: saved(again.store), kid: "skyla" });
  assert.match(restored.document.querySelector("#rewardsBody").textContent, /Skyla · 10 points/);
  assert.match(restored.document.querySelector("#rewardsBody").textContent, /Story time/);
  [...restored.document.querySelectorAll("#kids button")].find((b) => b.dataset.k === "jaylin").onclick();
  assert.match(restored.document.querySelector("#rewardsBody").textContent, /Jaylin · 0 points/);
  assert.doesNotMatch(restored.document.querySelector("#rewardsBody").textContent, /Story time/);
});

test("same-day work, quizzes, events, and old check-offs do not earn points", () => {
  const page = boot({ kid: "jaylin" });
  page.window.SCHOOLHUB_NOW = "2026-11-13T15:00:00Z";
  addHw(page, "Same day worksheet", "2026-11-13");
  setChecked(rowBox(page, "Same day worksheet"), true);
  addHw(page, "Spelling quiz", "2026-11-20");
  page.window.SCHOOLHUB_NOW = "2026-11-07T15:00:00Z";
  setChecked(rowBox(page, "Spelling quiz"), true);
  const data = saved(page.store);
  assert.equal(data.kids.jaylin.rewards.pending.length, 0);
  assert.equal(data.kids.jaylin.rewards.balance, 0);
  assert.equal(data.kids.jaylin.events.length > 0, true);
  assert.equal(page.document.querySelectorAll("[data-award]").length, 0);
  const old = boot({
    stored: {
      version: 4,
      settings: {
        kids: {
          jaylin: { name: "Jaylin", grade: "8th", school: "NCCS", color: "#0073A8" },
          skyla: { name: "Skyla", grade: "5th", school: "NCCS", color: "#D94F70" }
        },
        showSoccer: true
      },
      kids: {
        jaylin: {
          schedule: [{ period: "1", subject: "ELA", teacher: "", room: "", start: "", end: "" }],
          homework: [{ id: "old1", subject: "ELA", title: "Already done", due: "2026-11-20", done: true }],
          events: [{ id: "ev1", date: "2026-11-13", type: "test", title: "Math quiz", src: "x" }],
          materials: { ELA: { notes: "keep", links: [], cards: [{ q: "Q", a: "A" }] } },
          waag: {}
        },
        skyla: {
          schedule: [{ period: "1", subject: "Math", teacher: "", room: "", start: "", end: "" }],
          homework: [],
          events: [],
          materials: {},
          waag: {}
        }
      },
      unassigned: null
    },
    kid: "jaylin"
  });
  const migrated = saved(old.store);
  assert.equal(migrated.version, 5);
  assert.equal(migrated.settings.kids.jaylin.color.toLowerCase(), "#5b21b6");
  assert.equal(migrated.settings.kids.skyla.color.toLowerCase(), "#be185d");
  assert.equal(migrated.kids.jaylin.homework[0].done, true);
  assert.equal(migrated.kids.jaylin.homework[0].completedOn, undefined);
  assert.equal(migrated.kids.jaylin.rewards.pending.length, 0);
  assert.equal(migrated.kids.jaylin.rewards.balance, 0);
  assert.equal(migrated.kids.jaylin.rewards.prizes.length, 0);
  assert.deepEqual(migrated.kids.jaylin.materials.ELA.cards, [{ q: "Q", a: "A" }]);
  assert.equal(migrated.migrationBackup.kids.jaylin.homework[0].done, true);
  assert.equal(old.document.querySelectorAll("[data-award]").length, 0);
  assert.match(old.document.querySelector("#rewardsBody").textContent, /Suggested/);
});
