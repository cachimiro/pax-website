import Link from 'next/link';

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
    <section className="bg-green-700">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 font-[family-name:var(--font-heading)]">
          {title}
        </h2>
        <p className="text-green-100 text-lg mb-8 max-w-xl mx-auto">
          {description}
        </p>
        <Link
          href={buttonHref}
          className="inline-flex items-center px-8 py-4 bg-white text-green-700 font-semibold rounded-lg hover:bg-green-50 transition-colors text-base font-[family-name:var(--font-heading)]"
        >
          {buttonText}
        </Link>
      </div>
    </section>
  );
}
