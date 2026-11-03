import React from 'react';
import { LessonMedia } from './LessonMedia';
import { Castle, Gem, CheckCircle } from 'lucide-react';
import type { CourseState } from '../types';
import { Button } from './Button';
import { HOLLAND_QUESTIONS, INTEREST_TYPES, MOTIVATION_QUESTIONS, MOTIVATORS, WORKPLACES, WORK_PRIORITIES, WORK_STYLES } from '../data/assessments';
import { leaders, scoreInterests, scoreMotivation } from '../services/assessments';

type Props = { course: CourseState; onChange: React.Dispatch<React.SetStateAction<CourseState>>; onFinish: () => void };
const Frame = ({ children }: { children: React.ReactNode }) => <div className="max-w-xl mx-auto px-6 py-10 space-y-6">{children}</div>;
export const DreamStage = ({ course: c, onChange, onFinish }: Props) => {
  const update = (patch: Partial<CourseState>) => onChange(prev => ({ ...prev, ...patch }));
  if (c.s4Phase === 'intro') return <Frame>
    <LessonMedia stage={4} />
    <Castle className="w-14 h-14 text-amber-400" aria-hidden="true" />
    <h2 className="text-3xl font-serif text-white">Башня мечты</h2>
    <p className="text-slate-200 leading-relaxed">Представь свою будущую работу: место, людей, задачи и обычный день. Затем выбери, какой формат тебе ближе. Ответы помогут сформулировать, что стоит проверить на практике.</p>
    <Button variant="fantasy" onClick={() => update({ s4Phase: 'dream' })}>Построить свою башню</Button>
  </Frame>;
  if (c.s4Phase === 'dream') return <Frame>
    <h2 className="text-2xl font-serif text-white"><label htmlFor="dream-work">Твоя работа мечты</label></h2>
    <p id="dream-help" className="text-slate-200">Где ты работаешь, что делаешь, кто рядом? Какой график, доход и вечер после работы ты представляешь? Можно написать «пока не знаю» и то, что хочется попробовать.</p>
    <textarea id="dream-work" aria-describedby="dream-help" maxLength={1200} value={c.s4Dream} onChange={e => update({ s4Dream: e.target.value })} className="w-full min-h-48 p-4 bg-slate-800 border border-slate-600 rounded-xl text-white" />
    <Button disabled={c.s4Dream.trim().length < 2} onClick={() => update({ s4Phase: 'place' })}>Далее</Button>
  </Frame>;
  const screens = {
    place: { title: 'Где бы ты хотел работать?', options: WORKPLACES, key: 's4Place', next: 'priority', back: 'dream' },
    priority: { title: 'Что тебе важнее в работе?', options: WORK_PRIORITIES, key: 's4Priority', next: 'style', back: 'place' },
    style: { title: 'Как ты представляешь рабочий день?', options: WORK_STYLES, key: 's4Style', next: 'done', back: 'priority' },
  } as const;
  if (c.s4Phase in screens) {
    const screen = screens[c.s4Phase as keyof typeof screens];
    return <Frame><h2 className="text-2xl font-serif text-white">{screen.title}</h2>
      <div className="space-y-3">{screen.options.map(option => <Button key={option} fullWidth variant={c[screen.key] === option ? 'primary' : 'secondary'} aria-pressed={c[screen.key] === option} onClick={() => update({ [screen.key]: option, s4Phase: screen.next })}>{option}</Button>)}</div>
      <Button variant="ghost" onClick={() => update({ s4Phase: screen.back })}>← Предыдущий вопрос</Button>
    </Frame>;
  }
  return <Frame><CheckCircle className="w-12 h-12 text-green-400" aria-hidden="true" /><h2 className="text-3xl font-serif text-white">Башня построена</h2>
    <p className="text-slate-200 whitespace-pre-wrap">{c.s4Dream}</p>
    <ul className="list-disc pl-5 text-slate-200 space-y-3"><li>{c.s4Place}</li><li>{c.s4Priority}</li><li>{c.s4Style}</li></ul>
    <Button variant="fantasy" onClick={onFinish}>На карту</Button><Button variant="ghost" onClick={() => update({ s4Phase: 'dream' })}>Изменить образ работы</Button>
  </Frame>;
};

export const AssessmentStage = ({ course: c, onChange, onFinish }: Props) => {
  const update = (patch: Partial<CourseState>) => onChange(prev => ({ ...prev, ...patch }));
  const interests = scoreInterests(c.hollandAnswers), motivation = scoreMotivation(c.motivationAnswers);
  const topInterests = leaders(interests, 2), topMotivation = leaders(motivation, 3);
  if (c.s5Phase === 'intro') return <Frame><LessonMedia stage={5} /><Gem className="w-14 h-14 text-indigo-300" aria-hidden="true" />
    <h2 className="text-3xl font-serif text-white">Хрустальный зал</h2>
    <p className="text-slate-200">Впереди два авторских опросника: 12 утверждений о профессиональных интересах по шести направлениям Холланда и 10 вопросов о мотивации. Это короткая игровая адаптация для исследования вариантов, её точность как диагностики не установлена.</p>
    <Button variant="fantasy" onClick={() => update({ s5Phase: 'holland', s5Index: Math.min(c.hollandAnswers.length, 11) })}>Исследовать интересы</Button>
  </Frame>;
  if (c.s5Phase === 'holland' || c.s5Phase === 'motivation') {
    const holland = c.s5Phase === 'holland', questions = holland ? HOLLAND_QUESTIONS : MOTIVATION_QUESTIONS;
    const idx = Math.min(c.s5Index, questions.length - 1), question = questions[idx];
    const options = holland ? ['Не нравится', 'Нравится', 'Очень нравится'] : MOTIVATION_QUESTIONS[idx].options.map(o => o.text);
    const answers = holland ? c.hollandAnswers : c.motivationAnswers;
    return <Frame><p className="text-slate-300">{holland ? 'Интересы' : 'Мотивация'}: вопрос {idx + 1} из {questions.length}</p>
      <h2 className="text-2xl font-serif text-white">{question.text}</h2>
      <div className="space-y-3">{options.map((option, answer) => <Button key={option} fullWidth variant={answers[idx] === answer ? 'primary' : 'secondary'} aria-pressed={answers[idx] === answer} onClick={() => onChange(prev => {
        if (prev.s5Phase !== c.s5Phase || prev.s5Index !== c.s5Index) return prev;
        const nextAnswers = [...(holland ? prev.hollandAnswers : prev.motivationAnswers)]; nextAnswers[idx] = answer;
        return { ...prev, [holland ? 'hollandAnswers' : 'motivationAnswers']: nextAnswers, s5Index: idx + 1 < questions.length ? idx + 1 : 0, s5Phase: idx + 1 < questions.length ? c.s5Phase : holland ? 'holland_result' : 'done' };
      })}>{option}</Button>)}</div>
      {idx > 0 && <Button variant="ghost" onClick={() => update({ s5Index: idx - 1 })}>← Предыдущий вопрос</Button>}
    </Frame>;
  }
  if (c.s5Phase === 'holland_result') return <Frame>
    <h2 className="text-2xl font-serif text-white">Твои профессиональные интересы</h2>
    <p className="text-slate-200">{topInterests.length ? 'Ведущие направления по ответам:' : 'Пока ни одно направление не выделилось. Это повод попробовать разные задачи, а не отсутствие способностей.'}</p>
    {topInterests.map(([key, score]) => { const type = INTEREST_TYPES[key as keyof typeof INTEREST_TYPES]; return <p key={key} className="text-slate-200"><strong>{type.title} · {score}/4</strong><br />{type.description}</p>; })}
    {topInterests.length > 2 && <p className="text-sm text-slate-300">На границе топ-2 одинаковые баллы: показаны все направления с равным результатом.</p>}
    <Button onClick={() => update({ s5Phase: 'motivation_intro', s5Index: 0 })}>К мотивации</Button>
  </Frame>;
  if (c.s5Phase === 'motivation_intro') return <Frame><h2 className="text-2xl font-serif text-white">Что тебя мотивирует?</h2>
    <p className="text-slate-200">Десять вопросов о том, что важно в работе. Выбирай ближайший вариант. Ответы сохраняются после каждого шага.</p>
    <Button onClick={() => update({ s5Phase: 'motivation', s5Index: Math.min(c.motivationAnswers.length, 9) })}>Начать опросник мотивации</Button>
  </Frame>;
  return <Frame><CheckCircle className="w-12 h-12 text-green-400" aria-hidden="true" /><h2 className="text-3xl font-serif text-white">Оба опросника пройдены</h2>
    <h3 className="text-xl text-white">Главные мотиваторы</h3>
    <ul className="list-disc pl-5 text-slate-200 space-y-3">{topMotivation.map(([key, value]) => <li key={key}>{MOTIVATORS[key as keyof typeof MOTIVATORS]} · {value} баллов</li>)}</ul>
    {topMotivation.length > 3 && <p className="text-sm text-slate-300">На границе топ-3 есть равные баллы. Показаны все такие мотиваторы.</p>}
    <p className="text-slate-200">Теперь в Профкарте Героя будут все пять этапов. Она поможет выбрать профессиональную пробу и вопросы для разговора с наставником.</p>
    <Button variant="fantasy" onClick={onFinish}>На карту</Button>
  </Frame>;
};
