import { chromium } from './browser-runtime.mjs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const base=process.env.TEST_URL || 'http://127.0.0.1:4174/';
const c=await chromium.launchPersistentContext(resolve('Data/special-browser'),{channel:'msedge',headless:true,viewport:{width:390,height:844}});
try {
  const p=await c.newPage(), errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base); await p.evaluate(()=>localStorage.clear()); await p.reload();
  await p.locator('.special-level').waitFor();
  await p.locator('.special-level').screenshot({path:'artifacts/special-card.png'});
  const ids=[],theories=[];let previous=[];
  for(let round=0;round<5;round++) {
    await p.locator('[data-level="special"]').click();
    assert.ok(await p.locator('.theory-notice').isVisible());
    assert.ok(await p.locator('[data-action="start"]').isDisabled());
    await p.getByRole('checkbox').check();await p.locator('[data-action="start"]').click();
    const set=await p.evaluate(()=>JSON.parse(localStorage.getItem('chiikawa-kentei:v1')).run.set);
    assert.ok(set.every(e=>!previous.includes(e.id)));previous=set.map(e=>e.id);
    if(round<4)ids.push(...previous);
    for(let i=0;i<10;i++) {
      if(i===4){await p.reload();await p.locator('[data-action="resume"]').click();}
      if((await p.locator('.question h1').textContent()).startsWith('【考察】')) {
        assert.match(await p.locator('.question .theory-notice').textContent(),/公式に確認できていません/);
        theories.push(set[i].id);
        await p.locator('.question').screenshot({path:'artifacts/theory-question.png'});
      }
      await p.locator(`[data-answer="${round===3&&i===9?1:0}"]`).click();
      await p.locator('[data-action="next"]').click();
    }
    assert.equal(await p.locator('.certificate').count(),round===3?0:1);
    assert.equal(await p.locator('.score').textContent(),round===3?'90 / 100点':'100 / 100点');
    if(round===0)await p.locator('.certificate').screenshot({path:'artifacts/special-certificate.png'});
    for(const d of await p.locator('.review').all()) {
      if((await d.locator('summary').textContent()).includes('【考察】')) {
        await d.evaluate(e=>e.open=true);
        assert.match(await d.locator('.theory-notice').textContent(),/公式に確認できていません/);
        assert.match(await d.locator('a').textContent(),/非公式/);
      }
    }
    await p.locator('[data-action="home"]').click();
  }
  assert.equal(new Set(ids).size,40);assert.equal(new Set(theories).size,2);
  assert.deepEqual(errors,[]);
  console.log('PASS: special 5 full exams; first 40 without duplicates; resume and history; 100 pass / 90 fail; theory warnings in setup/questions/reviews; next cycle excludes previous 10.');
} finally {await c.close();}
