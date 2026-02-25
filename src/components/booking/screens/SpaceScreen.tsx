'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Ruler, MessageCircle, ArrowRight, Upload, X } from 'lucide-react';
import MiniTestimonial from '../MiniTestimonial';

interface SpaceScreenProps {
  onNext: (data: { photos: File[]; measurements: string; shareOnCall: boolean }) => void;
}

type Mode = 'photos' | 'measurements' | 'call' | null;

export default function SpaceScreen({ onNext }: SpaceScreenProps) {
  const [mode, setMode] = useState<Mode>('call'); // Default to lowest friction
  const [photos, setPhotos] = useState<File[]>([]);
  const [measurements, setMeasurements] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos(Array.from(e.target.files).slice(0, 5));
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleContinue = () => {
    onNext({
      photos,
      measurements,
      shareOnCall: mode === 'call',
    });
  };

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
        Tell us about your space
      </h2>
      <p className="text-sm text-warm-500 mb-1">
        Whatever you have is perfect. Pick what works for you — nothing is required.
      </p>
      <p className="text-xs text-warm-400 mb-6 font-[family-name:var(--font-heading)]">
        Why we ask: Photos or rough sizes help us give you a more accurate price range on the call. A phone photo like you&apos;d send a friend is perfect.
      </p>

      {/* Three option tabs */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[
          { id: 'photos' as Mode, icon: Camera, label: 'I have photos' },
          { id: 'measurements' as Mode, icon: Ruler, label: 'I have sizes' },
          { id: 'call' as Mode, icon: MessageCircle, label: "I'll share on call" },
        ].map((opt) => (
          <motion.button
            key={opt.id}
            onClick={() => setMode(opt.id)}
            whileTap={{ scale: 0.96 }}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
              mode === opt.id
                ? 'border-green-700 bg-green-50/60'
                : 'border-warm-100 bg-white hover:border-warm-200'
            }`}
          >
            <opt.icon className={`w-5 h-5 ${mode === opt.id ? 'text-green-700' : 'text-warm-400'}`} />
            <span className={`text-xs font-semibold font-[family-name:var(--font-heading)] ${
              mode === opt.id ? 'text-green-700' : 'text-warm-600'
            }`}>
              {opt.label}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Photo upload panel */}
      {mode === 'photos' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-4"
        >
          <label className="block w-full cursor-pointer">
            <div className="border-2 border-dashed border-warm-200 rounded-2xl p-8 text-center hover:border-[#0C6B4E] hover:bg-green-50/30 transition-colors">
              <Upload className="w-6 h-6 text-warm-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-warm-700 font-[family-name:var(--font-heading)]">
                Tap to upload photos
              </p>
              <p className="text-xs text-warm-400 mt-1">Phone photos are perfect. Up to 5 images.</p>
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
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
                    onClick={() => removePhoto(i)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-warm-800 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Measurements panel */}
      {mode === 'measurements' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-4"
        >
          {/* Visual measuring guide */}
          <div className="bg-warm-50 rounded-xl p-5">
            <div className="flex items-center gap-4 mb-3">
              <svg viewBox="0 0 80 60" className="w-20 h-15 text-warm-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="10" y="5" width="60" height="50" rx="2" />
                {/* Width arrow */}
                <line x1="10" y1="58" x2="70" y2="58" strokeDasharray="3 2" />
                <text x="40" y="58" textAnchor="middle" fill="currentColor" fontSize="6" className="font-semibold">Width</text>
                {/* Height arrow */}
                <line x1="75" y1="5" x2="75" y2="55" strokeDasharray="3 2" />
                <text x="78" y="32" fill="currentColor" fontSize="6" className="font-semibold" transform="rotate(90, 78, 32)">Height</text>
                {/* Depth arrow */}
                <line x1="10" y1="2" x2="25" y2="2" strokeDasharray="3 2" />
                <text x="17" y="1" textAnchor="middle" fill="currentColor" fontSize="5">Depth</text>
              </svg>
              <div>
                <p className="text-sm font-medium text-warm-700 font-[family-name:var(--font-heading)]">Rough is fine</p>
                <p className="text-xs text-warm-500">Width, height, and depth of the space. We&apos;ll refine on the call.</p>
              </div>
            </div>
          </div>
          <textarea
            value={measurements}
            onChange={(e) => setMeasurements(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-2xl border-2 border-warm-100 bg-white text-warm-900 text-sm resize-none focus:border-[#0C6B4E] focus:outline-none transition-colors"
            placeholder="e.g. Wall is about 250cm wide, 240cm high, 60cm deep"
          />
        </motion.div>
      )}

      {/* Share on call panel */}
      {mode === 'call' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-green-50 rounded-xl p-5"
        >
          <p className="text-sm text-green-900 font-medium font-[family-name:var(--font-heading)]">
            No problem at all
          </p>
          <p className="text-sm text-green-700 mt-1">
            We&apos;ll walk you through everything on the video call. Just have your phone handy to show us the space.
          </p>
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
        className="w-full mt-6 px-6 py-4 bg-orange-500 text-white font-semibold rounded-2xl hover:bg-orange-600 transition-colors text-base font-[family-name:var(--font-heading)] flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
      >
        Continue
        <ArrowRight className="w-4 h-4" />
      </motion.button>
    </div>
  );
}
