import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, ArrowRight, CheckCircle } from 'lucide-react';
import CTABanner from '@/components/CTABanner';
import UKCoverageMap from '@/components/UKCoverageMap';
import type { RegionData } from '@/components/UKCoverageMap';
import { createClient } from '@/lib/supabase/server';
import { FALLBACK_REGIONS } from '@/lib/region-data';

export const metadata: Metadata = {
  title: 'Service Areas',
  description: 'PaxBespoke installs custom IKEA Pax wardrobes across the UK. Check our coverage map to see if we serve your area.',
};

async function getRegions(): Promise<RegionData[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('service_regions')
      .select('id, name, status')
      .order('name');

    if (error || !data) return FALLBACK_REGIONS;
    return data as RegionData[];
  } catch {
    return FALLBACK_REGIONS;
  }
}

export default async function ServiceAreasPage() {
  const regions = await getRegions();
  const activeRegions = regions.filter((r) => r.status === 'active');
  const comingSoonRegions = regions.filter((r) => r.status === 'coming_soon');

  return (
    <>
      {/* Hero — two-column: text left, map right */}
      <section className="section-padding bg-warm-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: copy */}
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-orange-500 mb-4 font-[family-name:var(--font-heading)]">
                <span className="w-6 h-px bg-orange-400" />
                Coverage Area
              </span>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-warm-900 mb-6 font-[family-name:var(--font-heading)] leading-tight">
                Custom Wardrobes Across the UK
              </h1>
              <p className="text-lg text-warm-500 leading-relaxed mb-8">
                PaxBespoke delivers custom IKEA Pax wardrobes to homes across the UK.
                We&apos;re growing fast — check the map to see if we cover your area,
                or find out when we&apos;re coming to you.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/book"
                  className="inline-flex items-center justify-center px-6 py-3.5 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors text-sm font-[family-name:var(--font-heading)] shadow-lg shadow-orange-500/25"
                >
                  Book Free Consultation
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </div>
            </div>

            {/* Right: map */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-md">
                <UKCoverageMap regions={regions} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Active regions */}
      <section className="section-padding bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-400" />
              Areas we currently cover
            </span>
          </h2>
          <p className="text-sm text-warm-500 mb-8">
            We install in these regions today. Book a free consultation to get started.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {activeRegions.map((region) => (
              <div
                key={region.id}
                className="flex items-center gap-2 bg-orange-50 rounded-xl border border-orange-100 px-4 py-3"
              >
                <CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span className="text-sm font-medium text-warm-800">{region.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Installation image strip */}
      <section className="bg-warm-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { src: '/images/select-package/spray-painted-doors/spray-painted-door-01.png', alt: 'White spray-painted shaker wardrobe fitted into alcove' },
              { src: '/images/paxbespoke-projects/skirting/skirting-white-wardrobe-blue-wall.jpg', alt: 'White wardrobe with skirting board integration' },
              { src: '/images/paxbespoke-projects/loft/loft-white-wardrobe-05.jpg', alt: 'White wardrobe fitted to angled loft ceiling' },
              { src: '/images/select-package/spray-painted-doors/spray-painted-door-03.png', alt: 'Sage green spray-painted shaker wardrobe' },
            ].map((img) => (
              <div key={img.src} className="aspect-[3/4] rounded-2xl overflow-hidden">
                <Image
                  src={img.src}
                  alt={img.alt}
                  width={400}
                  height={533}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coming soon regions */}
      <section className="section-padding bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-warm-700" />
              Coming soon
            </span>
          </h2>
          <p className="text-sm text-warm-500 mb-8">
            We&apos;re expanding into these areas. Get in touch if you&apos;d like to be notified when we arrive.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {comingSoonRegions.map((region) => (
              <div
                key={region.id}
                className="flex items-center gap-2 bg-warm-50 rounded-lg border border-warm-100 px-3 py-2.5"
              >
                <MapPin className="w-3.5 h-3.5 text-warm-400 flex-shrink-0" />
                <span className="text-xs text-warm-500">{region.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Not listed CTA */}
      <section className="section-padding bg-warm-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-green-50 rounded-2xl p-8 md:p-10 text-center">
            <MapPin className="w-8 h-8 text-green-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-green-900 mb-3 font-[family-name:var(--font-heading)]">
              Not sure if we cover your area?
            </h3>
            <p className="text-sm text-green-800 mb-6 max-w-md mx-auto">
              Enter your postcode when you book and we&apos;ll check instantly.
              If we&apos;re not in your area yet, leave your details and we&apos;ll let you know when we expand.
            </p>
            <Link
              href="/book"
              className="inline-flex items-center px-6 py-3 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-900 transition-colors text-sm font-[family-name:var(--font-heading)]"
            >
              Book Free Consultation
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      <CTABanner
        title="Custom wardrobes, wherever you are"
        description="Book a free video consultation. We'll guide you through options, pricing, and next steps."
      />
    </>
  );
}
