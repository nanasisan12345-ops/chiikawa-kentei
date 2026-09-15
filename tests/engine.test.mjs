import { test } from "node:test";
import assert from "node:assert/strict";
import { questions, LEVELS, SOURCES } from "../data.js";
import {
  makeExam,
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
test("60問・各級20問・単一正答と出典", () => {
  assert.equal(questions.length, 60);
  assert.equal(new Set(questions.map((q) => q.text)).size, 60);
  for (const level of Object.keys(LEVELS))
    assert.equal(questions.filter((q) => q.level === level).length, 20);
  for (const q of questions) {
    assert.equal(new Set(q.options).size, 4);
    assert.ok(q.options[q.correct]);
    assert.ok(q.explanation);
    assert.equal(new URL(SOURCES[q.source].url).protocol, "https:");
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
