'use client';

import { motion } from 'framer-motion';

interface ProgressRingProps {
  current: number;
  total: number;
  label?: string;
}

export default function ProgressRing({ current, total, label }: ProgressRingProps) {
  const progress = Math.min(current / total, 1);
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          {/* Background ring */}
          <circle
            cx="32" cy="32" r={radius}
            fill="none"
            stroke="var(--warm-100)"
            strokeWidth="4"
          />
          {/* Progress ring */}
          <motion.circle
            cx="32" cy="32" r={radius}
            fill="none"
            stroke="var(--green-700)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-warm-900 font-[family-name:var(--font-heading)]">
            {current}/{total}
          </span>
        </div>
      </div>
      {label && (
        <span className="text-sm text-warm-500 font-medium">{label}</span>
      )}
    </div>
  );
}
