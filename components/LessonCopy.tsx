import React from 'react';
import './lesson-copy.css';

export const LessonBrief = ({ theory, observe, task }: { theory: string; observe: string; task: string }) =>
  <dl className="lesson-brief">
    <div><dt>Что это</dt><dd>{theory}</dd></div>
    <div><dt>На что обратить внимание</dt><dd>{observe}</dd></div>
    <div><dt>Что делать</dt><dd>{task}</dd></div>
  </dl>;

export const LessonResult = ({ reason, children }: { reason: string; children?: React.ReactNode }) =>
  <div className="lesson-result">
    <h3>Что получилось и почему</h3>
    <p>{reason}</p>
    {children}
  </div>;

export const LessonAnswers = ({ rows }: { rows: readonly (readonly [string, string])[] }) =>
  <dl className="lesson-answer-list">
    {rows.map(([label, answer]) => <div key={label}><dt>{label}</dt><dd>{answer || 'Без ответа'}</dd></div>)}
  </dl>;
