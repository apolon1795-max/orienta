export type CampTransfer = 'available' | 'blocked' | 'hidden';
export type CampStep = 'test' | 'transfer' | 'sign-in' | 'wait' | 'map' | 'resume' | 'profile';
type Inputs = {
  signedIn: boolean;
  hasLocalResult: boolean;
  hasSavedResult: boolean;
  testStarted: boolean;
  courseAvailable: boolean;
  courseStarted: boolean;
  courseComplete: boolean;
  cardReady: boolean;
  transfer: CampTransfer;
};
export function campNext(input: Inputs): { step: CampStep; label: string; help: string } {
  const { signedIn, hasLocalResult, hasSavedResult, testStarted, courseAvailable, courseStarted, courseComplete, cardReady, transfer } = input;
  if (signedIn && transfer === 'available') return { step: 'transfer', label: 'Сохранить архетип в профиле', help: 'Проверь результат и подтверди, что он твой.' };
  if (signedIn && cardReady) return { step: 'profile', label: 'Открыть профкарту', help: 'Посмотри, что получилось, и выбери, что попробовать дальше.' };
  const hasResult = signedIn ? hasSavedResult : hasLocalResult;
  if (!hasResult && transfer !== 'blocked') return { step: 'test', label: testStarted ? 'Продолжить тест на архетип' : 'Пройти тест на архетип', help: 'Пять игровых ситуаций помогут заметить твои сильные стороны.' };
  if (!signedIn) return { step: 'sign-in', label: 'Войти по коду', help: 'Код от наставника откроет курс.' };
  if (!courseAvailable) return { step: 'wait', label: '', help: 'Доступ к курсу подключает наставник.' };
  if (courseComplete) return { step: 'map', label: 'Открыть карту курса', help: 'Можно вернуться к любому из пяти этапов.' };
  if (courseStarted) return { step: 'resume', label: 'Продолжить курс', help: 'Вернись к этапу, на котором остановился.' };
  return { step: 'map', label: 'Открыть карту курса', help: 'На карте тебя ждёт приветственное видео и первый этап.' };
}
