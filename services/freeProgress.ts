import { createTestDraft, normalizeTestDraft, type TestDraft } from './testProgress.ts';
import { ARCHETYPES, type TestResult } from '../types.ts';
export const FREE_INTRO_KEY = 'orienta_free_intro_v1';
export interface FreeProgress { draft: TestDraft; result: TestResult | null }
export const freshFreeProgress = (): FreeProgress => ({ draft: createTestDraft(), result: null });
export const readFreeProgress = (storage: Pick<Storage, 'getItem'>): FreeProgress => {
  try {
    const saved = JSON.parse(storage.getItem(FREE_INTRO_KEY) || 'null');
    const draft = normalizeTestDraft(saved?.draft);
    const result = saved?.result;
    if (!result || !Object.prototype.hasOwnProperty.call(ARCHETYPES, result.scoreType) || draft.step !== 'result') return { draft, result: null };
    // The display guide needs only the known archetype. Never trust arbitrary saved HTML.
    return { draft, result: { scoreType: result.scoreType, title: ARCHETYPES[result.scoreType].title, description: '', timestamp: '', heroName: draft.heroData.name } as TestResult };
  } catch { return freshFreeProgress(); }
};
export const saveFreeProgress = (storage: Pick<Storage, 'setItem'>, progress: FreeProgress): boolean => {
  try { storage.setItem(FREE_INTRO_KEY, JSON.stringify(progress)); return true; } catch { return false; }
};
