import { SKILLS_QUESTIONS, CRISIS_QUESTIONS } from '../data/course.ts';
import type { CourseState } from '../types.ts';

// Wording only: choices keep their original order, storage keys and scoring.
const learningText: Record<string, string> = {
  'Теоретик': 'Найду учебник и сначала разберусь с теорией',
  'Практик': 'Сразу попробую говорить, даже если буду ошибаться',
  'Ученик': 'Найду наставника, который поможет разобраться',
  'Наблюдатель': 'Посмотрю, как другие учатся, и попробую так же',
};
export const situationAnswer = (kind: 'skill' | 'crisis', index: number, type?: string) =>
  (kind === 'skill' && index === 2 ? learningText[type || ''] : '') ||
  (kind === 'skill' ? SKILLS_QUESTIONS : CRISIS_QUESTIONS)[index]?.opts.find(option => option.type === type)?.t ||
  type || 'Без ответа';

export const skillPrompts = [
  'Завтра сдача сложного проекта. Как ты начнёшь работу?',
  'В команде все спорят и предлагают разное. Что ты сделаешь?',
  'У тебя месяц, чтобы освоить основы нового языка. С чего начнёшь?',
];
export const crisisPrompts = [
  'До начала мероприятия 15 минут. Ведущий заболел, колонка сломалась. Что ты сделаешь?',
  'Друзья в команде поссорились и не хотят работать вместе. Как ты поступишь?',
  'Ты оставил флешку с презентацией дома. Выступать через 5 минут. Твои действия?',
  'Во время важного онлайн-турнира отключился интернет. Что ты сделаешь?',
];
const skillTitles = ['Проект нужно сдать завтра', 'Спор в команде', 'Новый навык за месяц'];
const crisisTitles = ['Ведущий заболел, колонка сломалась', 'Друзья в команде поссорились', 'Флешка с презентацией осталась дома', 'Пропал интернет во время турнира'];
export const selectedSituationRows = (c: CourseState): [string, string][] => [
  ...skillTitles.map((title, index): [string, string] => [title, situationAnswer('skill', index, [c.s3Thinking, c.s3Team, c.s3Learning][index])]),
  ...crisisTitles.map((title, index): [string, string] => [title, situationAnswer('crisis', index, c.s3CrisisAnswers[index])]),
];
