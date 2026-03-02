'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Shield } from 'lucide-react';

interface ExitIntentPopupProps {
  show: boolean;
  onShow: () => void;
  onClose: () => void;
  onSubmit: (email: string, name?: string) => void;
}

/**
 * Exit-intent popup for desktop users on the Welcome screen.
 * Triggers when the mouse moves toward the top of the viewport (about to close tab).
 * Captures email so we can send a resume link if they leave.
 */
export default function ExitIntentPopup({ show, onShow, onClose, onSubmit }: ExitIntentPopupProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const triggered = useRef(false);
  const dismissed = useRef(false);

  const handleMouseLeave = useCallback(
    (e: MouseEvent) => {
      // Only trigger when mouse moves to top of viewport (exit intent)
      if (e.clientY <= 5 && !triggered.current && !dismissed.current) {
        // Check if already dismissed this session
        if (sessionStorage.getItem('pax_exit_dismissed')) return;
        triggered.current = true;
        onShow();
      }
    },
    [onShow]
  );

  useEffect(() => {
    // Only on desktop — mobile doesn't have mouse exit intent
    if (typeof window === 'undefined') return;
    if (window.innerWidth < 768) return;

    // Delay activation by 5 seconds so it doesn't fire immediately
    const timer = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
    }, 5000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseLeave]);

  const handleClose = () => {
    dismissed.current = true;
    sessionStorage.setItem('pax_exit_dismissed', '1');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email');
      return;
    }
    setSubmitted(true);
    sessionStorage.setItem('pax_exit_dismissed', '1');
    onSubmit(email.trim(), name.trim() || undefined);
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative">
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 text-warm-400 hover:text-warm-600 transition-colors rounded-full hover:bg-warm-50"
              >
                <X className="w-5 h-5" />
              </button>

              {submitted ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
                    We&apos;ll save your spot
                  </h3>
                  <p className="text-warm-500 text-sm">
                    Check your inbox — we&apos;ll send you a link to pick up where you left off.
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-7 h-7 text-orange-500" />
                    </div>
                    <h3 className="text-xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
                      Before you go...
                    </h3>
                    <p className="text-warm-500 text-sm">
                      Want us to save your progress? We&apos;ll email you a link so you can finish booking when you&apos;re ready.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name (optional)"
                        className="w-full px-4 py-3 rounded-xl border border-warm-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                        autoComplete="name"
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError('');
                        }}
                        placeholder="your@email.com"
                        className={`w-full px-4 py-3 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                          error ? 'border-red-300' : 'border-warm-200'
                        }`}
                        autoComplete="email"
                        autoFocus
                      />
                      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                    </div>
                    <button
                      type="submit"
                      className="w-full px-6 py-3.5 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-all text-sm font-[family-name:var(--font-heading)] shadow-lg shadow-orange-500/20"
                    >
                      Save my progress
                    </button>
                  </form>

                  <div className="flex items-center gap-2 mt-4 text-xs text-warm-400 justify-center">
                    <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                    No spam, ever. Just a link to resume your booking.
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
