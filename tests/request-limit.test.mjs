import test from 'node:test';
import assert from 'node:assert/strict';
import { takeRequestSlot } from '../server/request-limit.mjs';
const options = { ip: '192.0.2.5', scope: 'telegram-session', now: 1800000000000, limit: 2 };
const make = () => { const rows = new Map(); return { rows, get: async k => rows.get(k) || null, compareAndSet: async (k, r, v) => { if ((rows.get(k)?.revision || 0) !== r) return false; rows.set(k, { revision: r + 1, value: v }); return true; } }; };
test('every attempt consumes a slot; next minute resets', async () => {
  const s = make(); assert.equal(await takeRequestSlot(s, options), true);
  assert.equal(await takeRequestSlot(s, options), true); assert.equal(await takeRequestSlot(s, options), false);
  assert.equal(await takeRequestSlot(s, { ...options, now: options.now + 60000 }), true);
  const value = [...s.rows.values()][0].value;
  assert.deepEqual(value, { count: 2, max: 2, expiresAt: options.now + 120000 });
  assert.ok(!JSON.stringify([...s.rows]).includes(options.ip));
});
test('different IP and scope are independent; changed limit is enforced', async () => {
  const s = make(); await takeRequestSlot(s, options);
  assert.equal(await takeRequestSlot(s, { ...options, limit: 1 }), false);
  assert.equal(await takeRequestSlot(s, { ...options, ip: '192.0.2.6', limit: 1 }), true);
  assert.equal(await takeRequestSlot(s, { ...options, scope: 'telegram-link', limit: 1 }), true);
});
test('concurrent requests never exceed limit', async () => {
  const s = make(); const results = await Promise.all(Array.from({ length: 25 }, () => takeRequestSlot(s, { ...options, limit: 4 })));
  assert.equal(results.filter(Boolean).length, 4);
});
test('invalid input, storage failure, malformed row and contention fail closed', async () => {
  for (const changes of [{ ip: '' }, { scope: '../bad' }, { limit: Infinity }, { now: NaN }, { limit: 0 }]) assert.equal(await takeRequestSlot(make(), { ...options, ...changes }), false);
  assert.equal(await takeRequestSlot({ get: async () => { throw new Error('offline'); } }, options), false);
  assert.equal(await takeRequestSlot({ get: async () => ({ revision: 1, value: { count: '1' } }) }, options), false);
  let writes = 0;
  assert.equal(await takeRequestSlot({ get: async () => null, compareAndSet: async () => { writes++; return false; } }, options), false);
  assert.equal(writes, 12);
});
