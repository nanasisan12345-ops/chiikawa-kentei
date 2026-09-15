import { test } from "node:test";
import assert from "node:assert/strict";
import { questions, LEVELS, SOURCES } from "../data.js";
import {
  makeExam,
  rememberSeen,
  validRun,
  score,
  load,
  save,
  emptyState,
  KEY,
} from "../engine.js";
const run = (level = "easy") => ({
  id: "test",
  level,
  date: "2026-09-15T00:00:00Z",
  set: makeExam(level),
  answers: Array(10).fill(null),
  index: 0,
  done: false,
});
test("240問・各級専用40問・全6段階・単一正答と出典", () => {
  assert.equal(questions.length, 240);
  assert.equal(new Set(questions.map((q) => q.text)).size, 240);
  assert.deepEqual(Object.values(LEVELS).map(l => l.name), ['5級','4級','3級','2級','1級','特級']);
  for (const level of Object.keys(LEVELS))
    assert.equal(questions.filter((q) => q.level === level).length, 40);
  for (const q of questions) {
    assert.equal(new Set(q.options).size, 4);
    assert.ok(q.options[q.correct]);
    assert.ok(q.explanation);
    assert.equal(new URL(SOURCES[q.source].url).protocol, "https:");
  }
});
test('4級・2級は専用問題を出題し、旧版の途中回答も再開できる', () => {
  for (const level of ['grade4','grade2']) {
    const r = run(level);
    assert.ok(r.set.every(e => questions.find(q => q.id === e.id).level === level));
    const legacy = {...r, set:LEVELS[level].legacyPools.flatMap(source=>makeExam(source).slice(0,5))};
    assert.ok(validRun(legacy));
    assert.deepEqual(load({getItem:()=>JSON.stringify({...emptyState(),run:legacy})}).state.run,legacy);
    const state = {...emptyState(), run:r, last:{[level]:r.set.map(e=>e.id)}};
    const restored = load({getItem:()=>JSON.stringify(state)}).state;
    assert.deepEqual(restored.run,r);
    assert.deepEqual(restored.last[level], state.last[level]);
    const wrong = {...r, set:r.set.map((e,i)=> i===0 ? {...e,id:level==='grade4'?'q60':'q01'} : e)};
    assert.equal(validRun(wrong),false);
  }
});
test("100回の再挑戦で直前と重複せず、選択肢と問題の欠落なし", () => {
  for (const level of Object.keys(LEVELS)) {
    let previous = [];
    for (let i = 0; i < 100; i++) {
      const set = makeExam(level, previous);
      assert.equal(set.length, 10);
      assert.equal(new Set(set.map((e) => e.id)).size, 10);
      for (const e of set) {
        assert.ok(!previous.includes(e.id));
        assert.deepEqual([...e.order].sort(), [0, 1, 2, 3]);
      }
      previous = set.map((e) => e.id);
    }
  }
  assert.throws(() => makeExam("toString"));
});
test("全級の0点・満点・合格境界を正答IDで採点", () => {
  for (const level of Object.keys(LEVELS))
    for (const n of [0, LEVELS[level].pass - 1, LEVELS[level].pass, 10]) {
      const r = run(level);
      r.answers = r.answers.map((_, i) => (i < n ? 0 : 1));
      r.done = true;
      assert.deepEqual(score(r), {
        correct: n,
        points: n * 10,
        passed: n >= LEVELS[level].pass,
      });
      r.set.forEach((e) => e.order.reverse());
      assert.equal(score(r).correct, n);
    }
});
test("途中回答の引き継ぎ、欠損・不正順序・飛び回答の拒否", () => {
  const r = run();
  r.answers[0] = 2;
  r.index = 1;
  assert.ok(validRun(r));
  for (const bad of [
    { ...r, answers: Array(10) },
    { ...r, index: 4 },
    { ...r, done: true },
    { ...r, set: r.set.slice(1) },
    { ...r, level: "__proto__" },
    { ...r, set: r.set.map((e) => ({ ...e, order: [0, 0, 1, 2] })) },
  ])
    assert.equal(validRun(bad), false);
  assert.throws(() => score(r));
});
test("保存拒否・破損・再読込、他のキーを触らない", () => {
  const map = new Map([["other", "keep"]]),
    storage = { getItem: (k) => map.get(k), setItem: (k, v) => map.set(k, v) };
  const state = emptyState();
  state.run = run();
  state.run.answers[0] = 2;
  state.run.index = 1;
  assert.ok(save(storage, state));
  assert.deepEqual(load(storage).state.run, state.run);
  assert.equal(map.get("other"), "keep");
  map.set(KEY, "broken");
  assert.ok(load(storage).error);
  const denied = {
    getItem() {
      throw Error();
    },
    setItem() {
      throw Error();
    },
  };
  assert.ok(load(denied).error);
  assert.equal(save(denied, state), false);
});
test('未確認の考察は特級だけで明示し、既存問題IDを維持する', () => {
  const theories = questions.filter(q => q.kind === 'theory');
  assert.equal(theories.length, 2);
  for (const q of theories) {
    assert.equal(q.level, 'special');
    assert.ok(q.text.startsWith('【考察】'));
    assert.match(q.explanation, /公式/);
    assert.equal(SOURCES[q.source].kind, 'theory');
  }
  assert.equal(questions.find(q=>q.id==='q60').level, 'hard');
  assert.equal(questions.find(q=>q.id==='q61').level, 'special');
});
test('各級40問を重複なくひと巡りし、履歴を復元して次の周回も直前10問を避ける', () => {
  for (const level of Object.keys(LEVELS)) {
    let state = emptyState();
    for (let cycle=0; cycle<5; cycle++) {
      const cycleIds=[];
      for (let i=0; i<4; i++) {
        const previous=state.last[level] || [];
        const set=makeExam(level,previous,Math.random,state.seen[level]);
        assert.ok(set.every(e=>!previous.includes(e.id)));
        cycleIds.push(...set.map(e=>e.id));
        state.seen[level]=rememberSeen(level,state.seen[level],set);
        state.last[level]=set.map(e=>e.id);
        state=load({getItem:()=>JSON.stringify(state)}).state;
      }
      assert.equal(new Set(cycleIds).size,40);
    }
  }
});
