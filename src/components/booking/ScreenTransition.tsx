'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface ScreenTransitionProps {
  stepKey: number;
  children: React.ReactNode;
  direction?: 1 | -1;
}

export default function ScreenTransition({ stepKey, children, direction = 1 }: ScreenTransitionProps) {
  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={stepKey}
        custom={direction}
        initial={{ opacity: 0, x: direction * 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: direction * -40 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
