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
  const [activeIndex, setActiveIndex] = useState(1); // Start on PaxBespoke (most popular)

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
      const cardWidth = el.scrollWidth / packages.length;
      const index = Math.round(el.scrollLeft / cardWidth);
      setActiveIndex(Math.min(Math.max(index, 0), packages.length - 1));
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [packages.length]);

  return (
    <div>
      {/* Mobile: horizontal scroll */}
      <div
        ref={scrollRef}
        className="md:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 -mx-4 px-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {packages.map((pkg) => (
          <div key={pkg.id} className="snap-center flex-shrink-0 w-[85vw] max-w-[340px]">
            <PackageCard {...pkg} onLearnMore={onLearnMore} />
          </div>
        ))}
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
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === activeIndex ? 'w-6 bg-orange-500' : 'w-1.5 bg-warm-300'
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
