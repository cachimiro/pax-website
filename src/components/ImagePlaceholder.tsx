/**
 * Premium placeholder for wardrobe/installation images.
 * Replace with real <Image> components when photography is available.
 */

import { Camera } from 'lucide-react';

interface ImagePlaceholderProps {
  label: string;
  aspect?: 'square' | 'landscape' | 'portrait' | 'wide' | 'hero';
  variant?: 'wardrobe' | 'fitting' | 'detail' | 'room' | 'before' | 'after';
  className?: string;
  overlay?: boolean;
}

const aspectClasses = {
  square: 'aspect-square',
  landscape: 'aspect-[4/3]',
  portrait: 'aspect-[3/4]',
  wide: 'aspect-[16/9]',
  hero: 'aspect-[16/10] md:aspect-[21/9]',
};

const variantGradients: Record<string, string> = {
  wardrobe: 'from-green-900/20 via-green-700/10 to-warm-100',
  fitting: 'from-warm-200 via-warm-100 to-warm-50',
  detail: 'from-orange-100/50 via-warm-100 to-warm-50',
  room: 'from-green-900/15 via-warm-100 to-warm-50',
  before: 'from-warm-300/40 via-warm-200 to-warm-100',
  after: 'from-green-100/60 via-warm-50 to-white',
};

export default function ImagePlaceholder({
  label,
  aspect = 'landscape',
  variant = 'wardrobe',
  className = '',
  overlay = false,
}: ImagePlaceholderProps) {
  return (
    <div
      className={`${aspectClasses[aspect]} bg-gradient-to-br ${variantGradients[variant] || variantGradients.wardrobe} rounded-2xl flex flex-col items-center justify-center text-warm-400 relative overflow-hidden group ${className}`}
    >
      {/* Subtle pattern */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
        backgroundSize: '24px 24px',
      }} />

      <Camera className="w-8 h-8 mb-2 opacity-30" />
      <span className="text-xs font-medium font-[family-name:var(--font-heading)] text-center px-4 opacity-50">
        {label}
      </span>

      {overlay && (
        <div className="absolute inset-0 bg-gradient-to-t from-warm-900/60 via-transparent to-transparent" />
      )}
    </div>
  );
}
