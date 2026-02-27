'use client';

import { Video, Clock, CheckCircle, ShieldCheck, MapPin, Palette, Package, Camera, User, Calendar, ArrowRight, Star, PoundSterling } from 'lucide-react';
import { motion } from 'framer-motion';

interface WelcomeScreenProps {
  onNext: () => void;
}

const stepPreview = [
  { icon: MapPin, label: 'Location' },
  { icon: Video, label: 'Room' },
  { icon: Palette, label: 'Style' },
  { icon: Package, label: 'Package' },
  { icon: PoundSterling, label: 'Budget' },
  { icon: Camera, label: 'Space' },
  { icon: User, label: 'Details' },
  { icon: Calendar, label: 'Book a time' },
];

const expectations = [
  { icon: Video, title: 'What it is', text: 'A 15–45 minute Google Meet call (depending on package) where we look at your space together and discuss options.' },
  { icon: ShieldCheck, title: 'What it isn\'t', text: 'Not a sales pitch. Not a commitment. You\'re free to take time and decide after.' },
  { icon: CheckCircle, title: 'What you\'ll know after', text: 'Which package suits you, a clear price range, and the timeline for your project.' },
  { icon: Clock, title: 'What you don\'t need', text: 'No exact measurements. No decisions made beforehand. No money upfront.' },
];

export default function WelcomeScreen({ onNext }: WelcomeScreenProps) {
  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center mx-auto mb-4">
          <Video className="w-7 h-7 text-orange-500" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
          Book your free design consultation
        </h1>
        <p className="text-warm-500 max-w-md mx-auto">
          In the next 2 minutes, we&apos;ll gather a few details so we can make the most of your call.
        </p>
      </motion.div>

      {/* Step preview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-warm-50 rounded-2xl p-5 mb-6"
      >
        <p className="text-xs font-semibold text-warm-600 mb-3 font-[family-name:var(--font-heading)]">
          We&apos;ll ask about:
        </p>
        <div className="flex flex-wrap gap-2">
          {stepPreview.map((step, i) => (
            <div
              key={step.label}
              className="flex items-center gap-1.5 bg-white rounded-lg px-3 py-1.5 border border-warm-100"
            >
              <step.icon className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-xs text-warm-600 font-medium font-[family-name:var(--font-heading)]">
                {step.label}
              </span>
              {i < stepPreview.length - 1 && (
                <span className="text-warm-300 ml-0.5">→</span>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* What to expect */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6"
      >
        {expectations.map((item) => (
          <div key={item.title} className="flex gap-3 bg-white rounded-2xl border border-warm-100 p-4">
            <item.icon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-warm-900 mb-0.5 font-[family-name:var(--font-heading)]">{item.title}</p>
              <p className="text-xs text-warm-500 leading-relaxed">{item.text}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* What happens after */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-green-50 rounded-2xl p-5 mb-8 border border-green-100"
      >
        <p className="text-sm font-semibold text-green-900 mb-2 font-[family-name:var(--font-heading)]">
          What happens after you book:
        </p>
        <ol className="space-y-1.5 text-sm text-green-700">
          <li className="flex items-start gap-2">
            <span className="text-xs font-bold text-green-500 mt-0.5">1.</span>
            We send a confirmation email with your video call link
          </li>
          <li className="flex items-start gap-2">
            <span className="text-xs font-bold text-green-500 mt-0.5">2.</span>
            On the call, we discuss your space and recommend options
          </li>
          <li className="flex items-start gap-2">
            <span className="text-xs font-bold text-green-500 mt-0.5">3.</span>
            You get a clear price range — no obligation to proceed
          </li>
        </ol>
        <p className="text-xs text-green-600/70 mt-2 italic">
          This books a consultation, not an installation. If you decide to go ahead, we&apos;ll arrange fitting at a later date.
        </p>
      </motion.div>

      {/* Social proof */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="flex items-center justify-center gap-2 mb-6"
      >
        <div className="flex gap-0.5">
          {[1,2,3,4,5].map(i => (
            <Star key={i} className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
          ))}
        </div>
        <span className="text-xs text-warm-500">Rated 5.0 from 47 reviews</span>
      </motion.div>

      {/* CTA */}
      <motion.button
        onClick={onNext}
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#E8872B] text-white font-semibold rounded-2xl hover:bg-[#d47a24] transition-all font-[family-name:var(--font-heading)] shadow-lg shadow-orange-200/50 text-base"
      >
        Start Your Free Consultation Booking
        <ArrowRight className="w-4 h-4" />
      </motion.button>
      <p className="text-center text-xs text-warm-400 mt-2 font-[family-name:var(--font-heading)]">
        Takes about 2 minutes · No payment required
      </p>
    </div>
  );
}
