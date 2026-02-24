import Link from 'next/link';
import Image from 'next/image';
import { Instagram, Facebook, Phone, Mail, MapPin } from 'lucide-react';

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

export default function Footer() {
  return (
    <footer className="bg-warm-900 text-warm-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Image
              src="/images/logo-full.png"
              alt="PaxBespoke"
              width={160}
              height={42}
              className="h-10 w-auto brightness-0 invert mb-4"
            />
            <p className="text-warm-300 text-sm leading-relaxed max-w-sm mb-6">
              IKEA Pax wardrobe specialists. Custom finishes, expert installation,
              delivered in 1–2 days. Serving homes within 50 miles of Warrington, UK.
            </p>
            <div className="space-y-2 text-sm">
              <a href="tel:+447000000000" className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone className="w-4 h-4 text-green-500" />
                07000 000 000
              </a>
              <a href="mailto:hello@paxbespoke.uk" className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail className="w-4 h-4 text-green-500" />
                hello@paxbespoke.uk
              </a>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-500" />
                Warrington &amp; North West (50-mile radius)
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <a
                href="https://instagram.com/paxbespoke"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-warm-800 hover:bg-green-700 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com/paxbespoke"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-warm-800 hover:bg-green-700 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 font-[family-name:var(--font-heading)]">Services</h4>
            <ul className="space-y-2">
              {footerLinks.services.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4 font-[family-name:var(--font-heading)]">Company</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4 font-[family-name:var(--font-heading)]">Support</h4>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-warm-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-warm-500">
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
