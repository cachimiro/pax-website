import ScrollReveal from './ScrollReveal';
import { Eye, Ruler, Palette, Wrench } from 'lucide-react';

const points = [
  {
    icon: Eye,
    title: 'You see the wardrobe, not the system',
    description: 'The IKEA Pax carcass is hidden behind custom finishes. What you see is a fully fitted, built-in wardrobe — not a kit. Visitors won\u0027t know there\u0027s Pax inside.',
    note: 'Select & PaxBespoke packages',
    noteClass: 'text-[#2d5c37]',
  },
  {
    icon: Ruler,
    title: 'Filler panels tailored to your space',
    description: 'Every room is different. Our filler panels are cut to fit — they can be 5cm, wider, or narrower depending on your walls. On PaxBespoke and Select, fillers sit flush with the doors for a seamless finish. On Budget, filler panels are flush with the frame (not the doors) and colour-matched to the frame.',
    note: 'Flush fillers on PaxBespoke & Select · Standard fillers on Budget',
    noteClass: 'text-warm-500',
  },
  {
    icon: Palette,
    title: 'Custom doors and trim colours',
    description: 'PaxBespoke: choose from options within the IKEA/PAX ecosystem. Select: broader choice of door styles, colours, and premium finishes — spray-painted or vinyl doors in any colour. Trims and handles are colour-matched for a seamless look.',
    note: 'PaxBespoke: within IKEA/PAX range · Select: full colour and style freedom',
    noteClass: 'text-[#2d5c37]',
  },
  {
    icon: Wrench,
    title: 'Proper skirting finish and integration',
    description: 'Wardrobes can be raised on a timber platform and finished with a new skirting board matched to the room. We remove existing skirting, cut coving, and adjust rails so the wardrobe sits properly against the wall.',
    note: 'Skirting board finish on PaxBespoke & Select',
    noteClass: 'text-[#2d5c37]',
  },
];

export default function WhatMakesUsDifferent() {
  return (
    <section className="section-padding bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-orange-500 mb-3 font-[family-name:var(--font-heading)]">
              <span className="w-6 h-px bg-orange-400" />
              Why PaxBespoke
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-warm-900 font-[family-name:var(--font-heading)] mb-3">
              We create a finished product, not a flat-pack
            </h2>
            <p className="text-base sm:text-lg text-warm-500 max-w-2xl mx-auto">
              Stop comparing with IKEA. What we deliver is a fitted wardrobe — designed, built, and installed to look like it was always part of the room.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {points.map((point, i) => (
            <ScrollReveal key={point.title} delay={i * 0.1}>
              <div className="bg-warm-50 rounded-2xl p-6 md:p-8 h-full border border-warm-100">
                <div className="w-11 h-11 rounded-xl bg-white border border-warm-100 flex items-center justify-center mb-5 shadow-sm">
                  <point.icon className="w-5 h-5 text-warm-700" />
                </div>
                <h3 className="text-lg font-bold text-warm-900 mb-3 font-[family-name:var(--font-heading)]">
                  {point.title}
                </h3>
                <p className="text-sm text-warm-600 leading-relaxed mb-3">
                  {point.description}
                </p>
                <p className={`text-xs font-medium font-[family-name:var(--font-heading)] ${point.noteClass}`}>
                  {point.note}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
