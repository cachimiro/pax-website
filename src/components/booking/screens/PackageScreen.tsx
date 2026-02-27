'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Check, HelpCircle } from 'lucide-react';
import SelectionCard from '../SelectionCard';
import MiniTestimonial from '../MiniTestimonial';

interface PackageScreenProps {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  postcodeLocation?: string;
}

const packages = [
  {
    id: 'budget',
    name: 'Budget',
    tagline: 'Smart & Simple',
    price: 'From £800',
    features: ['Standard IKEA PAX doors', 'Filler panels fitted', 'You supply IKEA items'],
    bestFor: 'Reasonably priced alternative to fitted wardrobes',
    color: '#f28c43',
  },
  {
    id: 'paxbespoke',
    name: 'PaxBespoke',
    tagline: 'Where Pax Meets Bespoke',
    price: 'From £1,500',
    features: ['Doors within IKEA/PAX range', 'Custom trim colours', 'Flush fillers', 'Skirting board finish'],
    bestFor: 'High-quality built-in finish at a sensible budget',
    color: '#2d5c37',
  },
  {
    id: 'select',
    name: 'Select',
    tagline: 'Designed Without Limits',
    price: 'From £2,500',
    features: ['Everything in PaxBespoke', 'Bespoke doors (spray-painted or vinyl)', 'Full wall integration', 'Sliding doors'],
    bestFor: 'Most premium finishes, little to no restrictions',
    popular: true,
    color: '#2d5c37',
  },
];

export default function PackageScreen({ value, onChange, onNext, postcodeLocation }: PackageScreenProps) {
  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-2xl md:text-3xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
          Which package interests you?
        </h2>
        <p className="text-warm-500 mb-1">
          {postcodeLocation
            ? `Great — we cover ${postcodeLocation}. Now, which finish level suits you?`
            : 'Pick the finish level that suits your space and budget.'}
        </p>
        <p className="text-xs text-warm-400 mb-6 font-[family-name:var(--font-heading)]">
          Why we ask: Knowing your preference helps us prepare relevant examples and pricing for your call.
        </p>
      </motion.div>

      <div className="space-y-3 mb-4">
        {packages.map((pkg, i) => (
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
          >
            <SelectionCard
              selected={value === pkg.id}
              onClick={() => onChange(pkg.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-warm-900 font-[family-name:var(--font-heading)]">
                      {pkg.name}
                    </p>
                    {pkg.popular && (
                      <span className="text-[10px] font-bold bg-[#2d5c37] text-white px-2 py-0.5 rounded-full font-[family-name:var(--font-heading)]">
                        Recommended
                      </span>
                    )}
                    <span className={`text-[10px] font-semibold uppercase tracking-wider font-[family-name:var(--font-heading)] ${
                      pkg.id === 'budget' ? 'text-[#f28c43]' : pkg.id === 'paxbespoke' ? 'text-[#2d5c37]' : 'text-[#2d5c37]'
                    }`}>
                      {pkg.tagline}
                    </span>
                  </div>
                  <p className="text-xs text-warm-500 mb-2">{pkg.bestFor}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {pkg.features.map((f) => (
                      <span key={f} className="flex items-center gap-1 text-xs text-warm-600">
                        <Check className="w-3 h-3" style={{ color: pkg.color }} />
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-warm-900 font-[family-name:var(--font-heading)]">
                    {pkg.price}
                  </p>
                  <p className="text-[10px] text-warm-400">fitted</p>
                </div>
              </div>
            </SelectionCard>
          </motion.div>
        ))}

        {/* Not sure option */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <SelectionCard
            selected={value === 'unsure'}
            onClick={() => onChange('unsure')}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                value === 'unsure' ? 'bg-orange-50' : 'bg-warm-50'
              }`}>
                <HelpCircle className={`w-5 h-5 ${
                  value === 'unsure' ? 'text-orange-500' : 'text-warm-400'
                }`} />
              </div>
              <div>
                <p className="font-semibold text-warm-900 text-sm font-[family-name:var(--font-heading)]">
                  Not sure yet — help me decide
                </p>
                <p className="text-xs text-warm-500">
                  We&apos;ll recommend the right package on the call based on your space and budget.
                </p>
              </div>
            </div>
          </SelectionCard>
        </motion.div>
      </div>

      <MiniTestimonial
        quote="I wasn't sure which package to pick. They recommended PaxBespoke and it was perfect."
        name="Sarah M."
        location="Altrincham"
      />

      <motion.button
        onClick={onNext}
        disabled={!value}
        whileTap={{ scale: 0.98 }}
        className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#E8872B] text-white font-semibold rounded-2xl hover:bg-[#d47a24] transition-all disabled:opacity-40 disabled:cursor-not-allowed font-[family-name:var(--font-heading)] shadow-lg shadow-orange-200/50"
      >
        Continue
        <ArrowRight className="w-4 h-4" />
      </motion.button>
    </div>
  );
}
