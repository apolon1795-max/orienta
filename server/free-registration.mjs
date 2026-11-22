import { createHash } from 'node:crypto';

const hash = text => createHash('sha256').update(text).digest('hex');
export class FreeRegistrationError extends Error {
  constructor(code) { super(code); this.code = code; }
}
const fail = code => { throw new FreeRegistrationError(code); };
// Client must generate code with crypto.getRandomValues(new Uint8Array(16)).
// No code generation from names/dates/Math.random. HTTPS only, never URL/logs.
export const registerFreeLearner = async (store, { code, consent, ip, now = Date.now(), dailyLimit = 20, kind = 'free' } = {}) => {
  if (!['free', 'pilot'].includes(kind)) fail('registration_unconfigured');
  if (consent !== true) fail('registration_consent_required');
  const normalized = typeof code === 'string' ? code.toUpperCase().replace(/[\s-]/g, '') : '';
  if (!/^ORI[A-F0-9]{32}$/.test(normalized)) fail('registration_invalid_code');
  if (!Number.isSafeInteger(dailyLimit) || dailyLimit < 1 || dailyLimit > 100 || !Number.isFinite(now)) fail('registration_unconfigured');
  // ip MUST come from trusted gateway metadata, never a client-supplied field.
  if (typeof ip !== 'string' || !ip || ip.length > 128) fail('registration_ip_unavailable');
  const codeHash = hash(normalized), ckey = 'code:' + codeHash;
  const idHash = hash('orienta-' + kind + '-learner:' + codeHash);
  const learnerId = `${idHash.slice(0,8)}-${idHash.slice(8,12)}-4${idHash.slice(13,16)}-8${idHash.slice(17,20)}-${idHash.slice(20,32)}`;
  const lkey = 'learner:' + learnerId;
  const assertAccount = account => {
    if (account.kind !== kind || account.registrationCodeHash !== codeHash || account.learnerId !== learnerId) fail('registration_conflict');
    if (account.active !== true && account.registrationPending !== true) fail('registration_revoked');
  };
  const previousCode = await store.get(ckey), previousLearner = await store.get(lkey);
  if (previousCode && previousCode.value.learnerId !== learnerId) fail('registration_conflict');
  if (previousLearner) assertAccount(previousLearner.value);
  if (previousCode && previousLearner?.value.active === true) return { learnerId, kind, created: false };

  // Durable per-IP/day budget: claim for the same code is idempotent even when
  // account creation failed halfway. Keep claims bounded by dailyLimit.
  const day = Math.floor(now / 86400000);
  const rateKey = kind + '-register-rate:' + hash(`${day}:${ip}`);
  let claimed = false;
  for (let attempt = 0; attempt < (kind === 'pilot' ? 40 : 20); attempt++) {
    const row = await store.get(rateKey), claims = row?.value.claims || [];
    if (!Array.isArray(claims)) fail('registration_storage_invalid');
    if (claims.includes(codeHash)) { claimed = true; break; }
    if (claims.length >= dailyLimit) fail('registration_rate_limited');
    if (await store.compareAndSet(rateKey, row?.revision || 0, { claims: [...claims, codeHash], expiresAt: (day + 2) * 86400000 })) { claimed = true; break; }
  }
  if (!claimed) fail('registration_try_again');

  let learner = await store.get(lkey);
  if (!learner) {
    const value = { learnerId, kind, active: false, registrationPending: true, registrationCodeHash: codeHash, createdAt: now, consentAt: now };
    await store.compareAndSet(lkey, 0, value);
    learner = await store.get(lkey);
    if (!learner) fail('registration_incomplete');
  }
  assertAccount(learner.value);
  let mapping = await store.get(ckey);
  if (!mapping) {
    await store.compareAndSet(ckey, 0, { learnerId });
    mapping = await store.get(ckey);
  }
  if (mapping?.value.learnerId !== learnerId) fail('registration_conflict');
  // Activation is LAST. A partial record can never authenticate via /session.
  if (!learner.value.active) {
    await store.compareAndSet(lkey, learner.revision, { ...learner.value, active: true, registrationPending: false });
  }
  const completed = await store.get(lkey);
  if (!completed) fail('registration_incomplete');
  assertAccount(completed.value);
  if (!completed.value.active) fail('registration_incomplete');
  // No session, name, progress, paid entitlement or AI permission is created here.
  return { learnerId, kind, created: !previousLearner };
};
