'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

// 6 images that rotate through all 3 positions
const allImages = [
  { src: '/images/stock/hero-main.jpg', alt: 'Modern fitted wardrobe with custom doors' },
  { src: '/images/stock/project-1.jpg', alt: 'Custom sage green wardrobe installation' },
  { src: '/images/stock/project-2.jpg', alt: 'Walk-in dressing room with integrated lighting' },
  { src: '/images/stock/project-4.jpg', alt: 'Navy wardrobe doors with chrome handles' },
  { src: '/images/stock/hero-detail.jpg', alt: 'Custom wardrobe door finish detail' },
  { src: '/images/stock/hero-fitting.jpg', alt: 'Expert wardrobe installation' },
];

export function HeroDesktopImages() {
  // Track which image index is in each position
  // main=0, detail(bottom-left)=1, fitting(top-right)=2 initially
  const [positions, setPositions] = useState({ main: 0, detail: 1, fitting: 2 });
  const [transitioning, setTransitioning] = useState(false);
  // Track the "outgoing" images for crossfade
  const [prev, setPrev] = useState<{ main: number; detail: number; fitting: number } | null>(null);

  const advance = useCallback(() => {
    setTransitioning(true);
    setPrev(positions);

    // The current fitting image "graduates" out, detail moves to fitting,
    // main moves to detail, and a new image enters as main
    const nextMainIdx = (positions.fitting + 1) % allImages.length;

    setPositions({
      main: nextMainIdx,
      detail: positions.main,
      fitting: positions.detail,
    });

    // Clear transition state after animation completes
    setTimeout(() => {
      setTransitioning(false);
      setPrev(null);
    }, 900);
  }, [positions]);

  useEffect(() => {
    const timer = setInterval(advance, 5000);
    return () => clearInterval(timer);
  }, [advance]);

  const mainImg = allImages[positions.main];
  const detailImg = allImages[positions.detail];
  const fittingImg = allImages[positions.fitting];

  return (
    <div className="relative">
      {/* Main image with crossfade */}
      <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/30 aspect-[4/3] relative">
        {/* Previous main (fading out) */}
        {prev && (
          <div
            className="absolute inset-0 z-[1] transition-opacity duration-[900ms] ease-in-out opacity-0"
          >
            <Image
              src={allImages[prev.main].src}
              alt={allImages[prev.main].alt}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </div>
        )}
        {/* Current main */}
        <div
          className={`absolute inset-0 z-[2] transition-opacity duration-[900ms] ease-in-out ${
            transitioning ? 'opacity-0 animate-hero-fade-in' : 'opacity-100'
          }`}
          style={transitioning ? { animation: 'heroFadeIn 900ms ease-in-out forwards' } : {}}
        >
          <Image
            src={mainImg.src}
            alt={mainImg.alt}
            fill
            className="object-cover animate-ken-burns"
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
          />
        </div>

        {/* Carousel dots */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {allImages.slice(0, 4).map((_, i) => {
            // Map dot index to whether it's the current main
            const isActive = positions.main % 4 === i || (positions.main >= 4 && i === positions.main - 4);
            return (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  isActive ? 'bg-white w-4' : 'bg-white/40 w-1.5'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Floating detail card — bottom left */}
      <div
        className="absolute -bottom-6 -left-6 w-48 rounded-xl overflow-hidden shadow-xl shadow-black/20 border-4 border-white transition-all duration-[900ms] ease-in-out"
      >
        {/* Outgoing detail */}
        {prev && (
          <div className="absolute inset-0 z-[1]" style={{ animation: 'heroFadeOut 900ms ease-in-out forwards' }}>
            <Image
              src={allImages[prev.detail].src}
              alt={allImages[prev.detail].alt}
              width={300}
              height={300}
              className="w-full h-auto object-cover aspect-square"
            />
          </div>
        )}
        {/* Current detail */}
        <div
          className="relative z-[2]"
          style={transitioning ? { animation: 'heroFadeIn 900ms ease-in-out forwards' } : {}}
        >
          <Image
            src={detailImg.src}
            alt={detailImg.alt}
            width={300}
            height={300}
            className="w-full h-auto object-cover aspect-square"
          />
        </div>
      </div>

      {/* Floating fitting card — top right */}
      <div
        className="absolute -top-4 -right-4 w-40 rounded-xl overflow-hidden shadow-xl shadow-black/20 border-4 border-white transition-all duration-[900ms] ease-in-out"
      >
        {/* Outgoing fitting */}
        {prev && (
          <div className="absolute inset-0 z-[1]" style={{ animation: 'heroFadeOut 900ms ease-in-out forwards' }}>
            <Image
              src={allImages[prev.fitting].src}
              alt={allImages[prev.fitting].alt}
              width={300}
              height={300}
              className="w-full h-auto object-cover aspect-square"
            />
          </div>
        )}
        {/* Current fitting */}
        <div
          className="relative z-[2]"
          style={transitioning ? { animation: 'heroFadeIn 900ms ease-in-out forwards' } : {}}
        >
          <Image
            src={fittingImg.src}
            alt={fittingImg.alt}
            width={300}
            height={300}
            className="w-full h-auto object-cover aspect-square"
          />
        </div>
      </div>

      {/* Floating stat badge */}
      <div className="absolute bottom-8 right-8 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg z-10">
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {[1,2,3,4,5].map(i => (
              <svg key={i} className="w-3.5 h-3.5 text-orange-400 fill-orange-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            ))}
          </div>
          <span className="text-xs font-semibold text-warm-900 font-[family-name:var(--font-heading)]">500+ installs</span>
        </div>
      </div>
    </div>
  );
}

export function HeroMobileBackground() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % allImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="lg:hidden absolute inset-0 z-0">
      {allImages.map((img, i) => (
        <div
          key={img.src}
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === current ? 1 : 0 }}
        >
          <Image
            src={img.src}
            alt={img.alt}
            fill
            className="object-cover"
            priority={i === 0}
            sizes="(min-width: 1024px) 1px, 100vw"
          />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-green-900/85 via-green-900/75 to-green-900/90" />
    </div>
  );
}
