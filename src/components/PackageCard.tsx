'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

interface PackageCardProps {
  id: string;
  name: string;
  bestFor: string;
  priceRange: string;
  priceLabel: string;
  features: string[];
  leadTime: string;
  popular?: boolean;
  finishLevel: string;
}

export default function PackageCard({
  id,
  name,
  bestFor,
  priceRange,
  priceLabel,
  features,
  leadTime,
  popular = false,
  finishLevel,
}: PackageCardProps) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 md:p-8 transition-shadow hover:shadow-lg ${
        popular
          ? 'border-green-700 bg-white shadow-md ring-1 ring-green-700'
          : 'border-warm-200 bg-white'
      }`}
    >
      {popular && (
        <span className="absolute -top-3 left-6 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-500 text-white font-[family-name:var(--font-heading)]">
          Most Popular
        </span>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-bold text-warm-900 mb-1 font-[family-name:var(--font-heading)]">{name}</h3>
        <p className="text-sm text-orange-600 font-medium font-[family-name:var(--font-heading)]">{bestFor}</p>
      </div>

      <div className="mb-6">
        <div className="text-3xl font-bold text-warm-900 font-[family-name:var(--font-heading)]">{priceRange}</div>
        <p className="text-xs text-warm-500 mt-1">{priceLabel}</p>
      </div>

      <div className="mb-6 space-y-1 text-sm text-warm-500">
        <div className="flex justify-between">
          <span>Finish level</span>
          <span className="font-medium text-warm-700">{finishLevel}</span>
        </div>
        <div className="flex justify-between">
          <span>Lead time</span>
          <span className="font-medium text-warm-700">{leadTime}</span>
        </div>
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-warm-700">
            <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      <Link
        href={`/book?package=${id}`}
        className={`block w-full text-center py-3 rounded-lg font-semibold text-sm transition-colors font-[family-name:var(--font-heading)] ${
          popular
            ? 'bg-green-700 text-white hover:bg-green-900'
            : 'bg-warm-100 text-warm-800 hover:bg-green-700 hover:text-white'
        }`}
        onClick={() => trackEvent('package_click', { package: id })}
      >
        Book Consultation
      </Link>
    </div>
  );
}
