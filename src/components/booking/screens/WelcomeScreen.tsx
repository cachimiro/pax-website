'use client';

import { Video, Clock, CheckCircle, MapPin, ArrowRight, Star } from 'lucide-react';
import { motion } from 'framer-motion';

interface WelcomeScreenProps {
  onNext: () => void;
}

const benefits = [
  { icon: Video, title: "It's a relaxed video call", desc: 'We review your space, share examples, and confirm the best solution. No hard sell.' },
  { icon: Clock, title: '20–30 minutes', desc: "You'll leave with a clear price range and next steps." },
  { icon: CheckCircle, title: 'No measurements needed', desc: "Rough photos or even just a description is enough. We'll guide you." },
  { icon: MapPin, title: '60-mile Warrington radius', desc: 'We serve Greater Manchester, Cheshire, Merseyside, Lancashire and beyond.' },
];

export default function WelcomeScreen({ onNext }: WelcomeScreenProps) {
  return (
    <div className="max-w-xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl md:text-4xl font-bold text-warm-900 mb-3 font-[family-name:var(--font-heading)] leading-tight">
          Let&apos;s design your wardrobe
        </h1>
        <p className="text-lg text-warm-500 mb-10">
          Answer a few quick questions and book your free video consultation. Takes about 90 seconds.
        </p>

        <div className="space-y-5 mb-10">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.35 }}
              className="flex gap-4 items-start"
            >
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                <b.icon className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-warm-900 font-[family-name:var(--font-heading)]">{b.title}</h3>
                <p className="text-sm text-warm-500 mt-0.5">{b.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-3 bg-warm-50 rounded-xl p-4 mb-8"
        >
          <div className="flex -space-x-1.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="w-7 h-7 rounded-full bg-green-100 border-2 border-white flex items-center justify-center">
                <span className="text-[10px] font-bold text-green-700">{['S', 'J', 'P', 'D'][i]}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="flex gap-0.5 mb-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-3 h-3 fill-orange-400 text-orange-400" />
              ))}
            </div>
            <p className="text-xs text-warm-500"><strong className="text-warm-700">12 consultations booked</strong> this week</p>
          </div>
        </motion.div>

        <motion.button
          onClick={onNext}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-900 transition-colors text-base font-[family-name:var(--font-heading)] shadow-sm"
        >
          Get Started
          <ArrowRight className="w-4 h-4 ml-2" />
        </motion.button>
        <p className="text-xs text-warm-400 mt-3">Free, no obligation. Takes ~90 seconds.</p>
      </motion.div>
    </div>
  );
}
