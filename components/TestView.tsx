import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { TestResult, ARCHETYPES } from '../types';
import { ExternalLink, Image as ImageIcon } from 'lucide-react';

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
    general: {
        allCharacters: "https://i.postimg.cc/0QqPFksf/Obsaa-fotka-personazej.png",
        pigeon: "https://i.postimg.cc/k4dqzJms/Golub'.png"
    },
    races: {
        'Человек': {
            q1: "https://i.postimg.cc/x1h0GGp7/Celovek-1.png",
            q2: "https://i.postimg.cc/3xVKjjfS/Celovek-2.png",
            q3: "https://i.postimg.cc/zG6Jww2F/Celovek-3.png",
            q4: "https://i.postimg.cc/P5PX8Vyz/Celovek-4.png",
            q5: "https://i.postimg.cc/pLpWncCQ/Celovek-5.png",
            [Archetype.Commander]: "https://i.postimg.cc/x1cfbp50/Celovek-komandir.png",
            [Archetype.Creator]: "https://i.postimg.cc/dtWQ3c27/Celovek-sozidatel'.png",
            [Archetype.Researcher]: "https://i.postimg.cc/2SVkB9Gq/Celovek-issledovatel'.png",
            [Archetype.Communicator]: "https://i.postimg.cc/fRJz0qC9/Celovek-dusa-kompanii.png"
        },
        'Эльф': {
            q1: "https://i.postimg.cc/tCrRJG3q/El'fijka-1.png",
            q2: "https://i.postimg.cc/Prfrd58W/El'fika-2.png",
            q3: "https://i.postimg.cc/gkckG263/El'fika-3.png",
            q4: "https://i.postimg.cc/VLsLzkbV/El'fika-4.png",
            q5: "https://i.postimg.cc/59S2cCjj/El'fika-5.png",
            [Archetype.Commander]: "https://i.postimg.cc/Pr6fJnmF/El'fijka-komandir.png",
            [Archetype.Creator]: "https://i.postimg.cc/BQZQJn1R/El'fijka-sozidatel'.png",
            [Archetype.Researcher]: "https://i.postimg.cc/yYf6xCFw/El'fijka-issledovatel'.png",
            [Archetype.Communicator]: "https://i.postimg.cc/vHP8TwrM/El'fijka-dusa-kompanii.png"
        },
        'Орк': {
            q1: "https://i.postimg.cc/sXRsqjrp/Ork-1.png",
            q2: "https://i.postimg.cc/63NtgWXR/Ork-2.png",
            q3: "https://i.postimg.cc/mDGBJLs9/Ork-3.png",
            q4: "https://i.postimg.cc/rmLM3VkR/Ork-4.png",
            q5: "https://i.postimg.cc/zB186zrV/Ork-5.png",
            [Archetype.Commander]: "https://i.postimg.cc/Xv5nsZTG/Ork-komandir.png",
            [Archetype.Creator]: "https://i.postimg.cc/HLMT6JfV/Ork-sozidatel'.png",
            [Archetype.Researcher]: "https://i.postimg.cc/vmnG01pn/Ork-issledovatel'.png",
            [Archetype.Communicator]: "https://i.postimg.cc/7LzqKCp0/Ork-dusa-kompanii.png"
        },
        'Тролль': {
            q1: "https://i.postimg.cc/rp4qfdvV/Trol'-1.png",
            q2: "https://i.postimg.cc/pdjPs9gX/Trol'-2.png",
            q3: "https://i.postimg.cc/3wG3tyPh/Trol'-3.png",
            q4: "https://i.postimg.cc/6QZBM7Dw/Trol'-4.png",
            q5: "https://i.postimg.cc/mr9Tmc0W/Trol'-5.png",
            [Archetype.Commander]: "https://i.postimg.cc/KYTm0KC6/Trol'-Komandir.png",
            [Archetype.Creator]: "https://i.postimg.cc/wjZ6554C/Trol'-sozidatel'.png",
            [Archetype.Researcher]: "https://i.postimg.cc/XYmVKKD0/Trol'-issledovatel'.png",
            [Archetype.Communicator]: "https://i.postimg.cc/y8tVhhrs/Trol'-dusa-kompanii.png"
        }
    }
};

// --- NEW COMPONENT: Image with Skeleton Loader ---
const ImageWithSkeleton: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className }) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        const img = new Image();
        img.src = src;
        img.onload = () => setLoaded(true);
        img.onerror = () => setError(true);
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
                src={src} 
                alt={alt} 
                className={`w-full h-full object-cover transition-opacity duration-700 ease-in-out ${loaded ? 'opacity-100' : 'opacity-0'}`}
                loading="eager"
            />
            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-500 text-xs p-2 text-center">
                    <ImageIcon className="w-6 h-6 mb-1" />
                    <span>Failed to load</span>
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
        options: [
            { text: "Строго скажу: «Ложка моя! Но ты можешь работать на меня, будешь греть чай».", archetype: Archetype.Commander },
            { text: "Достану лупу: «Ого! А как ты дышишь в бульоне? Давай я тебя изучу!»", archetype: Archetype.Researcher },
            { text: "Улыбнусь: «О, говорящий суп! Давай сфоткаемся и поболтаем!»", archetype: Archetype.Communicator },
            { text: "Слеплю ему новую ложку из хлебного мякиша. Мне не жалко!", archetype: Archetype.Creator },
        ],
    },
    [Step.Question2]: {
        id: Step.Question2,
        text: "Ты идёшь по дороге и натыкаешься на странного гоблина с табличкой: «Прокачаю навыки. Недорого.» Что делаешь?",
        nextStep: Step.Question3,
        options: [
            { text: "Устраиваю бартер — он учит меня, а я делаю ему бренд.", archetype: Archetype.Creator },
            { text: "Убеждаю гоблина стать моим ассистентом.", archetype: Archetype.Commander },
            { text: "Спрашиваю, где источник данных, на чём основаны его навыки, требую портфолио.", archetype: Archetype.Researcher },
            { text: "Беру урок, мы болтаем, потом я становлюсь крёстным у его сына.", archetype: Archetype.Communicator },
        ],
    },
    [Step.Question3]: {
        id: Step.Question3,
        text: "Ты входишь в логово. Тебя встречает тролль и предлагает выбрать артефакт. Что берёшь?",
        nextStep: Step.Question4,
        options: [
            { text: "Кольцо Командующего. Придаёт голосу авторитет, даже если ты говоришь «пельмени».", archetype: Archetype.Commander },
            { text: "Кисть Идей. Всё, что ты рисуешь, становится частью реальности.", archetype: Archetype.Creator },
            { text: "Камень Разума. Усиливает мозг. Почти до состояния учителя по химии.", archetype: Archetype.Researcher },
            { text: "Перо Общения. Можно болтать даже с камнем. И камень будет рад.", archetype: Archetype.Communicator },
        ],
    },
    [Step.Question4]: {
        id: Step.Question4,
        text: "Выходишь из логова, а впереди — развилка с табличкой: «Налево — успех. Направо — друзья. Прямо — еда.» Ты...",
        nextStep: Step.Question5Intro,
        options: [
            { text: "Иду туда, где весело. Обычно там и еда, и успех.", archetype: Archetype.Communicator },
            { text: "Заворачиваю налево — потому что я заранее распланировал этот маршрут.", archetype: Archetype.Commander },
            { text: "Спрашиваю у прохожих, делаю опрос, голосование, устраиваю форум.", archetype: Archetype.Creator },
            { text: "Придумываю четвёртый путь. Он включает лодку и панду.", archetype: Archetype.Researcher },
        ],
    },
    [Step.Question5]: {
        id: Step.Question5,
        text: "У тебя в руках артефакт. Он светится, вибрирует и, кажется, показывает TikTok. Что ты с ним делаешь?",
        nextStep: Step.FinalScroll,
        options: [
            { text: "Провожу собрание. Распределяю артефакт по задачам.", archetype: Archetype.Commander },
            { text: "Разбираю его на части, чтобы понять принцип работы.", archetype: Archetype.Researcher },
            { text: "Устраиваю его вечеринку и зову всех.", archetype: Archetype.Communicator },
            { text: "Перепридумываю его заново. Добавляю блёстки и реакцию на музыку.", archetype: Archetype.Creator },
        ],
    },
};

interface TestViewProps {
  onComplete: (result: TestResult) => void;
  onCancel: () => void;
}

export const TestView: React.FC<TestViewProps> = ({ onComplete, onCancel }) => {
    // State
    const [step, setStep] = useState<Step>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        // @ts-ignore
        return saved ? JSON.parse(saved).step : Step.Start;
    });
    const [heroData, setHeroData] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved).heroData : { name: '', race: '' };
    });
    const [scores, setScores] = useState<any>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved).scores : {
            [Archetype.Commander]: 0,
            [Archetype.Creator]: 0,
            [Archetype.Researcher]: 0,
            [Archetype.Communicator]: 0,
        };
    });
    const [history, setHistory] = useState<any[]>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved).history || [] : [];
    });

    // New state for selection confirmation
    const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);

    const [isTransitioning, setIsTransitioning] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // BACKGROUND PRELOADING
    useEffect(() => {
        const priorityImages = [IMAGES.general.allCharacters];
        const otherImages: string[] = [];

        Object.values(IMAGES.general).forEach(url => { 
            if (url !== IMAGES.general.allCharacters) otherImages.push(url); 
        });
        Object.values(IMAGES.races).forEach((raceObj: any) => {
            Object.values(raceObj).forEach((url: any) => otherImages.push(url));
        });

        const loadList = (list: string[]) => {
            list.forEach(url => {
                const img = new Image();
                img.src = url;
            });
        };

        loadList(priorityImages);
        setTimeout(() => loadList(otherImages), 1000);

    }, []);

    useEffect(() => {
        const stateToSave = { step, heroData, scores, history };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }, [step, heroData, scores, history]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo(0, 0);
        }
        setSelectedOptionIdx(null);
    }, [step]);

    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const changeStep = async (nextStep: Step, newHistoryItem: any = null) => {
        setIsTransitioning(true);
        await wait(300); 
        
        if (newHistoryItem) {
            setHistory((prev: any) => [...prev, newHistoryItem]);
        }
        
        setStep(nextStep);
        setIsTransitioning(false);
    };

    const handleBack = async () => {
        if (history.length === 0) {
             onCancel(); 
             return;
        }
        
        setIsTransitioning(true);
        await wait(300);

        const previousState = history[history.length - 1];
        setStep(previousState.step);
        setScores(previousState.scores); 
        setHeroData(previousState.heroData); 
        
        setHistory((prev: any) => prev.slice(0, -1)); 
        setIsTransitioning(false);
    };

    const handleRestart = () => {
        localStorage.removeItem(STORAGE_KEY);
        setStep(Step.Start);
        setHeroData({ name: '', race: '' });
        setScores({
            [Archetype.Commander]: 0,
            [Archetype.Creator]: 0,
            [Archetype.Researcher]: 0,
            [Archetype.Communicator]: 0,
        });
        setHistory([]);
    };

    const createSnapshot = () => ({
        step,
        scores: { ...scores },
        heroData: { ...heroData }
    });

    const handleStart = () => changeStep(Step.CreateCharacterIntro, createSnapshot());
    const handleIntroComplete = () => changeStep(Step.ChooseCharacter, createSnapshot());
    
    const handleRaceSelect = (race: string) => {
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
        const snapshot = createSnapshot();
        setScores((prev: any) => ({
            ...prev,
            [archetype]: prev[archetype] + 1
        }));
        changeStep(nextStep, snapshot);
    };

    const getWinner = () => {
        const { Commander, Creator, Researcher, Communicator } = scores;
        const maxScore = Math.max(Commander, Creator, Researcher, Communicator);

        if (scores[Archetype.Commander] === maxScore) return Archetype.Commander;
        if (scores[Archetype.Creator] === maxScore) return Archetype.Creator;
        if (scores[Archetype.Researcher] === maxScore) return Archetype.Researcher;
        return Archetype.Communicator;
    };

    const handleComplete = () => {
         const winner = getWinner();
         const resultData = ARCHETYPES[winner];
         
         const finalResult: TestResult = {
             scoreType: winner,
             title: resultData.title,
             description: resultData.description.join('\n\n'),
             timestamp: new Date().toISOString()
         };
         
         onComplete(finalResult);
    };

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
                            <p>Они покажут, кем ты являешься на самом деле — и какие профессии тебе реально подойдут.</p>
                            <p className="font-semibold text-white pt-2">Готов? Тогда вперёд {EMOJI.ROCKET}</p>
                        </div>
                        <div className="pt-6 w-full max-w-md space-y-3">
                            <Button onClick={handleStart} variant="fantasy" fullWidth>Начать игру</Button>
                            <button onClick={onCancel} className="text-slate-500 hover:text-white underline text-sm">Назад в Хаб</button>
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
                return (
                    <div className="text-center space-y-6">
                        <h2 className="text-3xl font-serif text-white">Выбор происхождения</h2>
                        <div className="rounded-xl overflow-hidden shadow-2xl border border-slate-600 max-w-lg mx-auto mb-6 h-64 md:h-80 w-full">
                            <ImageWithSkeleton src={IMAGES.general.allCharacters} alt="Races" className="w-full h-full" />
                        </div>
                        <p className="text-slate-300">В Ориенте 4 великие расы. У каждой — свой стиль и подход к жизни. Кто ты?</p>
                        <p className="text-xs text-slate-500 uppercase tracking-widest">(Это только визуал)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto pt-4">
                            {[
                                { label: `Человек ${EMOJI.SHIELD}`, val: 'Человек' },
                                { label: `Эльф ${EMOJI.BOW}`, val: 'Эльф' },
                                { label: `Орк ${EMOJI.AXE}`, val: 'Орк' },
                                { label: `Тролль ${EMOJI.TUBE}`, val: 'Тролль' }
                            ].map((r) => (
                                <button
                                    key={r.val}
                                    onClick={() => handleRaceSelect(r.val)}
                                    className="bg-slate-800/60 hover:bg-purple-900/40 border border-slate-600 hover:border-purple-400 p-6 rounded-xl transition-all duration-300 text-xl font-serif text-white shadow-lg"
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>
                );

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
                                placeholder="Введи имя героя..."
                                value={heroData.name}
                                onChange={(e) => setHeroData((prev: any) => ({ ...prev, name: e.target.value }))}
                                className="w-full bg-slate-900/80 border-2 border-slate-600 focus:border-purple-500 outline-none rounded-lg p-4 text-white text-center text-xl placeholder-slate-600 transition-colors"
                            />
                            <Button type="submit" disabled={!heroData.name} variant="fantasy" fullWidth>Подтвердить имя</Button>
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
                    <div className="space-y-8 animate-fade-in pb-12">
                        <div className="bg-purple-900/20 px-4 py-1 rounded-full w-fit mx-auto text-xs font-bold tracking-widest text-purple-300 uppercase border border-purple-500/30">
                            Испытание
                        </div>
                        
                        {questionImage && (
                            <div className="rounded-xl overflow-hidden shadow-2xl border border-indigo-500/30 max-w-md mx-auto h-64 md:h-72 w-full">
                                <ImageWithSkeleton src={questionImage} alt="Situation" className="w-full h-full" />
                            </div>
                        )}

                        <h3 className="text-xl md:text-2xl font-serif text-white text-center leading-relaxed">
                            {question.text}
                        </h3>
                        
                        {/* Options */}
                        <div className="grid gap-3 pt-2">
                            {question.options.map((option: any, idx: number) => {
                                const isSelected = selectedOptionIdx === idx;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedOptionIdx(idx)}
                                        className={`w-full text-left border p-4 rounded-lg transition-all duration-200 group relative overflow-hidden ${
                                            isSelected 
                                                ? 'bg-purple-600/30 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
                                                : 'bg-slate-800/50 hover:bg-slate-700/80 border-slate-600 hover:border-purple-400 text-slate-200'
                                        }`}
                                    >
                                        <div className="flex items-start relative z-10">
                                            <span className={`w-6 h-6 rounded flex items-center justify-center text-xs mr-3 mt-1 flex-shrink-0 font-sans transition-colors ${
                                                isSelected 
                                                    ? 'bg-purple-500 text-white' 
                                                    : 'bg-slate-700 text-slate-300 group-hover:bg-purple-600 group-hover:text-white'
                                            }`}>
                                                {String.fromCharCode(65 + idx)}
                                            </span>
                                            {option.text}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Confirmation Button */}
                        <div className="pt-4 sticky bottom-0 bg-gradient-to-t from-slate-950 pt-6 pb-2 -mx-2 px-2">
                            <Button 
                                variant="fantasy" 
                                fullWidth 
                                disabled={selectedOptionIdx === null}
                                onClick={() => {
                                    if (selectedOptionIdx !== null) {
                                        const option = question.options[selectedOptionIdx];
                                        handleAnswer(option.archetype, question.nextStep);
                                    }
                                }}
                                className="shadow-2xl"
                            >
                                Подтвердить выбор {EMOJI.SWORDS}
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
                            <ImageWithSkeleton src={IMAGES.general.pigeon} alt="Messenger Pigeon" className="w-full h-full" />
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

                return (
                    <div className="text-center space-y-6 animate-fade-in pb-8">
                        <h2 className="text-4xl md:text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 mb-6">
                            {result.title}
                        </h2>
                        
                        {resultImage && (
                            <div className="rounded-xl overflow-hidden shadow-2xl border-2 border-amber-500/50 max-w-md mx-auto mb-6 transform hover:scale-[1.02] transition-transform duration-500 h-80 w-full">
                                <ImageWithSkeleton src={resultImage} alt={result.title} className="w-full h-full" />
                            </div>
                        )}
                        
                        <div className="bg-slate-900/50 p-6 rounded-xl text-left space-y-4 shadow-inner border border-slate-700/50">
                            {result.description.map((desc: string, i: number) => (
                                <p key={i} className="text-slate-300 leading-relaxed pl-4 border-l-2 border-purple-500/30">
                                    {desc}
                                </p>
                            ))}
                        </div>

                        <div className="bg-indigo-950/40 p-6 rounded-xl border border-indigo-500/20">
                            <h4 className="text-indigo-300 font-bold mb-2 uppercase text-sm">Тебе подойдут профессии:</h4>
                            <p className="text-white font-serif text-lg leading-relaxed">{result.professions}</p>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-700/50">
                            <p className="text-amber-400 font-bold text-xl mb-4 animate-pulse">
                                    Открыт полный доступ к Гайду!
                            </p>
                            
                            <Button 
                                onClick={handleComplete}
                                variant="fantasy"
                                fullWidth
                                className="text-xl py-4 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                            >
                                {EMOJI.SCROLL} Открыть Персональный Гайд
                            </Button>
                        </div>
                        
                        <div className="pt-8 space-y-4">
                            <button 
                                onClick={handleRestart}
                                className="text-slate-500 hover:text-white underline text-sm transition-colors block mx-auto"
                                title="Сбросить прогресс и начать сначала"
                            >
                                Пройти тест заново
                            </button>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="w-full h-full flex flex-col relative overflow-hidden">
             {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/20 blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[120px]"></div>
                <div className="absolute top-[20%] right-[20%] w-[20%] h-[20%] rounded-full bg-amber-500/5 blur-[80px]"></div>
            </div>

            <div 
                ref={scrollRef}
                className={`relative z-10 w-full max-w-2xl mx-auto flex-1 flex flex-col p-6 transition-all duration-500 ${isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}
                style={{ overflowY: 'auto' }}
            >
                {step !== Step.Start && step !== Step.Result && (
                    <button 
                        onClick={handleBack}
                        className="self-start mb-4 px-3 py-1 bg-slate-800/50 border border-slate-700 rounded text-slate-400 hover:text-white text-sm"
                    >
                        {EMOJI.BACK} Назад
                    </button>
                )}
                {renderContent()}
            </div>
        </div>
    );
};
