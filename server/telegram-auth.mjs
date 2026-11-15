import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

// Mini App initData only, NOT Telegram Login Widget payloads.
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
// This module never provisions accounts, issues sessions or logs identity data.
export class TelegramAuthError extends Error {
  constructor(code = 'telegram_invalid') { super(code); this.code = code; }
}
const fail = code => { throw new TelegramAuthError(code); };
export const verifyTelegramInitData = (raw, { botToken, now = Date.now(), maxAgeSeconds = 300, futureSkewSeconds = 30 } = {}) => {
  if (typeof botToken !== 'string' || !/^\d+:[A-Za-z0-9_-]+$/.test(botToken)) fail('telegram_unconfigured');
  if (!Number.isFinite(now) || !Number.isSafeInteger(maxAgeSeconds) || maxAgeSeconds < 1 || maxAgeSeconds > 3600
    || !Number.isSafeInteger(futureSkewSeconds) || futureSkewSeconds < 0 || futureSkewSeconds > 60) fail('telegram_unconfigured');
  if (typeof raw !== 'string' || !raw || Buffer.byteLength(raw) > 16384 || /%(?![a-f\d]{2})/i.test(raw)) fail();
  const params = new URLSearchParams(raw), seen = new Set();
  for (const [key, value] of params) {
    if (!/^[a-z_]+$/.test(key) || seen.has(key) || /[\r\n]/.test(value)) fail();
    seen.add(key);
  }
  const hash = params.get('hash');
  if (!/^[a-f\d]{64}$/i.test(hash || '')) fail();
  // HMAC excludes only hash (Ed25519's separate protocol also excludes signature).
  const check = [...params].filter(([key]) => key !== 'hash').sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, value]) => `${key}=${value}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', secret).update(check).digest();
  if (!timingSafeEqual(expected, Buffer.from(hash, 'hex'))) fail();
  const date = params.get('auth_date');
  if (!/^\d{1,12}$/.test(date || '')) fail();
  const authDate = Number(date), seconds = Math.floor(now / 1000);
  if (authDate > seconds + futureSkewSeconds || seconds - authDate > maxAgeSeconds) fail('telegram_expired');
  let user;
  try { user = JSON.parse(params.get('user') || 'null'); } catch { fail(); }
  if (!user || !Number.isSafeInteger(user.id) || user.id <= 0 || user.is_bot === true) fail();
  const botId = botToken.split(':')[0];
  // A fingerprint of the authenticated canonical payload, not its URL encoding.
  // No names/photos/usernames need to be persisted for identity matching.
  return Object.freeze({ telegramId: String(user.id), botId, authDate,
    expiresAt: (authDate + maxAgeSeconds) * 1000,
    replayKey: 'telegram-proof:' + createHash('sha256').update(botId + ':' + expected.toString('hex')).digest('hex') });
};

// Call after verifying initData, before issuing any new session or binding identity.
// The CAS must be durable/shared (YDB), never process-local in serverless.
// Lost response: client must re-open the Mini App for fresh initData. Do not retry
// this proof for another session. For smoother retries add a bound, idempotent
// exchange endpoint; never simply ignore a replay conflict.
export const consumeTelegramProof = async (store, proof, { now = Date.now() } = {}) => {
  if (!/^telegram-proof:[a-f\d]{64}$/.test(proof?.replayKey || '') || !Number.isFinite(proof.expiresAt) || proof.expiresAt < now) fail('telegram_expired');
  if (!await store.compareAndSet(proof.replayKey, 0, { expiresAt: proof.expiresAt })) fail('telegram_replayed');
};
