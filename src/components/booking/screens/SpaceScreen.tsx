'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Camera, Ruler, ArrowRight, Upload, X, Link2, Home,
  Mountain, Building2, Columns3, ArrowUpFromLine, DoorOpen,
  LayoutGrid, AlertTriangle, Info, ExternalLink,
} from 'lucide-react';
import MiniTestimonial from '../MiniTestimonial';

interface SpaceScreenProps {
  packageChoice: string;
  onNext: (data: {
    photos: File[];
    measurements: string;
    shareOnCall: boolean;
    plannerLink?: string;
    homeVisit?: boolean;
    doorFinishType?: string;
    doorModel?: string;
    spaceConstraints?: string[];
  }) => void;
}

const spaceConstraintOptions = [
  { id: 'sloped-ceiling', label: 'Sloped / angled ceiling (loft)', icon: Mountain },
  { id: 'tall-ceiling', label: 'Tall ceiling', icon: ArrowUpFromLine },
  { id: 'chimney-breast', label: 'Chimney breast', icon: Building2 },
  { id: 'bulkhead', label: 'Bulkhead (stairs)', icon: LayoutGrid },
  { id: 'alcoves', label: 'Alcoves', icon: Columns3 },
  { id: 'limited-door-space', label: 'Limited space for doors', icon: DoorOpen },
  { id: 'none', label: 'None of the above — straightforward space', icon: Home },
];

function PhotoUpload({
  photos,
  onChange,
  onRemove,
}: {
  photos: File[];
  onChange: (files: File[]) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="block w-full cursor-pointer">
        <div className="border-2 border-dashed border-warm-200 rounded-2xl p-6 text-center hover:border-[#0C6B4E] hover:bg-green-50/30 transition-colors">
          <Upload className="w-5 h-5 text-warm-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-warm-700 font-[family-name:var(--font-heading)]">
            Tap to upload photos
          </p>
          <p className="text-xs text-warm-400 mt-1">Phone photos are perfect. Up to 5 images.</p>
        </div>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            if (e.target.files) onChange(Array.from(e.target.files).slice(0, 5));
          }}
          className="hidden"
        />
      </label>
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((file, i) => (
            <div key={i} className="relative w-16 h-16 rounded-lg bg-warm-100 overflow-hidden">
              <img
                src={URL.createObjectURL(file)}
                alt={`Upload ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => onRemove(i)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-warm-800 text-white rounded-full flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SpaceConstraints({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <h3 className="text-base font-semibold text-warm-800 mb-1 font-[family-name:var(--font-heading)]">
        Does your space have any of these?
      </h3>
      <p className="text-xs text-warm-400 mb-3">
        Helps us tailor advice for your specific room.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {spaceConstraintOptions.map((opt) => {
          const isSelected = selected.includes(opt.id);
          return (
            <motion.button
              key={opt.id}
              onClick={() => onToggle(opt.id)}
              whileTap={{ scale: 0.97 }}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? 'border-green-700 bg-green-50/60'
                  : 'border-warm-100 bg-white hover:border-warm-200'
              }`}
            >
              <opt.icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-green-700' : 'text-warm-400'}`} />
              <span className={`text-xs font-medium font-[family-name:var(--font-heading)] ${
                isSelected ? 'text-green-700' : 'text-warm-600'
              }`}>
                {opt.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Budget layout ──────────────────────────────────────────────────────────────

function BudgetSpaceLayout({ onNext }: { onNext: SpaceScreenProps['onNext'] }) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [measurements, setMeasurements] = useState('');
  const [plannerLink, setPlannerLink] = useState('');
  const [spaceConstraints, setSpaceConstraints] = useState<string[]>([]);

  const toggleConstraint = (id: string) => {
    if (id === 'none') { setSpaceConstraints(['none']); return; }
    setSpaceConstraints((prev) => {
      const filtered = prev.filter((c) => c !== 'none');
      return filtered.includes(id) ? filtered.filter((c) => c !== id) : [...filtered, id];
    });
  };

  const handleContinue = () => {
    onNext({ photos, measurements, shareOnCall: false, plannerLink: plannerLink.trim() || undefined, spaceConstraints });
  };

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
          Your space
        </h2>
        <p className="text-sm text-warm-500">
          Share what you have — we&apos;ll cover anything missing on the call.
        </p>
      </div>

      {/* Measurements */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex items-center gap-2 mb-2">
          <Ruler className="w-4 h-4 text-warm-500" />
          <h3 className="text-base font-semibold text-warm-800 font-[family-name:var(--font-heading)]">
            Room measurements
          </h3>
        </div>
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <span className="font-semibold">Important:</span> For the Budget Package, you are responsible for accurate measurements. We strongly recommend measuring carefully — errors can affect the final installation.
          </p>
        </div>
        <textarea
          value={measurements}
          onChange={(e) => setMeasurements(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 rounded-2xl border-2 border-warm-100 bg-white text-warm-900 text-sm resize-none focus:border-[#0C6B4E] focus:outline-none transition-colors"
          placeholder="e.g. Wall is 250cm wide, 240cm high, 60cm deep"
        />
        <p className="text-[11px] text-warm-400 mt-1">
          Rough is fine for now — we&apos;ll confirm on the design check call.
        </p>
      </motion.div>

      {/* Photos */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="flex items-center gap-2 mb-2">
          <Camera className="w-4 h-4 text-warm-500" />
          <h3 className="text-base font-semibold text-warm-800 font-[family-name:var(--font-heading)]">
            Photos of the space
          </h3>
        </div>
        <p className="text-xs text-warm-400 mb-3">
          Show us where the wardrobes will go. Phone photos are perfect.
        </p>
        <PhotoUpload
          photos={photos}
          onChange={setPhotos}
          onRemove={(i) => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
        />
      </motion.div>

      {/* Space constraints */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <SpaceConstraints selected={spaceConstraints} onToggle={toggleConstraint} />
      </motion.div>

      {/* IKEA Planner — optional, but encouraged */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="flex items-center gap-2 mb-2">
          <Link2 className="w-4 h-4 text-warm-500" />
          <h3 className="text-base font-semibold text-warm-800 font-[family-name:var(--font-heading)]">
            IKEA PAX Planner link
            <span className="text-warm-400 font-normal text-sm ml-1">(optional)</span>
          </h3>
        </div>
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 mb-3">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800 leading-relaxed space-y-2">
            <p>
              The Budget Package works best when you&apos;ve created a layout in the IKEA PAX Planner. We&apos;ll review it together on the call, check nothing is missed, and prepare your quote.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <a
                href="https://www.ikea.com/addon-app/storageone/pax/web/latest/gb/en/#/planner"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-700 font-semibold underline"
              >
                PAX Planner (wardrobes)
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://www.ikea.com/addon-app/skytta/web/latest/gb/en/#/planner"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-700 font-semibold underline"
              >
                SKYTTA Planner (sliding doors)
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-blue-600">Don&apos;t have one yet? No problem — we&apos;ll follow up before the call.</p>
          </div>
        </div>
        <div className="relative">
          <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" />
          <input
            type="url"
            value={plannerLink}
            onChange={(e) => { setPlannerLink(e.target.value); }}
            placeholder="Paste your IKEA Planner link here (if you have one)"
            className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-warm-200 text-base sm:text-sm bg-white transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          />
        </div>
      </motion.div>

      <MiniTestimonial
        quote="I sent my IKEA plan and a few photos — they spotted two things I'd missed before we even got on the call."
        name="James T."
        location="Manchester"
      />

      <motion.button
        onClick={handleContinue}
        whileTap={{ scale: 0.98 }}
        className="w-full px-6 py-4 bg-orange-500 text-white font-semibold rounded-2xl hover:bg-orange-600 transition-colors text-base font-[family-name:var(--font-heading)] flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
      >
        Continue
        <ArrowRight className="w-4 h-4" />
      </motion.button>
    </div>
  );
}

// ─── Standard / Select layout ───────────────────────────────────────────────────

function StandardSpaceLayout({
  packageChoice,
  onNext,
}: {
  packageChoice: string;
  onNext: SpaceScreenProps['onNext'];
}) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [measurements, setMeasurements] = useState('');
  const [homeVisit, setHomeVisit] = useState(false);
  const [doorFinishType, setDoorFinishType] = useState('');
  const [doorModel, setDoorModel] = useState('');
  const [spaceConstraints, setSpaceConstraints] = useState<string[]>([]);

  const isSelect = packageChoice === 'select';

  const toggleConstraint = (id: string) => {
    if (id === 'none') { setSpaceConstraints(['none']); return; }
    setSpaceConstraints((prev) => {
      const filtered = prev.filter((c) => c !== 'none');
      return filtered.includes(id) ? filtered.filter((c) => c !== id) : [...filtered, id];
    });
  };

  const handleContinue = () => {
    onNext({
      photos,
      measurements,
      shareOnCall: !measurements && photos.length === 0,
      homeVisit,
      doorFinishType: isSelect ? doorFinishType : undefined,
      doorModel: isSelect ? doorModel : undefined,
      spaceConstraints,
    });
  };

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
          Your space
        </h2>
        <p className="text-sm text-warm-500">
          Nothing here is required — share what you have and we&apos;ll cover the rest on the call.
        </p>
      </div>

      {/* Measurements */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex items-center gap-2 mb-2">
          <Ruler className="w-4 h-4 text-warm-500" />
          <h3 className="text-base font-semibold text-warm-800 font-[family-name:var(--font-heading)]">
            Rough room measurements <span className="text-warm-400 font-normal text-sm">(optional)</span>
          </h3>
        </div>
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4 mb-3">
          <Info className="w-4 h-4 text-green-700 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-green-800 leading-relaxed">
            You are <span className="font-semibold">not responsible</span> for final measurements. We confirm everything during a home visit or online consultation before any order is placed.
          </p>
        </div>
        <textarea
          value={measurements}
          onChange={(e) => setMeasurements(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 rounded-2xl border-2 border-warm-100 bg-white text-warm-900 text-sm resize-none focus:border-[#0C6B4E] focus:outline-none transition-colors"
          placeholder="e.g. Wall is about 250cm wide, 240cm high, 60cm deep"
        />
        <p className="text-[11px] text-warm-400 mt-1">
          Rough is fine — helps us prepare examples before the call.
        </p>
      </motion.div>

      {/* Photos */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="flex items-center gap-2 mb-2">
          <Camera className="w-4 h-4 text-warm-500" />
          <h3 className="text-base font-semibold text-warm-800 font-[family-name:var(--font-heading)]">
            Photos of the space <span className="text-warm-400 font-normal text-sm">(optional)</span>
          </h3>
        </div>
        <p className="text-xs text-warm-400 mb-3">
          Show us where the wardrobes will go. Phone photos are perfect.
        </p>
        <PhotoUpload
          photos={photos}
          onChange={setPhotos}
          onRemove={(i) => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
        />
      </motion.div>

      {/* Space constraints */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <SpaceConstraints selected={spaceConstraints} onToggle={toggleConstraint} />
      </motion.div>

      {/* Home visit */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative mt-0.5">
            <input
              type="checkbox"
              checked={homeVisit}
              onChange={(e) => setHomeVisit(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-5 h-5 rounded-lg border-2 border-warm-300 bg-white peer-checked:bg-green-700 peer-checked:border-green-700 transition-all flex items-center justify-center">
              {homeVisit && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
          <div>
            <span className="flex items-center gap-1.5 text-sm text-warm-700 font-medium">
              <Home className="w-4 h-4 text-green-600" />
              Request a home visit before the online consultation
            </span>
            <span className="text-xs text-warm-400 block mt-0.5">
              We may also recommend one for complex spaces. Eligibility confirmed after the call.
            </span>
          </div>
        </label>
      </motion.div>

      {/* Select: door finish */}
      {isSelect && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-warm-800 mb-1 font-[family-name:var(--font-heading)]">
              Door finish <span className="text-warm-400 font-normal text-sm">(optional)</span>
            </h3>
            <p className="text-xs text-warm-400 mb-3">
              We&apos;ll go through this in detail on the call — this just helps us prepare.
            </p>

            {/* Spray-painted card */}
            <motion.button
              onClick={() => setDoorFinishType('spray-painted')}
              whileTap={{ scale: 0.98 }}
              className={`w-full text-left rounded-2xl border-2 p-4 mb-2 transition-all ${
                doorFinishType === 'spray-painted'
                  ? 'border-green-700 bg-green-50/50'
                  : 'border-warm-100 bg-white hover:border-warm-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                  doorFinishType === 'spray-painted' ? 'border-green-700 bg-green-700' : 'border-warm-300'
                }`}>
                  {doorFinishType === 'spray-painted' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-warm-900 mb-1 font-[family-name:var(--font-heading)]">
                    Spray-painted doors
                    <span className="ml-2 text-[10px] font-bold bg-green-700 text-white px-2 py-0.5 rounded-full">Fully bespoke</span>
                  </p>
                  <p className="text-xs text-warm-500 mb-2 leading-relaxed">
                    Any door style, any colour. Made from moisture-resistant Finsa MDF with a durable spray finish. We colour-match to Farrow &amp; Ball, Dulux, Lick, Little Greene, and more.
                  </p>
                  <p className="text-xs text-warm-400">
                    Style inspiration: use the vinyl visualiser below as a reference, or share a Pinterest link, Instagram photo, or any door you like — we can match it.
                  </p>
                </div>
              </div>
            </motion.button>

            {/* Vinyl card */}
            <motion.button
              onClick={() => setDoorFinishType('vinyl')}
              whileTap={{ scale: 0.98 }}
              className={`w-full text-left rounded-2xl border-2 p-4 mb-2 transition-all ${
                doorFinishType === 'vinyl'
                  ? 'border-green-700 bg-green-50/50'
                  : 'border-warm-100 bg-white hover:border-warm-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                  doorFinishType === 'vinyl' ? 'border-green-700 bg-green-700' : 'border-warm-300'
                }`}>
                  {doorFinishType === 'vinyl' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-warm-900 mb-1 font-[family-name:var(--font-heading)]">
                    Vinyl-wrapped doors
                    <span className="ml-2 text-[10px] font-semibold text-warm-400 border border-warm-200 px-2 py-0.5 rounded-full">Limited range</span>
                  </p>
                  <p className="text-xs text-warm-500 mb-2 leading-relaxed">
                    A selection of door styles and colours from our vinyl range. More limited than spray-painted in both style and colour options.
                  </p>
                  <a
                    href="https://www.auniquechoice.co.uk/doors/aspire/door-visualiser"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs text-green-700 font-semibold underline"
                  >
                    Browse vinyl door styles &amp; colours
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </motion.button>

            {/* Not sure */}
            <motion.button
              onClick={() => setDoorFinishType('unsure')}
              whileTap={{ scale: 0.98 }}
              className={`w-full text-left rounded-2xl border-2 p-3 transition-all ${
                doorFinishType === 'unsure'
                  ? 'border-green-700 bg-green-50/50'
                  : 'border-warm-100 bg-white hover:border-warm-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                  doorFinishType === 'unsure' ? 'border-green-700 bg-green-700' : 'border-warm-300'
                }`}>
                  {doorFinishType === 'unsure' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span className="text-sm font-semibold text-warm-700 font-[family-name:var(--font-heading)]">
                  Not sure yet — we&apos;ll go through options on the call
                </span>
              </div>
            </motion.button>
          </div>

          {/* Door style reference — shown for spray-painted or unsure */}
          {(doorFinishType === 'spray-painted' || doorFinishType === 'unsure' || doorFinishType === '') && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
              <label className="block text-sm font-medium text-warm-700 mb-1.5 font-[family-name:var(--font-heading)]">
                Door style inspiration <span className="text-warm-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={doorModel}
                onChange={(e) => setDoorModel(e.target.value)}
                placeholder="Pinterest link, Instagram, shaker style, or describe what you like"
                className="w-full px-4 py-3 rounded-2xl border border-warm-200 text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all bg-white"
              />
              <p className="text-[11px] text-warm-400 mt-1.5">
                You can also use the{' '}
                <a
                  href="https://www.auniquechoice.co.uk/doors/aspire/door-visualiser"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-700 underline"
                >
                  vinyl door visualiser
                </a>
                {' '}as a style reference — we can replicate any of those styles in spray-painted.
              </p>
            </motion.div>
          )}
        </motion.div>
      )}

      <MiniTestimonial
        quote="I just sent a few phone photos and they worked out everything from there."
        name="Sarah M."
        location="Altrincham"
      />

      <motion.button
        onClick={handleContinue}
        whileTap={{ scale: 0.98 }}
        className="w-full px-6 py-4 bg-orange-500 text-white font-semibold rounded-2xl hover:bg-orange-600 transition-colors text-base font-[family-name:var(--font-heading)] flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
      >
        Continue
        <ArrowRight className="w-4 h-4" />
      </motion.button>
    </div>
  );
}

// ─── Root export ────────────────────────────────────────────────────────────────

export default function SpaceScreen({ packageChoice, onNext }: SpaceScreenProps) {
  if (packageChoice === 'budget') {
    return <BudgetSpaceLayout onNext={onNext} />;
  }
  return <StandardSpaceLayout packageChoice={packageChoice} onNext={onNext} />;
}
