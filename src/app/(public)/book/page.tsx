'use client';

import { useState, useCallback, useEffect, useRef, Suspense } from 'react';
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
import ExitIntentPopup from '@/components/booking/ExitIntentPopup';
import ConfirmationScreen from '@/components/booking/screens/ConfirmationScreen';

/*
  Flow:
  0 = Welcome (education + step preview)
  1 = Contact details (name/email/phone — captured first for abandonment recovery)
  2 = Postcode check
  3 = Room type
  4 = Style preference
  5 = Package selector
  6 = Budget & timeline
  7 = Space info (photos/measurements/skip)
  8 = Calendar picker
  9 = Confirmation
*/

const TOTAL_STEPS = 8; // Steps 1-8 (welcome and confirmation don't count)

const stepLabels: Record<number, string> = {
  1: 'Details',
  2: 'Location',
  3: 'Room',
  4: 'Style',
  5: 'Package',
  6: 'Budget',
  7: 'Space',
  8: 'Book a time',
};

function BookingFlowInner() {
  const searchParams = useSearchParams();
  const preselectedPackage = searchParams.get('package') || '';

  // Pre-filled booking link: ?type=call2&opp=<id>&name=<name>&email=<email>&phone=<phone>
  const prefillType = searchParams.get('type') || ''; // call2, onboarding
  const prefillOpp = searchParams.get('opp') || '';
  const prefillName = searchParams.get('name') || '';
  const prefillEmail = searchParams.get('email') || '';
  const prefillPhone = searchParams.get('phone') || '';
  const isPrefilled = !!(prefillType && prefillOpp && prefillName);

  // Restore saved form data from localStorage (if returning visitor)
  const resumeId = searchParams.get('resume') || '';
  const [resumeLoaded, setResumeLoaded] = useState(false);

  type FormData = {
    postcode: string;
    postcodeLocation: string;
    room: string;
    style: string;
    inspiration: string;
    packageChoice: string;
    budgetRange: string;
    timeline: string;
    photos: File[];
    measurements: string;
    shareOnCall: boolean;
    plannerLink: string;
    homeVisit: boolean;
    doorFinishType: string;
    doorModel: string;
    spaceConstraints: string[];
    name: string;
    email: string;
    phone: string;
    whatsappOptIn: boolean;
    date: string;
    time: string;
  };

  const getInitialFormData = (): FormData => {
    const base: FormData = {
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
      name: prefillName,
      email: prefillEmail,
      phone: prefillPhone,
      whatsappOptIn: false,
      date: '',
      time: '',
    };

    // Try to restore from localStorage (client-side only)
    if (typeof window !== 'undefined' && !isPrefilled) {
      try {
        const saved = localStorage.getItem('pax_booking_form');
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            ...base,
            ...parsed,
            photos: [] as File[], // Files can't be serialized
            packageChoice: preselectedPackage || parsed.packageChoice || '',
          };
        }
      } catch {
        // Ignore parse errors
      }
    }
    return base;
  };

  const [formData, setFormData] = useState(getInitialFormData);
  const [assignedDesigner, setAssignedDesigner] = useState<string | null>(null);

  // Restore step from localStorage for returning visitors
  const getInitialStep = () => {
    if (isPrefilled) return 8;
    if (typeof window !== 'undefined') {
      try {
        const savedStep = localStorage.getItem('pax_booking_step');
        if (savedStep) {
          const s = parseInt(savedStep, 10);
          if (s >= 1 && s <= 8) return s;
        }
      } catch {
        // Ignore
      }
    }
    return 0;
  };

  const [step, setStep] = useState(getInitialStep);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [showExitPopup, setShowExitPopup] = useState(false);
  const formDataRef = useRef(formData);
  const stepRef = useRef(step);
  formDataRef.current = formData;
  stepRef.current = step;

  // Load resume data from server if ?resume=<id> is present
  useEffect(() => {
    if (!resumeId || resumeLoaded || isPrefilled) return;
    setResumeLoaded(true);

    fetch(`/api/booking/resume?id=${encodeURIComponent(resumeId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Record<string, string | boolean | null> | null) => {
        if (!data) return;
        setFormData((prev: FormData) => ({
          ...prev,
          name: (data.name as string) || prev.name,
          email: (data.email as string) || prev.email,
          phone: (data.phone as string) || prev.phone,
          postcode: (data.postcode as string) || prev.postcode,
          postcodeLocation: (data.postcode_location as string) || prev.postcodeLocation,
          room: (data.room as string) || prev.room,
          style: (data.style as string) || prev.style,
          packageChoice: (data.package_choice as string) || prev.packageChoice,
          budgetRange: (data.budget_range as string) || prev.budgetRange,
          timeline: (data.timeline as string) || prev.timeline,
          whatsappOptIn: (data.whatsapp_opt_in as boolean) ?? prev.whatsappOptIn,
        }));
        // Jump to the step after where they left off (or the same step)
        const resumeStep = Math.min(Number(data.last_step) || 1, 8);
        setStep(resumeStep);
      })
      .catch(() => {});
  }, [resumeId, resumeLoaded, isPrefilled]);

  // Save form progress to server (fire-and-forget beacon)
  const saveProgress = useCallback((currentStep: number) => {
    if (isPrefilled) return;
    const tracking = getTrackingData();
    const fd = formDataRef.current;

    const payload = {
      visitor_id: tracking.visitor_id,
      step: currentStep,
      step_label: stepLabels[currentStep] || '',
      name: fd.name || undefined,
      email: fd.email || undefined,
      phone: fd.phone || undefined,
      whatsapp_opt_in: fd.whatsappOptIn || undefined,
      postcode: fd.postcode || undefined,
      postcode_location: fd.postcodeLocation || undefined,
      room: fd.room || undefined,
      style: fd.style || undefined,
      package_choice: fd.packageChoice || undefined,
      budget_range: fd.budgetRange || undefined,
      timeline: fd.timeline || undefined,
      utm_source: tracking.utm_source || undefined,
      utm_medium: tracking.utm_medium || undefined,
      utm_campaign: tracking.utm_campaign || undefined,
      utm_content: tracking.utm_content || undefined,
      utm_term: tracking.utm_term || undefined,
      landing_page: tracking.landing_page || undefined,
      referrer: tracking.referrer || undefined,
      device_type: tracking.device_type || undefined,
    };

    // Use sendBeacon for reliability
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/booking/progress', JSON.stringify(payload));
    } else {
      fetch('/api/booking/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }
  }, [isPrefilled]);

  // Save form state to localStorage on every change
  useEffect(() => {
    if (isPrefilled) return;
    try {
      const { photos, ...serializable } = formData;
      localStorage.setItem('pax_booking_form', JSON.stringify(serializable));
      localStorage.setItem('pax_booking_step', String(step));
    } catch {
      // localStorage full or unavailable
    }
  }, [formData, step, isPrefilled]);

  // Save progress on page close / tab switch
  useEffect(() => {
    if (isPrefilled) return;

    const handleUnload = () => {
      if (stepRef.current >= 1 && stepRef.current < 9) {
        saveProgress(stepRef.current);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && stepRef.current >= 1 && stepRef.current < 9) {
        saveProgress(stepRef.current);
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPrefilled, saveProgress]);

  // Clear saved form data on successful completion
  const clearSavedForm = useCallback(() => {
    try {
      localStorage.removeItem('pax_booking_form');
      localStorage.removeItem('pax_booking_step');
    } catch {
      // Ignore
    }
  }, []);

  const goTo = useCallback((nextStep: number) => {
    setDirection(nextStep > step ? 1 : -1);
    setStep(nextStep);
    if (nextStep > 0 && nextStep < 9) {
      trackEvent('consult_step', { step: nextStep, label: stepLabels[nextStep] || '' });
      // Save progress to server after each step
      // Use setTimeout to ensure formData state has updated
      setTimeout(() => saveProgress(nextStep), 100);
    }
  }, [step, saveProgress]);

  const goBack = useCallback(() => {
    if (step > 0) goTo(step - 1);
  }, [step, goTo]);

  const updateField = useCallback((field: string, value: string | boolean | File[] | string[]) => {
    setFormData((prev: FormData) => ({ ...prev, [field]: value }));
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
            <DetailsScreen
              name={formData.name}
              email={formData.email}
              phone={formData.phone}
              whatsappOptIn={formData.whatsappOptIn}
              onChange={(field, value) => updateField(field, value)}
              onNext={() => goTo(2)}
            />
          )}

          {step === 2 && (
            <PostcodeScreen
              onNext={(postcode, location) => {
                updateField('postcode', postcode);
                updateField('postcodeLocation', location);
                goTo(3);
              }}
            />
          )}

          {step === 3 && (
            <RoomScreen
              value={formData.room}
              onChange={(v) => updateField('room', v)}
              onNext={() => goTo(4)}
            />
          )}

          {step === 4 && (
            <StyleScreen
              value={formData.style}
              inspiration={formData.inspiration}
              onChange={(style, inspiration) => {
                updateField('style', style);
                if (inspiration !== undefined) updateField('inspiration', inspiration);
              }}
              onNext={() => goTo(5)}
            />
          )}

          {step === 5 && (
            <PackageScreen
              value={formData.packageChoice}
              onChange={(v) => updateField('packageChoice', v)}
              onNext={() => goTo(6)}
              postcodeLocation={formData.postcodeLocation}
            />
          )}

          {step === 6 && (
            <BudgetTimelineScreen
              budgetRange={formData.budgetRange}
              timeline={formData.timeline}
              packageChoice={formData.packageChoice}
              onBudgetChange={(v) => updateField('budgetRange', v)}
              onTimelineChange={(v) => updateField('timeline', v)}
              onNext={() => goTo(7)}
            />
          )}

          {step === 7 && (
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
                goTo(8);
              }}
            />
          )}

          {step === 8 && (
            <CalendarScreen
              packageChoice={formData.packageChoice}
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

                // Submit to CRM
                try {
                  if (isPrefilled && prefillOpp) {
                    // Pre-filled link: create booking on existing opportunity
                    const [hours, minutes] = time.split(':').map(Number);
                    const parts = date.trim().split(/\s+/);
                    const dayNum = parseInt(parts[1], 10);
                    const months: Record<string, number> = {
                      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
                      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
                    };
                    const month = months[parts[2]] ?? 0;
                    const now = new Date();
                    let scheduledDate = new Date(now.getFullYear(), month, dayNum, hours, minutes);
                    if (scheduledDate < now) scheduledDate = new Date(now.getFullYear() + 1, month, dayNum, hours, minutes);

                    const res = await fetch('/api/booking/existing', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        opportunity_id: prefillOpp,
                        type: prefillType,
                        scheduled_at: scheduledDate.toISOString(),
                        name: formData.name,
                        email: formData.email,
                        phone: formData.phone,
                      }),
                    });
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}));
                      if (res.status === 409) {
                        alert(err.error || 'This time slot is no longer available.');
                        return;
                      }
                    }
                  } else {
                    // Standard new booking flow
                    const tracking = getTrackingData();
                    const bookingRes = await fetch('/api/booking', {
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
                    if (bookingRes.ok) {
                      const bookingData = await bookingRes.json();
                      if (bookingData.designer_name) {
                        setAssignedDesigner(bookingData.designer_name);
                      }
                    }
                  }
                } catch {
                  // Don't block the user flow if CRM submission fails
                }

                // Clear saved form data and mark abandonment as converted
                clearSavedForm();

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
                designerName: assignedDesigner ?? undefined,
              }}
            />
          )}
        </ScreenTransition>
      </div>

      {/* Exit-intent popup — only shown if contact details not yet captured */}
      {!isPrefilled && step === 0 && (
        <ExitIntentPopup
          show={showExitPopup}
          onShow={() => setShowExitPopup(true)}
          onClose={() => setShowExitPopup(false)}
          onSubmit={(email, name) => {
            updateField('email', email);
            if (name) updateField('name', name);
            setShowExitPopup(false);
            // Save to server immediately
            const tracking = getTrackingData();
            const { visitor_id: _vid, ...restTracking } = tracking;
            fetch('/api/booking/progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                visitor_id: tracking.visitor_id,
                step: 0,
                step_label: 'exit_intent',
                email,
                name: name || undefined,
                ...restTracking,
              }),
            }).catch(() => {});
          }}
        />
      )}
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
