import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import SectionHeading from '@/components/SectionHeading';
import CTABanner from '@/components/CTABanner';

export const metadata: Metadata = {
  title: 'Projects',
  description: 'See real PaxBespoke installations. Before & after transformations across Budget, PaxBespoke, and Select packages.',
};

const projects = [
  {
    id: 'dulwich-master',
    title: 'Modern Master Suite',
    location: 'Hale, Cheshire',
    packageUsed: 'PaxBespoke',
    roomType: 'Bedroom',
    description: 'Floor-to-ceiling wardrobes with custom sage green doors and brass handles. Transformed a dated alcove into a seamless storage wall.',
    finishes: ['Sage green matt doors', 'Brass T-bar handles', 'Soft-close drawers'],
    image: '/images/stock/project-1.jpg',
  },
  {
    id: 'tunbridge-walkin',
    title: 'Walk-in Dressing Room',
    location: 'Wilmslow, Cheshire',
    packageUsed: 'Select',
    roomType: 'Dressing Room',
    description: 'Full room fit-out with integrated LED lighting, mirrored panels, and custom island unit. Premium oak-effect interiors throughout.',
    finishes: ['White gloss doors', 'Integrated LED strips', 'Mirrored end panels', 'Oak interior'],
    image: '/images/stock/project-2.jpg',
  },
  {
    id: 'croydon-kids',
    title: 'Kids Room Storage',
    location: 'Stockport, Manchester',
    packageUsed: 'Budget',
    roomType: 'Bedroom',
    description: 'Smart, functional storage for a growing family. Standard IKEA doors with professional fitting — clean, tidy, and done in half a day.',
    finishes: ['White standard doors', 'Wire baskets', 'Adjustable shelving'],
    image: '/images/stock/project-3.jpg',
  },
  {
    id: 'richmond-guest',
    title: 'Guest Bedroom Refresh',
    location: 'Didsbury, Manchester',
    packageUsed: 'PaxBespoke',
    roomType: 'Bedroom',
    description: 'Compact but elegant. Custom navy doors with chrome handles turned a small guest room into a boutique-hotel feel.',
    finishes: ['Navy matt doors', 'Chrome knob handles', 'Interior lighting'],
    image: '/images/stock/project-4.jpg',
  },
  {
    id: 'sevenoaks-master',
    title: 'His & Hers Wardrobes',
    location: 'Lymm, Cheshire',
    packageUsed: 'Select',
    roomType: 'Bedroom',
    description: 'Matching his-and-hers wardrobes flanking the bed. Integrated lighting, pull-out trouser rails, and jewellery drawers.',
    finishes: ['Cashmere matt doors', 'Brushed gold handles', 'Pull-out rails', 'Jewellery inserts'],
    image: '/images/stock/project-5.jpg',
  },
  {
    id: 'bromley-hallway',
    title: 'Hallway Storage',
    location: 'Cheshire',
    packageUsed: 'Budget',
    roomType: 'Hallway',
    description: 'Maximised an awkward hallway space with slim Pax units. Coats, shoes, and bags — all hidden behind clean white doors.',
    finishes: ['White standard doors', 'Shoe rack inserts', 'Hooks and rails'],
    image: '/images/stock/project-6.jpg',
  },
];

const filters = ['All', 'Bedroom', 'Dressing Room', 'Hallway'];
const packageFilters = ['All', 'Budget', 'PaxBespoke', 'Select'];

export default function ProjectsPage() {
  return (
    <>
      <section className="section-padding bg-warm-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            label="Our Projects"
            title="Real installations. Real homes."
            description="Every project shows what's possible with IKEA Pax system and the right finish. Browse by room type or package level."
          />

          {/* Filter pills — static for now, can be made interactive */}
          <div className="flex flex-wrap gap-2 justify-center mb-10">
            <span className="text-xs font-medium text-warm-500 mr-2 self-center font-[family-name:var(--font-heading)]">Room:</span>
            {filters.map((f, i) => (
              <button
                key={f}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors font-[family-name:var(--font-heading)] ${
                  i === 0
                    ? 'bg-green-700 text-white'
                    : 'bg-warm-100 text-warm-700 hover:bg-warm-200'
                }`}
              >
                {f}
              </button>
            ))}
            <span className="text-xs font-medium text-warm-500 ml-4 mr-2 self-center font-[family-name:var(--font-heading)]">Package:</span>
            {packageFilters.map((f, i) => (
              <button
                key={f}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors font-[family-name:var(--font-heading)] ${
                  i === 0
                    ? 'bg-green-700 text-white'
                    : 'bg-warm-100 text-warm-700 hover:bg-warm-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Project grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project) => (
              <article key={project.id} id={project.id} className="group">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden relative mb-4">
                  <Image
                    src={project.image}
                    alt={`${project.title} — ${project.packageUsed} package installation in ${project.location}`}
                    width={600}
                    height={450}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="text-xs font-medium bg-white/90 backdrop-blur-sm text-warm-700 px-2.5 py-1 rounded-full font-[family-name:var(--font-heading)]">
                      {project.roomType}
                    </span>
                    <span className="text-xs font-medium bg-green-700/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-full font-[family-name:var(--font-heading)]">
                      {project.packageUsed}
                    </span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-warm-900 mb-1 font-[family-name:var(--font-heading)]">
                  {project.title}
                </h3>
                <p className="text-sm text-warm-500 mb-3">{project.location}</p>
                <p className="text-sm text-warm-700 leading-relaxed mb-4">{project.description}</p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {project.finishes.map((finish) => (
                    <span key={finish} className="text-xs bg-warm-50 text-warm-600 px-2.5 py-1 rounded-full">
                      {finish}
                    </span>
                  ))}
                </div>

                <Link
                  href={`/book?package=${project.packageUsed.toLowerCase()}`}
                  className="inline-flex items-center text-sm font-semibold text-green-700 hover:text-green-900 transition-colors font-[family-name:var(--font-heading)]"
                >
                  Get a similar design
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CTABanner
        title="Love what you see?"
        description="Book a free consultation and we'll design something perfect for your space."
      />
    </>
  );
}
