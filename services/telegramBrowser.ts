// Load the official SDK only after an explicit Telegram sign-in/link action.
// Never use initDataUnsafe for identity or authorization.
let sdk: Promise<void> | null = null;
export const telegramProof = async (): Promise<string> => {
  if (!window.Telegram?.WebApp?.initData) {
    sdk ||= new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-web-app.js'; script.async = true;
      const timer = setTimeout(() => reject(new Error('Не удалось загрузить Telegram. Открой мини-приложение заново.')), 10000);
      script.onload = () => { clearTimeout(timer); resolve(); };
      script.onerror = () => { clearTimeout(timer); reject(new Error('Не удалось загрузить Telegram.')); };
      document.head.appendChild(script);
    }).catch(error => { sdk = null; throw error; });
    await sdk;
  }
  const raw = window.Telegram?.WebApp?.initData;
  if (!raw) throw new Error('Открой Ориенту через кнопку мини-приложения в боте Telegram. В обычном браузере используй личный код.');
  return raw;
};
