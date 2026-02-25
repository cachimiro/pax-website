'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Minus, Sun, HelpCircle } from 'lucide-react';
import SelectionCard from '../SelectionCard';
import MiniTestimonial from '../MiniTestimonial';

interface StyleScreenProps {
  value: string;
  inspiration: string;
  onChange: (style: string, inspiration?: string) => void;
  onNext: () => void;
}

const styles = [
  {
    id: 'modern',
    label: 'Modern & Minimal',
    description: 'Clean lines, handleless or slim handles, matt finishes',
    icon: Minus,
  },
  {
    id: 'classic',
    label: 'Classic & Warm',
    description: 'Shaker-style doors, wood tones, traditional handles',
    icon: Sun,
  },
  {
    id: 'bold',
    label: 'Bold & Statement',
    description: 'Dark colours, mixed materials, integrated lighting',
    icon: Sparkles,
  },
  {
    id: 'unsure',
    label: 'Not sure yet',
    description: 'I\'d like guidance on the call',
    icon: HelpCircle,
  },
];

export default function StyleScreen({ value, inspiration, onChange, onNext }: StyleScreenProps) {
  const [localInspiration, setLocalInspiration] = useState(inspiration || '');

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-2xl md:text-3xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
          What style are you drawn to?
        </h2>
        <p className="text-warm-500 mb-2">
          This helps us prepare ideas for your consultation. No commitment — just a starting point.
        </p>
        <p className="text-xs text-warm-400 mb-6 font-[family-name:var(--font-heading)]">
          Why we ask: So we can show you relevant examples and finishes on the call.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {styles.map((style, i) => (
          <motion.div
            key={style.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
          >
            <SelectionCard
              selected={value === style.id}
              onClick={() => onChange(style.id)}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  value === style.id ? 'bg-orange-50' : 'bg-warm-50'
                }`}>
                  <style.icon className={`w-5 h-5 ${
                    value === style.id ? 'text-orange-500' : 'text-warm-400'
                  }`} />
                </div>
                <div>
                  <p className="font-semibold text-warm-900 text-sm font-[family-name:var(--font-heading)]">
                    {style.label}
                  </p>
                  <p className="text-xs text-warm-500 mt-0.5">{style.description}</p>
                </div>
              </div>
            </SelectionCard>
          </motion.div>
        ))}
      </div>

      {/* Optional inspiration input */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mb-6"
      >
        <label className="block text-sm font-medium text-warm-700 mb-1.5 font-[family-name:var(--font-heading)]">
          Any inspiration? <span className="text-warm-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={localInspiration}
          onChange={(e) => {
            setLocalInspiration(e.target.value);
            onChange(value, e.target.value);
          }}
          placeholder="Pinterest link, Instagram post, or describe what you like..."
          className="w-full px-4 py-3 rounded-2xl border border-warm-200 text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all bg-white"
        />
      </motion.div>

      <MiniTestimonial
        quote="They showed me options I hadn't even considered. The style guidance was brilliant."
        name="James T."
        location="Didsbury"
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
