import { Star, Clock, MapPin, Shield } from 'lucide-react';

const trustItems = [
  { icon: MapPin, text: 'UK-wide', detail: 'Nationwide installation' },
  { icon: Clock, text: '1–2 day fitting', detail: 'Once your design is finalised' },
  { icon: Star, text: 'IKEA Pax specialists', detail: '5-star rated' },
  { icon: Shield, text: 'Free consultation', detail: 'No obligation' },
];

export default function TrustStrip() {
  return (
    <div className="bg-white border-y border-warm-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {trustItems.map((item) => (
            <div key={item.text} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-warm-900 font-[family-name:var(--font-heading)]">{item.text}</p>
                <p className="text-xs text-warm-500">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
