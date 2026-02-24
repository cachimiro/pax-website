/**
 * Styled placeholder for wardrobe/installation images.
 * Replace with real <Image> components when photography is available.
 */

interface ImagePlaceholderProps {
  label: string;
  aspect?: 'square' | 'landscape' | 'portrait' | 'wide';
  variant?: 'wardrobe' | 'fitting' | 'detail' | 'room';
  className?: string;
}

const aspectClasses = {
  square: 'aspect-square',
  landscape: 'aspect-[4/3]',
  portrait: 'aspect-[3/4]',
  wide: 'aspect-[16/9]',
};

// Each variant shows a different wardrobe-related SVG illustration
const illustrations: Record<string, React.ReactNode> = {
  wardrobe: (
    <svg viewBox="0 0 200 200" className="w-24 h-24 opacity-20" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Wardrobe outline */}
      <rect x="40" y="30" width="120" height="150" rx="4" stroke="currentColor" strokeWidth="2" />
      <line x1="100" y1="30" x2="100" y2="180" stroke="currentColor" strokeWidth="1.5" />
      {/* Handles */}
      <circle cx="92" cy="105" r="3" fill="currentColor" />
      <circle cx="108" cy="105" r="3" fill="currentColor" />
      {/* Top trim */}
      <rect x="36" y="26" width="128" height="6" rx="2" stroke="currentColor" strokeWidth="1.5" />
      {/* Plinth */}
      <rect x="42" y="180" width="116" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  fitting: (
    <svg viewBox="0 0 200 200" className="w-24 h-24 opacity-20" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Drill/tool */}
      <rect x="60" y="80" width="80" height="40" rx="6" stroke="currentColor" strokeWidth="2" />
      <rect x="140" y="92" width="30" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="80" cy="100" r="8" stroke="currentColor" strokeWidth="1.5" />
      {/* Screw */}
      <line x1="170" y1="100" x2="190" y2="100" stroke="currentColor" strokeWidth="2" />
      {/* Wall bracket */}
      <rect x="20" y="60" width="8" height="80" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <line x1="28" y1="80" x2="50" y2="80" stroke="currentColor" strokeWidth="1.5" />
      <line x1="28" y1="120" x2="50" y2="120" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  detail: (
    <svg viewBox="0 0 200 200" className="w-24 h-24 opacity-20" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Door panel close-up */}
      <rect x="30" y="20" width="140" height="160" rx="4" stroke="currentColor" strokeWidth="2" />
      {/* Handle detail */}
      <rect x="140" y="85" width="20" height="30" rx="10" stroke="currentColor" strokeWidth="2" />
      {/* Grain lines */}
      <line x1="50" y1="40" x2="50" y2="160" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
      <line x1="80" y1="40" x2="80" y2="160" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
      <line x1="110" y1="40" x2="110" y2="160" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
    </svg>
  ),
  room: (
    <svg viewBox="0 0 200 200" className="w-24 h-24 opacity-20" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Room perspective */}
      <polygon points="20,20 180,20 160,50 40,50" stroke="currentColor" strokeWidth="1.5" />
      <rect x="40" y="50" width="120" height="130" stroke="currentColor" strokeWidth="1.5" />
      {/* Wardrobe in room */}
      <rect x="50" y="60" width="50" height="110" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="100" y="60" width="50" height="110" rx="2" stroke="currentColor" strokeWidth="2" />
      {/* Handles */}
      <circle cx="95" cy="115" r="2" fill="currentColor" />
      <circle cx="105" cy="115" r="2" fill="currentColor" />
      {/* Bed outline */}
      <rect x="55" y="155" width="90" height="20" rx="3" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    </svg>
  ),
};

export default function ImagePlaceholder({
  label,
  aspect = 'landscape',
  variant = 'wardrobe',
  className = '',
}: ImagePlaceholderProps) {
  return (
    <div
      className={`${aspectClasses[aspect]} bg-warm-100 rounded-xl flex flex-col items-center justify-center text-warm-400 relative overflow-hidden ${className}`}
    >
      {illustrations[variant]}
      <span className="text-xs mt-2 font-medium font-[family-name:var(--font-heading)] text-center px-4">
        {label}
      </span>
    </div>
  );
}
