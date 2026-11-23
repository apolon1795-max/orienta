import React from 'react';
import { aiReportBlocks } from '../services/aiReport';
import './ai-report.css';

const inline = (value: string): React.ReactNode => {
  const label = value.match(/^(Попробуй:|Почему:|Проба:)(\s+.*)$/);
  if (label) return <><strong>{label[1]}</strong>{inline(label[2])}</>;
  return value.split(/(\*\*[^*\n]+\*\*|__[^_\n]+__)/g).map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part.slice(2, -2)}</strong> : part);
};

// Plain output only. React escapes text; do not interpret HTML or turn user/model text into links.
export const AiReport = ({ text }: { text: string }) => <div className="atlas-ai-report">
  {aiReportBlocks(text).map((block, i) => {
    if (block.kind === 'heading') return <h3 key={i}>{inline(block.text)}</h3>;
    if (block.kind === 'paragraph') return <p key={i}>{inline(block.text)}</p>;
    if (block.kind === 'bullets') return <ul key={i}>{block.items.map((item, k) => <li key={k}>{inline(item)}</li>)}</ul>;
    return <ol key={i} start={block.start}>{block.items.map((item, k) => <li key={k}>
      <strong>{inline(item.title)}</strong>
      {item.details.map((detail, d) => <p key={d}>{inline(detail)}</p>)}
    </li>)}</ol>;
  })}
</div>;
