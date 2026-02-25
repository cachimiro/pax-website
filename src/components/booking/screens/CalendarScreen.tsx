'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, Users, Zap, MessageCircle, Phone, CalendarCheck } from 'lucide-react';

interface CalendarScreenProps {
  onNext: (date: string, time: string) => void;
}

// Generate next 14 days of available dates (skip Sundays)
function getAvailableDates(): Array<{ date: Date; label: string; dayName: string; dayNum: number; monthShort: string; isNextAvailable?: boolean }> {
  const dates: Array<{ date: Date; label: string; dayName: string; dayNum: number; monthShort: string; isNextAvailable?: boolean }> = [];
  const now = new Date();
  let d = new Date(now);
  d.setDate(d.getDate() + 1); // Start from tomorrow

  let foundFirst = false;
  while (dates.length < 14) {
    if (d.getDay() !== 0) { // Skip Sundays
      const entry = {
        date: new Date(d),
        label: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
        dayName: d.toLocaleDateString('en-GB', { weekday: 'short' }),
        dayNum: d.getDate(),
        monthShort: d.toLocaleDateString('en-GB', { month: 'short' }),
        isNextAvailable: false,
      };
      if (!foundFirst) {
        entry.isNextAvailable = true;
        foundFirst = true;
      }
      dates.push(entry);
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

const timeSlots = [
  { group: 'Morning', slots: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'] },
  { group: 'Afternoon', slots: ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'] },
  { group: 'Evening', slots: ['16:00', '16:30', '17:00', '17:30', '18:00'] },
];

export default function CalendarScreen({ onNext }: CalendarScreenProps) {
  const dates = useMemo(() => getAvailableDates(), []);
  const [dateOffset, setDateOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const visibleDates = dates.slice(dateOffset, dateOffset + 7);
  const canGoBack = dateOffset > 0;
  const canGoForward = dateOffset + 7 < dates.length;

  // Simulate some slots being "taken" for realism
  const takenSlots = useMemo(() => {
    const taken = new Set<string>();
    dates.forEach((d) => {
      const seed = d.dayNum * 7;
      timeSlots.forEach((group) => {
        group.slots.forEach((slot, i) => {
          if ((seed + i) % 5 === 0) taken.add(`${d.label}-${slot}`);
        });
      });
    });
    return taken;
  }, [dates]);

  const isSlotAvailable = (dateLabel: string, time: string) => !takenSlots.has(`${dateLabel}-${time}`);

  // Count available slots for selected date
  const availableSlotCount = useMemo(() => {
    if (!selectedDate) return 0;
    let count = 0;
    timeSlots.forEach((group) => {
      group.slots.forEach((slot) => {
        if (isSlotAvailable(selectedDate, slot)) count++;
      });
    });
    return count;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, takenSlots]);

  const handleConfirm = () => {
    if (selectedDate && selectedTime) {
      onNext(selectedDate, selectedTime);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
        Pick a time for your call
      </h2>
      <p className="text-sm text-warm-500 mb-1">
        Video consultations last 20–30 minutes. Choose a day and time that works for you.
      </p>
      <p className="text-xs text-warm-400 mb-6 italic">
        We ask so we can prepare for your consultation and have everything ready.
      </p>

      {/* Date picker */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setDateOffset((o) => Math.max(0, o - 7))}
            disabled={!canGoBack}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-warm-100 transition-colors disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4 text-warm-600" />
          </button>
          <span className="text-sm font-medium text-warm-700 font-[family-name:var(--font-heading)]">
            {visibleDates[0]?.monthShort} {visibleDates[0]?.dayNum} – {visibleDates[visibleDates.length - 1]?.monthShort} {visibleDates[visibleDates.length - 1]?.dayNum}
          </span>
          <button
            onClick={() => setDateOffset((o) => Math.min(dates.length - 7, o + 7))}
            disabled={!canGoForward}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-warm-100 transition-colors disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4 text-warm-600" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {visibleDates.map((d) => (
            <motion.button
              key={d.label}
              whileTap={{ scale: 0.92 }}
              onClick={() => { setSelectedDate(d.label); setSelectedTime(null); }}
              className={`relative flex flex-col items-center py-2.5 px-1 rounded-2xl transition-all text-center ${
                selectedDate === d.label
                  ? 'bg-[#E8872B] text-white shadow-md'
                  : 'bg-white border border-warm-100 hover:border-[#E8872B] text-warm-700'
              }`}
            >
              {/* Next available badge */}
              {d.isNextAvailable && selectedDate !== d.label && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#0C6B4E] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap flex items-center gap-0.5">
                  <Zap className="w-2 h-2" />
                  Next
                </span>
              )}
              <span className={`text-[10px] font-medium uppercase ${selectedDate === d.label ? 'text-orange-100' : 'text-warm-400'}`}>
                {d.dayName}
              </span>
              <span className="text-lg font-bold font-[family-name:var(--font-heading)]">{d.dayNum}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Slot availability hint */}
      {selectedDate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 mb-4"
        >
          <CalendarCheck className="w-3.5 h-3.5 text-[#0C6B4E]" />
          <span className="text-xs text-warm-500">
            {availableSlotCount} slots available · Popular times fill up fast
          </span>
        </motion.div>
      )}

      {/* Time slots */}
      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {timeSlots.map((group) => (
            <div key={group.group}>
              <p className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2 font-[family-name:var(--font-heading)]">
                {group.group}
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {group.slots.map((slot) => {
                  const available = isSlotAvailable(selectedDate, slot);
                  const isSelected = selectedTime === slot;
                  return (
                    <motion.button
                      key={slot}
                      whileTap={available ? { scale: 0.92 } : {}}
                      onClick={() => available && setSelectedTime(slot)}
                      disabled={!available}
                      className={`py-2.5 rounded-2xl text-sm font-medium transition-all font-[family-name:var(--font-heading)] ${
                        isSelected
                          ? 'bg-[#E8872B] text-white shadow-md'
                          : available
                          ? 'bg-white border border-warm-100 text-warm-700 hover:border-[#E8872B]'
                          : 'bg-warm-50 text-warm-300 cursor-not-allowed line-through'
                      }`}
                    >
                      {slot}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Social proof */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-2 mt-6 text-xs text-warm-400"
      >
        <Users className="w-3.5 h-3.5" />
        <span>12 consultations booked this week · No obligation, reschedule anytime</span>
      </motion.div>

      {selectedDate && selectedTime && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Selected summary */}
          <div className="mt-5 bg-green-50 rounded-2xl p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-[#0C6B4E] flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-900 font-[family-name:var(--font-heading)]">
                {selectedDate} at {selectedTime}
              </p>
              <p className="text-xs text-[#0C6B4E]">20–30 minute video consultation</p>
            </div>
          </div>

          <motion.button
            onClick={handleConfirm}
            whileTap={{ scale: 0.98 }}
            className="w-full mt-4 px-6 py-4 bg-[#E8872B] text-white font-semibold rounded-2xl hover:bg-[#d47a24] transition-colors text-base font-[family-name:var(--font-heading)] flex items-center justify-center gap-2 shadow-lg shadow-orange-200/50"
          >
            Confirm Booking
          </motion.button>
        </motion.div>
      )}

      {/* Can't find a time? fallback */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 border border-warm-100 rounded-2xl p-5 bg-warm-50/50"
      >
        <p className="text-sm font-semibold text-warm-800 mb-3 font-[family-name:var(--font-heading)]">
          Can&apos;t find a time that works?
        </p>
        <div className="space-y-2.5">
          <a
            href="https://wa.me/447000000000?text=Hi%2C%20I%27d%20like%20to%20book%20a%20consultation%20but%20can%27t%20find%20a%20suitable%20time."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-white rounded-xl border border-warm-100 hover:border-[#0C6B4E] transition-colors group"
          >
            <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 group-hover:bg-green-100 transition-colors">
              <MessageCircle className="w-4 h-4 text-[#0C6B4E]" />
            </div>
            <div>
              <p className="text-sm font-medium text-warm-800">Message us on WhatsApp</p>
              <p className="text-xs text-warm-400">Usually reply within a few hours</p>
            </div>
          </a>
          <a
            href="tel:+447000000000"
            className="flex items-center gap-3 p-3 bg-white rounded-xl border border-warm-100 hover:border-[#0C6B4E] transition-colors group"
          >
            <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 group-hover:bg-green-100 transition-colors">
              <Phone className="w-4 h-4 text-[#0C6B4E]" />
            </div>
            <div>
              <p className="text-sm font-medium text-warm-800">Request a callback</p>
              <p className="text-xs text-warm-400">We&apos;ll call you to arrange a time</p>
            </div>
          </a>
        </div>
      </motion.div>
    </div>
  );
}
