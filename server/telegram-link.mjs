import { createHash } from 'node:crypto';

// Internal helpers only. The API must authenticate the browser learner and verify
// and consume fresh Telegram initData BEFORE calling linkTelegramIdentity.
// Never accept these arguments directly from a client JSON body.
const subjectKey = ({ botId, telegramId }) => {
  if (!/^\d{1,20}$/.test(botId || '') || !/^\d{1,20}$/.test(telegramId || '')) throw new Error('telegram_invalid_subject');
  return 'telegram-subject:' + createHash('sha256').update(`${botId}:${telegramId}`).digest('hex');
};
const learnerKey = learnerId => {
  if (typeof learnerId !== 'string' || !/^[a-f\d-]{36}$/i.test(learnerId)) throw new Error('invalid_learner');
  return 'telegram-learner:' + learnerId;
};
const reserve = async (store, key, value, matches) => {
  const previous = await store.get(key);
  if (previous) { if (!matches(previous.value)) throw new Error('telegram_link_conflict'); return; }
  if (!await store.compareAndSet(key, 0, value)) {
    const winner = await store.get(key);
    if (!winner || !matches(winner.value)) throw new Error('telegram_link_conflict');
  }
};
export const linkTelegramIdentity = async (store, learnerId, verifiedSubject) => {
  const reverseKey = learnerKey(learnerId), key = subjectKey(verifiedSubject);
  const learner = await store.get('learner:' + learnerId);
  if (!learner?.value.active) throw new Error('inactive_learner');
  // Fail closed across two CAS records. An interrupted same-pair operation may
  // retry safely; no session can use a one-sided binding. Conflicting partial
  // reservations are retained for explicit reconciliation, never stolen/deleted.
  await reserve(store, key, { learnerId }, value => value.learnerId === learnerId);
  await reserve(store, reverseKey, { subjectKey: key }, value => value.subjectKey === key);
  if (await resolveTelegramLearner(store, verifiedSubject) !== learnerId) throw new Error('telegram_link_incomplete');
  return { linked: true, learnerId };
};
export const resolveTelegramLearner = async (store, verifiedSubject) => {
  const key = subjectKey(verifiedSubject);
  const forward = await store.get(key);
  if (!forward) return null;
  const learnerId = forward.value.learnerId;
  const reverse = await store.get(learnerKey(learnerId));
  if (reverse?.value.subjectKey !== key) return null;
  const learner = await store.get('learner:' + learnerId);
  return learner?.value.active ? learnerId : null;
};
