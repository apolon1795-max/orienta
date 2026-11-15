export const apiBase = (value: string | undefined): string => {
  if (!value) return '';
  try {
    const url = new URL(value, typeof window === 'undefined' ? 'https://orienta.invalid/' : window.location.href);
    if (url.username || url.password || url.search || url.hash || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) return '';
    return url.href.replace(/\/$/, '');
  } catch { return ''; }
};
