import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { completedState } from './fixtures.mjs';
import { createTestDraft } from '../services/testProgress.ts';
await fs.mkdir('output/playwright',{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4173'],{stdio:'inherit'});
const base='http://127.0.0.1:4173/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
const checks=[],errors=[];
const record=name=>{checks.push(name);console.log('PASS: '+name);};
try {
  for(let i=0;i<100;i++){try{if((await fetch(base)).ok) break;}catch{} await sleep(100);}
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce',acceptDownloads:true});
  await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
  const click=async name=>page.getByRole('button',{name,exact:false}).click();
  const shown=async text=>{await page.getByText(text,{exact:false}).first().waitFor({state:'visible'});};
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('appState_ru')));
  const draft=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hero_game_progress_v2')));
  const hub=async()=>{await click('Начать Путь');if(await page.getByRole('button',{name:'Поехали',exact:true}).isVisible())await click('Поехали');};
  await page.goto(base);await page.screenshot({path:'output/playwright/01-landing-desktop.png',fullPage:true});
  await hub();await click('Начать Тест');await click('Начать игру');await click('Создать персонажа');await click('Человек');
  await page.getByRole('textbox',{name:'Имя героя'}).fill('Искатель 🌿');await click('Подтвердить имя');await click('Отправиться в путь');
  for(let i=0;i<5;i++){
    if(i===4)await click('Сжать артефакт');
    await page.locator('button[aria-pressed]').first().click();
    await click('Подтвердить выбор');
    if(i===0){
      await page.reload();await hub();await click('Начать Тест');await shown('Ситуация 2 из 5');
      assert.equal((await draft()).heroData.name,'Искатель 🌿');record('unfinished test restores after reload');
    }
  }
  await page.getByRole('button',{name:/Сорвать|Развернуть|Открыть.*свиток|Снять.*печать/}).click();
  await shown('Открыт полный доступ');assert.equal(Object.values((await draft()).scores).reduce((a,b)=>a+b,0),5);
  await click('Открыть Персональный Гайд');await page.screenshot({path:'output/playwright/02-guide.png',fullPage:true});
  await page.locator('#guide-action-btn').click();await shown('Путь Мастера');
  assert.equal(await page.getByRole('button',{name:/Этап 2: Личность/}).isDisabled(),true);record('test, guide and sequential course access');
  await page.getByRole('button',{name:/Этап 1: Интересы/}).click();await click('Погнали');
  for(let i=0;i<10;i++)await click(i<2?'Лайк':'Мимо');
  await click('К загадкам');
  for(let i=0;i<3;i++){await page.locator('button').filter({hasText:i===1?'Project Менеджер':i===2?'Ветеринар':'Гейм-дизайнер'}).click();await click('Далее');}
  await click('На карту');assert.deepEqual((await read()).course.completedStages,[0]);
  await page.getByRole('button',{name:/Этап 2: Личность/}).click();await click('Смотреть в воду');
  const replies=['Быстро учусь и рисую','Сложно выступать','Сделать учебную игру','Нужно больше времени'];
  for(let i=0;i<4;i++){
    const textbox=page.getByRole('textbox');await textbox.fill(replies[i]);
    if(i===0){await page.reload();await hub();await click('Курс');assert.equal(await page.getByRole('textbox').inputValue(),replies[0]);record('course input restores without losing focus or answer');}
    await click('Далее');
  }
  for(const value of ['Семья','Здоровье','Творчество','Деньги','Свобода'])await page.getByRole('button',{name:value,exact:true}).click();
  await click('Готово');await page.getByRole('spinbutton').fill('-1');assert.equal(await page.getByRole('button',{name:'Далее',exact:true}).isDisabled(),true);
  await page.getByRole('spinbutton').fill('16');await click('Далее');await page.getByRole('textbox').fill('Графический планшет');await click('Хочу');
  await click('На карту');assert.deepEqual((await read()).course.completedStages,[0,1]);
  await page.getByRole('button',{name:/Этап 3: Навыки/}).click();await click('На Арену');
  for(const answer of ['Разделю на шаги','Всех выслушаю','Сразу начну колдовать'])await click(answer);
  await page.getByRole('checkbox',{name:'Без ограничения времени'}).check();await click('Начать Блиц');
  await page.screenshot({path:'output/playwright/03-crisis-mobile.png',fullPage:true});
  for(let i=0;i<4;i++)await page.locator('button').filter({hasText:i===0?'Возьму все на себя':i===1?'Разведу их':i===2?'Расскажу без слайдов':'Раздам интернет'}).click();
  await click('На карту');assert.deepEqual((await read()).course.completedStages,[0,1,2]);
  assert.equal((await read()).course.s3CrisisAnswers.length,4);record('three stages, age validation and untimed crisis');
  await page.getByRole('button',{name:/Финал: Профкарта/}).click();await click('Собрать профкарту');await shown('Твоя профкарта');
  await shown(replies[0]);await shown('Графический планшет');
  assert.equal(await page.getByRole('button',{name:'Получить ИИ-разбор'}).count(),0);
  await page.screenshot({path:'output/playwright/04-profile-desktop.png',fullPage:true});
  const downloadPromise=page.waitForEvent('download');await click('Скачать профкарту');const download=await downloadPromise;assert.equal(download.suggestedFilename(),'orienta-profmap.txt');
  const txt=await fs.readFile(await download.path(),'utf8');assert.ok(txt.includes(replies[0]));record('profile contains answers and downloads as text without fake AI');
  for(const width of [320,390,768,1280]){
    await page.setViewportSize({width,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'overflow at '+width);
    await page.screenshot({path:'output/playwright/profile-'+width+'.png',fullPage:true});
  }
  await page.emulateMedia({media:'print'});await page.pdf({path:'output/playwright/profile.pdf',format:'A4',printBackground:true});await page.emulateMedia({media:'screen'});
  record('profile responsive at 320/390/768/1280 and print export');
  await click('← Хаб');
  const saved=await read();
  const backupPromise=page.waitForEvent('download');await click('Скачать копию');const backup=await backupPromise;
  const backupText=await fs.readFile(await backup.path(),'utf8');assert.equal(JSON.parse(backupText).state.course.s3CrisisAnswers.length,4);
  await click('Удалить мои данные');await page.getByRole('button',{name:'Отмена',exact:true}).click();assert.deepEqual((await read()).course.completedStages,[0,1,2]);
  await click('Удалить мои данные');await page.getByRole('button',{name:'Продолжить',exact:true}).click();await hub();assert.equal((await read()).testResult,null);
  await page.getByLabel('Файл резервной копии').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(backupText)});
  await shown('Загрузить резервную копию?');await page.getByRole('button',{name:'Загрузить',exact:true}).click();assert.deepEqual((await read()).course.completedStages,[0,1,2]);record('backup import, reset cancel and confirmed reset');
  await page.getByLabel('Файл резервной копии').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{}')});await shown('Это не резервная копия');record('foreign backup rejection');
  const timed=completedState();Object.assign(timed.course,{completedStages:[0,1],activeStage:2,s3Phase:'crisis',s3CrisisIdx:0,s3CrisisAnswers:[],untimed:false});
  await page.evaluate(value=>localStorage.setItem('appState_ru',JSON.stringify(value)),timed);await page.reload();await hub();await click('Курс');
  await shown('СИТУАЦИЯ 1/4');await shown('СИТУАЦИЯ 2/4');assert.equal((await read()).course.s3CrisisAnswers[0],'Без ответа');record('timer expires and advances without conditional-hook crash');
  await page.evaluate(()=>{localStorage.setItem('appState_ru','{broken');localStorage.setItem('hero_game_progress_v2','{broken');});await page.reload();await hub();await click('Начать Тест');await shown('Начать игру');record('corrupted local storage recovers');
  const denied=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await denied.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
  await denied.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('Quota','QuotaExceededError');};});
  const deniedPage=await denied.newPage();deniedPage.on('pageerror',e=>errors.push(String(e)));await deniedPage.goto(base);
  await deniedPage.getByRole('alert').waitFor();assert.ok((await deniedPage.getByRole('alert').textContent()).includes('не сохраняет'));record('storage failure is visible and app stays usable');
  assert.deepEqual(errors,[]);record('no browser page errors');
  await fs.writeFile('output/playwright/result.json',JSON.stringify({checks,errors,illustrations:'cached originals; external networking blocked during browser scenarios'},null,2));
} catch(error) {
  if(browser){const contexts=browser.contexts();const page=contexts[0]?.pages()[0];if(page){await page.screenshot({path:'output/playwright/failure.png',fullPage:true}).catch(()=>{});await fs.writeFile('output/playwright/failure.html',await page.content()).catch(()=>{});}}
  await fs.writeFile('output/playwright/result.json',JSON.stringify({checks,errors,failure:String(error)},null,2));throw error;
} finally {await browser?.close();server.kill();}
