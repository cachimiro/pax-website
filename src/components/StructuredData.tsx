export function LocalBusinessSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'PaxBespoke',
    description: 'Custom IKEA Pax wardrobe specialists. Bespoke doors, trims, and finishes on IKEA Pax system. Expert installation in 1-2 days. Serving customers across the UK.',
    url: 'https://paxbespoke.uk',
    telephone: '+447000000000',
    email: 'hello@paxbespoke.uk',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'GB',
    },
    areaServed: {
      '@type': 'Country',
      name: 'United Kingdom',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5.0',
      reviewCount: '47',
      bestRating: '5',
    },
    priceRange: '£800 - £5000',
    image: 'https://paxbespoke.uk/images/logo-full.png',
    sameAs: [
      'https://instagram.com/paxbespoke',
      'https://facebook.com/paxbespoke',
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function FAQSchema({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function ServiceSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Custom Wardrobe Installation',
    provider: {
      '@type': 'LocalBusiness',
      name: 'PaxBespoke',
    },
    areaServed: {
      '@type': 'Country',
      name: 'United Kingdom',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Wardrobe Packages',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name: 'Budget Package' },
          priceSpecification: { '@type': 'PriceSpecification', price: '800', priceCurrency: 'GBP', minPrice: '800' },
        },
        {
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name: 'PaxBespoke Package' },
          priceSpecification: { '@type': 'PriceSpecification', price: '1500', priceCurrency: 'GBP', minPrice: '1500' },
        },
        {
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name: 'Select Package' },
          priceSpecification: { '@type': 'PriceSpecification', price: '2500', priceCurrency: 'GBP', minPrice: '2500' },
        },
      ],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
