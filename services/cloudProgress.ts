import type { UserState } from '../types.ts';
import { normalizeUserState } from './progress.ts';
import { normalizeTestDraft, type TestDraft } from './testProgress.ts';

export interface ProgressPayload { state: UserState; testDraft: TestDraft }
export interface CloudSnapshot { revision: number; payload: ProgressPayload | null; updatedAt: number; mutationId?: string }
interface Session { token: string; learnerId: string; expiresAt: number }
interface Mutation { baseRevision: number; mutationId: string; payload: ProgressPayload }
interface Cache { revision: number; saved: string; pending: Mutation | null; queued: ProgressPayload | null }
export type SyncStatus = 'local' | 'signed-out' | 'checking' | 'saved' | 'pending' | 'offline' | 'conflict' | 'error';
export interface SyncState { status: SyncStatus; learnerId?: string; message?: string; dirty: boolean; cacheAvailable: boolean; aiAvailable?: boolean }
const SESSION_KEY = 'orienta_session_v1';
const cacheKey = (id: string) => 'orienta_sync_v1:' + id;
const clean = (value: ProgressPayload): ProgressPayload => {
  const state = normalizeUserState(value.state);
  state.telegramId = null; state.username = null; state.firstName = null;
  return { state, testDraft: normalizeTestDraft(value.testDraft) };
};
const normalizeSnapshot = (value: CloudSnapshot): CloudSnapshot => {
  if (!value || !Number.isSafeInteger(value.revision) || value.revision < 0 || !Number.isFinite(value.updatedAt)) throw new Error('invalid_response');
  return { ...value, payload: value.payload ? clean(value.payload) : null };
};
export const apiBase = (value: string | undefined): string => {
  if (!value) return '';
  try {
    const url = new URL(value, typeof window === 'undefined' ? 'https://orienta.invalid/' : window.location.href);
    if (url.username || url.password || url.search || url.hash || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) return '';
    return url.href.replace(/\/$/, '');
  } catch { return ''; }
};

export class ProgressSync {
  private session: Session | null = null;
  private cache: Cache = { revision: 0, saved: '', pending: null, queued: null };
  private remote: CloudSnapshot | null = null;
  private ready = false;
  private busy = false;
  private paused = false;
  private generation = 0;
  private started = false;
  private cacheAvailable = true;
  private aiAvailable = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private listeners = new Set<(state: SyncState) => void>();
  state: SyncState;
  constructor(private options: { base: string; sessionStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>; storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>; restore: (payload: ProgressPayload) => void; reset: () => void; fetch?: typeof fetch; delay?: number }) {
    this.state = { status: options.base ? 'signed-out' : 'local', dirty: false, cacheAvailable: true };
  }
  subscribe(listener: (state: SyncState) => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private publish(status: SyncStatus, message?: string) {
    const next = { status, message, learnerId: this.session?.learnerId, dirty: !!(this.cache.pending || this.cache.queued), cacheAvailable: this.cacheAvailable, aiAvailable: !!this.session && this.aiAvailable };
    if (JSON.stringify(next) === JSON.stringify(this.state)) return;
    this.state = next;
    this.listeners.forEach(listener => listener(this.state));
  }
  private persist() {
    if (!this.session) return;
    try { this.options.storage.setItem(cacheKey(this.session.learnerId), JSON.stringify(this.cache)); this.cacheAvailable = true; }
    catch { this.cacheAvailable = false; }
  }
  private async request(path: string, method = 'GET', body?: unknown, token = this.session?.token, signal?: AbortSignal) {
    const response = await (this.options.fetch || fetch)(this.options.base + path, { method, cache: 'no-store', keepalive: method === 'PUT', signal: signal || AbortSignal.timeout(12000),
      headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json();
    if (!response.ok) throw Object.assign(new Error(data.error || 'request_failed'), { status: response.status, data });
    return data;
  }
  async start() {
    if (!this.options.base || this.started) return;
    this.started = true;
    try {
      const session = JSON.parse(this.options.sessionStorage.getItem(SESSION_KEY) || 'null');
      if (!session || !/^[A-Za-z0-9_-]{43}$/.test(session.token) || !/^[a-f0-9-]{36}$/.test(session.learnerId) || session.expiresAt <= Date.now()) return;
      this.session = session;
      this.readCache(); await this.refresh();
    } catch { this.publish('error', 'Не удалось подключиться. Ответы на устройстве сохранены. Попробуй ещё раз.'); }
  }
  private readCache() {
    this.cache = { revision: 0, saved: '', pending: null, queued: null };
    if (!this.session) return;
    try {
      const cache = JSON.parse(this.options.storage.getItem(cacheKey(this.session.learnerId)) || 'null');
      if (cache && Number.isSafeInteger(cache.revision) && cache.revision >= 0 && typeof cache.saved === 'string') {
        this.cache = { revision: cache.revision, saved: cache.saved, pending: cache.pending ? { ...cache.pending, payload: clean(cache.pending.payload) } : null, queued: cache.queued ? clean(cache.queued) : null };
      }
    } catch { /* A corrupt cache never replaces the cloud copy. */ }
  }
  async signIn(code: string) {
    this.publish('checking');
    try {
      const data = await this.request('/session', 'POST', { code }, '');
      if (!/^[A-Za-z0-9_-]{43}$/.test(data.token) || !/^[a-f0-9-]{36}$/.test(data.learnerId) || !Number.isFinite(data.expiresAt)) throw new Error('invalid_response');
      this.generation++; this.session = { token: data.token, learnerId: data.learnerId, expiresAt: data.expiresAt };
      // Session storage deliberately ends the browser session on shared school computers.
      try { this.options.sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.session)); } catch { /* This tab can still work until it is closed. */ }
      this.aiAvailable = data.aiAvailable === true;
      this.readCache(); this.receive(normalizeSnapshot(data.progress));
    } catch (error: any) { this.publish('signed-out', error.status === 401 ? 'Код не подошёл. Проверь символы или обратись к наставнику.' : error.status === 429 ? 'Слишком много попыток. Подожди минуту.' : 'Сейчас не удалось войти. Проверь интернет и попробуй ещё раз.'); }
  }
  private receive(remote: CloudSnapshot) {
    this.paused = false; this.remote = null;
    const pending = this.cache.pending;
    // An acknowledged mutation may have lost its HTTP response before a page reload.
    if (pending && remote.mutationId === pending.mutationId && JSON.stringify(remote.payload) === JSON.stringify(pending.payload)) {
      this.cache.revision = remote.revision; this.cache.saved = JSON.stringify(remote.payload); this.cache.pending = null;
    }
    const local = this.cache.queued || this.cache.pending?.payload;
    if (local && remote.revision !== this.cache.revision) {
      this.ready = true; this.remote = remote; this.options.restore(local); this.persist(); this.publish('conflict'); return;
    }
    this.cache.revision = remote.revision; this.cache.saved = JSON.stringify(remote.payload);
    this.ready = true;
    this.options.restore(local || remote.payload || { state: normalizeUserState(null), testDraft: normalizeTestDraft(null) });
    this.persist(); this.publish(local ? 'pending' : 'saved');
    if (local) void this.flush();
  }
  private async refresh() {
    if (!this.session) return;
    const generation = this.generation;
    this.ready = false; this.publish('checking');
    try { const data = await this.request('/progress'); if (generation === this.generation) { this.aiAvailable = data.aiAvailable === true; this.receive(normalizeSnapshot(data.progress)); } }
    catch (error: any) { if (generation === this.generation) this.publish(error.status === 401 ? 'signed-out' : 'error', error.status === 401 ? 'Сессия закончилась. Введи личный код ещё раз.' : 'Облако недоступно. Повтори подключение, когда появится интернет.'); }
  }
  offer(payload: ProgressPayload) {
    if (!this.ready || !this.session) return;
    const next = clean(payload), serialized = JSON.stringify(next);
    if (serialized === JSON.stringify(this.cache.queued || this.cache.pending?.payload) || (!this.cache.pending && serialized === this.cache.saved)) return;
    this.cache.queued = next; this.persist();
    if (this.remote) { this.publish('conflict'); return; }
    this.publish(this.paused ? 'offline' : 'pending');
    clearTimeout(this.timer); this.timer = setTimeout(() => { void this.flush(); }, this.options.delay ?? 1000);
  }
  async flush() {
    clearTimeout(this.timer);
    if (!this.ready || !this.session || this.busy || this.remote || this.paused) return;
    if (!this.cache.pending && this.cache.queued) {
      if (JSON.stringify(this.cache.queued) === this.cache.saved) { this.cache.queued = null; this.persist(); this.publish('saved'); return; }
      this.cache.pending = { baseRevision: this.cache.revision, mutationId: crypto.randomUUID().replace(/-/g, ''), payload: this.cache.queued }; this.cache.queued = null;
    }
    if (!this.cache.pending) return;
    const operation = this.cache.pending, generation = this.generation;
    this.busy = true; this.persist(); this.publish('pending');
    try {
      const data = await this.request('/progress', 'PUT', operation);
      if (generation !== this.generation) return;
      const progress = normalizeSnapshot(data.progress);
      this.cache.revision = progress.revision; this.cache.saved = JSON.stringify(operation.payload); this.cache.pending = null;
      this.persist(); this.publish(this.cache.queued ? 'pending' : 'saved');
    } catch (error: any) {
      if (generation !== this.generation) return;
      if (error.status === 409) { this.remote = normalizeSnapshot(error.data.progress); this.publish('conflict'); }
      else { this.paused = true; this.publish(error.status === 401 ? 'signed-out' : 'offline', error.status === 401 ? 'Введи личный код ещё раз, чтобы отправить изменения.' : 'Нет связи с облаком. Ответы пока сохранены на устройстве.'); }
    } finally { this.busy = false; }
    if (!this.paused && !this.remote && this.cache.queued) await this.flush();
  }
  async generateAi(payload: ProgressPayload, signal?: AbortSignal): Promise<string> {
    if (!this.session || !this.ready || !this.aiAvailable) throw new Error('Войди по личному коду. Сервис ИИ должен быть подключён наставником.');
    const generation = this.generation, serialized = JSON.stringify(clean(payload));
    this.offer(payload);
    // Let an autosave already in flight finish before choosing the server revision.
    for (let i = 0; i < 250; i++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      if (generation !== this.generation || this.paused || this.remote) break;
      await this.flush();
      if (!this.busy && !this.cache.pending && !this.cache.queued) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    if (generation !== this.generation || !this.session || this.busy || this.cache.pending || this.cache.queued || this.paused || this.remote || this.cache.saved !== serialized)
      throw new Error('Сначала сохрани ответы в облаке и разреши конфликт с другим устройством, если он появился.');
    try {
      const data = await this.request('/ai-summary', 'POST', { baseRevision: this.cache.revision }, this.session.token, signal);
      if (generation !== this.generation) throw new Error('ai_account_changed');
      if (this.cache.pending || this.cache.queued || this.cache.saved !== serialized) throw new Error('ai_progress_changed');
      if (typeof data.text !== 'string' || data.text.trim().length < 20 || data.text.length > 12000) throw new Error('ai_invalid_response');
      return data.text.trim();
    } catch (error: any) {
      if (signal?.aborted) throw error;
      const messages: Record<string, string> = {
        ai_balance_required: 'На сервисе ИИ закончился баланс. Сообщи наставнику.',
        ai_configuration: 'Наставнику нужно проверить подключение сервиса ИИ.',
        ai_disabled: 'Сервис ИИ пока не подключён.',
        ai_daily_limit: 'На сегодня лимит запросов исчерпан. Профкарта остаётся доступной.',
        ai_pilot_limit: 'Лимит пилота исчерпан. Сообщи наставнику.',
        ai_running: 'Разбор уже готовится. Подожди немного и повтори запрос.',
        ai_try_later: 'Подожди минуту перед повторной попыткой.',
        ai_provider_busy: 'Сервис ИИ занят. Повтори запрос через минуту.',
        ai_timeout: 'Сервис ИИ не успел ответить. Можно повторить запрос через минуту.',
        ai_progress_changed: 'Ответы изменились. Открой актуальную облачную версию профкарты.',
        ai_account_changed: 'Учётная запись изменилась. Открой свою профкарту ещё раз.',
        ai_profile_incomplete: 'Сначала заверши тест и все пять этапов курса.',
        ai_profile_too_large: 'Ответы слишком длинные для разбора. Сократи свободные ответы.',
        session_expired: 'Сессия закончилась. Введи личный код ещё раз.',
      };
      throw new Error(messages[error.message] || 'Не удалось получить ИИ-разбор. Повтори запрос через минуту.');
    }
  }
  async retry() { this.paused = false; if (!this.ready) await this.refresh(); else await this.flush(); }
  useCloudCopy() {
    if (!this.remote) return;
    const remote = this.remote;
    this.cache = { revision: remote.revision, saved: JSON.stringify(remote.payload), pending: null, queued: null };
    this.remote = null; this.options.restore(remote.payload || { state: normalizeUserState(null), testDraft: normalizeTestDraft(null) });
    this.persist(); this.publish('saved');
  }
  async signOut() {
    const token = this.session?.token;
    this.generation++; this.ready = false; this.paused = false; clearTimeout(this.timer);
    try { if (this.session) this.options.storage.removeItem(cacheKey(this.session.learnerId)); this.options.sessionStorage.removeItem(SESSION_KEY); } catch { /* Logout still clears this tab. */ }
    this.session = null; this.aiAvailable = false; this.remote = null; this.cache = { revision: 0, saved: '', pending: null, queued: null };
    this.options.reset(); this.publish('signed-out');
    if (token) { try { await this.request('/session', 'DELETE', undefined, token); } catch { /* The token is already gone from this device and expires server-side. */ } }
  }
  dispose() { clearTimeout(this.timer); this.listeners.clear(); }
}
