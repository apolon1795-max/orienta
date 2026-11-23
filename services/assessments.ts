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
// Read answer positions as authored. Missing/invalid answers are excluded, not treated as choices.
export const summarizeMotivationChoices = (answers: number[]) =>
  MOTIVATION_QUESTIONS.flatMap(({ text, options }, index) => {
    const selected = answers[index];
    return Number.isInteger(selected) && selected >= 0 && selected < options.length
      ? [{ index, question: text, choice: options[selected].text }]
      : [];
  });
// Score rows are descending; stable sort preserves the authored order for equal scores.
export const rankScores = (scores: Record<string, number>) => Object.entries(scores).sort((a, b) => b[1] - a[1]);

// Include ties at the cutoff instead of manufacturing a precise order.
export const leaders = (scores: Record<string, number>, count: number) => {
  const sorted = rankScores(scores);
  const threshold = sorted[Math.min(count - 1, sorted.length - 1)]?.[1] || 0;
  return sorted.filter(([, value]) => value > 0 && value >= threshold);
};
