'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';

const MAIN_INTERVAL = 7000;
const MAIN_FADE_MS = 1400;
const THUMB_STAGGER_MS = 600;
const THUMB_FADE_MS = 800;

// 6 Select package images that rotate through all 3 positions
const allImages = [
  { src: '/images/select-package/spray-painted-doors/spray-painted-door-01.png', alt: 'White spray-painted shaker wardrobe fitted into period alcove' },
  { src: '/images/select-package/spray-painted-doors/spray-painted-door-03.png', alt: 'Sage green spray-painted shaker wardrobe with chrome handles' },
  { src: '/images/select-package/spray-painted-doors/spray-painted-door-09.png', alt: 'Cream fretwork mirrored wardrobe doors with matching drawers' },
  { src: '/images/select-package/spray-painted-doors/spray-painted-door-10.png', alt: 'Navy blue spray-painted wardrobe suite with TV area' },
  { src: '/images/select-package/spray-painted-doors/spray-painted-door-05.png', alt: 'Light grey spray-painted shaker wardrobe in period room' },
  { src: '/images/select-package/homepage/hero-spray-painted-white-doors.png', alt: 'White L-shaped corner wardrobe with shaker and beaded doors' },
];

export function HeroDesktopImages() {
  const [mainIdx, setMainIdx] = useState(0);
  const [detailIdx, setDetailIdx] = useState(1);
  const [fittingIdx, setFittingIdx] = useState(2);

  const [prevMain, setPrevMain] = useState<number | null>(null);
  const [prevDetail, setPrevDetail] = useState<number | null>(null);
  const [prevFitting, setPrevFitting] = useState<number | null>(null);

  const [progressKey, setProgressKey] = useState(0);

  const pausedRef = useRef(false);
  const nextAvailableRef = useRef(3);

  const advance = useCallback(() => {
    if (pausedRef.current) return;

    // Main image changes immediately
    const newMain = nextAvailableRef.current % allImages.length;
    nextAvailableRef.current = (nextAvailableRef.current + 1) % allImages.length;

    setPrevMain(mainIdx);
    setMainIdx(newMain);
    setProgressKey((k) => k + 1);
    setTimeout(() => setPrevMain(null), MAIN_FADE_MS);

    // Detail thumbnail changes after stagger
    setTimeout(() => {
      if (pausedRef.current) return;
      const newDetail = nextAvailableRef.current % allImages.length;
      nextAvailableRef.current = (nextAvailableRef.current + 1) % allImages.length;

      setPrevDetail(detailIdx);
      setDetailIdx(newDetail);
      setTimeout(() => setPrevDetail(null), THUMB_FADE_MS);
    }, THUMB_STAGGER_MS);

    // Fitting thumbnail changes after 2x stagger
    setTimeout(() => {
      if (pausedRef.current) return;
      const newFitting = nextAvailableRef.current % allImages.length;
      nextAvailableRef.current = (nextAvailableRef.current + 1) % allImages.length;

      setPrevFitting(fittingIdx);
      setFittingIdx(newFitting);
      setTimeout(() => setPrevFitting(null), THUMB_FADE_MS);
    }, THUMB_STAGGER_MS * 2);
  }, [mainIdx, detailIdx, fittingIdx]);

  useEffect(() => {
    const timer = setInterval(advance, MAIN_INTERVAL);
    return () => clearInterval(timer);
  }, [advance]);

  const mainImg = allImages[mainIdx];
  const detailImg = allImages[detailIdx];
  const fittingImg = allImages[fittingIdx];
  const kenBurnsClass = mainIdx % 2 === 0 ? 'animate-ken-burns-left' : 'animate-ken-burns-right';

  return (
    <div
      className="relative"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      {/* Main image with crossfade */}
      <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/30 aspect-[4/3] relative">
        {/* Previous main (fading out) */}
        {prevMain !== null && (
          <div
            key={`prev-main-${prevMain}`}
            className="absolute inset-0 z-[1]"
            style={{ animation: `heroFadeOut ${MAIN_FADE_MS}ms ease-in-out forwards` }}
          >
            <Image
              src={allImages[prevMain].src}
              alt={allImages[prevMain].alt}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </div>
        )}
        {/* Current main */}
        <div
          key={`main-${mainIdx}`}
          className="absolute inset-0 z-[2]"
          style={prevMain !== null ? { animation: `heroFadeIn ${MAIN_FADE_MS}ms ease-in-out forwards` } : {}}
        >
          <Image
            src={mainImg.src}
            alt={mainImg.alt}
            fill
            className={`object-cover ${kenBurnsClass}`}
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
          />
        </div>

        {/* Progress bar — inside overflow-hidden, below floating elements */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 z-[3]">
          <div
            key={progressKey}
            className="h-full bg-white/40"
            style={{ animation: `progressFill ${MAIN_INTERVAL}ms linear forwards` }}
          />
        </div>
      </div>

      {/* Floating detail card — bottom left */}
      <div className="absolute -bottom-6 -left-6 w-48 rounded-xl overflow-hidden shadow-xl shadow-black/20 border-4 border-white">
        {prevDetail !== null && (
          <div
            key={`prev-detail-${prevDetail}`}
            className="absolute inset-0 z-[1]"
            style={{ animation: `thumbnailFadeOut ${THUMB_FADE_MS}ms ease-in-out forwards` }}
          >
            <Image
              src={allImages[prevDetail].src}
              alt={allImages[prevDetail].alt}
              width={300}
              height={300}
              className="w-full h-auto object-cover aspect-square"
            />
          </div>
        )}
        <div
          key={`detail-${detailIdx}`}
          className="relative z-[2]"
          style={prevDetail !== null ? { animation: `thumbnailFadeIn ${THUMB_FADE_MS}ms ease-out forwards` } : {}}
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
      <div className="absolute -top-4 -right-4 w-40 rounded-xl overflow-hidden shadow-xl shadow-black/20 border-4 border-white">
        {prevFitting !== null && (
          <div
            key={`prev-fitting-${prevFitting}`}
            className="absolute inset-0 z-[1]"
            style={{ animation: `thumbnailFadeOut ${THUMB_FADE_MS}ms ease-in-out forwards` }}
          >
            <Image
              src={allImages[prevFitting].src}
              alt={allImages[prevFitting].alt}
              width={300}
              height={300}
              className="w-full h-auto object-cover aspect-square"
            />
          </div>
        )}
        <div
          key={`fitting-${fittingIdx}`}
          className="relative z-[2]"
          style={prevFitting !== null ? { animation: `thumbnailFadeIn ${THUMB_FADE_MS}ms ease-out forwards` } : {}}
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
    }, MAIN_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="lg:hidden absolute inset-0 z-0">
      {allImages.map((img, i) => (
        <div
          key={img.src}
          className="absolute inset-0"
          style={{
            opacity: i === current ? 1 : 0,
            transition: `opacity ${MAIN_FADE_MS}ms ease-in-out`,
          }}
        >
          <Image
            src={img.src}
            alt={img.alt}
            fill
            className={`object-cover ${i % 2 === 0 ? 'animate-ken-burns-left' : 'animate-ken-burns-right'}`}
            priority={i === 0}
            sizes="(min-width: 1024px) 1px, 100vw"
          />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-green-900/85 via-green-900/75 to-green-900/90" />
    </div>
  );
}
