import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const base='http://127.0.0.1:5177';
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5177','--strictPort'],{stdio:'inherit',env:{...process.env,VITE_PROGRESS_API_URL:'http://127.0.0.1:59999'}});
let browser; const errors=[], apiRequests=[];
await fs.mkdir('output/free-browser',{recursive:true});
try {
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,...(process.env.ORIENTA_BROWSER_EXECUTABLE ? {executablePath:process.env.ORIENTA_BROWSER_EXECUTABLE} : {})});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.route('**/*',route=>{
  const url=route.request().url();
  if(url.includes(':59999')){apiRequests.push(url);return route.abort();}
  if(!url.startsWith(base))return route.abort();
  // Keep this test deterministic; original image rendering is checked separately.
  if(url.includes('/images/'))return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#302044"/></svg>'});
  return route.continue();
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
 await page.addInitScript(()=>localStorage.setItem('appState_ru',JSON.stringify({private:'PRIVATE_COURSE_SENTINEL'})));
 await page.goto(base);await page.getByRole('heading',{name:'Какой ты герой?'}).waitFor();
 assert.equal(await page.getByLabel('Код входа',{exact:true}).count(),0);
 await page.screenshot({path:'output/free-browser/01-intro-mobile.png',fullPage:true});
 const click=async name=>page.getByRole('button',{name,exact:false}).click();
 await click('Пройти тест');await click('Начать игру');await click('Создать персонажа');await click('Человек');
 await page.getByRole('textbox',{name:'Имя героя'}).fill('Синтетический герой');await click('Подтвердить имя');await click('Отправиться в путь');
 const prompt=page.locator('.adventure-question-copy');
 const assertPrompt=async()=>{
  const box=await prompt.boundingBox();
  assert.ok(box.y>=0 && box.y+box.height<=400, 'question, not the artwork, should be at the top: '+JSON.stringify(box));
  assert.equal(await prompt.evaluate(e=>document.activeElement===e),true,'focus follows new question, not a text input');
 };
 await assertPrompt();
 for(let i=0;i<5;i++){
  if(i===4)await click('Сжать артефакт');
  const selected=page.locator('.adventure-answer').nth(1);
  await selected.scrollIntoViewIfNeeded();
  const anchor=await selected.evaluate(e=>e.getBoundingClientRect().y);
  await selected.tap();
  assert.equal(await selected.getAttribute('aria-pressed'),'true');
  assert.ok(Math.abs(await selected.evaluate(e=>e.getBoundingClientRect().y)-anchor)<=2,'selection must not move the same question');
  await click('Продолжить приключение');
  if(i<3)await assertPrompt();
  if(i===0){await page.reload();await page.getByText('Испытание 2 из 5',{exact:false}).waitFor();await assertPrompt();}
 }
 await page.getByRole('button',{name:/Сорвать|Развернуть|Открыть.*свиток|Снять.*печать/}).click();
 await click('Подробнее о моём архетипе');await page.locator('#guide-action-btn').waitFor();
 const verifyArchetypeNav=async target=>{
  const back=target.getByRole('button',{name:'В лагерь',exact:true});
  await back.waitFor();
  assert.equal(await back.count(),1);
  assert.equal(await target.getByRole('button',{name:'Мой лагерь',exact:true}).count(),0);
  assert.ok((await back.boundingBox()).width>0);
  return back;
 };
 await verifyArchetypeNav(page);
 const savedIntro=await page.evaluate(()=>localStorage.getItem('orienta_free_intro_v1'));
 assert.ok(savedIntro);
 const desktop=await context.newPage();
 await desktop.setViewportSize({width:1280,height:900});
 await desktop.addInitScript(saved=>localStorage.setItem('orienta_free_intro_v1',saved),savedIntro);
 await desktop.goto(base+'/#hub');
 await desktop.getByRole('button',{name:'Архетип',exact:true}).click();
 await desktop.screenshot({path:'output/free-browser/03-guide-desktop.png'});
 await (await verifyArchetypeNav(desktop)).click();
 await desktop.getByRole('heading',{name:'Мой лагерь',exact:true}).waitFor();
 assert.equal(new URL(desktop.url()).hash,'#hub');
 assert.equal(apiRequests.length,0,'completed unsigned archetype, guide and camp do not require the API');
 await desktop.getByRole('button',{name:'Войти по коду',exact:true}).click();
 await desktop.getByLabel('Код входа',{exact:true}).fill('ORI-0000-0000-0000-0000-0000-0000-0000-0000');
 const requestsBeforeLogin=apiRequests.length;
 await desktop.getByRole('button',{name:'Войти по коду',exact:true}).click();
 await desktop.getByRole('alert').filter({hasText:'Не удалось войти: проблема с подключением к сервису.'}).waitFor();
 assert.ok(apiRequests.slice(requestsBeforeLogin).some(url=>url.endsWith('/session')));
 await desktop.getByRole('link',{name:'Мой лагерь',exact:true}).click();
 await desktop.getByRole('button',{name:'Архетип',exact:true}).click();
 await verifyArchetypeNav(desktop);
 await desktop.close();
 apiRequests.length=0;
 await page.screenshot({path:'output/free-browser/02-guide-mobile.png',fullPage:true});
 await (await verifyArchetypeNav(page)).click();await page.getByRole('heading',{name:'Мой лагерь',exact:true}).waitFor();
 assert.equal(new URL(page.url()).hash,'#hub');
 await page.reload();await page.getByRole('heading',{name:'Мой лагерь',exact:true}).waitFor();
 const second=await context.newPage();await second.goto(base);await second.getByRole('heading',{name:'Мой лагерь',exact:true}).waitFor();await second.close();
 await click('Сообщество · скоро');await page.getByText('Сообщество скоро откроется',{exact:true}).waitFor();assert.equal(await page.locator('a[href*="t.me"]').count(),0);
 assert.equal(await page.getByRole('heading',{name:'Мой лагерь',exact:true}).count(),1);
 assert.equal(apiRequests.length,0,'free flow must not call backend/AI');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('appState_ru')).private),'PRIVATE_COURSE_SENTINEL');
 await click('Удалить результат теста');await click('Отмена');await click('Архетип');
 await page.locator('#guide-action-btn').click();await click('Удалить результат теста');await page.getByRole('dialog').getByRole('button',{name:'Удалить результат',exact:true}).click();
 await page.goto(base+'/#guide');await page.getByRole('heading',{name:'Какой ты герой?',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Мой лагерь',exact:true}).count(),1,'empty guide fallback retains normal navigation');
 assert.equal(await page.getByRole('button',{name:'В лагерь',exact:true}).count(),0);
 await page.reload();await page.getByRole('button',{name:'Пройти тест',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Мой архетип',exact:true}).count(),0);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('appState_ru')).private),'PRIVATE_COURSE_SENTINEL');
 await click('У меня есть код');
 await page.getByLabel('Код входа',{exact:true}).waitFor();
 await page.getByRole('link',{name:'Мой лагерь'}).click();await page.getByRole('heading',{name:'Мой лагерь',exact:true}).waitFor();
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS free: 5 situations, reload/resume, archetype, course boundary, zero API/AI calls, cancel/reset, private course isolation, pilot sign-in and return; mobile screenshots saved.');
}finally{await browser?.close();vite.kill();}
