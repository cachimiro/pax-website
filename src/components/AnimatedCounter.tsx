'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  value: string; // e.g. "500+", "5.0", "1–2", "Free"
}

export default function AnimatedCounter({ value }: AnimatedCounterProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [display, setDisplay] = useState(value);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          animateValue();
          observer.unobserve(el);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAnimated]);

  const animateValue = () => {
    // Extract numeric part
    const numMatch = value.match(/^([\d.]+)/);
    if (!numMatch) {
      // Non-numeric values like "Free" — just show immediately
      setDisplay(value);
      return;
    }

    const target = parseFloat(numMatch[1]);
    const suffix = value.slice(numMatch[1].length); // e.g. "+" or ""
    const isDecimal = numMatch[1].includes('.');
    const duration = 1200;
    const startTime = performance.now();

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;

      if (isDecimal) {
        setDisplay(current.toFixed(1) + suffix);
      } else {
        setDisplay(Math.floor(current).toLocaleString() + suffix);
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  };

  return (
    <p
      ref={ref}
      className="text-2xl font-bold text-warm-900 font-[family-name:var(--font-heading)] leading-none tabular-nums"
    >
      {display}
    </p>
  );
}
