const configuredUrl = import.meta.env.VITE_AI_PROXY_URL || '';
export const AI_PROXY_URL = (() => {
  try {
    const url = new URL(configuredUrl);
    return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)) ? url.href : '';
  } catch { return ''; }
})();
// no-cors cannot confirm persistence. Progress and explicit backups live in progress.ts.
