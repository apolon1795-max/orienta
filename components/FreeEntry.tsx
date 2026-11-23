import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import { partyArt } from '../services/adventureArt';
import { TestView } from './TestView';
import { GuideView } from './GuideView';
import { CampHome } from './CampHome';
import type { TestDraft } from '../services/testProgress';
import type { TestResult } from '../types';
import { FREE_INTRO_KEY, freshFreeProgress, readFreeProgress, saveFreeProgress } from '../services/freeProgress';
import { apiBase } from '../services/apiBase';

const ProfileShell = lazy(() => import('./ProfileShell').then(module => ({ default: module.ProfileShell })));
const keyFor = (owner: string | null) => owner ? `${FREE_INTRO_KEY}:${owner}` : FREE_INTRO_KEY;
const draftExists = (owner: string) => {
 for (const name of ['localStorage','sessionStorage'] as const) {
   try { if (window[name].getItem(keyFor(owner))) return true; } catch {}
 }
 return false;
};
const read = (owner: string | null = null) => {
 const key = keyFor(owner);
 try { if (localStorage.getItem(key)) return readFreeProgress({getItem:()=>localStorage.getItem(key)}); } catch {}
 try { return readFreeProgress({getItem:()=>sessionStorage.getItem(key)}); } catch { return freshFreeProgress(); }
};
type MemberView = 'course' | 'resume' | 'profile-card' | 'hub' | 'profile';
type View = 'intro' | 'test' | 'guide' | MemberView;
const routeByHash: Partial<Record<string, View>> = { '#free':'intro','#test':'test','#guide':'guide','#course':'course','#resume':'resume','#profile-card':'profile-card','#hub':'hub','#profile':'profile' };
const hashByRoute: Record<View,string> = { intro:'#free', test:'#test', guide:'#guide', course:'#course', resume:'#resume', 'profile-card':'#profile-card', hub:'#hub', profile:'#profile' };
const hasRememberedSession = () => {
 try { const value = JSON.parse(sessionStorage.getItem('orienta_session_v1') || 'null'); return /^[A-Za-z0-9_-]{43}$/.test(value?.token) && /^[a-f0-9-]{36}$/.test(value?.learnerId) && Number.isFinite(value?.expiresAt) && value.expiresAt > Date.now(); } catch { return false; }
};
const currentView = (result: boolean) => routeByHash[location.hash] || (result || hasRememberedSession() ? 'hub' : 'intro');

export const FreeEntry = () => {
  const [saved, setSaved] = useState(() => read());
  const [draftOwner, setDraftOwner] = useState<string | null>(null);
  const ownerRef = useRef<string | null>(null);
  const chooseDraftOwner = useCallback((owner: string | null) => {
    if (ownerRef.current === owner) return;
    ownerRef.current = owner; setDraftOwner(owner); setSaved(read(owner));
  }, []);
  const [view, setView] = useState<View>(() => currentView(!!saved.result));
  const [hasCloudSession, setHasCloudSession] = useState(hasRememberedSession);
  const [storageFailed, setStorageFailed] = useState(false);
  const [reset, setReset] = useState(false);
  const resetDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (reset) resetDialog.current?.showModal(); else resetDialog.current?.close(); }, [reset]);
  const [epoch, setEpoch] = useState(0);
  const hasResult = useRef(!!saved.result); hasResult.current = !!saved.result;
  useEffect(() => {
    const changed = () => setView(currentView(hasResult.current));
    addEventListener('hashchange', changed); return () => removeEventListener('hashchange', changed);
  }, []);
  useEffect(() => { if (typeof window !== 'undefined') window.scrollTo(0, 0); }, [view]);
  useEffect(() => {
    let persistent = false;
    const key = keyFor(draftOwner);
    try { persistent = saveFreeProgress({setItem:(_,data)=>localStorage.setItem(key,data)}, saved); } catch {}
    try { saveFreeProgress({setItem:(_,data)=>sessionStorage.setItem(key,data)}, saved); } catch {}
    setStorageFailed(!persistent);
  }, [saved, draftOwner]);
  const draftChanged = useCallback((draft: TestDraft) => setSaved(s => ({ ...s, draft })), []);
  const calculated = useCallback((result: TestResult) => setSaved(s => ({ ...s, result })), []);
  const go = useCallback((next: View, replace = false) => {
    setView(next);
    const hash = hashByRoute[next];
    if (location.hash !== hash) {
      if (replace) history.replaceState(null, '', hash);
      else location.hash = hash;
    }
  }, []);
  const openHub = useCallback(() => go('hub'), [go]);
  const cloudSession = useCallback((learnerId?: string) => {
    setHasCloudSession(!!learnerId);
    chooseDraftOwner(learnerId && (ownerRef.current === learnerId || draftExists(learnerId)) ? learnerId : null);
  }, [chooseDraftOwner]);
  const inviteArrival = useCallback((learnerId: string) => {
    chooseDraftOwner(learnerId); go('intro', true);
  }, [chooseDraftOwner, go]);
  const openCourse = useCallback(() => go('course'), [go]);
  const openProfileCard = useCallback(() => go('profile-card'), [go]);
  const openProfile = useCallback(() => go('profile'), [go]);
  const openTest = useCallback(() => go('test'), [go]);
  const openGuide = useCallback(() => go('guide'), [go]);
  const finished = useCallback((result: TestResult) => { setSaved(s => ({ ...s, result })); openGuide(); }, [openGuide]);
  const clear = () => { setSaved(freshFreeProgress()); setEpoch(e => e + 1); setReset(false); go('intro', true); };
  const showGuide = view === 'guide' && !!saved.result;
  const configured = !!apiBase(import.meta.env.VITE_PROGRESS_API_URL);
  const profileRoute = configured && (['profile','course','resume','profile-card'].includes(view) || (view === 'hub' && hasCloudSession));
  const mountProfile = configured && (profileRoute || hasCloudSession);
  const camp = <CampHome local={saved} onCourse={openCourse} onGuide={openGuide} onTest={openTest} onReset={() => setReset(true)} />;

  return <>
    {mountProfile && <Suspense fallback={profileRoute && <p role="status" className="p-6">Открываем Ориенту…</p>}>
      <ProfileShell destination={profileRoute ? view as MemberView : 'inactive'} local={saved} onCamp={openHub} onCourse={openCourse} onProfileCard={openProfileCard} onInviteArrival={inviteArrival} onCloudSession={cloudSession} onOpenTest={openTest} onOpenGuide={openGuide} onResetLocal={() => setReset(true)} />
    </Suspense>}
    {!profileRoute && <main className="adventure min-h-screen bg-slate-950 text-slate-100">
      <nav aria-label="Навигация Ориенты" className="adventure-nav max-w-4xl mx-auto flex flex-wrap gap-4 items-center justify-between p-5">
        <button className="font-serif text-amber-200 text-xl" onClick={() => go('intro')}>Ориента</button>
        {view !== 'hub' && !showGuide && <button className="text-sm underline text-amber-200" onClick={openHub}>Мой лагерь</button>}
      </nav>
      {storageFailed && <p role="status" className="px-6 text-amber-200">Не удалось сохранить результат в браузере. Пока не закрывай вкладку.</p>}
      {(view === 'intro' || (view === 'guide' && !showGuide)) && <section className="adventure-intro max-w-2xl mx-auto px-6 py-12 space-y-7">
        <h1 className="text-4xl sm:text-6xl font-serif">Какой ты герой?</h1>
        <img className="adventure-party" src={partyArt} width={1152} height={768} fetchPriority="high" alt="Четыре героя Ориенты: эльфийка, рыцарь, орк и тролль" />
        <p className="text-xl">Пять игровых ситуаций помогут заметить свои сильные стороны. Выбери персонажа, пройди приключение и узнай свой архетип.</p>
        <p>Тест и описание архетипа доступны бесплатно, без регистрации и оплаты. Это повод подумать о себе, а не диагноз или окончательный выбор профессии.</p>
        <Button variant="fantasy" fullWidth onClick={openTest}>{saved.draft.step === 'start' || saved.result ? 'Пройти тест' : 'Продолжить тест'}</Button>
        {configured && <Button variant="secondary" fullWidth onClick={openProfile}>У меня есть код</Button>}
        <details className="rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-2 text-sm">
          <summary className="font-semibold cursor-pointer">Перед началом: имя и сохранение</summary>
          <p>Придумай герою псевдоним. Не вводи настоящее имя, школу, телефон и другие личные данные.</p>
          <p>Ответы теста не отправляются на наш сервер или в ИИ. Они сохраняются в этом браузере, в том числе после закрытия вкладки. На общем компьютере удали результат после прохождения.</p>
        </details>
      </section>}
      {view === 'test' && <TestView key={epoch} initialDraft={saved.draft} onDraftChange={draftChanged} onResultCalculated={calculated} onComplete={finished} onOpenCamp={openHub} onCancel={openHub} onRequestRestart={() => setReset(true)} />}
      {showGuide && saved.result && <GuideView archetype={saved.result.scoreType} onBack={openHub} onStartCourse={openHub} actionLabel="В лагерь" />}
      {view === 'hub' && camp}
      {(['course','resume','profile-card','profile'].includes(view)) && !configured && <section className="max-w-xl mx-auto p-6 py-12 space-y-6">
        <h1>Курс «Ориента»</h1><p role="status">Вход в курс пока настраивается. Тест уже доступен.</p>
        <Button variant="secondary" onClick={openHub}>Вернуться в лагерь</Button>
      </section>}
    </main>}
    <dialog ref={resetDialog} onCancel={() => setReset(false)} onClose={() => setReset(false)} aria-labelledby="free-reset-title" className="max-w-md rounded-xl bg-slate-900 text-slate-100 p-6 space-y-4 backdrop:bg-black/80">
      <h2 id="free-reset-title" className="text-xl">Удалить сохранённый здесь результат теста?</h2><p>Ответы полного курса не изменятся.</p>
      <Button autoFocus variant="secondary" onClick={() => setReset(false)}>Отмена</Button><Button onClick={clear}>Удалить результат</Button>
    </dialog>
  </>;
};
