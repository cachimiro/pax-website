'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Calendar, Clock, MapPin, Package, Camera, ArrowRight, Star, MessageSquare, Ruler, Share2, CalendarPlus } from 'lucide-react';
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
  const firstName = data.name.split(' ')[0];

  // Build a Google Calendar link
  const calendarTitle = encodeURIComponent('PaxBespoke Consultation');
  const calendarDetails = encodeURIComponent(`Video consultation with PaxBespoke.\n\nRoom: ${roomLabels[data.room] || data.room}\nPackage: ${packageLabels[data.packageChoice] || data.packageChoice}\n\nCheck your email (${data.email}) for the video call link.`);
  const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calendarTitle}&details=${calendarDetails}`;

  // Share link
  const shareText = encodeURIComponent(`I just booked a free consultation with PaxBespoke for a custom IKEA Pax wardrobe! Check them out: https://paxbespoke.co.uk`);

  return (
    <div className="max-w-md mx-auto text-center relative">
      <Celebration />

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"
      >
        <CheckCircle className="w-10 h-10 text-[#0C6B4E]" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-2xl md:text-3xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
          You&apos;re booked in, {firstName}!
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
        className="bg-white rounded-2xl border border-warm-100 p-6 text-left mb-6 shadow-sm"
      >
        <h3 className="text-sm font-semibold text-warm-900 mb-4 font-[family-name:var(--font-heading)]">Your consultation</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="w-4 h-4 text-[#0C6B4E] flex-shrink-0" />
            <span className="text-warm-700 font-medium">{data.date}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Clock className="w-4 h-4 text-[#0C6B4E] flex-shrink-0" />
            <span className="text-warm-700">{data.time} · 20–30 minutes</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="w-4 h-4 text-[#0C6B4E] flex-shrink-0" />
            <span className="text-warm-700">{data.postcodeLocation}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Package className="w-4 h-4 text-[#0C6B4E] flex-shrink-0" />
            <span className="text-warm-700">
              {roomLabels[data.room] || data.room} · {packageLabels[data.packageChoice] || data.packageChoice}
            </span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 mt-5 pt-4 border-t border-warm-50">
          <a
            href={googleCalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-warm-50 rounded-xl text-xs font-medium text-warm-700 hover:bg-warm-100 transition-colors"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            Add to calendar
          </a>
          <a
            href={`https://wa.me/?text=${shareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-warm-50 rounded-xl text-xs font-medium text-warm-700 hover:bg-warm-100 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share with partner
          </a>
        </div>
      </motion.div>

      {/* What we'll cover on your call */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="bg-[#0C6B4E]/5 border border-[#0C6B4E]/10 rounded-2xl p-6 text-left mb-6"
      >
        <h3 className="text-sm font-semibold text-[#0C6B4E] mb-3 font-[family-name:var(--font-heading)]">
          What we&apos;ll cover on your call
        </h3>
        <div className="space-y-2.5">
          {[
            { icon: MessageSquare, text: 'Your vision — style, layout, and how you use the space' },
            { icon: Ruler, text: 'Measurements and what\'s possible in your room' },
            { icon: Package, text: 'Package recommendation and transparent pricing' },
            { icon: Calendar, text: 'Timeline and next steps if you\'d like to go ahead' },
          ].map((item) => (
            <div key={item.text} className="flex items-start gap-2.5 text-sm text-[#0C6B4E]">
              <item.icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 opacity-70" />
              <span>{item.text}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-[#0C6B4E]/60 mt-3 italic">No pressure, no hard sell — just honest advice.</p>
      </motion.div>

      {/* What to have ready */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
        className="bg-[#E8872B]/5 border border-[#E8872B]/10 rounded-2xl p-6 text-left mb-8"
      >
        <h3 className="text-sm font-semibold text-[#E8872B] mb-3 font-[family-name:var(--font-heading)]">
          Helpful to have ready (optional)
        </h3>
        <div className="space-y-2">
          {[
            { icon: Camera, text: 'A few photos of the space' },
            { icon: Package, text: 'Any inspiration images you like' },
            { icon: MapPin, text: 'Rough idea of the space dimensions' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-2.5 text-sm text-warm-700">
              <item.icon className="w-3.5 h-3.5 text-[#E8872B] flex-shrink-0 opacity-70" />
              {item.text}
            </div>
          ))}
        </div>
        <p className="text-xs text-warm-400 mt-3 italic">None of this is required — we&apos;ll guide you on the call.</p>
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
            <Star key={i} className="w-3.5 h-3.5 fill-[#E8872B] text-[#E8872B]" />
          ))}
        </div>
        <span className="text-xs text-warm-500">Join 500+ homeowners who started here</span>
      </motion.div>

      <motion.a
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        href="/"
        className="inline-flex items-center text-sm font-semibold text-[#0C6B4E] hover:text-[#0A5C42] transition-colors font-[family-name:var(--font-heading)]"
      >
        Back to homepage
        <ArrowRight className="w-4 h-4 ml-1" />
      </motion.a>
    </div>
  );
}
