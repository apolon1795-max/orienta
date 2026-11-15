import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { registerFreeLearner } from '../server/free-registration.mjs';
const code = 'ORI-' + 'A'.repeat(32), other = 'ORI-' + 'B'.repeat(32);
const params = { code, consent: true, ip: '192.0.2.1', now: 1800000000000, dailyLimit: 1 };
const make = () => { const rows = new Map(); return { rows, get: async k => rows.get(k) || null, compareAndSet: async (k, r, v) => { if ((rows.get(k)?.revision || 0) !== r) return false; rows.set(k, { revision: r + 1, value: v }); return true; } }; };
test('free profile only; idempotent, hash-only storage', async () => {
  const s = make(), a = await registerFreeLearner(s, params), b = await registerFreeLearner(s, params);
  assert.equal(a.learnerId, b.learnerId); assert.equal(b.created, false);
  assert.equal(s.rows.get('learner:' + a.learnerId).value.kind, 'free');
  assert.equal(s.rows.size, 3); const raw = JSON.stringify([...s.rows]);
  assert.ok(!raw.includes(code)); assert.ok(!raw.includes(params.ip)); assert.ok(!raw.includes('course-access:'));
});
test('consent, code and trusted gateway IP are mandatory', async () => {
  for (const change of [{ consent: false }, { consent: 'true' }, { code: 'weak' }, { ip: '' }]) await assert.rejects(registerFreeLearner(make(), { ...params, ...change }));
});
test('durable per-IP/day limit, idempotent retry and next-day allowance', async () => {
  const s = make(); await registerFreeLearner(s, params);
  await assert.rejects(registerFreeLearner(s, { ...params, code: other }), /rate_limited/);
  await registerFreeLearner(s, params);
  await registerFreeLearner(s, { ...params, code: other, now: params.now + 86400000 });
});
test('concurrent same code converges; different code limited atomically', async () => {
  const s = make(); const results = await Promise.all([registerFreeLearner(s, params), registerFreeLearner(s, params)]);
  assert.equal(results[0].learnerId, results[1].learnerId);
  const t = make(), mixed = await Promise.allSettled([registerFreeLearner(t, params), registerFreeLearner(t, { ...params, code: other })]);
  assert.equal(mixed.filter(r => r.status === 'fulfilled').length, 1);
});
test('half-write cannot authenticate; same-secret retry repairs without extra quota', async () => {
  const s = make(), cas = s.compareAndSet; let stop = true;
  s.compareAndSet = async (...args) => { if (stop && args[0].startsWith('code:')) throw new Error('storage_down'); return cas(...args); };
  await assert.rejects(registerFreeLearner(s, params), /storage_down/);
  const account = [...s.rows].find(([k]) => k.startsWith('learner:'))[1].value;
  assert.equal(account.active, false); stop = false;
  const result = await registerFreeLearner(s, params);
  assert.equal(s.rows.get('learner:' + result.learnerId).value.active, true);
});
test('revoked account stays revoked and existing legacy code is never taken over', async () => {
  const s = make(), account = await registerFreeLearner(s, params);
  s.rows.get('learner:' + account.learnerId).value.active = false;
  await assert.rejects(registerFreeLearner(s, params), /revoked/);
  const t = make(), key = 'code:' + createHash('sha256').update(code.replaceAll('-', '')).digest('hex');
  t.rows.set(key, { revision: 1, value: { learnerId: 'legacy-user' } });
  await assert.rejects(registerFreeLearner(t, params), /conflict/); assert.equal(t.rows.size, 1);
});
