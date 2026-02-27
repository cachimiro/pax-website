'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Instagram, Facebook, Phone, Mail, MapPin, ChevronDown } from 'lucide-react';

const footerLinks = {
  services: [
    { href: '/packages', label: 'Our Packages' },
    { href: '/packages#budget', label: 'Budget Package' },
    { href: '/packages#paxbespoke', label: 'PaxBespoke Package' },
    { href: '/packages#select', label: 'Select Package' },
    { href: '/finishes', label: 'Finishes & Options' },
  ],
  company: [
    { href: '/about', label: 'About Us' },
    { href: '/projects', label: 'Our Projects' },
    { href: '/how-it-works', label: 'How It Works' },
    { href: '/service-areas', label: 'Service Areas' },
    { href: '/faq', label: 'FAQ' },
  ],
  support: [
    { href: '/book', label: 'Book Consultation' },
    { href: '/faq#pricing', label: 'Pricing Questions' },
    { href: '/faq#measuring', label: 'Measuring Guide' },
    { href: '/faq#installation', label: 'Installation Info' },
  ],
};

function FooterAccordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-warm-800 md:border-0">
      {/* Mobile: accordion toggle */}
      <button
        className="md:hidden w-full flex items-center justify-between py-4 text-left"
        onClick={() => setOpen(!open)}
      >
        <h4 className="text-white font-semibold text-sm font-[family-name:var(--font-heading)]">{title}</h4>
        <ChevronDown className={`w-4 h-4 text-warm-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {/* Mobile: collapsible content */}
      <div className={`md:hidden overflow-hidden transition-all duration-200 ${open ? 'max-h-60 pb-4' : 'max-h-0'}`}>
        {children}
      </div>
      {/* Desktop: always visible */}
      <div className="hidden md:block">
        <h4 className="text-white font-semibold text-sm mb-4 font-[family-name:var(--font-heading)]">{title}</h4>
        {children}
      </div>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="bg-warm-900 text-warm-300 pb-20 lg:pb-0">
      {/* Top accent line */}
      <div className="h-1 bg-gradient-to-r from-green-700 via-orange-500 to-green-700" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 md:gap-10">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Image
              src="/images/logo-full.png"
              alt="PaxBespoke"
              width={160}
              height={42}
              className="h-10 brightness-0 invert mb-4"
              style={{ width: 'auto' }}
            />
            <p className="text-warm-300 text-sm leading-relaxed max-w-sm mb-6">
              IKEA Pax wardrobe specialists. Custom finishes, expert fitting
              completed in 1–2 days on site. Serving homes across the UK.
            </p>
            <div className="space-y-2.5 text-sm">
              <a href="tel:+447000000000" className="flex items-center gap-2.5 hover:text-white transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-warm-800 group-hover:bg-green-700 flex items-center justify-center transition-colors">
                  <Phone className="w-3.5 h-3.5 text-green-500 group-hover:text-white" />
                </div>
                07000 000 000
              </a>
              <a href="mailto:hello@paxbespoke.uk" className="flex items-center gap-2.5 hover:text-white transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-warm-800 group-hover:bg-green-700 flex items-center justify-center transition-colors">
                  <Mail className="w-3.5 h-3.5 text-green-500 group-hover:text-white" />
                </div>
                hello@paxbespoke.uk
              </a>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-warm-800 flex items-center justify-center">
                  <MapPin className="w-3.5 h-3.5 text-green-500" />
                </div>
                UK-wide installation
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <a
                href="https://instagram.com/paxbespoke"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-warm-800 hover:bg-orange-500 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5 sm:w-4 sm:h-4" />
              </a>
              <a
                href="https://facebook.com/paxbespoke"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-warm-800 hover:bg-orange-500 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5 sm:w-4 sm:h-4" />
              </a>
            </div>
          </div>

          {/* Link columns — accordion on mobile, static on desktop */}
          <FooterAccordion title="Services">
            <ul className="space-y-2.5">
              {footerLinks.services.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </FooterAccordion>

          <FooterAccordion title="Company">
            <ul className="space-y-2.5">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </FooterAccordion>

          <FooterAccordion title="Support">
            <ul className="space-y-2.5">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </FooterAccordion>
        </div>

        <div className="mt-10 md:mt-12 pt-8 border-t border-warm-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-warm-500">
          <p>&copy; {new Date().getFullYear()} PaxBespoke. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
