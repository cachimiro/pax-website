import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import ScrollReveal from './ScrollReveal';

interface CTABannerProps {
  title?: string;
  description?: string;
  buttonText?: string;
  buttonHref?: string;
}

export default function CTABanner({
  title = 'Ready to transform your space?',
  description = 'Book a free video consultation. We\'ll guide you through options, pricing, and next steps — no pressure, no obligation.',
  buttonText = 'Book Free Design Consultation',
  buttonHref = '/book',
}: CTABannerProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-green-900 via-green-700 to-green-900">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 text-center">
        <ScrollReveal>
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 font-[family-name:var(--font-heading)]">
            {title}
          </h2>
          <p className="text-green-100/70 text-lg mb-8 max-w-xl mx-auto">
            {description}
          </p>
          <Link
            href={buttonHref}
            className="inline-flex items-center px-8 py-4 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-all duration-200 text-base font-[family-name:var(--font-heading)] shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 group"
          >
            {buttonText}
            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <p className="text-xs text-green-100/40 mt-4 font-[family-name:var(--font-heading)]">
            20-minute video call · No measurements needed · Get a clear price range
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
