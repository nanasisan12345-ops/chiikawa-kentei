import { chromium } from "./browser-runtime.mjs";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { questions, LEVELS } from "../data.js";
import { makeExam, KEY } from "../engine.js";
const base = process.env.TEST_URL || "http://127.0.0.1:4174/";
await mkdir("artifacts", { recursive: true });
const context = await chromium.launchPersistentContext(
  resolve("Data/test-browser"),
  {
    channel: "msedge",
    headless: true,
    viewport: { width: 1280, height: 950 },
    reducedMotion: "reduce",
  },
);
try {
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator(".level").first().waitFor();
  assert.equal(await page.locator(".level").count(), 6);
  await page.screenshot({ path: "artifacts/home-desktop.png", fullPage: true });
  for (const width of [320, 390, 768, 1280, 3840]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "5級に挑戦する" }).click();
  assert.ok(
    await page
      .getByRole("button", { name: "検定をはじめる", exact: true })
      .isDisabled(),
  );
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "検定をはじめる", exact: true })
    .click();
  const initial = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)).run.set,
    KEY,
  );
  await page.locator('[data-answer="1"]').click();
  await page.getByRole("button", { name: "次の問題へ" }).click();
  await page.getByRole("button", { name: "前の問題" }).click();
  assert.equal(
    await page.locator('[data-answer="1"]').getAttribute("aria-pressed"),
    "true",
  );
  await page.locator('[data-answer="0"]').click();
  await page.reload();
  await page.getByRole("button", { name: "続きから" }).click();
  assert.equal(
    await page.locator('[data-answer="0"]').getAttribute("aria-pressed"),
    "true",
  );
  await page.screenshot({
    path: "artifacts/question-mobile.png",
    fullPage: true,
  });
  for (let i = 0; i < 10; i++) {
    await page.locator('[data-answer="0"]').click();
    await page.locator('[data-action="next"]').click();
  }
  assert.equal(await page.locator(".score").textContent(), "100 / 100点");
  assert.equal(await page.locator(".review").count(), 10);
  await page.locator("#certificate-input").fill("<img src=x>");
  assert.equal(
    await page.locator("#certificate-name").textContent(),
    "<img src=x> 様",
  );
  assert.equal(await page.locator("#certificate-name img").count(), 0);
  await page.locator("#certificate-input").fill("ちいかわ好き");
  await page.screenshot({
    path: "artifacts/result-mobile.png",
    fullPage: true,
  });
  await page.emulateMedia({ media: "print" });
  assert.ok(await page.locator(".certificate").isVisible());
  assert.ok(!(await page.locator("header").isVisible()));
  await page.emulateMedia({ media: "screen" });
  await page.evaluate(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw Error("denied");
        },
      },
    });
  });
  await page.getByRole("button", { name: "結果をシェアする" }).click();
  assert.ok(
    (await page.locator(".manual-copy").inputValue()).includes("100点"),
  );
  await page.reload();
  await page.getByRole("button", { name: "前回の結果を見る" }).click();
  assert.equal(await page.locator(".score").textContent(), "100 / 100点");
  assert.equal(
    await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)).records.length,
      KEY,
    ),
    1,
  );
  await page.getByRole("button", { name: "別の10問に挑戦する" }).click();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "検定をはじめる", exact: true })
    .click();
  const next = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)).run.set,
    KEY,
  );
  assert.ok(next.every((e) => !initial.some((p) => p.id === e.id)));
  for (let i = 0; i < 10; i++) {
    await page.locator('[data-answer="1"]').click();
    await page.locator('[data-action="next"]').click();
  }
  assert.equal(await page.locator(".certificate").count(), 0);
  assert.equal(await page.locator(".score").textContent(), "0 / 100点");
  assert.equal(await page.locator("details[open]").count(), 10);
  // Every question at the narrowest supported size; correct source links and text.
  await page.setViewportSize({ width: 320, height: 700 });
  for (const q of questions) {
    const set = makeExam(q.level);
    if (!set.some((e) => e.id === q.id))
      set[0] = { id: q.id, order: [3, 2, 1, 0] };
    const target = set.find((e) => e.id === q.id);
    const run = {
      id: "layout",
      level: q.level,
      date: new Date().toISOString(),
      index: 0,
      done: false,
      answers: Array(10).fill(null),
      set: [target, ...set.filter((e) => e.id !== q.id)],
    };
    await page.evaluate(
      ({ key, run }) =>
        localStorage.setItem(
          key,
          JSON.stringify({ version: 1, run, last: {}, records: [] }),
        ),
      { key: KEY, run },
    );
    await page.reload();
    await page.getByRole("button", { name: "続きから" }).click();
    assert.equal(await page.locator(".question h1").textContent(), q.text);
    assert.equal(await page.locator('.question .theory-notice').count(), q.kind === 'theory' ? 1 : 0);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    for (const b of await page.locator(".answer").all())
      assert.ok((await b.boundingBox()).height >= 60);
  }
  for (const level of Object.keys(LEVELS)) {
    const run = {
      id: "boundary",
      level,
      date: new Date().toISOString(),
      index: 9,
      done: true,
      answers: Array.from({ length: 10 }, (_, i) =>
        i < LEVELS[level].pass ? 0 : 1,
      ),
      set: makeExam(level),
    };
    await page.evaluate(
      ({ key, run }) =>
        localStorage.setItem(
          key,
          JSON.stringify({ version: 1, run, last: {}, records: [] }),
        ),
      { key: KEY, run },
    );
    await page.reload();
    await page.getByRole("button", { name: "前回の結果を見る" }).click();
    assert.ok(await page.locator(".certificate").isVisible());
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
  }
  const blocked = await context.newPage();
  await blocked.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw Error("denied");
      },
    }),
  );
  await blocked.goto(base);
  await blocked.getByRole("button", { name: "3級に挑戦する" }).click();
  await blocked.getByRole("checkbox").check();
  await blocked
    .getByRole("button", { name: "検定をはじめる", exact: true })
    .click();
  for (let i = 0; i < 10; i++) {
    await blocked.locator('[data-answer="0"]').click();
    await blocked.locator('[data-action="next"]').click();
  }
  assert.ok(await blocked.locator(".certificate").isVisible());
  assert.deepEqual(errors, []);
  console.log(
    "PASS: consent; full pass/fail; change/back/resume; no-repeat retry; 240 questions at 320px; 6 grade thresholds; 320–3840px; certificate/print/name escaping; share fallback; denied storage.",
  );
} finally {
  await context.close();
}
