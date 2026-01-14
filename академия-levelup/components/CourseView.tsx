import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Lock, CheckCircle, Play, Star, 
  Shield, Brain, Zap, Trophy, Heart, Briefcase 
} from 'lucide-react';
import { Button } from './Button';

// --- DATA CONSTANTS ---

const SPHERES_DATA = [
    { id: "it", icon: "💻", title: "IT и технологии", desc: "Код, игры, дизайн и кибербезопасность.", jobs: ["Программист", "Разработчик игр", "UX/UI-дизайнер", "Кибербезопасность", "Системный администратор", "Product Manager"] },
    { id: "health", icon: "💊", title: "Здоровье и спорт", desc: "Помощь людям, медицина, фитнес.", jobs: ["Врач", "Фитнес-тренер", "Диетолог", "Психолог", "Хирург", "Фармацевт"] },
    { id: "art", icon: "🎨", title: "Творчество и медиа", desc: "Дизайн, видео, музыка и блоги.", jobs: ["Иллюстратор", "Сценарист", "Блогер", "Музыкант", "Фотограф", "Режиссер"] },
    { id: "edu", icon: "📚", title: "Образование и социум", desc: "Обучение и помощь людям.", jobs: ["Учитель", "Психолог", "Коуч", "Логопед", "Тьютор", "Бизнес-тренер"] },
    { id: "build", icon: "🏗️", title: "Строительство", desc: "Создание зданий и пространств.", jobs: ["Архитектор", "Инженер-строитель", "Дизайнер интерьера", "Урбанист", "Ландшафтный дизайнер", "Риелтор"] },
    { id: "science", icon: "🧪", title: "Наука и природа", desc: "Исследования, химия и космос.", jobs: ["Биолог", "Эколог", "Химик", "Агроном", "Генетик", "Астроном"] },
    { id: "travel", icon: "✈️", title: "Путешествия", desc: "Туризм, рестораны и ивенты.", jobs: ["Гид", "Шеф-повар", "Event-менеджер", "Отельер", "Бортпроводник", "Администратор ресторана"] },
    { id: "security", icon: "🛡️", title: "Безопасность", desc: "Спасение жизней и защита.", jobs: ["Сотрудник МЧС", "Пилот", "Пожарный", "Криминалист", "Телохранитель", "Военный"] },
    { id: "energy", icon: "⚡", title: "Энергетика", desc: "Ресурсы, нефть и атом.", jobs: ["Энергетик", "Геолог", "Инженер АЭС", "Нефтяник", "Электромонтажник", "Инженер по бурению"] },
    { id: "biz", icon: "💼", title: "Бизнес и финансы", desc: "Управление, маркетинг и деньги.", jobs: ["Предприниматель", "Менеджер", "Маркетолог", "Финансист", "Sales-менеджер", "Логист"] }
];

const QUIZ_DATA = [
    { q: "Я создаю миры, где сражаются драконы. Кто я?", answers: ["Гейм-дизайнер", "Иллюстратор", "Сценарист"], correct: 0, feedback: "Гейм-дизайнер создает правила. Иллюстратор рисует." },
    { q: "Я управляю командой, слежу за сроками, но риск и прибыль — не моя забота.", answers: ["Предприниматель", "Project Менеджер", "Финансист"], correct: 1, feedback: "Предприниматель рискует деньгами, а Project Manager управляет процессом." },
    { q: "Я лечу животных, даже если они кусаются.", answers: ["Ветеринар", "Эколог", "Зоолог"], correct: 0, feedback: "Ветеринар — это врач для зверей." }
];

const VALUES_LIST = ["Семья", "Любовь", "Здоровье", "Интересная работа", "Друзья", "Творчество", "Признание", "Гармония", "Деньги", "Самореализация", "Свобода", "Власть"];

const SKILLS_QUESTIONS = [
    {
        title: "Мышление",
        q: "Завтра сдача сложного проекта. Твои действия?",
        opts: [
            { t: "Разделю на шаги и пойду по порядку", type: "Структурный", fb: "Твоя сила — порядок. Тебя зовут, чтобы разложить хаос по полочкам." },
            { t: "Создам план и найду помощников", type: "Командный", fb: "Ты стратег. Видишь цель, собираешь союзников и вперед." },
            { t: "Сначала паника, потом работа", type: "Реалист", fb: "Классика! Сначала эмоции, потом решимость. Тролль одобряет." },
            { t: "Посмотрю в потолок... идея придет", type: "Созерцатель", fb: "Твоя суперсила — озарение. Думаешь через космос." },
            { t: "Найду способ сделать проще и быстрее", type: "Хакер", fb: "Хитрец! Оптимизатор. Главное — результат, а не инструкция." }
        ]
    },
    {
        title: "Команда",
        q: "В команде все спорят и тянут в разные стороны. Ты?",
        opts: [
            { t: "Всех выслушаю и помирю", type: "Дипломат", fb: "Спаситель школьных чатов и нервных клеток." },
            { t: "Сделаю часть сам — так надежнее", type: "Одиночка", fb: "Соло-волк. Хочешь сделать хорошо — сделай сам." },
            { t: "Раздам всем задачи и скажу «Погнали»", type: "Организатор", fb: "Лидер от природы. У тебя всегда есть план Б." },
            { t: "Подстроюсь, лишь бы закончить", type: "Гибкий", fb: "Адаптер. Ты просто хочешь, чтобы все получилось." },
            { t: "Возьму ответственность на себя", type: "Лидер", fb: "Лидер с характером. Вижу цель — не вижу препятствий." }
        ]
    },
    {
        title: "Обучение",
        q: "Тебе нужно освоить магию рун (или новый язык) за месяц. Как?",
        opts: [
            { t: "Куплю учебник, выучу теорию", type: "Теоретик", fb: "Системный подход. Ты строишь фундамент." },
            { t: "Сразу начну колдовать (методом тыка)", type: "Практик", fb: "Учеба через ошибки. Самый быстрый путь." },
            { t: "Найду Верховного Мага (наставника)", type: "Ученик", fb: "Мудрость других — твой ресурс." },
            { t: "Подсмотрю, как делают другие", type: "Наблюдатель", fb: "Ты умеешь копировать и улучшать." }
        ]
    }
];

const CRISIS_QUESTIONS = [
    { q: "1/4: ЧП! Ведущий заболел, колонка сломалась. До начала 15 минут.", opts: [{ t: "Возьму все на себя + попрошу помощи", type: "Менеджер" }, { t: "Решу главное, на мелочи забью", type: "Минималист" }, { t: "Найду замену и технику", type: "Координатор" }, { t: "Повозмущаюсь, потом соберусь", type: "Боец" }] },
    { q: "2/4: Друзья в команде поссорились и не хотят работать вместе.", opts: [{ t: "Разведу их по разным углам/задачам", type: "Дипломат" }, { t: "Скажу: 'Соберитесь, работа стоит!'", type: "Лидер" }, { t: "Попробую помирить шуткой", type: "Душа компании" }, { t: "Буду работать за них, пока они дуются", type: "Трудяга" }] },
    { q: "3/4: Ты забыл флешку с презентацией дома! Выступать через 5 минут.", opts: [{ t: "Расскажу без слайдов, на харизме", type: "Оратор" }, { t: "Попрошу перенести меня в конец списка", type: "Хитрец" }, { t: "Быстро нарисую схему на доске", type: "Креативщик" }, { t: "Честно признаюсь учителю", type: "Честный" }] },
    { q: "4/4: Интернет отключился прямо во время важной онлайн-игры (турнира).", opts: [{ t: "Раздам интернет с телефона (Hotspot)", type: "Технарь" }, { t: "Ударю по роутеру (вдруг поможет)", type: "Шаман" }, { t: "Спокойно пойду пить чай", type: "Дзен-мастер" }, { t: "Буду звонить провайдеру и кричать", type: "Боец" }] }
];

interface CourseViewProps {
  modules?: any[]; // Legacy prop
  onUpdateProgress?: (id: number) => void; // Legacy prop
  onCompleteCourse: () => void;
  onBack: () => void;
  isGeneratingAi: boolean;
}

// --- SUBCOMPONENTS ---

const VideoPlaceholder: React.FC<{ label: string }> = ({ label }) => (
  <div className="w-full h-48 bg-black rounded-xl flex items-center justify-center mb-6 border border-slate-700 shadow-lg relative overflow-hidden group cursor-pointer">
    {/* Fake Thumbnail Gradient */}
    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-indigo-900 opacity-60"></div>
    
    <div className="relative z-10 flex flex-col items-center gap-2 transform group-hover:scale-110 transition-transform duration-300">
      <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
        <Play className="w-8 h-8 text-white fill-current ml-1" />
      </div>
      <span className="font-bold tracking-widest text-white text-sm uppercase">{label}</span>
    </div>
  </div>
);

const Toast: React.FC<{ message: string | null }> = ({ message }) => {
  if (!message) return null;
  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-900/90 text-white px-6 py-4 rounded-xl border border-indigo-500 shadow-[0_0_30px_rgba(0,0,0,0.5)] z-[100] text-center animate-fade-in text-lg font-medium backdrop-blur-md">
      {message}
    </div>
  );
};

export const CourseView: React.FC<CourseViewProps> = ({ 
  onCompleteCourse, 
  onBack,
  isGeneratingAi
}) => {
  // Game State
  const [activeStage, setActiveStage] = useState<number | null>(null);
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const [xp, setXp] = useState(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  
  // Stage 1 State
  const [s1CardIndex, setS1CardIndex] = useState(0);
  const [s1SelectedSpheres, setS1SelectedSpheres] = useState<string[]>([]);
  const [s1QuizIndex, setS1QuizIndex] = useState(0);
  const [s1Phase, setS1Phase] = useState<'intro' | 'tinder' | 'filter' | 'quiz_intro' | 'quiz' | 'done'>('intro');
  const [s1QuizFeedback, setS1QuizFeedback] = useState<string | null>(null);

  // Stage 2 State
  const [s2Phase, setS2Phase] = useState<'intro' | 'swot1' | 'swot2' | 'swot3' | 'swot4' | 'values' | 'age' | 'gifts' | 'done'>('intro');
  const [s2Values, setS2Values] = useState<string[]>([]);
  const [s2Inputs, setS2Inputs] = useState({ s: '', w: '', o: '', t: '', age: '', gift: '' });

  // Stage 3 State
  const [s3Phase, setS3Phase] = useState<'intro' | 'q1' | 'q2' | 'q3' | 'crisis_intro' | 'crisis' | 'done'>('intro');
  const [s3Thinking, setS3Thinking] = useState('');
  const [s3Team, setS3Team] = useState('');
  const [s3Learning, setS3Learning] = useState('');
  const [s3CrisisIdx, setS3CrisisIdx] = useState(0);
  const [s3Timer, setS3Timer] = useState(20);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper: Open Stage
  const openStage = (idx: number) => {
    // Check lock
    if (idx > 0 && !completedStages.includes(idx - 1)) return;
    setActiveStage(idx);
  };

  // Helper: Finish Stage
  const finishStage = (idx: number, reward: number) => {
    if (!completedStages.includes(idx)) {
        setCompletedStages(prev => [...prev, idx]);
        setXp(prev => prev + reward);
    }
    setActiveStage(null);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2000);
  };

  // --- RENDERERS ---

  const renderHeader = () => (
    <div className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-20 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
                <h2 className="font-serif font-bold text-white text-lg leading-tight">Путь Мастера</h2>
                <div className="text-xs text-slate-400">Ранг: {xp > 100 ? 'Магистр' : xp > 50 ? 'Искатель' : 'Новичок'}</div>
            </div>
        </div>
        <div className="flex flex-col items-end w-32">
            <div className="flex justify-between w-full text-xs font-bold text-indigo-400 mb-1">
                <span>XP</span>
                <span>{xp}/500</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500" 
                    style={{ width: `${(xp / 500) * 100}%` }}
                ></div>
            </div>
        </div>
    </div>
  );

  const renderMap = () => {
    const stages = [
        { id: 0, title: "Этап 1: Интересы", icon: <Heart className="w-6 h-6" />, desc: "Исследование земель" },
        { id: 1, title: "Этап 2: Личность", icon: <Brain className="w-6 h-6" />, desc: "Зеркало души" },
        { id: 2, title: "Этап 3: Навыки", icon: <Shield className="w-6 h-6" />, desc: "Турнир мастеров" },
        { id: 3, title: "Финал: Профкарта", icon: <Trophy className="w-6 h-6" />, desc: "Судьба героя" },
    ];

    return (
        <div className="p-6 max-w-lg mx-auto space-y-8 relative">
            {/* Connecting Line */}
            <div className="absolute left-10 top-10 bottom-20 w-1 bg-slate-800 z-0"></div>

            {stages.map((stage, idx) => {
                const isLocked = idx > 0 && !completedStages.includes(idx - 1);
                const isCompleted = completedStages.includes(idx);
                const isActive = !isLocked && !isCompleted;

                return (
                    <div 
                        key={idx} 
                        onClick={() => openStage(idx)}
                        className={`relative z-10 flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                            isLocked 
                                ? 'bg-slate-900 border-slate-800 opacity-60 grayscale' 
                                : isCompleted
                                    ? 'bg-slate-900 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                                    : 'bg-slate-800 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)] scale-105'
                        }`}
                    >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 shrink-0 ${
                            isCompleted ? 'bg-green-900/30 border-green-500 text-green-400' :
                            isLocked ? 'bg-slate-800 border-slate-700 text-slate-500' :
                            'bg-amber-900/30 border-amber-500 text-amber-400 animate-pulse'
                        }`}>
                            {isCompleted ? <CheckCircle className="w-6 h-6" /> : isLocked ? <Lock className="w-5 h-5" /> : stage.icon}
                        </div>
                        <div>
                            <h3 className={`font-bold ${isLocked ? 'text-slate-500' : 'text-white'}`}>{stage.title}</h3>
                            <p className="text-sm text-slate-400">{stage.desc}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
  };

  // --- STAGE 1 RENDER ---
  const renderStage1 = () => {
    if (s1Phase === 'intro') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 animate-fade-in">
                <VideoPlaceholder label="ВИДЕО СТАРТ" />
                <h2 className="text-3xl font-serif font-bold text-white mb-4">Привет, Герой! 👋</h2>
                <p className="text-slate-300 mb-8 max-w-sm">
                   Свайпай 10 сфер! Лайкай то, что интересно. Твой выбор определит путь.
                </p>
                <Button variant="fantasy" onClick={() => setS1Phase('tinder')}>Погнали! 🚀</Button>
            </div>
        );
    }

    if (s1Phase === 'tinder') {
        if (s1CardIndex >= SPHERES_DATA.length) {
            // Auto transition to filter or next
            setTimeout(() => {
                if (s1SelectedSpheres.length > 3) setS1Phase('filter');
                else if (s1SelectedSpheres.length === 0) {
                    setS1CardIndex(0); // Restart
                } else {
                    setS1Phase('quiz_intro');
                }
            }, 500);
            return <div className="p-10 text-center text-white">Обработка...</div>;
        }

        const card = SPHERES_DATA[s1CardIndex];
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 animate-fade-in">
                <div className="text-slate-400 mb-4 text-sm">Карта {s1CardIndex + 1} из {SPHERES_DATA.length}</div>
                <div className="w-full max-w-xs bg-white text-slate-900 rounded-2xl p-8 text-center shadow-2xl border-4 border-indigo-200 h-96 flex flex-col items-center justify-center relative">
                    <div className="text-6xl mb-4">{card.icon}</div>
                    <h3 className="text-2xl font-bold mb-2">{card.title}</h3>
                    <p className="text-slate-600">{card.desc}</p>
                </div>
                <div className="flex gap-4 mt-8 w-full max-w-xs">
                    <Button 
                        variant="secondary" 
                        fullWidth 
                        onClick={() => setS1CardIndex(prev => prev + 1)}
                        className="border-red-400 text-red-400 hover:bg-red-950/30"
                    >
                        Мимо
                    </Button>
                    <Button 
                        variant="primary" 
                        fullWidth 
                        onClick={() => {
                            setS1SelectedSpheres(prev => [...prev, card.id]);
                            setS1CardIndex(prev => prev + 1);
                        }}
                        className="bg-green-600 hover:bg-green-500"
                    >
                        Лайк
                    </Button>
                </div>
            </div>
        );
    }

    if (s1Phase === 'filter') {
        return (
            <div className="p-6 h-full flex flex-col items-center">
                <h3 className="text-2xl font-bold text-white mb-2">Рюкзак переполнен!</h3>
                <p className="text-slate-400 mb-6 text-center">Оставь только 3 самые важные сферы.</p>
                <div className="w-full max-w-md space-y-3 flex-1 overflow-y-auto">
                    {s1SelectedSpheres.map(id => {
                        const item = SPHERES_DATA.find(s => s.id === id);
                        return (
                            <div key={id} className="bg-slate-800 p-4 rounded-xl flex justify-between items-center border border-slate-700">
                                <span className="text-white font-medium flex items-center gap-2">
                                    <span className="text-2xl">{item?.icon}</span> {item?.title}
                                </span>
                                <button 
                                    onClick={() => setS1SelectedSpheres(prev => prev.filter(s => s !== id))}
                                    className="text-red-400 hover:bg-red-900/30 p-2 rounded-lg"
                                >
                                    Убрать
                                </button>
                            </div>
                        );
                    })}
                </div>
                <div className="mt-4 w-full max-w-md">
                    <p className="text-center mb-2 text-sm text-slate-500">Выбрано: {s1SelectedSpheres.length}</p>
                    <Button 
                        fullWidth 
                        disabled={s1SelectedSpheres.length > 3 || s1SelectedSpheres.length === 0}
                        onClick={() => setS1Phase('quiz_intro')}
                    >
                        Готово
                    </Button>
                </div>
            </div>
        );
    }

    if (s1Phase === 'quiz_intro') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 animate-fade-in">
                <Zap className="w-20 h-20 text-amber-400 mb-6 animate-pulse" />
                <h2 className="text-3xl font-serif font-bold text-white mb-4">Проверка Знаний 🤔</h2>
                <p className="text-slate-300 mb-8 max-w-sm">
                    А ты знаешь, что они делают? Проверим!
                </p>
                <Button variant="fantasy" onClick={() => setS1Phase('quiz')}>К загадкам</Button>
            </div>
        );
    }

    if (s1Phase === 'quiz') {
        if (s1QuizIndex >= QUIZ_DATA.length) {
            setS1Phase('done');
            return null;
        }
        const q = QUIZ_DATA[s1QuizIndex];
        
        return (
            <div className="p-6 h-full flex flex-col justify-center max-w-md mx-auto animate-fade-in">
                <div className="mb-8">
                    <span className="text-indigo-400 font-bold tracking-wider text-xs uppercase">Загадка {s1QuizIndex + 1}</span>
                    <h3 className="text-xl font-medium text-white mt-2 leading-relaxed">"{q.q}"</h3>
                </div>
                <div className="space-y-3">
                    {q.answers.map((ans, idx) => (
                        <button
                            key={idx}
                            disabled={!!s1QuizFeedback}
                            onClick={() => {
                                const isCorrect = idx === q.correct;
                                setS1QuizFeedback(isCorrect ? "Верно! +10 XP" : "Не совсем...");
                                if (isCorrect) setXp(x => x + 10);
                            }}
                            className={`w-full p-4 rounded-xl text-left border transition-all ${
                                s1QuizFeedback
                                    ? idx === q.correct 
                                        ? 'bg-green-900/40 border-green-500 text-green-200' 
                                        : 'bg-slate-800 border-slate-700 text-slate-500'
                                    : 'bg-slate-800 border-slate-700 hover:border-indigo-500 text-slate-200'
                            }`}
                        >
                            {ans}
                        </button>
                    ))}
                </div>
                {s1QuizFeedback && (
                    <div className="mt-6 animate-fade-in">
                        <div className="p-4 bg-slate-800 rounded-lg border-l-4 border-indigo-500 mb-4 text-slate-300 text-sm">
                            {q.feedback}
                        </div>
                        <Button fullWidth onClick={() => {
                            setS1QuizFeedback(null);
                            if (s1QuizIndex + 1 < QUIZ_DATA.length) setS1QuizIndex(prev => prev + 1);
                            else setS1Phase('done');
                        }}>
                            Далее
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    if (s1Phase === 'done') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 animate-fade-in">
                <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="w-12 h-12 text-green-400" />
                </div>
                <h2 className="text-3xl font-serif font-bold text-white mb-2">Этап 1 Пройден! 🎉</h2>
                <p className="text-slate-300 mb-8">Интересы сохранены.</p>
                <div className="text-4xl font-bold text-amber-400 mb-8 drop-shadow-glow">+50 XP</div>
                <Button variant="fantasy" onClick={() => finishStage(0, 50)}>На карту</Button>
            </div>
        );
    }
    return null;
  };

  // --- STAGE 2 RENDER ---
  const renderStage2 = () => {
    const saveInput = (key: string, val: string) => setS2Inputs(prev => ({ ...prev, [key]: val }));

    if (s2Phase === 'intro') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 animate-fade-in">
                <VideoPlaceholder label="ВИДЕО ЛИЧНОСТЬ" />
                <h2 className="text-3xl font-serif font-bold text-white mb-4">Зеркало Души 🪞</h2>
                <p className="text-slate-300 mb-8 max-w-sm">
                    Герой должен знать свою силу и слабость. Загляни в зеркальные пруды!
                </p>
                <Button variant="fantasy" onClick={() => setS2Phase('swot1')}>Смотреть в воду</Button>
            </div>
        );
    }

    // Generic Input Step Component
    const InputStep = ({ title, desc, placeholder, valKey, nextPhase }: any) => (
        <div className="p-6 h-full flex flex-col justify-center max-w-md mx-auto animate-fade-in">
            <h3 className="text-2xl font-serif font-bold text-white mb-2">{title}</h3>
            <p className="text-slate-400 mb-6">{desc}</p>
            <textarea 
                className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl p-4 text-white focus:border-purple-500 outline-none h-32 mb-6"
                placeholder={placeholder}
                value={s2Inputs[valKey as keyof typeof s2Inputs]}
                onChange={(e) => saveInput(valKey, e.target.value)}
            />
            <Button 
                fullWidth 
                disabled={s2Inputs[valKey as keyof typeof s2Inputs].length < 2}
                onClick={() => setS2Phase(nextPhase)}
            >
                Далее
            </Button>
        </div>
    );

    if (s2Phase === 'swot1') return <InputStep title="Твоя Сила 💪" desc="В чем ты хорош? Что хвалят другие?" placeholder="Быстро учусь, умею рисовать..." valKey="s" nextPhase="swot2" />;
    if (s2Phase === 'swot2') return <InputStep title="Слабые места 🧠" desc="Что дается с трудом? Где нужна помощь?" placeholder="Лень, боюсь выступать..." valKey="w" nextPhase="swot3" />;
    if (s2Phase === 'swot3') return <InputStep title="Возможности 🔓" desc={`Как использовать твою силу: "${s2Inputs.s}"?`} placeholder="Могу стать дизайнером..." valKey="o" nextPhase="swot4" />;
    if (s2Phase === 'swot4') return <InputStep title="Угрозы ⚠️" desc={`Что помешает из-за слабости: "${s2Inputs.w}"?`} placeholder="Завалю экзамен..." valKey="t" nextPhase="values" />;

    if (s2Phase === 'values') {
        return (
            <div className="p-6 h-full flex flex-col items-center">
                <h3 className="text-2xl font-serif font-bold text-white mb-2">Твои Ценности ✨</h3>
                <p className="text-slate-400 mb-6">Выбери 5 самых важных.</p>
                <div className="flex flex-wrap gap-2 justify-center mb-8">
                    {VALUES_LIST.map(v => {
                        const isSelected = s2Values.includes(v);
                        return (
                            <button
                                key={v}
                                onClick={() => {
                                    if (isSelected) setS2Values(prev => prev.filter(i => i !== v));
                                    else if (s2Values.length < 5) setS2Values(prev => [...prev, v]);
                                }}
                                className={`px-4 py-2 rounded-full text-sm transition-all border ${
                                    isSelected 
                                        ? 'bg-purple-600 border-purple-500 text-white scale-105 shadow-lg' 
                                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                                }`}
                            >
                                {v}
                            </button>
                        );
                    })}
                </div>
                <Button 
                    fullWidth 
                    disabled={s2Values.length !== 5}
                    onClick={() => setS2Phase('age')}
                >
                    Готово ({s2Values.length}/5)
                </Button>
            </div>
        );
    }

    if (s2Phase === 'age') {
        return (
            <div className="p-6 h-full flex flex-col justify-center max-w-md mx-auto animate-fade-in text-center">
                <h3 className="text-2xl font-serif font-bold text-white mb-6">Сколько тебе лет? 🎂</h3>
                <input 
                    type="number" 
                    className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl p-4 text-white text-center text-2xl focus:border-purple-500 outline-none mb-6"
                    placeholder="18"
                    value={s2Inputs.age}
                    onChange={(e) => saveInput('age', e.target.value)}
                />
                <Button fullWidth disabled={!s2Inputs.age} onClick={() => setS2Phase('gifts')}>Далее</Button>
            </div>
        );
    }

    if (s2Phase === 'gifts') {
         const handleGiftSubmit = () => {
             const val = s2Inputs.gift.toLowerCase();
             const forbidden = ["деньг", "бабло", "рубл", "доллар", "евро", "валют", "money", "cash"];
             
             if (forbidden.some(word => val.includes(word))) {
                 showToast("🚫 Никаких денег! Придумай мечту.");
                 return;
             }

             // Humor logic
             if (val.includes("еда") || val.includes("тор") || val.includes("пицц")) {
                 showToast("🍕 Вкусно жить не запретишь!");
             } else if (val.includes("мир") || val.includes("путеш") || val.includes("море")) {
                 showToast("🌍 Дух приключений!");
             } else if (val.includes("машин") || val.includes("авто") || val.includes("bmw")) {
                 showToast("🚍 Бип-бип!");
             } else {
                 showToast("👍 Классный выбор!");
             }
             
             // Wait for toast then finish
             setTimeout(() => setS2Phase('done'), 1500);
         };

        return (
             <div className="p-6 h-full flex flex-col justify-center max-w-md mx-auto animate-fade-in">
                <h3 className="text-2xl font-serif font-bold text-white mb-2">Тебе исполняется {parseInt(s2Inputs.age) + 1}! 🎉</h3>
                <p className="text-slate-400 mb-6">Что ты хочешь в подарок? (Что сделает тебя счастливее? <b>Деньги загадывать нельзя!</b>)</p>
                <textarea 
                    className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl p-4 text-white focus:border-purple-500 outline-none h-32 mb-6"
                    placeholder="Машину, остров, собаку..."
                    value={s2Inputs.gift}
                    onChange={(e) => saveInput('gift', e.target.value)}
                />
                <Button 
                    fullWidth 
                    disabled={s2Inputs.gift.length < 2}
                    onClick={handleGiftSubmit}
                >
                    Хочу!
                </Button>
            </div>
        );
    }

    if (s2Phase === 'done') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 animate-fade-in">
                <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="w-12 h-12 text-purple-400" />
                </div>
                <h2 className="text-3xl font-serif font-bold text-white mb-2">Этап 2 Пройден!</h2>
                <p className="text-slate-300 mb-8">Ты проанализировал себя.</p>
                <div className="text-4xl font-bold text-amber-400 mb-8 drop-shadow-glow">+40 XP</div>
                <Button variant="fantasy" onClick={() => finishStage(1, 40)}>На карту</Button>
            </div>
        );
    }
    return null;
  };

  // --- STAGE 3 RENDER ---
  const renderStage3 = () => {
    if (s3Phase === 'intro') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 animate-fade-in">
                <VideoPlaceholder label="ВИДЕО ТУРНИР" />
                <h2 className="text-3xl font-serif font-bold text-white mb-4">Турнир Мастеров 🤺</h2>
                <p className="text-slate-300 mb-8 max-w-sm">
                    Здесь сражаются головой. Узнаем твой стиль мышления!
                </p>
                <Button variant="fantasy" onClick={() => setS3Phase('q1')}>На Арену</Button>
            </div>
        );
    }

    const ScenarioQuestion = ({ idx, setter, next }: any) => {
        const q = SKILLS_QUESTIONS[idx];
        return (
            <div className="p-6 h-full flex flex-col justify-center max-w-md mx-auto animate-fade-in">
                <div className="mb-2 text-indigo-400 font-bold uppercase text-xs">{q.title}</div>
                <h3 className="text-xl font-medium text-white mb-6 leading-relaxed">{q.q}</h3>
                <div className="space-y-3">
                    {q.opts.map((opt, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                setter(opt.type);
                                setS3Phase(next);
                            }}
                            className="w-full p-4 rounded-xl text-left bg-slate-800 border border-slate-700 hover:border-indigo-500 hover:bg-slate-750 transition-all text-slate-200"
                        >
                            {opt.t}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    if (s3Phase === 'q1') return <ScenarioQuestion idx={0} setter={setS3Thinking} next="q2" />;
    if (s3Phase === 'q2') return <ScenarioQuestion idx={1} setter={setS3Team} next="q3" />;
    if (s3Phase === 'q3') return <ScenarioQuestion idx={2} setter={setS3Learning} next="crisis_intro" />;

    if (s3Phase === 'crisis_intro') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 animate-fade-in bg-red-950/20">
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <Zap className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-3xl font-serif font-bold text-red-400 mb-4">БЛИЦ-КРИЗИС! 🚨</h2>
                <p className="text-slate-300 mb-8 max-w-sm">
                    Тебя ждет 4 ситуации. На решение каждой — всего 20 секунд.
                </p>
                <Button variant="primary" onClick={() => {
                    setS3CrisisIdx(0);
                    setS3Phase('crisis');
                }}>Начать Блиц</Button>
            </div>
        );
    }

    if (s3Phase === 'crisis') {
        if (s3CrisisIdx >= CRISIS_QUESTIONS.length) {
            setS3Phase('done');
            return null;
        }
        
        // Timer Logic
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
            setS3Timer(20);
            timerRef.current = setInterval(() => {
                setS3Timer(prev => {
                    if (prev <= 1) {
                        handleCrisisAnswer("Тормоз"); // Auto-fail logic equivalent
                        return 20;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => { if (timerRef.current) clearInterval(timerRef.current); };
        }, [s3CrisisIdx]);

        const handleCrisisAnswer = (ansType: string) => {
            if (timerRef.current) clearInterval(timerRef.current);
            // Log logic here if needed
            showToast(`Принято: ${ansType}`);
            if (s3CrisisIdx + 1 >= CRISIS_QUESTIONS.length) {
                setS3Phase('done');
            } else {
                setS3CrisisIdx(prev => prev + 1);
            }
        };

        const q = CRISIS_QUESTIONS[s3CrisisIdx];

        return (
            <div className="p-6 h-full flex flex-col justify-center max-w-md mx-auto animate-fade-in relative">
                <div className="absolute top-6 left-6 right-6">
                    <div className="flex justify-between text-red-400 font-bold mb-1">
                        <span>СИТУАЦИЯ {s3CrisisIdx + 1}/4</span>
                        <span>{s3Timer}с</span>
                    </div>
                    <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-1000 linear ${s3Timer < 5 ? 'bg-red-600' : 'bg-red-400'}`}
                            style={{ width: `${(s3Timer / 20) * 100}%` }}
                        ></div>
                    </div>
                </div>

                <div className="mt-12">
                    <h3 className="text-xl font-bold text-white mb-6 leading-relaxed">{q.q}</h3>
                    <div className="space-y-3">
                        {q.opts.map((opt, i) => (
                            <button
                                key={i}
                                onClick={() => handleCrisisAnswer(opt.type)}
                                className="w-full p-4 rounded-xl text-left bg-slate-800 border border-slate-700 hover:border-red-500 hover:bg-slate-750 transition-all text-slate-200"
                            >
                                {opt.t}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (s3Phase === 'done') {
        // Calculate Title Matrix
        let titleAdj = "Магический";
        if (s3Thinking === "Структурный") titleAdj = "Железный";
        else if (s3Thinking === "Командный") titleAdj = "Великий";
        else if (s3Thinking === "Реалист") titleAdj = "Стальной";
        else if (s3Thinking === "Созерцатель") titleAdj = "Эфирный";
        else if (s3Thinking === "Хакер") titleAdj = "Тайный";

        let titleNoun = "Герой";
        if (s3Team === "Лидер") titleNoun = "Полководец";
        else if (s3Team === "Дипломат") titleNoun = "Хранитель";
        else if (s3Team === "Одиночка") titleNoun = "Архитектор";
        else if (s3Team === "Организатор") titleNoun = "Стратег";
        else if (s3Team === "Гибкий") titleNoun = "Мастер";

        const fullTitle = `${titleAdj} ${titleNoun}`;

        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 animate-fade-in">
                <div className="text-3xl font-serif font-bold text-white mb-2">Турнир Завершен! 🏆</div>
                <div className="text-slate-300 mb-6">Гильдия Мастеров присваивает тебе звание:</div>
                
                {/* MAGIC CARD */}
                <div className="relative w-full max-w-sm bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 p-6 rounded-xl border-2 border-indigo-400 shadow-[0_0_30px_rgba(129,140,248,0.4)] overflow-hidden mb-8 group">
                    <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(transparent,rgba(255,255,255,0.1),transparent)] animate-[spin_15s_linear_infinite] pointer-events-none"></div>
                    
                    <div className="relative z-10">
                        <div className="text-2xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-400 mb-2 uppercase tracking-widest drop-shadow-md">
                            {fullTitle}
                        </div>
                        <div className="text-xs text-indigo-300 uppercase tracking-[0.2em] mb-6">Уровень 3 • Арена</div>
                        
                        <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
                            <div className="flex flex-col items-center">
                                <Brain className="w-5 h-5 text-indigo-400 mb-1" />
                                <span className="text-xs text-slate-300">{s3Thinking || 'Мыслитель'}</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <Briefcase className="w-5 h-5 text-indigo-400 mb-1" />
                                <span className="text-xs text-slate-300">{s3Team || 'Командный'}</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <Zap className="w-5 h-5 text-indigo-400 mb-1" />
                                <span className="text-xs text-slate-300">{s3Learning || 'Ученик'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-2xl font-bold text-amber-400 mb-6 drop-shadow-glow">+20 XP</div>
                <Button variant="fantasy" onClick={() => finishStage(2, 20)}>На карту</Button>
            </div>
        );
    }
    return null;
  };

  const renderFinal = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-6 animate-fade-in">
        <Trophy className="w-24 h-24 text-amber-400 mb-6 animate-pulse" />
        <h2 className="text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-amber-100 to-amber-500 mb-4">
            Легенда Рождена
        </h2>
        <p className="text-slate-300 mb-8 leading-relaxed max-w-md">
            Ты прошел Путь Мастера. Твои интересы, личность и навыки теперь едины.
            <br/><br/>
            Нажми кнопку ниже, чтобы ИИ проанализировал твой уникальный путь и выдал финальное пророчество.
        </p>
        <Button 
            variant="fantasy" 
            onClick={onCompleteCourse} 
            disabled={isGeneratingAi}
            className="text-xl px-10 py-4"
        >
            {isGeneratingAi ? "Призыв Оракула..." : "Получить Пророчество"}
        </Button>
    </div>
  );

  // --- MAIN RENDER ---

  return (
    <div className="w-full h-full min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
        {toastMsg && <Toast message={toastMsg} />}
        
        {/* Render Active Stage Overlay or Map */}
        {activeStage === null ? (
            <>
                {renderHeader()}
                <div className="flex-1 overflow-y-auto pb-20">
                    {renderMap()}
                </div>
            </>
        ) : (
            <div className="absolute inset-0 bg-slate-900 z-50 overflow-y-auto">
                {/* Simple Back button for stages */}
                <button 
                    onClick={() => setActiveStage(null)} 
                    className="absolute top-4 right-4 text-slate-500 hover:text-white z-50 p-2 bg-black/20 rounded-full"
                >
                    ✕
                </button>
                
                {activeStage === 0 && renderStage1()}
                {activeStage === 1 && renderStage2()}
                {activeStage === 2 && renderStage3()}
                {activeStage === 3 && renderFinal()}
            </div>
        )}
    </div>
  );
};
