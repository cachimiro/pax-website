import Link from 'next/link';
import { Video, Ruler, Palette, Wrench, ArrowRight, Clock, MapPin, Shield, CheckCircle, Star } from 'lucide-react';
import PackagesSection from '@/components/PackagesSection';

import TestimonialCard from '@/components/TestimonialCard';
import SectionHeading from '@/components/SectionHeading';
import CTABanner from '@/components/CTABanner';
import ScrollReveal from '@/components/ScrollReveal';
import BeforeAfterSection from '@/components/BeforeAfterSection';
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
    bestFor: 'A reasonably priced alternative to traditional fitted wardrobes. Standard IKEA PAX doors, boxed in with filler panels. You provide measurements and purchase the IKEA items — we handle the fitting.',
    priceRange: 'From £800',
    priceLabel: 'Per wardrobe, fitted. Final price confirmed after consultation.',
    features: ['Standard IKEA PAX doors', 'Filler panels fitted', 'Assembly & securing to wall', 'PAX interior system'],
    leadTime: '1–2 weeks',
    finishLevel: 'Standard',
    ctaText: 'Get Started',
  },
  {
    id: 'paxbespoke',
    name: 'PaxBespoke',
    tagline: 'Where Pax Meets Bespoke',
    bestFor: 'A high-quality built-in finish at a sensible budget. Doors customised within the IKEA/PAX ecosystem, colour-matched trims, flush filler panels, and skirting board finish. We supply everything.',
    priceRange: 'From £1,500',
    priceLabel: 'Per wardrobe, fitted. Final price confirmed after consultation.',
    features: ['Doors within IKEA/PAX range', 'Custom trim colours', 'Flush filler panels', 'Skirting board finish', 'Design consultation', 'Rubbish removal'],
    leadTime: '2–3 weeks',
    finishLevel: 'Custom fitted',
    ctaText: 'Get Started',
  },
  {
    id: 'select',
    name: 'Select',
    tagline: 'Designed Without Limits',
    bestFor: 'The most premium finishes and styling options. Bespoke doors (spray-painted or vinyl), more freedom on colour and door styles, and little to no restrictions within the PAX system.',
    priceRange: 'From £2,500',
    priceLabel: 'Per wardrobe, fitted. Final price confirmed after consultation.',
    features: ['Everything in PaxBespoke', 'Bespoke doors (spray-painted or vinyl)', 'Full wall integration', 'Sliding door systems', 'Floor-to-ceiling builds', 'Advanced carpentry'],
    leadTime: '3–4 weeks',
    finishLevel: 'Full bespoke',
    popular: true,
    ctaText: 'Recommended — Get Started',
  },
];

const steps = [
  {
    step: 1,
    title: 'Free Video Consultation',
    description: 'Share your space over a quick video call. We\'ll recommend the right package and give you a clear price range.',
    why: 'A video call lets us see your space without you needing to take perfect measurements. It\'s faster and easier than an in-person visit.',
    duration: '15–45 minutes',
    youNeed: 'A phone or laptop. That\'s it.',
    icon: Video,
    reassurance: 'Rough measurements are fine — we guide you.',
  },
  {
    step: 2,
    title: 'Design & Quote',
    description: 'Budget: we review your IKEA Planner design and quote on the call. PaxBespoke & Select: we create a 3D design live and agree the layout together.',
    why: 'You approve everything before we proceed. To secure a fitting slot, you pay a 50% deposit.',
    duration: 'During or shortly after the call',
    youNeed: 'Budget: your IKEA Planner link. PaxBespoke & Select: nothing — we do the work.',
    icon: Ruler,
    reassurance: 'You approve everything before we proceed.',
  },
  {
    step: 3,
    title: 'Preparation',
    description: 'Budget: you order the IKEA items yourself and let us know when they arrive. PaxBespoke & Select: we prepare the full IKEA setup, doors, trims, and all materials.',
    why: 'On PaxBespoke and Select, we handle everything so you don\'t have to. On Budget, you stay in control of ordering to keep costs down.',
    duration: 'Varies by package',
    youNeed: 'Budget: order and check your IKEA items. PaxBespoke & Select: nothing.',
    icon: Palette,
  },
  {
    step: 4,
    title: 'Fitting Day',
    description: 'Our team arrives, installs the wardrobes, and reviews the result with you. Budget: typically half a day to one day. PaxBespoke & Select: typically 1–2 days on site.',
    why: 'Professional fitting is what makes IKEA Pax look built-in. PaxBespoke & Select include rubbish removal and cleanup.',
    duration: 'Half a day to 2 days',
    youNeed: 'Access to the room — we handle the rest.',
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
    quote: 'From consultation to installation in under two weeks. The Select finish is stunning — sliding doors, floor-to-ceiling, everything integrated perfectly. Worth every penny.',
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[85vh] lg:min-h-[calc(100vh-5rem)] py-12 md:py-20">
            {/* Left: Copy */}
            <div className="text-white">
              <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-orange-400 mb-6 font-[family-name:var(--font-heading)]">
                <span className="w-8 h-px bg-orange-400" />
                IKEA Pax Specialists
              </span>

              <h1 className="text-[26px] sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 font-[family-name:var(--font-heading)] leading-[1.08]">
                IKEA Pax system.
                <br />
                <span className="font-[family-name:var(--font-accent)] italic text-orange-400">Bespoke</span> finish.
                <br />
                Fitted in days.
              </h1>

              <p className="text-sm sm:text-base md:text-lg text-green-100/80 mb-8 max-w-lg leading-relaxed">
                Three packages for every budget. From simple built-in storage to fully
                bespoke wardrobes with custom doors, trims, and finishes — we have a
                solution that fits your space and your price point.
              </p>

              {/* Inline trust badges */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-y-1.5 sm:gap-x-5 sm:gap-y-2 mb-8">
                {[
                  { icon: MapPin, text: 'UK-wide installation' },
                  { icon: Clock, text: 'Fitted in just 1–2 days on site' },
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
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-all duration-200 text-base font-[family-name:var(--font-heading)] shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 active:scale-[0.97]"
                >
                  Book Free Design Consultation
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
                <Link
                  href="#packages"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/10 transition-all duration-200 text-base font-[family-name:var(--font-heading)] active:scale-[0.97]"
                >
                  Choose Your Package
                </Link>
              </div>

              {/* Reassurance micro-copy */}
              <p className="text-xs text-green-100/50 mt-4 font-[family-name:var(--font-heading)]">
                15–45 min video call · No exact measurements needed · Get a clear price range — not a sales pitch
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-8">
            {trustStats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center flex-shrink-0">
                  <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" />
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

      {/* ===== PACKAGES (first real content — let them choose) ===== */}
      <PackagesSection packages={packages} />

      {/* ===== UNIVERSAL PAX BENEFIT ===== */}
      <section className="bg-green-50/50 border-y border-green-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
          <p className="text-sm sm:text-base text-green-900 font-medium font-[family-name:var(--font-heading)]">
            All packages use the IKEA PAX interior system — drawers, trays, and organisers can be changed at any time, unlike most traditional fitted wardrobes.
          </p>
        </div>
      </section>

      <SectionDivider />

      {/* ===== WHAT MAKES US DIFFERENT ===== */}
      <WhatMakesUsDifferent />

      <SectionDivider flip />

      {/* ===== BEFORE / AFTER ===== */}
      <BeforeAfterSection />

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
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4 mb-2">
                      <h3 className="text-lg font-bold text-warm-900 font-[family-name:var(--font-heading)]">
                        {step.title}
                      </h3>
                      <span className="text-xs font-medium text-warm-500 bg-warm-50 px-2.5 py-1 rounded-full whitespace-nowrap font-[family-name:var(--font-heading)] flex-shrink-0 self-start">
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

      {/* ===== IDEAL CLIENT ===== */}
      <IdealClientSection />

      {/* ===== OBJECTION HANDLING ===== */}
      <ObjectionHandler />

      <SectionDivider />

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

      {/* ===== COVERAGE MAP + POSTCODE CHECK ===== */}
      <HomeCoverageSection />

      {/* ===== CTA BANNER ===== */}
      <CTABanner />
    </>
  );
}
