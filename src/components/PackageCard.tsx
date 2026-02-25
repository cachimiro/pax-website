'use client';

import Link from 'next/link';
import { Check, ArrowRight, Info } from 'lucide-react';
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
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 md:p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
        popular
          ? 'border-orange-400 bg-white shadow-lg ring-1 ring-orange-400/50'
          : 'border-warm-200 bg-white hover:border-green-200 hover:shadow-green-700/5'
      }`}
    >
      {popular && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-orange-500 to-orange-400 text-white font-[family-name:var(--font-heading)] shadow-lg shadow-orange-500/30">
          Most Popular
        </span>
      )}

      {/* Tagline */}
      {tagline && (
        <span className={`inline-block text-[10px] font-bold tracking-widest uppercase mb-3 font-[family-name:var(--font-heading)] ${
          popular ? 'text-orange-500' : 'text-green-600'
        }`}>
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
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
              popular ? 'bg-orange-50' : 'bg-green-50'
            }`}>
              <Check className={`w-3 h-3 ${popular ? 'text-orange-500' : 'text-green-600'}`} />
            </div>
            {feature}
          </li>
        ))}
      </ul>

      {/* Learn more link */}
      {onLearnMore && (
        <button
          onClick={() => onLearnMore(id)}
          className="flex items-center gap-1.5 text-xs font-medium text-warm-500 hover:text-[#0C6B4E] transition-colors mb-4 font-[family-name:var(--font-heading)]"
        >
          <Info className="w-3.5 h-3.5" />
          Learn more about {name}
        </button>
      )}

      {/* CTA */}
      <Link
        href={`/book?package=${id}`}
        className={`group block w-full text-center py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 font-[family-name:var(--font-heading)] ${
          popular
            ? 'bg-[#E8872B] text-white hover:bg-[#d47a24] shadow-lg shadow-orange-200/50'
            : 'bg-[#0C6B4E] text-white hover:bg-[#0A5C42]'
        }`}
        onClick={() => trackEvent('package_click', { package: id })}
      >
        <span className="inline-flex items-center">
          {ctaText}
          <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </div>
  );
}
