import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';

// Only use on a persistent server disk. A serverless function has no persistent local database.
export const openSqliteStore = (filename) => {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filename);
  if (filename !== ':memory:') chmodSync(filename, 0o600);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS records (key TEXT PRIMARY KEY, revision INTEGER NOT NULL, value TEXT NOT NULL)');
  const get = db.prepare('SELECT revision, value FROM records WHERE key = ?');
  const insert = db.prepare('INSERT OR IGNORE INTO records (key, revision, value) VALUES (?, 1, ?)');
  const update = db.prepare('UPDATE records SET revision = revision + 1, value = ? WHERE key = ? AND revision = ?');
  return {
    get: async key => { const row = get.get(key); return row ? { revision: row.revision, value: JSON.parse(row.value) } : null; },
    compareAndSet: async (key, expected, value) => Number((expected === 0 ? insert.run(key, JSON.stringify(value)) : update.run(JSON.stringify(value), key, expected)).changes) === 1,
    scan: async prefix => db.prepare('SELECT key, revision, value FROM records WHERE key LIKE ?').all(prefix + '%').map(row => ({ key: row.key, revision: row.revision, value: JSON.parse(row.value) })),
    close: () => db.close(),
  };
};
