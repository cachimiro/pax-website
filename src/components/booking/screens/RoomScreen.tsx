'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import SelectionCard from '../SelectionCard';
import MiniTestimonial from '../MiniTestimonial';

interface RoomScreenProps {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}

const rooms = [
  {
    id: 'bedroom',
    label: 'Bedroom wardrobe',
    desc: 'Fitted wardrobes for a bedroom',
    stat: '60+ bedroom projects completed',
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="8" y="6" width="32" height="36" rx="2" />
        <line x1="24" y1="6" x2="24" y2="42" />
        <circle cx="20" cy="24" r="1.5" fill="currentColor" />
        <circle cx="28" cy="24" r="1.5" fill="currentColor" />
        <rect x="6" y="4" width="36" height="3" rx="1" />
      </svg>
    ),
  },
  {
    id: 'walkin',
    label: 'Walk-in / dressing room',
    desc: 'Full room wardrobe fit-out',
    stat: '25+ walk-in projects',
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="4" y="8" width="16" height="32" rx="2" />
        <rect x="20" y="8" width="12" height="32" rx="2" />
        <rect x="32" y="8" width="12" height="32" rx="2" />
        <line x1="8" y1="20" x2="16" y2="20" />
        <line x1="8" y1="28" x2="16" y2="28" />
        <circle cx="38" cy="24" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'hallway',
    label: 'Hallway / utility',
    desc: 'Storage for coats, shoes, bags',
    stat: 'Popular for narrow spaces',
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="12" y="6" width="24" height="36" rx="2" />
        <line x1="24" y1="6" x2="24" y2="42" />
        <line x1="14" y1="16" x2="22" y2="16" />
        <line x1="14" y1="24" x2="22" y2="24" />
        <line x1="14" y1="32" x2="22" y2="32" />
        <circle cx="28" cy="24" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'kids',
    label: 'Kids room',
    desc: 'Fun, functional storage that grows with them',
    stat: 'Budget-friendly options available',
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="8" y="10" width="32" height="28" rx="2" />
        <line x1="24" y1="10" x2="24" y2="38" />
        <circle cx="16" cy="20" r="3" />
        <rect x="13" y="26" width="6" height="8" rx="1" />
        <line x1="28" y1="16" x2="36" y2="16" />
        <line x1="28" y1="22" x2="36" y2="22" />
        <line x1="28" y1="28" x2="36" y2="28" />
      </svg>
    ),
  },
  {
    id: 'multiple',
    label: 'Multiple rooms',
    desc: "We'll cover all of them on the call",
    stat: 'Multi-room discounts available',
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="4" y="12" width="18" height="24" rx="2" />
        <rect x="26" y="12" width="18" height="24" rx="2" />
        <line x1="13" y1="12" x2="13" y2="36" />
        <line x1="35" y1="12" x2="35" y2="36" />
        <path d="M22 6 L24 2 L26 6" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function RoomScreen({ value, onChange, onNext }: RoomScreenProps) {
  const selected = rooms.find((r) => r.id === value);

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
        What are you looking for?
      </h2>
      <p className="text-sm text-warm-500 mb-6">
        This helps us prepare the right examples for your call.
      </p>

      <div className="space-y-3">
        {rooms.map((room, i) => (
          <motion.div
            key={room.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <SelectionCard
              selected={value === room.id}
              onClick={() => onChange(room.id)}
            >
              <div className="flex items-center gap-4 pr-8">
                <div className="text-warm-400 flex-shrink-0">
                  {room.icon}
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-warm-900 font-[family-name:var(--font-heading)]">{room.label}</p>
                  <p className="text-sm text-warm-500 mt-0.5">{room.desc}</p>
                </div>
              </div>
            </SelectionCard>
          </motion.div>
        ))}
      </div>

      {/* Contextual reward after selection */}
      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center gap-2 text-sm text-green-700 font-medium"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
          {selected.stat}
        </motion.div>
      )}

      {value === 'bedroom' && (
        <MiniTestimonial
          quote="They had loads of bedroom examples ready on the call. Made choosing so much easier."
          name="Sarah M."
          location="Altrincham"
        />
      )}

      {value && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onNext}
          whileTap={{ scale: 0.98 }}
          className="w-full mt-6 px-6 py-4 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-900 transition-colors text-base font-[family-name:var(--font-heading)] flex items-center justify-center gap-2"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      )}
    </div>
  );
}
