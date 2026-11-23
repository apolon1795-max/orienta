// Loopback only; no real learners, hosted media, AI or browser profile.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from 'playwright';
import {buildProtectedCourse} from '../scripts/build-protected-course.mjs';
import {startServer} from '../server/local.mjs';
import {provisionLearner} from '../server/api.mjs';
import {completedState} from './fixtures.mjs';
import {createTestDraft} from '../services/testProgress.ts';

let browser,vite,server,store;
const tmp=await mkdtemp(join(tmpdir(),'ori-arch-final-')),site='http://127.0.0.1:5187';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try {
  const coursePackage=await buildProtectedCourse();
  const lessons=Array.from({length:7},(_,i)=>({video:i>=5?'https://kinescope.io/embed/fixturevideo'+i:'',captions:''}));
  ({server,store}=startServer({filename:join(tmp,'progress.sqlite'),port:0,allowedOrigins:[site],coursePackage,lessonConfig:lessons}));
  await once(server,'listening');
  const api='http://127.0.0.1:'+server.address().port;
  vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5187','--strictPort'],
    {env:{...process.env,VITE_PROGRESS_API_URL:api},stdio:'inherit'});
  for(let i=0;i<120;i++) {
    if(vite.exitCode!==null) throw Error('fixture_exited');
    if(await fetch(site).then(r=>r.ok,()=>false)) break;
    if(i===119)throw Error('fixture_not_ready');await sleep(50);
  }
  browser=await chromium.launch({headless:true,...(process.env.ORIENTA_BROWSER_EXECUTABLE?{executablePath:process.env.ORIENTA_BROWSER_EXECUTABLE}:{})});
  for(const width of [320,390,1280]) {
    const learner=await provisionLearner(store),
      other=await provisionLearner(store),
      state=completedState(), draft=createTestDraft();
    state.testResult=null;state.course.activeStage=null;
    const seedCourse=structuredClone(state.course);
    Object.assign(draft,{step:'result',heroData:{name:'Искатель',race:'Эльф'},scores:{Commander:1,Creator:3,Researcher:1,Communicator:0}});
    await store.compareAndSet('progress:'+learner.learnerId,0,{payload:{state,testDraft:draft},updatedAt:Date.now(),mutationId:'synthetic_arch_initial'});
    const context=await browser.newContext({viewport:{width,height:844},hasTouch:width<=390});
    let failWrite=true,aiCount=0;
    await context.route('**/*',route=>{
      const req=route.request(),url=req.url();
      if(url.startsWith(site)||url.startsWith(api)){
        if(url===api+'/ai-summary'){aiCount++;return route.abort();}
        if(url===api+'/progress'&&req.method()==='PUT'&&failWrite&&req.postDataJSON()?.payload?.state?.testResult){
          return route.fulfill({status:503,headers:{'access-control-allow-origin':site},json:{error:'storage_unavailable'}});
        }
        return route.continue();
      }
      if(url.startsWith('https://kinescope.io/embed/fixturevideo'))return route.fulfill({contentType:'text/html',body:'Synthetic frame'});
      return route.abort();
    });
    const page=await context.newPage(), button=(name)=>page.getByRole('button',{name,exact:true});
    await page.goto(site+'/#course');
    await page.getByLabel('Код входа',{exact:true}).fill(learner.code);
    await button('Войти по коду').click();
    await page.locator('iframe[title="Знакомство · приветственное видео"][src*="fixturevideo5"]').waitFor({timeout:8000});
    if (width <= 390) {
      const typography=await page.locator('.atlas-stop-label strong').evaluateAll(nodes=>{
        const titles=nodes.map(element=>{
          const text=element.firstChild;
          return {title:text.data,splitWords:[...text.data.matchAll(/\S+/gu)].flatMap(match=>{
            const word=document.createRange();
            word.setStart(text,match.index);
            word.setEnd(text,match.index+match[0].length);
            return word.getClientRects().length>1?[match[0]]:[];
          })};
        });
        return {titles,viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth};
      });
      assert.equal(typography.titles.length,6);
      assert.deepEqual(typography.titles.flatMap(x=>x.splitWords),[],'stage titles must wrap only between words');
      assert.ok(typography.scroll<=typography.viewport,'page must not overflow the visible width: '+JSON.stringify(typography));
    }
    await page.getByRole('button',{name:/^Финал: Профкарта/}).click();
    const frame=page.locator('iframe[title="Финальное видео"][src*="fixturevideo6"]');
    await frame.waitFor();
    await sleep(1200);
    const priorCourse=(await store.get('progress:'+learner.learnerId)).value.payload.state.course;
    assert.deepEqual(priorCourse.completedStages,seedCourse.completedStages);
    const openTest=page.getByRole('button',{name:/^(Пройти тест на архетип|Собрать профкарту)$/});
    await openTest.click();
    await button('Сохранить и вернуться к финалу').waitFor();
    await sleep(1200); // beyond ordinary result autosave debounce
    const stored=()=>store.get('progress:'+learner.learnerId);
    assert.equal((await stored()).value.payload.state.testResult,null);
    await button('К финалу без сохранения результата').click();
    await frame.waitFor();
    await openTest.click();
    await button('Сохранить и вернуться к финалу').click();
    const retry=page.getByText('Повторить сохранение',{exact:true});
    await retry.waitFor({timeout:8000});
    assert.equal((await stored()).value.payload.state.testResult,null);
    assert.equal(await frame.count(),0);
    failWrite=false;
    await retry.click();
    await frame.waitFor({timeout:8000});
    await button('Собрать профкарту').waitFor();
    const saved=(await stored()).value.payload.state;
    assert.equal(saved.testResult.scoreType,'Creator');
    assert.deepEqual(saved.course.completedStages,priorCourse.completedStages);
    assert.equal(saved.course.activeStage,priorCourse.activeStage);
    assert.equal(saved.course.s4Dream,priorCourse.s4Dream);
    assert.deepEqual(saved.course.lessons,priorCourse.lessons);
    assert.equal(await store.get('progress:'+other.learnerId),null);
    await button('Собрать профкарту').click();
    await page.locator('[data-view="AI_SUMMARY"]').waitFor();
    assert.equal(aiCount,0);
    await context.close();
    console.log('PASS final → test → cancel → explicit save/outage/retry → final → card, no AI:',width);
  }
}finally{
  await browser?.close();
  if(vite?.exitCode===null){vite.kill();await once(vite,'exit');}
  if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  if(!server)store?.close?.();
  await rm(tmp,{recursive:true,force:true});
}
