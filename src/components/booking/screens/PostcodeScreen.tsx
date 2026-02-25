'use client';

import { useState } from 'react';
import { MapPin, Loader2, CheckCircle, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { checkPostcode } from '@/lib/postcode';
import { trackEvent } from '@/lib/analytics';

interface PostcodeScreenProps {
  onNext: (postcode: string, location: string) => void;
}

export default function PostcodeScreen({ onNext }: PostcodeScreenProps) {
  const [input, setInput] = useState('');
  const [checking, setChecking] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [result, setResult] = useState<{
    valid: boolean; inRange: boolean; distance?: number; location?: string; error?: string;
  } | null>(null);

  const handleCheck = async () => {
    setChecking(true);
    setResult(null);
    trackEvent('service_area_check', { postcode: input.slice(0, 4) });
    const res = await checkPostcode(input);
    setResult(res);
    setChecking(false);
  };

  const handleContinue = () => {
    if (result?.valid && result.inRange) {
      onNext(input, result.location || '');
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mb-5">
        <MapPin className="w-6 h-6 text-green-700" />
      </div>
      <h2 className="text-2xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
        Where&apos;s your project?
      </h2>
      <p className="text-sm text-warm-500 mb-1">
        We install within 50 miles of Warrington. Let&apos;s check we can reach you.
      </p>
      <p className="text-xs text-warm-400 mb-8 font-[family-name:var(--font-heading)]">
        Why we ask: We serve homes within 50 miles of Warrington. This confirms we can reach you.
      </p>

      <div className="space-y-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value.toUpperCase()); setResult(null); }}
            className="flex-1 px-4 py-3.5 rounded-2xl border-2 border-warm-100 bg-white text-warm-900 text-base font-medium tracking-wider uppercase focus:border-[#0C6B4E] focus:outline-none transition-colors"
            placeholder="e.g. WA1 1AA"
            maxLength={8}
            onKeyDown={(e) => { if (e.key === 'Enter' && input.length >= 5) handleCheck(); }}
          />
          <motion.button
            onClick={handleCheck}
            disabled={checking || input.length < 5}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3.5 bg-orange-500 text-white font-semibold rounded-2xl hover:bg-orange-600 transition-colors text-sm font-[family-name:var(--font-heading)] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20"
          >
            {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check'}
          </motion.button>
        </div>

        {/* In range */}
        {result?.valid && result.inRange && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 rounded-xl p-5 flex items-start gap-3"
          >
            <CheckCircle className="w-5 h-5 text-green-700 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-900 font-[family-name:var(--font-heading)]">
                We cover {result.location}!
              </p>
              {result.distance !== undefined && (
                <p className="text-xs text-green-700 mt-0.5">
                  {result.distance} miles from our Warrington base.
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Out of range */}
        {result?.valid && !result.inRange && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-orange-50 rounded-xl p-5"
          >
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-warm-900 font-[family-name:var(--font-heading)]">
                  We don&apos;t currently cover {result.location || 'your area'}
                </p>
                <p className="text-xs text-warm-500 mt-0.5">
                  {result.distance !== undefined
                    ? `That's ${result.distance} miles away — outside our 60-mile radius.`
                    : 'Outside our service area.'}
                </p>
              </div>
            </div>
            <div className="border-t border-orange-200 pt-4">
              <p className="text-sm text-warm-600 mb-3">Leave your email — we&apos;ll let you know when we expand.</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-lg border border-warm-200 bg-white text-sm"
                  placeholder="your@email.com"
                />
                <button
                  onClick={() => {
                    trackEvent('service_area_check', { action: 'notify_signup' });
                    alert('Thanks! We\'ll be in touch.');
                  }}
                  className="px-4 py-2.5 bg-orange-500 text-white font-semibold rounded-lg text-sm"
                >
                  Notify me
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Invalid */}
        {result && !result.valid && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 rounded-xl p-4 flex items-start gap-3"
          >
            <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{result.error}</p>
          </motion.div>
        )}
      </div>

      {result?.valid && result.inRange && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleContinue}
          whileTap={{ scale: 0.98 }}
          className="w-full mt-6 px-6 py-4 bg-orange-500 text-white font-semibold rounded-2xl hover:bg-orange-600 transition-colors text-base font-[family-name:var(--font-heading)] flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      )}
    </div>
  );
}
