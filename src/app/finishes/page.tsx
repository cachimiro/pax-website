import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import SectionHeading from '@/components/SectionHeading';
import CTABanner from '@/components/CTABanner';

export const metadata: Metadata = {
  title: 'Finishes & Options',
  description: 'Explore our range of doors, handles, trims, and colours. See what\'s available on each PaxBespoke package.',
};

const categories = [
  {
    title: 'Doors',
    description: 'From standard IKEA finishes to fully custom bespoke doors in any colour or material.',
    items: [
      { name: 'Standard White', availability: 'Budget, PaxBespoke, Select', swatch: 'bg-white border' },
      { name: 'Standard Oak Effect', availability: 'Budget, PaxBespoke, Select', swatch: 'bg-amber-100' },
      { name: 'Matt Sage Green', availability: 'PaxBespoke, Select', swatch: 'bg-green-200' },
      { name: 'Matt Navy', availability: 'PaxBespoke, Select', swatch: 'bg-blue-900' },
      { name: 'Matt Cashmere', availability: 'PaxBespoke, Select', swatch: 'bg-amber-50' },
      { name: 'Matt Charcoal', availability: 'PaxBespoke, Select', swatch: 'bg-gray-700' },
      { name: 'Gloss White', availability: 'Select', swatch: 'bg-white border ring-1 ring-gray-200' },
      { name: 'Custom RAL Colour', availability: 'Select', swatch: 'bg-gradient-to-br from-pink-200 via-blue-200 to-green-200' },
    ],
  },
  {
    title: 'Handles',
    description: 'The details that make the difference. Choose from our curated handle collection.',
    items: [
      { name: 'Standard IKEA', availability: 'Budget', swatch: 'bg-gray-300' },
      { name: 'Chrome Knobs', availability: 'PaxBespoke, Select', swatch: 'bg-gray-200' },
      { name: 'Brass T-bar', availability: 'PaxBespoke, Select', swatch: 'bg-yellow-600' },
      { name: 'Matt Black Bar', availability: 'PaxBespoke, Select', swatch: 'bg-gray-900' },
      { name: 'Brushed Gold', availability: 'Select', swatch: 'bg-yellow-500' },
      { name: 'Leather Tab', availability: 'Select', swatch: 'bg-amber-700' },
    ],
  },
  {
    title: 'Trims & Panels',
    description: 'End panels, plinths, and crown mouldings that create a seamless, built-in look.',
    items: [
      { name: 'Standard End Panels', availability: 'Budget, PaxBespoke, Select', swatch: 'bg-white border' },
      { name: 'Colour-matched Panels', availability: 'PaxBespoke, Select', swatch: 'bg-green-100' },
      { name: 'Mirrored End Panels', availability: 'Select', swatch: 'bg-blue-50' },
      { name: 'Crown Moulding', availability: 'Select', swatch: 'bg-warm-100' },
      { name: 'Integrated Plinth', availability: 'PaxBespoke, Select', swatch: 'bg-warm-200' },
    ],
  },
  {
    title: 'Interior Fittings',
    description: 'Organise your wardrobe exactly how you need it.',
    items: [
      { name: 'Adjustable Shelves', availability: 'All packages', swatch: 'bg-warm-100' },
      { name: 'Wire Baskets', availability: 'All packages', swatch: 'bg-gray-200' },
      { name: 'Pull-out Trouser Rail', availability: 'PaxBespoke, Select', swatch: 'bg-gray-300' },
      { name: 'Jewellery Insert', availability: 'Select', swatch: 'bg-amber-100' },
      { name: 'Shoe Rack', availability: 'All packages', swatch: 'bg-warm-200' },
      { name: 'Integrated LED Lighting', availability: 'Select', swatch: 'bg-yellow-100' },
    ],
  },
];

export default function FinishesPage() {
  return (
    <>
      <section className="section-padding bg-warm-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            label="Finishes & Options"
            title="Explore your options"
            description="Browse doors, handles, trims, and interior fittings. Each item shows which packages it's available on. Not sure what to choose? We'll help you during your consultation."
          />

          <div className="space-y-16">
            {categories.map((category) => (
              <div key={category.title}>
                <h3 className="text-2xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
                  {category.title}
                </h3>
                <p className="text-sm text-warm-500 mb-8">{category.description}</p>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {category.items.map((item) => (
                    <div key={item.name} className="bg-white rounded-xl border border-warm-100 overflow-hidden hover:shadow-md transition-shadow">
                      {/* Swatch / image placeholder */}
                      <div className={`aspect-square ${item.swatch} flex items-center justify-center`}>
                        <span className="text-xs text-warm-400 opacity-50">Sample</span>
                      </div>
                      <div className="p-3">
                        <h4 className="text-sm font-semibold text-warm-900 font-[family-name:var(--font-heading)]">{item.name}</h4>
                        <p className="text-xs text-warm-500 mt-1">Available on: {item.availability}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="text-warm-500 mb-4">
              Want to see these in person? We can send samples as part of your consultation.
            </p>
            <Link
              href="/packages"
              className="inline-flex items-center text-sm font-semibold text-green-700 hover:text-green-900 transition-colors font-[family-name:var(--font-heading)]"
            >
              See which finishes come with each package
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </section>

      <CTABanner
        title="Found something you like?"
        description="Book a free consultation and we'll help you choose the perfect combination for your space."
      />
    </>
  );
}
