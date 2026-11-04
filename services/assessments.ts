import { HOLLAND_QUESTIONS, INTEREST_TYPES, MOTIVATION_QUESTIONS, MOTIVATORS } from '../data/assessments.ts';
export const scoreInterests = (answers: number[]) => {
  const result = Object.fromEntries(Object.keys(INTEREST_TYPES).map(k => [k, 0]));
  answers.forEach((answer, i) => { if (HOLLAND_QUESTIONS[i] && [0, 1, 2].includes(answer)) result[HOLLAND_QUESTIONS[i].type] += answer; });
  return result;
};
export const scoreMotivation = (answers: number[]) => {
  const result = Object.fromEntries(Object.keys(MOTIVATORS).map(k => [k, 0]));
  answers.forEach((answer, i) => {
    const scores = MOTIVATION_QUESTIONS[i]?.options[answer]?.scores;
    if (scores) Object.entries(scores).forEach(([key, value]) => { result[key] += value || 0; });
  });
  return result;
};
// Include ties at the cutoff instead of manufacturing a precise order.
export const leaders = (scores: Record<string, number>, count: number) => {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const threshold = sorted[Math.min(count - 1, sorted.length - 1)]?.[1] || 0;
  return sorted.filter(([, value]) => value > 0 && value >= threshold);
};
