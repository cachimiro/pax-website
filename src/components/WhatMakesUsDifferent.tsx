import Image from 'next/image';
import ScrollReveal from './ScrollReveal';

const comparison = [
  {
    label: 'Standard IKEA Pax',
    price: 'From ~£300',
    description: 'Self-assembled. Standard doors. Visible gaps and joins. Looks like flat-pack furniture.',
    image: '/images/stock/before-1.jpg',
    tier: 'basic' as const,
  },
  {
    label: 'PaxBespoke',
    price: 'From £800 fitted',
    description: 'Same precision frames. Custom bespoke doors, colour-matched trims, professional installation. Looks fully built-in.',
    image: '/images/stock/after-1.jpg',
    tier: 'ours' as const,
    highlight: true,
  },
  {
    label: 'Traditional Fitted',
    price: 'From £3,000+',
    description: 'Fully custom carcasses and doors. Longer lead times. Premium price for a similar visual result.',
    image: '/images/stock/project-5.jpg',
    tier: 'premium' as const,
  },
];

export default function WhatMakesUsDifferent() {
  return (
    <section className="section-padding bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-4">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-orange-500 mb-3 font-[family-name:var(--font-heading)]">
              <span className="w-6 h-px bg-orange-400" />
              The PaxBespoke Advantage
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-warm-900 font-[family-name:var(--font-heading)] mb-3">
              Why IKEA Pax frames?
            </h2>
            <p className="text-lg text-warm-500 max-w-2xl mx-auto">
              IKEA Pax is the world&apos;s best modular wardrobe system — precision-engineered,
              endlessly configurable, and a fraction of the cost of custom carcasses.
              We don&apos;t build boxes from scratch. We make them look bespoke.
            </p>
          </div>
        </ScrollReveal>

        {/* Visual comparison */}
        <ScrollReveal delay={0.15}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mt-10 max-w-5xl mx-auto">
            {comparison.map((item) => (
              <div
                key={item.label}
                className={`relative rounded-2xl overflow-hidden border transition-all duration-300 ${
                  item.highlight
                    ? 'border-orange-400 ring-2 ring-orange-400/20 shadow-xl scale-[1.02] md:scale-105 z-10'
                    : 'border-warm-200 opacity-90'
                }`}
              >
                {item.highlight && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-orange-500 to-orange-400 text-white text-center text-[10px] font-bold uppercase tracking-widest py-1.5 font-[family-name:var(--font-heading)] z-10">
                    What we do
                  </div>
                )}

                {/* Image */}
                <div className="aspect-[4/3] relative">
                  <Image
                    src={item.image}
                    alt={item.label}
                    fill
                    className={`object-cover ${!item.highlight ? 'grayscale-[30%]' : ''}`}
                    sizes="(min-width: 768px) 33vw, 100vw"
                  />
                  {!item.highlight && (
                    <div className="absolute inset-0 bg-warm-900/10" />
                  )}
                </div>

                {/* Content */}
                <div className={`p-5 ${item.highlight ? 'bg-white' : 'bg-warm-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`text-base font-bold font-[family-name:var(--font-heading)] ${
                      item.highlight ? 'text-green-900' : 'text-warm-700'
                    }`}>
                      {item.label}
                    </h3>
                    <span className={`text-sm font-bold font-[family-name:var(--font-heading)] ${
                      item.highlight ? 'text-orange-500' : 'text-warm-500'
                    }`}>
                      {item.price}
                    </span>
                  </div>
                  <p className="text-sm text-warm-500 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.3}>
          <p className="text-center text-sm text-warm-500 mt-8 max-w-xl mx-auto">
            Same visual result as traditional fitted wardrobes.{' '}
            <strong className="text-warm-700">Up to 60% less cost.</strong>{' '}
            Installed in days, not weeks.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
