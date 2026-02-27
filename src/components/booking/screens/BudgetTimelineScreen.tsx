'use client';

import { motion } from 'framer-motion';
import { ArrowRight, PoundSterling, Calendar, HelpCircle } from 'lucide-react';
import SelectionCard from '../SelectionCard';

interface BudgetTimelineScreenProps {
  budgetRange: string;
  timeline: string;
  onBudgetChange: (v: string) => void;
  onTimelineChange: (v: string) => void;
  onNext: () => void;
}

const budgetOptions = [
  { id: 'under-1000', label: 'Under £1,000', icon: PoundSterling },
  { id: '1000-2000', label: '£1,000 – £2,000', icon: PoundSterling },
  { id: '2000-4000', label: '£2,000 – £4,000', icon: PoundSterling },
  { id: '4000-plus', label: '£4,000+', icon: PoundSterling },
  { id: 'guidance', label: 'I\'d like guidance', icon: HelpCircle },
];

const timelineOptions = [
  { id: 'asap', label: 'Within 2 weeks' },
  { id: '1-2-months', label: '1–2 months' },
  { id: '2-3-months', label: '2–3 months' },
  { id: 'exploring', label: 'Just exploring for now' },
];

export default function BudgetTimelineScreen({
  budgetRange,
  timeline,
  onBudgetChange,
  onTimelineChange,
  onNext,
}: BudgetTimelineScreenProps) {
  const canContinue = budgetRange && timeline;

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-2xl md:text-3xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
          A couple of quick questions
        </h2>
        <p className="text-warm-500 mb-1">
          This helps us give you the most relevant advice on the call.
        </p>
        <p className="text-xs text-warm-400 mb-8 font-[family-name:var(--font-heading)]">
          There&apos;s no wrong answer. This just helps us make the most of your call.
        </p>
      </motion.div>

      {/* Budget range */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-8"
      >
        <h3 className="text-base font-semibold text-warm-800 mb-1 font-[family-name:var(--font-heading)]">
          What&apos;s your rough budget?
        </h3>
        <p className="text-xs text-warm-400 mb-3">
          Why we ask: So we can recommend the right package and set realistic expectations.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                <div className="text-center py-1">
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
        <h3 className="text-base font-semibold text-warm-800 mb-1 font-[family-name:var(--font-heading)]">
          When are you looking to get started?
        </h3>
        <p className="text-xs text-warm-400 mb-3">
          Why we ask: So we can advise on lead times and availability.
        </p>
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
                <div className="text-center py-1">
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
