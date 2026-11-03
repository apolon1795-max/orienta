import test from 'node:test';
import assert from 'node:assert/strict';
import { Types, TypedValues } from 'ydb-sdk';
import { createNativeYdbStore } from '../server/ydb-native.mjs';
const endpoint = 'https://docapi.serverless.yandexcloud.net/ru-central1/test/database';
test('native store rejects foreign endpoints and unsafe identifiers before opening a connection', () => {
  let connected = false;
  const base = { endpoint, token: async () => 'test', driverFactory: () => { connected = true; } };
  for (const endpoint of ['https://example.org/ru-central1/a/b', 'http://docapi.serverless.yandexcloud.net/ru-central1/a/b', 'https://docapi.serverless.yandexcloud.net/ru-central2/a/b', 'https://user:secret@docapi.serverless.yandexcloud.net/ru-central1/a/b']) assert.throws(() => createNativeYdbStore({ ...base, endpoint }));
  for (const table of ['x; DROP TABLE other', '../other', 'table-with-dash']) assert.throws(() => createNativeYdbStore({ ...base, table }));
  assert.equal(connected, false);
});
test('native schema verification never replaces a foreign table and always closes the driver', async () => {
  let created = 0, closed = 0;
  const store = createNativeYdbStore({ endpoint, token: async () => 'test', driverFactory: () => ({ ready: async () => true,
    tableClient: { withSession: callback => callback({ describeTable: async () => ({ primaryKey: ['foreign'], columns: [] }), createTable: async () => { created++; } }) },
    destroy: async () => { closed++; } }) });
  await assert.rejects(store.initialize(), error => error.message === 'YDB storage operation failed');
  await store.close(); await store.close(); assert.equal(created, 0); assert.equal(closed, 1);
  await assert.rejects(store.get('p'));
});
test('native reads decode large revisions and UTF-8 JSON while excluding SDK exception messages', async () => {
  const columns = [{ name: 'key', type: Types.UTF8 }, { name: 'revision', type: Types.UINT64 }, { name: 'value', type: Types.UTF8 }];
  const store = createNativeYdbStore({ endpoint, token: async () => 'test', driverFactory: () => ({ ready: async () => true,
    tableClient: { withSession: callback => callback({ executeQuery: async () => ({ resultSets: [{ columns, rows: [{ items: [TypedValues.utf8('p').value, TypedValues.uint64(4294967296).value, TypedValues.utf8('{"answer":"Игра"}').value] }] }] }) }) }, destroy: async () => {} }) });
  assert.deepEqual(await store.get('p'), { key: 'p', revision: 4294967296, value: { answer: 'Игра' } }); await store.close();
});
