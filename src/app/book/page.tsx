'use client';

import { useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { trackEvent } from '@/lib/analytics';

import ProgressRing from '@/components/booking/ProgressRing';
import ScreenTransition from '@/components/booking/ScreenTransition';
import WelcomeScreen from '@/components/booking/screens/WelcomeScreen';
import PostcodeScreen from '@/components/booking/screens/PostcodeScreen';
import RoomScreen from '@/components/booking/screens/RoomScreen';
import PackageScreen from '@/components/booking/screens/PackageScreen';
import SpaceScreen from '@/components/booking/screens/SpaceScreen';
import DetailsScreen from '@/components/booking/screens/DetailsScreen';
import CalendarScreen from '@/components/booking/screens/CalendarScreen';
import ConfirmationScreen from '@/components/booking/screens/ConfirmationScreen';

/*
  Flow:
  0 = Welcome (education layer)
  1 = Postcode check
  2 = Room type (visual picker)
  3 = Package selector
  4 = Space info (photos/measurements/skip)
  5 = Contact details
  6 = Calendar picker
  7 = Confirmation
*/

const TOTAL_STEPS = 6; // Steps 1-6 (welcome and confirmation don't count)

const stepLabels: Record<number, string> = {
  1: 'Location',
  2: 'Room type',
  3: 'Package',
  4: 'Your space',
  5: 'Details',
  6: 'Book a time',
};

function BookingFlowInner() {
  const searchParams = useSearchParams();
  const preselectedPackage = searchParams.get('package') || '';

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const [formData, setFormData] = useState({
    postcode: '',
    postcodeLocation: '',
    room: '',
    packageChoice: preselectedPackage || '',
    photos: [] as File[],
    measurements: '',
    shareOnCall: false,
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
  });

  const goTo = useCallback((nextStep: number) => {
    setDirection(nextStep > step ? 1 : -1);
    setStep(nextStep);
    if (nextStep > 0 && nextStep < 7) {
      trackEvent('consult_step', { step: nextStep, label: stepLabels[nextStep] || '' });
    }
  }, [step]);

  const goBack = useCallback(() => {
    if (step > 0) goTo(step - 1);
  }, [step, goTo]);

  const updateField = useCallback((field: string, value: string | boolean | File[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Show progress ring for steps 1-6
  const showProgress = step >= 1 && step <= 6;
  const showBack = step >= 1 && step <= 6;

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-warm-white">
      {/* Top bar with progress + back */}
      {(showProgress || showBack) && (
        <div className="sticky top-16 md:top-20 z-40 bg-warm-white/95 backdrop-blur-sm border-b border-warm-100">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            {showBack ? (
              <motion.button
                onClick={goBack}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 text-sm text-warm-500 hover:text-warm-700 transition-colors font-[family-name:var(--font-heading)] font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </motion.button>
            ) : (
              <div />
            )}
            {showProgress && (
              <ProgressRing
                current={step}
                total={TOTAL_STEPS}
                label={stepLabels[step]}
              />
            )}
          </div>
        </div>
      )}

      {/* Screen content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <ScreenTransition stepKey={step} direction={direction}>
          {step === 0 && (
            <WelcomeScreen
              onNext={() => {
                trackEvent('consult_start');
                goTo(1);
              }}
            />
          )}

          {step === 1 && (
            <PostcodeScreen
              onNext={(postcode, location) => {
                updateField('postcode', postcode);
                updateField('postcodeLocation', location);
                goTo(2);
              }}
            />
          )}

          {step === 2 && (
            <RoomScreen
              value={formData.room}
              onChange={(v) => updateField('room', v)}
              onNext={() => goTo(3)}
            />
          )}

          {step === 3 && (
            <PackageScreen
              value={formData.packageChoice}
              onChange={(v) => updateField('packageChoice', v)}
              onNext={() => goTo(4)}
              postcodeLocation={formData.postcodeLocation}
            />
          )}

          {step === 4 && (
            <SpaceScreen
              onNext={(data) => {
                updateField('photos', data.photos);
                updateField('measurements', data.measurements);
                updateField('shareOnCall', data.shareOnCall);
                goTo(5);
              }}
            />
          )}

          {step === 5 && (
            <DetailsScreen
              name={formData.name}
              email={formData.email}
              phone={formData.phone}
              onChange={(field, value) => updateField(field, value)}
              onNext={() => goTo(6)}
            />
          )}

          {step === 6 && (
            <CalendarScreen
              onNext={(date, time) => {
                updateField('date', date);
                updateField('time', time);
                // Submit everything
                trackEvent('consult_submit', {
                  package: formData.packageChoice,
                  room: formData.room,
                  postcode: formData.postcode.slice(0, 4),
                  hasPhotos: formData.photos.length > 0,
                  hasMeasurements: formData.measurements.length > 0,
                });
                goTo(7);
              }}
            />
          )}

          {step === 7 && (
            <ConfirmationScreen
              data={{
                name: formData.name,
                email: formData.email,
                date: formData.date,
                time: formData.time,
                room: formData.room,
                packageChoice: formData.packageChoice,
                postcodeLocation: formData.postcodeLocation,
              }}
            />
          )}
        </ScreenTransition>
      </div>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center bg-warm-white">
          <Loader2 className="w-6 h-6 animate-spin text-green-700" />
        </div>
      }
    >
      <BookingFlowInner />
    </Suspense>
  );
}
