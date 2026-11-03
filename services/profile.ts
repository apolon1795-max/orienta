import type { UserState, CourseState } from '../types.ts';
import { ARCHETYPES } from '../types.ts';
import { SPHERES_DATA, QUIZ_DATA } from '../data/course.ts';
export const courseFingerprint = (c: CourseState) => JSON.stringify([
  c.s1SelectedSpheres, c.s1QuizAnswers, c.s2Inputs, c.s2Values,
  c.s3Thinking, c.s3Team, c.s3Learning, c.s3CrisisAnswers, c.completedStages,
]);
export const profileSections = (state: UserState) => {
  const c = state.course;
  const spheres = SPHERES_DATA.filter(s => c.s1SelectedSpheres.includes(s.id));
  const sections = [
    { title: 'Интересы и направления для пробы', lines: spheres.map(s => s.title + ': ' + s.jobs.slice(0, 3).join(', ') + '.') },
    { title: 'Что ты рассказал о себе', lines: [
      'Сильные стороны: ' + c.s2Inputs.s, 'Трудности: ' + c.s2Inputs.w,
      'Возможности: ' + c.s2Inputs.o, 'Препятствия: ' + c.s2Inputs.t,
      'Ценности: ' + c.s2Values.join(', '), 'Личная цель: ' + c.s2Inputs.gift,
    ] },
    { title: 'Подход к задачам', lines: [
      'Мышление: ' + c.s3Thinking, 'Роль в команде: ' + c.s3Team, 'Обучение: ' + c.s3Learning,
      ...c.s3CrisisAnswers.map((answer, i) => 'Ситуация ' + (i + 1) + ': ' + answer),
      'Знакомство с профессиями: ' + c.s1QuizAnswers.filter((a, i) => a === QUIZ_DATA[i].correct).length + ' из ' + QUIZ_DATA.length + ' верно.',
    ] },
    { title: 'Следующий шаг', lines: [
      'Выбери одну профессию из сферы «' + (spheres[0]?.title || 'Твои интересы') + '» и узнай, как выглядит обычный день специалиста.',
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
  'Игровой архетип: ' + (state.testResult?.title || 'Не определён'),
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
