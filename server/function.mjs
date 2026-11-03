import { createApi } from './api.mjs';
import { createYdbStore } from './ydb.mjs';

// Cloud Functions: attach a service account with database-scoped ydb.editor.
// No permanent cloud keys are shipped to browsers or stored in the source tree.
export const createFunctionHandler = ({ env = process.env, transport = fetch } = {}) => {
  const loginLimits = new Map();
  return async (event, context) => {
    try {
      const store = createYdbStore({ endpoint: env.ORIENTA_YDB_ENDPOINT, table: env.ORIENTA_YDB_TABLE || 'orienta', transport, token: async () => {
        if (!context.token?.access_token) throw new Error('Attach a service account');
        return context.token.access_token;
      } });
      const api = createApi({ store, loginLimits, allowedOrigins: (env.ORIENTA_ALLOWED_ORIGINS || '').split(',').filter(Boolean) });
      const response = await api({ method: event.httpMethod, path: String(event.path || '').replace(/^\/api(?=\/)/, ''), headers: event.headers,
        body: event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : event.body || '', ip: event.requestContext?.identity?.sourceIp || '' });
      return { statusCode: response.status, headers: response.headers, body: response.body, isBase64Encoded: false };
    } catch { return { statusCode: 503, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, body: '{"error":"configuration_unavailable"}', isBase64Encoded: false }; }
  };
};
export const handler = createFunctionHandler();
