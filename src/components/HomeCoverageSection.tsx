'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, MapPin, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import UKCoverageMap from '@/components/UKCoverageMap';
import ScrollReveal from '@/components/ScrollReveal';
import { FALLBACK_REGIONS } from '@/lib/region-data';
import { checkPostcode } from '@/lib/postcode';

export default function HomeCoverageSection() {
  const [postcode, setPostcode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'out-of-range' | 'error'>('idle');
  const [location, setLocation] = useState('');
  const [distance, setDistance] = useState<number | undefined>();

  const handleCheck = async () => {
    if (!postcode.trim()) return;
    setStatus('loading');

    const result = await checkPostcode(postcode);

    if (!result.valid) {
      setStatus('error');
      return;
    }

    if (result.inRange) {
      setStatus('success');
      setLocation(result.location || '');
      setDistance(result.distance);
    } else {
      setStatus('out-of-range');
      setDistance(result.distance);
    }
  };

  return (
    <section className="section-padding bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section label */}
        <ScrollReveal>
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-orange-500 mb-3 font-[family-name:var(--font-heading)]">
              <span className="w-6 h-px bg-orange-400" />
              Where We Work
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-warm-900 font-[family-name:var(--font-heading)]">
              Expanding across the UK
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Map */}
          <ScrollReveal>
            <div className="max-w-sm mx-auto lg:max-w-md">
              <UKCoverageMap regions={FALLBACK_REGIONS} />
            </div>
          </ScrollReveal>

          {/* Postcode checker */}
          <ScrollReveal delay={0.15}>
            <div className="bg-warm-50 rounded-3xl p-5 sm:p-6 md:p-10 border border-warm-100">
              <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mb-5">
                <MapPin className="w-5 h-5 text-green-700" />
              </div>

              <h3 className="text-xl md:text-2xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
                Check if we cover your area
              </h3>
              <p className="text-sm text-warm-500 mb-6">
                Enter your postcode and we&apos;ll let you know.
              </p>

              {/* Input */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                  type="text"
                  value={postcode}
                  onChange={(e) => {
                    setPostcode(e.target.value.toUpperCase());
                    if (status !== 'idle') setStatus('idle');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                  placeholder="e.g. M1 1AA"
                  className="flex-1 px-5 py-3.5 rounded-xl bg-white border border-warm-200 text-warm-900 placeholder-warm-400 text-sm font-[family-name:var(--font-heading)] focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
                <button
                  onClick={handleCheck}
                  disabled={status === 'loading'}
                  className="w-full sm:w-auto px-6 py-3.5 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-800 transition-all duration-200 text-sm font-[family-name:var(--font-heading)] disabled:opacity-50 shadow-sm active:scale-[0.97]"
                >
                  {status === 'loading' ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    'Check'
                  )}
                </button>
              </div>

              {/* Results */}
              {status === 'success' && (
                <div className="flex items-start gap-2.5 bg-green-50 border border-green-200 rounded-xl px-4 py-3 animate-fade-in-up">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-green-800">
                    {location ? `${location} is` : 'You\'re'} within our service area{distance ? ` (${distance} miles)` : ''}!{' '}
                    <Link href="/book" className="underline font-semibold text-green-700 hover:text-green-900 transition-colors">
                      Book your consultation
                    </Link>
                  </span>
                </div>
              )}

              {status === 'out-of-range' && (
                <div className="flex items-start gap-2.5 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 animate-fade-in-up">
                  <XCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-orange-800">
                    We&apos;re not in {distance ? `your area (${distance} miles)` : 'your area'} yet — but we&apos;re expanding. Get in touch!
                  </span>
                </div>
              )}

              {status === 'error' && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 animate-fade-in-up">
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-red-800">
                    Please enter a valid UK postcode (e.g. WA1 1AA).
                  </span>
                </div>
              )}

              {/* Link to full coverage page */}
              <div className="mt-6 pt-5 border-t border-warm-200">
                <Link
                  href="/service-areas"
                  className="inline-flex items-center gap-2 text-sm text-green-700 font-semibold hover:text-green-800 transition-colors font-[family-name:var(--font-heading)]"
                >
                  View full coverage details
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
