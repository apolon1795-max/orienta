import React, { useState } from 'react';
import { Button } from './Button';
import type { FreeProgress } from '../services/freeProgress';
import { adventureArt } from '../services/adventureArt';
import type { TestResult } from '../types';
import { campNext, type CampTransfer } from '../services/campNext';
import './camp-flow.css';

type Props = {
 local: FreeProgress; savedResult?: TestResult | null; signedIn?: boolean; courseAvailable?: boolean;
 courseStarted?: boolean; courseComplete?: boolean; cardReady?: boolean; onProfileCard?: () => void; onResume?: () => void;
 onCourse: () => void; onSignIn?: () => void; onTest: () => void; onGuide: () => void; onReset: () => void;
 archetypeTransfer?: React.ReactNode; transfer?: CampTransfer; children?: React.ReactNode;
};
export const CampHome = ({ local, savedResult, signedIn = false, courseAvailable = false, courseStarted = false, courseComplete = false, cardReady = false, onCourse, onSignIn, onResume, onProfileCard, onTest, onGuide, onReset, archetypeTransfer, transfer = 'hidden', children }: Props) => {
 const [communityNotice, setCommunityNotice] = useState(false);
 const [cardNotice, setCardNotice] = useState(false);
 const result = savedResult || local.result;
 const hero = savedResult ? savedResult.heroName : local.draft.heroData.name;
 const avatar = !savedResult && local.result ? adventureArt(local.draft.heroData.race, local.result.scoreType) : '';
 const testStarted = local.draft.step !== 'start' && local.draft.step !== 'result';
 const next = campNext({ signedIn, hasLocalResult: !!local.result, hasSavedResult: !!savedResult, testStarted, courseAvailable, courseStarted, courseComplete, cardReady, transfer });
 const nextAction = next.step === 'test' ? onTest : next.step === 'sign-in' ? onSignIn ?? onCourse : next.step === 'resume' ? onResume ?? onCourse : next.step === 'profile' ? onProfileCard : onCourse;
 const steps = [
  { name: 'Архетип', status: savedResult ? 'Сохранён в профиле' : local.result ? 'Есть в этом браузере' : testStarted ? 'Тест начат' : 'Тест впереди', done: !!savedResult || !signedIn && !!local.result },
  { name: 'Курс', status: courseComplete ? 'Все 5 этапов пройдены' : courseStarted ? 'В процессе' : courseAvailable ? 'Готов к началу' : 'Нужен код наставника', done: courseComplete },
  { name: 'Профкарта', status: cardReady ? 'Готова к просмотру' : 'После теста и курса', done: cardReady },
 ];
 const cardStatus = cardReady ? 'Готова к просмотру'
  : courseComplete && transfer === 'blocked' ? 'В этом профиле уже начат тест. Локальный архетип его не заменяет.'
  : courseComplete && result ? 'Сохрани архетип в профиле, чтобы открыть профкарту.'
  : result ? 'Откроется после курса'
  : courseComplete ? 'Узнай свой архетип, чтобы открыть профкарту.'
  : 'Откроется, когда пройдёшь курс и узнаешь архетип.';
 return <section className="adventure-camp camp-home max-w-4xl mx-auto space-y-6">
   <header className="camp-title">
     {avatar && <img className="camp-avatar" src={avatar} width={86} height={86} decoding="async" alt="Твой герой" />}
     <h1 className="text-4xl sm:text-5xl font-semibold">Мой лагерь</h1>
     <p className="mt-2">{hero ? `С возвращением, ${hero}.` : 'Здесь начинается твой маршрут.'}</p>
   </header>
   <ol className="camp-checklist" aria-label="Твой маршрут">
     {steps.map(({ name, status, done }, index) => <li key={name} data-complete={done}>
       <span className="camp-checklist-number" aria-hidden="true">{index + 1}</span>
       <span><strong>{name}</strong><small>{status}</small></span>
     </li>)}
   </ol>
   <section className="camp-course-primary space-y-3" aria-labelledby="camp-next-title">
     <h2 id="camp-next-title">Твой следующий шаг</h2>
     <p>{next.help}</p>
     {next.step === 'transfer' ? archetypeTransfer : next.step !== 'wait' && nextAction
       ? <Button variant="fantasy" fullWidth onClick={nextAction}>{next.label}</Button> : null}
     {courseAvailable && (next.step === 'resume' || next.step === 'profile')
       && <button className="camp-map-link" type="button" onClick={onCourse}>Открыть карту курса</button>}
     {!signedIn && next.step !== 'sign-in'
       && <button className="camp-map-link" type="button" onClick={onSignIn ?? onCourse}>У меня есть код</button>}
   </section>
   <div className="camp-destinations">
    <article className="camp-destination"><img src={import.meta.env.BASE_URL + 'design/archetype.webp'} alt="" width={72} height={72} loading="lazy" decoding="async"/><div>
      <Button variant="secondary" onClick={result ? onGuide : onTest}>Архетип</Button>
      <p>{result ? result.title : testStarted ? 'Продолжи с последнего вопроса' : 'Узнай свои сильные стороны'}</p>
      {transfer === 'blocked' ? archetypeTransfer : null}
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
   <a className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold" style={{ width: 'min(100%, 14rem)', textDecoration: 'none' }}
     data-button-variant="secondary" href="https://t.me/Daniil_Borisov" target="_blank" rel="noopener noreferrer">Техподдержка</a>
   {children}
   {!signedIn && <aside className="text-sm"><p>Результат теста хранится только в этом браузере. На общем устройстве его можно удалить.</p>
      {(local.result || local.draft.step !== 'start') && <button type="button" className="underline" onClick={onReset}>Удалить результат теста</button>}
   </aside>}
 </section>;
};
