
import React from 'react';
import { Keyword } from '../types';

interface Props {
  keywords: Keyword[];
}

const WordCloud: React.FC<Props> = ({ keywords }) => {
  // Sort keywords to put largest in center
  const sorted = [...keywords].sort((a, b) => b.value - a.value);
  
  const getColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-emerald-600';
      case 'negative': return 'text-rose-600';
      default: return 'text-slate-600';
    }
  };

  const getBgColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-emerald-50';
      case 'negative': return 'bg-rose-50';
      default: return 'bg-slate-50';
    }
  };

  return (
    <div className="flex flex-wrap gap-2 justify-center items-center p-4">
      {sorted.map((kw, i) => {
        const sizeClass = kw.value > 8 ? 'text-2xl font-bold' : kw.value > 5 ? 'text-xl font-semibold' : 'text-sm font-medium';
        return (
          <span 
            key={i}
            className={`px-3 py-1.5 rounded-full transition-all hover:scale-110 cursor-default ${getColor(kw.sentiment)} ${getBgColor(kw.sentiment)} ${sizeClass}`}
          >
            {kw.text}
          </span>
        );
      })}
    </div>
  );
};

export default WordCloud;
