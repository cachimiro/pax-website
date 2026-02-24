'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface SelectionCardProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  badge?: string;
  className?: string;
}

export default function SelectionCard({ selected, onClick, children, badge, className = '' }: SelectionCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={`relative w-full text-left rounded-2xl border-2 p-5 transition-all duration-200 ${
        selected
          ? 'border-green-700 bg-green-50/60 shadow-sm'
          : 'border-warm-100 bg-white hover:border-warm-200 hover:shadow-sm'
      } ${className}`}
    >
      {badge && (
        <span className="absolute -top-2.5 right-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-500 text-white tracking-wide font-[family-name:var(--font-heading)]">
          {badge}
        </span>
      )}
      {/* Check indicator */}
      <div className={`absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
        selected ? 'bg-green-700' : 'border-2 border-warm-200'
      } ${badge ? 'top-6' : ''}`}>
        {selected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
      </div>
      {children}
    </motion.button>
  );
}
