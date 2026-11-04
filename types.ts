
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
  scores?: Record<string, number>;
  tiedTypes?: string[];
  heroName?: string;
}

export interface LessonProgress {
  source: string;
  position: number;
  duration: number;
  completed: boolean;
  updatedAt: number;
}

export interface CourseState {
  lessons: Record<string, LessonProgress>;
  activeStage: number | null;
  completedStages: number[];
  s1CardIndex: number;
  s1SelectedSpheres: string[];
  s1QuizIndex: number;
  s1Phase: 'intro' | 'tinder' | 'filter' | 'jobs' | 'quiz_intro' | 'quiz' | 'done';
  s1ProfessionIndex: number;
  s1SelectedProfessions: Record<string, string[]>;
  s1QuizAnswers: number[];
  s1QuizFeedback: string | null;
  s2Phase: 'intro' | 'swot1' | 'swot2' | 'swot3' | 'swot4' | 'values' | 'age' | 'gifts' | 'done';
  s2Values: string[];
  s2Inputs: { s: string; w: string; o: string; t: string; age: string; gift: string; gift2: string; gift3: string };
  s2GiftIndex: number;
  s3Phase: 'intro' | 'q1' | 'q2' | 'q3' | 'crisis_intro' | 'crisis' | 'done';
  s3Thinking: string;
  s3Team: string;
  s3Learning: string;
  s3CrisisIdx: number;
  s3CrisisAnswers: string[];
  untimed: boolean;
  s4Phase: 'intro' | 'dream' | 'place' | 'priority' | 'style' | 'done';
  s4Dream: string;
  s4Place: string;
  s4Priority: string;
  s4Style: string;
  s5Phase: 'intro' | 'holland' | 'holland_result' | 'motivation_intro' | 'motivation' | 'done';
  s5Index: number;
  hollandAnswers: number[];
  motivationAnswers: number[];
}

export interface CourseModule {
  id: number;
  title: string;
  content: string;
  isCompleted: boolean;
}

export interface UserState {
  schemaVersion?: 3;
  hasOnboarded: boolean;
  telegramId: string | number | null;
  firstName: string | null;
  username: string | null; // Added username for contact
  testResult: TestResult | null;
  courseProgress: CourseModule[];
  aiSummary: string | null;
  summarySource?: 'rules' | 'ai';
  course: CourseState;
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
  { id: 1, title: 'Этап 1: Интересы', content: 'Исследование профессиональных сфер и задач специалистов.', isCompleted: false },
  { id: 2, title: 'Этап 2: Личность', content: 'Сильные стороны, трудности, ценности и личные цели.', isCompleted: false },
  { id: 3, title: 'Этап 3: Навыки', content: 'Мышление, командная работа, обучение и практические ситуации.', isCompleted: false },
  { id: 4, title: 'Этап 4: Башня мечты', content: 'Образ желаемой работы, место, приоритет и режим дня.', isCompleted: false },
  { id: 5, title: 'Этап 5: Хрустальный зал', content: 'Авторские опросники профессиональных интересов и мотивации.', isCompleted: false },
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
