'use client';

import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

interface PackageCardProps {
  id: string;
  name: string;
  tagline?: string;
  bestFor: string;
  priceRange: string;
  priceLabel: string;
  features: string[];
  leadTime: string;
  popular?: boolean;
  finishLevel: string;
  ctaText?: string;
  onLearnMore?: (id: string) => void;
}

// Package-specific color config
function getCardColors(id: string, popular?: boolean) {
  switch (id) {
    case 'budget':
      return {
        border: 'border-warm-200 hover:border-[#f28c43]/40',
        ring: '',
        shadow: 'hover:shadow-[#f28c43]/5',
        tagline: 'text-[#f28c43]',
        checkBg: 'bg-[#f28c43]/10',
        checkIcon: 'text-[#f28c43]',
        cta: 'bg-[#f28c43] text-white hover:bg-[#e07c33] shadow-lg shadow-[#f28c43]/25',
        badge: '',
      };
    case 'paxbespoke':
      return {
        border: 'border-warm-200 hover:border-[#2d5c37]/40',
        ring: '',
        shadow: 'hover:shadow-[#2d5c37]/5',
        tagline: 'text-[#2d5c37]',
        checkBg: 'bg-gradient-to-br from-[#f28c43]/10 to-[#2d5c37]/10',
        checkIcon: 'text-[#2d5c37]',
        cta: 'bg-gradient-to-r from-[#f28c43] to-[#2d5c37] text-white hover:opacity-90 shadow-lg shadow-[#f28c43]/25',
        badge: 'bg-gradient-to-r from-[#f28c43] to-[#2d5c37]',
      };
    case 'select':
      return {
        border: 'border-[#2d5c37] shadow-lg ring-1 ring-[#2d5c37]/50',
        ring: '',
        shadow: '',
        tagline: 'text-[#2d5c37]',
        checkBg: 'bg-[#2d5c37]/10',
        checkIcon: 'text-[#2d5c37]',
        cta: 'bg-[#2d5c37] text-white hover:bg-[#234a2c] shadow-lg shadow-[#2d5c37]/25',
        badge: 'bg-[#2d5c37]',
      };
    default:
      return {
        border: 'border-warm-200',
        ring: '',
        shadow: '',
        tagline: 'text-warm-500',
        checkBg: 'bg-warm-50',
        checkIcon: 'text-warm-500',
        cta: 'bg-warm-700 text-white hover:bg-warm-800',
        badge: '',
      };
  }
}

export default function PackageCard({
  id,
  name,
  tagline,
  bestFor,
  priceRange,
  priceLabel,
  features,
  leadTime,
  popular = false,
  finishLevel,
  ctaText = 'Book Consultation',
  onLearnMore,
}: PackageCardProps) {
  const colors = getCardColors(id, popular);

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 md:p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white ${colors.border} ${colors.shadow}`}
    >
      {popular && (
        <span className={`absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold text-white font-[family-name:var(--font-heading)] shadow-lg ${colors.badge} ${
          id === 'select' ? 'shadow-[#2d5c37]/30' : 'shadow-[#f28c43]/30'
        }`}>
          Recommended
        </span>
      )}

      {/* Tagline */}
      {tagline && (
        <span className={`inline-block text-[10px] font-bold tracking-widest uppercase mb-3 font-[family-name:var(--font-heading)] ${colors.tagline}`}>
          {tagline}
        </span>
      )}

      <div className="mb-4">
        <h3 className="text-2xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">{name}</h3>
        <p className="text-sm text-warm-500 leading-relaxed">{bestFor}</p>
      </div>

      {/* Price */}
      <div className="mb-6 pb-6 border-b border-warm-100">
        <div className="text-3xl font-bold text-warm-900 font-[family-name:var(--font-heading)]">{priceRange}</div>
        <p className="text-xs text-warm-500 mt-1">{priceLabel}</p>
      </div>

      {/* Quick specs */}
      <div className="mb-5 space-y-2 text-sm text-warm-500">
        <div className="flex justify-between items-center">
          <span>Finish level</span>
          <span className="font-medium text-warm-700 bg-warm-50 px-2 py-0.5 rounded text-xs">{finishLevel}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Lead time</span>
          <span className="font-medium text-warm-700 bg-warm-50 px-2 py-0.5 rounded text-xs">{leadTime}</span>
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-2.5 mb-6 flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-warm-700">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${colors.checkBg}`}>
              <Check className={`w-3 h-3 ${colors.checkIcon}`} />
            </div>
            {feature}
          </li>
        ))}
      </ul>

      {/* Primary CTA — opens detail modal */}
      {onLearnMore ? (
        <button
          onClick={() => {
            trackEvent('package_click', { package: id });
            onLearnMore(id);
          }}
          className={`group w-full text-center py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 font-[family-name:var(--font-heading)] active:scale-[0.97] ${colors.cta}`}
        >
          <span className="inline-flex items-center">
            {ctaText}
            <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>
      ) : (
        <Link
          href={`/book?package=${id}`}
          className={`group block w-full text-center py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 font-[family-name:var(--font-heading)] active:scale-[0.97] ${colors.cta}`}
          onClick={() => trackEvent('package_click', { package: id })}
        >
          <span className="inline-flex items-center">
            {ctaText}
            <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}

      {/* Secondary — book a call */}
      <Link
        href={`/book?package=${id}`}
        className="block w-full text-center py-2 mt-2 text-xs font-medium text-warm-500 hover:text-warm-700 transition-colors font-[family-name:var(--font-heading)]"
      >
        or book a free call directly
      </Link>
    </div>
  );
}
