import { Check, X } from 'lucide-react';
import ScrollReveal from './ScrollReveal';

const forYou = [
  'You\'re renovating or moving in and want wardrobes that look built-in',
  'You\'ve priced traditional fitted wardrobes (£3,000–£8,000+) and want the same look for less',
  'You like IKEA Pax but want it to look nothing like IKEA',
  'You want someone to handle everything — design, sourcing, fitting — not a DIY project',
  'You\'re based in the North West, within 50 miles of Warrington',
];

const notForYou = [
  'You need fully custom-built carcasses (we use IKEA Pax frames — that\'s our advantage)',
  'You\'re outside our 50-mile service area',
  'You\'re looking for the cheapest possible option (we\'re not the cheapest — we\'re the best value)',
];

export default function IdealClientSection() {
  return (
    <section className="section-padding bg-warm-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-orange-500 mb-3 font-[family-name:var(--font-heading)]">
              <span className="w-6 h-px bg-orange-400" />
              Is This For You?
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-warm-900 font-[family-name:var(--font-heading)] mb-3">
              We&apos;re not for everyone — and that&apos;s by design
            </h2>
            <p className="text-lg text-warm-500 max-w-2xl mx-auto">
              We do one thing and we do it well. Here&apos;s how to know if PaxBespoke is the right fit.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {/* For you */}
          <ScrollReveal delay={0.1}>
            <div className="bg-white rounded-2xl border border-green-200 p-6 md:p-8 h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-700" />
                </div>
                <h3 className="text-lg font-bold text-green-900 font-[family-name:var(--font-heading)]">
                  PaxBespoke is for you if...
                </h3>
              </div>
              <ul className="space-y-4">
                {forYou.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-green-600" />
                    </div>
                    <span className="text-sm text-warm-700 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>

          {/* Not for you */}
          <ScrollReveal delay={0.2}>
            <div className="bg-white rounded-2xl border border-warm-200 p-6 md:p-8 h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-warm-50 flex items-center justify-center">
                  <X className="w-5 h-5 text-warm-500" />
                </div>
                <h3 className="text-lg font-bold text-warm-700 font-[family-name:var(--font-heading)]">
                  PaxBespoke might not be for you if...
                </h3>
              </div>
              <ul className="space-y-4">
                {notForYou.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-warm-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <X className="w-3 h-3 text-warm-400" />
                    </div>
                    <span className="text-sm text-warm-500 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-xs text-warm-400 border-t border-warm-100 pt-4">
                No hard feelings — we&apos;d rather be upfront than waste your time.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
