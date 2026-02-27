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
        answer: 'Budget uses standard IKEA PAX frames and doors only — no custom doors, no frame cutting or scribing. You provide measurements and purchase the IKEA items yourself; we handle the fitting. PaxBespoke adds doors customised within the IKEA/PAX ecosystem, colour-matched trims, flush filler panels, skirting board finish, and rubbish removal — we supply everything. Select upgrades the outside significantly with spray-painted or vinyl doors, a broader choice of styles and colours, full wall integration, sliding door systems, and advanced carpentry. Visit our Packages page for a detailed comparison.',
      },
      {
        question: 'Do I need to buy the IKEA Pax system myself?',
        answer: 'It depends on the package. On Budget, yes — you are responsible for purchasing the IKEA items (including any extra materials needed for infill/filler) and checking that nothing is missing or damaged before fitting day. On PaxBespoke and Select, no — we handle sourcing, delivery, and all materials as part of your quote.',
      },
      {
        question: 'Do you offer finance or payment plans?',
        answer: 'To secure a fitting slot, you pay a 50% deposit. The balance is due on completion. We\'re exploring finance options — get in touch if this is important to you.',
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
        answer: 'On Budget, a measure visit is not included — you provide accurate measurements yourself. On PaxBespoke and Select, customers can request a Home Visit directly in the form, and we may also recommend one for difficult spaces. If a Home Visit is requested, we ask for a budget range so we can confirm eligibility.',
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
        answer: 'Budget: usually half a day to a day, because the units are fitted without modifications. PaxBespoke and Select: typically 1–2 days on site, depending on complexity. This is scheduled after your consultation and design are finalised — we\'ll confirm the fitting date in your quote.',
      },
      {
        question: 'What\'s the lead time from order to installation?',
        answer: 'Budget: depends on when you order and receive your IKEA items — once everything has arrived and is ready, we book the fitting. PaxBespoke: 2–3 weeks. Select: 3–4 weeks. Lead times depend on finish availability and our installation schedule. We\'ll give you a confirmed date when you approve your quote.',
      },
      {
        question: 'Do I need to prepare the room?',
        answer: 'We ask that the area where the wardrobe will be installed is clear of furniture and personal items. We\'ll protect your floors and surrounding surfaces during installation.',
      },
      {
        question: 'Do you remove old wardrobes?',
        answer: 'On PaxBespoke and Select, we can remove and dispose of existing wardrobes as part of the project — let us know during your consultation and we\'ll include it in the quote. On Budget, rubbish removal is not included; you are responsible for disposing of packaging and any waste from cut panels.',
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
        answer: 'For Budget, it\'s a 15–20 minute Google Meet call where we review your IKEA Planner design, adjust if needed, create a quote, and share fitting availability. For PaxBespoke and Select, it\'s a 30–45 minute Google Meet call where we review your space and measurements together, create a 3D design live, and agree the layout and quote. No hard sell — just honest guidance.',
      },
      {
        question: 'Is the consultation really free?',
        answer: 'Yes, completely free and no obligation. If you decide not to proceed, that\'s absolutely fine.',
      },
      {
        question: 'Can I book a consultation if I\'m not sure which package I want?',
        answer: 'Absolutely — that\'s one of the main reasons to book. We\'ll help you figure out which package suits your space, style, and budget.',
      },
      {
        question: 'What do I need to provide to get started?',
        answer: 'Budget: measurements, photos, and an IKEA Planner design link submitted via the form, plus availability for a 15–20 min Google Meet call. PaxBespoke: measurements, photos, finish preferences, and availability for a 30–45 min Google Meet call. Select: measurements, photos, your preferred door finish (spray-painted or vinyl), and availability for a 30–45 min Google Meet call. If you request a Home Visit on PaxBespoke or Select, we also ask for a budget range.',
      },
    ],
  },
  {
    id: 'budget-package',
    title: 'Budget Package',
    faqs: [
      {
        question: 'Is the Budget package a fully built-in wardrobe?',
        answer: 'It can look built-in, but it depends on your space. Because Budget uses standard IKEA PAX units with no trimming or scribing, you may see visible gaps and/or larger filler panels (often 20–30cm vs our usual 5–10cm).',
      },
      {
        question: 'Can I choose my own doors or colours on Budget?',
        answer: 'No. Budget uses standard IKEA PAX doors and finishes only. For custom colours or bespoke fronts, choose PaxBespoke or Select.',
      },
      {
        question: 'Do you cut frames, scribe to walls, or adjust height on Budget?',
        answer: 'No. Budget does not include frame cutting, scribing, custom height changes, or custom platforms.',
      },
      {
        question: 'Will Budget work in sloped ceilings or tricky corners?',
        answer: 'Budget is best for straightforward spaces. For angled ceilings, bulkheads, and awkward layouts (where scribing/cutting is needed), PaxBespoke is usually the best solution.',
      },
      {
        question: 'Is a measure visit included with Budget?',
        answer: 'No. The customer is responsible for providing accurate measurements in the Budget form.',
      },
      {
        question: 'Do you supply the IKEA items on Budget?',
        answer: 'No. The customer orders the IKEA items (including any extra materials needed for infill/filler) and checks that nothing is missing or damaged before fitting day.',
      },
      {
        question: 'Do you remove rubbish or packaging on Budget?',
        answer: 'No. Rubbish removal is not included. The customer disposes of cardboard packaging and any waste from cut panels.',
      },
      {
        question: 'How long does Budget installation take?',
        answer: 'Usually half a day to a day, because the units are fitted without modifications. It is a quick, no-frills service.',
      },
      {
        question: 'What is the main difference between Budget and PaxBespoke?',
        answer: 'Budget keeps everything standard with minimal work to achieve a built-in look. PaxBespoke includes trims, cuts, and modifications for a tighter fit, a better finish, and often better storage outcomes.',
      },
    ],
  },
  {
    id: 'paxbespoke-package',
    title: 'PaxBespoke (Standard) Package',
    faqs: [
      {
        question: 'Is PaxBespoke fully bespoke, made-to-order joinery?',
        answer: 'No. PaxBespoke is built around the IKEA PAX system, refined and custom-fitted to your room. If you want fully bespoke, made-to-order doors/fronts, our Select package is the better fit.',
      },
      {
        question: 'Can I choose door styles and colours on PaxBespoke?',
        answer: 'You can choose from options within the IKEA/PAX ecosystem. This package does not include fully bespoke, made-to-order fronts.',
      },
      {
        question: 'Will you cut and scribe to uneven walls/ceilings?',
        answer: 'Yes, where needed. PaxBespoke includes the trims and custom fitting work required for a better built-in finish.',
      },
      {
        question: 'Can PaxBespoke handle angled ceilings, bulkheads, and tricky spaces?',
        answer: 'Yes. This is one of the main reasons customers choose PaxBespoke. Loft angle cuts, chimney breast integration, bulkheads, and alcoves are all standard project types.',
      },
      {
        question: 'How do you avoid losing storage to large infill panels or awkward angles?',
        answer: 'We design the layout to maximise usable storage and refine proportions using custom fitting and finish options.',
      },
      {
        question: 'Is the IKEA interior system still available on PaxBespoke?',
        answer: 'Yes. You keep full access to the IKEA PAX interior system (drawers, organisers, trays, etc.), and it can be changed over time.',
      },
      {
        question: 'Do you offer a home visit for PaxBespoke?',
        answer: 'Yes. Customers can request a Home Visit directly in the form, and we may also recommend one for difficult spaces.',
      },
    ],
  },
  {
    id: 'select-package',
    title: 'PaxBespoke Select Package',
    faqs: [
      {
        question: 'What is the main difference between PaxBespoke and Select?',
        answer: 'Select upgrades the outside significantly, with a broader choice of door styles, colours, and premium finishes, while keeping the practical IKEA PAX interior.',
      },
      {
        question: 'Is Select fully bespoke?',
        answer: 'Select delivers a bespoke-looking result and the highest flexibility in our range, while still using the IKEA PAX interior system.',
      },
      {
        question: 'Can Select customers choose the door finish and style?',
        answer: 'Yes. In the form, customers choose spray-painted doors or vinyl doors, and can select a door model in the Door Visualiser.',
      },
      {
        question: 'Is the IKEA interior still available and changeable on Select?',
        answer: 'Yes. The IKEA PAX interior system (drawers, organisers, trays, etc.) remains fully available and can be changed over time.',
      },
      {
        question: 'Can Select be used for tricky spaces (angled ceilings, chimney breasts, bulkheads)?',
        answer: 'Yes. Select is designed to handle difficult spaces with fewer limitations, while maintaining a premium finish.',
      },
      {
        question: 'Do you offer a home visit for Select?',
        answer: 'Yes. Customers can request a Home Visit in the form, and we may also recommend one for complex spaces.',
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
