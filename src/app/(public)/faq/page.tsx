import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import SectionHeading from '@/components/SectionHeading';
import FAQItem from '@/components/FAQItem';
import CTABanner from '@/components/CTABanner';
import { FAQSchema } from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about PaxBespoke packages, pricing, measuring, timelines, and installation.',
};

const faqSections = [
  {
    id: 'pricing',
    title: 'Pricing & Packages',
    faqs: [
      {
        question: 'How much does a PaxBespoke wardrobe cost?',
        answer: 'Our Budget package starts from £800 per wardrobe (fitted), PaxBespoke from £1,500, and Select from £2,500. These are indicative starting points — your exact price depends on size, configuration, and finishes. You\'ll get a clear price range during your free consultation, and a fixed quote before any work begins.',
      },
      {
        question: 'Are there any hidden costs?',
        answer: 'No. The quote we give you is the price you pay. It includes materials, your chosen finishes, and installation. The only exception is if you request changes after the quote is agreed — and we\'ll always confirm any cost implications before proceeding.',
      },
      {
        question: 'What\'s the difference between the three packages?',
        answer: 'Budget uses standard IKEA doors and fittings — great value, professionally installed. PaxBespoke adds bespoke hinged doors, colour-matched trims, flush fillers, skirting finish, and rubbish removal. Select is our highest spec: everything in PaxBespoke plus full wall integration, sliding door systems, floor-to-ceiling builds, and advanced carpentry. Visit our Packages page for a detailed comparison.',
      },
      {
        question: 'Do I need to buy the IKEA Pax system myself?',
        answer: 'No. We handle sourcing and delivery across all packages. The cost of the IKEA Pax system and materials is included in your quote.',
      },
      {
        question: 'Do you offer finance or payment plans?',
        answer: 'We currently require a 50% deposit to confirm your order, with the balance due on completion. We\'re exploring finance options — get in touch if this is important to you.',
      },
    ],
  },
  {
    id: 'measuring',
    title: 'Measuring & Preparation',
    faqs: [
      {
        question: 'Do I need exact measurements before the consultation?',
        answer: 'No. Rough measurements are absolutely fine for the initial consultation. We\'ll guide you on what to measure and how. If you can share a few photos of the space, that\'s even better — but not essential.',
      },
      {
        question: 'Will you come to measure my space?',
        answer: 'For most projects, we can work from measurements you provide (with our guidance). For Select package projects or complex spaces, we may arrange a home visit to take precise measurements.',
      },
      {
        question: 'What if my walls aren\'t straight or my ceiling is uneven?',
        answer: 'Very common — and something we deal with regularly. Our installation team uses scribing techniques and custom fillers to ensure a seamless, built-in look regardless of your room\'s quirks.',
      },
    ],
  },
  {
    id: 'installation',
    title: 'Installation & Timelines',
    faqs: [
      {
        question: 'How long does installation take?',
        answer: 'The on-site fitting takes 1–2 days. A single wardrobe is typically done in half a day. Larger projects (multiple wardrobes, walk-in spaces) may take 2 days. This is scheduled after your consultation and design are finalised — we\'ll confirm the fitting date in your quote.',
      },
      {
        question: 'What\'s the lead time from order to installation?',
        answer: 'Budget: 1–2 weeks. PaxBespoke: 2–3 weeks. Select: 3–4 weeks. Lead times depend on finish availability and our installation schedule. We\'ll give you a confirmed date when you approve your quote.',
      },
      {
        question: 'Do I need to prepare the room?',
        answer: 'We ask that the area where the wardrobe will be installed is clear of furniture and personal items. We\'ll protect your floors and surrounding surfaces during installation.',
      },
      {
        question: 'Do you remove old wardrobes?',
        answer: 'We can remove and dispose of existing wardrobes as part of the project. Let us know during your consultation and we\'ll include it in the quote.',
      },
      {
        question: 'What happens if something goes wrong after installation?',
        answer: 'We stand behind our work. If anything needs adjusting after installation, get in touch and we\'ll sort it. We also provide care guidance for your specific finishes.',
      },
    ],
  },
  {
    id: 'consultation',
    title: 'The Consultation',
    faqs: [
      {
        question: 'What happens during the consultation?',
        answer: 'It\'s a relaxed 20-minute video call. We\'ll look at your space together, discuss what you want, recommend a package, and give you a clear price range. No hard sell — just honest guidance.',
      },
      {
        question: 'Is the consultation really free?',
        answer: 'Yes, completely free and no obligation. If you decide not to proceed, that\'s absolutely fine.',
      },
      {
        question: 'Can I book a consultation if I\'m not sure which package I want?',
        answer: 'Absolutely — that\'s one of the main reasons to book. We\'ll help you figure out which package suits your space, style, and budget.',
      },
    ],
  },
];

export default function FAQPage() {
  // Flatten all FAQs for schema
  const allFaqs = faqSections.flatMap((s) => s.faqs);

  return (
    <>
      <FAQSchema faqs={allFaqs} />
      <section className="section-padding bg-warm-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            label="FAQ"
            title="Frequently asked questions"
            description="Everything you need to know about our packages, pricing, process, and installation. Can't find your answer? Book a free consultation and we'll help."
          />

          {/* Quick jump links */}
          <div className="flex flex-wrap gap-2 justify-center mb-12">
            {faqSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="px-4 py-1.5 rounded-full text-sm font-medium bg-warm-100 text-warm-700 hover:bg-green-50 hover:text-green-700 transition-colors font-[family-name:var(--font-heading)]"
              >
                {section.title}
              </a>
            ))}
          </div>

          {/* FAQ sections */}
          <div className="space-y-12">
            {faqSections.map((section) => (
              <div key={section.id} id={section.id}>
                <h3 className="text-xl font-bold text-warm-900 mb-6 font-[family-name:var(--font-heading)]">
                  {section.title}
                </h3>
                <div>
                  {section.faqs.map((faq) => (
                    <FAQItem key={faq.question} {...faq} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="text-warm-500 mb-4">Still have questions?</p>
            <Link
              href="/book"
              className="inline-flex items-center px-6 py-3 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-900 transition-colors text-sm font-[family-name:var(--font-heading)]"
            >
              Book a Free Consultation
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      <CTABanner />
    </>
  );
}
