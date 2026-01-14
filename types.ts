
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
}

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
