'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, Users } from 'lucide-react';

interface CalendarScreenProps {
  onNext: (date: string, time: string) => void;
}

// Generate next 14 days of available dates (skip Sundays)
function getAvailableDates(): Array<{ date: Date; label: string; dayName: string; dayNum: number; monthShort: string }> {
  const dates: Array<{ date: Date; label: string; dayName: string; dayNum: number; monthShort: string }> = [];
  const now = new Date();
  let d = new Date(now);
  d.setDate(d.getDate() + 1); // Start from tomorrow

  while (dates.length < 14) {
    if (d.getDay() !== 0) { // Skip Sundays
      dates.push({
        date: new Date(d),
        label: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
        dayName: d.toLocaleDateString('en-GB', { weekday: 'short' }),
        dayNum: d.getDate(),
        monthShort: d.toLocaleDateString('en-GB', { month: 'short' }),
      });
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
      <p className="text-sm text-warm-500 mb-6">
        Video consultations last 20–30 minutes. Choose a day and time that works for you.
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
              className={`flex flex-col items-center py-2.5 px-1 rounded-xl transition-all text-center ${
                selectedDate === d.label
                  ? 'bg-green-700 text-white shadow-sm'
                  : 'bg-white border border-warm-100 hover:border-green-600 text-warm-700'
              }`}
            >
              <span className={`text-[10px] font-medium uppercase ${selectedDate === d.label ? 'text-green-200' : 'text-warm-400'}`}>
                {d.dayName}
              </span>
              <span className="text-lg font-bold font-[family-name:var(--font-heading)]">{d.dayNum}</span>
            </motion.button>
          ))}
        </div>
      </div>

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
                      className={`py-2.5 rounded-lg text-sm font-medium transition-all font-[family-name:var(--font-heading)] ${
                        isSelected
                          ? 'bg-green-700 text-white shadow-sm'
                          : available
                          ? 'bg-white border border-warm-100 text-warm-700 hover:border-green-600'
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
          <div className="mt-5 bg-green-50 rounded-xl p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-green-700 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-900 font-[family-name:var(--font-heading)]">
                {selectedDate} at {selectedTime}
              </p>
              <p className="text-xs text-green-700">20–30 minute video consultation</p>
            </div>
          </div>

          <motion.button
            onClick={handleConfirm}
            whileTap={{ scale: 0.98 }}
            className="w-full mt-4 px-6 py-4 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-900 transition-colors text-base font-[family-name:var(--font-heading)] flex items-center justify-center gap-2"
          >
            Confirm Booking
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
