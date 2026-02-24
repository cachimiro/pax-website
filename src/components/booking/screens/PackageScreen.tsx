'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import SelectionCard from '../SelectionCard';
import MiniTestimonial from '../MiniTestimonial';

interface PackageScreenProps {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  postcodeLocation: string;
}

const packages = [
  {
    id: 'budget',
    name: 'Budget',
    price: 'From £800',
    bestFor: 'Smart storage on a budget',
    features: ['IKEA Pax frames', 'Standard doors', 'Professional install'],
    icon: (
      <div className="w-10 h-10 rounded-xl bg-warm-100 flex items-center justify-center text-warm-500 font-bold text-sm font-[family-name:var(--font-heading)]">£</div>
    ),
  },
  {
    id: 'paxbespoke',
    name: 'PaxBespoke',
    price: 'From £1,500',
    bestFor: 'Custom look, not the custom price',
    features: ['Custom bespoke doors', 'Colour-matched trims', 'Premium interior'],
    badge: 'Most Popular',
    icon: (
      <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm font-[family-name:var(--font-heading)]">££</div>
    ),
  },
  {
    id: 'select',
    name: 'Select',
    price: 'From £2,500',
    bestFor: 'Fully bespoke, designer finish',
    features: ['Premium doors & panels', 'Integrated lighting', 'Full project management'],
    icon: (
      <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm font-[family-name:var(--font-heading)]">£££</div>
    ),
  },
  {
    id: 'unsure',
    name: 'Not sure yet',
    price: "We'll help you choose",
    bestFor: "That's what the consultation is for",
    features: [],
    icon: (
      <div className="w-10 h-10 rounded-xl bg-warm-50 flex items-center justify-center text-warm-400 font-bold text-sm">?</div>
    ),
  },
];

export default function PackageScreen({ value, onChange, onNext, postcodeLocation }: PackageScreenProps) {
  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
        What finish level suits you?
      </h2>
      <p className="text-sm text-warm-500 mb-6">
        Every package uses IKEA Pax frames. The difference is in the finish. Tap to select.
      </p>

      <div className="space-y-3">
        {packages.map((pkg, i) => (
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <SelectionCard
              selected={value === pkg.id}
              onClick={() => onChange(pkg.id)}
              badge={pkg.badge}
            >
              <div className="flex gap-4 pr-8">
                <div className="flex-shrink-0 mt-0.5">{pkg.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="text-[15px] font-semibold text-warm-900 font-[family-name:var(--font-heading)]">{pkg.name}</p>
                    <span className="text-sm font-bold text-green-700 font-[family-name:var(--font-heading)]">{pkg.price}</span>
                  </div>
                  <p className="text-sm text-warm-500 mt-0.5">{pkg.bestFor}</p>
                  {pkg.features.length > 0 && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                      {pkg.features.map((f) => (
                        <span key={f} className="flex items-center gap-1 text-xs text-warm-500">
                          <Check className="w-3 h-3 text-green-600" />
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </SelectionCard>
          </motion.div>
        ))}
      </div>

      {/* Contextual social proof after package selection */}
      {value === 'paxbespoke' && (
        <MiniTestimonial
          quote="Custom doors on IKEA frames — you genuinely can't tell the difference from a £5k wardrobe."
          name="James T."
          location={postcodeLocation || 'Didsbury, Manchester'}
        />
      )}
      {value === 'select' && (
        <MiniTestimonial
          quote="The integrated lighting and designer handles made it feel like a boutique dressing room."
          name="Priya K."
          location="Wilmslow, Cheshire"
        />
      )}
      {value === 'budget' && (
        <MiniTestimonial
          quote="Looks great, fits perfectly, and was installed in a morning. Exactly what we needed."
          name="Tom R."
          location="Wigan"
        />
      )}

      <p className="text-xs text-warm-400 mt-4 text-center">
        Prices are starting points. Your consultation confirms the exact quote — no surprises.
      </p>

      {value && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onNext}
          whileTap={{ scale: 0.98 }}
          className="w-full mt-5 px-6 py-4 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-900 transition-colors text-base font-[family-name:var(--font-heading)] flex items-center justify-center gap-2"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      )}
    </div>
  );
}
