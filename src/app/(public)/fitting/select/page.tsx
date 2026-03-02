'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar, Check, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

/**
 * Client-facing fitting date selection page.
 *
 * Accessed via email CTA link: /fitting/select?token=<signed_token>
 *
 * Shows the proposed fitting dates and lets the client pick one.
 * After selection, redirects to deposit payment (Stripe checkout).
 */

interface FittingData {
  proposed_dates: string[];
  opportunity_id: string;
  client_name: string;
  deposit_amount: string;
}

export default function FittingSelectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-warm-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    }>
      <FittingSelectInner />
    </Suspense>
  );
}

function FittingSelectInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<FittingData | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid link');
      setLoading(false);
      return;
    }

    fetch(`/api/fitting/select?token=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Link expired or invalid'))))
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [token]);

  const handleConfirm = async () => {
    if (!selectedDate || !data) return;
    setConfirming(true);

    try {
      const res = await fetch('/api/fitting/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          confirmed_date: selectedDate,
        }),
      });

      if (!res.ok) throw new Error('Failed to confirm');

      const result = await res.json();

      // If there's a payment URL, redirect to Stripe
      if (result.payment_url) {
        window.location.href = result.payment_url;
        return;
      }

      setConfirmed(true);
    } catch {
      setError('Something went wrong. Please try again or contact us.');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-50 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-lg p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
            {error || 'Something went wrong'}
          </h1>
          <p className="text-warm-500 text-sm mb-6">
            This link may have expired. Please contact us for assistance.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-all text-sm"
          >
            Go to PaxBespoke
          </Link>
        </div>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-50 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
            Date confirmed!
          </h1>
          <p className="text-warm-500 text-sm mb-2">
            Your fitting is booked for{' '}
            <strong>
              {new Date(selectedDate!).toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </strong>
          </p>
          <p className="text-warm-400 text-xs">
            We&apos;ll send you a confirmation email with all the details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-50 px-4 py-12">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-7 h-7 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-warm-900 font-[family-name:var(--font-heading)]">
            Choose your fitting date
          </h1>
          <p className="text-warm-500 text-sm mt-2">
            Hi {data.client_name.split(' ')[0]}, select your preferred fitting date below.
          </p>
        </div>

        <div className="space-y-3 mb-8">
          {data.proposed_dates.map((dateStr) => {
            const date = new Date(dateStr);
            const isSelected = selectedDate === dateStr;
            return (
              <motion.button
                key={dateStr}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setSelectedDate(dateStr)}
                className={`w-full p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50 shadow-md'
                    : 'border-warm-100 bg-white hover:border-warm-200'
                }`}
              >
                <div>
                  <p className="font-semibold text-warm-900">
                    {date.toLocaleDateString('en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </p>
                  <p className="text-sm text-warm-500">
                    {date.toLocaleDateString('en-GB', { year: 'numeric' })}
                  </p>
                </div>
                {isSelected && (
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {data.deposit_amount && (
          <p className="text-center text-sm text-warm-500 mb-4">
            A deposit of <strong>{data.deposit_amount}</strong> is required to secure your date.
          </p>
        )}

        <button
          onClick={handleConfirm}
          disabled={!selectedDate || confirming}
          className={`w-full px-6 py-4 rounded-2xl font-semibold text-white transition-all font-[family-name:var(--font-heading)] ${
            selectedDate
              ? 'bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20'
              : 'bg-warm-200 cursor-not-allowed'
          }`}
        >
          {confirming ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          ) : (
            `Confirm & pay deposit`
          )}
        </button>
      </div>
    </div>
  );
}
