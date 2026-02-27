import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import ScrollReveal from './ScrollReveal';

const packageFit = [
  {
    name: 'Budget',
    color: '#f28c43',
    borderClass: 'border-[#f28c43]/20',
    bgClass: 'bg-[#f28c43]/5',
    tagClass: 'bg-[#f28c43]/10 text-[#f28c43]',
    ctaClass: 'text-[#f28c43] hover:text-[#e07c33]',
    headline: 'You need practical storage at the best price',
    description: 'A reasonably priced alternative to traditional fitted wardrobes. Standard IKEA PAX doors, boxed in with filler panels. You provide measurements and purchase the IKEA items — we handle the fitting. The PAX interior is easy to change later.',
    ideal: [
      'Furnishing a rental or spare room',
      'Working to a strict budget',
      'Function matters more than finish',
    ],
  },
  {
    name: 'PaxBespoke',
    color: '#f28c43',
    borderClass: 'border-warm-200',
    bgClass: 'bg-gradient-to-br from-[#f28c43]/5 to-[#2d5c37]/5',
    tagClass: 'bg-gradient-to-r from-[#f28c43] to-[#2d5c37] text-white',
    ctaClass: 'text-[#f28c43] hover:text-[#e07c33]',
    headline: 'You want a high-quality built-in finish at a sensible budget',
    description: 'Doors customised within the IKEA/PAX ecosystem, colour-matched trims, flush fillers, and a skirting board finish. The wardrobe looks fully fitted. The PAX interior is easy to change later.',
    ideal: [
      'Renovating or moving into a new home',
      'You\u0027ve priced traditional fitted wardrobes and want a similar finish for less',
      'You care about the finish, not just the function',
    ],
  },
  {
    name: 'Select',
    color: '#2d5c37',
    borderClass: 'border-[#2d5c37]/30 ring-1 ring-[#2d5c37]/10',
    bgClass: 'bg-[#2d5c37]/5',
    tagClass: 'bg-[#2d5c37] text-white',
    ctaClass: 'text-[#2d5c37] hover:text-[#234a2c]',
    headline: 'You want the most premium finishes with little to no restrictions',
    description: 'Bespoke doors (spray-painted or vinyl), a broader choice of styles, colours, and finishes. Full wall integration, sliding doors, and advanced carpentry are all available. The PAX interior is easy to change later.',
    ideal: [
      'You want spray-painted or vinyl doors in any colour or style',
      'Non-standard or complex room shapes',
      'You want the absolute highest level of customisation',
    ],
    recommended: true,
  },
];

export default function IdealClientSection() {
  return (
    <section className="section-padding bg-warm-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-orange-500 mb-3 font-[family-name:var(--font-heading)]">
              <span className="w-6 h-px bg-orange-400" />
              A Package for Every Home
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-warm-900 font-[family-name:var(--font-heading)] mb-3">
              Whatever you need, we&apos;ve got you covered
            </h2>
            <p className="text-lg text-warm-500 max-w-2xl mx-auto">
              Three packages, three price points — each designed for a different type of project. There&apos;s no wrong choice.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {packageFit.map((pkg, i) => (
            <ScrollReveal key={pkg.name} delay={i * 0.1}>
              <div className={`relative bg-white rounded-2xl border p-6 h-full flex flex-col ${pkg.borderClass}`}>
                {pkg.recommended && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-[#2d5c37] text-white px-3 py-1 rounded-full font-[family-name:var(--font-heading)]">
                    Most customers choose this
                  </span>
                )}

                <span className={`inline-block self-start text-[10px] font-bold px-2.5 py-1 rounded-full mb-4 font-[family-name:var(--font-heading)] ${pkg.tagClass}`}>
                  {pkg.name}
                </span>

                <h3 className="text-base font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)] leading-snug">
                  {pkg.headline}
                </h3>

                <p className="text-sm text-warm-600 leading-relaxed mb-5 flex-1">
                  {pkg.description}
                </p>

                <div className={`rounded-xl p-4 mb-4 ${pkg.bgClass}`}>
                  <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-2 font-[family-name:var(--font-heading)]">
                    Ideal if you&apos;re...
                  </p>
                  <ul className="space-y-1.5">
                    {pkg.ideal.map((item) => (
                      <li key={item} className="text-xs text-warm-700 leading-relaxed">
                        — {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href={`/book?package=${pkg.name.toLowerCase()}`}
                  className={`inline-flex items-center text-sm font-semibold transition-colors font-[family-name:var(--font-heading)] ${pkg.ctaClass}`}
                >
                  Book a free consultation
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
