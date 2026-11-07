import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { parseHTML } from "linkedom";

const root = "/workspace";
const read = (name) => fs.readFileSync(`${root}/${name}`, "utf8");

function loadSeed() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(read("seed.js"), sandbox);
  return sandbox.window.SEED;
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
  const sandbox = {
    document,
    window,
    localStorage,
    location: { hash: "" },
    console,
    alert() {},
    confirm() { return true; }
  };
  vm.createContext(sandbox);
  vm.runInContext([read("seed.js"), read("soccer.js"), read("app.js")].join("\n"), sandbox);
  return { document, window, store, sandbox };
}

function saved(store) {
  return JSON.parse(store.schoolhub_v1);
}

function clickKid(document, id) {
  const btn = [...document.querySelectorAll("#kids button")].find((b) => b.dataset.k === id);
  btn.onclick();
}

const WEEK = ["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13"];
const PRIOR = ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"];

test("seed keeps both weeks and only sourced Nov 9-13 work", () => {
  const SEED = loadSeed();
  assert.equal(SEED.version, 4);
  assert.equal(SEED.settings.kids.jaylin.name, "Jaylin");
  assert.equal(SEED.settings.kids.skyla.name, "Skyla");
  assert.equal(SEED.settings.kids.jaylin.grade, "8th");
  assert.equal(SEED.settings.kids.skyla.grade, "5th");
  assert.equal(SEED.settings.kids.jaylin.school, "NCCS");
  assert.equal(SEED.settings.kids.skyla.school, "NCCS");
  assert.equal(SEED.unassigned, null);
  for (const id of ["jaylin", "skyla"]) {
    for (const d of [...WEEK, ...PRIOR]) assert.ok(SEED.kids[id].waag[d], `${id} ${d}`);
  }
  assert.equal(SEED.kids.jaylin.schedule.length, 10);
  assert.equal(SEED.kids.skyla.schedule.length, 6);

  const jayBible = SEED.kids.jaylin.waag["2026-11-09"].sections.find((s) => s.subject === "Bible");
  assert.equal(jayBible.stale, true);
  const bibleText = WEEK.map((d) => JSON.stringify(SEED.kids.jaylin.waag[d].sections.find((s) => s.subject === "Bible"))).join("\n");
  assert.match(bibleText, /Nov 2/);
  assert.match(bibleText, /Oct 26-30/);
  assert.match(bibleText, /Esther movie assignment due Mon 11\/9/);
  assert.doesNotMatch(bibleText, /Historical book/);
  assert.doesNotMatch(bibleText, /Ephesians/);
  assert.doesNotMatch(bibleText, /Leader in Me lesson 24/);

  const esther = SEED.kids.jaylin.homework.find((h) => h.id === "jh5");
  assert.equal(esther.due, "2026-11-09");
  assert.equal(esther.done, false);
  assert.match(esther.src, /Previous-week Bible WAAG/);
  assert.match(esther.src, /not updated for Nov 9-13/);

  assert.ok(SEED.kids.jaylin.waag["2026-10-21"].sections.some((s) => s.items.some((i) => i.includes("OUTSIDERS TEST"))));
  assert.ok(SEED.kids.skyla.waag["2026-10-19"].sections.some((s) => s.items.join(" ").includes("City of Ember")));

  const skyFri = JSON.stringify(SEED.kids.skyla.waag["2026-11-13"]);
  assert.match(skyFri, /UNIT 2 SUB-UNIT 2 QUIZ/);
  assert.match(skyFri, /ISRAEL MAP QUIZ TODAY/);
  assert.match(skyFri, /Tuck Everlasting/);
  assert.equal(SEED.kids.skyla.waag["2026-11-13"].sections.find((s) => s.subject === "Bible").stale, undefined);

  const allowedDue = new Set(["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-27", "2026-10-30", "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-16", "2026-11-20", "2026-12-01"]);
  for (const kid of [SEED.kids.jaylin, SEED.kids.skyla]) {
    for (const h of kid.homework) assert.ok(allowedDue.has(h.due), h.title + " " + h.due);
    assert.ok(kid.homework.every((h) => h.done === false));
  }
  assert.ok(SEED.kids.jaylin.events.some((e) => e.id === "j6" && e.date === "2026-11-13"));
  assert.ok(SEED.kids.jaylin.events.some((e) => e.id === "j7" && e.date === "2026-11-13"));
  assert.ok(SEED.kids.skyla.events.some((e) => e.id === "e2" && e.date === "2026-11-06"));
  assert.ok(SEED.kids.skyla.events.some((e) => e.id === "e4" && e.title.includes("Israel Map Quiz")));
  assert.match(SEED.kids.jaylin.waag["2026-11-11"].sections.find((s) => s.subject === "Math").items.join(" "), /Homework: TBA \(per deck\)/);
  assert.match(JSON.stringify(SEED.kids.jaylin.waag["2026-11-10"]), /Who'dunn'it/);
  assert.match(SEED.kids.jaylin.materials.Bible.links[0].label, /stale/i);
  assert.match(SEED.kids.jaylin.materials.Bible.links[0].url, /1BydtnjUZAnpoaQiYxpKekCSHTwqXqDjLuZz8TcCT6So/);
});

test("fresh weekend visit opens Nov 9-13 and still reaches October", () => {
  const sky = boot();
  assert.equal(sky.document.querySelector("#wTitle").textContent, "Week of November 9");
  const skyGrid = sky.document.querySelector("#weekgrid").innerHTML;
  assert.match(skyGrid, /Tuck Everlasting/);
  assert.match(skyGrid, /Wkbk pgs 117-119/);
  assert.match(skyGrid, /Israel Map Quiz/);
  assert.doesNotMatch(skyGrid, /Stale/);

  sky.document.querySelector("#wNext").onclick();
  assert.equal(sky.document.querySelector("#wTitle").textContent, "Week of November 16");
  sky.document.querySelector("#wToday").onclick();
  assert.equal(sky.document.querySelector("#wTitle").textContent, "Week of November 9");
  for (let i = 0; i < 3; i++) sky.document.querySelector("#wPrev").onclick();
  assert.equal(sky.document.querySelector("#wTitle").textContent, "Week of October 19");
  assert.match(sky.document.querySelector("#weekgrid").innerHTML, /City of Ember/);

  const jay = boot({ kid: "jaylin" });
  const grid = jay.document.querySelector("#weekgrid").innerHTML;
  assert.match(grid, /class="stale"/);
  assert.match(grid, /Esther movie assignment/);
  assert.match(grid, /Tell-Tale Heart/);
  assert.match(grid, /UNIT 3 TEST/);
  assert.match(grid, /previous-week deck/);
  assert.doesNotMatch(grid, /Historical book/);
  jay.sandbox.location.hash = "#homework";
  jay.window.onhashchange();
  assert.match(jay.document.querySelector("#hwList").textContent, /Esther movie assignment/);
  assert.match(jay.document.querySelector("#hwList").textContent, /Previous-week Bible WAAG/);
  jay.sandbox.location.hash = "#calendar";
  jay.window.onhashchange();
  const cal = jay.document.querySelector("#calgrid").textContent;
  assert.match(cal, /Unit 3 Test/);
  assert.match(cal, /Mystery Elements Quiz/);
  jay.sandbox.location.hash = "#study";
  jay.window.onhashchange();
  assert.match(jay.document.querySelector("#studyBody").textContent, /Nov 9-13/);
});

test("migration keeps completion, edits, and unassigned imports", () => {
  const SEED = loadSeed();
  const bibleUrl = "https://docs.google.com/presentation/d/1BydtnjUZAnpoaQiYxpKekCSHTwqXqDjLuZz8TcCT6So/edit";
  const stored = JSON.parse(JSON.stringify(SEED));
  stored.version = 3;
  stored.settings.kids.jaylin.color = "#112233";
  stored.settings.showSoccer = false;
  stored.unassigned = { label: "pending import", waag: { "2026-11-02": { title: "hold", sections: [] } }, events: [] };
  const j = stored.kids.jaylin;
  j.schedule[0].teacher = "Kept Teacher";
  j.schedule.push({ period: "11", subject: "Study Hall", teacher: "", room: "", start: "", end: "" });
  j.homework = [
    { id: "jh0", subject: "History", title: "Unit 2 Learning Targets", due: "2026-10-22", done: true, src: "old" },
    { id: "user1", subject: "ELA", title: "My extra assignment", due: "2026-11-12", done: false }
  ];
  j.events = [{ id: "j0", date: "2026-10-21", type: "test", title: "ELA: Outsiders Test" }];
  j.waag = { "2026-10-19": { title: "custom keep", sections: [{ subject: "ELA", items: ["keep me"] }] } };
  j.materials.ELA.notes = "The Outsiders unit; Flowers for Algernon next.";
  j.materials.ELA.cards = [{ q: "Custom Q", a: "Custom A" }];
  j.materials.Bible.notes = "My own bible notes";
  j.materials.Bible.links = [{ label: "Bible WAAG slides", url: bibleUrl }];
  j.materials.Science.notes = "Unit 3: Atoms, Bonding, Periodic Table. Element Hero/Villain project. Bring Chromebook + Periodic Table daily.";
  const s = stored.kids.skyla;
  s.materials.ELA.notes = "The City of Ember: annotate on post-its. Grammar Quiz covers L1-3 & L7-9 (Thu 10/29).";
  s.materials.Math.notes = "Do not replace this math note";
  s.materials.Math.cards = [{ q: "Skyla Q", a: "Skyla A" }];
  s.waag = { "2026-10-23": { title: "skyla custom", sections: [{ subject: "ELA", items: ["leave this"] }] } };
  delete s.homework;
  s.homework = [{ id: "s0", subject: "Math", title: "Wkbk pgs 53-55, #1-4", due: "2026-10-20", done: true, src: "old" }];

  const page = boot({ stored, kid: "jaylin" });
  const D = saved(page.store);
  assert.equal(D.version, 4);
  assert.equal(D.settings.kids.jaylin.color, "#112233");
  assert.equal(D.settings.showSoccer, false);
  assert.equal(D.unassigned.label, "pending import");
  assert.equal(D.kids.jaylin.schedule[0].teacher, "Kept Teacher");
  assert.ok(D.kids.jaylin.schedule.some((p) => p.subject === "Study Hall"));
  const done = D.kids.jaylin.homework.find((h) => h.id === "jh0");
  assert.equal(done.done, true);
  assert.ok(D.kids.jaylin.homework.some((h) => h.id === "user1"));
  assert.ok(D.kids.jaylin.homework.some((h) => h.id === "jh5" && h.done === false));
  assert.equal(D.kids.jaylin.homework.find((h) => h.id === "jh1"), undefined);
  assert.ok(D.kids.jaylin.events.some((e) => e.id === "j0"));
  assert.equal(D.kids.jaylin.events.find((e) => e.id === "j1"), undefined);
  assert.ok(D.kids.jaylin.events.some((e) => e.id === "j6"));
  assert.equal(D.kids.jaylin.waag["2026-10-19"].title, "custom keep");
  assert.match(D.kids.jaylin.waag["2026-11-09"].title, /Mon 11\/9/);
  assert.match(D.kids.jaylin.materials.ELA.notes, /Tell-Tale Heart/);
  assert.deepEqual(D.kids.jaylin.materials.ELA.cards, [{ q: "Custom Q", a: "Custom A" }]);
  assert.equal(D.kids.jaylin.materials.Bible.notes, "My own bible notes");
  assert.match(D.kids.jaylin.materials.Bible.links[0].label, /stale/i);
  assert.match(D.kids.jaylin.materials.Science.notes, /Unit 3 Test Fri 11\/13/);
  assert.equal(D.kids.skyla.homework.find((h) => h.id === "s0").done, true);
  assert.ok(D.kids.skyla.homework.some((h) => h.id === "s6"));
  assert.equal(D.kids.skyla.materials.Math.notes, "Do not replace this math note");
  assert.deepEqual(D.kids.skyla.materials.Math.cards, [{ q: "Skyla Q", a: "Skyla A" }]);
  assert.match(D.kids.skyla.materials.ELA.notes, /Tuck Everlasting/);
  assert.equal(D.kids.skyla.waag["2026-10-23"].title, "skyla custom");
  assert.ok(D.kids.skyla.waag["2026-11-13"]);

  assert.match(page.document.querySelector("#weekgrid").innerHTML, /Esther/);
  assert.match(page.document.querySelector("#weekgrid").innerHTML, /Stale/);
  page.document.querySelector("#wPrev").onclick();
  assert.equal(page.document.querySelector("#weekgrid").innerHTML.includes("⚽"), false);
  page.document.querySelector("#wNext").onclick();
  page.sandbox.location.hash = "#study";
  page.window.onhashchange();
  const bibleTab = [...page.document.querySelectorAll("#subjTabs button")].find((b) => b.textContent === "Bible");
  bibleTab.onclick();
  assert.match(page.document.querySelector("#studyBody").textContent, /My own bible notes/);
  assert.match(page.document.querySelector("#studyBody").textContent, /stale, still Nov 2-6/);
  page.sandbox.location.hash = "#settings";
  page.window.onhashchange();
  assert.match(page.document.querySelector("#unassigned").textContent, /pending import/);
});

test("checking homework and adding an item keeps seed rows", () => {
  const page = boot({ kid: "skyla" });
  page.sandbox.location.hash = "#homework";
  page.window.onhashchange();
  const box = page.document.querySelector("#hwList input");
  const id = box.dataset.id;
  box.checked = true;
  box.onchange();
  const D = saved(page.store);
  assert.equal(D.kids.skyla.homework.find((h) => h.id === id).done, true);
  assert.ok(D.kids.skyla.homework.some((h) => h.id === "s9" && h.done === false));
  const form = page.document.querySelector("#hwForm");
  form.onsubmit({
    preventDefault() {},
    target: {
      subject: { value: "ELA" },
      title: { value: "Family added task" },
      due: { value: "2026-11-12" },
      reset() {}
    }
  });
  const after = saved(page.store);
  assert.ok(after.kids.skyla.homework.some((h) => h.title === "Family added task" && h.done === false));
  assert.ok(after.kids.skyla.waag["2026-10-19"]);
  assert.ok(after.kids.skyla.waag["2026-11-09"]);
  clickKid(page.document, "jaylin");
  assert.match(page.document.querySelector("#weekgrid").innerHTML, /Stale/);
  clickKid(page.document, "skyla");
  assert.match(page.document.querySelector("#weekgrid").innerHTML, /Tuck Everlasting/);
});

test("page stays noindex and cache-busts the new assets", () => {
  const html = read("index.html");
  assert.match(html, /noindex, nofollow/);
  assert.equal(html.includes("?v=3"), false);
  assert.equal((html.match(/\?v=4/g) || []).length, 4);
  const css = read("style.css");
  assert.match(css, /max-width:800px/);
  assert.match(css, /max-width:600px/);
  assert.match(css, /\.stale\{/);
  assert.equal(read("soccer.js").includes("Practice_12258389"), true);
});
