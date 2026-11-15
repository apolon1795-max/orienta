import type { ProgressPayload } from './cloudProgress.ts';
import { normalizeTestDraft } from './testProgress.ts';
import { normalizeUserState } from './progress.ts';
import { readFreeProgress, type FreeProgress } from './freeProgress.ts';
// Explicitly invoked only after account sign-in and the person's transfer confirmation.
// Existing account answers, identity, video progress and results are never replaced.
export const importFreeIntro = (current: ProgressPayload, candidate: FreeProgress): ProgressPayload => {
  const state = normalizeUserState(current.state), testDraft = normalizeTestDraft(current.testDraft);
  if (state.testResult || testDraft.step !== 'start' || state.course.completedStages.length) throw new Error('profile_has_progress');
  const free = readFreeProgress({ getItem: () => JSON.stringify(candidate) });
  if (!free.result || free.draft.step !== 'result') throw new Error('intro_incomplete');
  return { state: { ...state, hasOnboarded: true, testResult: { ...free.result, timestamp: new Date().toISOString(), scores: { ...free.draft.scores } }, lastUpdated: Date.now() }, testDraft: free.draft };
};
