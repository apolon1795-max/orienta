import React, { useState } from 'react';
const videos = [import.meta.env.VITE_LESSON_1_VIDEO, import.meta.env.VITE_LESSON_2_VIDEO, import.meta.env.VITE_LESSON_3_VIDEO, import.meta.env.VITE_LESSON_4_VIDEO, import.meta.env.VITE_LESSON_5_VIDEO];
const captions = [import.meta.env.VITE_LESSON_1_CAPTIONS, import.meta.env.VITE_LESSON_2_CAPTIONS, import.meta.env.VITE_LESSON_3_CAPTIONS, import.meta.env.VITE_LESSON_4_CAPTIONS, import.meta.env.VITE_LESSON_5_CAPTIONS];
export const LessonMedia = ({ stage }: { stage: number }) => {
  const [failed, setFailed] = useState(false);
  const source = videos[stage - 1], caption = captions[stage - 1];
  if (!source) return null;
  let safe = false;
  try { const url = new URL(source, window.location.href); safe = ['https:', 'http:'].includes(url.protocol); } catch { /* Keep instructions available. */ }
  if (!safe || failed) return <p role="status" className="text-amber-200 mb-6">Видео не загрузилось. Можно выполнить задание по текстовой инструкции ниже.</p>;
  return <video controls playsInline preload="metadata" onError={() => setFailed(true)} aria-label={`Видеоурок ${stage}`} className="w-full max-w-xl rounded-xl mb-6">
    <source src={source} />
    {caption && <track src={caption} kind="captions" srcLang="ru" label="Русские субтитры" default />}
    Браузер не поддерживает видео. Выполни задание по инструкции.
  </video>;
};
