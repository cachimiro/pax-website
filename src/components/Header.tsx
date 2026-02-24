'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Menu, X, Phone } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

const navLinks = [
  { href: '/packages', label: 'Packages' },
  { href: '/projects', label: 'Projects' },
  { href: '/finishes', label: 'Finishes' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/service-areas', label: 'Service Areas' },
  { href: '/faq', label: 'FAQ' },
  { href: '/about', label: 'About' },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-warm-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/images/logo-full.png"
              alt="PaxBespoke Custom Wardrobes"
              width={180}
              height={48}
              className="h-10 md:h-12 w-auto"
              priority
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm font-medium text-warm-700 hover:text-green-700 transition-colors font-[family-name:var(--font-heading)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <a
              href="https://wa.me/447000000000"
              className="flex items-center gap-1.5 text-sm text-warm-500 hover:text-green-700 transition-colors"
              onClick={() => trackEvent('whatsapp_click')}
            >
              <Phone className="w-4 h-4" />
              <span className="font-[family-name:var(--font-heading)] font-medium">WhatsApp</span>
            </a>
            <Link
              href="/book"
              className="inline-flex items-center px-5 py-2.5 bg-green-700 text-white text-sm font-semibold rounded-lg hover:bg-green-900 transition-colors font-[family-name:var(--font-heading)]"
              onClick={() => trackEvent('cta_click', { location: 'header' })}
            >
              Book Free Consultation
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="lg:hidden p-2 text-warm-700"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-warm-100 animate-fade-in-up">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-3 py-2.5 text-base font-medium text-warm-700 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors font-[family-name:var(--font-heading)]"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-warm-100 space-y-2">
              <Link
                href="/book"
                className="block w-full text-center px-5 py-3 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-900 transition-colors font-[family-name:var(--font-heading)]"
                onClick={() => {
                  setMobileOpen(false);
                  trackEvent('cta_click', { location: 'mobile_menu' });
                }}
              >
                Book Free Consultation
              </Link>
              <a
                href="https://wa.me/447000000000"
                className="block w-full text-center px-5 py-3 border border-warm-200 text-warm-700 font-medium rounded-lg hover:bg-warm-50 transition-colors font-[family-name:var(--font-heading)]"
                onClick={() => trackEvent('whatsapp_click')}
              >
                WhatsApp Us
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
