import React from 'react';
import { Castle, Gem, CheckCircle } from 'lucide-react';
import type { CourseState } from '../types';
import { Button } from './Button';
import { LessonAnswers, LessonBrief, LessonResult } from './LessonCopy';
import { HOLLAND_QUESTIONS, INTEREST_TYPES, MOTIVATION_QUESTIONS, MOTIVATORS, WORKPLACES, WORK_PRIORITIES, WORK_STYLES } from '../data/assessments';
import { leaders, scoreInterests, scoreMotivation, summarizeMotivationChoices } from '../services/assessments';

type Props = { course: CourseState; onChange: React.Dispatch<React.SetStateAction<CourseState>>; onFinish: () => void; linear?: boolean };
const Frame = ({ children }: { children: React.ReactNode }) => <div className="max-w-xl mx-auto px-6 py-10 space-y-6">{children}</div>;
export const DreamStage = ({ course: c, onChange, onFinish, linear = false }: Props) => {
  const update = (patch: Partial<CourseState>) => onChange(prev => ({ ...prev, ...patch }));
  if (c.s4Phase === 'intro') return <Frame>
    <Castle className="w-14 h-14 text-amber-400" aria-hidden="true" />
    <h2 className="text-3xl font-serif text-white">Башня мечты</h2>
    <LessonBrief theory="Иногда проще представить один обычный рабочий день, чем сразу выбрать профессию."
      observe="В каком месте, ритме и с какими людьми тебе хотелось бы работать."
      task="Опиши свой будущий рабочий день. Потом выбери место, то, что важнее всего, и удобный формат дня." />
    <Button variant="fantasy" onClick={() => update({ s4Phase: 'dream' })}>{linear ? 'Дальше' : 'Построить свою башню'}</Button>
  </Frame>;
  if (c.s4Phase === 'dream') return <Frame>
    <h2 className="text-2xl font-serif text-white"><label htmlFor="dream-work">Твоя работа мечты</label></h2>
    <p id="dream-help" className="text-slate-200">В окне башни виден обычный вторник на твоей будущей работе. Где ты, что делаешь, кто рядом? Во сколько заканчиваешь, сколько зарабатываешь и как проходит вечер? Если пока не знаешь, так и напиши.</p>
    <textarea id="dream-work" aria-describedby="dream-help" maxLength={1200} value={c.s4Dream} onChange={e => update({ s4Dream: e.target.value })} className="w-full min-h-48 p-4 bg-slate-800 border border-slate-600 rounded-xl text-white" />
    <Button disabled={c.s4Dream.trim().length < 2} onClick={() => update({ s4Phase: 'place' })}>{linear ? 'Дальше' : 'Далее'}</Button>
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
      {!linear && <Button variant="ghost" onClick={() => update({ s4Phase: screen.back })}>← Предыдущий вопрос</Button>}
    </Frame>;
  }
  return <Frame><CheckCircle className="w-12 h-12 text-green-400" aria-hidden="true" /><h2 className="text-3xl font-serif text-white">Башня построена</h2>
    <LessonResult reason="Сравни день, который ты описал, с тем, что выбрал дальше. Если они не совсем совпадают, это подсказка, что стоит уточнить. Назови одно условие и спроси у специалиста, бывает ли так в его работе.">
      <LessonAnswers rows={[[ 'Твой рабочий день', c.s4Dream], ['Место', c.s4Place], ['Что важно', c.s4Priority], ['Формат дня', c.s4Style]]} />
    </LessonResult>
    <Button variant="fantasy" onClick={onFinish}>{linear ? 'Дальше' : 'На карту'}</Button>{!linear && <Button variant="ghost" onClick={() => update({ s4Phase: 'dream' })}>Изменить образ работы</Button>}
  </Frame>;
};

export const AssessmentStage = ({ course: c, onChange, onFinish, linear = false }: Props) => {
  const update = (patch: Partial<CourseState>) => onChange(prev => ({ ...prev, ...patch }));
  const interests = scoreInterests(c.hollandAnswers), motivation = scoreMotivation(c.motivationAnswers);
  const topInterests = leaders(interests, 2), topMotivation = leaders(motivation, 3);
  if (c.s5Phase === 'intro') return <Frame><Gem className="w-14 h-14 text-indigo-300" aria-hidden="true" />
    <h2 className="text-3xl font-serif text-white">Хрустальный зал</h2>
    <LessonBrief theory="Кристалл не назовёт твою профессию. Зато два коротких опросника помогут собрать подсказки."
      observe="Интересы: какие занятия тебе нравятся. Мотивация: что для тебя важнее в предложенных ситуациях. Это не диагностика и не проверка способностей."
      task="Отметь, насколько тебе близки 12 утверждений об интересах. Потом выбери по одному ответу в 10 вопросах о мотивации." />
    <Button variant="fantasy" onClick={() => update({ s5Phase: 'holland', s5Index: Math.min(c.hollandAnswers.length, 11) })}>{linear ? 'Дальше' : 'Исследовать интересы'}</Button>
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
      {!linear && idx > 0 && <Button variant="ghost" onClick={() => update({ s5Index: idx - 1 })}>← Предыдущий вопрос</Button>}
    </Frame>;
  }
  if (c.s5Phase === 'holland_result') return <Frame>
    <h2 className="text-2xl font-serif text-white">Твои профессиональные интересы</h2>
    <LessonResult reason={topInterests.length
      ? 'Эти направления набрали больше баллов по твоим отметкам. Ниже видно, за какие занятия. Это не список профессий, которые тебе подходят.'
      : 'Пока ни одно направление не выделилось по ответам. Это повод попробовать разные задачи, а не отсутствие способностей.'}>
      {topInterests.map(([key, score]) => {
        const type = INTEREST_TYPES[key as keyof typeof INTEREST_TYPES];
        const evidence = HOLLAND_QUESTIONS.flatMap((question, index) => question.type === key && c.hollandAnswers[index] > 0
          ? [`«${question.text}»: ${c.hollandAnswers[index] === 2 ? 'очень нравится' : 'нравится'}`] : []);
        return <p key={key}><strong>{type.title} · {score}/4</strong><br />{evidence.join('; ')}.</p>;
      })}
      {topInterests.length > 2 && <p>У нескольких направлений одинаковый результат, поэтому показаны все с равными баллами.</p>}
    </LessonResult>
    <Button onClick={() => update({ s5Phase: 'motivation_intro', s5Index: 0 })}>{linear ? 'Дальше' : 'К мотивации'}</Button>
  </Frame>;
  if (c.s5Phase === 'motivation_intro') return <Frame><h2 className="text-2xl font-serif text-white">Что тебя мотивирует?</h2>
    <p className="text-slate-200">Выбери то, что ближе тебе сейчас. Здесь нет правильных ответов. Можно хотеть разного в разных ситуациях.</p>
    <Button onClick={() => update({ s5Phase: 'motivation', s5Index: Math.min(c.motivationAnswers.length, 9) })}>{linear ? 'Дальше' : 'Начать опросник мотивации'}</Button>
  </Frame>;
  return <Frame><CheckCircle className="w-12 h-12 text-green-400" aria-hidden="true" /><h2 className="text-3xl font-serif text-white">Оба опросника пройдены</h2>
    <LessonResult reason="Ты выбрал, что важнее в каждой из десяти ситуаций. Ниже этот опросник группирует ответы по своему ключу. У категорий разное число возможностей набрать баллы, поэтому по цифрам нельзя сравнивать, что мотивирует тебя сильнее.">
      <p><strong>Больше всего баллов по ключу:</strong> {topMotivation.length ? topMotivation.map(([key, value]) => `${MOTIVATORS[key as keyof typeof MOTIVATORS]} · ${value}`).join('; ') : 'пока не выделились'}.</p>
      {topMotivation.length > 3 && <p>На границе первых трёх есть равные баллы, поэтому показаны все с таким результатом.</p>}
      <details><summary>Твои ответы о мотивации</summary>
        <LessonAnswers rows={summarizeMotivationChoices(c.motivationAnswers).map(({ question, choice }) => [question, choice])} />
      </details>
      <p>В профкарте ты увидишь интересы и мотивацию отдельно. Сверь подсказки со своими ответами и выбери, что хочешь проверить на практике.</p>
    </LessonResult>
    <Button variant="fantasy" onClick={onFinish}>{linear ? 'Дальше' : 'На карту'}</Button>
  </Frame>;
};
