import { MessageCircleQuestion } from 'lucide-react';
import ScrollReveal from './ScrollReveal';

const objections = [
  {
    question: 'Will it look like IKEA?',
    answer: 'No. Custom doors, colour-matched trims, and professional fitting make it indistinguishable from traditional bespoke wardrobes. The Pax system is hidden — what you see is a fully finished, built-in wardrobe.',
    packages: ['Select', 'PaxBespoke'],
  },
  {
    question: 'Is it actually affordable?',
    answer: 'Our Budget package starts from £800 fitted, and our PaxBespoke package from £1,500. Traditional fitted wardrobes with the same visual result start from £3,000+. You get the same look for up to 60% less.',
    packages: ['Budget', 'Select', 'PaxBespoke'],
  },
  {
    question: 'What if my room is awkward?',
    answer: 'Sloped ceilings, uneven walls, tight alcoves — we deal with these every week. Our Select and PaxBespoke packages include custom frame adjustments and bespoke integration to handle any space.',
    packages: ['Select', 'PaxBespoke'],
  },
  {
    question: 'Do I need to measure everything first?',
    answer: 'No. Rough photos and approximate dimensions are enough for the consultation. We take precise measurements before installation — that\'s our job, not yours.',
    packages: ['Budget', 'Select', 'PaxBespoke'],
  },
  {
    question: 'What if I\'m not sure which package?',
    answer: 'That\'s exactly what the free consultation is for. We\'ll recommend the right package based on your space, style, and budget. No pressure to decide beforehand.',
    packages: [],
  },
  {
    question: 'How long does the whole process take?',
    answer: 'After your initial consultation, we finalise your design and schedule fitting — typically 2–4 weeks from consultation to installation day, depending on the package. The on-site fitting itself takes just 1–2 days. We give you a clear timeline upfront.',
    packages: [],
  },
];

function pkgPillClass(pkg: string) {
  switch (pkg) {
    case 'Budget':
      return 'bg-[#f28c43]/10 text-[#f28c43]';
    case 'Select':
      return 'bg-[#2d5c37]/10 text-[#2d5c37]';
    case 'PaxBespoke':
      return 'bg-gradient-to-r from-[#f28c43]/10 to-[#2d5c37]/10 text-warm-700';
    default:
      return 'bg-warm-100 text-warm-600';
  }
}

export default function ObjectionHandler() {
  return (
    <section className="section-padding bg-warm-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-orange-500 mb-3 font-[family-name:var(--font-heading)]">
              <span className="w-6 h-px bg-orange-400" />
              Common Questions
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-warm-900 font-[family-name:var(--font-heading)] mb-3">
              Questions we hear every week
            </h2>
            <p className="text-base sm:text-lg text-warm-500 max-w-xl mx-auto">
              Honest answers to the things people wonder before getting in touch.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {objections.map((obj, i) => (
            <ScrollReveal key={obj.question} delay={i * 0.08}>
              <div className="bg-white rounded-2xl border border-warm-100 p-5 sm:p-6 hover:border-warm-200 hover:shadow-lg hover:shadow-warm-700/5 transition-all duration-300 h-full flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <MessageCircleQuestion className="w-5 h-5 text-[#f28c43] flex-shrink-0 mt-0.5" />
                  <h3 className="text-base font-bold text-warm-900 font-[family-name:var(--font-heading)] leading-snug">
                    {obj.question}
                  </h3>
                </div>
                <p className="text-sm text-warm-600 leading-relaxed pl-8 flex-1">
                  {obj.answer}
                </p>
                {obj.packages.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3 pl-8">
                    {obj.packages.map((pkg) => (
                      <span key={pkg} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full font-[family-name:var(--font-heading)] ${pkgPillClass(pkg)}`}>
                        {pkg}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
