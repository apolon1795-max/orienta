import './test-atlas.css';
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { adventureArt, partyArt, pigeonArt } from '../services/adventureArt';
import { TestResult, ARCHETYPES } from '../types';
import { readTestDraft, createTestDraft, getTestWinners, TestDraft } from '../services/testProgress';
import { TEST_CHOICES } from '../data/testChoices';
import { ExternalLink, Image as ImageIcon, Shield, Leaf, Axe, Mountain, ArrowLeft, ArrowRight, BookOpen, Compass, Sparkles } from 'lucide-react';

const STORAGE_KEY = 'hero_game_progress_v2';

const EMOJI = {
    SWORDS: String.fromCodePoint(9876),
    SPARKLES: String.fromCodePoint(10024),
    ROCKET: String.fromCodePoint(128640),
    SHIELD: String.fromCodePoint(128737),
    BOW: String.fromCodePoint(127993),
    AXE: String.fromCodePoint(129683),
    TUBE: String.fromCodePoint(129514),
    KEY: String.fromCodePoint(128477),
    HORSE: String.fromCodePoint(128014),
    ZAP: String.fromCodePoint(9889),
    EYES: String.fromCodePoint(128064),
    SCROLL: String.fromCodePoint(128220),
    CRYSTAL: String.fromCodePoint(128302),
    FIRE: String.fromCodePoint(128293),
    CHECK: String.fromCodePoint(9989),
    STOP: String.fromCodePoint(9940),
    MONEY: String.fromCodePoint(128176),
    BACK: String.fromCodePoint(11013)
};

enum Step {
    Start = 'start',
    CreateCharacterIntro = 'create_character_intro',
    ChooseCharacter = 'choose_character',
    ChooseName = 'choose_name',
    IntroLore = 'intro_lore',
    Question1 = 'question_1',
    Question2 = 'question_2',
    Question3 = 'question_3',
    Question4 = 'question_4',
    Question5Intro = 'question_5_intro',
    Question5 = 'question_5',
    FinalScroll = 'final_scroll',
    Result = 'result',
}

const Archetype = {
    Commander: 'Commander',
    Creator: 'Creator',
    Researcher: 'Researcher',
    Communicator: 'Communicator',
};

const IMAGES = {
    general: { allCharacters: partyArt, pigeon: pigeonArt },
    races: Object.fromEntries(['Человек','Эльф','Орк','Тролль'].map(race => [race,
        Object.fromEntries(['q1','q2','q3','q4','q5',...Object.values(Archetype)].map(scene => [scene, adventureArt(race,scene)]))
    ]))
};

// --- NEW COMPONENT: Image with Skeleton Loader ---
const ImageWithSkeleton: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className }) => {
    const [imageState, setImageState] = useState<{ src: string; status: 'loaded' | 'error' } | null>(null);
    const loaded = imageState?.src === src && imageState.status === 'loaded';
    const error = imageState?.src === src && imageState.status === 'error';
    const syncCachedImage = React.useCallback((image: HTMLImageElement | null) => {
        if (image?.complete && image.naturalWidth > 0) setImageState({ src, status: 'loaded' });
    }, [src]);

    return (
        <div className={`relative overflow-hidden bg-slate-800 ${className}`}>
            {!loaded && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800 animate-pulse">
                    <ImageIcon className="w-8 h-8 text-slate-600 opacity-50" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 animate-[shimmer_1.5s_infinite]"></div>
                </div>
            )}
            <img
                key={src}
                ref={syncCachedImage}
                src={src}
                alt={alt}
                className="w-full h-full object-contain"
                loading="eager"
                fetchPriority="high"
                onLoad={() => setImageState({ src, status: 'loaded' })}
                onError={() => setImageState({ src, status: 'error' })}
            />
            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-500 text-xs p-2 text-center">
                    <ImageIcon className="w-6 h-6 mb-1" />
                    <span>Не удалось загрузить иллюстрацию</span>
                </div>
            )}
        </div>
    );
};

const QUESTIONS: any = {
    [Step.Question1]: {
        id: Step.Question1,
        text: "Ты просыпаешься в таверне, где проходил обряд вступления в Гильдию. Всё хорошо… пока из твоего супа не выныривает мини-дракон и требует отдать ему ложку. Что ты сделаешь?",
        nextStep: Step.Question2,
        options: TEST_CHOICES[Step.Question1],
    },
    [Step.Question2]: {
        id: Step.Question2,
        text: "Ты идёшь по дороге и натыкаешься на странного гоблина с табличкой: «Прокачаю навыки. Недорого.» Что делаешь?",
        nextStep: Step.Question3,
        options: TEST_CHOICES[Step.Question2],
    },
    [Step.Question3]: {
        id: Step.Question3,
        text: "Ты входишь в логово. Тебя встречает тролль и предлагает выбрать артефакт. Что берёшь?",
        nextStep: Step.Question4,
        options: TEST_CHOICES[Step.Question3],
    },
    [Step.Question4]: {
        id: Step.Question4,
        text: "Выходишь из логова, а впереди — развилка с табличкой: «Налево — успех. Направо — друзья. Прямо — еда.» Ты...",
        nextStep: Step.Question5Intro,
        options: TEST_CHOICES[Step.Question4],
    },
    [Step.Question5]: {
        id: Step.Question5,
        text: "У тебя в руках артефакт. Он светится, вибрирует и, кажется, показывает TikTok. Что ты с ним делаешь?",
        nextStep: Step.FinalScroll,
        options: TEST_CHOICES[Step.Question5],
    },
};

interface TestViewProps {
  onComplete: (result: TestResult) => void;
  onCancel: () => void;
  onResultCalculated?: (result: TestResult) => void;
  initialDraft?: TestDraft;
  onDraftChange?: (draft: TestDraft) => void;
  onRequestRestart?: () => void;
  onOpenCamp?: () => void;
}

export const TestView: React.FC<TestViewProps> = ({ onComplete, onCancel, onResultCalculated, initialDraft, onDraftChange, onRequestRestart, onOpenCamp }) => {
    const [initial] = useState(() => {
      if (initialDraft) return initialDraft;
      try { return readTestDraft(window.localStorage); } catch { return createTestDraft(); }
    });
    const [step, setStep] = useState<Step>(initial.step as Step);
    const [heroData, setHeroData] = useState(initial.heroData);
    const [scores, setScores] = useState<Record<string, number>>(initial.scores);
    const [history, setHistory] = useState(initial.history);

    // New state for selection confirmation
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

    const isTransitioning = false;
    const scrollRef = useRef<HTMLDivElement>(null);
    const hasCalculatedResult = useRef(false);
    const transitionLock = useRef(false);
    const touchStartRef = useRef<{x: number, y: number} | null>(null);

    useEffect(() => {
      const image = new Image(); image.src = IMAGES.general.allCharacters;
    }, []);

    useEffect(() => {
        const stateToSave = { step, heroData, scores, history };
        if (onDraftChange) onDraftChange(stateToSave);
        else { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave)); } catch { /* Keep in-memory progress. */ } }
    }, [step, heroData, scores, history, onDraftChange]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo(0, 0);
        }
        window.scrollTo(0, 0);
        setSelectedOptionId(null);
    }, [step]);

    const changeStep = (nextStep: Step, newHistoryItem: any = null) => {
        if (transitionLock.current) return;
        transitionLock.current = true;
        if (newHistoryItem) setHistory(prev => [...prev, newHistoryItem]);
        setStep(nextStep);
    };
    useEffect(() => { transitionLock.current = false; }, [step]);
    const handleBack = () => {
        if (transitionLock.current) return;
        if (!history.length) { onCancel(); return; }
        transitionLock.current = true;
        const previousState = history[history.length - 1];
        setStep(previousState.step as Step); setScores(previousState.scores); setHeroData(previousState.heroData);
        setHistory(prev => prev.slice(0, -1));
    };
    const handleRestart = () => { onRequestRestart?.(); };

    const createSnapshot = () => ({
        step,
        scores: { ...scores },
        heroData: { ...heroData }
    });

    const handleStart = () => changeStep(Step.CreateCharacterIntro, createSnapshot());
    const handleIntroComplete = () => changeStep(Step.ChooseCharacter, createSnapshot());

    const handleRaceSelect = (race: string) => {
        if (transitionLock.current) return;
        const snapshot = createSnapshot();
        setHeroData((prev: any) => ({ ...prev, race }));
        changeStep(Step.ChooseName, snapshot);
    };

    const handleNameSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (heroData.name.trim().length > 0) {
            changeStep(Step.IntroLore, createSnapshot());
        }
    };

    const handleLoreComplete = () => changeStep(Step.Question1, createSnapshot());

    const handleAnswer = (archetype: string, nextStep: Step) => {
        if (transitionLock.current) return;
        const snapshot = createSnapshot();
        setScores((prev: any) => ({
            ...prev,
            [archetype]: prev[archetype] + 1
        }));
        changeStep(nextStep, snapshot);
    };

    const getWinner = () => getTestWinners(scores)[0];

    const handleComplete = () => {
         const winner = getWinner();
         const resultData = ARCHETYPES[winner];

         const finalResult: TestResult = {
             scoreType: winner,
             title: resultData.title,
             description: resultData.description.join('\n\n'),
             timestamp: new Date().toISOString(), scores: { ...scores }, tiedTypes: getTestWinners(scores), heroName: heroData.name.trim()
         };

         onComplete(finalResult);
    };

    useEffect(() => {
        if (step === Step.Result && onResultCalculated && !hasCalculatedResult.current) {
            hasCalculatedResult.current = true;
            const winner = getWinner();
            const resultData = ARCHETYPES[winner];

            const finalResult: TestResult = {
                scoreType: winner,
                title: resultData.title,
                description: resultData.description.join('\n\n'),
                timestamp: new Date().toISOString(), scores: { ...scores }, tiedTypes: getTestWinners(scores), heroName: heroData.name.trim()
            };

            onResultCalculated(finalResult);
        }
    }, [step, scores, onResultCalculated]);

    const getQuestionImage = (currentStep: Step) => {
        // @ts-ignore
        const raceImages = IMAGES.races[heroData.race];
        if (!raceImages) return null;

        switch(currentStep) {
            case Step.Question1: return raceImages.q1;
            case Step.Question2: return raceImages.q2;
            case Step.Question3: return raceImages.q3;
            case Step.Question4: return raceImages.q4;
            case Step.Question5: return raceImages.q5;
            default: return null;
        }
    };

    const renderContent = () => {
        switch (step) {
            case Step.Start:
                return (
                    <div className="flex flex-col h-full justify-center items-center space-y-6 text-center">
                        <h1 className="text-4xl md:text-6xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-500 animate-pulse-slow">
                            Путь Героя {EMOJI.SWORDS}
                        </h1>
                        <p className="text-xl md:text-2xl text-purple-200 font-serif">
                            Добро пожаловать
                        </p>
                        <div className="space-y-4 text-slate-300 leading-relaxed max-w-lg mx-auto">
                            <p>Ты оказался здесь не случайно.</p>
                            <p>Это не просто тест — это Путь Героя.</p>
                            <p>В ближайшие 5 минут ты создашь своего персонажа, попадёшь в волшебный мир Ориенты и пройдёшь через цепочку испытаний.</p>
                            <p>Выборы помогут заметить твои предпочтения и наметить профессии для знакомства.</p>
                            <p className="font-semibold text-white pt-2">Готов? Тогда вперёд {EMOJI.ROCKET}</p>
                        </div>
                        <div className="pt-6 w-full max-w-md space-y-3">
                            <Button onClick={handleStart} variant="fantasy" fullWidth>Начать игру</Button>
                            <button onClick={onCancel} className="text-slate-500 hover:text-white underline text-sm">Вернуться к началу</button>
                        </div>
                    </div>
                );

            case Step.CreateCharacterIntro:
                return (
                    <div className="flex flex-col h-full justify-center items-center space-y-8 text-center min-h-[500px]">
                        <h2 className="text-4xl font-serif text-white drop-shadow-lg">
                            Рождение Легенды {EMOJI.SPARKLES}
                        </h2>

                        <div className="space-y-6 text-slate-200 leading-relaxed max-w-lg mx-auto text-lg">
                            <p>
                                Прежде чем ты отправишься в путь —
                                нужно выбрать, кем ты будешь в этом мире.
                            </p>
                            <p>
                                Ты создашь своего аватара —
                                выберешь расу и дашь ему имя.
                            </p>
                            <p className="text-purple-300 italic text-xl border-t border-purple-500/30 pt-4 mt-2">
                                Именно он станет героем твоей истории в Ориенте.
                            </p>
                        </div>

                        <div className="pt-4 w-full max-w-md">
                            <Button onClick={handleIntroComplete} variant="fantasy" fullWidth>Создать персонажа</Button>
                        </div>
                    </div>
                );

            case Step.ChooseCharacter:
                return <section className="character-atlas">
                    <header className="test-atlas-heading"><span>Ориента · Начало пути</span><h2>Выбери своего героя</h2><p>Четыре происхождения. Одна история, которую создаёшь ты.</p></header>
                    <div className="character-party"><ImageWithSkeleton src={IMAGES.general.allCharacters} alt="Персонажи Ориенты" className="w-full h-full" /></div>
                    <div className="character-options">
                        {[{val:'Человек', icon:Shield, desc:'Рыцарь в дорожном плаще'}, {val:'Эльф',icon:Leaf,desc:'Путешественница лесных земель'}, {val:'Орк',icon:Axe,desc:'Герой с могучим топором'}, {val:'Тролль',icon:Mountain,desc:'Странник из горного края'}].map(({val,icon:Icon,desc}) => <button type="button" key={val} className="character-choice" aria-label={val} onClick={()=>handleRaceSelect(val)}><span className="character-seal"><Icon size={26} strokeWidth={1.7} aria-hidden="true" /></span><span><strong>{val}</strong><small>{desc}</small></span><ArrowRight size={18} aria-hidden="true" /></button>)}
                    </div>
                    <p className="test-atlas-note">Это только внешний образ. Происхождение не влияет на ответы, баллы и архетип.</p>
                </section>;

            case Step.ChooseName:
                return (
                    <div className="flex flex-col h-full justify-center items-center space-y-8 text-center min-h-[500px]">
                        <h2 className="text-4xl font-serif text-white">Твое Имя</h2>

                        <div className="space-y-2">
                            <p className="text-slate-300 text-lg">Ну не будешь же ты весь путь "Герой №17"...</p>
                            <p className="text-slate-400 text-sm">Дай своему персонажу имя. Любое — от Бруталиуса до Ванильного Кекса.</p>
                        </div>

                        <form onSubmit={handleNameSubmit} className="max-w-md w-full mx-auto space-y-6 pt-4">
                            <input
                                type="text"
                                autoFocus
                                aria-label="Имя героя" maxLength={40} autoComplete="off" placeholder="Введи имя героя..."
                                value={heroData.name}
                                onChange={(e) => setHeroData((prev: any) => ({ ...prev, name: e.target.value }))}
                                className="w-full bg-slate-900/80 border-2 border-slate-600 focus:border-purple-500 outline-none rounded-lg p-4 text-white text-center text-xl placeholder-slate-600 transition-colors"
                            />
                            <Button type="submit" disabled={!heroData.name.trim()} variant="fantasy" fullWidth>Подтвердить имя</Button>
                        </form>
                    </div>
                );

            case Step.IntroLore:
                return (
                    <div className="flex flex-col h-full justify-center items-center space-y-6 text-center">
                        <h2 className="text-3xl font-serif text-purple-300">Гильдия Искателей {EMOJI.KEY}</h2>
                        <div className="space-y-4 text-slate-200 leading-relaxed max-w-lg mx-auto text-lg">
                            <p>Отлично.</p>
                            <p>Герой по имени <span className="text-amber-400 font-bold">{heroData.name}</span>, представитель великой расы <span className="text-amber-400 font-bold">{heroData.race}</span>, вступает в Гильдию Искателей.</p>
                            <div className="bg-purple-900/30 p-4 rounded-lg border border-purple-500/20 my-4">
                                <p className="italic">Здесь ты проходишь Путь Первого Испытания — серию ситуаций, которые раскроют твою суть.</p>
                            </div>
                            <p className="text-slate-400 text-sm">Не думай долго. Отвечай, как бы ты сделал на самом деле.</p>
                            <p className="text-slate-400 text-sm">Твои выборы влияют на то, кто ты есть.</p>
                        </div>
                        <div className="pt-4 w-full max-w-md">
                            <Button onClick={handleLoreComplete} variant="fantasy" fullWidth>Отправиться в путь {EMOJI.HORSE}</Button>
                        </div>
                    </div>
                );

            case Step.Question1:
            case Step.Question2:
            case Step.Question3:
            case Step.Question4:
            case Step.Question5:
                const question = QUESTIONS[step];
                const questionImage = getQuestionImage(step);

                return (
                    <div className="adventure-question space-y-8 animate-fade-in pb-12">
                        <div className="adventure-progress"><div role="progressbar" aria-label="Прогресс приключения" aria-valuemin={0} aria-valuemax={5} aria-valuenow={Object.keys(QUESTIONS).indexOf(step) + 1}><span style={{ width: `${(Object.keys(QUESTIONS).indexOf(step) + 1) * 20}%` }} /></div><p>Испытание {Object.keys(QUESTIONS).indexOf(step) + 1} из 5</p></div>

                        {questionImage && (
                            <div className="adventure-scene rounded-xl overflow-hidden shadow-2xl border border-indigo-500/30 max-w-md mx-auto h-64 md:h-72 w-full">
                                <ImageWithSkeleton src={questionImage} alt="Сцена игрового вопроса" className="w-full h-full" />
                            </div>
                        )}

                        <h3 className="adventure-question-copy text-xl md:text-2xl font-serif text-white text-center leading-relaxed">
                            {question.text}
                        </h3>

                        {/* Options */}
                        <div className="grid gap-3 pt-2">
                            {question.options.map((option: any, idx: number) => {
                                const isSelected = selectedOptionId === option.id;
                                return (
                                    <button
                                        key={option.id} aria-pressed={isSelected}
                                        onClick={(e) => {
                                            setSelectedOptionId(option.id);
                                        }}
                                        className={`adventure-answer ${isSelected ? 'is-selected' : ''}`}
                                    >
                                        <span className="answer-letter" aria-hidden="true">{'АБВГ'[idx]}</span>
                                        <span className="answer-copy">{option.text}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Confirmation Button */}
                        <div className="adventure-continue pt-4 sticky bottom-0 pt-6 pb-2 -mx-2 px-2">
                            <Button 
                                variant="fantasy" 
                                fullWidth 
                                disabled={selectedOptionId === null}
                                onClick={() => {
                                    if (selectedOptionId !== null) {
                                        const option = question.options.find((item: { id: string }) => item.id === selectedOptionId);
                                        if (option) handleAnswer(option.archetype, question.nextStep);
                                    }
                                }}
                                className="shadow-2xl"
                            >
                                Продолжить приключение
                            </Button>
                        </div>
                    </div>
                );

            case Step.Question5Intro:
                return (
                    <div className="flex flex-col h-full justify-center items-center text-center space-y-6">
                        <h2 className="text-3xl font-serif text-amber-400">Неожиданность! {EMOJI.ZAP}</h2>
                        <div className="space-y-4 text-slate-200 leading-relaxed max-w-lg mx-auto">
                            <p><span className="font-bold">{heroData.name}</span>, ты выбрал путь и уже сделал шаг вперёд…</p>
                            <p>Но <span className="font-bold text-red-400">БАЦ!</span> — под ногой срабатывает древний механизм.</p>
                            <p>Из земли с тихим звоном вылетает странный предмет. Ты ловишь его на лету.</p>
                            <div className="p-6 bg-indigo-900/30 rounded-full w-24 h-24 mx-auto flex items-center justify-center animate-pulse-slow border-2 border-indigo-400/30 shadow-[0_0_30px_rgba(139,92,246,0.3)]">
                                <div className="w-8 h-8 bg-indigo-400 rounded-full blur-sm"></div>
                            </div>
                            <p>Это... артефакт. Он пульсирует. Он странный. Он, возможно, немного танцует.</p>
                            <p>Вокруг — никого. Только ты и эта штука.</p>
                        </div>
                        <div className="pt-4 w-full max-w-md">
                            <Button onClick={() => changeStep(Step.Question5, createSnapshot())} variant="fantasy" fullWidth>Сжать артефакт и посмотреть {EMOJI.EYES}</Button>
                        </div>
                    </div>
                );

            case Step.FinalScroll:
                return (
                    <div className="flex flex-col h-full justify-center items-center text-center space-y-8">
                        <h2 className="text-3xl md:text-4xl font-serif text-amber-100">О, {heroData.name}!</h2>

                        <div className="rounded-xl overflow-hidden shadow-2xl border border-amber-500/30 max-w-md mx-auto h-64 w-full">
                            <ImageWithSkeleton src={IMAGES.general.pigeon} alt="Почтовый голубь со свитком" className="w-full h-full" />
                        </div>

                        <div className="space-y-4 text-slate-300 max-w-lg mx-auto">
                            <p>Ты прошёл все испытания Ориенты, и твой путь озарился истиной.</p>
                            <p>Внезапно над тобой пролетает огромный почтовый голубь, петляя между облаками и теряя перья.</p>
                            <p>С небес на крошечном парашютике опускается свернутый пергамент, запечатанный бордовой сургучной печатью с надписью: <strong className="text-amber-400">«Твоя Суть»</strong></p>
                            <p>Он плавно ложится тебе прямо в руки. Пергамент тёплый. Он словно живой.</p>
                            <p className="italic text-purple-300">Твоя рука тянется к печати...</p>
                        </div>
                        <div className="pt-8 flex justify-center w-full max-w-md">
                             <Button onClick={() => changeStep(Step.Result, createSnapshot())} variant="fantasy" fullWidth>
                                Развернуть свиток {EMOJI.SCROLL}
                             </Button>
                        </div>
                    </div>
                );

            case Step.Result:
                const winner = getWinner();
                const result = ARCHETYPES[winner];
                // @ts-ignore
                const resultImage = IMAGES.races[heroData.race]?.[winner];

                return <section className="archetype-atlas">
                    <div className="archetype-cover">
                        <div className="archetype-cover-copy"><span className="test-atlas-kicker">Ориента · Твой игровой архетип</span><h2>{result.title}</h2><p className="archetype-hero-name">{heroData.name}</p><p>Пять испытаний позади. Вот какой способ действовать чаще проявлялся в твоих ответах.</p></div>
                        {resultImage && <div className="archetype-portrait"><ImageWithSkeleton src={resultImage} alt={result.title} className="w-full h-full" /></div>}
                    </div>
                    <div className="archetype-body">
                        <section className="archetype-chapter"><h3><Sparkles aria-hidden="true" />Твоя сильная сторона</h3>{result.description.map((desc:string,i:number)=><p key={i}>{desc}</p>)}</section>
                        <section className="archetype-chapter"><h3><Compass aria-hidden="true" />Как сложился результат</h3><div className="archetype-score-grid">{Object.keys(Archetype).map(key=><div className="archetype-score" key={key}><span>{ARCHETYPES[key].title}</span><strong>{scores[key] || 0} / 5</strong></div>)}</div><p className="test-atlas-note">Каждый подтверждённый ответ даёт один балл одному архетипу. Всего пять ответов.</p>{getTestWinners(scores).length > 1 && <p className="archetype-tie">Равные баллы: {getTestWinners(scores).map(k=>ARCHETYPES[k].title).join(' и ')}. Это смешанный результат, а не двойное начисление. На обложке показан {result.title.toLowerCase()} по неизменному порядку архетипов игры.</p>}</section>
                        <section className="archetype-chapter"><h3><BookOpen aria-hidden="true" />Профессии для исследования</h3><p>{result.professions}</p><p className="test-atlas-note">Это игровые подсказки для знакомства с профессиями, не диагноз и не ограничение твоего выбора.</p></section>
                        <section className="archetype-next"><h3>Твой путь продолжается</h3><p>Открыт полный доступ к Гайду! В нём — идеи для следующих шагов.</p><Button onClick={handleComplete} variant="fantasy" fullWidth><BookOpen size={20} aria-hidden="true" />Подробнее о моём архетипе</Button>{onOpenCamp && <Button variant="outline" fullWidth onClick={onOpenCamp}>Вернуться в лагерь</Button>}<button type="button" className="archetype-restart" onClick={handleRestart}>Пройти тест заново</button></section>
                    </div>
                </section>;

            default:
                return null;
        }
    };

    return (
        <div data-step={step} className="adventure-test test-atlas w-full h-full flex flex-col relative overflow-hidden">
             {/* Background Elements */}
            <div className="adventure-glows absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/20 blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[120px]"></div>
                <div className="absolute top-[20%] right-[20%] w-[20%] h-[20%] rounded-full bg-amber-500/5 blur-[80px]"></div>
            </div>

            <div
                ref={scrollRef}
                className={`adventure-test-content relative z-10 w-full max-w-2xl mx-auto flex-1 flex flex-col p-6 transition-all duration-500 ${isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}
                style={{ overflowY: 'auto' }}
            >
                {step !== Step.Start && step !== Step.Result && (
                    <button
                        onClick={handleBack}
                        className="self-start mb-4 px-3 py-1 bg-slate-800/50 border border-slate-700 rounded text-slate-400 hover:text-white text-sm"
                    >
                        <ArrowLeft size={16} aria-hidden="true" /> Назад
                    </button>
                )}
                {renderContent()}
            </div>
        </div>
    );
};
