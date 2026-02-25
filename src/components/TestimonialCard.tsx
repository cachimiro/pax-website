import { Star, Quote } from 'lucide-react';

interface TestimonialCardProps {
  quote: string;
  name: string;
  location: string;
  packageUsed?: string;
  rating?: number;
}

export default function TestimonialCard({ quote, name, location, packageUsed, rating = 5 }: TestimonialCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-warm-100 p-6 md:p-8 hover:shadow-lg hover:border-warm-200 transition-all duration-300 relative">
      {/* Quote mark */}
      <Quote className="w-8 h-8 text-orange-200 mb-4 -scale-x-100" />

      <div className="flex gap-0.5 mb-4">
        {Array.from({ length: rating }).map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-orange-400 text-orange-400" />
        ))}
      </div>
      <blockquote className="text-warm-700 text-sm leading-relaxed mb-6">
        &ldquo;{quote}&rdquo;
      </blockquote>
      <div className="flex items-center justify-between pt-4 border-t border-warm-50">
        <div>
          <p className="text-sm font-semibold text-warm-900 font-[family-name:var(--font-heading)]">{name}</p>
          <p className="text-xs text-warm-500">{location}</p>
        </div>
        {packageUsed && (
          <span className="text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full font-[family-name:var(--font-heading)]">
            {packageUsed}
          </span>
        )}
      </div>
    </div>
  );
}
