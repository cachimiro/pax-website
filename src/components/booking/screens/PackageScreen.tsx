'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, HelpCircle, AlertTriangle, ExternalLink } from 'lucide-react';
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
    price: 'From £800',
    description: 'You design it in the IKEA PAX Planner, we fit it to a built-in finish.',
    features: ['Standard IKEA PAX doors', 'Filler panels & skirting fitted', 'You source the IKEA items'],
    accentColor: '#f28c43',
  },
  {
    id: 'paxbespoke',
    name: 'PaxBespoke',
    price: 'From £1,500',
    description: 'We design it for you — a true built-in look using the PAX system.',
    features: ['Full design service included', 'Custom trim & flush fillers', 'Skirting board finish', 'We source everything'],
    popular: false,
    accentColor: '#2d5c37',
  },
  {
    id: 'select',
    name: 'Select',
    price: 'From £2,500',
    description: 'No restrictions — any door style, any colour, full wall integration.',
    features: ['Everything in PaxBespoke', 'Spray-painted (any colour) or vinyl doors', 'Full wall integration', 'Sliding doors available'],
    popular: true,
    accentColor: '#2d5c37',
  },
];

type Package = typeof packages[number];

function PackageCard({
  pkg,
  selected,
  onClick,
}: {
  pkg: Package;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={`relative w-full text-left rounded-2xl border-2 p-4 transition-all duration-200 ${
        selected
          ? 'border-green-700 bg-green-50/50 shadow-sm'
          : 'border-warm-100 bg-white hover:border-warm-200 hover:shadow-sm'
      }`}
    >
      {pkg.popular && (
        <span className="absolute -top-2.5 left-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#2d5c37] text-white tracking-wide font-[family-name:var(--font-heading)]">
          Most popular
        </span>
      )}

      <div className="flex items-start gap-3">
        {/* Radio indicator — left side, never overlaps content */}
        <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          selected ? 'border-green-700 bg-green-700' : 'border-warm-300 bg-white'
        }`}>
          {selected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span className="font-bold text-warm-900 font-[family-name:var(--font-heading)]">
              {pkg.name}
            </span>
            <span className="font-bold text-warm-900 font-[family-name:var(--font-heading)] flex-shrink-0 text-sm">
              {pkg.price}
              <span className="text-[10px] font-normal text-warm-400 ml-1">fitted</span>
            </span>
          </div>

          <p className="text-xs text-warm-500 mb-2 leading-relaxed">{pkg.description}</p>

          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {pkg.features.map((f) => (
              <span key={f} className="flex items-center gap-1 text-xs text-warm-600">
                <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: pkg.accentColor }} />
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Budget callout — expands inline when selected */}
      <AnimatePresence>
        {selected && pkg.id === 'budget' && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl p-3">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-orange-800 leading-relaxed space-y-1">
                <p className="font-semibold">You&apos;ll need an IKEA PAX Planner design</p>
                <p>Create your wardrobe layout in the free IKEA PAX Planner before the call. We&apos;ll review it together, check nothing is missed, and prepare your quote.</p>
                <a
                  href="https://www.ikea.com/addon-app/storageone/pax/web/latest/gb/en/#/planner"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-orange-600 font-semibold underline"
                >
                  Open IKEA PAX Planner
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export default function PackageScreen({ value, onChange, onNext, postcodeLocation }: PackageScreenProps) {
  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-2xl md:text-3xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
          Which finish level suits you?
        </h2>
        <p className="text-warm-500 mb-6">
          {postcodeLocation
            ? `We cover ${postcodeLocation}. Pick the package that fits your budget and how involved you want to be.`
            : 'Pick the package that fits your budget and how involved you want to be.'}
        </p>
      </motion.div>

      <div className="space-y-3 mb-4">
        {packages.map((pkg, i) => (
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 + i * 0.06 }}
          >
            <PackageCard
              pkg={pkg}
              selected={value === pkg.id}
              onClick={() => onChange(pkg.id)}
            />
          </motion.div>
        ))}

        {/* Not sure option */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
        >
          <motion.button
            type="button"
            onClick={() => onChange('unsure')}
            whileTap={{ scale: 0.98 }}
            className={`w-full text-left rounded-2xl border-2 p-4 transition-all duration-200 ${
              value === 'unsure'
                ? 'border-green-700 bg-green-50/50 shadow-sm'
                : 'border-warm-100 bg-white hover:border-warm-200 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                value === 'unsure' ? 'border-green-700 bg-green-700' : 'border-warm-300 bg-white'
              }`}>
                {value === 'unsure' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <HelpCircle className={`w-4 h-4 flex-shrink-0 ${value === 'unsure' ? 'text-green-700' : 'text-warm-400'}`} />
              <div>
                <p className="font-semibold text-warm-900 text-sm font-[family-name:var(--font-heading)]">
                  Help me choose
                </p>
                <p className="text-xs text-warm-500">
                  We&apos;ll recommend the right package on the call based on your space and budget.
                </p>
              </div>
            </div>
          </motion.button>
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
