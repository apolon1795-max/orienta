import React from 'react';
import { Download, Printer, Sparkles, Compass, Feather, Shield, Mountain, Gem, Map, Flag, BookOpen } from 'lucide-react';
import type { UserState } from '../types';
import { Button } from './Button';
import { buildProfileText, downloadText, profileSections } from '../services/profile';
import { adventureArt } from '../services/adventureArt';
import './profile-design.css';

const sectionIcons = [Compass, Feather, Shield, Mountain, Gem, Sparkles, Map, Flag];
export const ProfileView = ({ state, onBack, backLabel, onConsultation, onAi, aiConfigured, generating, error }: {
  state: UserState; onBack: () => void; backLabel?: string; onConsultation: () => void; onAi: () => void;
  aiConfigured: boolean; generating: boolean; error: string | null;
}) => {
  const sections = profileSections(state);
  const archetype = state.testResult?.scoreType || 'Creator';
  const art = ['Commander', 'Creator', 'Researcher', 'Communicator'].includes(archetype) ? adventureArt('Человек', archetype) : undefined;
  return <article className="profile-page hero-atlas" data-archetype={archetype}>
    <nav className="print-hidden atlas-nav" aria-label="Навигация профкарты"><Button variant="ghost" onClick={onBack}>{backLabel || '← Хаб'}</Button><span>Ориента / Твой путь</span></nav>
    <div className="atlas-sheet">
      <header className="atlas-cover">
        <div className="atlas-cover-copy">
          <BookOpen className="atlas-emblem" aria-hidden="true" />
          <h1>Профкарта <br />Героя</h1>
          <p className="atlas-name">{state.testResult?.heroName || 'Искатель'}</p>
          {state.testResult?.title && <p className="atlas-archetype">{state.testResult.title}</p>}
          <p className="atlas-intro">Ты собрал ответы всех пяти этапов: интересы, ценности, навыки, образ будущей работы и мотивацию. Профкарта основана на твоих ответах и помогает выбрать, какую профессию попробовать.</p>
        </div>
        {art && <figure className="atlas-portrait"><img src={art} alt={`Иллюстрация игрового архетипа: ${state.testResult?.title || 'Герой'}`} /><figcaption>Твой игровой архетип</figcaption></figure>}
      </header>
      <div className="atlas-chapters">
        {sections.map((section, index) => {
          const mixed = section.title === 'Смешанный игровой результат';
          const iconIndex = index - (sections[0]?.title === 'Смешанный игровой результат' ? 1 : 0);
          const Icon = mixed ? Compass : sectionIcons[iconIndex] || BookOpen;
          const isScores = section.title.startsWith('Профессиональные интересы:') || section.title.startsWith('Мотивация:');
          const isNext = section.title === 'Следующий шаг';
          const isDream = section.title === 'Башня мечты: желаемая работа';
          return <section key={section.title} className={`atlas-chapter${isScores ? ' atlas-scores' : ''}${isNext ? ' atlas-next' : ''}${isDream ? ' atlas-dream' : ''}`}>
            <h2><Icon aria-hidden="true" /><span>{section.title}</span></h2>
            <ul>
              {section.lines.map((line, i) => {
                const score = isScores && line.match(/^(.+): (\d+)(\/4| баллов)$/);
                return <li key={i} className={score ? 'atlas-score-line' : ''}>
                  {score ? <><span>{score[1]}</span><span className="atlas-score-value">{score[2]}{score[3]}</span></> : line}
                </li>;
              })}
            </ul>
          </section>;
        })}
      </div>
      <p className="atlas-note">Игровой тест и самоанализ помогают исследовать варианты. Они не заменяют психологическую диагностику и не определяют профессиональную пригодность.</p>
      {state.aiSummary && <section className="atlas-chapter atlas-ai">
        <h2><Sparkles aria-hidden="true" /><span>{state.summarySource === 'ai' ? 'Дополнительный ИИ-разбор' : 'Ранее сохранённый вывод'}</span></h2>
        <p className="atlas-ai-text">{state.aiSummary}</p>
      </section>}
    </div>
    <div className="print-hidden atlas-actions">
      <div className="atlas-export"><Button variant="fantasy" onClick={() => downloadText('orienta-profmap.txt', buildProfileText(state))}><Download className="w-5 h-5" />Скачать профкарту</Button><Button variant="secondary" onClick={() => window.print()}><Printer className="w-5 h-5" />Печать / PDF</Button></div>
      {aiConfigured && <div className="atlas-ai-consent">
        <p>По кнопке ответы из профкарты отправятся в ProxyAPI и OpenAI для разбора. Убери из свободных ответов имена, контакты и название школы. Запрос обрабатывается за пределами России.</p>
        <Button disabled={generating || state.summarySource === 'ai' && !!state.aiSummary} onClick={onAi}><Sparkles className="w-5 h-5" />{generating ? 'Готовим разбор…' : state.summarySource === 'ai' && state.aiSummary ? 'Разбор сохранён' : 'Получить ИИ-разбор'}</Button>
        {error && <p role="alert" className="atlas-error">{error} Профкарта сохранена. Можно повторить запрос.</p>}
      </div>}
      <Button variant="outline" onClick={onConsultation}>Обсудить с наставником</Button>
    </div>
  </article>;
};
