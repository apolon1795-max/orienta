// Author's short questionnaires, transcribed from the detailed Notion stage 5.
// Source: https://app.notion.com/p/1ec03782227e80c0b29fe68e44e780d5
// This adaptation has no established psychometric validity in the project materials.
export const INTEREST_TYPES = {
  R: { title: 'Практик', description: 'Техника, инструменты и результат, который можно увидеть.', jobs: ['Инженер', 'Строитель', 'Автомеханик', 'Агроном', 'Спасатель'] },
  I: { title: 'Исследователь', description: 'Анализ, опыты и понимание того, как всё устроено.', jobs: ['Учёный', 'Биолог', 'Аналитик', 'Программист', 'Химик'] },
  S: { title: 'Наставник', description: 'Помощь, обучение и поддержка людей.', jobs: ['Учитель', 'Психолог', 'Врач', 'Профориентолог', 'HR-специалист'] },
  E: { title: 'Организатор', description: 'Проекты, управление и влияние на результат.', jobs: ['Предприниматель', 'Менеджер', 'Маркетолог', 'Организатор мероприятий'] },
  A: { title: 'Творец', description: 'Творчество, самовыражение и необычные решения.', jobs: ['Дизайнер', 'Сценарист', 'Видеомонтажёр', 'Блогер', 'Артист'] },
  C: { title: 'Системный', description: 'Порядок, документы, структура и правила.', jobs: ['Бухгалтер', 'Экономист', 'Системный администратор', 'Логист'] },
};
export type InterestType = keyof typeof INTEREST_TYPES;
export const HOLLAND_QUESTIONS: { text: string; type: InterestType }[] = [
  { text: 'Мне нравится чинить технику или собирать что-то руками', type: 'R' },
  { text: 'Я люблю быть на свежем воздухе, работать с инструментами', type: 'R' },
  { text: 'Мне интересно проводить опыты или изучать, как работает что-то', type: 'I' },
  { text: 'Я люблю разбираться в сложных вопросах', type: 'I' },
  { text: 'Мне нравится помогать людям, когда у них трудности', type: 'S' },
  { text: 'Я бы хотел обучать, поддерживать, быть наставником', type: 'S' },
  { text: 'Мне нравится вдохновлять и убеждать других', type: 'E' },
  { text: 'Я легко могу придумать проект и собрать команду', type: 'E' },
  { text: 'Я люблю рисовать, писать, снимать видео', type: 'A' },
  { text: 'Мне нравится создавать что-то необычное и красивое', type: 'A' },
  { text: 'Мне нравится работать с таблицами и документами', type: 'C' },
  { text: 'Я обожаю чёткие правила и порядок', type: 'C' },
];
export const MOTIVATORS = {
  salary: 'Оплата', conditions: 'Условия работы', goals: 'Ясные цели', contacts: 'Общение',
  stability: 'Стабильность', recognition: 'Признание', challenge: 'Сложные задачи', power: 'Влияние',
  variety: 'Разнообразие', creativity: 'Творчество', development: 'Развитие', meaningful: 'Польза и востребованность',
};
type Motive = keyof typeof MOTIVATORS;
interface MotivationOption { text: string; scores: Partial<Record<Motive, number>> }
export const MOTIVATION_QUESTIONS: { text: string; options: MotivationOption[] }[] = [
  { text: 'Ты выбираешь дополнительный проект. Что важнее всего?', options: [
    { text: 'Он хорошо оплачивается', scores: { salary: 3 } }, { text: 'В нём можно проявить себя', scores: { recognition: 3 } },
    { text: 'Он творческий и нестандартный', scores: { creativity: 3 } }, { text: 'Он полезен людям', scores: { meaningful: 3 } },
  ] },
  { text: 'У тебя свободный вечер. Что выберешь?', options: [
    { text: 'Придумать бизнес-план', scores: { power: 2, goals: 2 } }, { text: 'Сделать рисунок или видео', scores: { creativity: 3 } },
    { text: 'Почитать про саморазвитие', scores: { development: 3 } }, { text: 'Встретиться с друзьями', scores: { contacts: 3 } },
  ] },
  { text: 'Какая рабочая атмосфера тебе ближе?', options: [
    { text: 'Спокойная и без стресса', scores: { conditions: 3 } }, { text: 'Живой офис с разными задачами', scores: { variety: 3 } },
    { text: 'Где все уважают друг друга', scores: { stability: 3 } }, { text: 'Где есть чёткие цели', scores: { goals: 3 } },
  ] },
  { text: 'Что тебе важнее всего в профессии?', options: [
    { text: 'Возможность развиваться', scores: { development: 3 } }, { text: 'Чувство, что ты нужен', scores: { meaningful: 3 } },
    { text: 'Возможность лидировать', scores: { power: 3 } }, { text: 'Удовольствие от процесса', scores: { variety: 3 } },
  ] },
  { text: 'Представь, что тебе дали грамоту. За что это было бы?', options: [
    { text: 'За креативный подход', scores: { creativity: 3 } }, { text: 'За помощь другим', scores: { meaningful: 3 } },
    { text: 'За продуктивность', scores: { goals: 3 } }, { text: 'За лидерство', scores: { power: 3 } },
  ] },
  { text: 'Выбираешь между офисом с чёткими задачами и креативной студией. Что выберешь?', options: [
    { text: 'Офис', scores: { goals: 3 } }, { text: 'Студию', scores: { creativity: 3 } },
    { text: 'Зависит от коллектива', scores: { contacts: 3 } }, { text: 'Что больше платят', scores: { salary: 3 } },
  ] },
  { text: 'Как ты относишься к вызовам?', options: [
    { text: 'Люблю сложные задачи', scores: { challenge: 3 } }, { text: 'Предпочитаю понятные задачи', scores: { conditions: 3 } },
    { text: 'Главное — стабильность', scores: { stability: 3 } }, { text: 'Всё зависит от команды', scores: { contacts: 3 } },
  ] },
  { text: 'Что бы ты добавил в школу, если бы был директором?', options: [
    { text: 'Проекты и исследования', scores: { development: 3 } }, { text: 'Предпринимательство', scores: { power: 3 } },
    { text: 'Мастерские', scores: { creativity: 3 } }, { text: 'Зоны отдыха', scores: { conditions: 3 } },
  ] },
  { text: 'Ты любишь, когда…', options: [
    { text: 'Есть чёткий план', scores: { goals: 3 } }, { text: 'Можно проявить себя', scores: { recognition: 3 } },
    { text: 'Есть поддержка от команды', scores: { stability: 3 } }, { text: 'Всё постоянно меняется', scores: { variety: 3 } },
  ] },
  { text: 'Что мотивирует тебя в сложный момент?', options: [
    { text: 'Думаю о результате', scores: { challenge: 3 } }, { text: 'Думаю о деньгах', scores: { salary: 3 } },
    { text: 'Хочу, чтобы похвалили', scores: { recognition: 3 } }, { text: 'Знаю, что это важно', scores: { meaningful: 3 } },
  ] },
];
export const WORKPLACES = ['В офисе', 'Удалённо', 'На природе', 'В своём пространстве'];
export const WORK_PRIORITIES = ['Стабильность и понятный доход', 'Свобода и гибкость'];
export const WORK_STYLES = ['Чётко по графику: с 9 до 18', 'Проекты с дедлайнами — сам выбираю темп', 'Свободный режим — главное результат', 'Спонтанно: когда есть вдохновение'];
