import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, X, ArrowRight } from 'lucide-react';
import PackageCard from '@/components/PackageCard';
import SectionHeading from '@/components/SectionHeading';
import TestimonialCard from '@/components/TestimonialCard';
import CTABanner from '@/components/CTABanner';

export const metadata: Metadata = {
  title: 'Packages',
  description: 'Three wardrobe packages to suit every budget. Budget from £800, PaxBespoke from £1,500, Select from £2,500. Available across the North West. Free design consultation included.',
};

const packages = [
  {
    id: 'budget',
    name: 'Budget',
    bestFor: 'Best for: smart storage on a budget',
    priceRange: 'From £800',
    priceLabel: 'Per wardrobe, fitted. Final price confirmed after consultation.',
    features: ['IKEA Pax frames', 'Standard door finishes', 'Professional installation', 'Basic interior fittings'],
    leadTime: '1–2 weeks',
    finishLevel: 'Standard',
  },
  {
    id: 'paxbespoke',
    name: 'PaxBespoke',
    bestFor: 'Best for: a custom look without the custom price',
    priceRange: 'From £1,500',
    priceLabel: 'Per wardrobe, fitted. Final price confirmed after consultation.',
    features: ['IKEA Pax frames', 'Custom bespoke doors', 'Colour-matched trims', 'Premium interior layout', 'Soft-close upgrades'],
    leadTime: '2–3 weeks',
    finishLevel: 'Custom bespoke',
    popular: true,
  },
  {
    id: 'select',
    name: 'Select',
    bestFor: 'Best for: a fully bespoke, designer finish',
    priceRange: 'From £2,500',
    priceLabel: 'Per wardrobe, fitted. Final price confirmed after consultation.',
    features: ['IKEA Pax frames', 'Premium bespoke doors & panels', 'Integrated lighting', 'Full custom interior', 'Designer handle options', 'End-to-end project management'],
    leadTime: '3–4 weeks',
    finishLevel: 'Premium bespoke',
  },
];

const comparisonFeatures = [
  { feature: 'IKEA Pax frames', budget: true, paxbespoke: true, select: true },
  { feature: 'Professional installation', budget: true, paxbespoke: true, select: true },
  { feature: 'Free design consultation', budget: true, paxbespoke: true, select: true },
  { feature: 'Standard IKEA doors', budget: true, paxbespoke: false, select: false },
  { feature: 'Custom bespoke doors', budget: false, paxbespoke: true, select: true },
  { feature: 'Colour-matched trims', budget: false, paxbespoke: true, select: true },
  { feature: 'Premium interior layout', budget: false, paxbespoke: true, select: true },
  { feature: 'Soft-close upgrades', budget: false, paxbespoke: true, select: true },
  { feature: 'Integrated lighting', budget: false, paxbespoke: false, select: true },
  { feature: 'Designer handle options', budget: false, paxbespoke: false, select: true },
  { feature: 'End-to-end project management', budget: false, paxbespoke: false, select: true },
  { feature: 'Full custom interior design', budget: false, paxbespoke: false, select: true },
];

const packageDetails = [
  {
    id: 'budget',
    name: 'Budget',
    whoFor: 'You want functional, good-looking storage without overspending. You\'re happy with IKEA\'s standard door range and want a professional, clean installation.',
    ifYouWant: 'If you want a tidy, well-fitted wardrobe that does the job beautifully — without the custom price tag — this is your package.',
    testimonial: {
      quote: 'We needed wardrobes for the spare room and didn\'t want to spend a fortune. The Budget package was exactly right — looks great, fits perfectly, and was installed in a morning.',
      name: 'Tom R.',
      location: 'Wigan, Greater Manchester',
      packageUsed: 'Budget',
    },
  },
  {
    id: 'paxbespoke',
    name: 'PaxBespoke',
    whoFor: 'You want a wardrobe that looks fully custom but at a fraction of the cost. You care about finishes, colour matching, and a premium feel — but you\'re practical about budget.',
    ifYouWant: 'If you want visitors to say "where did you get that?" — and you want to answer honestly without the price tag to match — choose PaxBespoke.',
    testimonial: {
      quote: 'The custom doors completely transformed the room. You genuinely cannot tell these are IKEA frames underneath. The consultation was relaxed and helpful — no hard sell at all.',
      name: 'Sarah M.',
      location: 'Altrincham, Cheshire',
      packageUsed: 'PaxBespoke',
    },
  },
  {
    id: 'select',
    name: 'Select',
    whoFor: 'You want the full experience: premium materials, integrated lighting, designer details, and someone managing the entire project for you. This is our highest-spec package.',
    ifYouWant: 'If you\'re investing in a master bedroom, dressing room, or statement space — and you want it to feel truly bespoke — Select delivers.',
    testimonial: {
      quote: 'From consultation to installation in under two weeks. The Select finish is stunning — integrated lighting and everything. Worth every penny.',
      name: 'Priya K.',
      location: 'Wilmslow, Cheshire',
      packageUsed: 'Select',
    },
  },
];

export default function PackagesPage() {
  return (
    <>
      {/* Hero */}
      <section className="section-padding bg-warm-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            label="Our Packages"
            title="Find the right package for your space and budget"
            description="Every package uses IKEA Pax frames as the foundation — giving you quality engineering at a fraction of traditional fitted wardrobe prices. The difference is in the finish."
          />

          {/* Package cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {packages.map((pkg) => (
              <PackageCard key={pkg.id} {...pkg} />
            ))}
          </div>

          <div className="mt-8 bg-green-50 rounded-xl p-6 text-center">
            <p className="text-sm text-green-900 font-medium">
              Prices are indicative starting points for a single wardrobe, professionally installed.
              Available across our North West service area, within 50 miles of Warrington.
              Your exact quote is confirmed after a free, no-obligation consultation.
              <strong className="block mt-1">The consultation refines your price — it doesn&apos;t surprise you.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="section-padding bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            label="Compare"
            title="What&apos;s included at a glance"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-warm-200">
                  <th className="text-left py-4 pr-4 font-semibold text-warm-900 font-[family-name:var(--font-heading)]">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold text-warm-900 font-[family-name:var(--font-heading)]">Budget</th>
                  <th className="text-center py-4 px-4 font-semibold text-warm-900 font-[family-name:var(--font-heading)]">
                    <span className="inline-flex items-center gap-1">
                      PaxBespoke
                      <span className="text-[10px] font-semibold bg-orange-500 text-white px-1.5 py-0.5 rounded-full">Popular</span>
                    </span>
                  </th>
                  <th className="text-center py-4 pl-4 font-semibold text-warm-900 font-[family-name:var(--font-heading)]">Select</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row) => (
                  <tr key={row.feature} className="border-b border-warm-100">
                    <td className="py-3 pr-4 text-warm-700">{row.feature}</td>
                    <td className="py-3 px-4 text-center">
                      {row.budget ? <Check className="w-4 h-4 text-green-600 mx-auto" /> : <X className="w-4 h-4 text-warm-300 mx-auto" />}
                    </td>
                    <td className="py-3 px-4 text-center bg-green-50/50">
                      {row.paxbespoke ? <Check className="w-4 h-4 text-green-600 mx-auto" /> : <X className="w-4 h-4 text-warm-300 mx-auto" />}
                    </td>
                    <td className="py-3 pl-4 text-center">
                      {row.select ? <Check className="w-4 h-4 text-green-600 mx-auto" /> : <X className="w-4 h-4 text-warm-300 mx-auto" />}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-warm-200">
                  <td className="py-4 pr-4 font-semibold text-warm-900 font-[family-name:var(--font-heading)]">Starting from</td>
                  <td className="py-4 px-4 text-center font-bold text-warm-900 font-[family-name:var(--font-heading)]">£800</td>
                  <td className="py-4 px-4 text-center font-bold text-warm-900 bg-green-50/50 font-[family-name:var(--font-heading)]">£1,500</td>
                  <td className="py-4 pl-4 text-center font-bold text-warm-900 font-[family-name:var(--font-heading)]">£2,500</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Detailed package sections */}
      {packageDetails.map((pkg) => (
        <section key={pkg.id} id={pkg.id} className="section-padding bg-warm-white even:bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              <div>
                <span className="inline-block text-xs font-semibold tracking-widest uppercase text-orange-500 mb-3 font-[family-name:var(--font-heading)]">
                  {pkg.name} Package
                </span>
                <h3 className="text-2xl md:text-3xl font-bold text-warm-900 mb-6 font-[family-name:var(--font-heading)]">
                  Who is {pkg.name} for?
                </h3>
                <p className="text-warm-700 leading-relaxed mb-6">{pkg.whoFor}</p>
                <div className="bg-green-50 rounded-xl p-5 mb-8">
                  <p className="text-sm text-green-900 font-medium italic">{pkg.ifYouWant}</p>
                </div>
                <Link
                  href={`/book?package=${pkg.id}`}
                  className="inline-flex items-center px-6 py-3 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-900 transition-colors text-sm font-[family-name:var(--font-heading)]"
                >
                  Book Consultation — {pkg.name}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </div>
              <div>
                {/* Project images placeholder — replace with real photos for this package */}
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`bg-warm-100 rounded-xl flex items-center justify-center text-warm-300 text-xs ${
                        i === 1 ? 'col-span-2 aspect-[16/9]' : 'aspect-square'
                      }`}
                    >
                      {pkg.name} Project Photo {i}
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <TestimonialCard {...pkg.testimonial} />
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      <CTABanner />
    </>
  );
}
