'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Calendar, Clock, MapPin, Package, Camera, ArrowRight, Star } from 'lucide-react';
import Celebration from '../Celebration';

interface ConfirmationScreenProps {
  data: {
    name: string;
    email: string;
    date: string;
    time: string;
    room: string;
    packageChoice: string;
    postcodeLocation: string;
  };
}

const roomLabels: Record<string, string> = {
  bedroom: 'Bedroom wardrobe',
  walkin: 'Walk-in / dressing room',
  hallway: 'Hallway / utility',
  kids: 'Kids room',
  multiple: 'Multiple rooms',
};

const packageLabels: Record<string, string> = {
  budget: 'Budget',
  paxbespoke: 'PaxBespoke',
  select: 'Select',
  unsure: 'To be discussed',
};

export default function ConfirmationScreen({ data }: ConfirmationScreenProps) {
  return (
    <div className="max-w-md mx-auto text-center relative">
      <Celebration />

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"
      >
        <CheckCircle className="w-10 h-10 text-green-700" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-2xl md:text-3xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
          You&apos;re booked in, {data.name.split(' ')[0]}!
        </h2>
        <p className="text-warm-500 mb-8">
          Check <strong className="text-warm-700">{data.email}</strong> for your confirmation and video call link.
        </p>
      </motion.div>

      {/* Booking summary card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="bg-white rounded-2xl border border-warm-100 p-6 text-left mb-8 shadow-sm"
      >
        <h3 className="text-sm font-semibold text-warm-900 mb-4 font-[family-name:var(--font-heading)]">Your consultation</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="w-4 h-4 text-green-700 flex-shrink-0" />
            <span className="text-warm-700 font-medium">{data.date}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Clock className="w-4 h-4 text-green-700 flex-shrink-0" />
            <span className="text-warm-700">{data.time} · 20–30 minutes</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="w-4 h-4 text-green-700 flex-shrink-0" />
            <span className="text-warm-700">{data.postcodeLocation}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Package className="w-4 h-4 text-green-700 flex-shrink-0" />
            <span className="text-warm-700">
              {roomLabels[data.room] || data.room} · {packageLabels[data.packageChoice] || data.packageChoice}
            </span>
          </div>
        </div>
      </motion.div>

      {/* What to have ready */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-green-50 rounded-2xl p-6 text-left mb-8"
      >
        <h3 className="text-sm font-semibold text-green-900 mb-3 font-[family-name:var(--font-heading)]">
          Helpful to have ready (optional)
        </h3>
        <div className="space-y-2">
          {[
            { icon: Camera, text: 'A few photos of the space' },
            { icon: Package, text: 'Any inspiration images you like' },
            { icon: MapPin, text: 'Rough idea of the space dimensions' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-2.5 text-sm text-green-800">
              <item.icon className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
              {item.text}
            </div>
          ))}
        </div>
        <p className="text-xs text-green-600 mt-3 italic">None of this is required — we&apos;ll guide you on the call.</p>
      </motion.div>

      {/* Social proof */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex items-center justify-center gap-2 mb-8"
      >
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
          ))}
        </div>
        <span className="text-xs text-warm-500">Join 500+ homeowners who started here</span>
      </motion.div>

      <motion.a
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        href="/"
        className="inline-flex items-center text-sm font-semibold text-green-700 hover:text-green-900 transition-colors font-[family-name:var(--font-heading)]"
      >
        Back to homepage
        <ArrowRight className="w-4 h-4 ml-1" />
      </motion.a>
    </div>
  );
}
