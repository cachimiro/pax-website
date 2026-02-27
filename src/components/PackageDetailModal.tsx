'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { X, Check, Minus, ArrowRight } from 'lucide-react';

export interface PackageDetail {
  id: string;
  name: string;
  tagline: string;
  priceRange: string;
  origin: string;
  whoItsFor: string;
  includes: string[];
  doesNotInclude: string[];
  forYouIf: string[];
  images: string[];
}

const packageDetails: Record<string, PackageDetail> = {
  budget: {
    id: 'budget',
    name: 'Budget',
    tagline: 'Smart & Simple',
    priceRange: 'From £800',
    origin:
      'Born from customer requests. Many people told us they didn\'t want a free-standing wardrobe but couldn\'t justify the cost of a fully custom solution. Budget was our answer — a clean, built-in look at the most accessible price point.',
    whoItsFor:
      'For anyone who wants practical, good-looking built-in storage without stretching their finances. You value function over flair, and you want a straightforward upgrade from flat-pack.',
    includes: [
      'IKEA Pax system tailored to your space',
      'Standard IKEA door finishes',
      'Professional measurement & installation',
      'Basic interior fittings (shelves, rail)',
      'Clean built-in finish with fillers',
    ],
    doesNotInclude: [
      'Custom or bespoke doors',
      'Colour-matched trims or panels',
      'Integrated lighting',
      'Complex layouts or angled spaces',
    ],
    forYouIf: [
      'You want built-in, not free-standing',
      'You prefer a clean, simple aesthetic',
      'You\'re working to a tighter budget',
    ],
    images: ['/images/stock/project-3.jpg', '/images/stock/wardrobe-1.jpg'],
  },
  paxbespoke: {
    id: 'paxbespoke',
    name: 'PaxBespoke',
    tagline: 'Best Value',
    priceRange: 'From £1,500',
    origin:
      'Where it all started. PaxBespoke is our signature service — we take standard IKEA Pax units and transform them with custom doors, colour-matched trims, and expert installation. The result looks fully built-in at a fraction of the traditional cost.',
    whoItsFor:
      'For homeowners who want a wardrobe that looks and feels bespoke without the bespoke price tag. You care about design, you want something that fits your room perfectly, and you appreciate quality craftsmanship.',
    includes: [
      'IKEA Pax system modified to your exact space',
      'Custom bespoke doors in your chosen finish',
      'Colour-matched trims, fillers & panels',
      'Professional measurement & installation',
      'Premium interior layout (drawers, shelves, rails)',
      'Soft-close upgrades',
    ],
    doesNotInclude: [
      'Integrated lighting (available as add-on)',
      'Bespoke carcasses for very unusual spaces',
      'Designer handle collections',
    ],
    forYouIf: [
      'You want a custom look without the custom price',
      'Your room has alcoves or awkward dimensions',
      'You want to choose your own door style and colour',
    ],
    images: ['/images/stock/after-1.jpg', '/images/stock/project-1.jpg'],
  },
  select: {
    id: 'select',
    name: 'Select',
    tagline: 'Full Bespoke',
    priceRange: 'From £2,500',
    origin:
      'For clients who felt the standard Pax options were limiting. Select combines IKEA interiors with fully bespoke frames and doors — no limits on customisation. We use IKEA\'s clever interior fittings inside custom-built frames to maximise space and achieve a truly high-end finish.',
    whoItsFor:
      'For those who want a designer-level result. You\'re investing in your home, you have a clear vision (or want help creating one), and you want every detail — from handles to lighting — to be exactly right.',
    includes: [
      'IKEA Pax interiors with bespoke external frames',
      'Premium bespoke doors & panels — any finish',
      'Integrated LED lighting',
      'Full custom interior layout',
      'Designer handle options',
      'End-to-end project management',
      'Complex spaces (under stairs, angled ceilings)',
    ],
    doesNotInclude: [
      'There are no limits — if you can imagine it, we can build it',
    ],
    forYouIf: [
      'You want a fully bespoke, designer-level finish',
      'Your space is complex or non-standard',
      'You want integrated lighting and premium details',
    ],
    images: ['/images/stock/project-2.jpg', '/images/stock/project-5.jpg'],
  },
};

interface PackageDetailModalProps {
  packageId: string | null;
  onClose: () => void;
}

export default function PackageDetailModal({ packageId, onClose }: PackageDetailModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const pkg = packageId ? packageDetails[packageId] : null;

  // Lock body scroll when open
  useEffect(() => {
    if (packageId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [packageId]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      {pkg && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl"
            style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white flex items-center justify-center transition-colors z-20 shadow-md"
            >
              <X className="w-5 h-5 text-warm-600" />
            </button>

            {/* Image strip */}
            <div className="grid grid-cols-2 gap-1 rounded-t-3xl sm:rounded-t-3xl overflow-hidden">
              {pkg.images.map((src, i) => (
                <div key={i} className="aspect-[3/2] relative">
                  <Image
                    src={src}
                    alt={`${pkg.name} example ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="(min-width: 640px) 300px, 50vw"
                  />
                </div>
              ))}
            </div>

            <div className="p-6 sm:p-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-1">
                <div>
                  <span className="text-xs font-semibold text-[#E8872B] uppercase tracking-wider font-[family-name:var(--font-heading)]">
                    {pkg.tagline}
                  </span>
                  <h3 className="text-2xl font-bold text-warm-900 font-[family-name:var(--font-heading)]">
                    {pkg.name}
                  </h3>
                </div>
                <span className="text-lg font-bold text-[#0C6B4E] font-[family-name:var(--font-heading)]">
                  {pkg.priceRange}
                </span>
              </div>

              {/* Origin story */}
              <div className="mt-5 bg-warm-50 rounded-2xl p-5">
                <p className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2 font-[family-name:var(--font-heading)]">
                  The story
                </p>
                <p className="text-sm text-warm-700 leading-relaxed">
                  {pkg.origin}
                </p>
              </div>

              {/* Who it's for */}
              <div className="mt-5">
                <p className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2 font-[family-name:var(--font-heading)]">
                  Who it&apos;s for
                </p>
                <p className="text-sm text-warm-700 leading-relaxed">
                  {pkg.whoItsFor}
                </p>
              </div>

              {/* This is for you if */}
              <div className="mt-5 bg-[#0C6B4E]/5 border border-[#0C6B4E]/10 rounded-2xl p-5">
                <p className="text-xs font-semibold text-[#0C6B4E] uppercase tracking-wider mb-3 font-[family-name:var(--font-heading)]">
                  This is for you if...
                </p>
                <div className="space-y-2">
                  {pkg.forYouIf.map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-[#0C6B4E] mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-[#0C6B4E]">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* What's included / not included */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-3 font-[family-name:var(--font-heading)]">
                    What&apos;s included
                  </p>
                  <div className="space-y-2">
                    {pkg.includes.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-[#0C6B4E] mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-warm-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-3 font-[family-name:var(--font-heading)]">
                    Not included
                  </p>
                  <div className="space-y-2">
                    {pkg.doesNotInclude.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Minus className="w-3.5 h-3.5 text-warm-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-warm-500">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CTA */}
              <Link
                href="/book"
                className="mt-8 w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#E8872B] text-white font-semibold rounded-2xl hover:bg-[#d47a24] transition-colors font-[family-name:var(--font-heading)] shadow-lg shadow-orange-200/50 text-base"
              >
                Book Free Consultation
                <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="text-center text-xs text-warm-400 mt-3 pb-2 sm:pb-0">
                Prices confirmed after your free consultation. No obligation.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
