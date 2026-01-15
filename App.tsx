import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, 
  GraduationCap, 
  MessageCircle, 
  Users, 
  ChevronRight, 
  Sparkles,
  ExternalLink,
  Bot,
  Cloud,
  CloudOff,
  RefreshCw
} from 'lucide-react';
import { AppView, UserState, INITIAL_COURSE_MODULES, TestResult, ARCHETYPES } from './types';
import { Button } from './components/Button';
import { TestView } from './components/TestView';
import { CourseView } from './components/CourseView';
import { GuideView } from './components/GuideView';
import { generateGraduationSummary } from './services/geminiService';
import { saveUserDataToSheet } from './services/storageService';

const CLOUD_STORAGE_KEY = 'user_progress_v1';
const LOCAL_STORAGE_KEY = 'appState_ru';

// Helper types for minified cloud state
interface MinifiedCloudState {
    v: number; // version
    ts: number; // timestamp
    tId: string | number | null; // telegramId
    nm: string | null; // name
    usr: string | null; // username (shortened key)
    onb: boolean; // onboarded
    res: { t: string, s: string, d: string } | null; // testResult (title, scoreType, timestamp)
    crs: number[]; // completed module IDs
    ai: string | null; // aiSummary
}

const packState = (state: UserState): string => {
    const minified: MinifiedCloudState = {
        v: 1,
        ts: state.lastUpdated,
        tId: state.telegramId,
        nm: state.firstName,
        usr: state.username,
        onb: state.hasOnboarded,
        res: state.testResult ? {
            t: state.testResult.title,
            s: state.testResult.scoreType,
            d: state.testResult.timestamp
        } : null,
        crs: state.courseProgress.filter(m => m.isCompleted).map(m => m.id),
        ai: state.aiSummary
    };
    return JSON.stringify(minified);
};

const unpackState = (jsonStr: string, currentLocal: UserState): UserState | null => {
    try {
        const min: MinifiedCloudState = JSON.parse(jsonStr);
        
        // Rehydrate Course Progress
        const hydratedCourse = INITIAL_COURSE_MODULES.map(m => ({
            ...m,
            isCompleted: min.crs.includes(m.id)
        }));

        // Rehydrate Test Result
        let hydratedResult: TestResult | null = null;
        if (min.res) {
            const archData = ARCHETYPES[min.res.s]; // Get static description
            hydratedResult = {
                title: min.res.t,
                scoreType: min.res.s,
                timestamp: min.res.d,
                description: archData ? archData.description.join('\n\n') : "Описание загружается..."
            };
        }

        return {
            hasOnboarded: min.onb,
            telegramId: min.tId || currentLocal.telegramId,
            firstName: min.nm || currentLocal.firstName,
            username: min.usr || currentLocal.username,
            testResult: hydratedResult,
            courseProgress: hydratedCourse,
            aiSummary: min.ai,
            lastUpdated: min.ts
        };
    } catch (e) {
        console.error("Failed to unpack cloud state", e);
        return null;
    }
};

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  
  // Инициализация состояния: Пробуем загрузить LocalStorage
  const [userState, setUserState] = useState<UserState>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Local storage parse error", e);
    }
    // Default state
    return {
      hasOnboarded: false,
      telegramId: null,
      firstName: null,
      username: null,
      testResult: null,
      courseProgress: INITIAL_COURSE_MODULES,
      aiSummary: null,
      lastUpdated: 0 
    };
  });
  
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('syncing');

  const updateUserState = (updates: Partial<UserState>) => {
    setUserState(prev => {
      const newState = { 
        ...prev, 
        ...updates,
        lastUpdated: Date.now() 
      };
      return newState;
    });
  };

  // 1. Инициализация Telegram WebApp и СИНХРОНИЗАЦИЯ
  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      
      try { tg.expand(); } catch (e) {}

      const user = tg.initDataUnsafe?.user;

      if (user) {
        const isCloudStorageSupported = tg.isVersionAtLeast && tg.isVersionAtLeast('6.9');

        if (isCloudStorageSupported) {
          console.log("CloudStorage supported, fetching...");
          tg.CloudStorage.getItem(CLOUD_STORAGE_KEY, (err, value) => {
            if (!err && value) {
              console.log("Cloud data found");
              setUserState(localState => {
                  const cloudState = unpackState(value, localState);
                  if (!cloudState) return localState;

                  // MERGE LOGIC
                  // 1. If cloud has result and local doesn't -> use Cloud
                  // 2. If cloud is newer -> use Cloud
                  const shouldUseCloud = 
                      (cloudState.testResult && !localState.testResult) ||
                      (cloudState.lastUpdated > (localState.lastUpdated || 0));

                  if (shouldUseCloud) {
                    console.log("Using Cloud State");
                    setSyncStatus('synced');
                    return {
                      ...cloudState,
                      telegramId: user.id, 
                      firstName: user.first_name,
                      username: user.username || null
                    };
                  } else {
                    console.log("Using Local State");
                    setSyncStatus('synced');
                    return {
                      ...localState,
                      telegramId: user.id,
                      firstName: user.first_name,
                      username: user.username || null
                    };
                  }
              });
            } else {
              console.log("No cloud data or empty");
              // Initialize ID if needed
              updateUserState({ 
                telegramId: user.id, 
                firstName: user.first_name, 
                username: user.username || null 
              });
              setSyncStatus('synced');
            }
            setIsSyncing(false);
          });
        } else {
          // No cloud support
          updateUserState({ 
            telegramId: user.id, 
            firstName: user.first_name,
            username: user.username || null 
          });
          setIsSyncing(false);
          setSyncStatus('error');
        }
      } else {
        setIsSyncing(false);
        setSyncStatus('synced');
      }
    } else {
      setIsSyncing(false);
      setSyncStatus('synced');
    }
  }, []);

  // 2. Сохранение (Debounced via Effect)
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userState));

    if (window.Telegram && window.Telegram.WebApp && userState.lastUpdated > 0) {
      const tg = window.Telegram.WebApp;
      const isCloudStorageSupported = tg.isVersionAtLeast && tg.isVersionAtLeast('6.9');

      if (isCloudStorageSupported) {
        setSyncStatus('syncing');
        const packed = packState(userState);
        
        // Safety check for size (limit is 4096 chars)
        if (packed.length > 4000) {
            console.error("State too large for CloudStorage!", packed.length);
            setSyncStatus('error');
            return;
        }

        tg.CloudStorage.setItem(
          CLOUD_STORAGE_KEY, 
          packed, 
          (err, stored) => {
            if (err) {
                console.error("Cloud save error:", err);
                setSyncStatus('error');
            } else {
                setSyncStatus('synced');
            }
          }
        );
      }
    }
  }, [userState]);


  // --- Actions ---

  const handleStartJourney = () => {
    if (userState.hasOnboarded) {
      setView(AppView.DASHBOARD);
    } else {
      setView(AppView.ONBOARDING);
    }
  };

  const handleOnboardingComplete = () => {
    const updates = { hasOnboarded: true };
    updateUserState(updates);
    setView(AppView.DASHBOARD);
    saveUserDataToSheet({ ...userState, ...updates });
  };

  const handleTestComplete = (result: TestResult) => {
    const updates = { testResult: result };
    updateUserState(updates);
    saveUserDataToSheet({ ...userState, ...updates });
    setView(AppView.GUIDE);
  };

  const handleCourseProgress = (moduleId: number) => {
    const newProgress = userState.courseProgress.map(m => 
      m.id === moduleId ? { ...m, isCompleted: true } : m
    );
    updateUserState({ courseProgress: newProgress });
  };

  const handleGenerateSummary = async () => {
    if (!userState.testResult) return;
    setIsGeneratingAi(true);
    const summary = await generateGraduationSummary(userState.testResult, userState.courseProgress);
    
    const updates = { aiSummary: summary };
    updateUserState(updates);
    saveUserDataToSheet({ ...userState, ...updates });
    
    setIsGeneratingAi(false);
    setView(AppView.AI_SUMMARY);
  };

  const handleOpenResult = () => {
    if (userState.testResult) {
      setView(AppView.GUIDE);
    } else {
      setView(AppView.TEST);
    }
  };

  const handleRetakeTest = () => {
      const doReset = () => {
          const updates = { testResult: null, aiSummary: null };
          updateUserState(updates);
          saveUserDataToSheet({ ...userState, ...updates });
          setView(AppView.TEST);
      };
  
      const tg = window.Telegram?.WebApp;
      if (tg && tg.showPopup && tg.isVersionAtLeast && tg.isVersionAtLeast('6.2')) {
          tg.showPopup({
              title: 'Начать заново?',
              message: 'Твой текущий результат и ИИ-вывод будут удалены. Ты уверен?',
              buttons: [
                  {id: 'yes', type: 'destructive', text: 'Да, сбросить'},
                  {id: 'no', type: 'cancel', text: 'Отмена'}
              ]
          }, (btnId) => {
              if (btnId === 'yes') doReset();
          });
      } else {
          if (window.confirm('Сбросить результат и пройти тест заново?')) {
              doReset();
          }
      }
  };

  const handleCourseLocked = () => {
    showPopup("Скоро открытие! 🚀", "Этот курс сейчас готовится. Мы сообщим, когда он станет доступен!");
  };

  const handleCommunityLocked = () => {
    showPopup("Скоро открытие! 🔒", "Закрытый клуб для твоего архетипа сейчас формируется.");
  };

  const showPopup = (title: string, message: string) => {
    const tg = window.Telegram?.WebApp;
    if (tg && tg.showPopup && tg.isVersionAtLeast && tg.isVersionAtLeast('6.2')) {
       tg.showPopup({ title, message, buttons: [{type: "ok"}] });
    } else {
       alert(`${title}\n${message}`);
    }
  };

  const handleOpenTelegramLink = (url: string) => {
    const tg = window.Telegram?.WebApp;
    // t.me links should be opened via openTelegramLink to work correctly on Desktop
    if (tg && tg.openTelegramLink && (url.startsWith('https://t.me') || url.startsWith('tg://'))) {
        tg.openTelegramLink(url);
    } else if (tg && tg.openLink) {
        tg.openLink(url);
    } else {
        window.open(url, '_blank');
    }
  };

  // --- Views ---

  if (isSyncing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <Sparkles className="w-10 h-10 text-amber-400 animate-spin" />
          <p className="animate-pulse text-sm text-slate-400">Синхронизация миров...</p>
        </div>
      </div>
    );
  }

  const CloudIndicator = () => (
      <div className="absolute top-4 right-4 z-50 transition-opacity opacity-70 hover:opacity-100" title="Cloud Sync Status">
          {syncStatus === 'synced' && <Cloud className="w-5 h-5 text-green-500" />}
          {syncStatus === 'syncing' && <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />}
          {syncStatus === 'error' && <CloudOff className="w-5 h-5 text-red-500" />}
      </div>
  );

  const renderLanding = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      <CloudIndicator />
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

      <div className="max-w-2xl z-10 space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/50 border border-slate-800 text-indigo-400 text-sm font-medium animate-fade-in-up">
          <Sparkles className="w-4 h-4" />
          <span>Будущее твоего роста</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-serif font-bold bg-clip-text text-transparent bg-gradient-to-b from-amber-100 to-amber-500 tracking-tight leading-tight">
          Раскрой Свой <br/> Истинный Потенциал
        </h1>
        
        <p className="text-xl text-slate-400 max-w-lg mx-auto leading-relaxed">
          {userState.firstName ? `Привет, ${userState.firstName}! ` : ''} 
          Пройди психометрический тест, освой эксклюзивный курс и получи ИИ-наставничество.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Button onClick={handleStartJourney} variant="fantasy" className="text-lg px-8 py-4">
            Начать Путь <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );

  const renderOnboarding = () => (
    <div className="min-h-screen flex flex-col p-6 max-w-md mx-auto relative">
      <CloudIndicator />
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
            <p>Твой Telegram ID: <span className="font-mono text-amber-400">{userState.telegramId || 'Browser'}</span></p>
            <p>Здесь ты узнаешь свой архетип, прокачаешь навыки и найдешь единомышленников.</p>
          </div>
        </div>
      </div>
      
      <Button onClick={handleOnboardingComplete} fullWidth className="py-4 text-lg animate-pulse" variant="fantasy">
        Поехали
      </Button>
    </div>
  );

  const renderDashboard = () => (
    <div className="min-h-screen p-6 pb-24 relative">
      <CloudIndicator />
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

      <div 
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
              : "Пройди тест, чтобы раскрыть свои истинные сильные стороны."}
          </p>
          
          {!userState.testResult ? (
            <Button variant="fantasy" className="shadow-none pointer-events-none">
              Начать Тест
            </Button>
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
          subtitle="Скоро запуск"
          icon={<GraduationCap className="w-6 h-6 text-slate-400" />}
          onClick={handleCourseLocked}
        />
        <DashboardCard 
          title="ИИ Вывод" 
          subtitle={userState.aiSummary ? "Готов" : "Закрыт"}
          icon={<Sparkles className="w-6 h-6 text-amber-400" />}
          onClick={() => setView(AppView.AI_SUMMARY)}
          disabled={!userState.aiSummary}
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

  const renderAiSummary = () => (
    <div className="min-h-screen p-6 flex flex-col">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => setView(AppView.DASHBOARD)} className="pl-0 hover:bg-transparent">
          ← Хаб
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-8 animate-fade-in">
        <div className="w-20 h-20 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-2xl rotate-3 flex items-center justify-center shadow-2xl shadow-orange-500/20">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        
        <div>
          <h2 className="text-3xl font-serif font-bold text-white mb-2">Вердикт Мастера</h2>
          <p className="text-slate-400">Сгенерировано специально для архетипа {userState.testResult?.title}</p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl text-left relative shadow-2xl">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-2xl"></div>
           <p className="text-slate-200 leading-loose text-lg font-light">
             {userState.aiSummary}
           </p>
           <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
             <span>ИИ Анализ</span>
             <span>Gemini 3 Powered</span>
           </div>
        </div>

        <div className="w-full pt-8 space-y-4">
           <Button fullWidth onClick={() => setView(AppView.CONSULTATION)} variant="fantasy">
             Следующий шаг (Консультация)
           </Button>
           <Button variant="secondary" fullWidth onClick={() => setView(AppView.COMMUNITY)}>
             Поделиться в Сообществе
           </Button>
        </div>
      </div>
    </div>
  );

  const renderConsultation = () => {
    const message = "Привет! 👋 Хочу на консультацию. Помоги разобраться с результатами теста!";
    const tgLink = `https://t.me/Daniil_Borisov?text=${encodeURIComponent(message)}`;

    return (
      <div className="min-h-screen p-6 flex flex-col">
         <Button variant="ghost" onClick={() => setView(AppView.DASHBOARD)} className="self-start pl-0 mb-8">
            ← Назад
          </Button>
          
          <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 text-center space-y-6">
            <div className="w-24 h-24 bg-slate-800 rounded-full mx-auto overflow-hidden border-4 border-slate-700">
               <img src="https://picsum.photos/200/200" alt="Mentor" className="w-full h-full object-cover grayscale opacity-80" />
            </div>
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
    <div className="min-h-screen p-6 flex flex-col">
       <Button variant="ghost" onClick={() => setView(AppView.DASHBOARD)} className="self-start pl-0 mb-8">
          ← Назад
        </Button>

        <h2 className="text-2xl font-serif font-bold text-white mb-6">Вступай в Племя</h2>
        
        <div className="space-y-4">
          <div onClick={() => handleOpenTelegramLink("https://t.me/sense_house")} className="block group cursor-pointer">
             <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex items-center justify-between hover:border-indigo-500 transition-all">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-500/20 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Общее Сообщество</h3>
                    <p className="text-sm text-slate-400">Связь со всеми участниками</p>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-slate-600 group-hover:text-white" />
             </div>
          </div>

          {userState.testResult && (
            <div 
                onClick={handleCommunityLocked}
                className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex items-center justify-between group cursor-pointer hover:border-purple-500/50 transition-all opacity-80 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 px-2 py-1 bg-amber-500/10 border-b-2 border-l-2 border-amber-500/20 rounded-bl-lg text-[10px] font-bold text-amber-500 tracking-wider">
                 СКОРО
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-purple-500/10 p-3 rounded-lg grayscale opacity-70">
                  <BrainCircuit className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Круг: {userState.testResult.title}</h3>
                  <p className="text-sm text-slate-500">Закрытый канал</p>
                </div>
              </div>
              <LockMini />
            </div>
          )}
        </div>
    </div>
  );

  return (
    <div className="min-h-screen text-slate-200 font-sans selection:bg-indigo-500/30">
      {view === AppView.LANDING && renderLanding()}
      {view === AppView.ONBOARDING && renderOnboarding()}
      {view === AppView.DASHBOARD && renderDashboard()}
      {view === AppView.GUIDE && userState.testResult && (
        <GuideView 
          archetype={userState.testResult.scoreType} 
          onBack={() => setView(AppView.DASHBOARD)} 
          onStartCourse={handleCourseLocked} 
        />
      )}
      {view === AppView.TEST && (
        <TestView 
          onComplete={handleTestComplete} 
          onCancel={() => setView(AppView.DASHBOARD)} 
        />
      )}
      {view === AppView.COURSE && (
        <CourseView 
          modules={userState.courseProgress}
          onCompleteCourse={handleGenerateSummary}
          onBack={() => setView(AppView.DASHBOARD)}
          isGeneratingAi={isGeneratingAi}
        />
      )}
      {view === AppView.AI_SUMMARY && renderAiSummary()}
      {view === AppView.CONSULTATION && renderConsultation()}
      {view === AppView.COMMUNITY && renderCommunity()}
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
