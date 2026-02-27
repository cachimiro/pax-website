import Link from 'next/link';
import { Video, Ruler, Palette, Wrench, ArrowRight, Clock, MapPin, Shield, CheckCircle, Star } from 'lucide-react';
import PackagesSection from '@/components/PackagesSection';

import TestimonialCard from '@/components/TestimonialCard';
import SectionHeading from '@/components/SectionHeading';
import CTABanner from '@/components/CTABanner';
import ScrollReveal from '@/components/ScrollReveal';
import BeforeAfterSection from '@/components/BeforeAfterSection';
import ServiceAreaCheck from '@/components/ServiceAreaCheck';
import IdealClientSection from '@/components/IdealClientSection';
import WhatMakesUsDifferent from '@/components/WhatMakesUsDifferent';
import ObjectionHandler from '@/components/ObjectionHandler';
import HomeCoverageSection from '@/components/HomeCoverageSection';
import { HeroDesktopImages, HeroMobileBackground } from '@/components/HeroImageCarousel';
import AnimatedCounter from '@/components/AnimatedCounter';
import SectionDivider from '@/components/SectionDivider';

const packages = [
  {
    id: 'budget',
    name: 'Budget',
    tagline: 'Smart & Simple',
    bestFor: 'You want functional, good-looking storage without overspending',
    priceRange: 'From £800',
    priceLabel: 'Per wardrobe, fitted. Final price confirmed after consultation.',
    features: ['IKEA Pax system', 'Standard door finishes', 'Professional installation', 'Basic interior fittings'],
    leadTime: '1–2 weeks',
    finishLevel: 'Standard',
    ctaText: 'Get Started',
  },
  {
    id: 'paxbespoke',
    name: 'PaxBespoke',
    tagline: 'Best Value',
    bestFor: 'You want a custom look without the custom price tag',
    priceRange: 'From £1,500',
    priceLabel: 'Per wardrobe, fitted. Final price confirmed after consultation.',
    features: ['IKEA Pax system', 'Custom bespoke doors', 'Colour-matched trims', 'Premium interior layout', 'Soft-close upgrades'],
    leadTime: '2–3 weeks',
    finishLevel: 'Custom bespoke',
    popular: true,
    ctaText: 'Most Popular — Book Now',
  },
  {
    id: 'select',
    name: 'Select',
    tagline: 'Full Bespoke',
    bestFor: 'You want a fully bespoke, designer-level finish',
    priceRange: 'From £2,500',
    priceLabel: 'Per wardrobe, fitted. Final price confirmed after consultation.',
    features: ['IKEA Pax system', 'Premium bespoke doors & panels', 'Integrated lighting', 'Full custom interior', 'Designer handle options', 'End-to-end project management'],
    leadTime: '3–4 weeks',
    finishLevel: 'Premium bespoke',
    ctaText: 'Go Premium',
  },
];

const steps = [
  {
    step: 1,
    title: 'Free Video Consultation',
    description: 'Share your space over a quick video call. We\'ll recommend the right package and give you a clear price range.',
    why: 'A video call lets us see your space without you needing to take perfect measurements. It\'s faster and easier than an in-person visit.',
    duration: '20 minutes',
    youNeed: 'A phone or laptop. That\'s it.',
    icon: Video,
    reassurance: 'Rough measurements are fine — we guide you.',
  },
  {
    step: 2,
    title: 'Design & Quote',
    description: 'We create a detailed design and fixed-price quote based on your space, package choice, and finish preferences.',
    why: 'This step ensures there are no surprises. The price you see is the price you pay. The consultation refines — it doesn\'t inflate.',
    duration: '2–3 days after consultation',
    youNeed: 'Nothing — we do the work.',
    icon: Ruler,
    reassurance: 'You approve everything before we order.',
  },
  {
    step: 3,
    title: 'Choose Your Finish',
    description: 'Pick from our range of doors, handles, trims, and colours. We\'ll send samples if you want to see them in person.',
    why: 'Your wardrobe should match your room, not the other way around. We offer enough choice to get it right without overwhelming you.',
    duration: 'At your pace',
    youNeed: 'Just your preference — we\'ll guide options.',
    icon: Palette,
  },
  {
    step: 4,
    title: 'Expert Installation',
    description: 'Our team installs everything in 1–2 days. We handle all assembly, fitting, trimming, and cleanup.',
    why: 'Professional fitting is what makes IKEA Pax look bespoke. Precise trimming, gap-free alignment, and colour-matched finishing.',
    duration: '1–2 days on site',
    youNeed: 'Access to the room. We handle the rest.',
    icon: Wrench,
  },
];

const testimonials = [
  {
    quote: 'The video consultation was so easy. They walked me through everything and I knew exactly what to expect before committing. The installation was done in a day — couldn\'t believe it.',
    name: 'Sarah M.',
    location: 'Altrincham, Cheshire',
    packageUsed: 'PaxBespoke',
  },
  {
    quote: 'We wanted something that looked high-end but didn\'t cost a fortune. The PaxBespoke package was perfect — custom doors on IKEA frames, and you genuinely can\'t tell the difference.',
    name: 'James & Lucy T.',
    location: 'Didsbury, Manchester',
    packageUsed: 'PaxBespoke',
  },
  {
    quote: 'From consultation to installation in under two weeks. The Select finish is stunning — integrated lighting and everything. Worth every penny.',
    name: 'Priya K.',
    location: 'Woolton, Liverpool',
    packageUsed: 'Select',
  },
];

const trustStats = [
  { value: '500+', label: 'Wardrobes installed', icon: CheckCircle },
  { value: '5.0', label: 'Average rating', icon: Star },
  { value: '1–2', label: 'Days to install', icon: Clock },
  { value: 'Free', label: 'Design consultation', icon: Shield },
];

export default function Home() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        {/* Desktop: solid gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-900 via-green-700 to-green-900 hidden lg:block" />
        <div className="absolute inset-0 grain-overlay hidden lg:block" />

        {/* Mobile: rotating background images with overlay */}
        <HeroMobileBackground />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[calc(100vh-5rem)] py-16 md:py-20">
            {/* Left: Copy */}
            <div className="text-white">
              <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-orange-400 mb-6 font-[family-name:var(--font-heading)]">
                <span className="w-8 h-px bg-orange-400" />
                IKEA Pax Specialists
              </span>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 font-[family-name:var(--font-heading)] leading-[1.08]">
                IKEA Pax system.
                <br />
                <span className="font-[family-name:var(--font-accent)] italic text-orange-400">Bespoke</span> finish.
                <br />
                Fitted in days.
              </h1>

              <p className="text-base sm:text-lg text-green-100/80 mb-8 max-w-lg leading-relaxed">
                We take the world&apos;s best modular wardrobe system and add custom doors,
                trims, and finishes — so you get wardrobes that look fully bespoke,
                at a fraction of the price.
              </p>

              {/* Inline trust badges */}
              <div className="flex flex-wrap gap-x-5 gap-y-2 mb-8">
                {[
                  { icon: MapPin, text: 'UK-wide installation' },
                  { icon: Clock, text: 'Installed in 1–2 days' },
                  { icon: Shield, text: 'Free, no-obligation consultation' },
                ].map((badge) => (
                  <div key={badge.text} className="flex items-center gap-2 text-sm text-green-100/70">
                    <badge.icon className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <span>{badge.text}</span>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/book"
                  className="inline-flex items-center justify-center px-8 py-4 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-all duration-200 text-base font-[family-name:var(--font-heading)] shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  Book Free Design Consultation
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
                <Link
                  href="/packages"
                  className="inline-flex items-center justify-center px-8 py-4 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/10 transition-all duration-200 text-base font-[family-name:var(--font-heading)] active:scale-[0.98]"
                >
                  See Packages & Pricing
                </Link>
              </div>

              {/* Reassurance micro-copy */}
              <p className="text-xs text-green-100/50 mt-4 font-[family-name:var(--font-heading)]">
                20-min video call · No measurements needed · Get a clear price range — not a sales pitch
              </p>
            </div>

            {/* Right: Animated image grid (desktop only) */}
            <div className="hidden lg:block">
              <HeroDesktopImages />
            </div>
          </div>
        </div>
      </section>

      {/* ===== TRUST STATS ===== */}
      <section className="bg-white border-b border-warm-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {trustStats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center flex-shrink-0">
                  <stat.icon className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <AnimatedCounter value={stat.value} />
                  <p className="text-xs text-warm-500 mt-0.5">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ===== WHAT MAKES US DIFFERENT ===== */}
      <WhatMakesUsDifferent />

      <SectionDivider flip />

      {/* ===== IDEAL CLIENT ===== */}
      <IdealClientSection />

      {/* ===== HOW IT WORKS ===== */}
      <section className="section-padding bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <SectionHeading
              label="How It Works"
              title="From idea to installed in 4 clear steps"
              description="Every step exists for a reason. No surprises, no jargon, no wasted time."
            />
          </ScrollReveal>

          {/* Timeline layout */}
          <div className="max-w-3xl mx-auto space-y-0">
            {steps.map((step, i) => (
              <ScrollReveal key={step.step} delay={i * 0.1}>
                <div className="relative flex gap-6 pb-10 last:pb-0">
                  {/* Timeline line + dot */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-orange-500 text-white text-sm font-bold flex items-center justify-center font-[family-name:var(--font-heading)] shadow-md shadow-orange-500/30 z-10">
                      {step.step}
                    </div>
                    {i < steps.length - 1 && (
                      <div className="w-px flex-1 bg-gradient-to-b from-orange-300 to-warm-200 mt-2" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="pb-2 flex-1">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="text-lg font-bold text-warm-900 font-[family-name:var(--font-heading)]">
                        {step.title}
                      </h3>
                      <span className="text-xs font-medium text-warm-500 bg-warm-50 px-2.5 py-1 rounded-full whitespace-nowrap font-[family-name:var(--font-heading)] flex-shrink-0">
                        {step.duration}
                      </span>
                    </div>
                    <p className="text-sm text-warm-700 leading-relaxed mb-3">
                      {step.description}
                    </p>

                    {/* Why this step */}
                    <div className="bg-green-50 rounded-xl p-4 mb-3">
                      <p className="text-xs font-semibold text-green-800 mb-1 font-[family-name:var(--font-heading)]">Why this step?</p>
                      <p className="text-sm text-green-700 leading-relaxed">{step.why}</p>
                    </div>

                    {/* What you need */}
                    <div className="flex items-center gap-2 text-xs text-warm-500">
                      <span className="font-semibold text-warm-600 font-[family-name:var(--font-heading)]">What you need:</span>
                      {step.youNeed}
                    </div>

                    {step.reassurance && (
                      <p className="text-xs text-orange-600 font-medium mt-2 bg-orange-50 inline-block px-3 py-1 rounded-lg">
                        {step.reassurance}
                      </p>
                    )}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delay={0.3}>
            <div className="mt-10 text-center">
              <Link
                href="/how-it-works"
                className="inline-flex items-center text-sm font-semibold text-green-700 hover:text-green-900 transition-colors font-[family-name:var(--font-heading)]"
              >
                See the full process in detail
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== PACKAGES ===== */}
      <PackagesSection packages={packages} />

      {/* ===== OBJECTION HANDLING ===== */}
      <ObjectionHandler />

      <SectionDivider />

      {/* ===== BEFORE / AFTER ===== */}
      <BeforeAfterSection />

      {/* ===== SOCIAL PROOF ===== */}
      <section className="section-padding bg-warm-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <SectionHeading
              label="What Our Customers Say"
              title="Trusted by homeowners across the UK"
            />
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <ScrollReveal key={t.name} delay={i * 0.1}>
                <TestimonialCard {...t} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COVERAGE MAP ===== */}
      <HomeCoverageSection />

      {/* ===== SERVICE AREA CHECK ===== */}
      <ServiceAreaCheck />

      {/* ===== CTA BANNER ===== */}
      <CTABanner />
    </>
  );
}
