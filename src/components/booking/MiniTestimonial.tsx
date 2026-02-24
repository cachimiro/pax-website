'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

interface MiniTestimonialProps {
  quote: string;
  name: string;
  location: string;
}

export default function MiniTestimonial({ quote, name, location }: MiniTestimonialProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="flex gap-3 items-start bg-warm-50 rounded-xl p-4 mt-6"
    >
      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
        <Star className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
      </div>
      <div>
        <p className="text-sm text-warm-600 leading-relaxed italic">&ldquo;{quote}&rdquo;</p>
        <p className="text-xs text-warm-400 mt-1.5 font-medium">{name} · {location}</p>
      </div>
    </motion.div>
  );
}
