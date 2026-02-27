import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import ScrollReveal from './ScrollReveal';
import SectionHeading from './SectionHeading';

const projects = [
  {
    id: 'project-1',
    title: 'Designer Bedroom Suite',
    location: 'Cheshire',
    packageUsed: 'Select',
    before: '/images/paxbespoke-projects/before-after/before-01-wall.jpg',
    after: '/images/select-package/spray-painted-doors/spray-painted-door-08.png',
  },
  {
    id: 'project-2',
    title: 'Alcove Wardrobe',
    location: 'Manchester',
    packageUsed: 'PaxBespoke',
    before: '/images/paxbespoke-projects/before-after/before-02-wall.jpg',
    after: '/images/paxbespoke-projects/before-after/after-02-wardrobe.jpg',
  },
  {
    id: 'project-3',
    title: 'Full Room Fit',
    location: 'Greater Manchester',
    packageUsed: 'PaxBespoke',
    before: '/images/paxbespoke-projects/before-after/before-03-wall.jpg',
    after: '/images/paxbespoke-projects/before-after/after-03-wardrobe.jpg',
  },
];

export default function BeforeAfterSection() {
  return (
    <section className="section-padding bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="flex items-end justify-between mb-12">
            <SectionHeading
              label="Real Transformations"
              title="See the difference"
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
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {projects.map((project, i) => (
            <ScrollReveal key={project.id} delay={i * 0.1}>
              <Link href={`/projects#${project.id}`} className="group block">
                <div className="space-y-3">
                  {/* Before / After pair */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative rounded-xl overflow-hidden">
                      <Image
                        src={project.before}
                        alt={`${project.title} — before installation`}
                        width={400}
                        height={400}
                        className="w-full aspect-[4/5] sm:aspect-square object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute bottom-2 left-2 text-[11px] sm:text-[10px] font-semibold uppercase tracking-wider bg-warm-900/70 text-white px-2.5 py-1 sm:px-2 sm:py-0.5 rounded-md font-[family-name:var(--font-heading)]">
                        Before
                      </span>
                    </div>
                    <div className="relative rounded-xl overflow-hidden">
                      <Image
                        src={project.after}
                        alt={`${project.title} — after installation`}
                        width={400}
                        height={400}
                        className="w-full aspect-[4/5] sm:aspect-square object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute bottom-2 left-2 text-[11px] sm:text-[10px] font-semibold uppercase tracking-wider bg-green-700/80 text-white px-2.5 py-1 sm:px-2 sm:py-0.5 rounded-md font-[family-name:var(--font-heading)]">
                        After
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-warm-900 group-hover:text-green-700 transition-colors font-[family-name:var(--font-heading)]">
                        {project.title}
                      </h3>
                      <p className="text-xs text-warm-500">{project.location}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full font-[family-name:var(--font-heading)] ${
                      project.packageUsed === 'Budget'
                        ? 'bg-[#f28c43]/10 text-[#f28c43]'
                        : project.packageUsed === 'Select'
                        ? 'bg-[#2d5c37]/10 text-[#2d5c37]'
                        : 'bg-gradient-to-r from-[#f28c43]/10 to-[#2d5c37]/10 text-warm-700'
                    }`}>
                      {project.packageUsed}
                    </span>
                  </div>
                </div>
              </Link>
            </ScrollReveal>
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
  );
}
