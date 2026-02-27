import { MessageCircleQuestion } from 'lucide-react';
import ScrollReveal from './ScrollReveal';

const objections = [
  {
    question: 'Will it look like IKEA?',
    answer: 'No. Custom doors, colour-matched trims, and professional fitting make it indistinguishable from traditional bespoke wardrobes. The Pax system is hidden — what you see is a fully finished, built-in wardrobe.',
  },
  {
    question: 'Is it actually affordable?',
    answer: 'Our most popular package starts from £1,500 fitted. Traditional fitted wardrobes with the same visual result start from £3,000+. You get the same look for up to 60% less.',
  },
  {
    question: 'What if my room is awkward?',
    answer: 'Sloped ceilings, uneven walls, tight alcoves — we deal with these every week. The video consultation lets us assess your space and recommend the right approach before you commit.',
  },
  {
    question: 'Do I need to measure everything first?',
    answer: 'No. Rough photos and approximate dimensions are enough for the consultation. We take precise measurements before installation — that\'s our job, not yours.',
  },
  {
    question: 'What if I\'m not sure which package?',
    answer: 'That\'s exactly what the free consultation is for. We\'ll recommend the right package based on your space, style, and budget. No pressure to decide beforehand.',
  },
  {
    question: 'How long does the whole process take?',
    answer: 'From consultation to installation: typically 2–4 weeks depending on the package. The installation itself is 1–2 days. We give you a clear timeline upfront.',
  },
];

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
            <h2 className="text-3xl md:text-4xl font-bold text-warm-900 font-[family-name:var(--font-heading)] mb-3">
              Questions we hear every week
            </h2>
            <p className="text-lg text-warm-500 max-w-xl mx-auto">
              Honest answers to the things people wonder before getting in touch.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {objections.map((obj, i) => (
            <ScrollReveal key={obj.question} delay={i * 0.08}>
              <div className="bg-white rounded-2xl border border-warm-100 p-6 hover:border-green-200 hover:shadow-lg hover:shadow-green-700/5 transition-all duration-300 h-full">
                <div className="flex items-start gap-3 mb-3">
                  <MessageCircleQuestion className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <h3 className="text-base font-bold text-warm-900 font-[family-name:var(--font-heading)] leading-snug">
                    {obj.question}
                  </h3>
                </div>
                <p className="text-sm text-warm-600 leading-relaxed pl-8">
                  {obj.answer}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
