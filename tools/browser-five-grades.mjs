import {chromium} from './browser-runtime.mjs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const live=process.env.LIVE==='1',exam='https://nanasisan12345-ops.github.io/chiikawa-kentei/',match='https://nanasisan12345-ops.github.io/chiikawa-character-match/';
const c=await chromium.launchPersistentContext(resolve('Data/five-grades-browser'),{channel:'msedge',headless:true,viewport:{width:390,height:844}});
try{const p=await c.newPage();await p.goto(live?exam:'http://127.0.0.1:4174/');await p.evaluate(()=>localStorage.clear());await p.reload();await p.locator(".level").first().waitFor();assert.deepEqual(await p.locator('.level .grade').allTextContents(),['5級','4級','3級','2級','1級','特級']);
for(const name of ['4級','2級','特級']){
 await p.getByRole('button',{name:name+'に挑戦する'}).click();await p.getByRole('checkbox').check();await p.getByRole('button',{name:'検定をはじめる',exact:true}).click();
 for(let i=0;i<10;i++){if(i===4){await p.reload();await p.getByRole('button',{name:'続きから'}).click();}await p.locator('[data-answer="0"]').click();await p.locator('[data-action="next"]').click();}
 assert.equal(await p.locator('.score').textContent(),'100 / 100点');assert.equal(await p.locator('.certificate-grade strong').textContent(),name);assert.ok(await p.locator('.certificate-grade strong').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=60));
 await p.locator('.certificate').screenshot({path:`artifacts/certificate-${name==='4級'?'4':name==='2級'?'2':'special'}.png`});await p.getByRole('button',{name:'ほかの級を選ぶ'}).click();
}
for(const [url,destination,label] of [[live?match:'http://127.0.0.1:4173/',exam,'match'],[live?exam:'http://127.0.0.1:4174/',match,'exam']]){
 await p.goto(url);await p.locator(label==='match'?'#app h1':'.level').first().waitFor();assert.equal(await p.locator(label==='match'?'.sister-banner a':'.link-card').getAttribute('href'),destination);
 assert.equal(await p.locator('header a').count(),1);
 for(const width of [320,1280]){await p.setViewportSize({width,height:900});const card=p.locator(label==='match'?'.sister-banner':'.link-card');assert.ok(await card.isVisible());assert.ok(await card.evaluate(e=>e.getBoundingClientRect().top+scrollY>600));assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await card.scrollIntoViewIfNeeded();if(width===1280)await card.screenshot({path:`artifacts/${label}-banner.png`});}
 if(live){await p.locator(label==='match'?'.sister-banner a':'.link-card').click();await p.waitForURL(destination);}
}
console.log('PASS: six ordered grades; 4/2/special full exams + resume + large certificate; lower 320/1280px cards; '+(live?'live bidirectional navigation':'correct reciprocal URLs'));
}finally{await c.close()}
