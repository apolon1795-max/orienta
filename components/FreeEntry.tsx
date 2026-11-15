import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import { TestView } from './TestView';
import { GuideView } from './GuideView';
import type { TestDraft } from '../services/testProgress';
import type { TestResult } from '../types';
import { freshFreeProgress, readFreeProgress, saveFreeProgress } from '../services/freeProgress';
import { apiBase } from '../services/apiBase';

const PilotCourse = lazy(() => import('../App'));
const read = () => { try { return readFreeProgress(sessionStorage); } catch { return freshFreeProgress(); } };
export const FreeEntry = () => {
  const [saved, setSaved] = useState(read);
  const [view, setView] = useState<'intro' | 'test' | 'guide' | 'course'>('intro');
  const [course, setCourse] = useState(() => location.hash === '#course');
  const [storageFailed, setStorageFailed] = useState(false);
  const [reset, setReset] = useState(false);
  const resetDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (reset) resetDialog.current?.showModal(); else resetDialog.current?.close(); }, [reset]);
  const [epoch, setEpoch] = useState(0);
  useEffect(() => {
    const changed = () => { setCourse(location.hash === '#course'); if (location.hash !== '#course') setView('intro'); };
    addEventListener('hashchange', changed); return () => removeEventListener('hashchange', changed);
  }, []);
  useEffect(() => {
    try { setStorageFailed(!saveFreeProgress(sessionStorage, saved)); } catch { setStorageFailed(true); }
  }, [saved]);
  const draftChanged = useCallback((draft: TestDraft) => setSaved(s => ({ ...s, draft })), []);
  const calculated = useCallback((result: TestResult) => setSaved(s => ({ ...s, result })), []);
  const finished = useCallback((result: TestResult) => { setSaved(s => ({ ...s, result })); setView('guide'); }, []);
  const clear = () => { setSaved(freshFreeProgress()); setEpoch(e => e + 1); setReset(false); setView('intro'); };
  const configured = !!apiBase(import.meta.env.VITE_PROGRESS_API_URL);
  const existingCourse = import.meta.env.VITE_EXISTING_COURSE_URL === 'https://apolon1795-max-orienta-c425.twc1.net/' ? import.meta.env.VITE_EXISTING_COURSE_URL : ''; 
  if (course && configured) return <>
    <nav className="p-3 bg-slate-950 print-hidden"><a href="#free" className="text-amber-200 underline">← Бесплатная вводная</a></nav>
    <Suspense fallback={<p role="status" className="p-6">Открываем курс…</p>}><PilotCourse /></Suspense>
  </>;
  return <main className="min-h-screen bg-slate-950 text-slate-100">
    <nav aria-label="Вводная" className="max-w-4xl mx-auto flex flex-wrap gap-4 items-center justify-between p-5">
      <button className="font-serif text-amber-200 text-xl" onClick={() => setView('intro')}>Ориента</button>
      <button className="text-sm underline text-slate-300" onClick={() => setView('course')}>Уже есть доступ к курсу</button>
    </nav>
    {storageFailed && <p role="status" className="px-6 text-amber-200">Браузер не сохраняет результат. Не закрывай эту вкладку до завершения.</p>}
    {view === 'intro' && <section className="max-w-2xl mx-auto px-6 py-12 space-y-7">
      <p className="text-amber-300 uppercase tracking-widest text-sm">Бесплатная вводная</p>
      <h1 className="text-4xl sm:text-6xl font-serif">Какой ты герой?</h1>
      <p className="text-xl text-slate-300">Пять игровых ситуаций помогут заметить свои сильные стороны. Выбери персонажа, пройди приключение и узнай свой архетип.</p>
      <p className="text-slate-300">Тест и описание архетипа доступны бесплатно, без регистрации и оплаты. Это повод подумать о себе, а не диагноз или окончательный выбор профессии.</p>
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-2 text-sm text-slate-300">
        <p>Придумай герою псевдоним. Не вводи настоящее имя, школу, телефон и другие личные данные.</p>
        <p>Ответы бесплатного теста не отправляются на наш сервер или в ИИ. Они сохраняются только в этой вкладке. На общем компьютере удали результат после прохождения.</p>
      </div>
      <Button variant="fantasy" fullWidth onClick={() => setView('test')}>{saved.draft.step === 'start' ? 'Пройти бесплатный тест' : 'Продолжить бесплатный тест'}</Button>
      {saved.result && <Button fullWidth variant="secondary" onClick={() => setView('guide')}>Мой архетип</Button>}
      <button className="text-sm underline text-slate-400" onClick={() => setReset(true)}>Удалить результат вводной</button>
    </section>}
    {view === 'test' && <TestView key={epoch} initialDraft={saved.draft} onDraftChange={draftChanged} onResultCalculated={calculated} onComplete={finished} onCancel={() => setView('intro')} onRequestRestart={() => setReset(true)} />}
    {view === 'guide' && saved.result && <GuideView archetype={saved.result.scoreType} onBack={() => setView('intro')} onStartCourse={() => setView('course')} />}
    {view === 'course' && <section className="max-w-xl mx-auto p-6 py-12 space-y-6">
      <h1 className="text-3xl font-serif">Продолжить в полном курсе</h1>
      <p className="text-slate-300">Вводная и твой архетип остаются бесплатными. Дальше: пять этапов, задания и личная профкарта.</p>
      <p className="text-slate-300">Онлайн-оплата пока не подключена. Если наставник уже выдал тебе личный код для пилота, войди с ним. Сам тест не открывает полный курс.</p>
      {configured || existingCourse ? <a href={configured ? "#course" : existingCourse} className="inline-block rounded-xl bg-amber-600 px-6 py-4 font-bold">Войти по личному коду</a> : <p role="status" className="text-amber-200">Вход в курс пока настраивается. Бесплатный тест уже доступен.</p>}
      <p className="text-sm text-slate-400">Вводная и учебный профиль хранятся раздельно. Вход не заменит уже сохранённые ответы курса.</p>
      <Button variant="secondary" onClick={() => setView(saved.result ? 'guide' : 'intro')}>Вернуться к вводной</Button>
    </section>}
    <dialog ref={resetDialog} onCancel={() => setReset(false)} onClose={() => setReset(false)} aria-labelledby="free-reset-title" className="max-w-md rounded-xl bg-slate-900 text-slate-100 p-6 space-y-4 backdrop:bg-black/80">
      <h2 id="free-reset-title" className="text-xl">Удалить результат бесплатной вводной?</h2><p>Ответы полного курса не изменятся.</p>
      <Button autoFocus variant="secondary" onClick={() => setReset(false)}>Отмена</Button><Button onClick={clear}>Удалить вводную</Button>
    </dialog>
  </main>;
};
