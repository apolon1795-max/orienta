// Playwright on an isolated SQLite/Vite environment, not a production enrollment.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { buildProtectedCourse } from '../scripts/build-protected-course.mjs';
import { startServer } from '../server/local.mjs';
import { freshFreeProgress } from '../services/freeProgress.ts';
import { createTestDraft } from '../services/testProgress.ts';
import { completedState } from './fixtures.mjs';
import { digest, normalizeCode, provisionLearner } from '../server/api.mjs';
const dir = await fs.mkdtemp(join(tmpdir(), 'orienta-pilot-browser-'));
const origin = 'http://127.0.0.1:5195';
const invite = 'PILOT-0123-4567-89AB-CDEF';
const {server,store} = startServer({coursePackage:await buildProtectedCourse(),pilotInviteHash:digest(normalizeCode(invite)),filename:join(dir,'test.sqlite'),allowedOrigins:[origin],port:0});
await once(server,'listening');
const api = `http://127.0.0.1:${server.address().port}`;
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5195','--strictPort'],{env:{...process.env,VITE_PROGRESS_API_URL:api}});
let browser;
try {
  for (let i=0;i<100;i++){
    try{if((await fetch(origin)).ok)break;}catch{}
    await new Promise(r=>setTimeout(r,80));
  }
  browser=await chromium.launch({...(process.env.ORIENTA_BROWSER_EXECUTABLE?{executablePath:process.env.ORIENTA_BROWSER_EXECUTABLE}:{}),headless:true});
  const contexts=await Promise.all(Array.from({length:2},()=>browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'})));
  const enrolled=await Promise.all(contexts.map(async (context,index)=>{
    await context.route('**/*',route=>route.request().url().startsWith(origin)||route.request().url().startsWith(api)?route.continue():route.abort());
    if (index === 0) {
      const old = freshFreeProgress();
      old.draft.step='result'; old.draft.heroData.name='Другой ученик'; old.result={scoreType:'Commander'};
      await context.addInitScript(value => { if (!localStorage.getItem('orienta_free_intro_v1')) localStorage.setItem('orienta_free_intro_v1',value); },JSON.stringify(old));
    }
    const page=await context.newPage();
    const sessionPosts=[];
    page.on('request',r=>{if(r.url()===api+'/session'&&r.method()==='POST')sessionPosts.push(r.postDataJSON());});
    await page.goto(origin+'/#course');
    await page.getByLabel('Код входа',{exact:true}).fill(invite);
    const main = page.getByRole('button',{name:'Войти в поток',exact:true});
    assert.equal(await main.isEnabled(),false);
    const privateCode=await page.getByRole('region',{name:'Личный код восстановления'}).locator('code').textContent();
    assert.match(privateCode,/^ORI-(?:[A-F0-9]{4}-){7}[A-F0-9]{4}$/);
    await page.getByRole('checkbox',{name:/Я сохранил личный код/}).check();
    await main.click();
    await page.getByRole('heading',{name:'Какой ты герой?',exact:true}).waitFor();
    assert.equal(await page.getByLabel('Код входа',{exact:true}).count(),0);
    if(index===0) {
      const click=name=>page.getByRole('button',{name,exact:false}).click();
      await click('Пройти тест');await click('Начать игру');await click('Создать персонажа');await click('Человек');
      await page.getByRole('textbox',{name:'Имя героя'}).fill('Мой синтетический герой');await click('Подтвердить имя');await click('Отправиться в путь');
      for(let i=0;i<5;i++) {
        if(i===4)await click('Сжать артефакт');
        await page.locator('button[aria-pressed]').first().click();await click('Продолжить приключение');
      }
      await page.getByRole('button',{name:/Сорвать|Развернуть|Открыть.*свиток|Снять.*печать/}).click();
      await click('Перейти в мой лагерь');
    } else {
      await page.getByRole('button',{name:'Мой лагерь',exact:true}).click();
    }
    await page.getByRole('heading',{name:'Мой лагерь',exact:true}).waitFor();
    assert.equal(await page.getByRole('heading',{name:'Мой лагерь',exact:true}).count(),1);
    const courseButton=page.getByRole('button',{name:'Открыть карту курса',exact:true});
    await courseButton.waitFor();
    assert.equal(await courseButton.isEnabled(),true);
    assert.equal(await page.getByLabel('Код входа',{exact:true}).count(),0);
    const content=page.waitForResponse(r=>r.url()===api+'/course-content'&&r.request().method()==='GET');
    await courseButton.click();
    assert.equal((await content).status(),200);
    await page.getByRole('heading',{name:'Путь Мастера',exact:true}).waitFor();
    assert.equal(await page.getByLabel('Код входа',{exact:true}).count(),0);
    assert.deepEqual(sessionPosts,[{inviteCode:invite,code:privateCode,consent:true}]);
    const session=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('orienta_session_v1')));
    if (index === 0) assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('orienta_free_intro_v1')).draft.heroData.name),'Другой ученик','joining a pilot cannot overwrite a previous browser-only draft');
    const snapshot = await store.get('progress:'+session.learnerId);
    assert.equal(snapshot?.value.payload.state.testResult ?? null,null,'locally completed intro cannot silently become cloud archetype');
    return {privateCode,learnerId:session.learnerId};
  }));
  assert.notEqual(enrolled[0].privateCode,enrolled[1].privateCode);
  assert.notEqual(enrolled[0].learnerId,enrolled[1].learnerId);
  const existing = await provisionLearner(store, 'Существующий профиль');
  await store.compareAndSet('progress:'+existing.learnerId,0,{payload:{state:completedState(),testDraft:createTestDraft()},mutationId:'existing-profile-browser-fixture',updatedAt:Date.now()});
  const browserWithoutSessionStorage = await browser.newContext({viewport:{width:390,height:844}});
  await browserWithoutSessionStorage.route('**/*',route=>route.request().url().startsWith(origin)||route.request().url().startsWith(api)?route.continue():route.abort());
  await browserWithoutSessionStorage.addInitScript(()=>{
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){ if(this===sessionStorage && key==='orienta_session_v1') throw new DOMException('Quota unavailable','QuotaExceededError'); return original.call(this,key,value); };
  });
  const personal = await browserWithoutSessionStorage.newPage();
  let codePosts=0; personal.on('request',r=>{if(r.url()===api+'/session'&&r.method()==='POST')codePosts++;});
  await personal.goto(origin+'/#profile');
  await personal.getByLabel('Код входа',{exact:true}).fill(existing.code);
  await personal.getByRole('button',{name:'Войти по коду',exact:true}).click();
  await personal.getByRole('heading',{name:'Мой лагерь',exact:true}).waitFor();
  await personal.getByRole('button',{name:'Открыть мой гайд',exact:true}).waitFor();
  await personal.getByRole('button',{name:'Открыть карту курса',exact:true}).click();
  await personal.getByRole('heading',{name:'Путь Мастера',exact:true}).waitFor();
  assert.equal(await personal.getByLabel('Код входа',{exact:true}).count(),0);
  assert.equal(codePosts,1,'in-memory handoff does not repeat code even when browser storage is blocked');
  console.log('PASS: two isolated mobile invitees, one code submission each, original browser-only draft preserved, no silent transfer, returning profile goes to Camp and no second code request even with session-storage failure');
}finally{
  await browser?.close();
  vite.kill();
  await new Promise(resolve=>server.close(resolve));
  await fs.rm(dir,{recursive:true,force:true});
}
