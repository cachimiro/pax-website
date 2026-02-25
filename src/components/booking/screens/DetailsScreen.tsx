'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, User, Mail, Phone, Shield, MessageCircle } from 'lucide-react';

interface DetailsScreenProps {
  name: string;
  email: string;
  phone: string;
  whatsappOptIn: boolean;
  onChange: (field: string, value: string | boolean) => void;
  onNext: () => void;
}

export default function DetailsScreen({ name, email, phone, whatsappOptIn, onChange, onNext }: DetailsScreenProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Please enter your name';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Please enter a valid email';
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) newErrors.phone = 'Please enter a valid phone number';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) onNext();
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-2xl md:text-3xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
          Your details
        </h2>
        <p className="text-warm-500 mb-6">
          So we can send your confirmation and video call link.
        </p>
      </motion.div>

      <div className="space-y-5">
        {/* Name */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <label className="block text-sm font-medium text-warm-700 mb-1 font-[family-name:var(--font-heading)]">
            Your name
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" />
            <input
              type="text"
              value={name}
              onChange={(e) => { onChange('name', e.target.value); setErrors(prev => ({ ...prev, name: '' })); }}
              placeholder="First and last name"
              className={`w-full pl-10 pr-4 py-3.5 rounded-2xl border text-sm bg-white transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                errors.name ? 'border-red-300' : 'border-warm-200'
              }`}
              autoComplete="name"
            />
          </div>
          <p className="text-[11px] text-warm-400 mt-1">So we know who we&apos;re speaking to</p>
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </motion.div>

        {/* Email */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <label className="block text-sm font-medium text-warm-700 mb-1 font-[family-name:var(--font-heading)]">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => { onChange('email', e.target.value); setErrors(prev => ({ ...prev, email: '' })); }}
              placeholder="your@email.com"
              className={`w-full pl-10 pr-4 py-3.5 rounded-2xl border text-sm bg-white transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                errors.email ? 'border-red-300' : 'border-warm-200'
              }`}
              autoComplete="email"
            />
          </div>
          <p className="text-[11px] text-warm-400 mt-1">For your confirmation and video call link</p>
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </motion.div>

        {/* Phone */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <label className="block text-sm font-medium text-warm-700 mb-1 font-[family-name:var(--font-heading)]">
            Phone number
          </label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => { onChange('phone', e.target.value); setErrors(prev => ({ ...prev, phone: '' })); }}
              placeholder="07xxx xxx xxx"
              className={`w-full pl-10 pr-4 py-3.5 rounded-2xl border text-sm bg-white transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                errors.phone ? 'border-red-300' : 'border-warm-200'
              }`}
              autoComplete="tel"
              inputMode="tel"
            />
          </div>
          <p className="text-[11px] text-warm-400 mt-1">In case we need to reach you about your booking</p>
          {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
        </motion.div>

        {/* WhatsApp opt-in */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                checked={whatsappOptIn}
                onChange={(e) => onChange('whatsappOptIn', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-5 h-5 rounded-lg border-2 border-warm-300 bg-white peer-checked:bg-orange-500 peer-checked:border-orange-500 transition-all flex items-center justify-center">
                {whatsappOptIn && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <div>
              <span className="flex items-center gap-1.5 text-sm text-warm-700 font-medium">
                <MessageCircle className="w-4 h-4 text-green-600" />
                Send me updates via WhatsApp too
              </span>
              <span className="text-xs text-warm-400 block mt-0.5">
                Quick updates about your booking and project. You can opt out anytime.
              </span>
            </div>
          </label>
        </motion.div>
      </div>

      {/* Privacy note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="flex items-center gap-2 mt-6 text-xs text-warm-400"
      >
        <Shield className="w-3.5 h-3.5 flex-shrink-0" />
        Your details are only used for this consultation. We never share your data.
      </motion.div>

      <motion.button
        onClick={handleSubmit}
        whileTap={{ scale: 0.98 }}
        className="w-full mt-6 px-6 py-4 bg-orange-500 text-white font-semibold rounded-2xl hover:bg-orange-600 transition-all text-base font-[family-name:var(--font-heading)] flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
      >
        Continue
        <ArrowRight className="w-4 h-4" />
      </motion.button>
    </div>
  );
}
