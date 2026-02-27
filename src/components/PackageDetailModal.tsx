'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { X, Check, Minus, ArrowRight, ChevronRight, Lightbulb, AlertTriangle, User, Building2, HelpCircle } from 'lucide-react';
import { getProjectTypesForPackage, processSteps, packageFAQs } from '@/lib/package-guide-data';

/* ─── Package data ─── */

const PACKAGE_ORDER = ['budget', 'paxbespoke', 'select'] as const;

interface FullPackageDetail {
  id: string;
  name: string;
  tagline: string;
  priceRange: string;
  summary: string;
  positioning: string;
  coreValue: string;
  forYouIf: string[];
  includes: string[];
  doesNotInclude: string[];
  color: string;
  colorHover: string;
  colorLight: string;
  colorText: string;
  gradient?: string;
}

const packageDetails: Record<string, FullPackageDetail> = {
  budget: {
    id: 'budget',
    name: 'Budget',
    tagline: 'Smart & Simple',
    priceRange: 'From £800',
    summary: 'Built-in storage without breaking the bank. We take a standard IKEA Pax wardrobe and box it in with filler panels — no custom doors, no height adjustments. Simple, practical, done.',
    positioning: 'Affordable pre-designed storage install.',
    coreValue: 'Quick, reliable wardrobe installation at the lowest cost. We box the wardrobe in with filler panels wherever possible, giving you a clean built-in look. Ideal for spare rooms, rentals, or anywhere function matters more than finish.',
    forYouIf: [
      'You want built-in storage, not a free-standing wardrobe',
      'You\'re working to a strict budget or furnishing a rental',
      'You prefer a quick turnaround with no design decisions',
      'You don\'t mind standard doors and wider filler panels',
    ],
    includes: [
      'Supply & installation',
      'Fitted plinth look',
      'Measure visit',
      'Assembly & securing to wall',
      'Post-installation support',
      'External materials supplied',
      'Basic skirting, coving & rail adjustments',
      'Handle fitting',
      'LED lighting',
      'Basic storage add-ons',
      'Fixed lighting integration',
    ],
    doesNotInclude: [
      'Full service supply & fit upgrades',
      'Maximised space redesign',
      'Custom design consultation',
      'Bespoke integration',
      'Custom doors or internal layouts',
      'Advanced sliding systems',
      'High-ceiling solutions',
      'Premium joinery finishing',
      'Complex carpentry adjustments',
      'MDF cornice finish',
      'Old wardrobe removal (unless added)',
    ],
    color: '#f28c43',
    colorHover: '#e07c33',
    colorLight: '#f28c43',
    colorText: '#f28c43',
  },
  paxbespoke: {
    id: 'paxbespoke',
    name: 'PaxBespoke',
    tagline: 'Where Pax Meets Bespoke',
    priceRange: 'From £1,500',
    summary: 'IKEA-based fitted wardrobes with custom finishes. Bespoke hinged doors, colour-matched trims, flush filler panels, and a skirting finish that makes the wardrobe look fully built-in.',
    positioning: 'IKEA-based fitted wardrobes with custom finishes.',
    coreValue: 'Cost-effective fitted look using the IKEA Pax system with upgrades. PaxBespoke keeps the reliable Pax interior but transforms the outside with bespoke hinged doors, flush filler panels, and custom trim colours. Whether you want shaker fronts, a specific colour, or a sleek modern style — we create a wardrobe that matches your exact taste.',
    forYouIf: [
      'You want a wardrobe that looks fully bespoke, not like IKEA',
      'You care about custom door colours, trims, and finishes',
      'You want flush filler panels and a proper skirting finish',
      'You want a design consultation to get the details right',
    ],
    includes: [
      'Supply & full installation service',
      'Fitted plinth look',
      'Maximised space utilisation',
      'Measure visit',
      'Design consultation (remote/video)',
      'Assembly & securing to wall',
      'Post-installation support',
      'External materials supplied',
      'Skirting removal & cutting',
      'Coving & picture rail removal',
      'Curtain rail removal/moving',
      'Fitting for handles (if supplied)',
      'LED lighting',
      'MDF cornice finish (if chosen)',
      'Custom frame adjustments',
      'Bespoke hinged doors',
      'Custom internal layouts',
      'High-ceiling wardrobe solutions',
      'Premium finish joinery front edges',
      'Storage add-ons (top cabinets, drawers, etc.)',
      'Fixed lighting integration',
      'Rubbish removal',
      'Old wardrobe removal (if project requires)',
    ],
    doesNotInclude: [
      'Full bespoke integration into walls',
      'Some advanced joinery options (sliding systems, special doors)',
    ],
    color: '#f28c43',
    colorHover: '#e07c33',
    colorLight: '#f28c43',
    colorText: '#2d5c37',
    gradient: 'from-[#f28c43] to-[#2d5c37]',
  },
  select: {
    id: 'select',
    name: 'Select',
    tagline: 'Designed Without Limits',
    priceRange: 'From £2,500',
    summary: 'Our highest capability package. Everything in PaxBespoke, plus full bespoke wall integration, sliding door systems, floor-to-ceiling builds, and advanced carpentry. No restrictions within the Pax system.',
    positioning: 'Fully tailored fitted wardrobe with maximum design flexibility.',
    coreValue: 'Select takes everything from PaxBespoke and adds full bespoke wall integration, sliding door systems, floor-to-ceiling builds, and advanced carpentry. Best value fitted wardrobe with maximum design flexibility — there are no restrictions within the Pax-based range.',
    forYouIf: [
      'Your space is complex, non-standard, or needs full wall integration',
      'You want sliding doors or floor-to-ceiling builds',
      'You want the absolute highest level of finish and customisation',
      'You need advanced carpentry to make everything seamless',
    ],
    includes: [
      'Supply & full installation service',
      'Fitted plinth look',
      'Maximised space utilisation',
      'Measure visit',
      'Design consultation (remote/video)',
      'Assembly & securing to wall',
      'Post-installation support',
      'External materials supplied',
      'Skirting removal & cutting',
      'Coving & picture rail removal',
      'Curtain rail removal/moving',
      'Fitting for handles (if supplied)',
      'LED lighting',
      'MDF cornice finish (if chosen)',
      'Custom frame adjustments',
      'Bespoke hinged doors',
      'Custom internal layouts',
      'High-ceiling wardrobe solutions',
      'Premium finish joinery front edges',
      'Storage add-ons (top cabinets, drawers, etc.)',
      'Fixed lighting integration',
      'Rubbish removal',
      'Old wardrobe removal (if project requires)',
      'Full bespoke integration into space',
      'Custom size infills & boxing',
      'Custom door finishes',
      'Frame-mounted sliding systems',
      'Floor-to-ceiling sliding doors',
      'Split-side wall build-outs',
      'New door hinge drilling',
      'Premium internal configuration flexibility',
      'Advanced carpentry integration',
    ],
    doesNotInclude: [
      'No exclusions — this is our highest capability package within the Pax system',
    ],
    color: '#2d5c37',
    colorHover: '#234a2c',
    colorLight: '#2d5c37',
    colorText: '#2d5c37',
  },
};

// Comparison features — true/false per package
// Order: Budget | PaxBespoke | Select
const comparisonFeatures = [
  { feature: 'Supply & installation', budget: true, paxbespoke: true, select: true },
  { feature: 'Measure visit', budget: true, paxbespoke: true, select: true },
  { feature: 'LED lighting', budget: true, paxbespoke: true, select: true },
  { feature: 'External materials supplied', budget: true, paxbespoke: true, select: true },
  { feature: 'Design consultation', budget: false, paxbespoke: true, select: true },
  { feature: 'Bespoke hinged doors', budget: false, paxbespoke: true, select: true },
  { feature: 'Custom trim colours', budget: false, paxbespoke: true, select: true },
  { feature: 'Flush filler panels', budget: false, paxbespoke: true, select: true },
  { feature: 'Skirting removal & cutting', budget: false, paxbespoke: true, select: true },
  { feature: 'Custom internal layouts', budget: false, paxbespoke: true, select: true },
  { feature: 'High-ceiling solutions', budget: false, paxbespoke: true, select: true },
  { feature: 'Rubbish removal', budget: false, paxbespoke: true, select: true },
  { feature: 'Old wardrobe removal', budget: false, paxbespoke: true, select: true },
  { feature: 'MDF cornice finish', budget: false, paxbespoke: true, select: true },
  { feature: 'Full bespoke wall integration', budget: false, paxbespoke: false, select: true },
  { feature: 'Sliding door systems', budget: false, paxbespoke: false, select: true },
  { feature: 'Floor-to-ceiling builds', budget: false, paxbespoke: false, select: true },
  { feature: 'Advanced carpentry', budget: false, paxbespoke: false, select: true },
];

/* ─── Helpers ─── */

function getCtaClass(id: string) {
  if (id === 'budget') return 'bg-[#f28c43] hover:bg-[#e07c33] shadow-lg shadow-[#f28c43]/25';
  if (id === 'select') return 'bg-[#2d5c37] hover:bg-[#234a2c] shadow-lg shadow-[#2d5c37]/25';
  return 'bg-gradient-to-r from-[#f28c43] to-[#2d5c37] hover:opacity-90 shadow-lg shadow-[#f28c43]/25';
}

function getTabClass(id: string, isActive: boolean) {
  if (!isActive) return 'text-warm-500 hover:text-warm-700';
  if (id === 'budget') return 'text-[#f28c43] border-[#f28c43]';
  if (id === 'select') return 'text-[#2d5c37] border-[#2d5c37]';
  return 'text-[#f28c43] border-[#f28c43]';
}

function getSuggestion(currentId: string): { id: string; name: string; reason: string } | null {
  if (currentId === 'budget') return { id: 'paxbespoke', name: 'PaxBespoke', reason: 'Want custom doors and a bespoke finish?' };
  if (currentId === 'paxbespoke') return { id: 'select', name: 'Select', reason: 'Need sliding doors or full wall integration?' };
  return null;
}

function getDowngrade(currentId: string): { id: string; name: string; reason: string } | null {
  if (currentId === 'select') return { id: 'paxbespoke', name: 'PaxBespoke', reason: 'Great bespoke finish at a lower price' };
  if (currentId === 'paxbespoke') return { id: 'budget', name: 'Budget', reason: 'Just need simple, practical storage?' };
  return null;
}

/* ─── Component ─── */

type ContentTab = 'overview' | 'included' | 'compare' | 'gallery' | 'process';

interface PackageDetailModalProps {
  packageId: string | null;
  onClose: () => void;
  onSwitch?: (id: string) => void;
}

export default function PackageDetailModal({ packageId, onClose, onSwitch }: PackageDetailModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<ContentTab>('overview');
  const pkg = packageId ? packageDetails[packageId] : null;

  // Reset tab when package changes
  useEffect(() => {
    setActiveTab('overview');
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [packageId]);

  // Lock body scroll
  useEffect(() => {
    if (packageId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [packageId]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSwitch = (id: string) => {
    if (onSwitch) {
      onSwitch(id);
    }
  };

  const suggestion = pkg ? getSuggestion(pkg.id) : null;
  const downgrade = pkg ? getDowngrade(pkg.id) : null;

  return (
    <AnimatePresence>
      {pkg && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[90vh] sm:max-h-[92vh] flex flex-col shadow-2xl"
          >
            {/* ── Package switcher tabs ── */}
            <div className="flex border-b border-warm-100 px-6 pt-4 pb-0 gap-1 flex-shrink-0">
              {PACKAGE_ORDER.map((id) => {
                const p = packageDetails[id];
                const isActive = pkg.id === id;
                return (
                  <button
                    key={id}
                    onClick={() => handleSwitch(id)}
                    className={`relative px-4 py-3 text-sm font-semibold font-[family-name:var(--font-heading)] transition-colors rounded-t-xl ${
                      isActive
                        ? `${getTabClass(id, true)} border-b-2`
                        : `${getTabClass(id, false)} border-b-2 border-transparent`
                    }`}
                  >
                    {p.name}
                    {id === 'select' && (
                      <span className="ml-1.5 text-[9px] font-bold bg-[#2d5c37] text-white px-1.5 py-0.5 rounded-full align-middle">
                        Recommended
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Close */}
              <button
                onClick={onClose}
                className="ml-auto w-9 h-9 rounded-full hover:bg-warm-100 flex items-center justify-center transition-colors self-center"
              >
                <X className="w-5 h-5 text-warm-500" />
              </button>
            </div>

            {/* ── Scrollable content ── */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto"
              style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
            >
              {/* Header */}
              <div className="px-6 sm:px-8 pt-6 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`text-xs font-semibold uppercase tracking-wider font-[family-name:var(--font-heading)]`} style={{ color: pkg.color }}>
                      {pkg.tagline}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-bold text-warm-900 font-[family-name:var(--font-heading)]">
                      {pkg.name}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold font-[family-name:var(--font-heading)]" style={{ color: pkg.colorText }}>
                      {pkg.priceRange}
                    </span>
                    <p className="text-[10px] text-warm-400 mt-0.5">per wardrobe, fitted</p>
                  </div>
                </div>
                <p className="text-sm text-warm-600 mt-3 leading-relaxed">{pkg.summary}</p>
              </div>

              {/* Content tabs */}
              <div className="px-6 sm:px-8 border-b border-warm-100 overflow-x-auto">
                <div className="flex gap-0 min-w-max">
                  {([
                    { key: 'overview' as ContentTab, label: 'Overview' },
                    { key: 'gallery' as ContentTab, label: "What\u0027s Possible" },
                    { key: 'process' as ContentTab, label: 'Your Process' },
                    { key: 'included' as ContentTab, label: 'Included' },
                    { key: 'compare' as ContentTab, label: 'Compare' },
                  ]).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-4 py-3 text-sm font-medium font-[family-name:var(--font-heading)] transition-colors border-b-2 ${
                        activeTab === tab.key
                          ? 'text-warm-900 border-warm-900'
                          : 'text-warm-400 border-transparent hover:text-warm-600'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              <div className="px-6 sm:px-8 py-6">
                <AnimatePresence mode="wait">
                  {activeTab === 'overview' && (
                    <motion.div
                      key="overview"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                    >
                      {/* Core value */}
                      <div className="bg-warm-50 rounded-2xl p-5 mb-5">
                        <p className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2 font-[family-name:var(--font-heading)]">
                          What you get
                        </p>
                        <p className="text-sm text-warm-700 leading-relaxed">{pkg.coreValue}</p>
                      </div>

                      {/* For you if */}
                      <div
                        className="rounded-2xl p-5 mb-5 border"
                        style={{
                          backgroundColor: `${pkg.color}08`,
                          borderColor: `${pkg.color}15`,
                        }}
                      >
                        <p className="text-xs font-semibold uppercase tracking-wider mb-3 font-[family-name:var(--font-heading)]" style={{ color: pkg.colorText }}>
                          This is for you if...
                        </p>
                        <div className="space-y-2.5">
                          {pkg.forYouIf.map((item, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: pkg.colorText }} />
                              <span className="text-sm text-warm-700">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Quick highlights */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-warm-50 rounded-xl p-4 text-center">
                          <p className="text-2xl font-bold text-warm-900 font-[family-name:var(--font-heading)]">{pkg.includes.length}</p>
                          <p className="text-xs text-warm-500 mt-0.5">features included</p>
                        </div>
                        <div className="bg-warm-50 rounded-xl p-4 text-center">
                          <p className="text-2xl font-bold text-warm-900 font-[family-name:var(--font-heading)]">{pkg.doesNotInclude.length}</p>
                          <p className="text-xs text-warm-500 mt-0.5">{pkg.doesNotInclude.length === 1 ? 'exclusion' : 'exclusions'}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'included' && (
                    <motion.div
                      key="included"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                    >
                      {/* Included */}
                      <div className="mb-6">
                        <p className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-3 font-[family-name:var(--font-heading)]">
                          What&apos;s included
                        </p>
                        <div className="space-y-2">
                          {pkg.includes.map((item, i) => {
                            const isHeader = item.endsWith(':');
                            return (
                              <div key={i} className={`flex items-start gap-2.5 ${isHeader ? 'mt-3 mb-1' : ''}`}>
                                {isHeader ? (
                                  <span className="text-xs font-bold text-warm-700 uppercase tracking-wider font-[family-name:var(--font-heading)]">{item}</span>
                                ) : (
                                  <>
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: `${pkg.color}12` }}>
                                      <Check className="w-3 h-3" style={{ color: pkg.colorText }} />
                                    </div>
                                    <span className="text-sm text-warm-700">{item}</span>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Not included */}
                      <div className="border-t border-warm-100 pt-5">
                        <p className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-3 font-[family-name:var(--font-heading)]">
                          Not included
                        </p>
                        <div className="space-y-2">
                          {pkg.doesNotInclude.map((item, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                              <div className="w-5 h-5 rounded-full bg-warm-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Minus className="w-3 h-3 text-warm-400" />
                              </div>
                              <span className="text-sm text-warm-500">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-amber-800 space-y-1.5">
                            <p><strong>Carpet installations:</strong> Installations over carpet may cause long-term compression. If carpet needs cutting or removal later, costs apply.</p>
                            <p><strong>Carpet refitting:</strong> Carpet can be placed back after fitting, but professional refitting is recommended for best finish.</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'compare' && (
                    <motion.div
                      key="compare"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="overflow-x-auto -mx-2">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b-2 border-warm-200">
                              <th className="text-left py-3 pr-3 font-semibold text-warm-700 font-[family-name:var(--font-heading)] text-xs">Feature</th>
                              {PACKAGE_ORDER.map((id) => {
                                const p = packageDetails[id];
                                const isCurrent = id === pkg.id;
                                return (
                                  <th
                                    key={id}
                                    className={`text-center py-3 px-2 font-semibold font-[family-name:var(--font-heading)] text-xs ${
                                      isCurrent ? 'text-warm-900' : 'text-warm-400'
                                    }`}
                                  >
                                    <span style={isCurrent ? { color: p.colorText } : undefined}>{p.name}</span>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {comparisonFeatures.map((row) => (
                              <tr key={row.feature} className="border-b border-warm-50">
                                <td className="py-2.5 pr-3 text-warm-600 text-xs">{row.feature}</td>
                                {PACKAGE_ORDER.map((id) => {
                                  const has = row[id as keyof typeof row] as boolean;
                                  const isCurrent = id === pkg.id;
                                  const p = packageDetails[id];
                                  return (
                                    <td key={id} className={`py-2.5 px-2 text-center ${isCurrent ? 'bg-warm-50/50' : ''}`}>
                                      {has ? (
                                        <Check className="w-3.5 h-3.5 mx-auto" style={{ color: p.colorText }} />
                                      ) : (
                                        <Minus className="w-3.5 h-3.5 text-warm-200 mx-auto" />
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                            <tr className="border-t-2 border-warm-200">
                              <td className="py-3 pr-3 font-semibold text-warm-700 font-[family-name:var(--font-heading)] text-xs">Price from</td>
                              {PACKAGE_ORDER.map((id) => {
                                const p = packageDetails[id];
                                const isCurrent = id === pkg.id;
                                return (
                                  <td key={id} className={`py-3 px-2 text-center font-bold font-[family-name:var(--font-heading)] text-xs ${isCurrent ? 'bg-warm-50/50' : ''}`} style={{ color: p.colorText }}>
                                    {p.priceRange.replace('From ', '')}
                                  </td>
                                );
                              })}
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Tip */}
                      <div className="mt-5 bg-warm-50 rounded-xl p-4 flex items-start gap-2.5">
                        <Lightbulb className="w-4 h-4 text-warm-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-warm-500">
                          Not sure which is right? Book a free consultation and we&apos;ll recommend the best package for your space and budget.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'gallery' && (
                    <motion.div
                      key="gallery"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                    >
                      {(() => {
                        const types = getProjectTypesForPackage(pkg.id);
                        if (types.length === 0) return (
                          <p className="text-sm text-warm-500 text-center py-8">No project examples for this package yet.</p>
                        );
                        return (
                          <div className="space-y-4">
                            <p className="text-xs text-warm-500 mb-4">
                              {pkg.id === 'budget'
                                ? 'Budget installations use standard IKEA configurations. Here\u0027s what a typical result looks like.'
                                : `See what\u0027s possible with the ${pkg.name} package. Each project type shows a different way we can transform your space.`
                              }
                            </p>
                            {types.map((pt) => (
                              <details key={pt.id} className="group bg-warm-50 rounded-xl border border-warm-100 overflow-hidden">
                                <summary className="flex items-center gap-3 p-4 cursor-pointer hover:bg-warm-100/50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                                  {pt.images[0] && (
                                    <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-warm-200">
                                      <Image
                                        src={pt.images[0]}
                                        alt={pt.title}
                                        width={56}
                                        height={56}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-semibold text-warm-900 font-[family-name:var(--font-heading)]">{pt.title}</h4>
                                    <p className="text-xs text-warm-500 truncate">{pt.benefit}</p>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-warm-400 transition-transform group-open:rotate-90 flex-shrink-0" />
                                </summary>
                                <div className="px-4 pb-4 pt-1">
                                  <p className="text-sm text-warm-600 leading-relaxed mb-3">{pt.description}</p>
                                  {pt.images.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2">
                                      {pt.images.map((img, i) => (
                                        <div key={i} className="rounded-lg overflow-hidden bg-warm-200 aspect-[4/3]">
                                          <Image
                                            src={img}
                                            alt={`${pt.title} example ${i + 1}`}
                                            width={300}
                                            height={225}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </details>
                            ))}
                          </div>
                        );
                      })()}
                    </motion.div>
                  )}

                  {activeTab === 'process' && (
                    <motion.div
                      key="process"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                    >
                      <p className="text-xs text-warm-500 mb-5">
                        Here&apos;s exactly what happens after you submit the booking form for the {pkg.name} package.
                      </p>
                      <div className="space-y-0">
                        {(processSteps[pkg.id] || []).map((step, i, arr) => (
                          <div key={step.step} className="relative flex gap-4 pb-6 last:pb-0">
                            {/* Timeline */}
                            <div className="flex flex-col items-center flex-shrink-0">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold font-[family-name:var(--font-heading)] z-10"
                                style={{ backgroundColor: pkg.colorText }}
                              >
                                {step.step}
                              </div>
                              {i < arr.length - 1 && (
                                <div className="w-px flex-1 mt-1" style={{ backgroundColor: `${pkg.colorText}20` }} />
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 pb-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-semibold text-warm-900 font-[family-name:var(--font-heading)]">
                                  {step.title}
                                </h4>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full font-[family-name:var(--font-heading)] ${
                                  step.who === 'customer'
                                    ? 'bg-amber-100 text-amber-700'
                                    : step.who === 'paxbespoke'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {step.who === 'customer' ? 'You' : step.who === 'paxbespoke' ? 'Us' : 'Together'}
                                </span>
                              </div>
                              <p className="text-xs text-warm-600 mb-2">{step.description}</p>
                              <ul className="space-y-1">
                                {step.details.map((d, j) => (
                                  <li key={j} className="flex items-start gap-2 text-xs text-warm-500">
                                    <span className="text-warm-300 mt-0.5">—</span>
                                    {d}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Legend */}
                      <div className="flex items-center gap-4 mt-5 pt-4 border-t border-warm-100">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-amber-600" />
                          <span className="text-[10px] text-warm-500 font-[family-name:var(--font-heading)]">You handle</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3 h-3 text-green-600" />
                          <span className="text-[10px] text-warm-500 font-[family-name:var(--font-heading)]">We handle</span>
                        </div>
                      </div>

                      {/* Package-specific FAQs */}
                      {(packageFAQs[pkg.id] || []).length > 0 && (
                        <div className="mt-6 pt-5 border-t border-warm-100">
                          <p className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-3 font-[family-name:var(--font-heading)]">
                            Common questions about {pkg.name}
                          </p>
                          <div className="space-y-3">
                            {(packageFAQs[pkg.id] || []).map((faq, i) => (
                              <details key={i} className="group">
                                <summary className="flex items-start gap-2 cursor-pointer text-sm font-medium text-warm-700 hover:text-warm-900 transition-colors list-none [&::-webkit-details-marker]:hidden">
                                  <HelpCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-warm-400 group-open:text-warm-600" />
                                  {faq.question}
                                </summary>
                                <p className="text-xs text-warm-500 leading-relaxed mt-1.5 pl-5.5 ml-[22px]">
                                  {faq.answer}
                                </p>
                              </details>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ── Sticky bottom bar ── */}
            <div className="flex-shrink-0 border-t border-warm-100 px-6 sm:px-8 py-4 bg-white rounded-b-3xl">
              {/* CTA */}
              <Link
                href={`/book?package=${pkg.id}`}
                className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 text-white font-semibold rounded-2xl transition-all font-[family-name:var(--font-heading)] text-sm ${getCtaClass(pkg.id)}`}
              >
                Book Free Consultation
                <ArrowRight className="w-4 h-4" />
              </Link>

              {/* Not for me? navigation */}
              {(downgrade || suggestion) && (
                <div className="flex items-center justify-center gap-3 mt-3">
                  {downgrade && (
                    <button
                      onClick={() => handleSwitch(downgrade.id)}
                      className="text-xs text-warm-400 hover:text-warm-600 transition-colors font-[family-name:var(--font-heading)] flex items-center gap-1"
                    >
                      <ChevronRight className="w-3 h-3 rotate-180" />
                      {downgrade.reason}
                    </button>
                  )}
                  {downgrade && suggestion && (
                    <span className="text-warm-200">|</span>
                  )}
                  {suggestion && (
                    <button
                      onClick={() => handleSwitch(suggestion.id)}
                      className="text-xs text-warm-400 hover:text-warm-600 transition-colors font-[family-name:var(--font-heading)] flex items-center gap-1"
                    >
                      {suggestion.reason}
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              <p className="text-center text-[10px] text-warm-300 mt-2">
                Prices confirmed after consultation. No obligation.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
