import { createUserState, normalizeUserState } from '../services/progress.ts';
export const completedState = () => {
  const state = createUserState(), c = state.course;
  state.hasOnboarded = true;
  state.testResult = { scoreType: 'Commander', title: 'Командир', description: '', timestamp: '2026-11-03', heroName: 'Искатель', scores: { Commander: 2, Creator: 2, Researcher: 1, Communicator: 0 }, tiedTypes: ['Commander', 'Creator'] };
  Object.assign(c, { activeStage: null, completedStages: [0, 1, 2, 3, 4], s1CardIndex: 10, s1SelectedSpheres: ['it', 'art'], s1SelectedProfessions: { it: ['Программист'], art: ['Иллюстратор'] }, s1ProfessionIndex: 1, s1QuizIndex: 2, s1Phase: 'done', s1QuizAnswers: [0, 1, 0], s2Phase: 'done',
    s2Values: ['Семья', 'Здоровье', 'Творчество', 'Деньги', 'Самореализация'], s2Inputs: { s: 'Рисую и учусь', w: 'Боюсь выступать', o: 'Сделать игру', t: 'Не хватает времени', age: '16', gift: 'Графический планшет', gift2: 'Камера', gift3: 'Путешествие' },
    s3Phase: 'done', s3Thinking: 'Структурный', s3Team: 'Дипломат', s3Learning: 'Практик', s3CrisisAnswers: ['Менеджер', 'Дипломат', 'Оратор', 'Технарь'], s3CrisisIdx: 3, untimed: true, s2GiftIndex: 2, s4Phase: 'done', s4Dream: 'Работать в своей студии над играми', s4Place: 'В своём пространстве', s4Priority: 'Свобода и гибкость', s4Style: 'Проекты с дедлайнами — сам выбираю темп', s5Phase: 'done', s5Index: 0, hollandAnswers: [0,1,2,2,1,1,1,0,2,2,0,1], motivationAnswers: [2,1,1,0,0,1,0,2,1,1] });
  return normalizeUserState(state);
};
