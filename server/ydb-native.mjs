import { Driver, TokenAuthService, TypedValues, TypedData, Types, Column, TableDescription, StatusCode, ExecuteQuerySettings, OperationParams } from 'ydb-sdk';

const silentLogger = Object.fromEntries(['fatal', 'error', 'warn', 'info', 'debug', 'trace'].map(level => [level, () => {}]));
const status = error => error?.constructor?.status ?? error?.status;
const safeError = error => Object.assign(new Error('YDB storage operation failed'), { code: StatusCode[status(error)] || 'UNAVAILABLE' });
const rows = result => result?.resultSets?.[0] ? TypedData.createNativeObjects(result.resultSets[0]) : [];
const decode = row => {
  if (!row) return null;
  const revision = Number(row.revision);
  if (typeof row.key !== 'string' || typeof row.value !== 'string' || !Number.isSafeInteger(revision) || revision < 1) throw new Error('Invalid progress record');
  return { key: row.key, revision, value: JSON.parse(row.value) };
};

export const createNativeYdbStore = ({ endpoint, token, table = 'orienta_state', driverFactory = settings => new Driver(settings) }) => {
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.hostname !== 'docapi.serverless.yandexcloud.net' || !/^\/ru-central1\/[^/]+\/[^/]+$/.test(url.pathname) || url.username || url.password || url.search || url.hash) throw new Error('Expected the Russian serverless database endpoint');
  if (!/^[a-z][a-z0-9_]{2,62}$/.test(table)) throw new Error('Invalid progress table name');
  const quoted = '`' + table + '`';
  const keyColumn = '`key`', columns = '`key`, `revision`, `value`';
  const settings = new ExecuteQuerySettings().withOperationParams(new OperationParams().withOperationTimeoutSeconds(5).withCancelAfterSeconds(6));
  let driver, connecting, closing;
  const connect = () => {
    if (closing) throw new Error('YDB connection closed');
    return connecting ||= (async () => {
    driver = driverFactory({ endpoint: 'grpcs://ydb.serverless.yandexcloud.net:2135', database: url.pathname,
      authService: new TokenAuthService(await token()), poolSettings: { minLimit: 0, maxLimit: 1 }, logger: silentLogger });
    if (!await driver.ready(5000)) throw new Error('YDB unavailable');
    return driver;
    })();
  };
  const withSession = async callback => {
    try { return await (await connect()).tableClient.withSession(callback, 7000); }
    catch (error) { throw safeError(error); }
  };
  const select = `DECLARE $key AS Utf8; SELECT ${columns} FROM ${quoted} WHERE ${keyColumn} = $key;`;
  return {
    initialize: () => withSession(async session => {
      let description;
      try { description = await session.describeTable(table); }
      catch (error) {
        if (![StatusCode.SCHEME_ERROR, StatusCode.NOT_FOUND].includes(status(error))) throw error;
        try { await session.createTable(table, new TableDescription()
          .withColumn(new Column('key', Types.optional(Types.UTF8)))
          .withColumn(new Column('revision', Types.optional(Types.UINT64)))
          .withColumn(new Column('value', Types.optional(Types.UTF8))).withPrimaryKey('key')); }
        catch (created) { if (![StatusCode.SCHEME_ERROR, StatusCode.ALREADY_EXISTS].includes(status(created))) throw created; }
        description = await session.describeTable(table);
      }
      const expected = { key: Types.UTF8.typeId, revision: Types.UINT64.typeId, value: Types.UTF8.typeId };
      if (description.primaryKey?.length !== 1 || description.primaryKey[0] !== 'key' || description.columns?.length !== 3 || !description.columns.every(column =>
        Object.hasOwn(expected, column.name) && (column.type?.optionalType?.item?.typeId ?? column.type?.typeId) === expected[column.name])) throw new Error('Unexpected progress table schema');
      return { table, ready: true, driver: 'native' };
    }),
    get: key => withSession(async session => decode(rows(await session.executeQuery(select, { $key: TypedValues.utf8(key) }, undefined, settings))[0])),
    compareAndSet: (key, expected, value) => withSession(async session => {
      let transaction;
      try {
        transaction = await session.beginTransaction({ serializableReadWrite: {} });
        const tx = { txId: transaction.id };
        const current = decode(rows(await session.executeQuery(select, { $key: TypedValues.utf8(key) }, tx, settings))[0]);
        if ((current?.revision || 0) !== expected) { await session.rollbackTransaction(tx); transaction = null; return false; }
        await session.executeQuery(`DECLARE $key AS Utf8; DECLARE $revision AS Uint64; DECLARE $value AS Utf8;
          UPSERT INTO ${quoted} (${columns}) VALUES ($key, $revision, $value);`,
        { $key: TypedValues.utf8(key), $revision: TypedValues.uint64(expected + 1), $value: TypedValues.utf8(JSON.stringify(value)) }, tx, settings);
        await session.commitTransaction(tx); transaction = null; return true;
      } catch (error) {
        if (status(error) === StatusCode.ABORTED) return false;
        throw error;
      } finally { if (transaction) { try { await session.rollbackTransaction({ txId: transaction.id }); } catch { /* A failed/committed transaction may already be gone. */ } } }
    }),
    scan: prefix => withSession(async session => {
      const all = []; let after = '';
      for (;;) {
        const page = rows(await session.executeQuery(`DECLARE $prefix AS Utf8; DECLARE $after AS Utf8;
          SELECT ${columns} FROM ${quoted} WHERE StartsWith(${keyColumn}, $prefix) AND ${keyColumn} > $after ORDER BY ${keyColumn} LIMIT 500;`,
        { $prefix: TypedValues.utf8(prefix), $after: TypedValues.utf8(after) }, undefined, settings)).map(decode);
        all.push(...page); if (page.length < 500) return all; after = page.at(-1).key;
      }
    }),
    close: () => closing ||= (async () => { try { await connecting; } catch { /* Destroy a partly initialized driver too. */ } await driver?.destroy(); })(),
  };
};
