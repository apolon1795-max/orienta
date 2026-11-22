import React, { useEffect, useId, useRef, useState } from 'react';
import type { LessonProgress } from '../types';
import { lessonSource, playbackTime, updateLesson } from '../services/lessonProgress';
import { loadKinescope, type KinescopePlayer, type KinescopeEvent } from '../services/kinescope';

const welcome = () => window.__ORIENTA_LESSONS?.[5];
const videos = Array.from({length:5},(_,index)=>window.__ORIENTA_LESSONS?.[index]?.video || '');
const captions = Array.from({length:5},(_,index)=>window.__ORIENTA_LESSONS?.[index]?.captions || '');
export const lessonConfigured = (stage: number) => !!videos[stage - 1];
export const currentLessonProgress = (stage: number, progress?: LessonProgress) => progress?.source === lessonSource(videos[stage - 1], window.location.href)?.id ? progress : undefined;

export const LessonMedia = ({ stage, progress, onProgress }: { stage?: number; progress?: LessonProgress; onProgress?: (progress: LessonProgress) => void }) => {
  const isWelcome = stage === undefined;
  const title = isWelcome ? 'Приветственное видео' : `Видеоурок ${stage}`;
  const sourceValue = isWelcome ? welcome()?.video : videos[stage - 1];
  const source = lessonSource(sourceValue, window.location.href);
  const caption = isWelcome ? welcome()?.captions : captions[stage - 1];
  const [opened, setOpened] = useState(!isWelcome);
  const [failed, setFailed] = useState(false), [attempt, setAttempt] = useState(0);
  const container = useRef<HTMLDivElement>(null), id = useId().replace(/:/g, '');
  const value = useRef(progress), notify = useRef(onProgress);
  value.current = progress; notify.current = onProgress;
  const observation = useRef({ position: progress && progress.source === source?.id ? progress.position : 0, duration: progress && progress.source === source?.id ? progress.duration : 0, ended: false });
  const lastCommit = useRef(0);
  const commit = (force = false) => {
    if (!source || !notify.current || (!force && Date.now() - lastCommit.current < 15000)) return;
    const p = observation.current;
    if (!p.duration && !p.position) return;
    const next = updateLesson(value.current, source.id, p.position, p.duration, p.ended);
    if (value.current?.source === next.source && value.current.position === next.position && value.current.duration === next.duration && value.current.completed === next.completed) return;
    lastCommit.current = Date.now(); value.current = next; notify.current(next);
  };
  const commitRef = useRef(commit); commitRef.current = commit;
  useEffect(() => {
    const flush = () => commitRef.current(true);
    const hidden = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', hidden);
    return () => { flush(); window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', hidden); };
  }, []);
  useEffect(() => {
    if (!opened || source?.kind !== 'kinescope' || !container.current) return;
    let cancelled = false, player: KinescopePlayer | undefined, resumed = false;
    const host = document.createElement('div'); host.id = `lesson-${id}-${attempt}`;
    container.current.appendChild(host);
    const subscriptions: [string, (event: KinescopeEvent) => void][] = [];
    const observe = async (ended = false) => {
      if (!player || cancelled) return;
      try {
        const [position, duration] = await Promise.all([player.getCurrentTime(), player.getDuration()]);
        if (cancelled) return;
        observation.current = { position, duration, ended }; commitRef.current(true);
      } catch { /* The last TimeUpdate remains available during teardown. */ }
    };
    const resume = async () => {
      if (!player || resumed || cancelled) return;
      resumed = true;
      const saved = value.current;
      try {
        const duration = await player.getDuration();
        if (cancelled) return;
        if (!duration) { resumed = false; return; }
        observation.current.duration = duration;
        if (saved?.source === source.id && saved.position > 0 && !saved.completed) await player.seekTo(Math.min(saved.position, Math.max(0, duration - 1)));
      } catch { resumed = false; }
    };
    loadKinescope().then(factory => {
      if (cancelled) return null;
      // The two new domain-bound assets use the official embedding endpoint directly.
      // Do not nest the Kinescope watch page inside the player on their restricted origin.
      const playerUrl = stage === 1 || isWelcome ? source.url.replace('https://kinescope.io/', 'https://kinescope.io/embed/') : source.url;
      return factory.create(host.id, { url: playerUrl, size: { width: '100%', height: '100%' }, behavior: { localStorage: false, autoPlay: false, playsInline: true } });
    }).then(created => {
      if (!created) return;
      if (cancelled) { void created.destroy().catch(() => {}); return; }
      player = created;
      const on = (name: string, callback: (event: KinescopeEvent) => void) => { const type = created.Events[name]; created.on(type, callback); subscriptions.push([type, callback]); };
      on('Loaded', () => { void resume(); });
      on('TimeUpdate', event => { if (typeof event.data?.currentTime === 'number') observation.current.position = event.data.currentTime; commitRef.current(); });
      on('DurationChange', event => { if (typeof event.data?.duration === 'number') observation.current.duration = event.data.duration; });
      on('Pause', () => { void observe(); }); on('Ended', () => { void observe(true); });
      on('Error', () => setFailed(true)); void resume();
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => {
      cancelled = true; commitRef.current(true);
      subscriptions.forEach(([type, callback]) => player?.off(type, callback));
      if (player) void player.destroy().catch(() => {}); else host.remove();
    };
  }, [source?.id, attempt, id, opened, stage, isWelcome]);
  if (!sourceValue) return null;
  const saved = progress?.source === source?.id ? progress : undefined;
  return <details open={opened} onToggle={event => { if (isWelcome) setOpened(event.currentTarget.open); }} className={`max-w-2xl mx-auto px-6 mt-6 print-hidden${isWelcome ? ' welcome-media' : ''}`}>
    <summary className="cursor-pointer text-slate-200 mb-3">{title}{saved?.completed ? ' · видео завершено' : saved?.position ? ` · ${playbackTime(saved.position)}${saved.duration ? ' из ' + playbackTime(saved.duration) : ''}` : ''}</summary>
    {(!isWelcome || opened) && (!source || failed ? <div role="status" className="rounded-xl border border-amber-700 bg-slate-900 p-4 text-amber-200">
      <p>{isWelcome ? 'Видео не загрузилось. Можно сразу перейти к первому этапу на карте.' : 'Видео не загрузилось. Ответы сохраняются; можно выполнить задание по текстовой инструкции.'}</p>
      {source && <button type="button" className="underline mt-2" onClick={() => { setFailed(false); setAttempt(n => n + 1); }}>Попробовать загрузить видео</button>}
    </div> : source.kind === 'kinescope' ? <div ref={container} className="lesson-player aspect-video relative rounded-xl overflow-hidden bg-slate-900" aria-label={title} /> : <video key={source.id + attempt} controls playsInline preload="metadata" aria-label={title} className="w-full rounded-xl lesson-native"
      onError={() => setFailed(true)} onLoadedMetadata={event => {
        const video = event.currentTarget; observation.current.duration = video.duration;
        if (saved && !saved.completed) video.currentTime = Math.min(saved.position, Math.max(0, video.duration - 1));
      }} onTimeUpdate={event => { observation.current.position = event.currentTarget.currentTime; commitRef.current(); }}
      onPause={() => commitRef.current(true)} onEnded={event => { observation.current.position = event.currentTarget.duration; observation.current.ended = true; commitRef.current(true); }}>
      <source src={source.url} />{caption && <track src={caption} kind="captions" srcLang="ru" label="Русские субтитры" default />}
    </video>)}
    {!isWelcome && <p className="text-xs text-slate-400 mt-2">Место просмотра запоминается. Задания этапа выполняются отдельно.</p>}
  </details>;
};
