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
import { digest, normalizeCode } from '../server/api.mjs';
const dir = await fs.mkdtemp(join(tmpdir(), 'orienta-pilot-browser-'));
const origin = 'http://127.0.0.1:5195';
const invite = 'PILOT-0123-4567-89AB-CDEF';
const {server} = startServer({coursePackage:await buildProtectedCourse(),pilotInviteHash:digest(normalizeCode(invite)),filename:join(dir,'test.sqlite'),allowedOrigins:[origin],port:0});
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
  const enrolled=await Promise.all(contexts.map(async context=>{
    await context.route('**/*',route=>route.request().url().startsWith(origin)||route.request().url().startsWith(api)?route.continue():route.abort());
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
    const courseButton=page.getByRole('button',{name:'Открыть полный курс',exact:true});
    await courseButton.waitFor();
    assert.equal(await courseButton.isEnabled(),true);
    assert.equal(await page.getByLabel('Код входа',{exact:true}).count(),0);
    const content=page.waitForResponse(r=>r.url()===api+'/course-content'&&r.request().method()==='GET');
    await courseButton.click();
    assert.equal((await content).status(),200);
    assert.deepEqual(sessionPosts,[{inviteCode:invite,code:privateCode,consent:true}]);
    const session=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('orienta_session_v1')));
    return {privateCode,learnerId:session.learnerId};
  }));
  assert.notEqual(enrolled[0].privateCode,enrolled[1].privateCode);
  assert.notEqual(enrolled[0].learnerId,enrolled[1].learnerId);
  console.log('PASS: two isolated mobile contexts, private recovery codes, one code submission each, protected content enabled');
}finally{
  await browser?.close();
  vite.kill();
  await new Promise(resolve=>server.close(resolve));
  await fs.rm(dir,{recursive:true,force:true});
}
