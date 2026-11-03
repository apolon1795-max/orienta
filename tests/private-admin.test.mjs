import test from 'node:test';
import assert from 'node:assert/strict';
import { createYdbStore } from '../server/ydb.mjs';
import { createBootstrapHandler } from '../server/bootstrap.mjs';
import { openSqliteStore } from '../server/sqlite.mjs';
import { createApi } from '../server/api.mjs';

const endpoint = 'https://docapi.serverless.yandexcloud.net/ru-central1/test/database';
const schema = { KeySchema: [{ AttributeName: 'key', KeyType: 'HASH' }], AttributeDefinitions: [{ AttributeName: 'key', AttributeType: 'S' }] };
const context = { token: { access_token: 'unit-test-runtime-token' } };
test('document table initialization is idempotent and verifies the partition key', async () => {
  let exists = false; const actions = [];
  const store = createYdbStore({ endpoint, token: async () => 'test', transport: async (_url, options) => {
    const action = options.headers['x-amz-target'].split('.').pop(); actions.push(action);
    if (action === 'DescribeTable') return exists ? Response.json({ Table: schema }) : Response.json({ __type: 'com.amazonaws.dynamodb#ResourceNotFoundException' }, { status: 400 });
    assert.equal(action, 'CreateTable'); const input = JSON.parse(options.body);
    assert.deepEqual(input.KeySchema, schema.KeySchema); assert.deepEqual(input.AttributeDefinitions, schema.AttributeDefinitions);
    exists = true; return Response.json({});
  } });
  assert.deepEqual(await store.initialize(), { table: 'orienta', ready: true });
  await store.initialize(); assert.equal(actions.filter(action => action === 'CreateTable').length, 1);
});
test('a wrong existing schema or access denial never triggers a destructive replacement', async () => {
  const actions = [];
  const store = createYdbStore({ endpoint, token: async () => 'test', transport: async (_url, options) => { actions.push(options.headers['x-amz-target']); return Response.json({ Table: { ...schema, KeySchema: [{ AttributeName: 'foreign', KeyType: 'HASH' }] } }); } });
  await assert.rejects(store.initialize(), /Unexpected progress table schema/);
  assert.deepEqual(actions, ['DynamoDB_20120810.DescribeTable']);
  let calls = 0;
  const denied = createYdbStore({ endpoint, token: async () => 'test', transport: async () => { calls++; return Response.json({ __type: 'AccessDeniedException' }, { status: 403 }); } });
  await assert.rejects(denied.initialize()); assert.equal(calls, 1);
});
test('private operator handler requires explicit configuration and validates input bounds', async () => {
  let accessed = false;
  const getStore = async () => { accessed = true; return {}; };
  assert.equal((await createBootstrapHandler({ getStore, env: {} })({ operation: 'provision' }, context)).statusCode, 403);
  assert.equal((await createBootstrapHandler({ getStore, env: { ORIENTA_ADMIN_ENABLED: 'true' } })({ operation: 'provision' }, {})).statusCode, 403);
  assert.equal(accessed, false);
  const admin = createBootstrapHandler({ getStore, env: { ORIENTA_ADMIN_ENABLED: 'true' } });
  assert.equal((await admin({ operation: 'delete' }, context)).statusCode, 400);
  for (const count of [0, 101, 1.5, '5']) assert.equal((await admin({ operation: 'provision', count }, context)).statusCode, 400);
  assert.equal((await admin({ httpMethod: 'POST', body: '{' }, context)).statusCode, 400);
});
test('private operator can issue codes, export results and revoke only the selected pupil', async () => {
  const store = openSqliteStore(':memory:');
  try {
    const admin = createBootstrapHandler({ getStore: async () => store, env: { ORIENTA_ADMIN_ENABLED: 'true' } });
    const response = await admin({ operation: 'provision', count: 2 }, context);
    assert.equal(response.statusCode, 200); const { pupils } = JSON.parse(response.body); assert.equal(pupils.length, 2);
    const storedCodes = JSON.stringify(await store.scan('code:'));
    assert.ok(pupils.every(pupil => !storedCodes.includes(pupil.code)));
    const api = createApi({ store });
    const login = async pupil => api({ method: 'POST', path: '/session', body: JSON.stringify({ code: pupil.code }) });
    assert.equal((await login(pupils[0])).status, 200); assert.equal((await login(pupils[1])).status, 200);
    assert.equal((await admin({ operation: 'disable', learnerId: pupils[0].learnerId }, context)).statusCode, 200);
    assert.equal((await login(pupils[0])).status, 401); assert.equal((await login(pupils[1])).status, 200);
    const exported = JSON.parse((await admin({ operation: 'export' }, context)).body).csv;
    assert.ok(exported.startsWith('\uFEFF')); assert.ok(pupils.every(pupil => exported.includes(pupil.learnerId) && !exported.includes(pupil.code)));
  } finally { store.close(); }
});
test('private diagnostics expose infrastructure identifiers without exception messages or values', async () => {
  const admin = createBootstrapHandler({ env: { ORIENTA_ADMIN_ENABLED: 'true' }, getStore: async () => {
    const error = new Error('private pupil answer and access token'); error.code = 'AccessDeniedException'; throw error;
  } });
  const response = await admin({ operation: 'initialize' }, context);
  assert.equal(response.statusCode, 503);
  assert.deepEqual(JSON.parse(response.body), { error: 'admin_operation_failed', code: 'AccessDeniedException', kind: 'Error' });
  const invalid = createBootstrapHandler({ env: { ORIENTA_ADMIN_ENABLED: 'true' }, getStore: async () => { throw { code: 'secret data', name: 'private token' }; } });
  assert.deepEqual(JSON.parse((await invalid({ operation: 'initialize' }, context)).body), { error: 'admin_operation_failed' });
});
