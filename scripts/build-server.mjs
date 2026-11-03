import { build } from 'vite';
import { builtinModules } from 'node:module';
import { writeFile } from 'node:fs/promises';
await build({ configFile: false, publicDir: false, build: { outDir: 'dist-server', emptyOutDir: true, target: 'node22', minify: false,
  lib: { entry: 'server/function.mjs', formats: ['cjs'], fileName: () => 'function.js' }, rollupOptions: { external: [...builtinModules, ...builtinModules.map(name => 'node:' + name)] } } });
await writeFile('dist-server/package.json', JSON.stringify({ type: 'commonjs', private: true }));
const { handler } = await import('../dist-server/function.js');
const previous = process.env.ORIENTA_YDB_ENDPOINT;
process.env.ORIENTA_YDB_ENDPOINT = 'https://docapi.serverless.yandexcloud.net/ru-central1/build/check';
try {
  const result = await handler({ httpMethod: 'GET', path: '/api/health' }, {});
  if (result.statusCode !== 200 || !JSON.parse(result.body).ok) throw new Error('Built function failed its HTTP entry-point smoke check');
} finally { if (previous === undefined) delete process.env.ORIENTA_YDB_ENDPOINT; else process.env.ORIENTA_YDB_ENDPOINT = previous; }
