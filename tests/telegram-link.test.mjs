import test from 'node:test';
import assert from 'node:assert/strict';
import { linkTelegramIdentity, resolveTelegramLearner } from '../server/telegram-link.mjs';
const a = '00000000-0000-4000-8000-000000000001', b = '00000000-0000-4000-8000-000000000002';
const x = { botId: '123', telegramId: '456' }, y = { botId: '123', telegramId: '789' };
const makeStore = () => {
  const rows = new Map([[`learner:${a}`, { revision: 1, value: { active: true } }], [`learner:${b}`, { revision: 1, value: { active: true } }]]);
  return { rows, get: async key => rows.get(key) || null, compareAndSet: async (key, revision, value) => { if ((rows.get(key)?.revision || 0) !== revision) return false; rows.set(key, { revision: revision + 1, value }); return true; } };
};
test('same binding retry is idempotent; no provision or progress writes', async () => {
  const s = makeStore(); assert.equal(await resolveTelegramLearner(s, x), null);
  await linkTelegramIdentity(s, a, x); await linkTelegramIdentity(s, a, x);
  assert.equal(await resolveTelegramLearner(s, x), a); assert.equal(s.rows.size, 4);
});
test('subject cannot be claimed by another learner; learner cannot take another subject', async () => {
  const s = makeStore(); await linkTelegramIdentity(s, a, x);
  await assert.rejects(linkTelegramIdentity(s, b, x), /conflict/);
  await assert.rejects(linkTelegramIdentity(s, a, y), /conflict/);
  assert.equal(await resolveTelegramLearner(s, x), a); assert.equal(await resolveTelegramLearner(s, y), null);
});
test('inactive learner and invalid identities are refused; revocation blocks login', async () => {
  const s = makeStore(); await linkTelegramIdentity(s, a, x);
  s.rows.get(`learner:${a}`).value.active = false;
  assert.equal(await resolveTelegramLearner(s, x), null);
  await assert.rejects(linkTelegramIdentity(s, a, x), /inactive/);
  await assert.rejects(linkTelegramIdentity(s, b, { botId: 'foo', telegramId: '5' }), /invalid/);
});
test('interrupted second write fails closed and same-pair retry repairs it', async () => {
  const s = makeStore(), cas = s.compareAndSet; let fail = true;
  s.compareAndSet = async (...args) => { if (args[0].startsWith('telegram-learner:') && fail) throw new Error('storage_down'); return cas(...args); };
  await assert.rejects(linkTelegramIdentity(s, a, x), /storage_down/);
  assert.equal(await resolveTelegramLearner(s, x), null);
  fail = false; await linkTelegramIdentity(s, a, x);
  assert.equal(await resolveTelegramLearner(s, x), a);
});
test('simultaneous claims preserve one-to-one mapping', async () => {
  const s = makeStore();
  await Promise.allSettled([linkTelegramIdentity(s, a, x), linkTelegramIdentity(s, b, x), linkTelegramIdentity(s, a, y)]);
  const [rx, ry] = await Promise.all([resolveTelegramLearner(s, x), resolveTelegramLearner(s, y)]);
  assert.ok(rx || ry); assert.ok(!(rx && ry && rx === ry));
});
