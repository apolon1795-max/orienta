import type { LessonProgress } from '../types.ts';

export type LessonSource = { kind: 'kinescope' | 'video'; url: string; id: string };
export const lessonSource = (value: string | undefined, base = 'https://orienta.invalid/'): LessonSource | null => {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value, base);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    if (url.hostname === 'kinescope.io' || url.hostname === 'www.kinescope.io') {
      const parts = url.pathname.split('/').filter(Boolean);
      const id = parts[0] === 'embed' ? parts[1] : parts[0];
      if (!id || !/^[A-Za-z0-9_-]{8,80}$/.test(id) || parts.length !== (parts[0] === 'embed' ? 2 : 1)) return null;
      return { kind: 'kinescope', url: `https://kinescope.io/${id}`, id: `kinescope:${id}` };
    }
    if (!/\.(mp4|webm|ogg|m4v)$/i.test(url.pathname)) return null;
    return { kind: 'video', url: url.href, id: url.origin + url.pathname };
  } catch { return null; }
};
export const normalizeLesson = (value: unknown): LessonProgress | null => {
  const v = value as Partial<LessonProgress> | null;
  if (!v || typeof v.source !== 'string' || !v.source || v.source.length > 1000) return null;
  const seconds = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.min(86400, n) : 0;
  const duration = seconds(v.duration);
  return { source: v.source, duration, position: Math.min(seconds(v.position), duration || 86400),
    completed: v.completed === true, updatedAt: typeof v.updatedAt === 'number' && Number.isFinite(v.updatedAt) ? Math.max(0, v.updatedAt) : 0 };
};
export const normalizeLessons = (value: unknown): Record<string, LessonProgress> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries([1, 2, 3, 4, 5].flatMap(stage => {
    const progress = normalizeLesson((value as Record<string, unknown>)[stage]);
    return progress ? [[String(stage), progress]] : [];
  }));
};
export const updateLesson = (previous: LessonProgress | undefined, source: string, position: number, duration: number, ended = false): LessonProgress => {
  const same = previous?.source === source;
  return normalizeLesson({ source, position, duration, completed: ended || (same && previous.completed), updatedAt: Date.now() })!;
};
export const playbackTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
