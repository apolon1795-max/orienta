import { createHash } from 'node:crypto';

// ip must be trusted gateway metadata, never a request body or arbitrary header.
// Counts every attempt, including retries. Storage errors deny rather than allow.
export const takeRequestSlot = async (store, { ip, scope, now = Date.now(), limit = 20, contentionAttempts = 12 } = {}) => {
  if (typeof ip !== 'string' || !ip || ip.length > 128 || !/^[a-z0-9_-]{1,48}$/.test(scope || '')
    || !Number.isFinite(now) || now < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 10000 || !Number.isSafeInteger(contentionAttempts) || contentionAttempts < 1 || contentionAttempts > 60) return false;
  const minute = Math.floor(now / 60000);
  const hash = createHash('sha256').update(`${scope}:${minute}:${ip}`).digest('hex');
  const key = 'request-limit:' + hash;
  try {
    for (let attempt = 0; attempt < contentionAttempts; attempt++) {
      const row = await store.get(key);
      const count = row ? row.value?.count : 0;
      if (!Number.isSafeInteger(count) || count < 0 || count >= limit) return false;
      // Save maximum for diagnostics; enforce the caller's current limit even if
      // configuration changed within this bucket. No IP/secret is persisted.
      if (await store.compareAndSet(key, row?.revision || 0, { count: count + 1, max: limit, expiresAt: (minute + 2) * 60000 })) return true;
    }
  } catch { return false; }
  return false;
};
