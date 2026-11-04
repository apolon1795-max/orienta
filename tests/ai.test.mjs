import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAiService, createProxyAi, aiProfile, aiFingerprint, renderAiSummary, AiError } from '../server/ai.mjs';
import { createApi, provisionLearner } from '../server/api.mjs';
import { openSqliteStore } from '../server/sqlite.mjs';
import { startServer } from '../server/local.mjs';
import { completedState } from './fixtures.mjs';
import { createUserState } from '../services/progress.ts';
import { createTestDraft } from '../services/testProgress.ts';
import { ProgressSync } from '../services/cloudProgress.ts';

const summary = {
  summary: 'Ты описал интерес к созданию игр и ценишь свободу. Это можно проверить небольшими проектами.',
  strengths: ['Ты отметил рисование и готовность учиться: это опора для визуального проекта.'],
  directions: [
    { profession: 'Дизайн игр', reason: 'В ответах есть желание создавать игры и рисовать.', trial: 'За 45 минут нарисуй один экран игры и объясни правила другу.' },
    { profession: 'Иллюстрация', reason: 'Ты выбрал иллюстратора и отметил рисование среди сильных сторон.', trial: 'За 30 минут создай три эскиза персонажа и сравни, что понравилось.' },
  ],
  nextStep: 'За неделю выбери одну пробу, выполни её и запиши, что было интересно и сложно.',
};
const text = renderAiSummary(summary);
const response = (data = summary, extra = {}) => Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(data) }, ...extra }] });
const memory = () => { const values = new Map(); return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; };
const fixture = async (t, { generate = async () => text, now = Date.now, maxCalls = 100, dailyCalls = 3 } = {}) => {
  const store = openSqliteStore(':memory:'); t.after(() => store.close());
  const calls = [], provider = { model: 'openai/gpt-4o-mini', scope: 'test-account', generate: async profile => { calls.push(profile); return generate(profile); } };
  const ai = createAiService({ store, provider, now, maxCalls, dailyCalls }), api = createApi({ store, ai, now });
  const learner = await provisionLearner(store), state = completedState(), payload = { state, testDraft: createTestDraft() };
  await store.compareAndSet('progress:' + learner.learnerId, 0, { payload, updatedAt: now(), mutationId: 'test-ai-initial-save' });
  const login = async code => JSON.parse((await api({ method: 'POST', path: '/session', body: JSON.stringify({ code }) })).body);
  const session = await login(learner.code);
  const invoke = async (input = { baseRevision: 1 }, token = session.token) => {
    const result = await api({ method: 'POST', path: '/ai-summary', headers: token ? { authorization: 'Bearer ' + token } : {}, body: JSON.stringify(input) });
    return { status: result.status, data: JSON.parse(result.body) };
  };
  return { store, ai, api, provider, calls, learner, state, payload, login, session, invoke };
};

test('AI profile excludes identities and video data, redacts contacts and fingerprints only relevant answers', () => {
  const state = completedState();
  Object.assign(state, { firstName: 'ЛичноеИмя', username: 'личный-логин', telegramId: '123456789' });
  state.testResult.heroName = 'ЛичноеИмяГероя';
  state.course.s4Dream += ' test@example.com +7 (999) 123-45-67 https://secret.example/one @private_handle';
  state.course.lessons[1] = { source: 'video-secret', position: 42, duration: 100, completed: false, updatedAt: 100 };
  const profile = aiProfile(state);
  for (const privateText of ['ЛичноеИмя', 'личный-логин', '123456789', 'test@example.com', '999', 'secret.example', 'private_handle', 'video-secret']) assert.ok(!profile.includes(privateText), privateText);
  assert.ok(profile.includes('Рисую и учусь'));
  const fingerprint = aiFingerprint(state, 'model');
  state.lastUpdated++; state.course.lessons[1].position++; state.testResult.timestamp += 'a'; state.aiSummary = 'Прежний вывод';
  assert.equal(aiFingerprint(state, 'model'), fingerprint);
  state.course.s4Dream += ' и учить детей';
  assert.notEqual(aiFingerprint(state, 'model'), fingerprint);
  assert.throws(() => aiProfile(createUserState()), { code: 'ai_profile_incomplete' });
});

test('ProxyAPI stays disabled without explicit server configuration', () => {
  assert.equal(createProxyAi({ env: {} }), null);
  assert.equal(createProxyAi({ env: { ORIENTA_AI_ENABLED: 'true' } }), null);
  assert.equal(createProxyAi({ env: { ORIENTA_AI_API_KEY: 'test-secret' } }), null);
});

test('provider calls current fixed endpoint with a server key, schema and bounded output', async () => {
  const calls = [], provider = createProxyAi({ env: { ORIENTA_AI_ENABLED: 'true', ORIENTA_AI_API_KEY: 'test-secret' }, transport: async (url, options) => { calls.push({ url, options }); return response(); } });
  assert.equal(await provider.generate('Тестовые ответы'), text);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.proxyapi.ru/v1/chat/completions');
  assert.equal(calls[0].options.headers.authorization, 'Bearer test-secret');
  assert.equal(calls[0].options.redirect, 'error');
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.model, 'openai/gpt-4o-mini'); assert.equal(body.max_tokens, 1800);
  assert.equal(body.response_format.json_schema.strict, true);
  assert.ok(body.messages[0].content.includes('недоверенные данные'));
  assert.ok(!body.messages[1].content.includes('test-secret'));
});

test('provider surfaces safe billing errors and rejects truncated, refused or malformed replies without paid retries', async () => {
  const cases = [
    { make: () => Response.json({ error: 'private-provider-detail' }, { status: 402 }), code: 'ai_balance_required' },
    { make: () => Response.json({}, { status: 401 }), code: 'ai_configuration' },
    { make: () => Response.json({}, { status: 429 }), code: 'ai_provider_busy' },
    { make: () => response(summary, { finish_reason: 'length' }), code: 'ai_invalid_response' },
    { make: () => response(summary, { message: { refusal: 'refused' } }), code: 'ai_invalid_response' },
    { make: () => response({ ...summary, directions: [] }), code: 'ai_invalid_response' },
    { make: () => new Response('{broken'), code: 'ai_unavailable' },
    { make: () => { throw new DOMException('timeout with private detail', 'TimeoutError'); }, code: 'ai_timeout' },
  ];
  for (const item of cases) {
    let calls = 0;
    const provider = createProxyAi({ env: { ORIENTA_AI_ENABLED: 'true', ORIENTA_AI_API_KEY: 'secret' }, transport: async () => { calls++; return item.make(); } });
    await assert.rejects(provider.generate('Данные'), { code: item.code });
    assert.equal(calls, 1);
  }
});

test('authenticated API reads saved answers, rejects arbitrary prompts, incomplete or stale profiles', async t => {
  const f = await fixture(t);
  assert.equal((await f.invoke(undefined, '')).status, 401);
  assert.equal((await f.invoke({ baseRevision: 1, prompt: 'arbitrary prompt' })).status, 400);
  assert.equal((await f.invoke({ baseRevision: 0 })).status, 400);
  assert.equal((await f.invoke({ baseRevision: 9 })).status, 409);
  assert.equal(f.calls.length, 0);
  await f.store.compareAndSet('progress:' + f.learner.learnerId, 1, { payload: { ...f.payload, state: createUserState() }, updatedAt: Date.now() });
  assert.equal((await f.invoke({ baseRevision: 2 })).data.error, 'ai_profile_incomplete');
  assert.equal(f.calls.length, 0);
});

test('ready summaries are persisted and reused by another session without a second provider call', async t => {
  const f = await fixture(t);
  assert.equal(f.session.aiAvailable, true);
  const first = await f.invoke(); assert.equal(first.status, 200); assert.equal(first.data.cached, false); assert.equal(first.data.text, text);
  const secondSession = await f.login(f.learner.code);
  const second = await f.invoke({ baseRevision: 1 }, secondSession.token);
  assert.equal(second.data.cached, true); assert.equal(second.data.text, text); assert.equal(f.calls.length, 1);
  const other = await provisionLearner(f.store), otherSession = await f.login(other.code);
  assert.equal((await f.invoke({ baseRevision: 1 }, otherSession.token)).status, 409);
});

test('simultaneous requests reserve one generation across independent service instances', async t => {
  let finish; const gate = new Promise(resolve => { finish = resolve; });
  const f = await fixture(t, { generate: async () => { await gate; return text; } });
  const first = f.ai.summarize(f.learner.learnerId, f.state);
  while (!f.calls.length) await new Promise(resolve => setTimeout(resolve, 0));
  const otherInstance = createAiService({ store: f.store, provider: f.provider });
  await assert.rejects(otherInstance.summarize(f.learner.learnerId, f.state), { code: 'ai_running' });
  finish(); await first;
  assert.equal((await otherInstance.summarize(f.learner.learnerId, f.state)).cached, true);
  assert.equal(f.calls.length, 1);
});

test('database-backed pilot and pupil limits prevent extra paid calls while cache remains available', async t => {
  const f = await fixture(t, { maxCalls: 2, dailyCalls: 1 });
  await f.ai.summarize(f.learner.learnerId, f.state);
  const changed = completedState(); changed.course.s4Dream += ' для детей';
  await assert.rejects(f.ai.summarize(f.learner.learnerId, changed), { code: 'ai_daily_limit' });
  assert.equal((await f.ai.summarize(f.learner.learnerId, f.state)).cached, true);
  await f.ai.summarize('second-pupil', f.state);
  await assert.rejects(f.ai.summarize('third-pupil', f.state), { code: 'ai_pilot_limit' });
  assert.equal(f.calls.length, 2);
});

test('ambiguous failure has a cooldown and consumes a reservation rather than retrying automatically', async t => {
  let now = 1000;
  const f = await fixture(t, { now: () => now, generate: async () => { throw new AiError('ai_timeout'); } });
  await assert.rejects(f.ai.summarize(f.learner.learnerId, f.state), { code: 'ai_timeout' });
  await assert.rejects(f.ai.summarize(f.learner.learnerId, f.state), { code: 'ai_try_later' });
  assert.equal(f.calls.length, 1);
  now += 61000;
  await assert.rejects(f.ai.summarize(f.learner.learnerId, f.state), { code: 'ai_timeout' });
  assert.equal(f.calls.length, 2);
  assert.equal((await f.store.get('ai-budget:test-account')).value.used, 2);
});

test('changed answers or revoked access during generation never return a stale summary', async t => {
  const f = await fixture(t);
  f.provider.generate = async () => {
    const current = await f.store.get('progress:' + f.learner.learnerId);
    current.value.payload.state.course.s4Dream += ' с новой командой';
    await f.store.compareAndSet('progress:' + f.learner.learnerId, current.revision, current.value);
    return text;
  };
  assert.equal((await f.invoke()).data.error, 'ai_progress_changed');
  const g = await fixture(t);
  g.provider.generate = async () => {
    const learner = await g.store.get('learner:' + g.learner.learnerId);
    await g.store.compareAndSet('learner:' + g.learner.learnerId, learner.revision, { ...learner.value, active: false });
    return text;
  };
  assert.equal((await g.invoke()).status, 401);
});

test('AI is hidden by the API until enabled, even if an old frontend proxy URL exists', async t => {
  const store = openSqliteStore(':memory:'); t.after(() => store.close());
  const learner = await provisionLearner(store), api = createApi({ store });
  const login = JSON.parse((await api({ method: 'POST', path: '/session', body: JSON.stringify({ code: learner.code }) })).body);
  assert.equal(login.aiAvailable, false);
  const result = await api({ method: 'POST', path: '/ai-summary', headers: { authorization: 'Bearer ' + login.token }, body: '{"baseRevision":1}' });
  assert.equal(JSON.parse(result.body).error, 'ai_disabled');
});

test('real HTTP and ProgressSync use pupil authorization and save the summary with course progress', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'orienta-ai-'));
  let calls = 0;
  const { server, store } = startServer({ filename: join(directory, 'state.sqlite'), port: 0, aiProvider: { model: 'openai/gpt-4o-mini', scope: 'http-test', generate: async () => { calls++; return text; } } });
  await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const base = 'http://127.0.0.1:' + server.address().port;
  const learner = await provisionLearner(store);
  let restored;
  const makeClient = () => new ProgressSync({ base, sessionStorage: memory(), storage: memory(), restore: data => { restored = data; }, reset: () => {}, delay: 60000 });
  const first = makeClient(), second = makeClient(); t.after(() => { first.dispose(); second.dispose(); });
  await first.signIn(learner.code);
  assert.equal(first.state.aiAvailable, true);
  const payload = { state: completedState(), testDraft: createTestDraft() };
  const result = await first.generateAi(payload);
  assert.equal(result, text); assert.equal(calls, 1);
  first.offer({ ...payload, state: { ...payload.state, aiSummary: result, summarySource: 'ai' } }); await first.flush();
  await second.signIn(learner.code);
  assert.equal(restored.state.aiSummary, text); assert.equal(restored.state.summarySource, 'ai');
  assert.equal(await second.generateAi(restored), text); assert.equal(calls, 1);
});

test('full progress reset clears stored AI text, preserves counters and invalidates an in-flight cache write', async t => {
  const f = await fixture(t);
  await f.invoke();
  const reset = { baseRevision: 1, mutationId: 'reset-ai-progress-0001', payload: { state: createUserState(), testDraft: createTestDraft() } };
  const headers = { authorization: 'Bearer ' + f.session.token };
  const result = await f.api({ method: 'PUT', path: '/progress', headers, body: JSON.stringify(reset) });
  assert.equal(result.status, 200);
  const records = await f.store.scan('ai:' + f.learner.learnerId + ':');
  assert.ok(records.length > 0);
  for (const record of records) assert.deepEqual(record.value, { status: 'cleared' });
  assert.equal((await f.store.get('ai-budget:test-account')).value.used, 1);
  // Lost reset responses are safe to retry.
  assert.equal((await f.api({ method: 'PUT', path: '/progress', headers, body: JSON.stringify(reset) })).status, 200);

  let finish; const gate = new Promise(resolve => { finish = resolve; });
  const g = await fixture(t, { generate: async () => { await gate; return text; } });
  const request = g.invoke();
  while (!g.calls.length) await new Promise(resolve => setTimeout(resolve, 0));
  await g.api({ method: 'PUT', path: '/progress', headers: { authorization: 'Bearer ' + g.session.token }, body: JSON.stringify(reset) });
  finish();
  assert.notEqual((await request).status, 200);
  for (const record of await g.store.scan('ai:' + g.learner.learnerId + ':')) assert.deepEqual(record.value, { status: 'cleared' });
});
