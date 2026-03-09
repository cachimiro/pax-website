'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Calendar } from 'lucide-react';
import SelectionCard from '../SelectionCard';

interface BudgetTimelineScreenProps {
  budgetRange: string;
  timeline: string;
  packageChoice: string;
  onBudgetChange: (v: string) => void;
  onTimelineChange: (v: string) => void;
  onNext: () => void;
}

// Budget options filtered by package to avoid showing irrelevant ranges
const budgetOptionsByPackage: Record<string, { id: string; label: string }[]> = {
  budget: [
    { id: 'under-1000', label: 'Under £1,000' },
    { id: '1000-2000', label: '£1,000 – £2,000' },
    { id: 'guidance', label: 'I\'d like guidance' },
  ],
  paxbespoke: [
    { id: '1000-2000', label: '£1,000 – £2,000' },
    { id: '2000-4000', label: '£2,000 – £4,000' },
    { id: '4000-plus', label: '£4,000+' },
    { id: 'guidance', label: 'I\'d like guidance' },
  ],
  select: [
    { id: '2000-4000', label: '£2,000 – £4,000' },
    { id: '4000-plus', label: '£4,000+' },
    { id: 'guidance', label: 'I\'d like guidance' },
  ],
  unsure: [
    { id: 'under-1000', label: 'Under £1,000' },
    { id: '1000-2000', label: '£1,000 – £2,000' },
    { id: '2000-4000', label: '£2,000 – £4,000' },
    { id: '4000-plus', label: '£4,000+' },
    { id: 'guidance', label: 'I\'d like guidance' },
  ],
};

const timelineOptions = [
  { id: 'asap', label: 'Within 2 weeks' },
  { id: '1-2-months', label: '1–2 months' },
  { id: '2-3-months', label: '2–3 months' },
  { id: 'exploring', label: 'Just exploring' },
];

export default function BudgetTimelineScreen({
  budgetRange,
  timeline,
  packageChoice,
  onBudgetChange,
  onTimelineChange,
  onNext,
}: BudgetTimelineScreenProps) {
  const canContinue = budgetRange && timeline;
  const budgetOptions = budgetOptionsByPackage[packageChoice] ?? budgetOptionsByPackage.unsure;

  // If the previously selected budget is no longer in the filtered list, it's still valid
  // (user may have changed package) — we just show the current options

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-2xl md:text-3xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
          Budget & timing
        </h2>
        <p className="text-warm-500 mb-8">
          Helps us give you the most relevant advice on the call. No wrong answers.
        </p>
      </motion.div>

      {/* Budget range */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-8"
      >
        <h3 className="text-base font-semibold text-warm-800 mb-3 font-[family-name:var(--font-heading)]">
          What&apos;s your rough budget?
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {budgetOptions.map((opt, i) => (
            <motion.div
              key={opt.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.04 }}
            >
              <SelectionCard
                selected={budgetRange === opt.id}
                onClick={() => onBudgetChange(opt.id)}
              >
                <div className="text-center py-1 pr-6">
                  <p className="font-semibold text-sm text-warm-900 font-[family-name:var(--font-heading)]">
                    {opt.label}
                  </p>
                </div>
              </SelectionCard>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-8"
      >
        <h3 className="text-base font-semibold text-warm-800 mb-3 font-[family-name:var(--font-heading)]">
          When are you looking to get started?
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {timelineOptions.map((opt, i) => (
            <motion.div
              key={opt.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35 + i * 0.04 }}
            >
              <SelectionCard
                selected={timeline === opt.id}
                onClick={() => onTimelineChange(opt.id)}
              >
                <div className="text-center py-1 pr-6">
                  <Calendar className={`w-4 h-4 mx-auto mb-1 ${
                    timeline === opt.id ? 'text-orange-500' : 'text-warm-400'
                  }`} />
                  <p className="font-semibold text-sm text-warm-900 font-[family-name:var(--font-heading)]">
                    {opt.label}
                  </p>
                </div>
              </SelectionCard>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.button
        onClick={onNext}
        disabled={!canContinue}
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#E8872B] text-white font-semibold rounded-2xl hover:bg-[#d47a24] transition-all disabled:opacity-40 disabled:cursor-not-allowed font-[family-name:var(--font-heading)] shadow-lg shadow-orange-200/50"
      >
        Continue
        <ArrowRight className="w-4 h-4" />
      </motion.button>
    </div>
  );
}
