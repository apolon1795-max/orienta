import { scoreInterests, scoreMotivation, leaders, rankScores, summarizeMotivationChoices } from './assessments.ts';
import { INTEREST_TYPES, MOTIVATORS } from '../data/assessments.ts';
import type { UserState, CourseState } from '../types.ts';
import { ARCHETYPES } from '../types.ts';
import { selectedSituationRows } from './courseScenarioText.ts';
import { SPHERES_DATA, QUIZ_DATA, SKILLS_QUESTIONS, CRISIS_QUESTIONS } from '../data/course.ts';

const scoreForm = new Intl.PluralRules('ru');
const scoreUnit = (value: number) => ({ one: 'балл', few: 'балла', many: 'баллов', other: 'балла', zero: 'баллов', two: 'балла' })[scoreForm.select(value)];
export const courseFingerprint = (c: CourseState) => JSON.stringify([
  c.s1SelectedSpheres, c.s1SelectedProfessions, c.s1QuizAnswers, c.s2Inputs, c.s2Values,
  c.s3Thinking, c.s3Team, c.s3Learning, c.s3CrisisAnswers, c.completedStages, c.s4Dream, c.s4Place, c.s4Priority, c.s4Style, c.hollandAnswers, c.motivationAnswers,
]);
const taskTitles = ['Проект нужно сдать завтра', 'Спор в команде', 'Новый навык за месяц'];
const crisisTitles = ['Ведущий заболел, колонка сломалась', 'Друзья в команде поссорились', 'Флешка с презентацией осталась дома', 'Пропал интернет во время турнира'];
const describeChoice = (title: string, options: { type: string; t: string }[], selected?: string) =>
  title + ': ' + (options.find(option => option.type === selected)?.t || selected || 'Без ответа');
// Evidence mode is a presentation option. The default keeps the existing AI input/export contract.
export const profileSections = (state: UserState, { motivationEvidence = false } = {}) => {
  const c = state.course;
  const spheres = SPHERES_DATA.filter(s => c.s1SelectedSpheres.includes(s.id));
  const interests = scoreInterests(c.hollandAnswers), motivation = scoreMotivation(c.motivationAnswers);
  const topInterests = leaders(interests, 2), topMotivation = leaders(motivation, 3);
  const selectedJobs = spheres.flatMap(s => c.s1SelectedProfessions[s.id] || []);
  const hypotheses = selectedJobs.length ? selectedJobs.slice(0, 3) : [...new Set(topInterests.flatMap(([key]) => INTEREST_TYPES[key as keyof typeof INTEREST_TYPES].jobs))].slice(0, 3);
  const motives = topMotivation.map(([key]) => MOTIVATORS[key as keyof typeof MOTIVATORS]).join(', ');
  const evidence = motivationEvidence ? summarizeMotivationChoices(c.motivationAnswers) : [];
  const sections = [
    { title: 'Интересы и направления для пробы', lines: spheres.map(s => s.title + ': ' + (c.s1SelectedProfessions[s.id] || []).join(', ') + '.') },
    { title: 'Что ты рассказал о себе', lines: [
      'Сильные стороны: ' + c.s2Inputs.s, 'Трудности: ' + c.s2Inputs.w,
      'Возможности: ' + c.s2Inputs.o, 'Препятствия: ' + c.s2Inputs.t,
      'Ценности: ' + c.s2Values.join(', '),
      ...[c.s2Inputs.gift, c.s2Inputs.gift2, c.s2Inputs.gift3].map((gift, i) => 'Подарок на ' + (Number(c.s2Inputs.age) + i + 1) + ' лет: ' + gift),
    ] },
    { title: 'Подход к задачам', lines: [
      ...(motivationEvidence
        ? selectedSituationRows(c).map(([title, choice]) => title + ': ' + choice)
        : [
          ...SKILLS_QUESTIONS.map((question, i) => describeChoice(taskTitles[i], question.opts, [c.s3Thinking, c.s3Team, c.s3Learning][i])),
          ...CRISIS_QUESTIONS.map((question, i) => describeChoice(crisisTitles[i], question.opts, c.s3CrisisAnswers[i])),
        ]),
      'Знакомство с профессиями: ' + c.s1QuizAnswers.filter((a, i) => a === QUIZ_DATA[i].correct).length + ' из ' + QUIZ_DATA.length + ' верно.',
    ] },
    { title: 'Башня мечты: желаемая работа', lines: [c.s4Dream, 'Место: ' + c.s4Place, 'Приоритет: ' + c.s4Priority, 'Рабочий день: ' + c.s4Style] },
    { title: 'Профессиональные интересы: авторский опросник', lines: [
      topInterests.length ? (motivationEvidence ? 'Больше всего баллов по этим утверждениям: ' : 'Наиболее выраженные направления: ') + topInterests.map(([key]) => INTEREST_TYPES[key as keyof typeof INTEREST_TYPES].title).join(', ') : 'Ни одно направление пока не выделилось. Можно начать с разных профессиональных проб.',
      ...rankScores(interests).map(([key, value]) => INTEREST_TYPES[key as keyof typeof INTEREST_TYPES].title + ': ' + value + '/4'),
      motivationEvidence
        ? 'В каждой теме два утверждения, до 4 баллов. Мало баллов означает только, что тебе не подошли именно эти утверждения. Равные баллы на границе показываем вместе.'
        : 'Каждое направление: сумма двух ответов от 0 до 2. Равные баллы на границе топ-2 показаны вместе.',
    ] },
    ...(motivationEvidence ? [{ title: 'Что ты выбрал в опроснике о мотивации', lines: evidence.length
      ? evidence.map(({ index, question, choice }) => (index + 1) + '. ' + question + ' — «' + choice + '».')
      : ['Ответы пока не сохранены.'] }] : []),
    { title: motivationEvidence ? 'Мотивация: баллы по ключу' : 'Мотивация: авторский опросник', lines: [
      motivationEvidence
        ? 'У тем разное число возможностей набрать баллы. Порядок показывает сумму по ключу, а не то, что для тебя важнее. Ноль не значит, что тема тебе не важна.'
        : 'Наиболее выраженные мотиваторы: ' + (motives || 'пока не выделены'),
      ...rankScores(motivation).map(([key, value]) => MOTIVATORS[key as keyof typeof MOTIVATORS] + ': ' + value + ' ' + scoreUnit(value)),
      motivationEvidence
        ? 'Каждый вопрос предлагал выбрать один вариант из нескольких. Для разговора о том, что важно в работе, опирайся на свои ответы и реальные пробы.'
        : 'Баллы начислены по ключу авторских десяти вопросов. Равные результаты на границе топ-3 показаны вместе; это не нормативная оценка.',
    ] },
    { title: 'Профессии для практической проверки', lines: [
      hypotheses.length ? hypotheses.join(', ') : 'Выбери одну интересную профессию для знакомства.',
      'Это гипотезы из твоего выбора, а при его отсутствии — примеры по ведущим интересам. Они не исключают другие профессии.',
      motivationEvidence
        ? 'Изучи реальные задачи и условия каждой роли. Сравни их со своими ценностями и ответами о мотивации.'
        : 'Изучи реальные задачи и условия каждой роли. Проверь, есть ли в ней важные для тебя стороны: ' + (motives || c.s2Values.join(', ')) + '.',
    ] },
    { title: 'Следующий шаг', lines: [
      'Выбери одну из гипотез: ' + (hypotheses.join(', ') || 'интересную профессию') + '. Узнай у специалиста, как проходит обычный день и насколько он близок твоему образу: «' + c.s4Dream + '».',
      'За ближайшую неделю сделай небольшую пробу: учебный проект, интервью или знакомство с работой специалиста. Опирайся на свою сильную сторону: «' + c.s2Inputs.s + '».',
      'После пробы запиши, что понравилось и что оказалось сложным. Сравни впечатления со своими ценностями: ' + c.s2Values.join(', ') + '. Обсуди выводы с наставником.',
    ] },
  ];
  if (state.testResult?.tiedTypes && state.testResult.tiedTypes.length > 1) sections.unshift({
    title: 'Смешанный игровой результат', lines: ['Одинаковое число выборов получили: ' + state.testResult.tiedTypes.map(k => ARCHETYPES[k]?.title).filter(Boolean).join(', ') + '. Основной персонаж показан по порядку архетипов в игре; исследуй все эти направления.'],
  });
  return sections;
};
export const buildProfileText = (state: UserState) => [
  'ORIENTA — МОЯ ПРОФКАРТА',
  'Входной игровой архетип: ' + (state.testResult?.title || 'Не определён'),
  'Герой: ' + (state.testResult?.heroName || 'Искатель'),
  ...profileSections(state).flatMap(s => ['', s.title, ...s.lines]),
  '', 'Профкарта основана на твоих ответах. Это отправная точка для исследования профессий, а не психологический диагноз или обещание профессиональной пригодности.',
  ...(state.summarySource === 'ai' && state.aiSummary ? ['', 'Дополнительный ИИ-разбор', state.aiSummary] : []),
].join('\n');
export const downloadText = (filename: string, text: string, type = 'text/plain;charset=utf-8') => {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
