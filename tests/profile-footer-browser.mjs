import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { buildProtectedCourse } from '../scripts/build-protected-course.mjs';
import { startServer } from '../server/local.mjs';
import { provisionLearner } from '../server/api.mjs';
import { createTestDraft } from '../services/testProgress.ts';
import { completedState } from './fixtures.mjs';

const directory = await fs.mkdtemp(join(tmpdir(), 'orienta-footer-'));
const base = 'http://127.0.0.1:5178';
const mentorUrl = 'https://t.me/Daniil_Borisov';
const mockDestination = base + '/__fixture/telegram';
const { server, store } = startServer({ coursePackage: await buildProtectedCourse(), filename: join(directory, 'progress.sqlite'), port: 0, allowedOrigins: [base] });
await once(server, 'listening');
const api = `http://127.0.0.1:${server.address().port}`;
const learner = await provisionLearner(store, 'Синтетический профиль для проверки футера');
await store.compareAndSet('progress:' + learner.learnerId, 0, { payload: { state: completedState(), testDraft: createTestDraft() }, mutationId: 'profile-footer-fixture', updatedAt: Date.now() });
process.env.VITE_PROGRESS_API_URL = api;
const vite = await createServer({ server: { host: '127.0.0.1', port: 5178, strictPort: true } });
let browser;
try {
  await vite.listen();
  browser = await chromium.launch({ ...(process.env.ORIENTA_BROWSER_EXECUTABLE ? { executablePath: process.env.ORIENTA_BROWSER_EXECUTABLE } : {}) });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', acceptDownloads: true });
  let external = 0;
  await ctx.route('**/*', async route => {
    const url = route.request().url();
    if (url === mockDestination) { external++; return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: '<h1>Локальная заглушка Telegram</h1>' }); }
    return url.startsWith(base + '/') || url.startsWith(api + '/') ? route.continue() : route.abort();
  });
  const page = await ctx.newPage();
  await page.goto(base + '/#profile');
  await page.getByLabel('Код входа',{exact:true}).fill(learner.code);
  await page.getByRole('button',{name:'Войти по коду',exact:true}).click();
  await page.getByRole('heading',{name:'Мой лагерь',exact:true}).waitFor();
  // The old #profile entry renders the same Camp after login; start this history check on its public URL.
  await page.goto(base + '/#hub');
  await page.getByRole('heading',{name:'Мой лагерь',exact:true}).waitFor();
  const profile = page.getByRole('heading',{name:'Профкарта Героя'});
  const camp = page.getByRole('heading',{name:'Мой лагерь',exact:true});
  await page.getByRole('button',{name:'Профкарта',exact:true}).click();
  await profile.waitFor();
  const mentor = page.getByRole('link',{name:'Обсудить с наставником в Telegram',exact:true});
  assert.equal(await mentor.getAttribute('href'), mentorUrl);
  assert.equal(await mentor.getAttribute('rel'),'noopener noreferrer');
  assert.equal(await mentor.getAttribute('target'),'_blank');
  assert.equal(external,0,'do not open Telegram until explicit action');
  assert.equal(await page.getByRole('button',{name:'В лагерь',exact:true}).count(),1);
  for (const width of [320,390,1280]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(await mentor.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(53, 74, 48)');
    assert.ok((await mentor.boundingBox()).height >= 44);
    assert.ok(await page.locator('.atlas-actions').evaluate(el=>el.scrollWidth <= el.clientWidth + 1));
  }
  const pdfReady = page.getByRole('button',{name:'Скачать PDF',exact:true});
  await pdfReady.waitFor();
  const getPdf = page.waitForEvent('download');
  await pdfReady.click();
  const pdf = await getPdf;
  assert.equal(pdf.suggestedFilename(), 'Ориента — профкарта.pdf');
  const bytes = await fs.readFile(await pdf.path());
  assert.equal(bytes.subarray(0,8).toString(), '%PDF-1.4');
  assert.match(bytes.toString('latin1'), /\/ToUnicode/);
  const url = page.url();
  // Verify the exact external href above, but navigate only to a loopback fixture.
  await mentor.evaluate((link, url) => { link.href = url; }, mockDestination);
  const opened = ctx.waitForEvent('page');
  await mentor.click();
  const preview = await opened;
  await preview.waitForURL(mockDestination);
  await preview.getByRole('heading',{name:'Локальная заглушка Telegram'}).waitFor();
  assert.equal(external,1);
  assert.equal(await preview.evaluate(()=>window.opener),null);
  await preview.close();
  assert.equal(page.url(),url);
  await profile.waitFor();
  await page.goBack();
  await camp.waitFor();
  assert.equal(new URL(page.url()).hash,'#hub');
  assert.equal(await page.locator('[data-view="DASHBOARD"]').count(),0);
  await page.getByRole('button',{name:'Профкарта',exact:true}).click();
  await profile.waitFor();
  await page.getByRole('button',{name:'В лагерь',exact:true}).click();
  await camp.waitFor();
  assert.equal(new URL(page.url()).hash,'#hub');
  assert.equal(await page.getByText('Твой Хаб',{exact:true}).count(),0);
  console.log('PASS: synthetic protected profile, browser navigation semantics, isolated Telegram, aligned themed action, and canonical Camp through both Back paths.');
} finally {
  await browser?.close();
  await vite.close();
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
  await fs.rm(directory,{recursive:true,force:true});
}
