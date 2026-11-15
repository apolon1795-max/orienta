// Server-only entitlement primitive. Not a payment processor and not yet wired to
// public routes. A successful checkout redirect or browser field is never proof.
const keyFor = learnerId => {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(learnerId || '')) throw new Error('invalid_learner');
  return `course-access:${learnerId}`;
};
export const hasCourseAccess = async (store, learnerId) => {
  const key = keyFor(learnerId);
  const learner = await store.get('learner:' + learnerId);
  if (learner?.value.active !== true) return false;
  const record = await store.get(key);
  return record?.value.status === 'active' && record.value.basis === 'verified_payment';
};
// Call only from an IAM-protected operator tool after checking the actual payment.
// reference is an internal opaque receipt reference, not bank/card details or PII.
// expectedRevision prevents a stale grant from overwriting a newer revocation.
export const setCourseAccess = async (store, { learnerId, expectedRevision, status, reference }, now = Date.now) => {
  const key = keyFor(learnerId);
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || !['active', 'revoked'].includes(status) || !/^[A-Za-z0-9_-]{8,100}$/.test(reference || '')) throw new Error('invalid_access_change');
  const learner = await store.get('learner:' + learnerId);
  if (learner?.value.active !== true) throw new Error('learner_inactive');
  const value = { status, basis: 'verified_payment', reference, updatedAt: now() };
  if (!await store.compareAndSet(key, expectedRevision, value)) throw new Error('access_changed');
  return { revision: expectedRevision + 1, status };
};
