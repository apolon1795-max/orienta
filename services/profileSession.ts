import type { SyncState } from './cloudProgress';
import { readFreeProgress, type FreeProgress } from './freeProgress.ts';
const KEY = 'orienta_session_v1';
// Public profile client deliberately does not import paid curriculum or its scoring.
export class ProfileSession {
  state: SyncState = { status: 'signed-out', dirty: false, cacheAvailable: true };
  snapshot: any = null;
  private session: { token: string; learnerId: string; expiresAt: number } | null = null;
  private generation = 0;
  private listeners = new Set<(state: SyncState) => void>();
  constructor(readonly base: string, private transport: typeof fetch = fetch, private storage: Pick<Storage,'getItem'|'setItem'|'removeItem'> = sessionStorage) {}
  subscribe(listener: (state: SyncState) => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private publish(patch: Partial<SyncState>) { this.state = { ...this.state, ...patch, learnerId: this.session?.learnerId }; this.listeners.forEach(fn => fn(this.state)); }
  private async request(path: string, method = 'GET', body?: unknown, token = this.session?.token) {
    const transport = this.transport;
    const r = await transport(this.base + path, { method, cache: 'no-store', signal: AbortSignal.timeout(15000), headers: { ...(body ? {'content-type':'application/json'} : {}), ...(token ? {authorization:'Bearer '+token} : {}) }, ...(body ? {body:JSON.stringify(body)} : {}) });
    const data = await r.json(); if (!r.ok) throw Object.assign(new Error(data.error || 'request_failed'), {status:r.status}); return data;
  }
  private accept(data: any, invited?: boolean) { this.snapshot = data.progress; this.publish({status:'saved',message:undefined,courseAvailable:data.courseAvailable === true,aiAvailable:false,telegramAvailable:data.telegramAvailable === true,...(invited ? {justJoinedWithInvite:true} : {})}); }
  async start({blockingHealth = true} = {}) {
    const generation = this.generation;
    const healthRequest = this.request('/health').then(health=>{ if(generation===this.generation)this.publish({registrationAvailable:health.registrationAvailable===true,telegramAvailable:health.telegramAvailable===true}); }).catch(()=>{});
    if(generation!==this.generation)return;
    try { const value=JSON.parse(this.storage.getItem(KEY)||'null'); if(value && /^[A-Za-z0-9_-]{43}$/.test(value.token) && /^[a-f0-9-]{36}$/.test(value.learnerId) && value.expiresAt>Date.now()) {this.session=value; await this.retry();} } catch {this.publish({status:'signed-out'});}
    if(blockingHealth)await healthRequest;
  }
  getSessionForCourse(){return this.session ? {...this.session} : null;}
  consumeInviteArrival(){if(this.state.justJoinedWithInvite)this.publish({justJoinedWithInvite:false});}
  private async login(path:string, body:unknown, invited = false) {
    const generation=++this.generation; this.publish({status:'checking',message:undefined,justJoinedWithInvite:false});
    try {const data=await this.request(path,'POST',body,'');if(generation!==this.generation)return;
      if(!/^[A-Za-z0-9_-]{43}$/.test(data.token)||!/^[a-f0-9-]{36}$/.test(data.learnerId)||!Number.isFinite(data.expiresAt))throw Error('invalid_response');
      this.session={token:data.token,learnerId:data.learnerId,expiresAt:data.expiresAt};try{this.storage.setItem(KEY,JSON.stringify(this.session));}catch{this.publish({cacheAvailable:false});}this.accept(data, invited);
    }catch(error:any){if(generation===this.generation)this.publish({status:'signed-out',message:invited && error.status===401?'Приглашение не подошло или запись на поток закрыта. Проверь код у наставника.':error.message==='telegram_not_linked'?'Сначала войди по коду и свяжи Telegram.':error.status===429?'Слишком много попыток. Подожди минуту.':'Не удалось войти. Проверь код и соединение; для Telegram заново открой мини-приложение.'});}
  }
  signIn(code:string){return this.login('/session',{code});}
  joinPilot(inviteCode:string,code:string){return this.login('/session',{inviteCode,code,consent:true},true);}
  signInTelegram(initData:string){return this.login('/telegram-session',{initData});}
  async registerFree(code:string){const generation=this.generation;await this.request('/register','POST',{code,consent:true},'');if(generation===this.generation)await this.signIn(code);}
  async retry(){if(!this.session)return;const generation=this.generation;this.publish({status:'checking'});try{const data=await this.request('/progress');if(generation===this.generation)this.accept(data);}catch(error:any){if(generation===this.generation){if(error.status===401)await this.signOut();else this.publish({status:'offline',message:'Сервер недоступен. Локальная вводная остаётся в браузере.'});}}}
  async signOut(){const token=this.session?.token;++this.generation;this.session=null;this.snapshot=null;try{this.storage.removeItem(KEY);}catch{}this.publish({status:'signed-out',courseAvailable:false,justJoinedWithInvite:false});if(token)try{await this.request('/session','DELETE',undefined,token);}catch{}}
  async linkTelegram(initData:string){if(this.state.status!=='saved'||!this.session)throw Error('Сначала войди по коду.');return this.request('/telegram-link','POST',{initData,confirmLink:true});}
  async saveIntro(candidate:FreeProgress){
    if(this.state.status!=='saved'||!this.session)throw Error('Дождись подключения к профилю.');
    const saved=this.snapshot?.payload;
    if(saved?.state?.testResult || (saved?.testDraft?.step && saved.testDraft.step!=='start'))throw Error('В профиле уже есть результат или начатый тест. Он не заменён.');
    const free=readFreeProgress({getItem:()=>JSON.stringify(candidate)});if(!free.result||free.draft.step!=='result')throw Error('Сначала заверши вводную.');
    const payload={state:{...(saved?.state||{}),hasOnboarded:true,testResult:{...free.result,scores:free.draft.scores,timestamp:new Date().toISOString()},course:saved?.state?.course||{},lastUpdated:Date.now()},testDraft:free.draft};
    const generation=this.generation;this.publish({status:'pending'});
    try{const data=await this.request('/progress','PUT',{baseRevision:this.snapshot?.revision||0,mutationId:crypto.randomUUID().replace(/-/g,''),payload});if(generation===this.generation){this.snapshot=data.progress;this.publish({status:'saved',message:undefined});}}
    catch(error:any){if(generation===this.generation){await this.retry();throw Error(error.status===409?'Профиль изменился на другом устройстве. Загружена новая версия, твои ответы не заменили её.':'Сохранение не подтверждено. Локальный результат остаётся здесь. Обнови профиль и проверь его перед повтором.');}}
  }
  async loadCourse(){if(!this.session||!this.state.courseAvailable)throw Error('Для полного курса нужен отдельный доступ.');const generation=this.generation;const result=await this.request('/course-content');if(generation!==this.generation||!this.session)throw Error('Сессия изменилась. Войди заново.');return result;}
  useCloudCopy(){void this.retry();}
  dispose(){++this.generation;this.listeners.clear();}
}
