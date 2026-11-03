import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { startServer } from '../server/local.mjs';
import { openSqliteStore } from '../server/sqlite.mjs';
import { createApi, provisionLearner, sessionKey } from '../server/api.mjs';
import { createYdbStore } from '../server/ydb.mjs';
import { csvCell, exportRows } from '../server/admin.mjs';
import { createFunctionHandler } from '../server/function.mjs';
import { ProgressSync, apiBase } from '../services/cloudProgress.ts';
import { createUserState, normalizeUserState, exportBackup, importBackup } from '../services/progress.ts';
import { createTestDraft } from '../services/testProgress.ts';
import { lessonSource, normalizeLessons, updateLesson } from '../services/lessonProgress.ts';

const memoryStorage = () => { const values = new Map(); return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; };
const payload = () => ({ state: normalizeUserState(createUserState()), testDraft: createTestDraft() });
const until = async condition => { for (let i = 0; i < 200; i++) { if (condition()) return; await new Promise(resolve => setTimeout(resolve, 5)); } assert.ok(condition(), 'condition not reached'); };
const fixture = async t => {
  const directory = await mkdtemp(join(tmpdir(), 'orienta-sync-'));
  const { server, store } = startServer({ filename: join(directory, 'progress.sqlite'), port: 0, allowedOrigins: ['https://pilot.example'] });
  await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const learner = await provisionLearner(store, 'Тестовый ученик');
  const clients = [];
  const client = (options = {}) => {
    let restored;
    const sessionStorage = options.sessionStorage || memoryStorage(), storage = options.storage || memoryStorage();
    const sync = new ProgressSync({ base, sessionStorage, storage, restore: value => { restored = value; }, reset: () => { restored = payload(); }, delay: 60000, ...options });
    clients.push(sync);
    return { sync, sessionStorage, storage, get value() { return restored; } };
  };
  t.after(() => clients.forEach(sync => sync.dispose()));
  return { base, store, learner, client };
};

test('Kinescope links canonicalize to one video without embedding query tokens', () => {
  const watch = lessonSource('https://kinescope.io/Abcdefgh123456?foo=bar');
  assert.deepEqual(watch, lessonSource('https://kinescope.io/embed/Abcdefgh123456'));
  assert.equal(watch.id, 'kinescope:Abcdefgh123456');
  for (const unsafe of ['javascript:alert(1)', 'https://name:secret@kinescope.io/Abcdefgh123456', 'https://kinescope.io.evil.example/Abcdefgh123456', 'https://kinescope.io/project/Abcdefgh123456', 'https://example.org/watch']) assert.equal(lessonSource(unsafe), null);
  assert.equal(lessonSource('/lessons/one.mp4').kind, 'video');
});
test('video position and completion survive backup, a replacement video starts afresh', () => {
  const state = createUserState();
  state.course.lessons[1] = updateLesson(undefined, 'kinescope:abcdefgh', 50, 100, true);
  assert.equal(updateLesson(state.course.lessons[1], 'kinescope:abcdefgh', 10, 100).completed, true);
  assert.equal(updateLesson(state.course.lessons[1], 'kinescope:newvideo', 10, 100).completed, false);
  assert.deepEqual(importBackup(exportBackup(state)).state.course.lessons, state.course.lessons);
  assert.deepEqual(normalizeLessons({ 99: state.course.lessons[1], 1: { source: 'a', position: Infinity, duration: -2, completed: 'yes' } }), { 1: { source: 'a', position: 0, duration: 0, completed: false, updatedAt: 0 } });
  assert.deepEqual(normalizeUserState({ course: {} }).course.lessons, {});
});
test('progress API URL accepts HTTPS and localhost, never credentials or arbitrary HTTP', () => {
  assert.equal(apiBase('https://api.example/api/'), 'https://api.example/api');
  assert.equal(apiBase('http://127.0.0.1:8787'), 'http://127.0.0.1:8787');
  for (const url of ['http://api.example', 'https://user:password@api.example', 'https://api.example/?token=secret', 'javascript:alert(1)']) assert.equal(apiBase(url), '');
});
test('SQLite writes persist after reopening and compare-and-set rejects stale revisions', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'orienta-db-')), path = join(directory, 'db.sqlite');
  t.after(() => rm(directory, { recursive: true, force: true }));
  let store = openSqliteStore(path);
  assert.equal(await store.compareAndSet('p', 0, { answer: 'первый' }), true);
  store.close(); store = openSqliteStore(path);
  assert.deepEqual((await store.get('p')).value, { answer: 'первый' });
  assert.equal(await store.compareAndSet('p', 0, { answer: 'потеря' }), false);
  assert.equal(await store.compareAndSet('p', 1, { answer: 'второй' }), true); store.close();
});
test('real API isolates pupils, normalizes answers and revokes signed-out sessions', async t => {
  const f = await fixture(t), other = await provisionLearner(f.store);
  const signIn = async code => (await fetch(f.base + '/session', { method: 'POST', body: JSON.stringify({ code }) })).json();
  const a = await signIn(f.learner.code), b = await signIn(other.code);
  const headers = { authorization: 'Bearer ' + a.token }, data = payload();
  data.state.course.s4Dream = 'Работа над собственной игрой'; data.state.telegramId = 123; data.state.username = 'not-imported';
  const operation = { baseRevision: 0, mutationId: randomUUID().replace(/-/g, ''), payload: data };
  let response = await fetch(f.base + '/progress', { method: 'PUT', headers, body: JSON.stringify(operation) });
  assert.equal(response.status, 200); const result = await response.json();
  assert.equal(result.progress.payload.state.telegramId, null);
  assert.equal(result.progress.payload.state.username, null);
  assert.equal(result.progress.payload.state.course.s4Dream, data.state.course.s4Dream);
  response = await fetch(f.base + '/progress', { headers: { authorization: 'Bearer ' + b.token } }); assert.equal((await response.json()).progress.payload, null);
  assert.equal((await fetch(f.base + '/progress')).status, 401);
  assert.equal((await fetch(f.base + '/progress', { headers: { origin: 'https://untrusted.example', ...headers } })).status, 403);
  assert.equal((await fetch(f.base + '/session', { method: 'DELETE', headers })).status, 200);
  assert.equal((await fetch(f.base + '/progress', { headers })).status, 401);
});
test('session expiry, invalid input and database errors never expose stored answers', async () => {
  const store = openSqliteStore(':memory:');
  try {
    let now = 1000; const learner = await provisionLearner(store);
    const api = createApi({ store, now: () => now });
    const login = JSON.parse((await api({ method: 'POST', path: '/session', body: JSON.stringify({ code: learner.code }) })).body);
    now += 8 * 86400000;
    assert.equal((await api({ method: 'GET', path: '/progress', headers: { authorization: 'Bearer ' + login.token } })).status, 401);
    assert.equal((await api({ method: 'POST', path: '/session', body: '{' })).status, 400);
    assert.equal((await api({ method: 'POST', path: '/session', body: ' '.repeat(100001) })).status, 413);
    const failed = createApi({ store: { get: () => { throw new Error('private-value'); } } });
    const response = await failed({ method: 'POST', path: '/session', body: JSON.stringify({ code: learner.code }) });
    assert.equal(response.status, 503); assert.ok(!response.body.includes('private-value'));
  } finally { store.close(); }
});
test('API retries the same mutation once, rejects a stale overwrite and a reused ID', async t => {
  const f = await fixture(t), c = f.client(); await c.sync.signIn(f.learner.code);
  const session = JSON.parse(c.sessionStorage.getItem('orienta_session_v1'));
  const headers = { authorization: 'Bearer ' + session.token };
  const operation = { baseRevision: 0, mutationId: randomUUID().replace(/-/g, ''), payload: payload() };
  const put = body => fetch(f.base + '/progress', { method: 'PUT', headers, body: JSON.stringify(body) });
  assert.equal((await put(operation)).status, 200);
  const duplicate = await put(operation); assert.equal(duplicate.status, 200); assert.equal((await duplicate.json()).progress.revision, 1);
  const stale = await put({ ...operation, mutationId: randomUUID().replace(/-/g, '') }); assert.equal(stale.status, 409);
  assert.equal((await stale.json()).progress.revision, 1);
  operation.payload.state.course.s4Dream = 'другой ответ'; assert.equal((await put(operation)).status, 400);
});
test('two devices resume the unfinished test, lesson position and course answers via real HTTP', async t => {
  const f = await fixture(t), first = f.client(); await first.sync.signIn(f.learner.code);
  const data = payload(); data.state.hasOnboarded = true; data.state.course.s4Dream = 'Создавать игры';
  data.state.course.lessons[1] = updateLesson(undefined, 'kinescope:abcdefgh', 42, 120);
  data.testDraft.step = 'choose_name'; data.testDraft.heroData = { name: 'Искатель', race: 'Эльф' };
  first.sync.offer(data); await first.sync.flush(); assert.equal(first.sync.state.status, 'saved');
  const second = f.client(); await second.sync.signIn(f.learner.code);
  assert.deepEqual(second.value, data); assert.equal(second.value.state.course.lessons[1].position, 42);
  const restored = f.client({ sessionStorage: second.sessionStorage, storage: second.storage }); await restored.sync.start();
  assert.deepEqual(restored.value, data);
});
test('lost save responses retry idempotently, without a duplicate revision', async t => {
  const f = await fixture(t); let lose = true;
  const c = f.client({ fetch: async (url, options) => { const response = await fetch(url, options); if (options.method === 'PUT' && lose) { lose = false; throw new Error('connection_lost'); } return response; } });
  await c.sync.signIn(f.learner.code); const data = payload(); data.state.course.s4Dream = 'Не потерять ответ';
  c.sync.offer(data); await c.sync.flush(); assert.equal(c.sync.state.status, 'offline');
  await c.sync.retry(); assert.equal(c.sync.state.status, 'saved');
  assert.equal((await f.store.get('progress:' + f.learner.learnerId)).revision, 1);
});
test('concurrent devices retain both versions, conflict resolution explicitly loads cloud copy', async t => {
  const f = await fixture(t), a = f.client(), b = f.client();
  await a.sync.signIn(f.learner.code); await b.sync.signIn(f.learner.code);
  const first = payload(), second = payload(); first.state.course.s4Dream = 'Первое устройство'; second.state.course.s4Dream = 'Второе устройство';
  a.sync.offer(first); b.sync.offer(second); await a.sync.flush(); await b.sync.flush();
  assert.equal(b.sync.state.status, 'conflict'); assert.equal(b.sync.state.dirty, true);
  assert.equal(JSON.parse(b.storage.getItem('orienta_sync_v1:' + f.learner.learnerId)).pending.payload.state.course.s4Dream, second.state.course.s4Dream);
  assert.equal((await f.store.get('progress:' + f.learner.learnerId)).value.payload.state.course.s4Dream, first.state.course.s4Dream);
  b.sync.useCloudCopy(); assert.equal(b.value.state.course.s4Dream, first.state.course.s4Dream); assert.equal(b.sync.state.dirty, false);
});
test('offline pending answers survive reload and upload after reconnection', async t => {
  const f = await fixture(t); let offline = false;
  const c = f.client({ fetch: (url, options) => { if (offline) throw new Error('offline'); return fetch(url, options); } });
  await c.sync.signIn(f.learner.code); const data = payload(); data.state.course.s4Dream = 'Ответ без интернета';
  offline = true; c.sync.offer(data); await c.sync.flush(); assert.equal(c.sync.state.status, 'offline'); c.sync.dispose();
  const next = f.client({ sessionStorage: c.sessionStorage, storage: c.storage }); await next.sync.start(); await until(() => next.sync.state.status === 'saved');
  assert.equal(next.value.state.course.s4Dream, data.state.course.s4Dream);
  assert.equal((await f.store.get('progress:' + f.learner.learnerId)).value.payload.state.course.s4Dream, data.state.course.s4Dream);
});
test('logout clears this device and another learner never inherits its progress', async t => {
  const f = await fixture(t), a = f.client(), other = await provisionLearner(f.store);
  await a.sync.signIn(f.learner.code); const data = payload(); data.state.course.s4Dream = 'Личный ответ'; a.sync.offer(data); await a.sync.flush();
  const token = JSON.parse(a.sessionStorage.getItem('orienta_session_v1')).token;
  await a.sync.signOut(); assert.equal(a.sessionStorage.getItem('orienta_session_v1'), null); assert.equal(a.storage.getItem('orienta_sync_v1:' + f.learner.learnerId), null);
  assert.equal((await f.store.get(sessionKey(token))).value.expiresAt, 0);
  await a.sync.signIn(other.code); assert.equal(a.value.state.course.s4Dream, '');
});
test('failed local cache is visible while a network failure retains the in-memory answer', async t => {
  const f = await fixture(t); let offline = false;
  const c = f.client({ storage: { ...memoryStorage(), setItem: () => { throw new Error('quota'); } }, fetch: (url, options) => { if (offline) throw new Error('offline'); return fetch(url, options); } });
  await c.sync.signIn(f.learner.code); offline = true; c.sync.offer(payload()); await c.sync.flush();
  assert.equal(c.sync.state.status, 'offline'); assert.equal(c.sync.state.cacheAvailable, false); assert.equal(c.sync.state.dirty, true);
});
test('YDB adapter uses scoped IAM, a Russian endpoint, strong reads and conditional writes', async () => {
  const calls = [];
  const store = createYdbStore({ endpoint: 'https://docapi.serverless.yandexcloud.net/ru-central1/cloud/database', token: async () => 'test-iam-token', transport: async (url, options) => {
    const body = JSON.parse(options.body); calls.push({ url, options, body });
    if (options.headers['x-amz-target'].endsWith('.GetItem')) return Response.json({ Item: { key: { S: 'p' }, revision: { N: '2' }, value: { S: '{"answer":"ok"}' } } });
    return calls.length === 3 ? Response.json({ __type: 'ConditionalCheckFailedException' }, { status: 400 }) : Response.json({});
  } });
  assert.equal((await store.get('p')).revision, 2);
  assert.equal(calls[0].body.ConsistentRead, true); assert.equal(calls[0].options.headers.authorization, 'Bearer test-iam-token');
  assert.equal(await store.compareAndSet('p', 2, { answer: 'next' }), true); assert.equal(calls[1].body.ConditionExpression, '#revision = :expected');
  assert.equal(await store.compareAndSet('p', 2, {}), false);
  assert.throws(() => createYdbStore({ endpoint: 'https://untrusted.example/', token: async () => '' }));
});

test('Excel export includes course answers and lesson progress, without access codes or formulas', async () => {
  assert.equal(csvCell('=1+1'), '"\'=1+1"');
  const store = openSqliteStore(':memory:');
  try {
    const learner = await provisionLearner(store, '=unsafe-label'), data = payload();
    data.state.course.s4Dream = 'Работа мечты'; data.state.course.lessons[1] = updateLesson(undefined, 'kinescope:abcdefgh', 120, 120, true);
    await store.compareAndSet('progress:' + learner.learnerId, 0, { payload: data, updatedAt: Date.now() });
    const csv = await exportRows(store);
    assert.ok(csv.startsWith('\uFEFF')); assert.ok(csv.includes('Работа мечты')); assert.ok(csv.includes('kinescope:abcdefgh'));
    assert.ok(!csv.includes(learner.code)); assert.ok(csv.includes("'=unsafe-label"));
  } finally { store.close(); }
});

test('Cloud Functions HTTP adapter forwards CORS, base64 bodies and context IAM without permanent keys', async () => {
  let authorization;
  const handler = createFunctionHandler({ env: { ORIENTA_YDB_ENDPOINT: 'https://docapi.serverless.yandexcloud.net/ru-central1/cloud/database', ORIENTA_ALLOWED_ORIGINS: 'https://pilot.example' }, transport: async (_url, options) => { authorization = options.headers.authorization; return Response.json({}); } });
  const health = await handler({ httpMethod: 'GET', path: '/api/health', headers: { origin: 'https://pilot.example' } }, {});
  assert.equal(health.statusCode, 200); assert.equal(health.headers['access-control-allow-origin'], 'https://pilot.example');
  const login = await handler({ httpMethod: 'POST', path: '/api/session', isBase64Encoded: true, body: Buffer.from(JSON.stringify({ code: 'ORI-' + 'A'.repeat(32) })).toString('base64') }, { token: { access_token: 'short-lived-test-token' } });
  assert.equal(login.statusCode, 401); assert.equal(authorization, 'Bearer short-lived-test-token');
  assert.equal((await createFunctionHandler({ env: {} })({ httpMethod: 'GET', path: '/api/health' }, {})).statusCode, 503);
});
