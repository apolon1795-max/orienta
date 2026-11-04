import { createCloudStore } from './cloud-store.mjs';
import { provisionLearner } from './api.mjs';
import { exportRows } from './report.mjs';

// Deploy as a SEPARATE PRIVATE function, with no gateway invoker or allUsers binding.
// Platform IAM authenticates the operator. context.token is the runtime identity, not a caller credential.
// Keep ORIENTA_ADMIN_ENABLED unset on the public pupil function.
export const createBootstrapHandler = ({ env = process.env, transport = fetch, getStore } = {}) => async (event, context) => {
  const reply = (statusCode, data) => ({ statusCode, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, body: JSON.stringify(data) });
  if (env.ORIENTA_ADMIN_ENABLED !== 'true' || !context?.token?.access_token) return reply(403, { error: 'admin_disabled' });
  let input;
  try { input = event?.httpMethod ? JSON.parse(event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : event.body || '{}') : event; }
  catch { return reply(400, { error: 'invalid_json' }); }
  if (!['initialize', 'provision', 'export', 'disable'].includes(input?.operation)) return reply(400, { error: 'unknown_operation' });
  let store;
  try {
    store = getStore ? await getStore() : createCloudStore({ driver: env.ORIENTA_YDB_DRIVER, endpoint: env.ORIENTA_YDB_ENDPOINT, table: env.ORIENTA_YDB_TABLE, transport, token: async () => context.token.access_token });
    if (input.operation === 'initialize') return reply(200, await store.initialize());
    if (input.operation === 'export') return reply(200, { csv: await exportRows(store) });
    if (input.operation === 'disable') {
      if (!/^[a-f0-9-]{36}$/.test(input.learnerId || '')) return reply(400, { error: 'invalid_learner' });
      const key = 'learner:' + input.learnerId, learner = await store.get(key);
      if (!learner) return reply(404, { error: 'learner_not_found' });
      if (!await store.compareAndSet(key, learner.revision, { ...learner.value, active: false })) return reply(409, { error: 'learner_changed' });
      return reply(200, { ok: true });
    }
    const count = input.count ?? 1;
    if (!Number.isInteger(count) || count < 1 || count > 100) return reply(400, { error: 'invalid_count' });
    const pupils = [];
    for (let i = 1; i <= count; i++) pupils.push(await provisionLearner(store, 'Ученик ' + String(i).padStart(3, '0')));
    // Provisioning deliberately runs only on an explicit operator invocation; never log these codes.
    return reply(200, { pupils });
  } catch (error) {
    // Only infrastructure identifiers reach the IAM-protected operator response; never messages, answers or credentials.
    const identifier = value => typeof value === 'string' && /^[A-Za-z0-9_.-]{1,80}$/.test(value) ? value : undefined;
    return reply(503, { error: 'admin_operation_failed', code: identifier(error?.code), kind: identifier(error?.name) });
  }
  finally { if (!getStore) { try { await store?.close?.(); } catch { /* Keep the original result. */ } } }
};
export const handler = createBootstrapHandler();
