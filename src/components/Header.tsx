'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Menu, X, Phone, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { trackEvent } from '@/lib/analytics';

const navLinks = [
  { href: '/packages', label: 'Packages' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/projects', label: 'Projects' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
];

const secondaryLinks = [
  { href: '/finishes', label: 'Finishes' },
  { href: '/service-areas', label: 'Service Areas' },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-lg shadow-sm border-b border-warm-100'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[60px] md:h-20">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0 relative z-[60]">
              <Image
                src="/images/logo-full.png"
                alt="PaxBespoke Custom Wardrobes"
                width={180}
                height={48}
                className="h-9 md:h-12"
                style={{ width: 'auto' }}
                priority
              />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 text-sm font-medium transition-colors font-[family-name:var(--font-heading)] ${
                    scrolled
                      ? 'text-warm-700 hover:text-green-700'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-3">
              <a
                href="https://wa.me/447000000000"
                className={`flex items-center gap-1.5 text-sm transition-colors ${
                  scrolled ? 'text-warm-500 hover:text-green-700' : 'text-white/60 hover:text-white'
                }`}
                onClick={() => trackEvent('whatsapp_click')}
              >
                <Phone className="w-4 h-4" />
                <span className="font-[family-name:var(--font-heading)] font-medium">WhatsApp</span>
              </a>
              <Link
                href="/book"
                className="inline-flex items-center px-5 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-all duration-200 font-[family-name:var(--font-heading)] shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30"
                onClick={() => trackEvent('cta_click', { location: 'header' })}
              >
                Book Free Consultation
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              className={`lg:hidden p-2 relative z-[60] ${mobileOpen ? 'text-warm-700' : scrolled ? 'text-warm-700' : 'text-white'}`}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Full-screen mobile menu overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-[55] lg:hidden bg-white"
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {/* Top accent line */}
            <div className="h-0.5 bg-gradient-to-r from-green-700 via-orange-500 to-green-700" />

            <div className="flex flex-col h-full pt-[60px]">
              {/* Nav links */}
              <nav className="flex-1 flex flex-col justify-center px-8 -mt-16">
                <div className="space-y-1">
                  {navLinks.map((link, i) => (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
                    >
                      <Link
                        href={link.href}
                        className="block py-3 text-xl font-semibold text-warm-800 hover:text-green-700 transition-colors font-[family-name:var(--font-heading)] active:scale-[0.98]"
                        onClick={() => setMobileOpen(false)}
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  ))}
                </div>

                {/* Secondary links */}
                <motion.div
                  className="flex gap-4 mt-6 pt-6 border-t border-warm-100"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                >
                  {secondaryLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-sm text-warm-500 hover:text-green-700 transition-colors font-[family-name:var(--font-heading)]"
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </motion.div>
              </nav>

              {/* Bottom CTAs — pinned */}
              <motion.div
                className="px-8 pb-[max(2rem,env(safe-area-inset-bottom))] space-y-3 border-t border-warm-100 pt-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                <Link
                  href="/book"
                  className="flex items-center justify-center w-full px-5 py-3.5 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors font-[family-name:var(--font-heading)] text-base shadow-lg shadow-orange-500/20 active:scale-[0.98]"
                  onClick={() => {
                    setMobileOpen(false);
                    trackEvent('cta_click', { location: 'mobile_menu' });
                  }}
                >
                  Book Free Consultation
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
                <a
                  href="https://wa.me/447000000000"
                  className="flex items-center justify-center w-full px-5 py-3.5 border border-warm-200 text-warm-700 font-medium rounded-xl hover:bg-warm-50 transition-colors font-[family-name:var(--font-heading)] text-sm active:scale-[0.98]"
                  onClick={() => trackEvent('whatsapp_click')}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  WhatsApp Us
                </a>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
