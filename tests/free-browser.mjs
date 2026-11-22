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
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
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
 for(let i=0;i<5;i++){
  if(i===4)await click('Сжать артефакт');
  await page.locator('button[aria-pressed]').first().click();await click('Продолжить приключение');
  if(i===0){await page.reload();await page.getByText('Испытание 2 из 5',{exact:false}).waitFor();}
 }
 await page.getByRole('button',{name:/Сорвать|Развернуть|Открыть.*свиток|Снять.*печать/}).click();
 await click('Подробнее о моём архетипе');await page.locator('#guide-action-btn').waitFor();
 await page.screenshot({path:'output/free-browser/02-guide-mobile.png',fullPage:true});
 await page.locator('#guide-action-btn').click();await page.getByRole('heading',{name:'Мой лагерь',exact:true}).waitFor();
 await page.reload();await page.getByRole('heading',{name:'Мой лагерь',exact:true}).waitFor();
 const second=await context.newPage();await second.goto(base);await second.getByRole('heading',{name:'Мой лагерь',exact:true}).waitFor();await second.close();
 await click('Сообщество · скоро');await page.getByText('Сообщество скоро откроется',{exact:true}).waitFor();assert.equal(await page.locator('a[href*="t.me"]').count(),0);
 assert.equal(await page.getByRole('heading',{name:'Мой лагерь',exact:true}).count(),1);
 assert.equal(apiRequests.length,0,'free flow must not call backend/AI');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('appState_ru')).private),'PRIVATE_COURSE_SENTINEL');
 await click('Удалить результат теста');await click('Отмена');await click('Архетип');
 await page.locator('#guide-action-btn').click();await click('Удалить результат теста');await page.getByRole('dialog').getByRole('button',{name:'Удалить результат',exact:true}).click();
 await page.reload();await page.getByRole('button',{name:'Пройти тест',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Мой архетип',exact:true}).count(),0);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('appState_ru')).private),'PRIVATE_COURSE_SENTINEL');
 await click('У меня есть код');
 await page.getByLabel('Код входа',{exact:true}).waitFor();
 await page.getByRole('link',{name:'Мой лагерь'}).click();await page.getByRole('heading',{name:'Мой лагерь',exact:true}).waitFor();
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS free: 5 situations, reload/resume, archetype, course boundary, zero API/AI calls, cancel/reset, private course isolation, pilot sign-in and return; mobile screenshots saved.');
}finally{await browser?.close();vite.kill();}
