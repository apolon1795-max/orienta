
export enum AppView {
  LANDING = 'LANDING',
  ONBOARDING = 'ONBOARDING',
  DASHBOARD = 'DASHBOARD',
  TEST = 'TEST',
  GUIDE = 'GUIDE',
  COURSE = 'COURSE',
  CONSULTATION = 'CONSULTATION',
  COMMUNITY = 'COMMUNITY',
  AI_SUMMARY = 'AI_SUMMARY'
}

export interface Question {
  id: number;
  text: string;
  options: { value: string; label: string; scoreType: string }[];
}

export interface TestResult {
  scoreType: string; // e.g., "Commander", "Creator"
  title: string; // Russian title
  description: string;
  timestamp: string;
}

export interface CourseModule {
  id: number;
  title: string;
  content: string;
  isCompleted: boolean;
}

export interface UserState {
  hasOnboarded: boolean;
  telegramId: string | number | null;
  firstName: string | null;
  testResult: TestResult | null;
  courseProgress: CourseModule[];
  aiSummary: string | null;
  lastUpdated: number; // Timestamp for sync conflict resolution
}

// --- SHARED DATA CONSTANTS ---

export const ARCHETYPES: Record<string, { title: string; description: string[]; professions: string }> = {
    'Commander': {
        title: "Командир",
        description: [
            "Ты умеешь видеть цель, собирать людей и вести их вперёд — с уверенностью и чёткостью.",
            "Твой мозг — это операционный центр. Вокруг хаос? Ты наводишь порядок.",
            "Ты не просто идёшь первым — ты тащишь всех за собой и строишь из них команду.",
            "Ты умеешь принимать решения. Даже когда нет времени. Даже когда ставки высоки."
        ],
        professions: "Предприниматель, продюсер, менеджер проектов, организатор мероприятий, бизнес-архитектор."
    },
    'Creator': {
        title: "Творец",
        description: [
            "Ты не можешь не придумывать. В твоей голове каждый день рождается сериал, стартап и новые миры.",
            "Ты видишь нестандартное, чувствуешь красоту и мыслишь образами. Ты — человек концептов и глубины.",
            "Ты не боишься делать по-своему — потому что «как все» тебе неинтересно."
        ],
        professions: "Дизайнер, сценарист, режиссёр, арт-директор, копирайтер, геймдизайнер, креативный продюсер."
    },
    'Researcher': {
        title: "Мыслитель",
        description: [
            "Ты не просто отвечаешь на вопросы. Ты копаешься в сути.",
            "Ты умеешь анализировать, сравнивать, выстраивать логические цепочки там, где другие сдаются.",
            "Где паника — у тебя схема и закономерности.",
            "Ты не боишься сложного. Для тебя это просто интересный пазл."
        ],
        professions: "Программист, инженер, аналитик, учёный, врач, архитектор ИИ, юрист, финансовый стратег."
    },
    'Communicator': {
        title: "Дипломат",
        description: [
            "Ты — человек, с которым хочется быть рядом. Ты открываешь любые двери.",
            "Ты заряжаешь, поддерживаешь и находишь подход к каждому — от дракона до камня.",
            "У тебя есть суперсила, которая ценится везде — ты строишь мосты между людьми.",
            "Ты не всегда центр внимания, но ты — тот самый клей, на котором всё держится."
        ],
        professions: "Психолог, педагог, ведущий, HR, коуч, актёр, блогер, наставник, ивент-менеджер, переговорщик."
    }
};

export const INITIAL_COURSE_MODULES: CourseModule[] = [
  { 
    id: 1, 
    title: 'Модуль 1: Фундамент Роста', 
    content: 'Понимание своей отправной точки критически важно. В этом модуле мы разберем психологию изменений и научимся ставить реалистичные цели, основанные на твоем архетипе.', 
    isCompleted: false 
  },
  { 
    id: 2, 
    title: 'Модуль 2: Стратегическое Внедрение', 
    content: 'Идеи ничего не стоят без реализации. Изучи фреймворки, которые используют топ-CEO для управления временем и энергией.', 
    isCompleted: false 
  },
  { 
    id: 3, 
    title: 'Модуль 3: Мастерство и Устойчивость', 
    content: 'Создание наследия требует постоянства. Мы обсудим формирование долгосрочных привычек и способы избежать выгорания на пути к цели.', 
    isCompleted: false 
  },
];

// Extend Window interface for Telegram
declare global {
  interface Window {
    Telegram: {
      WebApp: {
        ready: () => void;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
          };
        };
        expand: () => void;
        // Link handling methods
        openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
        openTelegramLink: (url: string) => void;
        // CloudStorage API
        CloudStorage: {
          setItem: (key: string, value: string, callback?: (error: any, stored: boolean) => void) => void;
          getItem: (key: string, callback: (error: any, value: string) => void) => void;
          getItems: (keys: string[], callback: (error: any, values: any) => void) => void;
          removeItem: (key: string, callback?: (error: any, deleted: boolean) => void) => void;
        };
        // Version check method
        isVersionAtLeast: (version: string) => boolean;
        showPopup: (params: {
          title?: string;
          message: string;
          buttons?: { id?: string; type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive'; text?: string }[];
        }, callback?: (buttonId: string) => void) => void;
      };
    };
  }
}
