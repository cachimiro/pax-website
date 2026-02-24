'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQItemProps {
  question: string;
  answer: string;
}

export default function FAQItem({ question, answer }: FAQItemProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-warm-100">
      <button
        className="w-full flex items-center justify-between py-5 text-left group"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="text-base font-semibold text-warm-900 pr-4 font-[family-name:var(--font-heading)] group-hover:text-green-700 transition-colors">
          {question}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-warm-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="pb-5 text-sm text-warm-500 leading-relaxed animate-fade-in-up">
          {answer}
        </div>
      )}
    </div>
  );
}
