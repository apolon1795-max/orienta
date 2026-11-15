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
 console.log('PASS component SSR: public introductory screen renders without code, with privacy and non-diagnostic explanation. This does not replace browser interaction QA.');
} finally { await vite.close(); delete globalThis.sessionStorage; delete globalThis.location; }
