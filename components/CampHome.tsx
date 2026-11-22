import React, { useState } from 'react';
import { Button } from './Button';
import type { FreeProgress } from '../services/freeProgress';
import { adventureArt } from '../services/adventureArt';
import type { TestResult } from '../types';

type Props = {
 local: FreeProgress; savedResult?: TestResult | null; signedIn?: boolean; courseAvailable?: boolean;
 onCourse: () => void; onTest: () => void; onGuide: () => void; onReset: () => void;
 children?: React.ReactNode;
};

export const CampHome = ({ local, savedResult, signedIn, courseAvailable, onCourse, onTest, onGuide, onReset, children }: Props) => {
 const [communityNotice, setCommunityNotice] = useState(false);
 const result = savedResult || local.result;
 const hero = savedResult ? savedResult.heroName : local.draft.heroData.name;
 const avatar = !savedResult && local.result ? adventureArt(local.draft.heroData.race, local.result.scoreType) : '';
 const testLabel = result ? 'Открыть мой гайд' : local.draft.step === 'start' ? 'Пройти тест' : 'Продолжить тест';
 const courseLabel = courseAvailable ? 'Открыть карту курса' : signedIn ? 'Курс «Ориента»' : 'Войти по коду';
 return <section className="adventure-camp camp-home max-w-4xl mx-auto space-y-6">
   <header>
     {avatar && <img className="camp-avatar" src={avatar} width={86} height={86} decoding="async" alt="Твой герой" />}
     <h1 className="text-4xl sm:text-5xl font-semibold">Мой лагерь</h1>
     <p className="mt-2">{hero ? `С возвращением, ${hero}.` : 'Здесь начинается твой маршрут.'}</p>
   </header>
   <div className="camp-destinations">
    <article className="camp-destination"><img src={import.meta.env.BASE_URL + 'design/course.webp'} alt="" width={72} height={72} loading="lazy" decoding="async"/><div>
      <h2>Курс «Ориента»</h2>
      <p>{courseAvailable ? 'Пять этапов на карте. Продолжай с того места, где остановился.' : signedIn ? 'Доступ к курсу подключает наставник.' : 'Если у тебя есть код от наставника, войди один раз и открой карту курса.'}</p>
      {signedIn && !courseAvailable ? null : <Button variant="fantasy" onClick={onCourse}>{courseLabel}</Button>}
    </div></article>
    <article className="camp-destination"><img src={import.meta.env.BASE_URL + 'design/archetype.webp'} alt="" width={72} height={72} loading="lazy" decoding="async"/><div>
      <h2>{result ? result.title : 'Мой архетип'}</h2>
      <p>{result ? 'Твои сильные стороны и идеи для профессиональных проб.' : 'Выбери героя и пройди пять игровых ситуаций.'}</p>
      <Button variant="secondary" onClick={result ? onGuide : onTest}>{testLabel}</Button>
    </div></article>
    <article className="camp-destination"><img src={import.meta.env.BASE_URL + 'design/community.webp'} alt="" width={72} height={72} loading="lazy" decoding="async"/><div>
      <h2>Сообщество</h2><p>Место для общения с участниками Ориенты.</p>
      <Button variant="secondary" onClick={() => setCommunityNotice(true)}>Открыть сообщество</Button>
      <div role="status" aria-live="polite">{communityNotice ? 'Сообщество скоро откроется' : ''}</div>
    </div></article>
   </div>
   {children}
   {!signedIn && <aside className="text-sm"><p>Результат теста хранится только в этом браузере. На общем устройстве его можно удалить.</p>
      {(local.result || local.draft.step !== 'start') && <button type="button" className="underline" onClick={onReset}>Удалить результат теста</button>}
   </aside>}
 </section>;
};
