import Link from 'next/link';
import { Video, Ruler, Palette, Wrench, ArrowRight } from 'lucide-react';
import TrustStrip from '@/components/TrustStrip';
import PackageCard from '@/components/PackageCard';
import StepCard from '@/components/StepCard';
import TestimonialCard from '@/components/TestimonialCard';
import ProjectCard from '@/components/ProjectCard';
import SectionHeading from '@/components/SectionHeading';
import CTABanner from '@/components/CTABanner';
import ImagePlaceholder from '@/components/ImagePlaceholder';

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

const steps = [
  {
    step: 1,
    title: 'Free Video Consultation',
    description: 'Share your space and ideas over a quick video call. We\'ll discuss options, packages, and give you a clear price range.',
    icon: Video,
    reassurance: 'Rough measurements are fine — we guide you.',
  },
  {
    step: 2,
    title: 'Design & Quote',
    description: 'We create a detailed design and fixed quote based on your chosen package, finishes, and layout.',
    icon: Ruler,
    reassurance: 'No surprises — the consultation refines, not inflates.',
  },
  {
    step: 3,
    title: 'Choose Your Finish',
    description: 'Pick from our range of doors, handles, trims, and colours. We\'ll send samples if needed.',
    icon: Palette,
  },
  {
    step: 4,
    title: 'Expert Installation',
    description: 'Our team installs everything in 1–2 days with minimal disruption. You enjoy your new wardrobe.',
    icon: Wrench,
  },
];

const testimonials = [
  {
    quote: 'The video consultation was so easy. They walked me through everything and I knew exactly what to expect before committing. The installation was done in a day — couldn\'t believe it.',
    name: 'Sarah M.',
    location: 'Altrincham, Cheshire',
    packageUsed: 'PaxBespoke',
  },
  {
    quote: 'We wanted something that looked high-end but didn\'t cost a fortune. The PaxBespoke package was perfect — custom doors on IKEA frames, and you genuinely can\'t tell the difference.',
    name: 'James & Lucy T.',
    location: 'Didsbury, Manchester',
    packageUsed: 'PaxBespoke',
  },
  {
    quote: 'From consultation to installation in under two weeks. The Select finish is stunning — integrated lighting and everything. Worth every penny.',
    name: 'Priya K.',
    location: 'Woolton, Liverpool',
    packageUsed: 'Select',
  },
];

const featuredProjects = [
  { id: 'project-1', title: 'Modern Bedroom Suite', location: 'Hale, Cheshire', packageUsed: 'PaxBespoke', roomType: 'Bedroom' },
  { id: 'project-2', title: 'Walk-in Wardrobe', location: 'Wilmslow, Cheshire', packageUsed: 'Select', roomType: 'Dressing Room' },
  { id: 'project-3', title: 'Kids Room Storage', location: 'Stockport, Manchester', packageUsed: 'Budget', roomType: 'Bedroom' },
];

export default function Home() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative bg-warm-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-32">
          <div className="max-w-3xl">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-orange-500 mb-4 font-[family-name:var(--font-heading)]">
              North West IKEA Pax Wardrobe Specialists
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-warm-900 mb-6 font-[family-name:var(--font-heading)] leading-[1.1]">
              Custom wardrobes.{' '}
              <span className="text-green-700">Affordable prices.</span>{' '}
              Installed in days.
            </h1>
            <p className="text-lg md:text-xl text-warm-500 mb-8 max-w-2xl leading-relaxed">
              We transform IKEA Pax frames with bespoke doors, trims, and finishes —
              giving you a designer wardrobe from <strong className="text-warm-700">£800</strong>,
              installed in <strong className="text-warm-700">1–2 days</strong>.
              Serving homes across the North West, within 50 miles of Warrington.
              Free video design consultation, no obligation.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/book"
                className="inline-flex items-center justify-center px-8 py-4 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-900 transition-colors text-base font-[family-name:var(--font-heading)]"
              >
                Book Free Design Consultation
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              <Link
                href="/packages"
                className="inline-flex items-center justify-center px-8 py-4 border border-warm-200 text-warm-700 font-semibold rounded-lg hover:bg-warm-50 transition-colors text-base font-[family-name:var(--font-heading)]"
              >
                View Packages
              </Link>
            </div>
          </div>
        </div>
        {/* Hero image — replace with real wardrobe hero shot */}
        <div className="absolute top-0 right-0 w-1/3 h-full hidden xl:block overflow-hidden">
          <div className="h-full flex flex-col gap-3 p-6 justify-center">
            <ImagePlaceholder label="Finished wardrobe installation" variant="room" aspect="landscape" />
            <div className="grid grid-cols-2 gap-3">
              <ImagePlaceholder label="Custom door detail" variant="detail" aspect="square" />
              <ImagePlaceholder label="Expert fitting" variant="fitting" aspect="square" />
            </div>
          </div>
        </div>
      </section>

      {/* ===== TRUST STRIP ===== */}
      <TrustStrip />

      {/* ===== PACKAGE SELECTOR (Decision Jump) ===== */}
      <section className="section-padding bg-warm-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            label="Choose Your Package"
            title="Three packages. One clear next step."
            description="Every package includes IKEA Pax frames, professional installation, and a free design consultation. Pick the finish level that suits you."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {packages.map((pkg) => (
              <PackageCard key={pkg.id} {...pkg} />
            ))}
          </div>
          <p className="text-center text-sm text-warm-500 mt-8">
            Prices are indicative starting points. Your exact quote is confirmed after a free consultation.
          </p>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="section-padding bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            label="How It Works"
            title="From idea to installed in 4 simple steps"
            description="We make it easy. You don't need exact measurements, technical knowledge, or hours of research. We guide you through everything."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step) => (
              <StepCard key={step.step} {...step} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== SOCIAL PROOF ===== */}
      <section className="section-padding bg-warm-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            label="What Our Customers Say"
            title="Trusted by homeowners across the North West"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <TestimonialCard key={t.name} {...t} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURED PROJECTS ===== */}
      <section className="section-padding bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <SectionHeading
              label="Our Work"
              title="Recent projects"
              align="left"
            />
            <Link
              href="/projects"
              className="hidden md:inline-flex items-center text-sm font-semibold text-green-700 hover:text-green-900 transition-colors font-[family-name:var(--font-heading)]"
            >
              View all projects
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProjects.map((project) => (
              <ProjectCard key={project.id} {...project} />
            ))}
          </div>
          <div className="mt-8 text-center md:hidden">
            <Link
              href="/projects"
              className="inline-flex items-center text-sm font-semibold text-green-700 hover:text-green-900 transition-colors font-[family-name:var(--font-heading)]"
            >
              View all projects
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== CTA BANNER ===== */}
      <CTABanner />
    </>
  );
}
