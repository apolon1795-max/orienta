import type { UserState } from '../types';
import { buildProfileText } from './profile';
import { AI_PROXY_URL } from './storageService';
// API keys belong on the server. No provider is claimed until an endpoint is configured.
export const generateGraduationSummary = async (state: UserState, signal?: AbortSignal): Promise<string> => {
  if (!AI_PROXY_URL) throw new Error('Сервис ИИ пока не подключён.');
  const response = await fetch(AI_PROXY_URL, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'generate_ai', prompt: 'Помоги исследовать профессии по ответам участника. Не ставь диагнозы и не обещай пригодность. Предложи конкретную профессиональную пробу.\n' + buildProfileText({ ...state, aiSummary: null }) }),
  });
  if (!response.ok) throw new Error('Сервис ИИ не ответил.');
  const data = await response.json();
  if (typeof data?.text !== 'string' || !data.text.trim()) throw new Error('Сервис ИИ вернул пустой ответ.');
  return data.text.trim().slice(0, 12000);
};
