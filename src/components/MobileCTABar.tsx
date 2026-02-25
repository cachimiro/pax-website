'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function MobileCTABar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past the hero (roughly viewport height)
      setVisible(window.scrollY > window.innerHeight * 0.6);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden transition-transform duration-300 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="bg-white/95 backdrop-blur-md border-t border-warm-100 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-3">
          <Link
            href="/book"
            className="flex-1 inline-flex items-center justify-center px-5 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors text-sm font-[family-name:var(--font-heading)]"
          >
            Book Free Consultation
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Link>
          <a
            href="https://wa.me/447000000000"
            className="px-4 py-3 border border-warm-200 text-warm-700 font-medium rounded-xl hover:bg-warm-50 transition-colors text-xs font-[family-name:var(--font-heading)]"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
