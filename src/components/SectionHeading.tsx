interface SectionHeadingProps {
  label?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
}

export default function SectionHeading({ label, title, description, align = 'center' }: SectionHeadingProps) {
  const alignClass = align === 'center' ? 'text-center mx-auto' : 'text-left';

  return (
    <div className={`max-w-2xl mb-12 ${alignClass}`}>
      {label && (
        <span className="inline-block text-xs font-semibold tracking-widest uppercase text-orange-500 mb-3 font-[family-name:var(--font-heading)]">
          {label}
        </span>
      )}
      <h2 className="text-3xl md:text-4xl font-bold text-warm-900 mb-4 font-[family-name:var(--font-heading)]">
        {title}
      </h2>
      {description && (
        <p className="text-lg text-warm-500 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
