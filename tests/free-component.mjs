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
 assert.match(html, /Бесплатная вводная/); assert.match(html, /Пройти бесплатный тест/);
 assert.match(html, /не отправляются на наш сервер или в ИИ/);
 assert.doesNotMatch(html, /Личный код<\/label>/);
 assert.doesNotMatch(html, /PRIVATE_COURSE_SENTINEL/);
 globalThis.location = { hash: '#hub' };
 const hub = renderToString(React.createElement(FreeEntry));
 assert.match(hub, /Мой кабинет/); assert.match(hub, /Открыть курс/); assert.match(hub, /Открыть сообщество/); assert.match(hub, /без регистрации, пароля и синхронизации/);
 const { freshFreeProgress } = await vite.ssrLoadModule('/services/freeProgress.ts');
 const completed = freshFreeProgress(); completed.draft.step = 'result'; completed.draft.scores.Commander = 5; completed.draft.heroData.name = 'Пробный герой'; completed.result = { scoreType: 'Commander' };
 globalThis.localStorage = { getItem: () => JSON.stringify(completed) };
 globalThis.location = { hash: '' };
 const restored = renderToString(React.createElement(FreeEntry));
 assert.match(restored, /Мой кабинет/); assert.match(restored, /Командир/); assert.match(restored, /Пробный герой/);
 console.log('PASS component SSR: public introductory screen renders without code, with privacy and non-diagnostic explanation. This does not replace browser interaction QA.');
} finally { await vite.close(); delete globalThis.sessionStorage; delete globalThis.location; delete globalThis.localStorage; }
