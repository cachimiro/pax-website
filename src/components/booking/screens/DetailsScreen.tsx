'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, User, Mail, Phone, Shield } from 'lucide-react';

interface DetailsScreenProps {
  name: string;
  email: string;
  phone: string;
  onChange: (field: string, value: string) => void;
  onNext: () => void;
}

export default function DetailsScreen({ name, email, phone, onChange, onNext }: DetailsScreenProps) {
  const [touched, setTouched] = useState({ name: false, email: false, phone: false });

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canContinue = name.trim().length >= 2 && isValidEmail && phone.trim().length >= 6;

  const inputClass = (field: 'name' | 'email' | 'phone', valid: boolean) =>
    `w-full pl-11 pr-4 py-3.5 rounded-xl border-2 bg-white text-warm-900 text-[15px] transition-colors focus:outline-none ${
      touched[field] && !valid
        ? 'border-red-300 focus:border-red-400'
        : 'border-warm-100 focus:border-green-700'
    }`;

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
        Your details
      </h2>
      <p className="text-sm text-warm-500 mb-8">
        So we can confirm your consultation and send you the video call link.
      </p>

      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <label className="block text-sm font-medium text-warm-700 mb-1.5 font-[family-name:var(--font-heading)]">Name</label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-300" />
            <input
              type="text"
              value={name}
              onChange={(e) => onChange('name', e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              className={inputClass('name', name.trim().length >= 2)}
              placeholder="Your name"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
        >
          <label className="block text-sm font-medium text-warm-700 mb-1.5 font-[family-name:var(--font-heading)]">Email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-300" />
            <input
              type="email"
              value={email}
              onChange={(e) => onChange('email', e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              className={inputClass('email', isValidEmail)}
              placeholder="you@example.com"
            />
          </div>
          <p className="text-xs text-warm-400 mt-1.5">We&apos;ll send your confirmation and video link here.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <label className="block text-sm font-medium text-warm-700 mb-1.5 font-[family-name:var(--font-heading)]">Phone</label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-300" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => onChange('phone', e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              className={inputClass('phone', phone.trim().length >= 6)}
              placeholder="07xxx xxx xxx"
            />
          </div>
          <p className="text-xs text-warm-400 mt-1.5">In case we need to reach you about your booking.</p>
        </motion.div>
      </div>

      {/* Trust signal */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-2 mt-6 text-xs text-warm-400"
      >
        <Shield className="w-3.5 h-3.5" />
        <span>Your details are only used for your consultation. We never share or spam.</span>
      </motion.div>

      <motion.button
        onClick={onNext}
        disabled={!canContinue}
        whileTap={{ scale: canContinue ? 0.98 : 1 }}
        className="w-full mt-6 px-6 py-4 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-900 transition-colors text-base font-[family-name:var(--font-heading)] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continue
        <ArrowRight className="w-4 h-4" />
      </motion.button>
    </div>
  );
}
