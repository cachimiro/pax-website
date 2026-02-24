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
    <div className="relative flex flex-col items-center text-center p-6">
      <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-green-700" />
      </div>
      <span className="text-xs font-semibold text-orange-500 mb-2 font-[family-name:var(--font-heading)]">
        Step {step}
      </span>
      <h3 className="text-lg font-semibold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">{title}</h3>
      <p className="text-sm text-warm-500 leading-relaxed">{description}</p>
      {reassurance && (
        <p className="text-xs text-green-700 mt-3 font-medium italic">{reassurance}</p>
      )}
    </div>
  );
}
