import { open } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createYdbStore } from './ydb.mjs';
import { provisionLearner } from './api.mjs';
import { csvRow, exportRows } from './report.mjs';
export { csvCell, exportRows } from './report.mjs';
const args = process.argv.slice(2), command = args[0];
const argument = name => { const idx = args.indexOf('--' + name); return idx >= 0 ? args[idx + 1] : undefined; };
const main = async () => {
  if (!['provision', 'export', 'disable'].includes(command)) throw new Error('Use provision --count N --output <private.csv>, export --output <private.csv>, or disable --id <learner UUID>');
  const store = process.env.ORIENTA_YDB_ENDPOINT ? createYdbStore({ endpoint: process.env.ORIENTA_YDB_ENDPOINT, table: process.env.ORIENTA_YDB_TABLE || 'orienta', token: async () => {
    if (!process.env.ORIENTA_IAM_TOKEN) throw new Error('Provide a short-lived admin IAM token through the environment'); return process.env.ORIENTA_IAM_TOKEN;
  } }) : (await import('./sqlite.mjs')).openSqliteStore(process.env.ORIENTA_DB_PATH || 'private/progress.sqlite');
  try {
    if (command === 'disable') {
      const id = argument('id'); if (!/^[a-f0-9-]{36}$/.test(id || '')) throw new Error('Expected learner UUID');
      const learner = await store.get('learner:' + id);
      if (!learner || !await store.compareAndSet('learner:' + id, learner.revision, { ...learner.value, active: false })) throw new Error('Learner not found or changed; check before retrying');
      console.log('Доступ ученика отключён.'); return;
    }
    const output = argument('output'); if (!output) throw new Error('Provide --output outside the public web directory');
    const count = Number(argument('count') || 1);
    if (command === 'provision' && (!Number.isInteger(count) || count < 1 || count > 1000)) throw new Error('Count must be between 1 and 1000');
    // Never overwrite existing access codes or print them to shared CI logs.
    const file = await open(output, 'wx', 0o600);
    try {
      if (command === 'export') await file.writeFile(await exportRows(store));
      else {
        await file.writeFile('\uFEFF' + csvRow(['Ученик', 'ID', 'Личный код']));
        for (let i = 1; i <= count; i++) { const learner = await provisionLearner(store, 'Ученик ' + String(i).padStart(3, '0')); await file.write(csvRow([learner.label, learner.learnerId, learner.code])); await file.sync(); }
      }
    } finally { await file.close(); }
    console.log(command === 'export' ? 'Выгрузка сохранена в приватный CSV-файл для Excel.' : 'Личные коды сохранены в приватный CSV-файл.');
  } finally { store.close?.(); }
};
// Importing CSV helpers in tests must not execute admin commands.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
