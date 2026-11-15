import test from 'node:test';
import assert from 'node:assert/strict';
import { openSqliteStore } from '../server/sqlite.mjs';
import { provisionLearner } from '../server/api.mjs';
import { hasCourseAccess, setCourseAccess } from '../server/course-access.mjs';

test('personal code is not payment; grants, revocations and disabled users are checked from server storage', async () => {
  const store = openSqliteStore(':memory:');
  try {
    const { learnerId } = await provisionLearner(store, 'Synthetic learner');
    assert.equal(await hasCourseAccess(store, learnerId), false);
    // Importing a backup or adding paid=true to progress cannot create access.
    await store.compareAndSet('progress:' + learnerId, 0, { paid: true, courseAccess: true });
    assert.equal(await hasCourseAccess(store, learnerId), false);
    await setCourseAccess(store, { learnerId, expectedRevision: 0, status: 'active', reference: 'test_receipt_001' }, () => 123);
    assert.equal(await hasCourseAccess(store, learnerId), true);
    await setCourseAccess(store, { learnerId, expectedRevision: 1, status: 'revoked', reference: 'test_refund_001' });
    assert.equal(await hasCourseAccess(store, learnerId), false);
    await assert.rejects(() => setCourseAccess(store, { learnerId, expectedRevision: 1, status: 'active', reference: 'stale_receipt' }), /access_changed/);
    assert.equal(await hasCourseAccess(store, learnerId), false);
    await setCourseAccess(store, { learnerId, expectedRevision: 2, status: 'active', reference: 'test_receipt_002' });
    const learner = await store.get('learner:' + learnerId);
    await store.compareAndSet('learner:' + learnerId, learner.revision, { ...learner.value, active: false });
    assert.equal(await hasCourseAccess(store, learnerId), false);
  } finally { store.close(); }
});

test('invalid access changes fail closed', async () => {
  const store = openSqliteStore(':memory:');
  try {
    const { learnerId } = await provisionLearner(store);
    for (const status of ['pending', 'paid', undefined]) await assert.rejects(() => setCourseAccess(store, { learnerId, expectedRevision: 0, status, reference: 'test_receipt' }), /invalid_access_change/);
    await assert.rejects(() => hasCourseAccess(store, '../other'), /invalid_learner/);
    assert.equal(await hasCourseAccess(store, learnerId), false);
  } finally { store.close(); }
});
