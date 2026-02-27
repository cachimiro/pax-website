'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Info } from 'lucide-react';
import SectionHeading from '@/components/SectionHeading';
import CTABanner from '@/components/CTABanner';
import { usePackageModal } from '@/components/PackageModalProvider';

/* ─── Package color helpers ─── */

function pkgBadgeClass(pkg: string) {
  switch (pkg) {
    case 'Budget':
      return 'bg-[#f28c43]/90 backdrop-blur-sm text-white';
    case 'Select':
      return 'bg-[#2d5c37]/90 backdrop-blur-sm text-white';
    case 'PaxBespoke':
      return 'bg-gradient-to-r from-[#f28c43]/90 to-[#2d5c37]/90 backdrop-blur-sm text-white';
    default:
      return 'bg-warm-700/90 backdrop-blur-sm text-white';
  }
}

function pkgCtaClass(pkg: string) {
  switch (pkg) {
    case 'Budget':
      return 'text-[#f28c43] hover:text-[#e07c33]';
    case 'Select':
      return 'text-[#2d5c37] hover:text-[#234a2c]';
    case 'PaxBespoke':
      return 'text-[#f28c43] hover:text-[#e07c33]';
    default:
      return 'text-warm-700 hover:text-warm-900';
  }
}

function pkgFinishBg(pkg: string) {
  switch (pkg) {
    case 'Budget':
      return 'bg-[#f28c43]/5 text-[#f28c43]';
    case 'Select':
      return 'bg-[#2d5c37]/5 text-[#2d5c37]';
    case 'PaxBespoke':
      return 'bg-[#f28c43]/5 text-warm-600';
    default:
      return 'bg-warm-50 text-warm-600';
  }
}

function pkgFilterClass(pkg: string, isActive: boolean) {
  if (!isActive) return 'bg-warm-100 text-warm-700 hover:bg-warm-200';
  switch (pkg) {
    case 'Budget':
      return 'bg-[#f28c43] text-white';
    case 'Select':
      return 'bg-[#2d5c37] text-white';
    case 'PaxBespoke':
      return 'bg-gradient-to-r from-[#f28c43] to-[#2d5c37] text-white';
    case 'All':
      return 'bg-warm-900 text-white';
    default:
      return 'bg-warm-900 text-white';
  }
}

/* ─── Data ─── */

const projects = [
  {
    id: 'white-shaker-alcove',
    title: 'White Shaker Alcove Wardrobe',
    location: 'Cheshire',
    packageUsed: 'Select',
    roomType: 'Bedroom',
    description: 'Floor-to-ceiling white spray-painted shaker doors fitted into a period alcove. Clean lines with no visible handles for a seamless finish.',
    finishes: ['White spray-painted doors', 'Shaker style', 'Push-to-open'],
    image: '/images/select-package/spray-painted-doors/spray-painted-door-01.png',
  },
  {
    id: 'sage-green-shaker',
    title: 'Sage Green Shaker Wardrobe',
    location: 'Manchester',
    packageUsed: 'Select',
    roomType: 'Bedroom',
    description: 'Five-panel sage green spray-painted shaker wardrobe with chrome handles and recessed spotlights. A statement piece in a modern bedroom.',
    finishes: ['Sage green spray-painted doors', 'Chrome handles', 'Recessed spotlights'],
    image: '/images/select-package/spray-painted-doors/spray-painted-door-03.png',
  },
  {
    id: 'budget-bedroom',
    title: 'White Pax Wardrobe',
    location: 'Greater Manchester',
    packageUsed: 'Budget',
    roomType: 'Bedroom',
    description: 'Standard IKEA Pax with filler panels professionally fitted. Clean, functional storage installed in half a day.',
    finishes: ['Standard IKEA doors', 'Filler panels', 'PAX interior system'],
    image: '/images/budget-package/budget-grey-pax-wardrobe-highres.jpg',
  },
  {
    id: 'fireplace-alcove',
    title: 'Fireplace Alcove Wardrobes',
    location: 'Cheshire',
    packageUsed: 'Select',
    roomType: 'Bedroom',
    description: 'Pair of spray-painted shaker wardrobes flanking a Victorian fireplace. Symmetrical alcove fit with chrome handles and carpet-level finish.',
    finishes: ['Spray-painted shaker doors', 'Chrome handles', 'Alcove integration'],
    image: '/images/select-package/spray-painted-doors/spray-painted-door-06.png',
  },
  {
    id: 'full-bedroom-suite',
    title: 'Full Bedroom Suite',
    location: 'Cheshire',
    packageUsed: 'Select',
    roomType: 'Dressing Room',
    description: 'Complete room fit-out with spray-painted wardrobe, matching chest of drawers under the window, and integrated desk area.',
    finishes: ['Spray-painted doors', 'Matching drawers', 'Built-in desk'],
    image: '/images/select-package/spray-painted-doors/spray-painted-door-08.png',
  },
  {
    id: 'sliding-mirrored',
    title: 'Sliding Mirrored Wardrobe',
    location: 'Manchester',
    packageUsed: 'PaxBespoke',
    roomType: 'Bedroom',
    description: 'SKYTTA sliding door wardrobe with mirrored panels. Space-saving design that opens up the room while maximising storage.',
    finishes: ['SKYTTA sliding doors', 'Mirrored panels', 'Custom fitted'],
    image: '/images/paxbespoke-projects/sliding/sliding-mirrored-wardrobe-01.jpg',
  },
];

const roomFilters = ['All', 'Bedroom', 'Dressing Room'];
const packageFilters = ['All', 'Budget', 'PaxBespoke', 'Select'];

/* ─── Component ─── */

export default function ProjectsPage() {
  const [roomFilter, setRoomFilter] = useState('All');
  const [packageFilter, setPackageFilter] = useState('All');
  const { openPackageModal } = usePackageModal();

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const roomMatch = roomFilter === 'All' || p.roomType === roomFilter;
      const pkgMatch = packageFilter === 'All' || p.packageUsed === packageFilter;
      return roomMatch && pkgMatch;
    });
  }, [roomFilter, packageFilter]);

  return (
    <>
      <section className="section-padding bg-warm-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            label="Our Projects"
            title="Real installations. Real homes."
            description="Every project shows what's possible with IKEA Pax system and the right finish. Browse by room type or package level."
          />

          {/* Filters */}
          <div className="flex flex-wrap gap-2 justify-center mb-10">
            <span className="text-xs font-medium text-warm-500 mr-2 self-center font-[family-name:var(--font-heading)]">Room:</span>
            {roomFilters.map((f) => (
              <button
                key={f}
                onClick={() => setRoomFilter(f)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all font-[family-name:var(--font-heading)] ${
                  roomFilter === f
                    ? 'bg-warm-900 text-white'
                    : 'bg-warm-100 text-warm-700 hover:bg-warm-200'
                }`}
              >
                {f}
              </button>
            ))}
            <span className="text-xs font-medium text-warm-500 ml-4 mr-2 self-center font-[family-name:var(--font-heading)]">Package:</span>
            {packageFilters.map((f) => (
              <button
                key={f}
                onClick={() => setPackageFilter(f)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all font-[family-name:var(--font-heading)] ${
                  pkgFilterClass(f, packageFilter === f)
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Results count */}
          {filtered.length < projects.length && (
            <p className="text-center text-sm text-warm-400 mb-6 font-[family-name:var(--font-heading)]">
              Showing {filtered.length} of {projects.length} projects
              {roomFilter !== 'All' || packageFilter !== 'All' ? (
                <button
                  onClick={() => { setRoomFilter('All'); setPackageFilter('All'); }}
                  className="ml-2 text-warm-500 underline hover:text-warm-700 transition-colors"
                >
                  Clear filters
                </button>
              ) : null}
            </p>
          )}

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-warm-500 mb-3">No projects match your filters.</p>
              <button
                onClick={() => { setRoomFilter('All'); setPackageFilter('All'); }}
                className="text-sm font-semibold text-[#f28c43] hover:text-[#e07c33] transition-colors font-[family-name:var(--font-heading)]"
              >
                Show all projects
              </button>
            </div>
          )}

          {/* Project grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((project) => (
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
                    <button
                      onClick={() => openPackageModal(project.packageUsed.toLowerCase())}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full font-[family-name:var(--font-heading)] cursor-pointer hover:opacity-80 transition-opacity ${pkgBadgeClass(project.packageUsed)}`}
                    >
                      {project.packageUsed}
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-warm-900 mb-1 font-[family-name:var(--font-heading)]">
                  {project.title}
                </h3>
                <p className="text-sm text-warm-500 mb-3">{project.location}</p>
                <p className="text-sm text-warm-700 leading-relaxed mb-4">{project.description}</p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {project.finishes.map((finish) => (
                    <span key={finish} className={`text-xs px-2.5 py-1 rounded-full font-medium ${pkgFinishBg(project.packageUsed)}`}>
                      {finish}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-4">
                  <Link
                    href={`/book?package=${project.packageUsed.toLowerCase()}`}
                    className={`inline-flex items-center text-sm font-semibold transition-colors font-[family-name:var(--font-heading)] ${pkgCtaClass(project.packageUsed)}`}
                  >
                    Get a similar design
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                  <button
                    onClick={() => openPackageModal(project.packageUsed.toLowerCase())}
                    className="inline-flex items-center gap-1 text-xs text-warm-400 hover:text-warm-600 transition-colors font-[family-name:var(--font-heading)]"
                  >
                    <Info className="w-3.5 h-3.5" />
                    About {project.packageUsed}
                  </button>
                </div>
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
