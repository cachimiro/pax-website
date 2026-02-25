'use client';

import { useState } from 'react';
import { MapPin, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { checkPostcode } from '@/lib/postcode';
import ScrollReveal from './ScrollReveal';

export default function ServiceAreaCheck() {
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
    <section className="section-padding bg-green-900 grain-overlay relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-green-700/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <ScrollReveal>
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6">
            <MapPin className="w-6 h-6 text-orange-400" />
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 font-[family-name:var(--font-heading)]">
            Do we cover your area?
          </h2>
          <p className="text-green-100/70 mb-8 max-w-md mx-auto">
            We serve homes within 50 miles of Warrington — covering Manchester, Liverpool, Chester, Preston, and beyond.
          </p>

          {/* Postcode input */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="text"
              value={postcode}
              onChange={(e) => {
                setPostcode(e.target.value.toUpperCase());
                if (status !== 'idle') setStatus('idle');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
              placeholder="Enter your postcode"
              className="flex-1 px-5 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm font-[family-name:var(--font-heading)] focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
            <button
              onClick={handleCheck}
              disabled={status === 'loading'}
              className="px-6 py-3.5 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-all duration-200 text-sm font-[family-name:var(--font-heading)] disabled:opacity-50 shadow-lg shadow-orange-500/25"
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
            <div className="mt-6 inline-flex items-center gap-2 bg-green-500/20 border border-green-400/30 rounded-xl px-5 py-3 animate-fade-in-up">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-sm text-green-100">
                {location ? `${location} is` : 'You\'re'} within our service area{distance ? ` (${distance} miles)` : ''}!{' '}
                <Link href="/book" className="underline font-semibold text-white hover:text-orange-300 transition-colors">
                  Book your consultation
                </Link>
              </span>
            </div>
          )}

          {status === 'out-of-range' && (
            <div className="mt-6 inline-flex items-center gap-2 bg-orange-500/20 border border-orange-400/30 rounded-xl px-5 py-3 animate-fade-in-up">
              <XCircle className="w-5 h-5 text-orange-400" />
              <span className="text-sm text-orange-100">
                That&apos;s {distance} miles away — outside our current range. We&apos;re expanding soon!
              </span>
            </div>
          )}

          {status === 'error' && (
            <div className="mt-6 inline-flex items-center gap-2 bg-red-500/20 border border-red-400/30 rounded-xl px-5 py-3 animate-fade-in-up">
              <XCircle className="w-5 h-5 text-red-400" />
              <span className="text-sm text-red-100">
                Please enter a valid UK postcode (e.g. WA1 1AA).
              </span>
            </div>
          )}

          {/* Quick area list */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {['Manchester', 'Liverpool', 'Chester', 'Preston', 'Bolton', 'Wigan', 'Stockport', 'Warrington'].map((area) => (
              <span key={area} className="text-xs text-green-100/40 bg-white/5 px-3 py-1 rounded-full">
                {area}
              </span>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
