import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyTelegramInitData, consumeTelegramProof } from '../server/telegram-auth.mjs';
const botToken = '12345:synthetic_test_only_not_a_real_token';
const now = 1800000000000;
const options = { botToken, now };
const sign = (changes = {}) => {
  const p = new URLSearchParams({ auth_date: String(now / 1000), user: JSON.stringify({ id: 4503599627370490, first_name: 'Тест' }), query_id: 'synthetic', ...changes });
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const message = [...p].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
  p.set('hash', createHmac('sha256', secret).update(message).digest('hex'));
  return p.toString();
};
test('signed identity is verified without trusting browser user fields', () => {
  const p = verifyTelegramInitData(sign(), options);
  assert.equal(p.telegramId, '4503599627370490'); assert.equal(p.botId, '12345');
  assert.equal(p.expiresAt, now + 300000); assert.ok(Object.isFrozen(p));
  assert.equal('first_name' in p, false);
});
test('tampered payload/hash and another bot are rejected', () => {
  assert.throws(() => verifyTelegramInitData(sign().replace('synthetic', 'changed'), options));
  assert.throws(() => verifyTelegramInitData(sign(), { ...options, botToken: '456:other' }));
  assert.throws(() => verifyTelegramInitData(sign().replace(/hash=.+/, 'hash=123'), options));
});
test('expired and future proof rejected, boundary supported', () => {
  assert.throws(() => verifyTelegramInitData(sign({ auth_date: String(now / 1000 - 301) }), options), /telegram_expired/);
  assert.throws(() => verifyTelegramInitData(sign({ auth_date: String(now / 1000 + 31) }), options), /telegram_expired/);
  assert.ok(verifyTelegramInitData(sign({ auth_date: String(now / 1000 - 300) }), options));
});
test('duplicates/malformed input/missing or unsafe identity fail closed', () => {
  for (const raw of [sign() + '&user=x', sign() + '&hash=abc', '%ZZ', 'x'.repeat(17000), sign({ user: '{}' }), sign({ user: '{' }), sign({ user: JSON.stringify({ id: 9007199254740992 }) }), sign({ user: JSON.stringify({ id: -1 }) }), sign({ user: JSON.stringify({ id: 4, is_bot: true }) }), sign({ auth_date: '1e9' }), sign({ query_id: 'a\nb=c' })]) {
    assert.throws(() => verifyTelegramInitData(raw, options));
  }
});
test('new signature field participates in HMAC; encoding/order does not alter replay key', () => {
  const raw = sign({ signature: 'some_signed_value' });
  const proof = verifyTelegramInitData(raw, options);
  assert.throws(() => verifyTelegramInitData(raw.replace('some_signed_value', 'other'), options));
  assert.equal(verifyTelegramInitData(raw.split('&').reverse().join('&'), options).replayKey, proof.replayKey);
});
test('unconfigured verifier refuses use', () => {
  assert.throws(() => verifyTelegramInitData(sign()), /telegram_unconfigured/);
  assert.throws(() => verifyTelegramInitData(sign(), { ...options, maxAgeSeconds: Infinity }), /telegram_unconfigured/);
});
test('durable one-time consumption: one winner in simultaneous requests', async () => {
  const keys = new Set();
  const store = { compareAndSet: async key => { if (keys.has(key)) return false; keys.add(key); return true; } };
  const proof = verifyTelegramInitData(sign(), options);
  const results = await Promise.allSettled([consumeTelegramProof(store, proof, { now }), consumeTelegramProof(store, proof, { now })]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.code, 'telegram_replayed');
  await assert.rejects(consumeTelegramProof(store, proof, { now: now + 300001 }), /telegram_expired/);
});
