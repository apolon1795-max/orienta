import { createUserState, normalizeUserState } from '../services/progress.ts';
export const completedState = () => {
  const state = createUserState(), c = state.course;
  state.hasOnboarded = true;
  state.testResult = { scoreType: 'Commander', title: 'Командир', description: '', timestamp: '2026-11-03', heroName: 'Искатель', scores: { Commander: 2, Creator: 2, Researcher: 1, Communicator: 0 }, tiedTypes: ['Commander', 'Creator'] };
  Object.assign(c, { activeStage: null, completedStages: [0, 1, 2], s1CardIndex: 10, s1SelectedSpheres: ['it', 'art'], s1QuizIndex: 2, s1Phase: 'done', s1QuizAnswers: [0, 1, 0], s2Phase: 'done',
    s2Values: ['Семья', 'Здоровье', 'Творчество', 'Деньги', 'Свобода'], s2Inputs: { s: 'Рисую и учусь', w: 'Боюсь выступать', o: 'Сделать игру', t: 'Не хватает времени', age: '16', gift: 'Графический планшет' },
    s3Phase: 'done', s3Thinking: 'Структурный', s3Team: 'Дипломат', s3Learning: 'Практик', s3CrisisAnswers: ['Менеджер', 'Дипломат', 'Оратор', 'Технарь'], s3CrisisIdx: 3, untimed: true });
  return normalizeUserState(state);
};
