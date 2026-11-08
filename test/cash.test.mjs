import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { parseHTML } from "linkedom";

const root = "/workspace";
const read = (name) => fs.readFileSync(`${root}/${name}`, "utf8");

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
  return { document, window, store };
}
const saved = (store) => JSON.parse(store.schoolhub_v1);
let n = 0;
const ids = () => "c" + (++n);

test("cash week is Monday through Sunday in New York, including the fall-back weekend", () => {
  const R = loadRewards();
  const weekOf = (day) => { const w = R.weekRange(day); return String(w.start) + " " + String(w.end); };
  assert.equal(weekOf("2026-11-04"), "2026-11-02 2026-11-08");
  assert.equal(weekOf("2026-11-02"), "2026-11-02 2026-11-08");
  assert.equal(weekOf("2026-11-08"), "2026-11-02 2026-11-08");
  assert.equal(String(R.nyDay(new Date("2026-11-01T05:30:00Z"))), "2026-11-01");
  assert.equal(weekOf("2026-11-01"), "2026-10-26 2026-11-01");
  assert.equal(String(R.nyDay(new Date("2026-11-02T04:30:00Z"))), "2026-11-01");
  assert.equal(String(R.nyDay(new Date("2026-11-02T05:30:00Z"))), "2026-11-02");
  assert.equal(weekOf(String(R.nyDay(new Date("2026-11-02T05:30:00Z")))).startsWith("2026-11-02"), true);
});

test("cap, points, undo, and the next week stay independent per child", () => {
  const R = loadRewards();
  const approved = { pointsPerDollar: 10, weeklyCapCents: 1000 };
  const kid = () => ({ balance: 250, pending: [], history: [], prizes: [], decisions: {} });
  const ctx = (cents, today, nonce) => ({ cents, today, ids, nowIso: today + "T15:00:00.000Z", nonce });
  let jay = kid();
  const ten = R.recordCash(jay, approved, ctx(1000, "2026-11-04", "a"));
  assert.equal(ten.ok, true);
  assert.equal(ten.rewards.balance, 150);
  jay = ten.rewards;
  const over = R.recordCash(jay, approved, ctx(100, "2026-11-08", "b"));
  assert.equal(over.ok, false);
  assert.equal(over.reason, "cap");
  assert.equal(over.rewards.balance, 150);
  const short = R.recordCash({ ...kid(), balance: 50 }, approved, ctx(600, "2026-11-04", "c"));
  assert.equal(short.reason, "points");
  const fraction = R.recordCash(kid(), approved, ctx(5, "2026-11-04", "d"));
  assert.equal(fraction.reason, "points-fraction");
  const again = R.recordCash(jay, approved, ctx(1000, "2026-11-04", "a"));
  assert.equal(again.reason, "duplicate");
  assert.equal(again.rewards.balance, 150);
  const undone = R.undo(jay, jay.history[0].id, { ids, nowIso: "2026-11-04T16:00:00.000Z" });
  assert.equal(undone.ok, true);
  assert.equal(undone.rewards.balance, 250);
  assert.equal(R.weekCashCents(undone.rewards, "2026-11-02"), 0);
  const next = R.recordCash(undone.rewards, approved, ctx(1000, "2026-11-09", "e"));
  assert.equal(next.ok, true);
  assert.equal(next.rewards.balance, 150);
  assert.equal(next.rewards.history.filter((h) => h.kind === "cash" && !h.undone).length, 1);
  const sky = kid();
  assert.equal(sky.balance, 250);
  assert.equal(sky.history.length, 0);
});

test("recording cash is a confirmed parent note, once, and does not approve the earning rule", () => {
  const page = boot({
    kid: "jaylin",
    stored: {
      version: 7,
      settings: {
        kids: {
          jaylin: { name: "Jaylin", grade: "8th", school: "NCCS", color: "#112233", ink: "#112233" },
          skyla: { name: "Skyla", grade: "5th", school: "NCCS", color: "#BE185D", ink: "#BE185D" }
        },
        showSoccer: true,
        rewards: {
          status: "suggested",
          points: 10,
          earlyDays: 1,
          timezone: "America/New_York",
          approved: null,
          cash: { status: "approved", pointsPerDollar: 10, weeklyCapCents: 1000, approved: { pointsPerDollar: 10, weeklyCapCents: 1000 } }
        }
      },
      kids: {
        jaylin: {
          schedule: [{ period: "1", subject: "ELA", teacher: "", room: "", start: "", end: "" }],
          homework: [{ id: "keep", subject: "ELA", title: "Already done", due: "2026-11-20", done: true }],
          events: [],
          materials: { ELA: { notes: "keep notes", links: [], cards: [{ q: "Q", a: "A" }] } },
          waag: {},
          rewards: { balance: 100, pending: [], history: [{ id: "old", kind: "award", points: 100, title: "Earlier", undone: false }], prizes: [], decisions: { keep: "awarded" } }
        },
        skyla: {
          schedule: [{ period: "1", subject: "Math", teacher: "", room: "", start: "", end: "" }],
          homework: [],
          events: [],
          materials: {},
          waag: {},
          rewards: { balance: 40, pending: [], history: [], prizes: [], decisions: {} }
        }
      },
      unassigned: null
    }
  });
  page.window.SCHOOLHUB_NOW = "2026-11-04T15:00:00Z";
  const text = page.document.querySelector("#rewardsBody").textContent;
  assert.match(text, /10 points = \$1/);
  assert.match(text, /\$10\.00/);
  assert.match(text, /Suggested/);
  assert.match(text, /not approved yet|only a suggestion/);
  assert.match(text, /No prizes yet/);
  assert.match(text, /does not send money/);
  assert.match(text, /only in this browser/);
  assert.equal(page.document.querySelector("[data-cash]").dataset.cash, "approved");
  assert.equal(page.document.querySelector("[data-rule]").dataset.rule, "suggested");
  page.document.querySelector("#cashForm").onsubmit({ preventDefault() {}, target: { amount: { value: "10.00" } } });
  const yes = page.document.querySelector("[data-cash-yes]");
  yes.onclick();
  yes.onclick();
  const data = saved(page.store);
  assert.equal(data.kids.jaylin.rewards.balance, 0);
  assert.equal(data.kids.skyla.rewards.balance, 40);
  assert.equal(data.kids.jaylin.rewards.history.filter((h) => h.kind === "cash" && !h.undone).length, 1);
  assert.equal(data.kids.jaylin.rewards.prizes.length, 0);
  assert.equal(data.settings.rewards.status, "suggested");
  assert.equal(data.kids.jaylin.homework[0].done, true);
  assert.deepEqual(data.kids.jaylin.materials.ELA.cards, [{ q: "Q", a: "A" }]);
  assert.equal(data.settings.kids.jaylin.color, "#112233");
  page.document.querySelector("[data-undo]").onclick();
  const after = saved(page.store);
  assert.equal(after.kids.jaylin.rewards.balance, 100);
  assert.equal(after.kids.jaylin.rewards.history.filter((h) => h.kind === "cash" && !h.undone).length, 0);
});

test("migration keeps a custom earning rule and history, and adds only the approved cash settings", () => {
  const page = boot({
    stored: {
      version: 6,
      settings: {
        kids: {
          jaylin: { name: "Jaylin", grade: "8th", school: "NCCS", color: "#5B21B6", ink: "#5B21B6" },
          skyla: { name: "Skyla", grade: "5th", school: "NCCS", color: "#BE185D", ink: "#BE185D" }
        },
        showSoccer: true,
        rewards: { status: "approved", points: 8, earlyDays: 2, timezone: "America/New_York", approved: { points: 8, earlyDays: 2 } }
      },
      kids: {
        jaylin: {
          schedule: [{ period: "1", subject: "ELA", teacher: "", room: "", start: "", end: "" }],
          homework: [],
          events: [],
          materials: {},
          waag: {},
          rewards: { balance: 8, pending: [], history: [{ id: "h1", kind: "award", points: 8, title: "Custom", undone: false }], prizes: [], decisions: {} }
        },
        skyla: { schedule: [], homework: [], events: [], materials: {}, waag: {}, rewards: { balance: 3, pending: [], history: [], prizes: [{ id: "p1", name: "Story", cost: 3 }], decisions: {} } }
      }
    }
  });
  const data = saved(page.store);
  assert.equal(data.version, 7);
  assert.equal(data.settings.rewards.status, "approved");
  assert.equal(data.settings.rewards.approved.points, 8);
  assert.equal(data.settings.rewards.approved.earlyDays, 2);
  assert.equal(data.settings.rewards.cash.approved.pointsPerDollar, 10);
  assert.equal(data.settings.rewards.cash.approved.weeklyCapCents, 1000);
  assert.equal(data.kids.jaylin.rewards.balance, 8);
  assert.equal(data.kids.jaylin.rewards.history.length, 1);
  assert.equal(data.kids.skyla.rewards.balance, 3);
  assert.equal(data.kids.skyla.rewards.prizes[0].name, "Story");
  assert.equal(page.document.querySelector("[data-rule]").dataset.rule, "approved");
  assert.match(page.document.querySelector("#rewardsBody").textContent, /8 points/);
});
