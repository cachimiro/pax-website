'use client';

import Link from 'next/link';
import { trackEvent } from '@/lib/analytics';

interface ProjectCardProps {
  id: string;
  title: string;
  location: string;
  packageUsed: string;
  roomType: string;
  imagePlaceholder?: string;
}

export default function ProjectCard({ id, title, location, packageUsed, roomType, imagePlaceholder }: ProjectCardProps) {
  return (
    <Link
      href={`/projects#${id}`}
      className="group block rounded-2xl overflow-hidden bg-white border border-warm-100 hover:shadow-lg transition-shadow"
      onClick={() => trackEvent('project_view', { project: id })}
    >
      {/* Image placeholder — replace with real project photos */}
      <div className="aspect-[4/3] bg-warm-100 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-warm-300 text-sm">
          {imagePlaceholder || 'Project Photo'}
        </div>
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="text-xs font-medium bg-white/90 backdrop-blur-sm text-warm-700 px-2.5 py-1 rounded-full font-[family-name:var(--font-heading)]">
            {roomType}
          </span>
          <span className="text-xs font-medium bg-green-700/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-full font-[family-name:var(--font-heading)]">
            {packageUsed}
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-base font-semibold text-warm-900 group-hover:text-green-700 transition-colors font-[family-name:var(--font-heading)]">
          {title}
        </h3>
        <p className="text-sm text-warm-500 mt-1">{location}</p>
      </div>
    </Link>
  );
}
