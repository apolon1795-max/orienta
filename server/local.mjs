import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { createApi } from './api.mjs';
import { openSqliteStore } from './sqlite.mjs';
import { createProxyAi, createAiService } from './ai.mjs';

export const startServer = ({ aiProvider = createProxyAi(), filename = process.env.ORIENTA_DB_PATH, port = Number(process.env.PORT || 8787), host = process.env.HOST || '127.0.0.1', allowedOrigins = (process.env.ORIENTA_ALLOWED_ORIGINS || 'http://127.0.0.1:5173').split(',') } = {}) => {
  if (!filename) throw new Error('Set ORIENTA_DB_PATH to a persistent path outside the public web directory');
  const store = openSqliteStore(filename), ai = aiProvider ? createAiService({ store, provider: aiProvider }) : null;
  const api = createApi({ store, allowedOrigins, ai });
  const server = createServer(async (req, res) => {
    const chunks = []; let bytes = 0;
    for await (const chunk of req) { bytes += chunk.length; if (bytes > 100000) { res.writeHead(413); res.end(); req.destroy(); return; } chunks.push(chunk); }
    const response = await api({ method: req.method, path: new URL(req.url, 'http://localhost').pathname.replace(/^\/api(?=\/)/, ''), headers: req.headers, body: Buffer.concat(chunks).toString('utf8'), ip: req.socket.remoteAddress });
    res.writeHead(response.status, response.headers); res.end(response.body);
  });
  server.on('close', () => store.close()); server.listen(port, host);
  return { server, store };
};
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) startServer();
