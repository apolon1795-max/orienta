export const TEST_KEY = 'hero_game_progress_v2';
export const TEST_STEPS = ['start', 'create_character_intro', 'choose_character', 'choose_name', 'intro_lore', 'question_1', 'question_2', 'question_3', 'question_4', 'question_5_intro', 'question_5', 'final_scroll', 'result'];
export const SCORE_KEYS = ['Commander', 'Creator', 'Researcher', 'Communicator'];
export interface TestSnapshot { step: string; heroData: { name: string; race: string }; scores: Record<string, number> }
export interface TestDraft extends TestSnapshot { history: TestSnapshot[] }
export const createTestDraft = (): TestDraft => ({ step: 'start', heroData: { name: '', race: '' }, scores: Object.fromEntries(SCORE_KEYS.map(k => [k, 0])), history: [] });
const snapshot = (v: any): TestSnapshot | null => {
  if (!v || !TEST_STEPS.includes(v.step) || typeof v.heroData?.name !== 'string'
    || !['', 'Человек', 'Эльф', 'Орк', 'Тролль'].includes(v.heroData.race)
    || !SCORE_KEYS.every(k => Number.isInteger(v.scores?.[k]) && v.scores[k] >= 0 && v.scores[k] <= 5)) return null;
  const total = SCORE_KEYS.reduce((n, k) => n + v.scores[k], 0);
  const expected: Record<string, number> = { question_1: 0, question_2: 1, question_3: 2, question_4: 3, question_5_intro: 4, question_5: 4, final_scroll: 5, result: 5 };
  if (total > 5 || (v.step in expected && total !== expected[v.step])) return null;
  return { step: v.step, heroData: { name: v.heroData.name.slice(0, 40), race: v.heroData.race }, scores: Object.fromEntries(SCORE_KEYS.map(k => [k, v.scores[k]])) };
};
export const normalizeTestDraft = (value: unknown): TestDraft => {
  const v = value as any, current = snapshot(v);
  if (!current) return createTestDraft();
  return { ...current, history: Array.isArray(v.history) ? v.history.slice(0, 20).map(snapshot).filter((s: TestSnapshot | null): s is TestSnapshot => s !== null) : [] };
};
export const readTestDraft = (storage: Pick<Storage, 'getItem'>): TestDraft => {
  try { return normalizeTestDraft(JSON.parse(storage.getItem(TEST_KEY) || 'null')); } catch { return createTestDraft(); }
};
export const getTestWinners = (scores: Record<string, number>) => {
  const maximum = Math.max(...SCORE_KEYS.map(k => scores[k] || 0));
  return SCORE_KEYS.filter(k => (scores[k] || 0) === maximum);
};
