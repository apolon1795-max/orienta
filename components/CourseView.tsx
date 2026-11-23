import './journey-theme.css';
import './course-map.css';
import './course-ux.css';
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { FinaleMedia, WelcomeMedia, lessonConfigured, currentLessonProgress } from './LessonMedia';
import { playbackTime } from '../services/lessonProgress';
import { 
  ArrowLeft, Lock, CheckCircle, Play, Star, 
  Shield, Brain, Zap, Trophy, Heart, Briefcase, Compass, Fingerprint, Swords, Castle, Gem, Map, Laptop, Stethoscope, Palette, GraduationCap, Building2, FlaskConical, Plane, Lightbulb
} from 'lucide-react';
import { Button } from './Button';
import { LessonAnswers, LessonBrief, LessonResult } from './LessonCopy';
import { crisisPrompts, selectedSituationRows, situationAnswer, skillPrompts } from '../services/courseScenarioText';
import { revealPrompt } from './questionPosition';

import { DreamStage, AssessmentStage } from './FinalStages';
import type { CourseState } from '../types';
import { SPHERES_DATA, QUIZ_DATA, VALUES_LIST, SKILLS_QUESTIONS, CRISIS_QUESTIONS } from '../data/course';
import { canFinishStage, validAge, validGift } from '../services/progress';
import { nextCourseStage } from '../services/courseNavigation';
import { courseScreenKey } from '../services/courseScreen';

const SPHERE_ICONS: Record<string, React.ComponentType<any>> = {it:Laptop,health:Stethoscope,art:Palette,edu:GraduationCap,build:Building2,science:FlaskConical,travel:Plane,security:Shield,energy:Zap,biz:Briefcase};
const SphereIcon = ({id}:{id:string}) => {const Icon=SPHERE_ICONS[id] || Compass;return <Icon size={44} strokeWidth={1.6} aria-hidden="true" />;};
const STAGE_CHAPTERS = [
  {title:'Исследование земель',subtitle:'Интересы и профессии',icon:Compass,position:'85%'},
  {title:'Зеркало души',subtitle:'Сильные стороны и ценности',icon:Fingerprint,position:'70%'},
  {title:'Турнир мастеров',subtitle:'Твой подход к задачам',icon:Swords,position:'52%'},
  {title:'Башня мечты',subtitle:'Образ будущей работы',icon:Castle,position:'38%'},
  {title:'Хрустальный зал',subtitle:'Интересы и мотивация',icon:Gem,position:'22%'},
  {title:'Твоя профкарта',subtitle:'Все открытия в одной истории',icon:Map,position:'8%'}
];

interface CourseViewProps {
  course: CourseState;
  onChange: React.Dispatch<React.SetStateAction<CourseState>>;
  onCompleteCourse: () => void;
  onBack: () => void;
  isGeneratingAi: boolean;
  needsArchetype?: boolean;
  linear?: boolean;
  stageMedia?: React.ReactNode;
}
const InputStep = ({ title, desc, placeholder, value, onChange, onNext }: {
  title: string; desc: string; placeholder: string; value: string;
  onChange: (value: string) => void; onNext: () => void;
}) => (
  <div className="p-6 min-h-[80svh] flex flex-col justify-center max-w-md mx-auto animate-fade-in">
    <h2 className="text-2xl font-serif font-bold text-white mb-2"><label htmlFor="reflection">{title}</label></h2>
    <p id="reflection-help" className="text-slate-300 mb-6">{desc}</p>
    <textarea id="reflection" aria-describedby="reflection-help" maxLength={1200}
      className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl p-4 text-white focus:border-purple-500 outline-none h-32 mb-6"
      placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
    <Button fullWidth disabled={value.trim().length < 2} onClick={onNext}>Дальше</Button>
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
  course, onChange, onCompleteCourse, onBack, isGeneratingAi, linear = false, stageMedia, needsArchetype = false
}) => {
  function field<K extends keyof CourseState>(key: K): [CourseState[K], React.Dispatch<React.SetStateAction<CourseState[K]>>] {
    return [course[key], value => onChange(prev => ({ ...prev, [key]: typeof value === 'function' ? (value as (old: CourseState[K]) => CourseState[K])(prev[key]) : value }))];
  }
  const [activeStage, setActiveStage] = field('activeStage');
  const completedStages = course.completedStages;
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
  const [blitzReady, setBlitzReady] = useState(false);
  useEffect(() => { if (activeStage !== 2) setBlitzReady(false); }, [activeStage]);
  const answerCrisis = (answer: string, expectedIndex = s3CrisisIdx) => onChange(prev => {
    if (prev.s3Phase !== 'crisis' || prev.s3CrisisIdx !== expectedIndex) return prev;
    const answers = [...prev.s3CrisisAnswers];
    answers[expectedIndex] = answer;
    return { ...prev, s3CrisisAnswers: answers,
      s3CrisisIdx: Math.min(expectedIndex + 1, 3), s3Phase: expectedIndex === 3 ? 'done' : 'crisis' };
  });
  useEffect(() => {
    if (activeStage !== 2 || s3Phase !== 'crisis' || !blitzReady || course.untimed) return;
    setS3Timer(20);
    const interval = setInterval(() => setS3Timer(n => Math.max(0, n - 1)), 1000);
    const timeout = setTimeout(() => answerCrisis('Без ответа', s3CrisisIdx), 20000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [activeStage, s3Phase, s3CrisisIdx, blitzReady, course.untimed, onChange]);
  useEffect(() => {
    if (!toastMsg) return;
    const id = setTimeout(() => setToastMsg(null), 2000);
    return () => clearTimeout(id);
  }, [toastMsg]);
  const stagePanel = useRef<HTMLDivElement>(null);
  const chapterTitle = useRef<HTMLHeadingElement>(null);
  const mapHeading = useRef<HTMLHeadingElement>(null);
  const courseScreen = courseScreenKey(course);
  const screen = courseScreen.startsWith('2:crisis:') && !blitzReady ? '2:crisis_intro:continue' : courseScreen;
  const previousScreen = useRef(screen);
  const anchoredExercise = /^\d+:/.test(screen) && !/^\d+:(?:intro|done|holland_result|motivation_intro|crisis_intro)(?::|$)/.test(screen);
  useLayoutEffect(() => {
    if (previousScreen.current === screen) return;
    previousScreen.current = screen;
    // Keep the original chapter entrance and video visible before starting its first exercise.
    if (screen === 'map' || /^\d+:intro(?::|$)/.test(screen)) {
      (screen === 'map' ? mapHeading.current : chapterTitle.current)?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }
    const prompt = stagePanel.current?.lastElementChild?.querySelector<HTMLElement>('h2, h3');
    if (prompt) revealPrompt(prompt);
    else stagePanel.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [screen]);
  const openStage = (idx: number) => {
    if (idx > 0 && !completedStages.includes(idx - 1)) return;
    setActiveStage(idx);
  };
  const finishStage = (idx: number, _reward: number) => onChange(prev => {
    if (!canFinishStage(prev, idx)) return prev;
    const completedStages = [...new Set([...prev.completedStages, idx])];
    return { ...prev, completedStages, activeStage: linear ? nextCourseStage({ completedStages }) : null };
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
      return { ...prev, s1SelectedSpheres: selected, s1CardIndex: next, s1Phase: selected.length > 3 ? 'filter' : 'jobs' };
    });
  };

  // --- RENDERERS ---

  const renderHeader = () => (
    <header className="atlas-header">
      <button type="button" aria-label={linear ? 'В лагерь' : 'Вернуться в хаб'} onClick={onBack} className="atlas-back"><ArrowLeft size={19} /> В лагерь</button>
      <div className="atlas-heading"><h2 ref={mapHeading} tabIndex={-1}>Путь Мастера</h2><p>Пять этапов к Профкарте Героя</p></div>
      <div className="atlas-progress" aria-label={`Пройдено ${completedStages.length} из 5 этапов`}>
        <span>Пройдено <strong>{completedStages.length}/5</strong></span>
        <div className="atlas-progress-track"><div style={{width:`${completedStages.length * 20}%`}} /></div>
      </div>
    </header>
  );

  const renderMap = () => {
    const stops = [[30,82], [76,72], [33,55], [77,40], [31,25], [62,13]];
    const stages = STAGE_CHAPTERS.map((stage, idx) => ({
      ...stage, x: stops[idx][0], y: stops[idx][1],
      label: idx === 5 ? 'Финал: ' + stage.title : 'Этап ' + (idx + 1) + ': ' + stage.title,
    }));
    const current = Math.min(completedStages.length, 5);
    return <section className="atlas-shell" aria-label="Карта приключения">
      <aside className="course-start-checklist" aria-labelledby="course-checklist-title">
        <h3 id="course-checklist-title">Что тебя ждёт</h3>
        <ol>
          <li>Начни с приветствия и открой первый этап.</li>
          <li>Пройди пять этапов: видео, игровые задания и короткие итоги.</li>
          <li>Собери профкарту. Для неё нужны ответы курса и твой архетип.</li>
        </ol>
        {completedStages.length === 0 && <Button className="course-start-action" variant="fantasy" onClick={() => openStage(0)}>Начать этап 1</Button>}
      </aside>
      <div className="atlas-map">
        <div className="atlas-landscape" aria-hidden="true" />
        <svg className="atlas-route" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
          <path className="atlas-route-shadow" d="M300 820 C400 820 550 790 760 720 S400 650 330 550 S650 460 770 400 S420 330 310 250 S400 160 620 130" />
          <path className="atlas-route-line" d="M300 820 C400 820 550 790 760 720 S400 650 330 550 S650 460 770 400 S420 330 310 250 S400 160 620 130" />
        </svg>
        {stages.map((stage,idx) => {
          const isLocked = idx > 0 && !completedStages.includes(idx-1);
          const isCompleted = completedStages.includes(idx);
          const Icon = stage.icon;
          const lesson = currentLessonProgress(idx+1, course.lessons[idx+1]);
          return <button type="button" key={idx} disabled={isLocked} onClick={()=>openStage(idx)}
            aria-label={stage.label+'. '+(isLocked?'Сначала заверши предыдущий этап':isCompleted?'Пройден, открыть итоги':'Открыть')}
            aria-current={idx===current?'step':undefined}
            className={`atlas-stop ${isLocked?'is-locked':isCompleted?'is-complete':'is-current'}`}
            style={{left:stage.x+'%',top:stage.y+'%'}}>
            <span className="atlas-pin"><Icon size={25} strokeWidth={1.8} aria-hidden="true" /><span className="atlas-pin-status">{isLocked?<Lock size={12}/>:isCompleted?<CheckCircle size={14}/>:idx+1}</span></span>
            <span className="atlas-stop-label"><small>{idx===5?'Финал':`Этап ${idx+1}`}</small><strong>{stage.title}</strong><span className="atlas-stop-description">{stage.subtitle}</span>
              <span className="atlas-state">{isLocked?'Пока закрыто':isCompleted?'Пройден':idx===5?'К финалу':'Открыть этап'}</span>
              {idx<5 && lessonConfigured(idx+1) && <span className="atlas-lesson">{lesson?.completed?'Видео завершено':lesson?.position?'Видео: '+playbackTime(lesson.position):'Видеоурок доступен'}</span>}
            </span>
          </button>;
        })}
      </div>
      <footer className="atlas-footer"><span><span className="atlas-legend-open"/> Открытый этап</span><span><CheckCircle size={16}/> Пройден</span><span><Lock size={15}/> Откроется по пути</span></footer>
    </section>;
  };

  // --- STAGE 1 RENDER ---
  const renderStage1 = () => {
    if (s1Phase === 'intro') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 animate-fade-in">
                <h2 className="text-3xl font-serif font-bold text-white mb-4">От интереса к первой пробе</h2>
                <LessonBrief theory="Интерес к профессии и знание о ней — не одно и то же. Можно начать с того, что просто любопытно."
                  observe="Какие сферы хочется попробовать и что на самом деле делают люди в этих профессиях."
                  task="Из десяти сфер оставь от одной до трёх. В каждой выбери одну или две профессии. Затем разгадай три загадки о работе." />
                <Button variant="fantasy" onClick={() => setS1Phase('tinder')}>Начать исследование</Button>
            </div>
        );
    }

    if (s1Phase === 'tinder') {
        const card = SPHERES_DATA[Math.min(s1CardIndex, SPHERES_DATA.length - 1)];
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 animate-fade-in">
                <div className="text-slate-400 mb-4 text-sm">Карта {s1CardIndex + 1} из {SPHERES_DATA.length}</div>
                <div className="w-full max-w-xs bg-white text-slate-900 rounded-2xl p-8 text-center shadow-2xl border-4 border-indigo-200 h-96 flex flex-col items-center justify-center relative">
                    <div className="sphere-seal mb-4"><SphereIcon id={card.id}/></div>
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
                <p className="text-slate-400 mb-6 text-center">В рюкзак помещаются три сферы. Панда не считается: у неё свой рюкзак. Оставь от одной до трёх сфер, которые хочется попробовать.</p>
                <div className="w-full max-w-md space-y-3 flex-1 overflow-y-auto">
                    {s1SelectedSpheres.map(id => {
                        const item = SPHERES_DATA.find(s => s.id === id);
                        return (
                            <div key={id} className="bg-slate-800 p-4 rounded-xl flex justify-between items-center border border-slate-700">
                                <span className="text-white font-medium flex items-center gap-2">
                                    <span className="sphere-mini">{item && <SphereIcon id={item.id}/>}</span> {item?.title}
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
                        onClick={() => setS1Phase('jobs')}
                    >
                        К выбору профессий
                    </Button>
                </div>
            </div>
        );
    }

    if (s1Phase === 'jobs') {
      const idx = Math.min(course.s1ProfessionIndex, Math.max(0, s1SelectedSpheres.length - 1));
      const sphere = SPHERES_DATA.find(s => s.id === s1SelectedSpheres[idx]);
      if (!sphere) return <Button onClick={() => setS1Phase('tinder')}>Вернуться к сферам</Button>;
      const selected = course.s1SelectedProfessions[sphere.id] || [];
      const prevQuizComplete = course.s1QuizAnswers.length === 3;
      return <div className="max-w-md mx-auto p-6 space-y-5">
        <h2 className="text-2xl font-serif text-white">Профессии: {sphere.title}</h2>
        <p className="text-slate-200">Выбери одну или две профессии, которые хочется изучить. Сфера {idx + 1} из {s1SelectedSpheres.length}.</p>
        {sphere.jobs.map(job => <Button key={job} fullWidth variant={selected.includes(job) ? 'primary' : 'secondary'} aria-pressed={selected.includes(job)} disabled={!selected.includes(job) && selected.length >= 2} onClick={() => onChange(prev => {
          const old = prev.s1SelectedProfessions[sphere.id] || [];
          return { ...prev, s1SelectedProfessions: { ...prev.s1SelectedProfessions, [sphere.id]: old.includes(job) ? old.filter(v => v !== job) : old.length < 2 ? [...old, job] : old } };
        })}>{job}</Button>)}
        <Button fullWidth disabled={selected.length < 1} onClick={() => onChange(prev => ({ ...prev, s1ProfessionIndex: idx + 1 < s1SelectedSpheres.length ? idx + 1 : idx, s1Phase: idx + 1 < s1SelectedSpheres.length ? 'jobs' : prev.s1QuizAnswers.length === 3 ? 'done' : 'quiz_intro' }))}>{idx + 1 < s1SelectedSpheres.length ? 'К следующей сфере' : prevQuizComplete ? 'К итогам' : 'К загадкам'}</Button>
      </div>;
    }

    if (s1Phase === 'quiz_intro') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 animate-fade-in">
                <Zap className="w-20 h-20 text-amber-400 mb-6 animate-pulse" />
                <h2 className="text-3xl font-serif font-bold text-white mb-4">Три загадки о профессиях</h2>
                <p className="text-slate-300 mb-8 max-w-sm">
                    Угадай, кто чем занимается. После каждого ответа покажем разгадку.
                </p>
                <Button variant="fantasy" onClick={() => setS1Phase('quiz')}>Начать загадки</Button>
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
                                  return { ...prev, s1QuizAnswers: [...prev.s1QuizAnswers, idx], s1QuizFeedback: isCorrect ? 'Верно!' : 'Не совсем…' };
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
                        <div role="status" className="p-4 bg-slate-800 rounded-lg border-l-4 border-indigo-500 mb-4 text-slate-300 text-sm">
                            {q.feedback}
                        </div>
                        <Button fullWidth onClick={() => {
                            onChange(prev => {
                              if (prev.s1QuizIndex !== s1QuizIndex || !prev.s1QuizFeedback) return prev;
                              return { ...prev, s1QuizFeedback: null, s1QuizIndex: Math.min(s1QuizIndex + 1, 2), s1Phase: s1QuizIndex === 2 ? 'done' : 'quiz' };
                            });
                        }}>
                            {s1QuizIndex === 2 ? "К итогам" : "Следующая загадка"}
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
                <h2 className="text-3xl font-serif font-bold text-white mb-2">Этап 1 пройден!</h2>
                <LessonResult reason="Здесь два разных результата. Профессии ты выбрал сам: это то, что тебе сейчас интересно попробовать. Баллы в загадках показывают, что ты уже знаешь о работе, а не насколько она тебе подходит.">
                  <LessonAnswers rows={[
                    ...SPHERES_DATA.filter(sphere => s1SelectedSpheres.includes(sphere.id)).map((sphere): [string, string] => [sphere.title, (course.s1SelectedProfessions[sphere.id] || []).join(', ')]),
                    ['Загадки', `${course.s1QuizAnswers.filter((answer, i) => answer === QUIZ_DATA[i]?.correct).length} из ${QUIZ_DATA.length} верно`],
                  ]} />
                </LessonResult>
                <Button variant="fantasy" onClick={() => finishStage(0, 40)}>{linear ? 'К «Зеркалу души»' : 'На карту'}</Button>
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
                <h2 className="text-3xl font-serif font-bold text-white mb-4">Зеркало души</h2>
                <LessonBrief theory="Зеркало не ставит оценки. Иногда полезно просто записать, что у тебя уже получается и где нужна помощь."
                  observe="Что у тебя получается, как это можно применить и что для тебя важно. Мы не определяем тип личности."
                  task="Ответь на четыре коротких вопроса и выбери пять ценностей. Потом представь три ближайших дня рождения и придумай подарок на каждый." />
                <Button variant="fantasy" onClick={() => setS2Phase('swot1')}>Начать задания</Button>
            </div>
        );
    }

    const reflections = {
      swot1: { title: 'Твоя Сила', desc: 'Что у тебя получается? Вспомни конкретный случай, когда это помогло тебе или кому-то ещё.', placeholder: 'Быстро учусь, умею рисовать…', key: 's', next: 'swot2' },
      swot2: { title: 'Что даётся трудно', desc: 'Что пока не получается так легко? Напиши, с чем тебе пригодилась бы помощь.', placeholder: 'Мне пока сложно выступать…', key: 'w', next: 'swot3' },
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
                <h3 className="text-2xl font-serif font-bold text-white mb-2">Твои ценности</h3>
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
                    {s2Values.length === 5 ? 'К заданию про подарки' : `Выбрано ${s2Values.length} из 5`}
                </Button>
            </div>
        );
    }

    if (s2Phase === 'age') {
        return (
            <div className="p-6 h-full flex flex-col justify-center max-w-md mx-auto animate-fade-in text-center">
                <h3 className="text-2xl font-serif font-bold text-white mb-6">Сколько тебе лет?</h3>
                <input 
                    type="number" min={6} max={100} step={1} aria-label="Возраст в годах"
                    className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl p-4 text-white text-center text-2xl focus:border-purple-500 outline-none mb-6"
                    placeholder="18"
                    value={s2Inputs.age}
                    onChange={(e) => saveInput('age', e.target.value)}
                />
                <p className="text-sm text-slate-300 mb-4">Здесь возраст нужен, чтобы подписать три следующих дня рождения. Он не влияет на результат. Укажи целое число от 6 до 100.</p>
                <Button fullWidth disabled={!validAge(s2Inputs.age)} onClick={() => setS2Phase('gifts')}>Выбрать подарки</Button>
            </div>
        );
    }

    if (s2Phase === 'gifts') {
      const idx = course.s2GiftIndex;
      const key = (['gift', 'gift2', 'gift3'] as const)[idx];
      return <div className="p-6 max-w-md mx-auto space-y-6">
        <h3 className="text-2xl font-serif text-white">Тебе исполняется {Number(s2Inputs.age) + idx + 1}!</h3>
        <p className="text-slate-200">Подарок {idx + 1} из 3: что бы ты хотел получить? Здесь можно мечтать. Ответ не определяет твою профессию.</p>
        <label htmlFor="future-gift" className="block text-slate-200">Желаемый подарок</label>
        <textarea id="future-gift" maxLength={1200} className="w-full h-32 bg-slate-800 border border-slate-600 rounded-xl p-4 text-white" value={s2Inputs[key]} onChange={e => saveInput(key, e.target.value)} />
        <Button fullWidth disabled={!validGift(s2Inputs[key])} onClick={() => onChange(prev => ({ ...prev, s2GiftIndex: Math.min(idx + 1, 2), s2Phase: idx === 2 ? 'done' : 'gifts' }))}>{idx === 2 ? 'К итогам' : 'Следующий день рождения'}</Button>
      </div>;
    }

    if (s2Phase === 'done') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 animate-fade-in">
                <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="w-12 h-12 text-purple-400" />
                </div>
                <h2 className="text-3xl font-serif font-bold text-white mb-2">Этап 2 Пройден!</h2>
                <LessonResult reason="Это твои наблюдения, а не вывод теста. Посмотри, как выбранная тобой сильная сторона может помочь в деле, которое ты сам предложил. Подарки записаны отдельно и не влияют на результат.">
                  <LessonAnswers rows={[
                    ['Что получается', s2Inputs.s], ['Что даётся трудно', s2Inputs.w], ['Как применить сильную сторону', s2Inputs.o],
                    ['Что мешает и какая помощь нужна', s2Inputs.t], ['Что важно', s2Values.join(', ')],
                    ...[s2Inputs.gift, s2Inputs.gift2, s2Inputs.gift3].map((gift, index): [string, string] => [`Подарок на ${Number(s2Inputs.age) + index + 1} лет`, gift]),
                  ]} />
                </LessonResult>
                <Button variant="fantasy" onClick={() => finishStage(1, 40)}>{linear ? 'К «Турниру мастеров»' : 'На карту'}</Button>
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
                <h2 className="text-3xl font-serif font-bold text-white mb-4">Турнир мастеров</h2>
                <LessonBrief theory="В одной ситуации могут сработать разные решения. Важно заметить, что ты выбираешь сейчас, а не найти единственный правильный ход."
                  observe="Как ты берёшься за проект, действуешь в команде и осваиваешь новое. Это не оценка уровня навыков."
                  task="Выбери по одному действию в трёх ситуациях. Затем попробуй ещё четыре в блице. Можно проходить без таймера." />
                <Button variant="fantasy" onClick={() => setS3Phase('q1')}>Начать турнир</Button>
            </div>
        );
    }

    const renderScenarioQuestion = ({ idx, setter, next }: { idx: number; setter: (value: string) => void; next: CourseState['s3Phase'] }) => {
        const q = SKILLS_QUESTIONS[idx];
        return (
            <div className="p-6 h-full flex flex-col justify-center max-w-md mx-auto animate-fade-in">
                <div className="mb-2 text-indigo-400 font-bold uppercase text-xs">{q.title}</div>
                <h3 className="text-xl font-medium text-white mb-6 leading-relaxed">{skillPrompts[idx]}</h3>
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
                            {situationAnswer('skill', idx, opt.type)}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    if (s3Phase === 'q1') return renderScenarioQuestion({ idx: 0, setter: setS3Thinking, next: 'q2' });
    if (s3Phase === 'q2') return renderScenarioQuestion({ idx: 1, setter: setS3Team, next: 'q3' });
    if (s3Phase === 'q3') return renderScenarioQuestion({ idx: 2, setter: setS3Learning, next: 'crisis_intro' });

    if (s3Phase === 'crisis_intro' || (s3Phase === 'crisis' && !blitzReady)) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 animate-fade-in bg-red-950/20">
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <Zap className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-3xl font-serif font-bold text-red-400 mb-4">Блиц-кризис</h2>
                <p className="text-slate-300 mb-8 max-w-sm">
                    Четыре ситуации, по 20 секунд на каждую. Таймер запустится, когда нажмёшь «Я готов». Если время закончится, ситуация останется без ответа: это не ошибка.
                </p>
                <label className="course-untimed flex gap-3 items-center text-slate-200 mb-6"><input type="checkbox" checked={course.untimed}
                  onChange={e => onChange(prev => ({ ...prev, untimed: e.target.checked }))} />Без ограничения времени</label>
                <Button variant="primary" onClick={() => {
                  setBlitzReady(true);
                  if (s3Phase === 'crisis_intro') onChange(prev => ({ ...prev, s3CrisisIdx: 0, s3CrisisAnswers: [], s3Phase: 'crisis' }));
                }}>Я готов</Button>
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
                        <span aria-hidden={!course.untimed}>{course.untimed ? 'Без таймера' : s3Timer + 'с'}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-1000 linear ${s3Timer < 5 ? 'bg-red-600' : 'bg-red-400'}`}
                            style={{ width: `${course.untimed ? 100 : (s3Timer / 20) * 100}%` }}
                        ></div>
                    </div>
                </div>

                <div className="mt-12">
                    <h3 className="text-xl font-bold text-white mb-6 leading-relaxed">{crisisPrompts[s3CrisisIdx]}</h3>
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
                <h2 className="text-3xl font-serif font-bold text-white mb-2">Турнир завершён!</h2>
                <div className="text-slate-300 mb-6">Гильдия Мастеров присваивает тебе звание:</div>
                
                {/* MAGIC CARD */}
                <div className="journey-award relative w-full max-w-sm bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 p-6 rounded-xl border-2 border-indigo-400 shadow-[0_0_30px_rgba(129,140,248,0.4)] overflow-hidden mb-8 group">
                    <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(transparent,rgba(255,255,255,0.1),transparent)] animate-[spin_15s_linear_infinite] pointer-events-none"></div>
                    
                    <div className="relative z-10">
                        <div className="text-2xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-400 mb-2 uppercase tracking-widest drop-shadow-md">
                            {fullTitle}
                        </div>
                        <div className="text-sm text-indigo-300 mb-6">Турнир мастеров</div>
                        
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
                <LessonResult reason="Звание зависит от твоих ответов про проект и команду. Это не оценка твоих навыков. Ниже можно сверить все свои ответы, в том числе выбор про обучение и ответы в блице.">
                  <LessonAnswers rows={selectedSituationRows(course)} />
                </LessonResult>
                <Button variant="fantasy" onClick={() => finishStage(2, 20)}>{linear ? 'К «Башне мечты»' : 'На карту'}</Button>
            </div>
        );
    }
    return null;
  };

  const renderFinal = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-6 animate-fade-in">
        <Trophy className="w-24 h-24 text-amber-400 mb-6 animate-pulse" />
        <h2 className="text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-amber-100 to-amber-500 mb-4">
            Пять этапов пройдены
        </h2>
        <p className="text-slate-300 mb-8 leading-relaxed max-w-md">
            Ты собрал ответы на пяти остановках. Посмотри на них вместе и выбери, что хочется проверить в жизни.
            <br/><br/>
            Собери профкарту: выбранные сферы, ценности, сильные стороны и подход к задачам. Её можно сохранить и обсудить с наставником.
        </p>
        <FinaleMedia />
        {needsArchetype && <p className="course-final-archetype">
            Для профкарты нужен твой архетип. Пройди тест и сохрани результат. После этого ты вернёшься сюда, а ответы курса останутся на месте.
        </p>}
        <Button 
            variant="fantasy" 
            onClick={onCompleteCourse} 
            disabled={isGeneratingAi}
            className="text-xl px-10 py-4"
        >
            {isGeneratingAi ? "Собираем профкарту…" : needsArchetype ? "Пройти тест на архетип" : "Собрать профкарту"}
        </Button>
    </div>
  );

  // --- MAIN RENDER ---

  return (
    <div className={`w-full h-full min-h-screen flex flex-col relative orienta-course overflow-hidden ${activeStage === null ? 'course-atlas' : 'stage-journey'}`}>
        {toastMsg && <Toast message={toastMsg} />}
        
        {/* Render Active Stage Overlay or Map */}
        {activeStage === null ? (
            <>
                {renderHeader()}
                <div className="atlas-body">
                    <WelcomeMedia />
                    {renderMap()}
                </div>
            </>
        ) : (
            <div className="stage-layout">
                <header className="stage-chapter-header"><button type="button" className={linear ? 'stage-camp-exit' : undefined} onClick={linear ? onBack : () => setActiveStage(null)} aria-label={linear ? 'В лагерь' : 'Вернуться к карте курса'}><ArrowLeft size={18} aria-hidden="true"/>{linear ? 'В лагерь' : 'На карту пути'}</button><span>{activeStage < 5 ? `Этап ${activeStage + 1} из 5` : 'Финал путешествия'}</span></header>
                <div className="stage-chapter-art" aria-hidden="true" style={{backgroundPosition:`center ${STAGE_CHAPTERS[activeStage].position}`}} />
                <div className="stage-chapter-title"><span className="stage-chapter-seal">{React.createElement(STAGE_CHAPTERS[activeStage].icon,{size:29,strokeWidth:1.6,'aria-hidden':true})}</span><div><p>{STAGE_CHAPTERS[activeStage].subtitle}</p><h1 ref={chapterTitle} tabIndex={-1}>{STAGE_CHAPTERS[activeStage].title}</h1></div></div>
                <div ref={stagePanel} className="stage-panel" data-anchored-exercise={anchoredExercise ? 'true' : undefined}>
                {stageMedia}
                {activeStage === 0 && renderStage1()}
                {activeStage === 1 && renderStage2()}
                {activeStage === 2 && renderStage3()}
                {activeStage === 3 && <DreamStage course={course} onChange={onChange} linear={linear} onFinish={() => finishStage(3, 0)} />}
                {activeStage === 4 && <AssessmentStage course={course} onChange={onChange} linear={linear} onFinish={() => finishStage(4, 0)} />}
                {activeStage === 5 && renderFinal()}
                </div>
            </div>
        )}
    </div>
  );
};
