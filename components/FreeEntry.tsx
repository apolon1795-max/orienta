import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import { TestView } from './TestView';
import { GuideView } from './GuideView';
import type { TestDraft } from '../services/testProgress';
import { ARCHETYPES, type TestResult } from '../types';
import { freshFreeProgress, readFreeProgress, saveFreeProgress } from '../services/freeProgress';
import { apiBase } from '../services/apiBase';

const PilotCourse = lazy(() => import('./ProfileShell').then(module => ({ default: module.ProfileShell })));
const read = () => {
  try { if (localStorage.getItem('orienta_free_intro_v1')) return readFreeProgress(localStorage); } catch {}
  try { return readFreeProgress(sessionStorage); } catch { return freshFreeProgress(); }
};
export const FreeEntry = () => {
  const [saved, setSaved] = useState(read);
  const [view, setView] = useState<'intro' | 'test' | 'guide' | 'course' | 'hub' | 'community'>(() => ['#course', '#profile'].includes(location.hash) ? 'course' : saved.result || location.hash === '#hub' ? 'hub' : 'intro');
  const [course, setCourse] = useState(() => ['#course', '#profile'].includes(location.hash));
  const [storageFailed, setStorageFailed] = useState(false);
  const [reset, setReset] = useState(false);
  const resetDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (reset) resetDialog.current?.showModal(); else resetDialog.current?.close(); }, [reset]);
  const [epoch, setEpoch] = useState(0);
  useEffect(() => {
    const changed = () => { setCourse(['#course', '#profile'].includes(location.hash)); setView(['#course', '#profile'].includes(location.hash) ? 'course' : location.hash === '#hub' ? 'hub' : 'intro'); };
    addEventListener('hashchange', changed); return () => removeEventListener('hashchange', changed);
  }, []);
  useEffect(() => {
    let persistent = false;
    try { persistent = saveFreeProgress(localStorage, saved); } catch {}
    try { saveFreeProgress(sessionStorage, saved); } catch {}
    setStorageFailed(!persistent);
  }, [saved]);
  const draftChanged = useCallback((draft: TestDraft) => setSaved(s => ({ ...s, draft })), []);
  const calculated = useCallback((result: TestResult) => setSaved(s => ({ ...s, result })), []);
  const finished = useCallback((result: TestResult) => { setSaved(s => ({ ...s, result })); setView('guide'); }, []);
  const openHub = () => { setView('hub'); if (location.hash !== '#hub') location.hash = 'hub'; };
  const clear = () => { setSaved(freshFreeProgress()); setEpoch(e => e + 1); setReset(false); setView('intro'); if (location.hash) location.hash = 'free'; };
  const configured = !!apiBase(import.meta.env.VITE_PROGRESS_API_URL);
  const existingCourse = import.meta.env.VITE_EXISTING_COURSE_URL === 'https://apolon1795-max-orienta-c425.twc1.net/' ? import.meta.env.VITE_EXISTING_COURSE_URL : ''; 
  if (course && configured) return <>
    <nav className="p-3 bg-slate-950 print-hidden"><a href="#free" className="text-amber-200 underline">← Бесплатная вводная</a><a href="#hub" className="ml-6 text-amber-200 underline">Мой кабинет</a></nav>
    <Suspense fallback={<p role="status" className="p-6">Открываем курс…</p>}><PilotCourse /></Suspense>
  </>;
  return <main className="min-h-screen bg-slate-950 text-slate-100">
    <nav aria-label="Вводная" className="max-w-4xl mx-auto flex flex-wrap gap-4 items-center justify-between p-5">
      <button className="font-serif text-amber-200 text-xl" onClick={() => setView('intro')}>Ориента</button>
      <button className="text-sm underline text-amber-200" onClick={openHub}>Мой кабинет</button>
      {configured && <a href="#profile" className="text-sm underline text-amber-200">Войти в сохраняемый профиль</a>}
      <button className="text-sm underline text-slate-300" onClick={() => setView('course')}>Уже есть доступ к курсу</button>
    </nav>
    {storageFailed && <p role="status" className="px-6 text-amber-200">Не удалось сохранить кабинет в браузере. Пока не закрывай вкладку: после закрытия результат может потеряться.</p>}
    {view === 'intro' && <section className="max-w-2xl mx-auto px-6 py-12 space-y-7">
      <p className="text-amber-300 uppercase tracking-widest text-sm">Бесплатная вводная</p>
      <h1 className="text-4xl sm:text-6xl font-serif">Какой ты герой?</h1>
      <p className="text-xl text-slate-300">Пять игровых ситуаций помогут заметить свои сильные стороны. Выбери персонажа, пройди приключение и узнай свой архетип.</p>
      <p className="text-slate-300">Тест и описание архетипа доступны бесплатно, без регистрации и оплаты. Это повод подумать о себе, а не диагноз или окончательный выбор профессии.</p>
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-2 text-sm text-slate-300">
        <p>Придумай герою псевдоним. Не вводи настоящее имя, школу, телефон и другие личные данные.</p>
        <p>Ответы бесплатного теста не отправляются на наш сервер или в ИИ. Они сохраняются в этом браузере, в том числе после закрытия вкладки. Это не облачный аккаунт: на другом устройстве результата не будет. На общем компьютере удали результат после прохождения.</p>
      </div>
      <Button variant="fantasy" fullWidth onClick={() => setView('test')}>{saved.draft.step === 'start' ? 'Пройти бесплатный тест' : 'Продолжить бесплатный тест'}</Button>
      {saved.result && <Button fullWidth variant="secondary" onClick={() => setView('guide')}>Мой архетип</Button>}
      <button className="text-sm underline text-slate-400" onClick={() => setReset(true)}>Удалить результат вводной</button>
    </section>}
    {view === 'test' && <TestView key={epoch} initialDraft={saved.draft} onDraftChange={draftChanged} onResultCalculated={calculated} onComplete={finished} onCancel={() => setView('intro')} onRequestRestart={() => setReset(true)} />}
    {view === 'guide' && saved.result && <GuideView archetype={saved.result.scoreType} onBack={openHub} onStartCourse={openHub} actionLabel="Перейти в мой кабинет" />}
    {view === 'hub' && <section className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <header><p className="text-amber-300 text-sm uppercase tracking-widest">Твоя Ориента</p><h1 className="text-4xl sm:text-5xl font-semibold mt-3">Мой кабинет</h1><p className="text-slate-300 mt-3">{saved.draft.heroData.name ? `С возвращением, ${saved.draft.heroData.name}.` : 'Здесь начинается твой маршрут.'}</p></header>
      <article className="rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-indigo-950 to-slate-900 p-7 sm:p-10 space-y-5">
        <p className="text-indigo-200 text-sm">{saved.result ? 'Твой архетип' : 'Первый шаг · бесплатно'}</p>
        <h2 className="text-3xl font-semibold text-amber-100">{saved.result ? ARCHETYPES[saved.result.scoreType]?.title : 'Узнай свои сильные стороны'}</h2>
        <p className="text-slate-300 max-w-xl">{saved.result ? 'Результат сохранён в этом браузере. Вернись к гайду, посмотри идеи для профессиональных проб и выбери следующий шаг.' : 'Пройди пять игровых ситуаций. Здесь появятся твой архетип и персональный гайд.'}</p>
        <Button variant="fantasy" onClick={() => setView(saved.result ? 'guide' : 'test')}>{saved.result ? 'Открыть мой гайд' : saved.draft.step === 'start' ? 'Пройти бесплатный тест' : 'Продолжить бесплатный тест'}</Button>
      </article>
      <div className="grid sm:grid-cols-2 gap-5">
        <article className="rounded-2xl border border-slate-700 bg-slate-900 p-7 space-y-4"><p className="text-sm text-amber-200">Следующий шаг</p><h2 className="text-2xl font-semibold">Курс «Ориента»</h2><p className="text-slate-300">Пять этапов: интересы, ценности, навыки и твоя профкарта. Для пилота нужен личный код наставника.</p><Button variant="secondary" onClick={() => setView('course')}>Открыть курс</Button><p className="text-sm text-slate-400">Онлайн-оплата ещё не подключена.</p></article>
        <article className="rounded-2xl border border-slate-700 bg-slate-900 p-7 space-y-4"><p className="text-sm text-indigo-200">Не в одиночку</p><h2 className="text-2xl font-semibold">Сообщество</h2><p className="text-slate-300">Общее пространство участников. Переход в Telegram не отправляет твой результат теста.</p><Button variant="secondary" onClick={() => setView('community')}>Открыть сообщество</Button></article>
      </div>
      <aside className="border-t border-slate-800 pt-6 space-y-3 text-sm text-slate-400"><h2 className="text-base font-semibold text-slate-200">Сохранение на этом устройстве</h2><p>Это браузерный кабинет без регистрации, пароля и синхронизации между устройствами. После очистки данных браузера результат исчезнет. На общем компьютере удали вводную перед уходом.</p><p>Чтобы продолжить с другого устройства, войди в свой профиль по личному коду. После входа можно отдельно подтвердить перенос результата вводной; существующий результат профиля не заменится.</p>{configured && <a href="#profile" className="inline-block underline text-amber-200">Сохранить в моём профиле</a>}<button className="underline text-slate-300" onClick={() => setReset(true)}>Удалить результат вводной</button></aside>
    </section>}
    {view === 'community' && <section className="max-w-xl mx-auto p-6 py-12 space-y-6"><h1 className="text-3xl font-semibold">Сообщество Ориенты</h1><p className="text-slate-300">Общее сообщество участников находится в Telegram. Откроется отдельная вкладка; результаты и ответы не передаются.</p><a className="inline-block rounded-xl bg-indigo-600 px-6 py-4 font-semibold" href="https://t.me/sense_house" target="_blank" rel="noopener noreferrer">Перейти в Telegram</a><div><Button variant="secondary" onClick={openHub}>Вернуться в кабинет</Button></div></section>}
    {view === 'course' && <section className="max-w-xl mx-auto p-6 py-12 space-y-6">
      <h1 className="text-3xl font-serif">Продолжить в полном курсе</h1>
      <p className="text-slate-300">Вводная и твой архетип остаются бесплатными. Дальше: пять этапов, задания и личная профкарта.</p>
      <p className="text-slate-300">Онлайн-оплата пока не подключена. Личный код наставника открывает твой сохраняемый профиль пилота. Сам тест не подтверждает оплату курса.</p>
      {configured || existingCourse ? <a href={configured ? "#course" : existingCourse} className="inline-block rounded-xl bg-amber-600 px-6 py-4 font-bold">Войти по личному коду</a> : <p role="status" className="text-amber-200">Вход в курс пока настраивается. Бесплатный тест уже доступен.</p>}
      <p className="text-sm text-slate-400">После входа можно перенести результат вводной в свой профиль отдельным подтверждением. Уже сохранённые ответы не заменятся.</p>
      <Button variant="secondary" onClick={openHub}>Вернуться в кабинет</Button>
    </section>}
    <dialog ref={resetDialog} onCancel={() => setReset(false)} onClose={() => setReset(false)} aria-labelledby="free-reset-title" className="max-w-md rounded-xl bg-slate-900 text-slate-100 p-6 space-y-4 backdrop:bg-black/80">
      <h2 id="free-reset-title" className="text-xl">Удалить результат бесплатной вводной?</h2><p>Ответы полного курса не изменятся.</p>
      <Button autoFocus variant="secondary" onClick={() => setReset(false)}>Отмена</Button><Button onClick={clear}>Удалить вводную</Button>
    </dialog>
  </main>;
};
