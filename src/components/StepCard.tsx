import { type LucideIcon } from 'lucide-react';

interface StepCardProps {
  step: number;
  title: string;
  description: string;
  icon: LucideIcon;
  reassurance?: string;
}

export default function StepCard({ step, title, description, icon: Icon, reassurance }: StepCardProps) {
  return (
    <div className="relative flex flex-col items-center text-center p-6 rounded-2xl bg-warm-white border border-warm-100 hover:border-green-200 hover:shadow-lg hover:shadow-green-700/5 transition-all duration-300 group">
      {/* Step number */}
      <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center font-[family-name:var(--font-heading)] shadow-md shadow-orange-500/30">
        {step}
      </span>

      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center mb-4 mt-2 group-hover:scale-105 transition-transform duration-300">
        <Icon className="w-6 h-6 text-green-700" />
      </div>
      <h3 className="text-base font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">{title}</h3>
      <p className="text-sm text-warm-500 leading-relaxed">{description}</p>
      {reassurance && (
        <p className="text-xs text-green-700 mt-3 font-medium bg-green-50 px-3 py-1.5 rounded-lg">
          {reassurance}
        </p>
      )}
    </div>
  );
}
