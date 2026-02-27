'use client';

import { useRef, useState, useEffect } from 'react';
import PackageCard from './PackageCard';

interface PackageData {
  id: string;
  name: string;
  tagline?: string;
  bestFor: string;
  priceRange: string;
  priceLabel: string;
  features: string[];
  leadTime: string;
  finishLevel: string;
  popular?: boolean;
  ctaText?: string;
}

interface PackageCarouselProps {
  packages: PackageData[];
  onLearnMore?: (id: string) => void;
}

export default function PackageCarousel({ packages, onLearnMore }: PackageCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(2); // Start on Select (recommended)
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Scroll to the popular card on mount (mobile only)
    const popularIndex = packages.findIndex(p => p.popular);
    if (popularIndex >= 0 && window.innerWidth < 768) {
      const cardWidth = el.scrollWidth / packages.length;
      el.scrollLeft = cardWidth * popularIndex - (el.clientWidth - cardWidth) / 2;
      setActiveIndex(popularIndex);
    }
  }, [packages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (!hasScrolled) setHasScrolled(true);
      const cardWidth = el.scrollWidth / packages.length;
      const index = Math.round(el.scrollLeft / cardWidth);
      setActiveIndex(Math.min(Math.max(index, 0), packages.length - 1));
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [packages.length, hasScrolled]);

  return (
    <div>
      {/* Mobile: horizontal scroll with edge fade hints */}
      <div className="md:hidden relative">
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pt-5 pb-4 -mx-4 px-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {packages.map((pkg) => (
            <div key={pkg.id} className="snap-center flex-shrink-0 w-[85vw] max-w-[340px]">
              <PackageCard {...pkg} onLearnMore={onLearnMore} />
            </div>
          ))}
        </div>
        {/* Right edge fade to hint scrollability */}
        <div className="pointer-events-none absolute top-5 right-0 bottom-4 w-8 bg-gradient-to-l from-warm-50 to-transparent" />
        {/* Left edge fade */}
        <div className="pointer-events-none absolute top-5 left-0 bottom-4 w-8 bg-gradient-to-r from-warm-50 to-transparent" />
      </div>

      {/* Swipe hint — fades out after first scroll */}
      <div
        className={`md:hidden text-center text-[11px] text-warm-400 font-[family-name:var(--font-heading)] mt-1 transition-opacity duration-500 ${
          hasScrolled ? 'opacity-0' : 'opacity-100'
        }`}
      >
        Swipe to compare packages
      </div>

      {/* Mobile dot indicators */}
      <div className="md:hidden flex justify-center gap-2 mt-2">
        {packages.map((pkg, i) => (
          <button
            key={pkg.id}
            onClick={() => {
              const el = scrollRef.current;
              if (!el) return;
              const cardWidth = el.scrollWidth / packages.length;
              el.scrollTo({ left: cardWidth * i, behavior: 'smooth' });
            }}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === activeIndex
                ? `w-8 ${pkg.id === 'budget' ? 'bg-[#f28c43]' : pkg.id === 'select' ? 'bg-[#2d5c37]' : 'bg-gradient-to-r from-[#f28c43] to-[#2d5c37]'}`
                : 'w-2 bg-warm-300'
            }`}
            aria-label={`Show ${pkg.name} package`}
          />
        ))}
      </div>

      {/* Desktop: grid */}
      <div className="hidden md:grid md:grid-cols-3 gap-6 lg:gap-8">
        {packages.map((pkg) => (
          <PackageCard key={pkg.id} {...pkg} onLearnMore={onLearnMore} />
        ))}
      </div>
    </div>
  );
}
