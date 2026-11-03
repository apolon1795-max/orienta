import type { CourseState, UserState } from '../types.ts';
import { ARCHETYPES, INITIAL_COURSE_MODULES } from '../types.ts';
import { SPHERES_DATA, VALUES_LIST, QUIZ_DATA, SKILLS_QUESTIONS, CRISIS_QUESTIONS } from '../data/course.ts';
import { normalizeTestDraft, type TestDraft } from './testProgress.ts';

export const LOCAL_STORAGE_KEY = 'appState_ru';
export const GAME_STORAGE_KEY = 'hero_game_progress_v2';
export const createCourseState = (): CourseState => ({
  activeStage: null, completedStages: [], s1CardIndex: 0, s1SelectedSpheres: [],
  s1QuizIndex: 0, s1Phase: 'intro', s1QuizAnswers: [], s1QuizFeedback: null,
  s2Phase: 'intro', s2Values: [], s2Inputs: { s: '', w: '', o: '', t: '', age: '', gift: '' },
  s3Phase: 'intro', s3Thinking: '', s3Team: '', s3Learning: '', s3CrisisIdx: 0,
  s3CrisisAnswers: [], untimed: false,
});
export const createUserState = (): UserState => ({
  schemaVersion: 2, hasOnboarded: false, telegramId: null, firstName: null, username: null,
  testResult: null, courseProgress: INITIAL_COURSE_MODULES.map(m => ({ ...m })),
  course: createCourseState(), aiSummary: null, lastUpdated: 0,
});
const object = (v: unknown): Record<string, any> => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
const text = (v: unknown, max = 1200) => typeof v === 'string' ? v.slice(0, max) : '';
const index = (v: unknown, max: number) => Number.isInteger(v) && Number(v) >= 0 && Number(v) <= max ? Number(v) : 0;
const choices = (v: unknown, allowed: string[], max: number) => Array.isArray(v)
  ? [...new Set(v.filter((x): x is string => typeof x === 'string' && allowed.includes(x)))].slice(0, max) : [];
const phase = <T extends string>(v: unknown, allowed: T[], fallback: T): T => allowed.includes(v as T) ? v as T : fallback;
export const validAge = (value: string) => /^\d{1,3}$/.test(value) && Number(value) >= 6 && Number(value) <= 100;
export const validGift = (value: string) => value.trim().length >= 2 && !/деньг|бабло|рубл|доллар|евро|валют|money|cash/i.test(value);
export const canFinishStage = (c: CourseState, stage: number): boolean => {
  if (stage === 0) return c.s1SelectedSpheres.length >= 1 && c.s1SelectedSpheres.length <= 3 && c.s1QuizAnswers.length === QUIZ_DATA.length;
  if (stage === 1) return ['s', 'w', 'o', 't'].every(k => c.s2Inputs[k as 's'].trim().length >= 2)
    && c.s2Values.length === 5 && validAge(c.s2Inputs.age) && validGift(c.s2Inputs.gift);
  if (stage === 2) return [c.s3Thinking, c.s3Team, c.s3Learning].every(Boolean) && c.s3CrisisAnswers.length === CRISIS_QUESTIONS.length;
  return false;
};
export const normalizeCourseState = (value: unknown): CourseState => {
  const v = object(value), defaults = createCourseState(), inputs = object(v.s2Inputs);
  const c: CourseState = {
    ...defaults,
    s1CardIndex: index(v.s1CardIndex, SPHERES_DATA.length),
    s1SelectedSpheres: choices(v.s1SelectedSpheres, SPHERES_DATA.map(s => s.id), 10),
    s1QuizIndex: index(v.s1QuizIndex, QUIZ_DATA.length - 1),
    s1Phase: phase(v.s1Phase, ['intro', 'tinder', 'filter', 'quiz_intro', 'quiz', 'done'], 'intro'),
    s1QuizAnswers: Array.isArray(v.s1QuizAnswers) ? v.s1QuizAnswers.slice(0, QUIZ_DATA.length).filter((n: unknown) => Number.isInteger(n) && Number(n) >= 0 && Number(n) < 3) : [],
    s1QuizFeedback: typeof v.s1QuizFeedback === 'string' ? text(v.s1QuizFeedback, 100) : null,
    s2Phase: phase(v.s2Phase, ['intro', 'swot1', 'swot2', 'swot3', 'swot4', 'values', 'age', 'gifts', 'done'], 'intro'),
    s2Values: choices(v.s2Values, VALUES_LIST, 5),
    s2Inputs: { s: text(inputs.s), w: text(inputs.w), o: text(inputs.o), t: text(inputs.t), age: text(inputs.age, 3), gift: text(inputs.gift) },
    s3Phase: phase(v.s3Phase, ['intro', 'q1', 'q2', 'q3', 'crisis_intro', 'crisis', 'done'], 'intro'),
    s3Thinking: choices([v.s3Thinking], SKILLS_QUESTIONS[0].opts.map(o => o.type), 1)[0] || '',
    s3Team: choices([v.s3Team], SKILLS_QUESTIONS[1].opts.map(o => o.type), 1)[0] || '',
    s3Learning: choices([v.s3Learning], SKILLS_QUESTIONS[2].opts.map(o => o.type), 1)[0] || '',
    s3CrisisIdx: index(v.s3CrisisIdx, CRISIS_QUESTIONS.length - 1),
    s3CrisisAnswers: Array.isArray(v.s3CrisisAnswers) ? v.s3CrisisAnswers.slice(0, 4).map((a: unknown, i: number) => choices([a], [...CRISIS_QUESTIONS[i].opts.map(o => o.type), 'Без ответа'], 1)[0] || 'Без ответа') : [],
    untimed: v.untimed === true,
  };
  for (let i = 0; i < 3; i++) {
    if (Array.isArray(v.completedStages) && v.completedStages.includes(i) && canFinishStage(c, i) && (i === 0 || c.completedStages.includes(i - 1))) c.completedStages.push(i);
  }
  if (c.s1Phase === 'done' && !canFinishStage(c, 0)) c.s1Phase = 'intro';
  if (c.s2Phase === 'done' && !canFinishStage(c, 1)) c.s2Phase = 'intro';
  if (c.s3Phase === 'done' && !canFinishStage(c, 2)) c.s3Phase = 'intro';
  c.activeStage = Number.isInteger(v.activeStage) && v.activeStage >= 0 && v.activeStage <= c.completedStages.length && v.activeStage <= 3 ? v.activeStage : null;
  return c;
};
export const getCourseXp = (c: CourseState) => c.completedStages.reduce((sum, id) => sum + [40, 40, 20][id], 0)
  + c.s1QuizAnswers.reduce((sum, answer, i) => sum + (answer === QUIZ_DATA[i].correct ? 10 : 0), 0);
export const normalizeUserState = (value: unknown): UserState => {
  const v = object(value), defaults = createUserState(), r = object(v.testResult);
  const course = normalizeCourseState(v.course);
  const key = typeof r.scoreType === 'string' && Object.prototype.hasOwnProperty.call(ARCHETYPES, r.scoreType) ? r.scoreType : '';
  return {
    ...defaults, hasOnboarded: v.hasOnboarded === true,
    telegramId: typeof v.telegramId === 'string' || typeof v.telegramId === 'number' ? v.telegramId : null,
    firstName: text(v.firstName, 100) || null, username: text(v.username, 100) || null,
    testResult: key ? { scoreType: key, title: ARCHETYPES[key].title, description: ARCHETYPES[key].description.join('\n\n'),
      timestamp: text(r.timestamp, 50), heroName: text(r.heroName, 40),
      scores: Object.fromEntries(Object.keys(ARCHETYPES).map(k => [k, index(object(r.scores)[k], 5)])),
      tiedTypes: choices(r.tiedTypes, Object.keys(ARCHETYPES), 4),
    } : null,
    course, courseProgress: INITIAL_COURSE_MODULES.map(m => ({ ...m, isCompleted: course.completedStages.includes(m.id - 1) })),
    aiSummary: text(v.aiSummary, 12000) || null,
    summarySource: v.summarySource === 'ai' ? 'ai' : v.summarySource === 'rules' ? 'rules' : undefined,
    lastUpdated: typeof v.lastUpdated === 'number' && Number.isFinite(v.lastUpdated) ? Math.max(0, v.lastUpdated) : 0,
  };
};
export const readUserState = (storage: Pick<Storage, 'getItem'> & Partial<Pick<Storage, 'setItem'>>): UserState => {
  let raw: string | null = null;
  try { raw = storage.getItem(LOCAL_STORAGE_KEY); return normalizeUserState(JSON.parse(raw || 'null')); }
  catch {
    if (raw) { try { storage.setItem?.(LOCAL_STORAGE_KEY + '_recovery', raw); } catch { /* Keep app usable. */ } }
    return createUserState();
  }
};
export const saveLocalState = (storage: Pick<Storage, 'setItem'>, state: UserState): boolean => {
  try { storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state)); return true; } catch { return false; }
};
export const exportBackup = (state: UserState, testDraft?: TestDraft) => JSON.stringify({ format: 'orienta-backup', version: 2, exportedAt: new Date().toISOString(), state, testDraft }, null, 2);
export const importBackup = (json: string): { state: UserState; testDraft: TestDraft } => {
  if (json.length > 200000) throw new Error('Файл слишком большой. Выбери резервную копию Orienta до 200 КБ.');
  let data;
  try { data = JSON.parse(json); } catch { throw new Error('Не удалось прочитать файл. Нужна резервная копия Orienta в формате JSON.'); }
  if (data?.format !== 'orienta-backup' || data.version !== 2 || !data.state || !data.state.course) throw new Error('Это не резервная копия Orienta версии 2.');
  return { state: { ...normalizeUserState(data.state), lastUpdated: Date.now() }, testDraft: normalizeTestDraft(data.testDraft) };
};
