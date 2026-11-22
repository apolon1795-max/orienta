import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import { partyArt } from '../services/adventureArt';
import { TestView } from './TestView';
import { GuideView } from './GuideView';
import { CampHome } from './CampHome';
import type { TestDraft } from '../services/testProgress';
import type { TestResult } from '../types';
import { freshFreeProgress, readFreeProgress, saveFreeProgress } from '../services/freeProgress';
import { apiBase } from '../services/apiBase';

const ProfileShell = lazy(() => import('./ProfileShell').then(module => ({ default: module.ProfileShell })));
const read = () => {
  try { if (localStorage.getItem('orienta_free_intro_v1')) return readFreeProgress(localStorage); } catch {}
  try { return readFreeProgress(sessionStorage); } catch { return freshFreeProgress(); }
};
type View = 'intro' | 'test' | 'guide' | 'course' | 'hub' | 'profile';
const routeByHash: Partial<Record<string, View>> = { '#free':'intro','#test':'test','#guide':'guide','#course':'course','#hub':'hub','#profile':'profile' };
const hashByRoute: Record<View,string> = { intro:'#free', test:'#test', guide:'#guide', course:'#course', hub:'#hub', profile:'#profile' };
const currentView = (result: boolean) => {
 let rememberedSession = false;
 try { const value = JSON.parse(sessionStorage.getItem('orienta_session_v1') || 'null'); rememberedSession = Number.isFinite(value?.expiresAt) && value.expiresAt > Date.now(); } catch {}
 return routeByHash[location.hash] || (result || rememberedSession ? 'hub' : 'intro');
};

export const FreeEntry = () => {
  const [saved, setSaved] = useState(read);
  const [view, setView] = useState<View>(() => currentView(!!saved.result));
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
    try { persistent = saveFreeProgress(localStorage, saved); } catch {}
    try { saveFreeProgress(sessionStorage, saved); } catch {}
    setStorageFailed(!persistent);
  }, [saved]);
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
  const openIntro = useCallback(() => go('intro', true), [go]);
  const openCourse = useCallback(() => go('course'), [go]);
  const openProfile = useCallback(() => go('profile'), [go]);
  const openTest = useCallback(() => go('test'), [go]);
  const openGuide = useCallback(() => go('guide'), [go]);
  const finished = useCallback((result: TestResult) => { setSaved(s => ({ ...s, result })); openGuide(); }, [openGuide]);
  const clear = () => { setSaved(freshFreeProgress()); setEpoch(e => e + 1); setReset(false); go('intro', true); };
  const configured = !!apiBase(import.meta.env.VITE_PROGRESS_API_URL);
  const profileRoute = view === 'hub' || view === 'profile' || view === 'course';
  const camp = <CampHome local={saved} onCourse={openCourse} onGuide={openGuide} onTest={openTest} onReset={() => setReset(true)} />;

  return <>
    {profileRoute && configured ? <>
      <Suspense fallback={view === 'hub' ? <main className="adventure profile-camp-view">{camp}</main> : <p role="status" className="p-6">Открываем Ориенту…</p>}>
        <ProfileShell destination={view} local={saved} onCamp={openHub} onCourse={openCourse} onProfile={openProfile} onInviteArrival={openIntro} onOpenTest={openTest} onOpenGuide={openGuide} onResetLocal={() => setReset(true)} />
      </Suspense>
    </> : <main className="adventure min-h-screen bg-slate-950 text-slate-100">
      <nav aria-label="Навигация Ориенты" className="adventure-nav max-w-4xl mx-auto flex flex-wrap gap-4 items-center justify-between p-5">
        <button className="font-serif text-amber-200 text-xl" onClick={() => go('intro')}>Ориента</button>
        {view !== 'hub' && <button className="text-sm underline text-amber-200" onClick={openHub}>Мой лагерь</button>}
      </nav>
      {storageFailed && <p role="status" className="px-6 text-amber-200">Не удалось сохранить результат в браузере. Пока не закрывай вкладку.</p>}
      {(view === 'intro' || (view === 'guide' && !saved.result)) && <section className="adventure-intro max-w-2xl mx-auto px-6 py-12 space-y-7">
        <h1 className="text-4xl sm:text-6xl font-serif">Какой ты герой?</h1>
        <img className="adventure-party" src={partyArt} alt="Четыре героя Ориенты: эльфийка, рыцарь, орк и тролль" />
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
      {view === 'guide' && saved.result && <GuideView archetype={saved.result.scoreType} onBack={openHub} onStartCourse={openHub} actionLabel="Вернуться в лагерь" />}
      {view === 'hub' && camp}
      {(view === 'course' || view === 'profile') && !configured && <section className="max-w-xl mx-auto p-6 py-12 space-y-6">
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
