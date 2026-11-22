import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
const storage = new Map();
globalThis.sessionStorage = { getItem: key => storage.get(key) || null };
globalThis.location = { hash: '' };
try {
 const { FreeEntry } = await vite.ssrLoadModule('/components/FreeEntry.tsx');
 const html = renderToString(React.createElement(FreeEntry));
 assert.doesNotMatch(html, /Бесплатная вводная/); assert.match(html, /Пройти тест/);
 assert.match(html, /не отправляются на наш сервер или в ИИ/);
 assert.doesNotMatch(html, /Личный код<\/label>/);
 assert.doesNotMatch(html, /PRIVATE_COURSE_SENTINEL/);
 globalThis.location = { hash: '#hub' };
 const hub = renderToString(React.createElement(FreeEntry));
 assert.match(hub, /Мой лагерь/); assert.match(hub, /Курс «Ориента»/); assert.match(hub, /Сообщество · скоро/); assert.match(hub, /только в этом браузере/);
 const { freshFreeProgress } = await vite.ssrLoadModule('/services/freeProgress.ts');
 const completed = freshFreeProgress(); completed.draft.step = 'result'; completed.draft.scores.Commander = 5; completed.draft.heroData.name = 'Пробный герой'; completed.result = { scoreType: 'Commander' };
 globalThis.localStorage = { getItem: () => JSON.stringify(completed) };
 globalThis.location = { hash: '' };
 const restored = renderToString(React.createElement(FreeEntry));
 assert.match(restored, /Мой лагерь/); assert.match(restored, /Командир/); assert.match(restored, /Пробный герой/);
 const { ProgressAccess } = await vite.ssrLoadModule('/components/ProgressAccount.tsx');
 const access = enabled => renderToString(React.createElement(ProgressAccess, { client: {}, state: { status: 'signed-out', registrationAvailable: enabled, telegramAvailable: enabled }, onExport() {}, hasLocalAnswers: false }));
 assert.match(access(true), /Новый бесплатный профиль/); assert.match(access(true), /Войти через Telegram/); assert.doesNotMatch(access(false), /Новый бесплатный профиль|Войти через Telegram/);
 console.log('PASS component SSR: public introductory screen renders without code, with privacy and non-diagnostic explanation. This does not replace browser interaction QA.');
} finally { await vite.close(); delete globalThis.sessionStorage; delete globalThis.location; delete globalThis.localStorage; }
