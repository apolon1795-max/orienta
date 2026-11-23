import './components/journey-theme.css';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrainCircuit, GraduationCap, MessageCircle, Users, ChevronRight, Sparkles, ExternalLink, Bot, CheckCircle, AlertTriangle, Download, Upload, Compass, Map, BookOpen } from 'lucide-react';
import { AppView, UserState, CourseState, TestResult, INITIAL_COURSE_MODULES } from './types';
import { Button } from './components/Button';
import { TestView } from './components/TestView';
import { CourseView } from './components/CourseView';
import { GuideView } from './components/GuideView';
import { ProfileView } from './components/ProfileView';
import { createUserState, readUserState, saveLocalState, GAME_STORAGE_KEY, exportBackup, importBackup } from './services/progress';
import { downloadText, courseFingerprint } from './services/profile';
import { createTestDraft, readTestDraft, TestDraft } from './services/testProgress';
import { LessonMedia } from './components/LessonMedia';
import { ProgressAccount, ProgressAccess } from './components/ProgressAccount';
import { readFreeProgress, type FreeProgress } from './services/freeProgress';
import { importFreeIntro } from './services/profileIntro';
import { apiBase, ProgressSync, type ProgressPayload, type SyncState } from './services/cloudProgress';
import type { CourseEntry } from './services/courseEntry';
import { allCourseStagesCompleted, resumeCourseStage } from './services/courseNavigation';

const CLOUD_API = apiBase(import.meta.env.VITE_PROGRESS_API_URL || window.__ORIENTA_API);
const browserStorage = (name: 'localStorage' | 'sessionStorage'): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> => {
  try { return window[name]; } catch { return { getItem: () => null, removeItem: () => {}, setItem: () => { throw new Error('storage_unavailable'); } }; }
};

const StorageIndicator = ({ available }: { available: boolean }) => (
  <span className="absolute top-4 right-4 text-slate-300 print-hidden" title={available ? 'Прогресс сохранён в этом браузере' : 'Хранилище браузера недоступно'}>
    {available ? <CheckCircle className="w-5 h-5" aria-label="Сохранено в браузере" /> : <AlertTriangle className="w-5 h-5 text-amber-300" aria-label="Не удалось сохранить" />}
  </span>
);
const App: React.FC<{ entry?: CourseEntry }> = ({ entry }) => {
  const [view, setView] = useState<AppView>(entry?.mode === 'profile-card' ? AppView.AI_SUMMARY : entry ? AppView.COURSE : AppView.LANDING);
  const [mapOnEntry, setMapOnEntry] = useState(!!entry && entry.mode !== 'continue');
  const [courseRestored, setCourseRestored] = useState(!entry || !CLOUD_API);
  const [userState, setUserState] = useState<UserState>(() => {
    if (CLOUD_API) return createUserState();
    try { return readUserState(window.localStorage); } catch { return createUserState(); }
  });
  const [testResetKey, setTestResetKey] = useState(0);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [freeCandidate, setFreeCandidate] = useState<FreeProgress | null>(() => {
    if (!CLOUD_API) return null;
    try { const candidate = readFreeProgress(window.localStorage); return candidate.result ? candidate : null; } catch { return null; }
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<'test' | 'all' | 'import' | null>(null);
  const pendingImport = useRef<ReturnType<typeof importBackup> | null>(null);
  const [initialDraft] = useState(() => { if (CLOUD_API) return createTestDraft(); try { return readTestDraft(window.localStorage); } catch { return createTestDraft(); } });
  const testDraft = useRef(initialDraft);
  const [draftRevision, setDraftRevision] = useState(0);
  const handleDraftChange = useCallback((draft: TestDraft) => {
    testDraft.current = draft;
    setDraftRevision(n => n + 1);
    if (!CLOUD_API) { try { window.localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(draft)); } catch { setStorageAvailable(false); } }
  }, []);
  const dialog = useRef<HTMLDialogElement>(null);
  const request = useRef<AbortController | null>(null);
  const aiInFlight = useRef(false);
  const importInput = useRef<HTMLInputElement>(null);
  const mediaEpoch = useRef(0);
  const renderedMediaEpoch = mediaEpoch.current;
  const restoreCloud = useCallback((payload: ProgressPayload) => {
    mediaEpoch.current++;
    setUserState(payload.state); testDraft.current = payload.testDraft;
    setTestResetKey(n => n + 1); setDraftRevision(n => n + 1);
    if (entry) setCourseRestored(true);
    else setView(payload.state.hasOnboarded ? AppView.DASHBOARD : AppView.ONBOARDING);
  }, [entry]);
  const [sync] = useState(() => {
    const persisted = browserStorage('sessionStorage');
    let inherited = entry?.session || null;
    const sessionStorage = { getItem: (key: string) => key === 'orienta_session_v1' && inherited ? JSON.stringify(inherited) : persisted.getItem(key),
      setItem: (key: string, value: string) => { if (key === 'orienta_session_v1') inherited = null; persisted.setItem(key, value); },
      removeItem: (key: string) => { if (key === 'orienta_session_v1') inherited = null; persisted.removeItem(key); } };
    return new ProgressSync({ base: CLOUD_API, sessionStorage, storage: browserStorage('localStorage'), restore: restoreCloud,
    reset: () => restoreCloud({ state: createUserState(), testDraft: createTestDraft() }) });
  });
  const [syncState, setSyncState] = useState<SyncState>(sync.state);
  useEffect(() => { const unsubscribe = sync.subscribe(setSyncState); void sync.start(); return unsubscribe; }, [sync]);
  useEffect(() => { sync.offer({ state: userState, testDraft: testDraft.current }); }, [sync, userState, draftRevision, syncState.status]);
  useEffect(() => {
    if (!CLOUD_API) return;
    const retry = () => { void sync.retry(); }, flush = () => { void sync.flush(); };
    const hidden = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('online', retry); window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', hidden);
    return () => { window.removeEventListener('online', retry); window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', hidden); };
  }, [sync]);
  const profileReady = allCourseStagesCompleted(userState.course) && !!userState.testResult;
  const updateUserState = useCallback((updates: Partial<UserState>) => {
    setUserState(prev => ({ ...prev, ...updates, lastUpdated: Date.now() }));
  }, []);
  const updateCourse = useCallback<React.Dispatch<React.SetStateAction<CourseState>>>(update => {
    setUserState(prev => {
      const course = typeof update === 'function' ? update(prev.course) : update;
      if (course === prev.course) return prev;
      const changed = courseFingerprint(course) !== courseFingerprint(prev.course);
      return { ...prev, course, aiSummary: changed ? null : prev.aiSummary, summarySource: changed ? undefined : prev.summarySource,
        courseProgress: INITIAL_COURSE_MODULES.map(m => ({ ...m, isCompleted: course.completedStages.includes(m.id - 1) })), lastUpdated: Date.now() };
    });
  }, []);
  useEffect(() => {
    if (CLOUD_API) return;
    try { setStorageAvailable(saveLocalState(window.localStorage, userState)); } catch { setStorageAvailable(false); }
  }, [userState]);
  useEffect(() => { window.scrollTo(0, 0); }, [view]);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (confirmation) dialog.current?.showModal(); else dialog.current?.close();
  }, [confirmation]);
  const handleStartJourney = () => setView(userState.hasOnboarded ? AppView.DASHBOARD : AppView.ONBOARDING);
  const handleOnboardingComplete = () => { updateUserState({ hasOnboarded: true }); setView(AppView.DASHBOARD); };
  const handleTestCalculated = (result: TestResult) => updateUserState({ testResult: result, aiSummary: null });
  const handleTestComplete = (result: TestResult) => { handleTestCalculated(result); setView(AppView.GUIDE); };
  const handleOpenResult = () => setView(userState.testResult ? AppView.GUIDE : AppView.TEST);
  const handleOpenCourse = () => { if (CLOUD_API && !syncState.courseAvailable) { setNotice('Доступ к полному курсу подключает наставник.'); return; } setView(AppView.COURSE); };
  const leaveCourse = () => {
    if (!entry) { setView(AppView.DASHBOARD); return; }
    void sync.flush();
    entry.back();
  };
  const directResume = entry?.mode === 'continue';
  const changeCourse = useCallback<React.Dispatch<React.SetStateAction<CourseState>>>(update => {
    setMapOnEntry(false);
    updateCourse(previous => {
      const base = directResume && previous.activeStage === null ? { ...previous, activeStage: resumeCourseStage(previous) } : previous;
      return typeof update === 'function' ? update(base) : update;
    });
  }, [updateCourse, directResume]);
  const renderCourse = mapOnEntry ? { ...userState.course, activeStage: null } : directResume && userState.course.activeStage === null
    ? { ...userState.course, activeStage: resumeCourseStage(userState.course) } : userState.course;
  const viewedStage = renderCourse.activeStage;
  const stageMedia = viewedStage !== null && viewedStage < 5 ? <LessonMedia key={viewedStage} stage={viewedStage + 1}
    progress={userState.course.lessons[String(viewedStage + 1)]}
    onProgress={progress => { const stage = viewedStage + 1; updateCourse(prev => mediaEpoch.current === renderedMediaEpoch
      ? ({ ...prev, activeStage: directResume && prev.activeStage === null ? viewedStage : prev.activeStage, lessons: { ...prev.lessons, [stage]: progress } }) : prev); }} /> : null;
  const handleRetakeTest = () => setConfirmation('test');
  const handleGenerateSummary = () => {
    if (profileReady) setView(AppView.AI_SUMMARY);
    else if (userState.course.completedStages.length === 5 && !userState.testResult) setNotice('Для итоговой профкарты нужен архетип. Его можно открыть или получить в лагере. Твой прогресс в курсе сохранён.');
  };
  const handleGenerateAi = async () => {
    if (!profileReady || aiInFlight.current) return;
    aiInFlight.current = true;
    const controller = new AbortController(); request.current = controller;
    setIsGeneratingAi(true); setAiError(null);
    const timeout = setTimeout(() => controller.abort(), 35000), snapshot = userState;
    try {
      const summary = await sync.generateAi({ state: snapshot, testDraft: testDraft.current }, controller.signal);
      if (!controller.signal.aborted) setUserState(prev => courseFingerprint(prev.course) === courseFingerprint(snapshot.course) && prev.testResult?.timestamp === snapshot.testResult?.timestamp
        ? { ...prev, aiSummary: summary, summarySource: 'ai', lastUpdated: Date.now() } : prev);
    } catch (error) {
      if (request.current === controller) setAiError(controller.signal.aborted ? 'Время ожидания истекло. Повтори запрос через минуту.' : error instanceof Error ? error.message : 'Не удалось получить ИИ-разбор.');
    } finally { clearTimeout(timeout); setIsGeneratingAi(false); aiInFlight.current = false; }
  };
  const handleOpenTelegramLink = (url: string) => {
    const tg = window.Telegram?.WebApp;
    if (tg?.openTelegramLink && url.startsWith('https://t.me/')) tg.openTelegramLink(url);
    else window.open(url, '_blank', 'noopener,noreferrer');
  };
  const handleExport = () => downloadText('orienta-backup.json', exportBackup(userState, testDraft.current), 'application/json');
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    try {
      if (file.size > 200000) throw new Error('Выбери файл резервной копии до 200 КБ.');
      pendingImport.current = importBackup(await file.text()); setConfirmation('import');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Не удалось прочитать файл.'); }
  };
  const confirmReset = () => {
    request.current?.abort(); request.current = null;
    if (confirmation === 'import' && pendingImport.current) {
      handleExport(); setUserState(pendingImport.current.state); testDraft.current = pendingImport.current.testDraft; pendingImport.current = null;
    } else if (confirmation === 'all') { if (!CLOUD_API) { try { window.localStorage.removeItem('appState_ru_recovery'); } catch {} } pendingImport.current = null; setUserState({ ...createUserState(), lastUpdated: Date.now() }); testDraft.current = createTestDraft(); }
    else { updateUserState({ testResult: null, aiSummary: null, summarySource: undefined }); testDraft.current = createTestDraft(); }
    if (!CLOUD_API) { try { window.localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(testDraft.current)); } catch { setStorageAvailable(false); } }
    setTestResetKey(k => k + 1); setView(confirmation === 'test' ? AppView.TEST : confirmation === 'all' ? AppView.LANDING : AppView.DASHBOARD);
    setConfirmation(null); setAiError(null);
  };

  const renderLanding = () => (
    <section className="journey-welcome">
      <StorageIndicator available={storageAvailable} />
      <header className="journey-brand"><Compass size={24} strokeWidth={1.7} aria-hidden="true" /><span>Ориента</span><small>Твоё путешествие к себе</small></header>
      <div className="journey-welcome-grid">
        <div className="journey-welcome-copy"><span className="journey-eyebrow">Твоя история начинается здесь</span><h1>Раскрой свой<br/>истинный потенциал</h1><p>{userState.firstName ? `Привет, ${userState.firstName}! ` : ''}Пройди игровой тест, исследуй свои интересы и собери личную профкарту.</p><Button onClick={handleStartJourney} variant="fantasy">Начать Путь <ChevronRight size={20} aria-hidden="true" /></Button><div className="journey-itinerary"><span><Sparkles size={18} aria-hidden="true" />Узнай свой архетип</span><span><Map size={18} aria-hidden="true" />Пройди пять этапов</span><span><BookOpen size={18} aria-hidden="true" />Собери профкарту</span></div><small className="journey-welcome-note">Не нужно знать все ответы заранее. Начни с любопытства.</small></div>
        <figure className="journey-welcome-art"><img src="/design/course-map-v1.png" alt="Карта Ориенты: от лагеря через лес, зеркальные воды и башню к вершине" /><figcaption>Каждый шаг помогает лучше понять себя.</figcaption></figure>
      </div>
    </section>
  );

  const renderOnboarding = () => (
    <div className="min-h-screen flex flex-col p-6 max-w-md mx-auto relative">
      <StorageIndicator available={storageAvailable} />
      <div className="flex-1 flex flex-col justify-end space-y-4 pb-8">
        <div className="flex items-start gap-3 animate-fade-in">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 border border-indigo-400">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="bg-slate-800 p-4 rounded-2xl rounded-tl-none text-slate-200 shadow-lg border border-slate-700">
            <p>Приветствую{userState.firstName ? `, ${userState.firstName}` : ''}. Ты попал в Хаб.</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3 animate-fade-in delay-500" style={{ animationDelay: '0.8s', animationFillMode: 'backwards' }}>
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 border border-indigo-400">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="bg-slate-800 p-4 rounded-2xl rounded-tl-none text-slate-200 shadow-lg border border-slate-700 space-y-2">
            <p>{CLOUD_API ? 'Твой прогресс сохраняется по личному коду.' : 'Твой прогресс сохраняется на этом устройстве.'}</p>
            <p>Сначала выбери персонажа и пройди пять ситуаций. Затем исследуй интересы, ценности и навыки в пяти этапах курса.</p>
          </div>
        </div>
      </div>
      
      <Button onClick={handleOnboardingComplete} fullWidth className="py-4 text-lg animate-pulse" variant="fantasy">
        Поехали
      </Button>
    </div>
  );

  const renderDashboard = () => (
    <div className="min-h-screen p-6 pb-24 relative max-w-5xl mx-auto">
      <StorageIndicator available={storageAvailable} />
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white font-serif">Твой Хаб</h1>
          <p className="text-slate-400">{userState.firstName ? `Привет, ${userState.firstName}` : 'С возвращением'}.</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shadow-inner">
          <span className="text-indigo-400 font-bold">
            {userState.firstName ? userState.firstName[0] : 'U'}
          </span>
        </div>
      </header>

      <div role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenResult(); } }}
        onClick={handleOpenResult}
        className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-2xl p-6 mb-8 text-white relative overflow-hidden shadow-xl shadow-indigo-900/20 border border-white/10 cursor-pointer active:scale-95 transition-transform"
      >
        <div className="relative z-10">
          <h2 className="text-3xl font-serif font-bold mb-2 text-amber-200">
            {userState.testResult ? userState.testResult.title : "Неизвестный Архетип"}
          </h2>
          <p className="text-indigo-200 mb-6 max-w-xs text-sm leading-relaxed">
            {userState.testResult 
              ? "Твой гайд разблокирован. Нажми, чтобы открыть." 
              : "Пройди пять игровых ситуаций и начни исследовать свои сильные стороны."}
          </p>
          
          {!userState.testResult ? (
            <span className="inline-flex px-6 py-3 rounded-xl font-serif font-semibold bg-amber-900 border border-amber-500 text-amber-100">Начать Тест</span>
          ) : (
            <div className="flex items-center gap-2 text-sm bg-black/30 w-fit px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
              <CheckCircleMini /> Открыть Гайд
            </div>
          )}
        </div>
        <BrainCircuit className="absolute -bottom-4 -right-4 w-40 h-40 text-white/5 rotate-12" />
      </div>

      {userState.testResult && (
          <div className="text-center mb-8">
              <button 
                  onClick={handleRetakeTest}
                  className="text-xs text-slate-500 hover:text-red-400 underline transition-colors"
              >
                  Сбросить результат и пройти заново
              </button>
          </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <DashboardCard 
          title="Курс" 
          subtitle={userState.testResult ? userState.course.completedStages.length + "/5 этапов" : "Сначала игровой тест"}
          icon={<GraduationCap className="w-6 h-6 text-slate-400" />}
          onClick={handleOpenCourse}
        />
        <DashboardCard 
          title="Профкарта"
          subtitle={profileReady ? "Готова" : "Заверши пять этапов"}
          icon={<Sparkles className="w-6 h-6 text-amber-400" />}
          onClick={() => setView(AppView.AI_SUMMARY)}
          disabled={!profileReady}
        />
        <DashboardCard 
          title="Консультация" 
          subtitle="Запись 1:1"
          icon={<MessageCircle className="w-6 h-6 text-green-400" />}
          onClick={() => setView(AppView.CONSULTATION)}
        />
        <DashboardCard 
          title="Сообщество" 
          subtitle="Вступай"
          icon={<Users className="w-6 h-6 text-pink-400" />}
          onClick={() => setView(AppView.COMMUNITY)}
        />
      </div>
    </div>
  );

  const renderConsultation = () => {
    const message = "Привет! 👋 Хочу на консультацию. Помоги разобраться с результатами теста!";
    const tgLink = `https://t.me/Daniil_Borisov?text=${encodeURIComponent(message)}`;

    return (
      <div className="min-h-screen p-6 flex flex-col">
         <Button variant="ghost" onClick={leaveCourse} className="self-start pl-0 mb-8">
            ← Назад
          </Button>
          
          <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 text-center space-y-6">
            <MessageCircle className="w-16 h-16 text-indigo-300 mx-auto" aria-hidden="true" />
            <div>
              <h2 className="text-2xl font-serif font-bold text-white">Экспертная Консультация</h2>
              <p className="text-slate-400 mt-2">Готов применить результаты теста "{userState.testResult?.title || 'Тест'}" в реальной жизни? Запишись на частную сессию.</p>
            </div>
            
            <Button fullWidth variant="fantasy" onClick={() => handleOpenTelegramLink(tgLink)}>
                Написать Ментору <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>
      </div>
    );
  };

  const renderCommunity = () => (
    <section className="max-w-2xl mx-auto p-6 space-y-4">
      <Button variant="ghost" onClick={() => setView(AppView.DASHBOARD)}>Назад</Button>
      <h1 className="text-3xl">Сообщество</h1>
      <p role="status">Сообщество скоро откроется</p>
    </section>
  );

  if (CLOUD_API && entry && (!courseRestored || !syncState.courseAvailable || ['signed-out','error','checking'].includes(syncState.status))) {
    return <section className="max-w-xl mx-auto p-6 space-y-4">
      <p role="status">{syncState.status === 'error' ? 'Не удалось загрузить прогресс курса.' : syncState.status === 'signed-out' && syncState.message ? 'Вход больше не активен. Вернись в лагерь.' : 'Загружаем курс…'}</p>
      {syncState.status === 'error' && <Button onClick={() => { void sync.retry(); }}>Повторить</Button>}
      <Button variant="secondary" onClick={leaveCourse}>В лагерь</Button>
    </section>;
  }
  if (CLOUD_API && ['signed-out', 'checking', 'error'].includes(syncState.status)) return <ProgressAccess client={sync} state={syncState} onExport={handleExport} hasLocalAnswers={userState.hasOnboarded || testDraft.current.step !== 'start'} />;
  return (
    <div data-view={view} className={`min-h-screen text-slate-200 font-sans selection:bg-indigo-500/30 ${[AppView.LANDING, AppView.ONBOARDING, AppView.DASHBOARD].includes(view) ? "journey-lobby" : ""}`}>
      <ProgressAccount recoveryOnly={!!entry?.mode} client={entry ? {
        signIn: code => sync.signIn(code), joinPilot: (invite, code) => sync.joinPilot(invite, code), signInTelegram: init => sync.signInTelegram(init), registerFree: code => sync.registerFree(code),
        signOut: async () => { await sync.signOut(); entry.back(); }, linkTelegram: init => sync.linkTelegram(init), retry: () => sync.retry(), useCloudCopy: () => sync.useCloudCopy()
      } : sync} state={syncState} onExport={handleExport} />
      {!entry && CLOUD_API && syncState.learnerId && freeCandidate && !userState.testResult && testDraft.current.step === 'start' && !userState.course.completedStages.length && <section aria-label="Перенос вводной в профиль" className="max-w-5xl mx-auto m-4 p-6 border border-amber-400/40 rounded-xl bg-slate-900 space-y-4 print-hidden">
        <h2 className="text-xl font-serif">Сохранить архетип в этом профиле?</h2>
        <p className="text-slate-300">В этом браузере есть результат: {freeCandidate.result?.title}. Подтверди, что это твоя вводная. Псевдоним, результат и ход теста будут сохранены в твоём профиле Ориенты на сервере Яндекса в России и доступны по твоему коду с других устройств. В Telegram или ИИ они не отправляются.</p>
        <div className="flex flex-wrap gap-3"><Button variant="fantasy" disabled={syncState.status !== 'saved' || syncState.dirty} onClick={() => {
          try { const merged = importFreeIntro({ state: userState, testDraft: testDraft.current }, freeCandidate); setUserState(merged.state); testDraft.current = merged.testDraft; setDraftRevision(n => n + 1); setTestResetKey(n => n + 1); setView(AppView.DASHBOARD); setFreeCandidate(null); setNotice('Результат добавлен в профиль. Дождись статуса «Прогресс сохранён в облаке» перед переходом на другое устройство.'); }
          catch { setNotice('В этом профиле уже есть прогресс. Он не заменён.'); }
        }}>Это мой результат, сохранить</Button><Button variant="secondary" onClick={() => setFreeCandidate(null)}>Не переносить</Button></div>
      </section>}
      {!storageAvailable && <div role="alert" className="p-4 bg-amber-950 text-amber-100 print-hidden">Браузер не сохраняет прогресс. Скачай резервную копию перед закрытием страницы. <button className="underline" onClick={handleExport}>Скачать копию</button></div>}
      {notice && <div role="status" className="p-4 bg-slate-800 text-slate-100 print-hidden">{notice} <button onClick={() => setNotice(null)} className="underline ml-3">Закрыть</button></div>}
      {view === AppView.LANDING && renderLanding()}
      {view === AppView.ONBOARDING && renderOnboarding()}
      {view === AppView.DASHBOARD && renderDashboard()}
      {view === AppView.GUIDE && userState.testResult && (
        <GuideView 
          archetype={userState.testResult.scoreType} 
          onBack={() => setView(AppView.DASHBOARD)} 
          onStartCourse={handleOpenCourse}
        />
      )}
      {view === AppView.TEST && (
        <TestView 
          key={testResetKey}
          initialDraft={testDraft.current} onDraftChange={handleDraftChange} onRequestRestart={handleRetakeTest}
          onComplete={handleTestComplete} 
          onCancel={() => setView(AppView.DASHBOARD)} 
          onResultCalculated={handleTestCalculated}
        />
      )}
      {view === AppView.COURSE && (!CLOUD_API || syncState.courseAvailable) && (
        <>
        {!entry?.mode && stageMedia}
        <CourseView 
          course={renderCourse}
          onChange={changeCourse}
          onCompleteCourse={handleGenerateSummary}
          onBack={leaveCourse}
          isGeneratingAi={isGeneratingAi}
          linear={!!entry?.mode}
          stageMedia={entry?.mode ? stageMedia : null}
        />
        </>
      )}
      {view === AppView.AI_SUMMARY && entry?.mode && !profileReady && <section className="max-w-xl mx-auto p-6 space-y-4"><h1>Профкарта пока не готова</h1><p>Пройди пять этапов и узнай свой архетип. Твои ответы сохранены.</p><Button variant="secondary" onClick={leaveCourse}>В лагерь</Button></section>}
      {view === AppView.AI_SUMMARY && profileReady && (!CLOUD_API || syncState.courseAvailable) && <ProfileView state={userState}
        onBack={leaveCourse}
        onAi={handleGenerateAi} aiConfigured={syncState.aiAvailable === true} generating={isGeneratingAi} error={aiError} />}
      {view === AppView.CONSULTATION && renderConsultation()}
      {view === AppView.COMMUNITY && renderCommunity()}
      {view === AppView.DASHBOARD && <section aria-label="Сохранение прогресса" className="max-w-5xl mx-auto px-6 pb-12 print-hidden">
        <p className="text-sm text-slate-300 mb-4">{CLOUD_API ? 'Ответы и место просмотра уроков сохраняются по личному коду. Резервную копию можно скачать отдельно.' : 'Ответы хранятся в этом браузере. Резервная копия позволяет перенести результаты на другое устройство. Автоматическая отправка ответов не включена.'}</p>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={handleExport}><Download className="w-4 h-4" />Скачать копию</Button>
          <Button variant="secondary" onClick={() => importInput.current?.click()}><Upload className="w-4 h-4" />Загрузить копию</Button>
          <input ref={importInput} type="file" accept="application/json,.json" onChange={handleImport} className="hidden" aria-label="Файл резервной копии" />
          <Button variant="ghost" onClick={() => setConfirmation('all')}>Удалить мои данные</Button>
        </div>
      </section>}
      <dialog ref={dialog} onCancel={e => { e.preventDefault(); setConfirmation(null); }} onClose={() => setConfirmation(null)} aria-labelledby="confirmation-title" className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-600 p-6 max-w-md w-[calc(100%-2rem)] backdrop:bg-black/70">
        <h2 id="confirmation-title" className="text-xl font-serif font-bold mb-4">{confirmation === 'import' ? 'Загрузить резервную копию?' : confirmation === 'all' ? 'Удалить все данные?' : 'Пройти тест заново?'}</h2>
        <p className="text-slate-300 mb-6">{confirmation === 'import' ? 'Текущий прогресс заменится данными из файла. Перед заменой скачается копия текущих ответов.' : confirmation === 'all' ? `Результат теста, ответы курса, прогресс видео и профкарта будут сброшены ${CLOUD_API ? 'в этом профиле, включая облачное сохранение после синхронизации' : 'в этом браузере'}. Скачай копию, если хочешь сохранить их.` : 'Результат теста и дополнительный ИИ-разбор будут удалены. Ответы курса сохранятся.'}</p>
        <div className="flex gap-3"><Button autoFocus variant="secondary" onClick={() => setConfirmation(null)}>Отмена</Button><Button onClick={confirmReset}>{confirmation === 'import' ? 'Загрузить' : 'Продолжить'}</Button></div>
      </dialog>
    </div>
  );
};

const DashboardCard: React.FC<{ 
  title: string; 
  subtitle: string; 
  icon: React.ReactNode; 
  onClick: () => void;
  disabled?: boolean;
}> = ({ title, subtitle, icon, onClick, disabled }) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`p-5 rounded-2xl border text-left flex flex-col justify-between h-32 transition-all ${
      disabled 
      ? 'bg-slate-900/30 border-slate-800 opacity-50 cursor-not-allowed' 
      : 'bg-slate-900 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800 active:scale-95'
    }`}
  >
    <div className="flex justify-between items-start w-full">
      {icon}
      {disabled && <div className="text-[10px] uppercase font-bold tracking-wider text-slate-600 border border-slate-700 px-2 py-0.5 rounded">Закрыто</div>}
    </div>
    <div>
      <h3 className="text-white font-semibold">{title}</h3>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </div>
  </button>
);

const CheckCircleMini = () => (
  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const LockMini = () => (
  <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
)

export default App;
