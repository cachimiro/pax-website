import type { Metadata } from 'next';
import { Video, Ruler, Palette, Wrench, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import SectionHeading from '@/components/SectionHeading';
import TestimonialCard from '@/components/TestimonialCard';
import CTABanner from '@/components/CTABanner';

export const metadata: Metadata = {
  title: 'How It Works',
  description: 'From free video consultation to expert installation in 1-2 days. See how PaxBespoke transforms your space in 4 simple steps.',
};

const steps = [
  {
    step: 1,
    icon: Video,
    title: 'Free Video Consultation',
    description: 'Book a 20-minute video call at a time that suits you. Share your space, ideas, and budget — we\'ll recommend the right package and give you a clear price range.',
    details: [
      'No obligation, no hard sell',
      'Rough measurements are fine — we guide you',
      'You\'ll know your options and price range by the end of the call',
    ],
    reassurance: 'Most customers say the consultation was the easiest part of the whole process.',
  },
  {
    step: 2,
    icon: Ruler,
    title: 'Design & Fixed Quote',
    description: 'Based on your consultation, we create a detailed design and fixed-price quote. No hidden costs, no surprises. The consultation refines your price — it doesn\'t inflate it.',
    details: [
      'Detailed layout drawing',
      'Fixed price — what we quote is what you pay',
      'Revisions included until you\'re happy',
    ],
    reassurance: 'You approve everything before we order a single item.',
  },
  {
    step: 3,
    icon: Palette,
    title: 'Choose Your Finishes',
    description: 'Pick your doors, handles, trims, and colours from our curated range. We can send physical samples so you can see and feel the materials before committing.',
    details: [
      'Samples available for PaxBespoke and Select packages',
      'We\'ll suggest combinations that work with your room',
      'Change your mind? No problem — until we order',
    ],
    reassurance: null,
  },
  {
    step: 4,
    icon: Wrench,
    title: 'Expert Installation',
    description: 'Our experienced team installs everything in 1–2 days. We handle delivery, assembly, fitting, and cleanup. You just enjoy the result.',
    details: [
      'Typically completed in 1–2 days',
      'We protect your floors and furniture',
      'Full cleanup — we leave your home tidy',
      'Aftercare support included',
    ],
    reassurance: 'We\'ve installed hundreds of wardrobes. Your home is in safe hands.',
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <section className="section-padding bg-warm-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            label="How It Works"
            title="From idea to installed in 4 simple steps"
            description="We've designed the process to be as easy as possible. You don't need technical knowledge, exact measurements, or hours of research. We handle everything."
          />

          <div className="space-y-12 md:space-y-16">
            {steps.map((s) => (
              <div key={s.step} className="flex gap-6 md:gap-10">
                {/* Step indicator */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center">
                    <s.icon className="w-6 h-6 text-green-700" />
                  </div>
                  {s.step < 4 && (
                    <div className="w-px h-full bg-warm-200 mt-4" />
                  )}
                </div>

                {/* Content */}
                <div className="pb-8">
                  <span className="text-xs font-semibold text-orange-500 font-[family-name:var(--font-heading)]">
                    Step {s.step}
                  </span>
                  <h3 className="text-xl md:text-2xl font-bold text-warm-900 mt-1 mb-3 font-[family-name:var(--font-heading)]">
                    {s.title}
                  </h3>
                  <p className="text-warm-700 leading-relaxed mb-4">{s.description}</p>
                  <ul className="space-y-2 mb-4">
                    {s.details.map((detail) => (
                      <li key={detail} className="flex items-start gap-2 text-sm text-warm-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-600 mt-2 flex-shrink-0" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                  {s.reassurance && (
                    <p className="text-sm text-green-700 font-medium italic">{s.reassurance}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/book"
              className="inline-flex items-center px-8 py-4 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-900 transition-colors text-base font-[family-name:var(--font-heading)]"
            >
              Start with a Free Consultation
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="section-padding bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <TestimonialCard
            quote="I was nervous about the whole process but the team made it so straightforward. The video call was relaxed, the quote was clear, and the installation was done before I knew it. I wish I'd done it sooner."
            name="Emma W."
            location="Sale, Greater Manchester"
            packageUsed="PaxBespoke"
          />
        </div>
      </section>

      <CTABanner />
    </>
  );
}
