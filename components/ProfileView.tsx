import React from 'react';
import { Download, Printer, Sparkles, Trophy } from 'lucide-react';
import type { UserState } from '../types';
import { Button } from './Button';
import { buildProfileText, downloadText, profileSections } from '../services/profile';
export const ProfileView = ({ state, onBack, onConsultation, onAi, aiConfigured, generating, error }: {
  state: UserState; onBack: () => void; onConsultation: () => void; onAi: () => void;
  aiConfigured: boolean; generating: boolean; error: string | null;
}) => (
  <article className="max-w-3xl mx-auto p-6 pb-16 profile-page">
    <div className="print-hidden mb-8"><Button variant="ghost" onClick={onBack}>← Хаб</Button></div>
    <header className="mb-10">
      <Trophy className="w-12 h-12 text-amber-400 mb-5" aria-hidden="true" />
      <h1 className="text-3xl sm:text-4xl font-serif font-bold text-amber-200 mb-3">Твоя профкарта</h1>
      <p className="text-lg text-slate-200">{state.testResult?.heroName || 'Искатель'} · {state.testResult?.title}</p>
      <p className="text-slate-300 mt-4 leading-relaxed">Ты собрал свои интересы, ценности и подход к задачам. Профкарта основана на твоих ответах и помогает выбрать, какую профессию попробовать.</p>
    </header>
    {profileSections(state).map(section => (
      <section key={section.title} className="py-6 border-t border-slate-700 break-inside-avoid">
        <h2 className="text-xl font-serif font-bold text-white mb-4">{section.title}</h2>
        <ul className="space-y-3 text-slate-200 leading-relaxed list-disc pl-5">
          {section.lines.map((line, i) => <li key={i} className="break-words">{line}</li>)}
        </ul>
      </section>
    ))}
    <p className="text-sm text-slate-300 py-6 border-t border-slate-700">Игровой тест и самоанализ помогают исследовать варианты. Они не заменяют психологическую диагностику и не определяют профессиональную пригодность.</p>
    {state.aiSummary && (
      <section className="py-6 border-t border-slate-700">
        <h2 className="text-xl font-serif font-bold text-white mb-4">{state.summarySource === 'ai' ? 'Дополнительный ИИ-разбор' : 'Ранее сохранённый вывод'}</h2>
        <p className="whitespace-pre-wrap text-slate-200 leading-relaxed">{state.aiSummary}</p>
      </section>
    )}
    <div className="print-hidden pt-6 space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="fantasy" onClick={() => downloadText('orienta-profmap.txt', buildProfileText(state))}><Download className="w-5 h-5" />Скачать профкарту</Button>
        <Button variant="secondary" onClick={() => window.print()}><Printer className="w-5 h-5" />Печать / PDF</Button>
      </div>
      {aiConfigured && <div className="py-6 border-t border-slate-700">
        <p className="text-sm text-slate-300 mb-4">Дополнительный разбор отправит ответы из профкарты в настроенный сервис ИИ.</p>
        <Button disabled={generating} onClick={onAi}><Sparkles className="w-5 h-5" />{generating ? 'Готовим разбор…' : 'Получить ИИ-разбор'}</Button>
        {error && <p role="alert" className="text-red-300 mt-4">{error} Профкарта сохранена. Можно повторить запрос.</p>}
      </div>}
      <Button variant="outline" onClick={onConsultation}>Обсудить с наставником</Button>
    </div>
  </article>
);
