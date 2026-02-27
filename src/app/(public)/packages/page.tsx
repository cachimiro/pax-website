import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Check, X, ArrowRight } from 'lucide-react';
import PackageCard from '@/components/PackageCard';
import SectionHeading from '@/components/SectionHeading';
import { ServiceSchema } from '@/components/StructuredData';
import TestimonialCard from '@/components/TestimonialCard';
import CTABanner from '@/components/CTABanner';

export const metadata: Metadata = {
  title: 'Packages',
  description: 'Three wardrobe packages to suit every budget. Budget from £800, PaxBespoke from £1,500, Select from £2,500. UK-wide. Free design consultation included.',
};

const packages = [
  {
    id: 'budget',
    name: 'Budget',
    bestFor: 'A reasonably priced alternative to traditional fitted wardrobes. Standard IKEA PAX doors, boxed in with filler panels. You provide measurements and purchase the IKEA items — we handle the fitting.',
    priceRange: 'From £800',
    priceLabel: 'Per wardrobe, fitted. Final price confirmed after consultation.',
    features: ['Standard IKEA PAX doors', 'Filler panels fitted', 'Assembly & securing to wall', 'PAX interior system included'],
    leadTime: '1–2 weeks',
    finishLevel: 'Standard',
  },
  {
    id: 'paxbespoke',
    name: 'PaxBespoke',
    bestFor: 'A high-quality built-in finish at a sensible budget. Custom-fitted to the room with doors customised within the IKEA/PAX ecosystem, colour-matched trims, and flush filler panels.',
    priceRange: 'From £1,500',
    priceLabel: 'Per wardrobe, fitted. Final price confirmed after consultation.',
    features: ['Doors within IKEA/PAX range', 'Custom trim colours', 'Flush filler panels', 'Skirting board finish', 'Design consultation', 'Rubbish removal'],
    leadTime: '2–3 weeks',
    finishLevel: 'Custom fitted',
  },
  {
    id: 'select',
    name: 'Select',
    bestFor: 'The most premium finishes and styling options. Bespoke-looking front with spray-painted or vinyl doors, more freedom on colour and door styles, and little to no restrictions.',
    priceRange: 'From £2,500',
    priceLabel: 'Per wardrobe, fitted. Final price confirmed after consultation.',
    features: ['Everything in PaxBespoke', 'Bespoke doors (spray-painted or vinyl)', 'Full wall integration', 'Sliding door systems', 'Floor-to-ceiling builds', 'Advanced carpentry'],
    leadTime: '3–4 weeks',
    finishLevel: 'Full bespoke',
    popular: true,
  },
];

const comparisonFeatures = [
  { feature: 'Professional installation', budget: true, paxbespoke: true, select: true },
  { feature: 'Supply of IKEA items & materials', budget: false, paxbespoke: true, select: true },
  { feature: 'Measure visit', budget: false, paxbespoke: true, select: true },
  { feature: 'Design consultation', budget: false, paxbespoke: true, select: true },
  { feature: 'Standard IKEA PAX doors', budget: true, paxbespoke: false, select: false },
  { feature: 'Doors customised within IKEA/PAX range', budget: false, paxbespoke: true, select: false },
  { feature: 'Bespoke doors (spray-painted or vinyl)', budget: false, paxbespoke: false, select: true },
  { feature: 'Custom trim colours', budget: false, paxbespoke: true, select: true },
  { feature: 'Flush filler panels', budget: false, paxbespoke: true, select: true },
  { feature: 'Skirting board finish', budget: false, paxbespoke: true, select: true },
  { feature: 'Cornice / coving finish', budget: false, paxbespoke: true, select: true },
  { feature: 'Custom internal layouts', budget: false, paxbespoke: true, select: true },
  { feature: 'High-ceiling solutions', budget: false, paxbespoke: true, select: true },
  { feature: 'Rubbish removal', budget: false, paxbespoke: true, select: true },
  { feature: 'Old wardrobe removal', budget: false, paxbespoke: true, select: true },
  { feature: 'LED lighting', budget: false, paxbespoke: true, select: true },
  { feature: 'Full bespoke wall integration', budget: false, paxbespoke: false, select: true },
  { feature: 'Sliding door systems', budget: false, paxbespoke: false, select: true },
  { feature: 'Floor-to-ceiling builds', budget: false, paxbespoke: false, select: true },
  { feature: 'Advanced carpentry', budget: false, paxbespoke: false, select: true },
];

const packageDetails = [
  {
    id: 'budget',
    name: 'Budget',
    whoFor: 'You want a built-in look at a lower price and accept some aesthetic compromises. Budget uses standard IKEA PAX frames and doors only — no custom doors, no frame cutting, scribing, or height alterations. Filler panels are flush with the frame (not the doors), and their colour is matched to the frame. You provide accurate measurements, purchase the IKEA items yourself, and handle packaging disposal.',
    ifYouWant: 'Our most budget-friendly option, ideal for strict budgets, rentals, or spare rooms. Best for customers who prioritise function over finish and don\'t mind larger filler panels or gaps above in tricky heights. The PAX interior system is fully available and can be changed easily over time.',
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
    whoFor: 'You want a clean, built-in finish with a balanced price, while maximising usable storage. Doors and fronts can be customised within the IKEA/PAX ecosystem. This package includes custom cuts, trims, and craftsmanship — flush filler panels, skirting board finish, cornice/coving, and more. The PAX interior system is fully available and can be changed easily over time.',
    ifYouWant: 'A finish similar to bespoke fitted wardrobes, while still using the practical and efficient PAX system. Ideal for customers who want a quality finish and do not want to lose storage due to gaps or angles. For fully bespoke, made-to-order doors, our Select package is the better fit.',
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
    whoFor: 'You want the most premium finishes and styling options with little to no restrictions. Select upgrades the outside significantly — choose from spray-painted or vinyl doors in a broader range of styles, colours, and finishes, while keeping the practical IKEA PAX interior. Advanced carpentry, full wall integration, and sliding door systems are all available.',
    ifYouWant: 'For master bedrooms, dressing rooms, or statement spaces. Want different-coloured doors? Shaker fronts? Sleek modern style? We design the front to match your exact taste while keeping the practical benefits of the PAX interior. The PAX interior system is fully available and can be changed easily over time.',
    testimonial: {
      quote: 'From consultation to installation in under two weeks. The finish is stunning — sliding doors, floor-to-ceiling, everything integrated perfectly. Worth every penny.',
      name: 'Priya K.',
      location: 'Wilmslow, Cheshire',
      packageUsed: 'Select',
    },
  },
];

const packageImages = {
  budget: ['/images/stock/project-3.jpg', '/images/stock/project-6.jpg', '/images/stock/wardrobe-1.jpg'],
  paxbespoke: ['/images/stock/project-1.jpg', '/images/stock/project-4.jpg', '/images/stock/wardrobe-2.jpg'],
  select: ['/images/stock/project-2.jpg', '/images/stock/project-5.jpg', '/images/stock/wardrobe-3.jpg'],
};

export default function PackagesPage() {
  return (
    <>
      <ServiceSchema />
      {/* Hero */}
      <section className="section-padding bg-warm-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            label="Our Packages"
            title="Find the right package for your space and budget"
            description="Every package uses IKEA Pax system as the foundation — giving you quality engineering at a fraction of traditional fitted wardrobe prices. The difference is in the finish."
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
              Available UK-wide.
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
                  <th className="text-center py-4 px-4 font-semibold text-[#f28c43] font-[family-name:var(--font-heading)]">Budget</th>
                  <th className="text-center py-4 px-4 font-semibold font-[family-name:var(--font-heading)]">
                    <span className="bg-gradient-to-r from-[#f28c43] to-[#2d5c37] bg-clip-text text-transparent">PaxBespoke</span>
                  </th>
                  <th className="text-center py-4 pl-4 font-semibold text-warm-900 font-[family-name:var(--font-heading)]">
                    <span className="inline-flex items-center gap-1">
                      <span className="text-[#2d5c37]">Select</span>
                      <span className="text-[10px] font-semibold bg-[#2d5c37] text-white px-1.5 py-0.5 rounded-full">Recommended</span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row) => (
                  <tr key={row.feature} className="border-b border-warm-100">
                    <td className="py-3 pr-4 text-warm-700">{row.feature}</td>
                    <td className="py-3 px-4 text-center">
                      {row.budget ? <Check className="w-4 h-4 text-[#f28c43] mx-auto" /> : <X className="w-4 h-4 text-warm-300 mx-auto" />}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.paxbespoke ? <Check className="w-4 h-4 text-[#2d5c37] mx-auto" /> : <X className="w-4 h-4 text-warm-300 mx-auto" />}
                    </td>
                    <td className="py-3 pl-4 text-center bg-[#2d5c37]/5">
                      {row.select ? <Check className="w-4 h-4 text-[#2d5c37] mx-auto" /> : <X className="w-4 h-4 text-warm-300 mx-auto" />}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-warm-200">
                  <td className="py-4 pr-4 font-semibold text-warm-900 font-[family-name:var(--font-heading)]">Starting from</td>
                  <td className="py-4 px-4 text-center font-bold text-[#f28c43] font-[family-name:var(--font-heading)]">£800</td>
                  <td className="py-4 px-4 text-center font-bold font-[family-name:var(--font-heading)]"><span className="bg-gradient-to-r from-[#f28c43] to-[#2d5c37] bg-clip-text text-transparent">£1,500</span></td>
                  <td className="py-4 pl-4 text-center font-bold text-[#2d5c37] bg-[#2d5c37]/5 font-[family-name:var(--font-heading)]">£2,500</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Detailed package sections */}
      {packageDetails.map((pkg) => {
        const labelColor = pkg.id === 'budget' ? 'text-[#f28c43]' : pkg.id === 'select' ? 'text-[#2d5c37]' : 'text-[#f28c43]';
        const tipBg = pkg.id === 'budget' ? 'bg-[#f28c43]/5' : pkg.id === 'select' ? 'bg-[#2d5c37]/5' : 'bg-gradient-to-r from-[#f28c43]/5 to-[#2d5c37]/5';
        const tipText = pkg.id === 'budget' ? 'text-[#f28c43]' : pkg.id === 'select' ? 'text-[#2d5c37]' : 'text-[#2d5c37]';
        const ctaClass = pkg.id === 'budget'
          ? 'bg-[#f28c43] hover:bg-[#e07c33]'
          : pkg.id === 'select'
          ? 'bg-[#2d5c37] hover:bg-[#234a2c]'
          : 'bg-gradient-to-r from-[#f28c43] to-[#2d5c37] hover:opacity-90';

        return (
        <section key={pkg.id} id={pkg.id} className="section-padding bg-warm-white even:bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              <div>
                <span className={`inline-block text-xs font-semibold tracking-widest uppercase mb-3 font-[family-name:var(--font-heading)] ${labelColor}`}>
                  {pkg.name} Package
                </span>
                <h3 className="text-2xl md:text-3xl font-bold text-warm-900 mb-6 font-[family-name:var(--font-heading)]">
                  Who is {pkg.name} for?
                </h3>
                <p className="text-warm-700 leading-relaxed mb-6">{pkg.whoFor}</p>
                <div className={`${tipBg} rounded-xl p-5 mb-8`}>
                  <p className={`text-sm font-medium italic ${tipText}`}>{pkg.ifYouWant}</p>
                </div>
                <Link
                  href={`/book?package=${pkg.id}`}
                  className={`inline-flex items-center px-6 py-3 text-white font-semibold rounded-lg transition-all text-sm font-[family-name:var(--font-heading)] ${ctaClass}`}
                >
                  Book Consultation — {pkg.name}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </div>
              <div>
                {/* Project images */}
                <div className="grid grid-cols-2 gap-3">
                  {(packageImages[pkg.id as keyof typeof packageImages] || packageImages.budget).map((img, i) => (
                    <div
                      key={i}
                      className={`rounded-xl overflow-hidden ${
                        i === 0 ? 'col-span-2 aspect-[16/9]' : 'aspect-square'
                      }`}
                    >
                      <Image
                        src={img}
                        alt={`${pkg.name} package example ${i + 1}`}
                        width={i === 0 ? 800 : 400}
                        height={i === 0 ? 450 : 400}
                        className="w-full h-full object-cover"
                      />
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
        );
      })}

      <CTABanner />
    </>
  );
}
