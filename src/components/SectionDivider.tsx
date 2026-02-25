interface SectionDividerProps {
  flip?: boolean;
  color?: string;
}

export default function SectionDivider({ flip = false, color = 'var(--warm-white)' }: SectionDividerProps) {
  return (
    <div
      className={`w-full overflow-hidden leading-[0] ${flip ? 'rotate-180' : ''}`}
      style={{ marginTop: '-1px', marginBottom: '-1px' }}
    >
      <svg
        viewBox="0 0 1440 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-6 md:h-8"
        preserveAspectRatio="none"
      >
        <path
          d="M0 48h1440V24C1320 8 1200 0 1080 4C960 8 840 24 720 28C600 32 480 24 360 16C240 8 120 0 0 4V48Z"
          fill={color}
        />
      </svg>
    </div>
  );
}
