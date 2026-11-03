import React, { useEffect, useId, useRef, useState } from 'react';
import type { LessonProgress } from '../types';
import { lessonSource, playbackTime, updateLesson } from '../services/lessonProgress';
import { loadKinescope, type KinescopePlayer, type KinescopeEvent } from '../services/kinescope';

const videos = [import.meta.env.VITE_LESSON_1_VIDEO, import.meta.env.VITE_LESSON_2_VIDEO, import.meta.env.VITE_LESSON_3_VIDEO, import.meta.env.VITE_LESSON_4_VIDEO, import.meta.env.VITE_LESSON_5_VIDEO];
const captions = [import.meta.env.VITE_LESSON_1_CAPTIONS, import.meta.env.VITE_LESSON_2_CAPTIONS, import.meta.env.VITE_LESSON_3_CAPTIONS, import.meta.env.VITE_LESSON_4_CAPTIONS, import.meta.env.VITE_LESSON_5_CAPTIONS];
export const lessonConfigured = (stage: number) => !!videos[stage - 1];
export const currentLessonProgress = (stage: number, progress?: LessonProgress) => progress?.source === lessonSource(videos[stage - 1], window.location.href)?.id ? progress : undefined;

export const LessonMedia = ({ stage, progress, onProgress }: { stage: number; progress?: LessonProgress; onProgress: (progress: LessonProgress) => void }) => {
  const sourceValue = videos[stage - 1], source = lessonSource(sourceValue, window.location.href), caption = captions[stage - 1];
  const [failed, setFailed] = useState(false), [attempt, setAttempt] = useState(0);
  const container = useRef<HTMLDivElement>(null), id = useId().replace(/:/g, '');
  const value = useRef(progress), notify = useRef(onProgress);
  value.current = progress; notify.current = onProgress;
  const observation = useRef({ position: progress && progress.source === source?.id ? progress.position : 0, duration: progress && progress.source === source?.id ? progress.duration : 0, ended: false });
  const lastCommit = useRef(0);
  const commit = (force = false) => {
    if (!source || (!force && Date.now() - lastCommit.current < 15000)) return;
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
    if (source?.kind !== 'kinescope' || !container.current) return;
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
      return factory.create(host.id, { url: source.url, size: { width: '100%', height: '100%' }, behavior: { localStorage: false, autoPlay: false, playsInline: true } });
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
  }, [source?.id, attempt, id]);
  if (!sourceValue) return null;
  const saved = progress?.source === source?.id ? progress : undefined;
  return <details open className="max-w-2xl mx-auto px-6 mt-6 print-hidden">
    <summary className="cursor-pointer text-slate-200 mb-3">Видеоурок {stage}{saved?.completed ? ' · видео завершено' : saved?.position ? ` · ${playbackTime(saved.position)}${saved.duration ? ' из ' + playbackTime(saved.duration) : ''}` : ''}</summary>
    {!source || failed ? <div role="status" className="rounded-xl border border-amber-700 bg-slate-900 p-4 text-amber-200">
      <p>Видео не загрузилось. Ответы сохраняются; можно выполнить задание по текстовой инструкции.</p>
      {source && <button type="button" className="underline mt-2" onClick={() => { setFailed(false); setAttempt(n => n + 1); }}>Попробовать загрузить видео</button>}
    </div> : source.kind === 'kinescope' ? <div ref={container} className="lesson-player aspect-video relative rounded-xl overflow-hidden bg-slate-900" aria-label={`Видеоурок ${stage}`} /> : <video key={source.id + attempt} controls playsInline preload="metadata" aria-label={`Видеоурок ${stage}`} className="w-full rounded-xl"
      onError={() => setFailed(true)} onLoadedMetadata={event => {
        const video = event.currentTarget; observation.current.duration = video.duration;
        if (saved && !saved.completed) video.currentTime = Math.min(saved.position, Math.max(0, video.duration - 1));
      }} onTimeUpdate={event => { observation.current.position = event.currentTarget.currentTime; commitRef.current(); }}
      onPause={() => commitRef.current(true)} onEnded={event => { observation.current.position = event.currentTarget.duration; observation.current.ended = true; commitRef.current(true); }}>
      <source src={source.url} />{caption && <track src={caption} kind="captions" srcLang="ru" label="Русские субтитры" default />}
    </video>}
    <p className="text-xs text-slate-400 mt-2">Место просмотра запоминается. Задания этапа выполняются отдельно.</p>
  </details>;
};
