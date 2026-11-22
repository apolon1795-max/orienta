import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ProfileSession } from '../services/profileSession';
import { apiBase } from '../services/apiBase';
import type { FreeProgress } from '../services/freeProgress';
import type { CourseEntry } from '../services/courseEntry';
import { ProgressAccess, ProgressAccount } from './ProgressAccount';
import { GuideView } from './GuideView';
import { CampHome } from './CampHome';
import { Button } from './Button';
import { ARCHETYPES, type TestResult, type CourseState } from '../types';
import { allCourseStagesCompleted, courseHasProgress } from '../services/courseNavigation';

type Props = {
 destination: 'inactive' | 'hub' | 'profile' | 'course' | 'resume' | 'profile-card'; local: FreeProgress;
 onCamp: () => void; onCourse: () => void; onMap: () => void; onProfileCard: () => void; onProfile: () => void; onInviteArrival: (learnerId: string) => void;
 onCloudSession: (learnerId?: string) => void; onOpenTest: () => void; onOpenGuide: () => void; onResetLocal: () => void;
};
type CoursePackage = { script: string; css: string; lessons: Window['__ORIENTA_LESSONS'] };

export const ProfileShell = ({ destination, local, onCamp, onCourse, onMap, onProfileCard, onProfile, onInviteArrival, onCloudSession, onOpenGuide, onOpenTest, onResetLocal }: Props) => {
 const base = apiBase(import.meta.env.VITE_PROGRESS_API_URL);
 const client = useMemo(() => new ProfileSession(base), [base]);
 const [state, setState] = useState(client.state);
 const [initializing, setInitializing] = useState(true);
 const [message, setMessage] = useState('');
 const [course, setCourse] = useState<CoursePackage | null>(null);
 const [courseError, setCourseError] = useState('');
 const [courseRetry, setCourseRetry] = useState(0);
 const [guide, setGuide] = useState(false);
 const [transferDismissed, setTransferDismissed] = useState(false);
 const host = useRef<HTMLDivElement>(null);
 const openProtected = ['course','resume','profile-card'].includes(destination);
 const courseHost = openProtected && state.learnerId ? course : null;
 const inviteArrival = state.justJoinedWithInvite === true;

 useEffect(() => {
   let alive = true;
   const stop = client.subscribe(result => setState({ ...result }));
   void client.start({blockingHealth:false}).finally(() => { if (alive) setInitializing(false); });
   return () => { alive = false; stop(); client.dispose(); };
 }, [client]);
 useEffect(() => {
   if (!initializing) onCloudSession(state.status === 'signed-out' ? undefined : state.learnerId);
   if (state.learnerId && inviteArrival) {
     onCloudSession(state.learnerId);
     client.consumeInviteArrival();
     onInviteArrival(state.learnerId);
   }
 }, [client, inviteArrival, onCloudSession, onInviteArrival, initializing, state.learnerId, state.status]);
 useEffect(() => {
   if (!openProtected || !state.learnerId || !state.courseAvailable || state.status !== 'saved' || inviteArrival) {
     setCourse(null); setCourseError(''); return;
   }
   let alive = true;
   setCourseError('');
   void client.loadCourse().then((value: CoursePackage) => {
     if (typeof value.script !== 'string' || typeof value.css !== 'string') throw Error('Некорректный модуль');
     if (alive) setCourse(value);
   }).catch(() => { if (alive) setCourseError('Не удалось открыть курс. Проверь подключение и повтори.'); });
   return () => { alive = false; };
 }, [client, destination, state.learnerId, state.courseAvailable, state.status, inviteArrival, courseRetry, openProtected]);
 useEffect(() => { if (destination !== 'hub') setGuide(false); }, [destination]);

 const leaveCourse = useCallback(() => { onCamp(); void client.retry(); }, [client, onCamp]);
 useEffect(() => {
   if (!courseHost || !host.current) return;
   let stopped = false, cleanup: (() => void) | undefined;
   const url = URL.createObjectURL(new Blob([courseHost.script], { type:'text/javascript' }));
   const style = document.createElement('style'); style.textContent = courseHost.css; document.head.appendChild(style);
   window.__ORIENTA_API = base; window.__ORIENTA_LESSONS = courseHost.lessons;
   const entry: CourseEntry = { session: client.getSessionForCourse(), back: leaveCourse, mode: destination === 'profile-card' ? 'profile-card' : destination === 'resume' ? 'continue' : 'map' };
   void import(/* @vite-ignore */ url).then(mod => {
     if (!stopped && host.current) cleanup = mod.mount(host.current, entry);
   }).catch(() => { if (!stopped) setCourseError('Не удалось открыть модуль. Проверь подключение и повтори.'); });
   return () => { stopped = true; cleanup?.(); URL.revokeObjectURL(url); style.remove(); delete window.__ORIENTA_LESSONS; delete window.__ORIENTA_API; };
 }, [courseHost, base, client, leaveCourse, destination]);

 const onExport = () => {
   const blob = new Blob([JSON.stringify(client.snapshot || local, null, 2)], {type:'application/json'});
   const url = URL.createObjectURL(blob); const a = document.createElement('a');
   a.href = url; a.download = 'Ориента-профиль.json'; a.click(); URL.revokeObjectURL(url);
 };
 if (destination === 'inactive') return null;
 if (initializing || inviteArrival) return <p role="status" className="p-6">Проверяем вход…</p>;
 if (destination !== 'hub' && (!state.learnerId || state.status === 'signed-out')) return <>
   <nav className="profile-route-nav print-hidden" aria-label="Навигация Ориенты"><a href="#hub">Мой лагерь</a></nav>
   <div className="adventure profile-access"><ProgressAccess client={client} state={state} onExport={onExport} hasLocalAnswers={!!local.result} /></div>
 </>;
 if (openProtected && state.courseAvailable && state.learnerId) return <main className="course-entry">
   {state.status === 'offline' ? <section className="max-w-xl mx-auto p-6 space-y-4"><p role="alert">Проверь подключение и повтори.</p><Button onClick={() => { void client.retry(); }}>Повторить</Button><Button variant="secondary" onClick={leaveCourse}>В лагерь</Button></section> : courseError ? <section className="max-w-xl mx-auto p-6 space-y-4"><p role="alert">{courseError}</p><Button onClick={() => setCourseRetry(n => n + 1)}>Повторить</Button><Button variant="secondary" onClick={leaveCourse}>В лагерь</Button></section>
    : !courseHost ? <p role="status" className="p-6">Открываем курс…</p> : null}
   {courseHost && <div ref={host} />}
 </main>;
 const result = client.snapshot?.payload?.state?.testResult as TestResult | undefined;
 const progress = client.snapshot?.payload?.state?.course as CourseState | undefined;
 const savedResult = result && Object.prototype.hasOwnProperty.call(ARCHETYPES, result.scoreType) ? result : null;
 if (guide && savedResult) return <div className="adventure"><GuideView archetype={savedResult.scoreType} onBack={() => setGuide(false)} onStartCourse={() => setGuide(false)} actionLabel="В лагерь" /></div>;
 const canTransfer = state.learnerId && local.result && !result && !transferDismissed
  && (!client.snapshot?.payload?.testDraft?.step || client.snapshot.payload.testDraft.step === 'start');
 return <main className="adventure profile-camp-view">
   {state.learnerId && <ProgressAccount client={client} state={state} onExport={onExport} />}
   <CampHome local={local} savedResult={savedResult} signedIn={!!state.learnerId} courseAvailable={state.courseAvailable} courseStarted={courseHasProgress(progress)} courseComplete={allCourseStagesCompleted(progress)} cardReady={!!savedResult && allCourseStagesCompleted(progress)}
      onMap={onMap} onProfileCard={onProfileCard}
      onCourse={state.learnerId ? onCourse : onProfile} onTest={onOpenTest} onGuide={savedResult ? () => setGuide(true) : onOpenGuide} onReset={onResetLocal}>
      {message && <p role="status">{message}</p>}
      {canTransfer && <details className="rounded-xl border p-4">
        <summary>Сохранить мой результат в профиле</summary>
        <p className="my-3">Подтверди, что это твой результат. Псевдоним, архетип и ход теста сохранятся на сервере Ориенты в России и будут доступны по твоему коду. В Telegram и ИИ они не отправляются. Существующий результат не заменится.</p>
        <div className="flex flex-wrap gap-3"><Button disabled={state.status !== 'saved'} onClick={async () => {
          try { setMessage(''); await client.saveIntro(local); setMessage('Архетип сохранён в профиле.'); }
          catch (error) { setMessage((error as Error).message); }
        }}>Это мой результат, сохранить</Button><Button variant="secondary" onClick={() => setTransferDismissed(true)}>Не переносить</Button></div>
      </details>}
   </CampHome>
 </main>;
};
