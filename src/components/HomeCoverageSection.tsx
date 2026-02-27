import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import UKCoverageMap from '@/components/UKCoverageMap';
import ScrollReveal from '@/components/ScrollReveal';
import SectionHeading from '@/components/SectionHeading';
import { FALLBACK_REGIONS } from '@/lib/region-data';

export default function HomeCoverageSection() {
  const activeCount = FALLBACK_REGIONS.filter((r) => r.status === 'active').length;

  return (
    <section className="section-padding bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <ScrollReveal>
            <div>
              <SectionHeading
                label="Where We Work"
                title="Expanding across the UK"
              />
              <p className="text-warm-600 text-lg leading-relaxed mb-6">
                We currently serve {activeCount} regions with professional IKEA
                Pax wardrobe installation, and we&apos;re growing fast. Check
                the map to see if we cover your area — or register your interest
                for when we arrive.
              </p>
              <Link
                href="/service-areas"
                className="inline-flex items-center gap-2 text-green-700 font-semibold hover:text-green-800 transition-colors font-[family-name:var(--font-heading)]"
              >
                View full coverage details
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </ScrollReveal>

          {/* Map */}
          <ScrollReveal delay={0.15}>
            <div className="max-w-sm mx-auto lg:max-w-md">
              <UKCoverageMap regions={FALLBACK_REGIONS} />
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
