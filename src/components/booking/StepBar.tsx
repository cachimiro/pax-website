'use client';

import { motion } from 'framer-motion';

interface StepBarProps {
  current: number;
  total: number;
  labels: Record<number, string>;
}

export default function StepBar({ current, total, labels }: StepBarProps) {
  const progress = Math.min(current / total, 1);

  return (
    <div>
      {/* Step label */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-warm-700 font-[family-name:var(--font-heading)]">
          {labels[current] || ''}
        </span>
        <span className="text-[10px] text-warm-400 font-[family-name:var(--font-heading)]">
          Step {current} of {total}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 sm:h-1.5 bg-warm-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full"
          initial={false}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        />
      </div>

      {/* Step dots (desktop only) */}
      <div className="hidden md:flex items-center justify-between mt-2">
        {Array.from({ length: total }, (_, i) => i + 1).map((s) => (
          <div key={s} className="flex flex-col items-center">
            <div
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                s <= current ? 'bg-orange-500' : s === current + 1 ? 'bg-orange-200' : 'bg-warm-200'
              }`}
            />
            <span className={`text-[9px] mt-1 font-[family-name:var(--font-heading)] ${
              s <= current ? 'text-orange-600' : 'text-warm-300'
            }`}>
              {labels[s]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
