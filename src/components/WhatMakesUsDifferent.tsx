import Image from 'next/image';
import ScrollReveal from './ScrollReveal';
import { CheckCircle, Clock, PoundSterling, Sparkles } from 'lucide-react';

const advantages = [
  {
    icon: Sparkles,
    title: 'Precision-engineered frames',
    text: 'IKEA Pax is the world\'s most popular modular wardrobe system. We don\'t build boxes from scratch — we start with frames that are already perfect.',
  },
  {
    icon: CheckCircle,
    title: 'Custom doors & trims',
    text: 'We add bespoke doors, colour-matched trims, and professional finishing so your wardrobe looks fully built-in — not flat-pack.',
  },
  {
    icon: PoundSterling,
    title: 'Up to 60% less cost',
    text: 'By using IKEA\'s precision carcasses instead of building from scratch, we pass the savings on to you without compromising on the finished look.',
  },
  {
    icon: Clock,
    title: 'Installed in days, not weeks',
    text: 'Traditional fitted wardrobes take 4–8 weeks. We design, source, and install in a fraction of the time.',
  },
];

export default function WhatMakesUsDifferent() {
  return (
    <section className="section-padding bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Mobile: stacked layout / Desktop: side-by-side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* Left: Before/After visual */}
          <ScrollReveal>
            {/* pb-12 on mobile to make room for the overlapping after image */}
            <div className="relative pb-14 sm:pb-16 lg:pb-12">
              {/* Before image */}
              <div className="relative rounded-2xl overflow-hidden shadow-lg">
                <Image
                  src="/images/stock/before-1.jpg"
                  alt="Standard IKEA Pax wardrobe — before PaxBespoke"
                  width={600}
                  height={450}
                  className="w-full h-auto object-cover aspect-[4/3]"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                  <span className="text-xs font-bold text-white/80 uppercase tracking-wider font-[family-name:var(--font-heading)]">
                    Standard IKEA Pax
                  </span>
                </div>
              </div>

              {/* After image — overlapping bottom-right */}
              <div className="absolute -bottom-2 right-2 sm:right-0 w-[55%] sm:w-[60%] rounded-2xl overflow-hidden shadow-2xl border-4 border-white z-10">
                <Image
                  src="/images/stock/after-1.jpg"
                  alt="PaxBespoke fitted wardrobe — after transformation"
                  width={400}
                  height={300}
                  className="w-full h-auto object-cover aspect-[4/3]"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <span className="text-xs font-bold text-white/80 uppercase tracking-wider font-[family-name:var(--font-heading)]">
                    After PaxBespoke
                  </span>
                </div>
              </div>


            </div>
          </ScrollReveal>

          {/* Right: Approach explanation */}
          <ScrollReveal delay={0.15}>
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-[#E8872B] mb-3 font-[family-name:var(--font-heading)]">
                <span className="w-6 h-px bg-[#E8872B]" />
                Our Approach
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-warm-900 font-[family-name:var(--font-heading)] mb-4">
                Same frames.{' '}
                <span className="text-[#0C6B4E]">Completely different result.</span>
              </h2>
              <p className="text-sm sm:text-base text-warm-500 mb-6 sm:mb-8 leading-relaxed">
                We started building fully bespoke wardrobes from scratch. Then we realised IKEA had already
                solved the hardest part — the carcass. So we focused on what actually makes a wardrobe
                look built-in: the doors, the trims, and the installation.
              </p>

              <div className="space-y-4 sm:space-y-5">
                {advantages.map((item, i) => (
                  <div key={i} className="flex gap-3 sm:gap-4">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0C6B4E]/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 sm:w-5 sm:h-5 text-[#0C6B4E]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-warm-900 font-[family-name:var(--font-heading)] mb-0.5">
                        {item.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-warm-500 leading-relaxed">
                        {item.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
