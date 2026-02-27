import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Award, Users, Zap, Heart } from 'lucide-react';
import SectionHeading from '@/components/SectionHeading';
import TestimonialCard from '@/components/TestimonialCard';
import CTABanner from '@/components/CTABanner';

export const metadata: Metadata = {
  title: 'About',
  description: 'PaxBespoke: IKEA Pax wardrobe specialists. Learn about our team, process, and why we\'re the smarter choice for custom wardrobes.',
};

const values = [
  {
    icon: Zap,
    title: 'Speed without shortcuts',
    description: 'IKEA Pax gives us precision-engineered frames. We add the custom finish. The result: wardrobes that look fully bespoke, installed in days not weeks.',
  },
  {
    icon: Heart,
    title: 'Honest guidance',
    description: 'We\'ll always recommend the package that genuinely suits your needs and budget. If Budget is the right call, we\'ll say so.',
  },
  {
    icon: Award,
    title: 'Craft in the details',
    description: 'The magic is in the finish: colour-matched trims, soft-close mechanisms, integrated lighting. We obsess over the details so you don\'t have to.',
  },
  {
    icon: Users,
    title: 'Your home, respected',
    description: 'We protect your floors, clean up after ourselves, and treat your home the way we\'d want ours treated. Every time.',
  },
];

const stats = [
  { value: '500+', label: 'Wardrobes installed' },
  { value: '5.0', label: 'Average review rating' },
  { value: '1–2', label: 'Days to install' },
  { value: '100%', label: 'Transparent pricing' },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="section-padding bg-warm-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block text-xs font-semibold tracking-widest uppercase text-orange-500 mb-4 font-[family-name:var(--font-heading)]">
                About PaxBespoke
              </span>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-warm-900 mb-6 font-[family-name:var(--font-heading)] leading-[1.1]">
                The smarter way to get custom wardrobes
              </h1>
              <p className="text-lg text-warm-500 leading-relaxed mb-6">
                We started PaxBespoke because we saw a gap: people wanted wardrobes that looked
                fully bespoke but couldn&apos;t justify the price. Traditional fitted wardrobes cost
                thousands and take weeks. IKEA Pax on its own looks... like IKEA.
              </p>
              <p className="text-lg text-warm-700 leading-relaxed mb-4">
                Our solution: take the precision engineering of IKEA Pax and add genuinely custom
                finishes — doors customised within the IKEA/PAX ecosystem or fully bespoke spray-painted and vinyl doors, colour-matched trims, premium handles, and integrated lighting.
                The result looks and feels fully fitted, at a fraction of the cost, with fitting completed in just 1–2 days on site.
              </p>
              <p className="text-base text-green-800 bg-green-50 rounded-xl px-4 py-3 mb-8">
                The PAX interior is easy to change later — drawers, trays, and organisers can be swapped at any time, unlike most traditional fitted wardrobes.
              </p>
              <Link
                href="/how-it-works"
                className="inline-flex items-center text-sm font-semibold text-green-700 hover:text-green-900 transition-colors font-[family-name:var(--font-heading)]"
              >
                See how it works
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
            <div className="rounded-2xl overflow-hidden aspect-[4/3]">
              <Image
                src="/images/paxbespoke-package/products/paxbespoke-high-ceiling-l-shaped.jpeg"
                alt="Floor-to-ceiling PaxBespoke wardrobe installation"
                width={800}
                height={600}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-green-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-1 font-[family-name:var(--font-heading)]">
                  {stat.value}
                </div>
                <div className="text-sm text-green-200">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-padding bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            label="What We Stand For"
            title="Why customers choose PaxBespoke"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 lg:gap-12">
            {values.map((value) => (
              <div key={value.title} className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center flex-shrink-0">
                  <value.icon className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
                    {value.title}
                  </h3>
                  <p className="text-sm text-warm-500 leading-relaxed">{value.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="section-padding bg-warm-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <TestimonialCard
            quote="We got quotes from three traditional fitted wardrobe companies — all over £5,000. PaxBespoke delivered a better-looking result for less than half the price. The IKEA Pax system are rock solid and the custom doors are beautiful. Genuinely can't recommend them enough."
            name="David & Claire H."
            location="Knutsford, Cheshire"
            packageUsed="PaxBespoke"
          />
        </div>
      </section>

      <CTABanner
        title="Ready to see what we can do for your space?"
        description="Book a free video consultation. No obligation, no hard sell — just honest guidance."
      />
    </>
  );
}
