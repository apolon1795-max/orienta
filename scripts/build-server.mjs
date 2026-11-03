import { build } from 'vite';
import { builtinModules } from 'node:module';
import { writeFile } from 'node:fs/promises';
for (const name of ['function', 'bootstrap']) await build({ configFile: false, publicDir: false, build: { outDir: 'dist-server', emptyOutDir: name === 'function', target: 'node22', minify: false,
  lib: { entry: `server/${name}.mjs`, formats: ['cjs'], fileName: () => `${name}.js` }, rollupOptions: { external: ['ydb-sdk', ...builtinModules, ...builtinModules.map(module => 'node:' + module)] } } });
await writeFile('dist-server/package.json', JSON.stringify({ type: 'commonjs', private: true, dependencies: { 'ydb-sdk': '5.11.1' } }));
const { handler } = await import('../dist-server/function.js');
const previous = process.env.ORIENTA_YDB_ENDPOINT;
process.env.ORIENTA_YDB_ENDPOINT = 'https://docapi.serverless.yandexcloud.net/ru-central1/build/check';
try {
  const result = await handler({ httpMethod: 'GET', path: '/api/health' }, {});
  if (result.statusCode !== 200 || !JSON.parse(result.body).ok) throw new Error('Built function failed its HTTP entry-point smoke check');
} finally { if (previous === undefined) delete process.env.ORIENTA_YDB_ENDPOINT; else process.env.ORIENTA_YDB_ENDPOINT = previous; }
const admin = await import('../dist-server/bootstrap.js');
if ((await admin.handler({ operation: 'provision' }, {})).statusCode !== 403) throw new Error('Private admin function must be disabled without explicit configuration');
