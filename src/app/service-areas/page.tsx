import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, ArrowRight, CheckCircle } from 'lucide-react';
import SectionHeading from '@/components/SectionHeading';
import CTABanner from '@/components/CTABanner';
import ImagePlaceholder from '@/components/ImagePlaceholder';

export const metadata: Metadata = {
  title: 'Service Areas',
  description: 'PaxBespoke serves the North West within 50 miles of Warrington. Manchester, Liverpool, Chester, Preston, Bolton, Wigan and more.',
};

const coreAreas = [
  {
    region: 'Greater Manchester',
    towns: ['Manchester', 'Stockport', 'Sale', 'Altrincham', 'Bolton', 'Bury', 'Rochdale', 'Oldham', 'Wigan', 'Salford', 'Trafford', 'Tameside'],
    distance: '~20 miles',
  },
  {
    region: 'Cheshire',
    towns: ['Warrington', 'Chester', 'Northwich', 'Knutsford', 'Wilmslow', 'Macclesfield', 'Crewe', 'Nantwich', 'Congleton', 'Sandbach'],
    distance: '~25 miles',
  },
  {
    region: 'Merseyside',
    towns: ['Liverpool', 'Wirral', 'St Helens', 'Southport', 'Bootle', 'Crosby', 'Formby', 'Prescot', 'Huyton', 'Widnes'],
    distance: '~25 miles',
  },
];

const extendedAreas = [
  {
    region: 'Lancashire',
    towns: ['Preston', 'Blackburn', 'Burnley', 'Chorley', 'Leyland', 'Ormskirk', 'Skelmersdale'],
    distance: '~35 miles',
  },
  {
    region: 'North Wales (border)',
    towns: ['Wrexham', 'Flintshire', 'Denbighshire'],
    distance: '~40 miles',
  },
  {
    region: 'Staffordshire (north)',
    towns: ['Stoke-on-Trent', 'Newcastle-under-Lyme', 'Stafford'],
    distance: '~45 miles',
  },
  {
    region: 'Peak District fringe',
    towns: ['Buxton', 'Glossop', 'Chapel-en-le-Frith'],
    distance: '~40 miles',
  },
];

const distanceExamples = [
  { from: 'Warrington', to: 'Manchester city centre', distance: '20 miles', time: '~30 min' },
  { from: 'Warrington', to: 'Liverpool city centre', distance: '20 miles', time: '~30 min' },
  { from: 'Warrington', to: 'Chester', distance: '22 miles', time: '~35 min' },
  { from: 'Warrington', to: 'Preston', distance: '30 miles', time: '~40 min' },
  { from: 'Warrington', to: 'Stoke-on-Trent', distance: '42 miles', time: '~50 min' },
  { from: 'Warrington', to: 'Blackburn', distance: '35 miles', time: '~45 min' },
];

export default function ServiceAreasPage() {
  return (
    <>
      {/* Hero */}
      <section className="section-padding bg-warm-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            label="Service Areas"
            title="Designed and installed by our Warrington team"
            description="Based in Warrington, we install across Greater Manchester, Cheshire, Merseyside, Lancashire and surrounding areas within roughly 50 miles."
          />

          {/* Radius map visual */}
          <div className="max-w-3xl mx-auto mb-16">
            <div className="relative bg-green-50 rounded-2xl overflow-hidden aspect-[4/3] flex items-center justify-center">
              {/* SVG radius map */}
              <svg viewBox="0 0 600 500" className="w-full h-full p-8" xmlns="http://www.w3.org/2000/svg">
                {/* Outer radius circle (50 miles) */}
                <circle cx="300" cy="250" r="200" fill="none" stroke="#0C6B4E" strokeWidth="2" strokeDasharray="8 4" opacity="0.3" />
                <circle cx="300" cy="250" r="200" fill="#0C6B4E" opacity="0.04" />

                {/* Inner radius circle (25 miles) */}
                <circle cx="300" cy="250" r="100" fill="none" stroke="#0C6B4E" strokeWidth="1.5" strokeDasharray="6 3" opacity="0.2" />
                <circle cx="300" cy="250" r="100" fill="#0C6B4E" opacity="0.06" />

                {/* Warrington - centre */}
                <circle cx="300" cy="250" r="8" fill="#0C6B4E" />
                <circle cx="300" cy="250" r="12" fill="none" stroke="#0C6B4E" strokeWidth="2" opacity="0.4" />
                <text x="300" y="275" textAnchor="middle" className="text-xs font-semibold" fill="#0C6B4E" fontSize="13" fontFamily="Montserrat, sans-serif" fontWeight="700">Warrington</text>

                {/* Manchester - NE */}
                <circle cx="370" cy="200" r="5" fill="#E8872B" />
                <text x="370" y="190" textAnchor="middle" fill="#4A4843" fontSize="11" fontFamily="Raleway, sans-serif">Manchester</text>

                {/* Liverpool - W */}
                <circle cx="200" cy="235" r="5" fill="#E8872B" />
                <text x="200" y="225" textAnchor="middle" fill="#4A4843" fontSize="11" fontFamily="Raleway, sans-serif">Liverpool</text>

                {/* Chester - SW */}
                <circle cx="240" cy="320" r="4" fill="#E8872B" />
                <text x="240" y="340" textAnchor="middle" fill="#4A4843" fontSize="11" fontFamily="Raleway, sans-serif">Chester</text>

                {/* Preston - N */}
                <circle cx="280" cy="140" r="4" fill="#E8872B" />
                <text x="280" y="130" textAnchor="middle" fill="#4A4843" fontSize="11" fontFamily="Raleway, sans-serif">Preston</text>

                {/* Bolton - NE */}
                <circle cx="340" cy="170" r="4" fill="#E8872B" />
                <text x="340" y="160" textAnchor="middle" fill="#4A4843" fontSize="11" fontFamily="Raleway, sans-serif">Bolton</text>

                {/* Stockport - E */}
                <circle cx="400" cy="240" r="4" fill="#E8872B" />
                <text x="400" y="230" textAnchor="middle" fill="#4A4843" fontSize="11" fontFamily="Raleway, sans-serif">Stockport</text>

                {/* Wigan - NW */}
                <circle cx="260" cy="190" r="4" fill="#E8872B" />
                <text x="260" y="180" textAnchor="middle" fill="#4A4843" fontSize="11" fontFamily="Raleway, sans-serif">Wigan</text>

                {/* St Helens - W */}
                <circle cx="240" cy="220" r="3.5" fill="#E8872B" />
                <text x="240" y="210" textAnchor="middle" fill="#4A4843" fontSize="10" fontFamily="Raleway, sans-serif">St Helens</text>

                {/* Stoke - S */}
                <circle cx="380" cy="370" r="3.5" fill="#E8872B" opacity="0.7" />
                <text x="380" y="390" textAnchor="middle" fill="#7A776F" fontSize="10" fontFamily="Raleway, sans-serif">Stoke-on-Trent</text>

                {/* Blackburn - N */}
                <circle cx="360" cy="130" r="3.5" fill="#E8872B" opacity="0.7" />
                <text x="360" y="120" textAnchor="middle" fill="#7A776F" fontSize="10" fontFamily="Raleway, sans-serif">Blackburn</text>

                {/* Wrexham - SW */}
                <circle cx="210" cy="360" r="3.5" fill="#E8872B" opacity="0.7" />
                <text x="210" y="380" textAnchor="middle" fill="#7A776F" fontSize="10" fontFamily="Raleway, sans-serif">Wrexham</text>

                {/* Southport - NW */}
                <circle cx="180" cy="160" r="3.5" fill="#E8872B" opacity="0.7" />
                <text x="180" y="150" textAnchor="middle" fill="#7A776F" fontSize="10" fontFamily="Raleway, sans-serif">Southport</text>

                {/* Radius labels */}
                <text x="405" y="155" fill="#0C6B4E" fontSize="10" fontFamily="Montserrat, sans-serif" fontWeight="600" opacity="0.5">~25 miles</text>
                <text x="505" y="100" fill="#0C6B4E" fontSize="10" fontFamily="Montserrat, sans-serif" fontWeight="600" opacity="0.4">~50 miles</text>
              </svg>
            </div>
            <p className="text-center text-sm text-warm-500 mt-4">
              Approximate coverage area. Not sure if we reach you? <Link href="/book" className="text-green-700 font-medium hover:underline">Check during booking</Link> — we&apos;ll confirm instantly.
            </p>
          </div>
        </div>
      </section>

      {/* Core areas */}
      <section className="section-padding bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-600" />
              Core service areas
            </span>
          </h3>
          <p className="text-sm text-warm-500 mb-8">Within 25 miles of Warrington. Most installations scheduled within 1–2 weeks.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {coreAreas.map((group) => (
              <div key={group.region} className="bg-warm-white rounded-xl border border-warm-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-warm-900 font-[family-name:var(--font-heading)]">{group.region}</h4>
                  <span className="text-xs text-warm-400 font-medium">{group.distance}</span>
                </div>
                <ul className="space-y-2">
                  {group.towns.map((town) => (
                    <li key={town} className="flex items-center gap-2 text-sm text-warm-700">
                      <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                      {town}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Installation image strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-16">
            <ImagePlaceholder label="Wardrobe doors being fitted" variant="fitting" aspect="portrait" />
            <ImagePlaceholder label="Custom trim installation" variant="detail" aspect="portrait" />
            <ImagePlaceholder label="Interior layout assembly" variant="wardrobe" aspect="portrait" />
            <ImagePlaceholder label="Finished wardrobe" variant="room" aspect="portrait" />
          </div>

          <h3 className="text-xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500" />
              Extended service areas
            </span>
          </h3>
          <p className="text-sm text-warm-500 mb-8">25–50 miles from Warrington. Available with slightly longer lead times.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {extendedAreas.map((group) => (
              <div key={group.region} className="bg-warm-white rounded-xl border border-warm-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-warm-900 text-sm font-[family-name:var(--font-heading)]">{group.region}</h4>
                  <span className="text-xs text-warm-400 font-medium">{group.distance}</span>
                </div>
                <ul className="space-y-1.5">
                  {group.towns.map((town) => (
                    <li key={town} className="flex items-center gap-2 text-sm text-warm-600">
                      <CheckCircle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                      {town}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Distance examples */}
      <section className="section-padding bg-warm-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            label="How far do we travel?"
            title="Distance from our Warrington base"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {distanceExamples.map((ex) => (
              <div key={ex.to} className="bg-white rounded-xl border border-warm-100 p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-warm-900 font-[family-name:var(--font-heading)]">{ex.to}</p>
                  <p className="text-xs text-warm-500">{ex.distance} · {ex.time} drive</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Not listed */}
      <section className="section-padding bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-green-50 rounded-2xl p-8 md:p-10 text-center">
            <MapPin className="w-8 h-8 text-green-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-green-900 mb-3 font-[family-name:var(--font-heading)]">
              Not sure if we cover your area?
            </h3>
            <p className="text-sm text-green-800 mb-6 max-w-md mx-auto">
              Enter your postcode when you book and we&apos;ll check instantly. If you&apos;re just outside our range, get in touch — we may still be able to help.
            </p>
            <Link
              href="/book"
              className="inline-flex items-center px-6 py-3 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-900 transition-colors text-sm font-[family-name:var(--font-heading)]"
            >
              Book Free Consultation
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      <CTABanner
        title="Local North West wardrobe specialists"
        description="Book a free video consultation. We'll guide you through options, pricing, and next steps — designed and installed by our Warrington team."
      />
    </>
  );
}
