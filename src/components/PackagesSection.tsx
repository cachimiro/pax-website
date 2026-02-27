'use client';

import PackageCarousel from './PackageCarousel';
import ScrollReveal from './ScrollReveal';
import SectionHeading from './SectionHeading';
import { usePackageModal } from './PackageModalProvider';

interface PackageData {
  id: string;
  name: string;
  tagline?: string;
  bestFor: string;
  priceRange: string;
  priceLabel: string;
  features: string[];
  leadTime: string;
  finishLevel: string;
  popular?: boolean;
  ctaText?: string;
}

interface PackagesSectionProps {
  packages: PackageData[];
}

export default function PackagesSection({ packages }: PackagesSectionProps) {
  const { openPackageModal } = usePackageModal();

  return (
    <section id="packages" className="section-padding bg-warm-50 grain-overlay scroll-mt-20">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <SectionHeading
            label="Choose Your Package"
            title="Three packages. One clear next step."
            description="Every package includes the IKEA Pax system, professional installation, and a free design consultation. Choose the finish that matches your vision."
          />
        </ScrollReveal>
        <PackageCarousel packages={packages} onLearnMore={openPackageModal} />
        <ScrollReveal delay={0.3}>
          <p className="text-center text-sm text-warm-500 mt-8">
            Prices are indicative starting points. Your exact quote is confirmed after a free consultation.{' '}
            <strong className="text-warm-700">The consultation refines — it doesn&apos;t surprise.</strong>
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
