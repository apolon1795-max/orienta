import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Lock, CheckCircle, Play, Star, 
  Shield, Brain, Zap, Trophy, Heart, Briefcase 
} from 'lucide-react';
import { Button } from './Button';

import type { CourseState } from '../types';
import { SPHERES_DATA, QUIZ_DATA, VALUES_LIST, SKILLS_QUESTIONS, CRISIS_QUESTIONS } from '../data/course';
import { canFinishStage, getCourseXp, validAge, validGift } from '../services/progress';

interface CourseViewProps {
  course: CourseState;
  onChange: React.Dispatch<React.SetStateAction<CourseState>>;
  onCompleteCourse: () => void;
  onBack: () => void;
  isGeneratingAi: boolean;
}
const InputStep = ({ title, desc, placeholder, value, onChange, onNext }: {
  title: string; desc: string; placeholder: string; value: string;
  onChange: (value: string) => void; onNext: () => void;
}) => (
  <div className="p-6 min-h-[80svh] flex flex-col justify-center max-w-md mx-auto animate-fade-in">
    <label htmlFor="reflection" className="text-2xl font-serif font-bold text-white mb-2">{title}</label>
    <p id="reflection-help" className="text-slate-300 mb-6">{desc}</p>
    <textarea id="reflection" aria-describedby="reflection-help" maxLength={1200}
      className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl p-4 text-white focus:border-purple-500 outline-none h-32 mb-6"
      placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
    <Button fullWidth disabled={value.trim().length < 2} onClick={onNext}>Далее</Button>
  </div>
);

const Toast: React.FC<{ message: string | null }> = ({ message }) => {
  if (!message) return null;
  return (
    <div role="status" className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-900/90 text-white px-6 py-4 rounded-xl border border-indigo-500 shadow-[0_0_30px_rgba(0,0,0,0.5)] z-[100] text-center animate-fade-in text-lg font-medium backdrop-blur-md">
      {message}
    </div>
  );
};

export const CourseView: React.FC<CourseViewProps> = ({ 
  course, onChange, onCompleteCourse, onBack, isGeneratingAi
}) => {
  function field<K extends keyof CourseState>(key: K): [CourseState[K], React.Dispatch<React.SetStateAction<CourseState[K]>>] {
    return [course[key], value => onChange(prev => ({ ...prev, [key]: typeof value === 'function' ? (value as (old: CourseState[K]) => CourseState[K])(prev[key]) : value }))];
  }
  const [activeStage, setActiveStage] = field('activeStage');
  const completedStages = course.completedStages;
  const xp = getCourseXp(course);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const s1CardIndex = course.s1CardIndex;
  const [s1SelectedSpheres, setS1SelectedSpheres] = field('s1SelectedSpheres');
  const s1QuizIndex = course.s1QuizIndex;
  const s1Phase = course.s1Phase;
  const s1QuizFeedback = course.s1QuizFeedback;
  const [s2Phase, setS2Phase] = field('s2Phase');
  const [s2Values, setS2Values] = field('s2Values');
  const [s2Inputs, setS2Inputs] = field('s2Inputs');
  const [s3Phase, setS3Phase] = field('s3Phase');
  const [s3Thinking, setS3Thinking] = field('s3Thinking');
  const [s3Team, setS3Team] = field('s3Team');
  const [s3Learning, setS3Learning] = field('s3Learning');
  const s3CrisisIdx = course.s3CrisisIdx;
  const [s3Timer, setS3Timer] = useState(20);
  const answerCrisis = (answer: string, expectedIndex = s3CrisisIdx) => onChange(prev => {
    if (prev.s3Phase !== 'crisis' || prev.s3CrisisIdx !== expectedIndex) return prev;
    const answers = [...prev.s3CrisisAnswers];
    answers[expectedIndex] = answer;
    return { ...prev, s3CrisisAnswers: answers,
      s3CrisisIdx: Math.min(expectedIndex + 1, 3), s3Phase: expectedIndex === 3 ? 'done' : 'crisis' };
  });
  useEffect(() => {
    if (activeStage !== 2 || s3Phase !== 'crisis' || course.untimed) return;
    setS3Timer(20);
    const interval = setInterval(() => setS3Timer(n => Math.max(0, n - 1)), 1000);
    const timeout = setTimeout(() => answerCrisis('Без ответа', s3CrisisIdx), 20000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [activeStage, s3Phase, s3CrisisIdx, course.untimed, onChange]);
  useEffect(() => {
    if (!toastMsg) return;
    const id = setTimeout(() => setToastMsg(null), 2000);
    return () => clearTimeout(id);
  }, [toastMsg]);
  useEffect(() => { window.scrollTo(0, 0); }, [activeStage, s1Phase, s2Phase, s3Phase, s3CrisisIdx]);
  const openStage = (idx: number) => {
    if (idx > 0 && !completedStages.includes(idx - 1)) return;
    setActiveStage(idx);
  };
  const finishStage = (idx: number, _reward: number) => onChange(prev => {
    if (!canFinishStage(prev, idx)) return prev;
    return { ...prev, completedStages: [...new Set([...prev.completedStages, idx])], activeStage: null };
  });
  const showToast = (message: string) => setToastMsg(message);
  const setS1Phase = (next: CourseState['s1Phase']) => onChange(prev => ({ ...prev, s1Phase: next }));
  const chooseSphere = (id?: string) => {
    if (s1CardIndex + 1 === SPHERES_DATA.length && !id && !s1SelectedSpheres.length) showToast('Выбери хотя бы одну сферу. Можно исследовать её без уверенности.');
    onChange(prev => {
      if (prev.s1CardIndex !== s1CardIndex) return prev;
      const selected = id ? [...new Set([...prev.s1SelectedSpheres, id])] : prev.s1SelectedSpheres;
      const next = prev.s1CardIndex + 1;
      if (next < SPHERES_DATA.length) return { ...prev, s1SelectedSpheres: selected, s1CardIndex: next };
      if (!selected.length) return { ...prev, s1CardIndex: 0 };
      return { ...prev, s1SelectedSpheres: selected, s1CardIndex: next, s1Phase: selected.length > 3 ? 'filter' : 'quiz_intro' };
    });
  };

  // --- RENDERERS ---

  const renderHeader = () => (
    <div className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-20 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
            <button aria-label="Вернуться в хаб" onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
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
                <span>{xp}/130</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500" 
                    style={{ width: `${(xp / 130) * 100}%` }}
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
                

                return (
                    <button
                        type="button" disabled={isLocked} aria-label={stage.title + '. ' + (isLocked ? 'Сначала заверши предыдущий этап' : isCompleted ? 'Пройден, открыть итоги' : 'Открыть')}
                        key={idx} 
                        onClick={() => openStage(idx)}
                        className={`relative z-10 w-full text-left flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer ${
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
                    </button>
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
                <p className="max-w-sm text-slate-300 mb-6">Выбери от одной до трёх сфер и ответь на три загадки о профессиях. Здесь можно пробовать и ошибаться.</p>
                <h2 className="text-3xl font-serif font-bold text-white mb-4">Привет, Герой! 👋</h2>
                <p className="text-slate-300 mb-8 max-w-sm">
                   Свайпай 10 сфер! Лайкай то, что интересно. Твой выбор определит путь.
                </p>
                <Button variant="fantasy" onClick={() => setS1Phase('tinder')}>Погнали! 🚀</Button>
            </div>
        );
    }

    if (s1Phase === 'tinder') {
        const card = SPHERES_DATA[Math.min(s1CardIndex, SPHERES_DATA.length - 1)];
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
                        onClick={() => chooseSphere()}
                        className="border-red-400 text-red-400 hover:bg-red-950/30"
                    >
                        Мимо
                    </Button>
                    <Button 
                        variant="primary" 
                        fullWidth 
                        onClick={() => chooseSphere(card.id)}
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
                <p className="text-slate-400 mb-6 text-center">Оставь от одной до трёх самых важных сфер.</p>
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
                                onChange(prev => {
                                  if (prev.s1QuizAnswers.length > s1QuizIndex) return prev;
                                  return { ...prev, s1QuizAnswers: [...prev.s1QuizAnswers, idx], s1QuizFeedback: isCorrect ? 'Верно! +10 XP' : 'Не совсем…' };
                                });
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
                            onChange(prev => {
                              if (prev.s1QuizIndex !== s1QuizIndex || !prev.s1QuizFeedback) return prev;
                              return { ...prev, s1QuizFeedback: null, s1QuizIndex: Math.min(s1QuizIndex + 1, 2), s1Phase: s1QuizIndex === 2 ? 'done' : 'quiz' };
                            });
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
                <div className="text-4xl font-bold text-amber-400 mb-8 drop-shadow-glow">+40 XP</div>
                <Button variant="fantasy" onClick={() => finishStage(0, 40)}>На карту</Button>
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
                <p className="max-w-sm text-slate-300 mb-6">Запиши свои сильные стороны и трудности, затем выбери пять ценностей. Ответы войдут в профкарту.</p>
                <h2 className="text-3xl font-serif font-bold text-white mb-4">Зеркало Души 🪞</h2>
                <p className="text-slate-300 mb-8 max-w-sm">
                    Герой должен знать свою силу и слабость. Загляни в зеркальные пруды!
                </p>
                <Button variant="fantasy" onClick={() => setS2Phase('swot1')}>Смотреть в воду</Button>
            </div>
        );
    }

    const reflections = {
      swot1: { title: 'Твоя Сила', desc: 'В чем ты хорош? Что хвалят другие?', placeholder: 'Быстро учусь, умею рисовать…', key: 's', next: 'swot2' },
      swot2: { title: 'Слабые места', desc: 'Что даётся с трудом? Где нужна помощь?', placeholder: 'Мне пока сложно выступать…', key: 'w', next: 'swot3' },
      swot3: { title: 'Возможности', desc: 'Как использовать твою силу: «' + s2Inputs.s + '»?', placeholder: 'Попробую сделать проект…', key: 'o', next: 'swot4' },
      swot4: { title: 'Препятствия', desc: 'Что может помешать? Какую поддержку стоит найти?', placeholder: 'Не хватает времени, нужна помощь…', key: 't', next: 'values' },
    } as const;
    if (s2Phase in reflections) {
      const item = reflections[s2Phase as keyof typeof reflections];
      return <InputStep title={item.title} desc={item.desc} placeholder={item.placeholder}
        value={s2Inputs[item.key]} onChange={value => saveInput(item.key, value)} onNext={() => setS2Phase(item.next)} />;
    }

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
                                key={v} aria-pressed={isSelected}
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
                    type="number" min={6} max={100} step={1} aria-label="Возраст в годах"
                    className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl p-4 text-white text-center text-2xl focus:border-purple-500 outline-none mb-6"
                    placeholder="18"
                    value={s2Inputs.age}
                    onChange={(e) => saveInput('age', e.target.value)}
                />
                <p className="text-sm text-slate-300 mb-4">Целое число от 6 до 100.</p>
                <Button fullWidth disabled={!validAge(s2Inputs.age)} onClick={() => setS2Phase('gifts')}>Далее</Button>
            </div>
        );
    }

    if (s2Phase === 'gifts') {
         const handleGiftSubmit = () => {
             const val = s2Inputs.gift.toLowerCase();
             const forbidden = ["деньг", "бабло", "рубл", "доллар", "евро", "валют", "money", "cash"];
             
             if (!validGift(s2Inputs.gift)) {
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
             setS2Phase('done');
         };

        return (
             <div className="p-6 h-full flex flex-col justify-center max-w-md mx-auto animate-fade-in">
                <h3 className="text-2xl font-serif font-bold text-white mb-2">Тебе исполняется {parseInt(s2Inputs.age) + 1}! 🎉</h3>
                <p className="text-slate-400 mb-6">Что ты хочешь в подарок? (Что сделает тебя счастливее? <b>Деньги загадывать нельзя!</b>)</p>
                <textarea 
                    className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl p-4 text-white focus:border-purple-500 outline-none h-32 mb-6"
                    aria-label="Желаемый подарок" maxLength={1200} placeholder="Машину, остров, собаку..."
                    value={s2Inputs.gift}
                    onChange={(e) => saveInput('gift', e.target.value)}
                />
                <Button 
                    fullWidth 
                    disabled={s2Inputs.gift.trim().length < 2}
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
                <p className="max-w-sm text-slate-300 mb-6">Выбери привычный подход к задачам, команде и учёбе. Затем попробуй четыре практические ситуации.</p>
                <h2 className="text-3xl font-serif font-bold text-white mb-4">Турнир Мастеров 🤺</h2>
                <p className="text-slate-300 mb-8 max-w-sm">
                    Здесь сражаются головой. Узнаем твой стиль мышления!
                </p>
                <Button variant="fantasy" onClick={() => setS3Phase('q1')}>На Арену</Button>
            </div>
        );
    }

    const renderScenarioQuestion = ({ idx, setter, next }: { idx: number; setter: (value: string) => void; next: CourseState['s3Phase'] }) => {
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

    if (s3Phase === 'q1') return renderScenarioQuestion({ idx: 0, setter: setS3Thinking, next: 'q2' });
    if (s3Phase === 'q2') return renderScenarioQuestion({ idx: 1, setter: setS3Team, next: 'q3' });
    if (s3Phase === 'q3') return renderScenarioQuestion({ idx: 2, setter: setS3Learning, next: 'crisis_intro' });

    if (s3Phase === 'crisis_intro') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 animate-fade-in bg-red-950/20">
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <Zap className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-3xl font-serif font-bold text-red-400 mb-4">БЛИЦ-КРИЗИС! 🚨</h2>
                <p className="text-slate-300 mb-8 max-w-sm">
                    Тебя ждет 4 ситуации. На решение каждой — 20 секунд. Можно отключить ограничение времени.
                </p>
                <label className="flex gap-3 items-center text-slate-200 mb-6"><input type="checkbox" checked={course.untimed}
                  onChange={e => onChange(prev => ({ ...prev, untimed: e.target.checked }))} />Без ограничения времени</label>
                <Button variant="primary" onClick={() => onChange(prev => ({ ...prev, s3CrisisIdx: 0, s3CrisisAnswers: [], s3Phase: 'crisis' }))}>Начать Блиц</Button>
            </div>
        );
    }

    if (s3Phase === 'crisis') {
        const q = CRISIS_QUESTIONS[s3CrisisIdx];

        return (
            <div className="p-6 h-full flex flex-col justify-center max-w-md mx-auto animate-fade-in relative">
                <div className="absolute top-6 left-6 right-6">
                    <div className="flex justify-between text-red-400 font-bold mb-1">
                        <span>СИТУАЦИЯ {s3CrisisIdx + 1}/4</span>
                        <span>{course.untimed ? 'Без таймера' : s3Timer + 'с'}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-1000 linear ${s3Timer < 5 ? 'bg-red-600' : 'bg-red-400'}`}
                            style={{ width: `${course.untimed ? 100 : (s3Timer / 20) * 100}%` }}
                        ></div>
                    </div>
                </div>

                <div className="mt-12">
                    <h3 className="text-xl font-bold text-white mb-6 leading-relaxed">{q.q}</h3>
                    <div className="space-y-3">
                        {q.opts.map((opt, i) => (
                            <button
                                key={i}
                                onClick={() => answerCrisis(opt.type)}
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
            Собери профкарту: выбранные сферы, ценности, сильные стороны и подход к задачам. Её можно сохранить и обсудить с наставником.
        </p>
        <Button 
            variant="fantasy" 
            onClick={onCompleteCourse} 
            disabled={isGeneratingAi}
            className="text-xl px-10 py-4"
        >
            {isGeneratingAi ? "Собираем профкарту…" : "Собрать профкарту"}
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
            <div className="min-h-screen bg-slate-900 z-50 relative pt-12 pb-10">
                {/* Simple Back button for stages */}
                <button 
                    onClick={() => setActiveStage(null)} 
                    aria-label="Вернуться к карте курса" className="absolute top-4 right-4 text-slate-300 hover:text-white z-50 p-2 bg-black/20 rounded-full"
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
