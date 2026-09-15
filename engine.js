import { questions, LEVELS } from "./data.js";
export const COUNT = 10;
export const KEY = "chiikawa-kentei:v1";
export const byId = new Map(questions.map((q) => [q.id, q]));
export function shuffle(items, random = Math.random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export function makeExam(level, previous = [], random = Math.random) {
  if (!Object.hasOwn(LEVELS, level)) throw new TypeError("級が不正です");
  const pool = questions.filter((q) => q.level === level);
  const unseen = shuffle(
    pool.filter((q) => !previous.includes(q.id)),
    random,
  );
  const seen = shuffle(
    pool.filter((q) => previous.includes(q.id)),
    random,
  );
  return shuffle([...unseen, ...seen].slice(0, COUNT), random).map((q) => ({
    id: q.id,
    order: shuffle([0, 1, 2, 3], random),
  }));
}
export function validRun(run) {
  if (
    !run ||
    !Object.hasOwn(LEVELS, run.level) ||
    typeof run.id !== "string" ||
    run.id.length > 100 ||
    !Number.isFinite(Date.parse(run.date)) ||
    !Array.isArray(run.set) ||
    run.set.length !== COUNT ||
    new Set(run.set.map((e) => e?.id)).size !== COUNT ||
    !Array.isArray(run.answers) ||
    run.answers.length !== COUNT ||
    !Number.isInteger(run.index) ||
    run.index < 0 ||
    run.index >= COUNT ||
    typeof run.done !== "boolean"
  )
    return false;
  if (
    !run.set.every(
      (e) =>
        byId.get(e?.id)?.level === run.level &&
        Array.isArray(e.order) &&
        e.order.length === 4 &&
        new Set(e.order).size === 4 &&
        e.order.every((x) => Number.isInteger(x) && x >= 0 && x < 4),
    )
  )
    return false;
  let gap = false;
  for (const a of run.answers) {
    if (a === null) gap = true;
    else if (gap || !Number.isInteger(a) || a < 0 || a > 3) return false;
  }
  const first = run.answers.indexOf(null);
  return (!run.done || first === -1) && (first === -1 || run.index <= first);
}
export function score(run) {
  if (!validRun(run) || run.answers.includes(null))
    throw new TypeError("すべて回答してください");
  const correct = run.set.reduce(
    (n, e, i) => n + Number(run.answers[i] === byId.get(e.id).correct),
    0,
  );
  return {
    correct,
    points: correct * 10,
    passed: correct >= LEVELS[run.level].pass,
  };
}
export function emptyState() {
  return { version: 1, run: null, last: {}, records: [] };
}
export function load(storage) {
  const empty = emptyState();
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return { state: empty };
    const s = JSON.parse(raw);
    if (
      s?.version !== 1 ||
      (s.run !== null && !validRun(s.run)) ||
      !Array.isArray(s.records) ||
      !s.last ||
      typeof s.last !== "object"
    )
      throw Error();
    const last = {};
    for (const level of Object.keys(LEVELS)) {
      last[level] = Array.isArray(s.last[level])
        ? [
            ...new Set(
              s.last[level].filter((id) => byId.get(id)?.level === level),
            ),
          ].slice(0, COUNT)
        : [];
    }
    const records = s.records
      .filter(
        (r) =>
          r &&
          typeof r.id === "string" &&
          Object.hasOwn(LEVELS, r.level) &&
          Number.isInteger(r.correct) &&
          r.correct >= 0 &&
          r.correct <= COUNT &&
          Number.isFinite(Date.parse(r.date)),
      )
      .slice(-20);
    return { state: { version: 1, run: s.run, last, records } };
  } catch {
    return {
      state: empty,
      error: "保存データを読み込めませんでした。この画面で新しく挑戦できます。",
    };
  }
}
export function save(storage, state) {
  try {
    storage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
