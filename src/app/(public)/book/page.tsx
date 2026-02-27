'use client';

import { useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { trackEvent } from '@/lib/analytics';
import { getTrackingData } from '@/components/TrackingScript';

import StepBar from '@/components/booking/StepBar';
import ScreenTransition from '@/components/booking/ScreenTransition';
import WelcomeScreen from '@/components/booking/screens/WelcomeScreen';
import PostcodeScreen from '@/components/booking/screens/PostcodeScreen';
import RoomScreen from '@/components/booking/screens/RoomScreen';
import StyleScreen from '@/components/booking/screens/StyleScreen';
import PackageScreen from '@/components/booking/screens/PackageScreen';
import BudgetTimelineScreen from '@/components/booking/screens/BudgetTimelineScreen';
import SpaceScreen from '@/components/booking/screens/SpaceScreen';
import DetailsScreen from '@/components/booking/screens/DetailsScreen';
import CalendarScreen from '@/components/booking/screens/CalendarScreen';
import ConfirmationScreen from '@/components/booking/screens/ConfirmationScreen';

/*
  Flow:
  0 = Welcome (education + step preview)
  1 = Postcode check
  2 = Room type
  3 = Style preference (NEW)
  4 = Package selector
  5 = Budget & timeline (NEW)
  6 = Space info (photos/measurements/skip)
  7 = Contact details
  8 = Calendar picker
  9 = Confirmation
*/

const TOTAL_STEPS = 8; // Steps 1-8 (welcome and confirmation don't count)

const stepLabels: Record<number, string> = {
  1: 'Location',
  2: 'Room',
  3: 'Style',
  4: 'Package',
  5: 'Budget',
  6: 'Space',
  7: 'Details',
  8: 'Book a time',
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
    style: '',
    inspiration: '',
    packageChoice: preselectedPackage || '',
    budgetRange: '',
    timeline: '',
    photos: [] as File[],
    measurements: '',
    shareOnCall: false,
    plannerLink: '',
    homeVisit: false,
    doorFinishType: '',
    doorModel: '',
    spaceConstraints: [] as string[],
    name: '',
    email: '',
    phone: '',
    whatsappOptIn: false,
    date: '',
    time: '',
  });

  const goTo = useCallback((nextStep: number) => {
    setDirection(nextStep > step ? 1 : -1);
    setStep(nextStep);
    if (nextStep > 0 && nextStep < 9) {
      trackEvent('consult_step', { step: nextStep, label: stepLabels[nextStep] || '' });
    }
  }, [step]);

  const goBack = useCallback(() => {
    if (step > 0) goTo(step - 1);
  }, [step, goTo]);

  const updateField = useCallback((field: string, value: string | boolean | File[] | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const showProgress = step >= 1 && step <= 8;
  const showBack = step >= 1 && step <= 8;

  // Estimate time remaining
  const stepsLeft = Math.max(0, 8 - step);
  const timeEstimate = stepsLeft <= 2 ? 'Almost done' : `~${Math.ceil(stepsLeft * 0.25)} min left`;

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-warm-white">
      {/* Top bar with step progress + back */}
      {(showProgress || showBack) && (
        <div className="sticky top-[60px] md:top-20 z-40 bg-warm-white/95 backdrop-blur-sm border-b border-warm-100">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between mb-2">
              {showBack ? (
                <motion.button
                  onClick={goBack}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1.5 text-sm text-warm-500 hover:text-warm-700 transition-colors font-[family-name:var(--font-heading)] font-medium min-w-[44px] min-h-[44px]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </motion.button>
              ) : (
                <div />
              )}
              <span className="text-xs text-warm-400 font-[family-name:var(--font-heading)]">
                {timeEstimate}
              </span>
            </div>
            <StepBar current={step} total={TOTAL_STEPS} labels={stepLabels} />
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
            <StyleScreen
              value={formData.style}
              inspiration={formData.inspiration}
              onChange={(style, inspiration) => {
                updateField('style', style);
                if (inspiration !== undefined) updateField('inspiration', inspiration);
              }}
              onNext={() => goTo(4)}
            />
          )}

          {step === 4 && (
            <PackageScreen
              value={formData.packageChoice}
              onChange={(v) => updateField('packageChoice', v)}
              onNext={() => goTo(5)}
              postcodeLocation={formData.postcodeLocation}
            />
          )}

          {step === 5 && (
            <BudgetTimelineScreen
              budgetRange={formData.budgetRange}
              timeline={formData.timeline}
              onBudgetChange={(v) => updateField('budgetRange', v)}
              onTimelineChange={(v) => updateField('timeline', v)}
              onNext={() => goTo(6)}
            />
          )}

          {step === 6 && (
            <SpaceScreen
              packageChoice={formData.packageChoice}
              onNext={(data) => {
                updateField('photos', data.photos);
                updateField('measurements', data.measurements);
                updateField('shareOnCall', data.shareOnCall);
                if (data.plannerLink !== undefined) updateField('plannerLink', data.plannerLink);
                if (data.homeVisit !== undefined) updateField('homeVisit', data.homeVisit);
                if (data.doorFinishType !== undefined) updateField('doorFinishType', data.doorFinishType);
                if (data.doorModel !== undefined) updateField('doorModel', data.doorModel);
                if (data.spaceConstraints !== undefined) updateField('spaceConstraints', data.spaceConstraints);
                goTo(7);
              }}
            />
          )}

          {step === 7 && (
            <DetailsScreen
              name={formData.name}
              email={formData.email}
              phone={formData.phone}
              whatsappOptIn={formData.whatsappOptIn}
              onChange={(field, value) => updateField(field, value)}
              onNext={() => goTo(8)}
            />
          )}

          {step === 8 && (
            <CalendarScreen
              onNext={async (date, time) => {
                updateField('date', date);
                updateField('time', time);
                trackEvent('consult_submit', {
                  package: formData.packageChoice,
                  room: formData.room,
                  style: formData.style,
                  budget: formData.budgetRange,
                  timeline: formData.timeline,
                  postcode: formData.postcode.slice(0, 4),
                  hasPhotos: formData.photos.length > 0,
                  hasMeasurements: formData.measurements.length > 0,
                });

                // Submit to CRM with tracking attribution
                try {
                  const tracking = getTrackingData();
                  await fetch('/api/booking', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name: formData.name,
                      email: formData.email,
                      phone: formData.phone,
                      postcode: formData.postcode,
                      postcodeLocation: formData.postcodeLocation,
                      room: formData.room,
                      style: formData.style,
                      packageChoice: formData.packageChoice,
                      budgetRange: formData.budgetRange,
                      timeline: formData.timeline,
                      measurements: formData.measurements,
                      plannerLink: formData.plannerLink,
                      homeVisit: formData.homeVisit,
                      doorFinishType: formData.doorFinishType,
                      doorModel: formData.doorModel,
                      spaceConstraints: formData.spaceConstraints,
                      whatsappOptIn: formData.whatsappOptIn,
                      date,
                      time,
                      ...tracking,
                    }),
                  });
                } catch {
                  // Don't block the user flow if CRM submission fails
                }

                goTo(9);
              }}
            />
          )}

          {step === 9 && (
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
