import { takeRequestSlot } from './request-limit.mjs';
import { registerFreeLearner, FreeRegistrationError } from './free-registration.mjs';
import { hasCourseAccess } from './course-access.mjs';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { normalizeUserState } from '../services/progress.ts';
import { normalizeTestDraft } from '../services/testProgress.ts';
import { verifyTelegramInitData, consumeTelegramProof, TelegramAuthError } from './telegram-auth.mjs';
import { linkTelegramIdentity, resolveTelegramLearner } from './telegram-link.mjs';
import { AiError, clearAiCache } from './ai.mjs';

export const digest = value => createHash('sha256').update(value).digest('hex');
export const normalizeCode = value => typeof value === 'string' ? value.toUpperCase().replace(/[\s-]/g, '') : '';
export const codeKey = code => 'code:' + digest(normalizeCode(code));
export const sessionKey = token => 'session:' + digest(token);
export const normalizePayload = payload => {
  if (!payload?.state?.course || !payload?.testDraft || JSON.stringify(payload).length > 100000) throw new Error('invalid_payload');
  const state = normalizeUserState(payload.state);
  // This pilot uses personal access codes, without importing messenger identities.
  state.telegramId = null; state.username = null; state.firstName = null;
  return { state, testDraft: normalizeTestDraft(payload.testDraft) };
};
const snapshot = record => record ? { revision: record.revision, payload: record.value.payload, updatedAt: record.value.updatedAt, mutationId: record.value.mutationId } : { revision: 0, payload: null, updatedAt: 0 };
export const provisionLearner = async (store, label = '') => {
  const learnerId = randomUUID();
  const code = 'ORI-' + randomBytes(16).toString('hex').toUpperCase().match(/.{1,4}/g).join('-');
  const account = { learnerId, label: String(label).slice(0, 100), active: true, createdAt: Date.now() };
  if (!await store.compareAndSet('learner:' + learnerId, 0, account)) throw new Error('provision_failed');
  if (!await store.compareAndSet(codeKey(code), 0, { learnerId })) throw new Error('provision_failed');
  return { learnerId, code, label: account.label };
};

export const createApi = ({ store, allowedOrigins = [], now = Date.now, sessionDays = 7, loginLimits = new Map(), ai = null, telegramBotToken = null, freeRegistrationEnabled = false }) => {
  const limits = loginLimits;
  const courseAllowed = async learnerId => { const account = await store.get('learner:' + learnerId); return account?.value.active === true && (account.value.kind !== 'free' || await hasCourseAccess(store, learnerId)); };
  return async ({ method, path, headers = {}, body = '', ip = '' }) => {
    headers = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
    const origin = headers.origin;
    const cors = origin && allowedOrigins.includes(origin) ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {};
    const reply = (status, data) => ({ status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...cors }, body: JSON.stringify(data) });
    if (origin && !allowedOrigins.includes(origin)) return reply(403, { error: 'origin_denied' });
    if (method === 'OPTIONS') return { ...reply(204, {}), body: '', headers: { ...reply(204, {}).headers, 'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS', 'access-control-allow-headers': 'Authorization, Content-Type', 'access-control-max-age': '600' } };
    if (method === 'GET' && path === '/health') return reply(200, { ok: true, telegramAvailable: !!telegramBotToken, registrationAvailable: freeRegistrationEnabled });
    if (Buffer.byteLength(body) > 100000) return reply(413, { error: 'too_large' });
    let input = {};
    if (body) { try { input = JSON.parse(body); } catch { return reply(400, { error: 'invalid_json' }); } }
    try {
      if (method === 'POST' && path === '/register') {
        if (!freeRegistrationEnabled) return reply(503, { error: 'registration_disabled' });
        const result = await registerFreeLearner(store, { code: input.code, consent: input.consent, ip, now: now() });
        return reply(200, { learnerId: result.learnerId, kind: 'free', courseAvailable: false });
      }
      if (method === 'POST' && path === '/telegram-session') {
        if (!telegramBotToken) return reply(503, { error: 'telegram_disabled' });
        if (!await takeRequestSlot(store, { ip, scope: 'telegram', now: now(), limit: 30 })) return reply(429, { error: 'try_later' });
        const proof = verifyTelegramInitData(input.initData, { botToken: telegramBotToken, now: now() });
        const learnerId = await resolveTelegramLearner(store, proof);
        if (!learnerId) return reply(403, { error: 'telegram_not_linked' });
        await consumeTelegramProof(store, proof, { now: now() });
        if (!(await store.get('learner:' + learnerId))?.value.active) return reply(401, { error: 'session_expired' });
        const token = randomBytes(32).toString('base64url'), expiresAt = now() + sessionDays * 86400000;
        if (!await store.compareAndSet(sessionKey(token), 0, { learnerId, expiresAt, authenticationMethod: 'telegram' })) throw new Error('session_not_created');
        return reply(200, { token, learnerId, expiresAt, progress: snapshot(await store.get('progress:' + learnerId)), aiAvailable: !!ai && await courseAllowed(learnerId), courseAvailable: await courseAllowed(learnerId), telegramAvailable: true });
      }
      if (method === 'POST' && path === '/session') {
        const normalized = normalizeCode(input.code);
        if (!/^ORI[A-F0-9]{32}$/.test(normalized)) return reply(401, { error: 'invalid_code' });
        const minute = Math.floor(now() / 60000), rateKey = ip || 'unknown';
        const rate = limits.get(rateKey);
        if (rate?.minute === minute && rate.count >= 20) return reply(429, { error: 'try_later' });
        limits.set(rateKey, { minute, count: rate?.minute === minute ? rate.count + 1 : 1 });
        if (limits.size > 5000) for (const [key, value] of limits) if (value.minute !== minute) limits.delete(key);
        const code = await store.get(codeKey(normalized));
        const learner = code && await store.get('learner:' + code.value.learnerId);
        if (!learner?.value.active) return reply(401, { error: 'invalid_code' });
        const token = randomBytes(32).toString('base64url'), expiresAt = now() + sessionDays * 86400000;
        if (!await store.compareAndSet(sessionKey(token), 0, { learnerId: learner.value.learnerId, expiresAt })) throw new Error('session_not_created');
        const progress = await store.get('progress:' + learner.value.learnerId);
        return reply(200, { token, learnerId: learner.value.learnerId, expiresAt, progress: snapshot(progress), aiAvailable: !!ai && await courseAllowed(learner.value.learnerId), courseAvailable: await courseAllowed(learner.value.learnerId), telegramAvailable: !!telegramBotToken });
      }
      const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(headers.authorization || '')?.[1];
      if (!token) return reply(401, { error: 'sign_in_required' });
      const session = await store.get(sessionKey(token));
      if (!session || session.value.expiresAt <= now()) return reply(401, { error: 'session_expired' });
      const learner = await store.get('learner:' + session.value.learnerId);
      if (!learner?.value.active) return reply(401, { error: 'session_expired' });
      if (method === 'DELETE' && path === '/session') {
        await store.compareAndSet(sessionKey(token), session.revision, { ...session.value, expiresAt: 0 });
        return reply(200, { ok: true, telegramAvailable: !!telegramBotToken });
      }
      if (method === 'POST' && path === '/telegram-link') {
        if (!telegramBotToken) return reply(503, { error: 'telegram_disabled' });
        if (!await takeRequestSlot(store, { ip, scope: 'telegram', now: now(), limit: 30 })) return reply(429, { error: 'try_later' });
        if (session.value.authenticationMethod === 'telegram') return reply(403, { error: 'code_login_required' });
        if (input.confirmLink !== true) return reply(400, { error: 'link_confirmation_required' });
        const proof = verifyTelegramInitData(input.initData, { botToken: telegramBotToken, now: now() });
        await consumeTelegramProof(store, proof, { now: now() });
        await linkTelegramIdentity(store, session.value.learnerId, proof);
        return reply(200, { linked: true });
      }
      if (method === 'GET' && path === '/profile-identity') {
        const reverse = await store.get('telegram-learner:' + session.value.learnerId);
        const forward = reverse && await store.get(reverse.value.subjectKey);
        return reply(200, { telegramAvailable: !!telegramBotToken, telegramLinked: forward?.value.learnerId === session.value.learnerId });
      }
      const key = 'progress:' + session.value.learnerId;
      if (method === 'GET' && path === '/progress') return reply(200, { learnerId: session.value.learnerId, progress: snapshot(await store.get(key)), aiAvailable: !!ai && await courseAllowed(learner.value.learnerId), courseAvailable: await courseAllowed(learner.value.learnerId), telegramAvailable: !!telegramBotToken });
      if (method === 'POST' && path === '/ai-summary') {
        if (!await courseAllowed(session.value.learnerId)) return reply(403, { error: 'course_access_required' });
        if (!ai) return reply(503, { error: 'ai_disabled' });
        if (!Number.isSafeInteger(input.baseRevision) || input.baseRevision < 1 || Object.keys(input).some(name => name !== 'baseRevision')) return reply(400, { error: 'invalid_revision' });
        const progress = await store.get(key);
        if (!progress || progress.revision !== input.baseRevision) return reply(409, { error: 'ai_progress_changed' });
        try {
          const fingerprint = ai.fingerprint(progress.value.payload.state);
          const result = await ai.summarize(session.value.learnerId, progress.value.payload.state);
          // A logout, revoked access or changed answers during generation invalidates this response.
          const currentSession = await store.get(sessionKey(token));
          const currentLearner = await store.get('learner:' + session.value.learnerId);
          if (!currentSession || currentSession.value.expiresAt <= now() || !currentLearner?.value.active) return reply(401, { error: 'session_expired' });
          const current = await store.get(key);
          if (!current || !current.value.payload.state.testResult && !current.value.payload.state.course.completedStages.length) {
            await clearAiCache(store, session.value.learnerId);
            return reply(409, { error: 'ai_progress_changed' });
          }
          if (ai.fingerprint(current.value.payload.state) !== fingerprint) return reply(409, { error: 'ai_progress_changed' });
          return reply(200, result);
        } catch (error) {
          if (error instanceof AiError) return reply(error.status, { error: error.code });
          return reply(503, { error: 'ai_unavailable' });
        }
      }
      if (method === 'PUT' && path === '/progress') {
        if (!Number.isSafeInteger(input.baseRevision) || input.baseRevision < 0 || !/^[A-Za-z0-9_-]{16,64}$/.test(input.mutationId || '')) return reply(400, { error: 'invalid_revision' });
        let payload;
        try { payload = normalizePayload(input.payload); } catch { return reply(400, { error: 'invalid_payload' }); }
        if (!await courseAllowed(session.value.learnerId)) {
          const empty = normalizeUserState(null);
          if (JSON.stringify(payload.state.course) !== JSON.stringify(empty.course) || JSON.stringify(payload.state.courseProgress) !== JSON.stringify(empty.courseProgress) || payload.state.aiSummary) return reply(403, { error: 'course_access_required' });
        }
        const accepted = async record => {
          if (!payload.state.testResult && !payload.state.course.completedStages.length) await clearAiCache(store, session.value.learnerId);
          return reply(200, { progress: snapshot(record) });
        };
        const existing = await store.get(key);
        if (existing?.value.mutationId === input.mutationId) {
          if (JSON.stringify(existing.value.payload) !== JSON.stringify(payload)) return reply(400, { error: 'reused_mutation_id' });
          return await accepted(existing);
        }
        const value = { payload, mutationId: input.mutationId, updatedAt: now() };
        if (await store.compareAndSet(key, input.baseRevision, value)) return await accepted({ revision: input.baseRevision + 1, value });
        const current = await store.get(key);
        // A lost response or concurrent duplicate request must be safe to retry.
        if (current?.value.mutationId === input.mutationId && JSON.stringify(current.value.payload) === JSON.stringify(payload)) return await accepted(current);
        return reply(409, { error: 'progress_changed', progress: snapshot(current) });
      }
      return reply(404, { error: 'not_found' });
    } catch (error) {
      if (error instanceof FreeRegistrationError) return reply(error.code === 'registration_rate_limited' ? 429 : ['registration_conflict', 'registration_revoked'].includes(error.code) ? 409 : ['registration_consent_required', 'registration_invalid_code'].includes(error.code) ? 400 : 503, { error: error.code });
      if (error instanceof TelegramAuthError) return reply(error.code === 'telegram_unconfigured' ? 503 : 401, { error: error.code });
      if (['telegram_link_conflict', 'telegram_link_incomplete', 'inactive_learner'].includes(error.message)) return reply(409, { error: error.message });
      // Never write student answers, access codes or tokens to provider logs.
      return reply(503, { error: 'storage_unavailable' });
    }
  };
};
