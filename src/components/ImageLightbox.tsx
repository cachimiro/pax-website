'use client';

import { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageLightboxProps {
  images: string[];
  captions?: string[];
  initialIndex: number;
  onClose: () => void;
}

export default function ImageLightbox({ images, captions, initialIndex, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);

  const goNext = useCallback(() => {
    if (index < images.length - 1) {
      setDirection(1);
      setIndex((i) => i + 1);
    }
  }, [index, images.length]);

  const goPrev = useCallback(() => {
    if (index > 0) {
      setDirection(-1);
      setIndex((i) => i - 1);
    }
  }, [index]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose, goNext, goPrev]);

  const caption = captions?.[index];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90"
        onClick={onClose}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          aria-label="Close lightbox"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Counter */}
        {images.length > 1 && (
          <div className="absolute top-4 left-4 z-10 text-white/60 text-sm font-[family-name:var(--font-heading)]">
            {index + 1} / {images.length}
          </div>
        )}

        {/* Image area */}
        <div
          className="relative flex-1 w-full flex items-center justify-center px-4 sm:px-16"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Prev arrow */}
          {index > 0 && (
            <button
              onClick={goPrev}
              className="absolute left-2 sm:left-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Next arrow */}
          {index < images.length - 1 && (
            <button
              onClick={goNext}
              className="absolute right-2 sm:right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          )}

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={index}
              custom={direction}
              initial={{ opacity: 0, x: direction * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -60 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-3xl aspect-[3/4] sm:aspect-[4/3]"
            >
              <Image
                src={images[index]}
                alt={caption || `Image ${index + 1}`}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 80vw"
                priority
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Caption */}
        {caption && (
          <motion.div
            key={`caption-${index}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full max-w-2xl px-6 pb-6 pt-3 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm sm:text-base text-white/80 font-[family-name:var(--font-heading)] leading-relaxed">
              {caption}
            </p>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
