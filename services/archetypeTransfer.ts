import { ARCHETYPES, type TestResult } from '../types.ts';
import type { FreeProgress } from './freeProgress';
import type { TestDraft } from './testProgress';

export function archetypeTransferState(local: FreeProgress, owner: string | null, learnerId?: string,
  cloud?: { state?: { testResult?: TestResult | null }; testDraft?: Pick<TestDraft, 'step'> } | null) {
  if (!learnerId || (owner !== null && owner !== learnerId) ||
      local.draft.step !== 'result' || !local.result ||
      !Object.prototype.hasOwnProperty.call(ARCHETYPES, local.result.scoreType) ||
      cloud?.state?.testResult) return 'hidden';
  return cloud?.testDraft?.step && cloud.testDraft.step !== 'start' ? 'blocked' : 'available';
}
