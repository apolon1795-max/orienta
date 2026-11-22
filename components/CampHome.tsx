import React, { useState } from 'react';
import { Button } from './Button';
import type { FreeProgress } from '../services/freeProgress';
import { adventureArt } from '../services/adventureArt';
import type { TestResult } from '../types';

type Props = {
 local: FreeProgress; savedResult?: TestResult | null; signedIn?: boolean; courseAvailable?: boolean; courseStarted?: boolean;
 courseComplete?: boolean; cardReady?: boolean; onMap?: () => void; onProfileCard?: () => void;
 onCourse: () => void; onTest: () => void; onGuide: () => void; onReset: () => void;
 children?: React.ReactNode;
};
export const CampHome = ({ local, savedResult, signedIn, courseAvailable, courseStarted, courseComplete, cardReady, onCourse, onMap, onProfileCard, onTest, onGuide, onReset, children }: Props) => {
 const [communityNotice, setCommunityNotice] = useState(false);
 const [cardNotice, setCardNotice] = useState(false);
 const result = savedResult || local.result;
 const hero = savedResult ? savedResult.heroName : local.draft.heroData.name;
 const avatar = !savedResult && local.result ? adventureArt(local.draft.heroData.race, local.result.scoreType) : '';
 const testLabel = local.draft.step === 'start' ? 'Пройти тест' : 'Продолжить тест';
 const cardStatus = cardReady ? 'Готова к просмотру'
  : courseComplete && result ? 'Сохрани архетип в профиле, чтобы открыть профкарту.'
  : result ? 'Откроется после курса'
  : courseComplete ? 'Узнай свой архетип, чтобы открыть профкарту.'
  : 'Откроется, когда пройдёшь курс и узнаешь архетип.';
 const courseLabel = courseAvailable ? courseStarted ? 'Продолжить курс' : 'Начать курс' : 'Войти по коду';
 return <section className="adventure-camp camp-home max-w-4xl mx-auto space-y-6">
   <header>
     {avatar && <img className="camp-avatar" src={avatar} width={86} height={86} decoding="async" alt="Твой герой" />}
     <h1 className="text-4xl sm:text-5xl font-semibold">Мой лагерь</h1>
     <p className="mt-2">{hero ? `С возвращением, ${hero}.` : 'Здесь начинается твой маршрут.'}</p>
   </header>
   <article className="camp-course-primary space-y-3">
     <h2>Курс «Ориента»</h2>
     {courseComplete ? <p className="font-semibold">Все пять этапов пройдены</p> : null}
     {!courseAvailable && <p>{signedIn ? 'Доступ к курсу подключает наставник.' : 'Если у тебя есть код от наставника, войди и начни курс.'}</p>}
     {(!signedIn || (courseAvailable && !courseComplete)) && <Button variant="fantasy" fullWidth onClick={onCourse}>{courseLabel}</Button>}
     {courseAvailable && onMap && <button type="button" className="camp-map-link" onClick={onMap}>Карта этапов</button>}
   </article>
   <div className="camp-destinations">
    <article className="camp-destination"><img src={import.meta.env.BASE_URL + 'design/archetype.webp'} alt="" width={72} height={72} loading="lazy" decoding="async"/><div>
      <Button variant="secondary" onClick={result ? onGuide : onTest}>Архетип</Button>
      <p>{result ? result.title : testLabel}</p>
    </div></article>
    <article className="camp-destination"><img src={import.meta.env.BASE_URL + 'design/course.webp'} alt="" width={72} height={72} loading="lazy" decoding="async"/><div>
      <Button variant="secondary" aria-describedby="camp-card-state" onClick={() => { if (cardReady && onProfileCard) onProfileCard(); else setCardNotice(true); }}>Профкарта</Button>
      <p id="camp-card-state" role={cardNotice && !cardReady ? 'status' : undefined}>{cardStatus}</p>
    </div></article>
    <article className="camp-destination"><img src={import.meta.env.BASE_URL + 'design/community.webp'} alt="" width={72} height={72} loading="lazy" decoding="async"/><div>
      <Button variant="secondary" onClick={() => setCommunityNotice(true)}>Сообщество · скоро</Button>
      {communityNotice && <p role="status">Сообщество скоро откроется</p>}
    </div></article>
   </div>
   {children}
   {!signedIn && <aside className="text-sm"><p>Результат теста хранится только в этом браузере. На общем устройстве его можно удалить.</p>
      {(local.result || local.draft.step !== 'start') && <button type="button" className="underline" onClick={onReset}>Удалить результат теста</button>}
   </aside>}
 </section>;
};
