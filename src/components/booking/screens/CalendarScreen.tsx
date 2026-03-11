'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Clock, Users, Zap,
  MessageCircle, Phone, CalendarCheck, Loader2, CheckCircle2,
} from 'lucide-react';

interface CalendarScreenProps {
  onNext: (date: string, time: string, designerId: string, designerName: string) => void;
  packageChoice?: string;
}

interface Designer {
  id: string;
  name: string;
  avatar_url: string | null;
  color: string;
  calendar_connected: boolean;
  availability: Record<string, string[]>;
}

function getDateLabel(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
function getDayName(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short' });
}
function getDayNum(iso: string): number {
  return new Date(iso + 'T12:00:00').getDate();
}
function getMonthShort(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { month: 'short' });
}
function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function CalendarScreen({ onNext, packageChoice }: CalendarScreenProps) {
  const isBudget = packageChoice === 'budget';

  const [designers, setDesigners] = useState<Designer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [selectedDesigner, setSelectedDesigner] = useState<Designer | null>(null);
  const [dateOffset, setDateOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/booking/designers')
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: { designers: Designer[] }) => {
        setDesigners(data.designers ?? []);
        setLoading(false);
      })
      .catch(() => { setLoadError(true); setLoading(false); });
  }, []);

  const availableDates = useMemo(() => {
    if (!selectedDesigner) return [];
    return Object.keys(selectedDesigner.availability).sort();
  }, [selectedDesigner]);

  const visibleDates = availableDates.slice(dateOffset, dateOffset + 7);
  const canGoBack = dateOffset > 0;
  const canGoForward = dateOffset + 7 < availableDates.length;

  const slotsForDate = useMemo(() => {
    if (!selectedDesigner || !selectedDate) return [];
    return selectedDesigner.availability[selectedDate] ?? [];
  }, [selectedDesigner, selectedDate]);

  const groupedSlots = useMemo(() => {
    const morning = slotsForDate.filter((t) => parseInt(t) < 12);
    const afternoon = slotsForDate.filter((t) => parseInt(t) >= 12 && parseInt(t) < 16);
    const evening = slotsForDate.filter((t) => parseInt(t) >= 16);
    return [
      { group: 'Morning', slots: morning },
      { group: 'Afternoon', slots: afternoon },
      { group: 'Evening', slots: evening },
    ].filter((g) => g.slots.length > 0);
  }, [slotsForDate]);

  const handleSelectDesigner = (d: Designer) => {
    setSelectedDesigner(d);
    setDateOffset(0);
    setSelectedDate(null);
    setSelectedTime(null);
  };

  const handleConfirm = () => {
    if (selectedDesigner && selectedDate && selectedTime) {
      onNext(getDateLabel(selectedDate), selectedTime, selectedDesigner.id, selectedDesigner.name);
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#0C6B4E]" />
        <p className="text-sm text-warm-500">Loading availability…</p>
      </div>
    );
  }

  if (loadError || designers.length === 0) {
    return (
      <div className="max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
          Book your consultation
        </h2>
        <p className="text-sm text-warm-500 mb-6">
          We couldn&apos;t load live availability right now. Reach out directly and we&apos;ll get you booked in.
        </p>
        <Fallback />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-warm-900 mb-2 font-[family-name:var(--font-heading)]">
        {isBudget ? 'Book your online design check' : 'Pick your designer & time'}
      </h2>
      <p className="text-sm text-warm-500 mb-6">
        {isBudget
          ? "Up to 20 minutes. We'll review your PAX Planner design together and prepare your quote."
          : "Up to 1 hour. Choose who you'd like to speak with, then pick a time that suits you."}
      </p>

      {/* Step 1: Choose designer */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-3 font-[family-name:var(--font-heading)]">
          {designers.length === 1 ? 'Your designer' : 'Choose your designer'}
        </p>
        <div className="grid grid-cols-1 gap-2">
          {designers.map((d) => {
            const isSelected = selectedDesigner?.id === d.id;
            const slotCount = Object.values(d.availability).reduce((s, slots) => s + slots.length, 0);
            return (
              <motion.button
                key={d.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectDesigner(d)}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all ${
                  isSelected
                    ? 'border-[#0C6B4E] bg-green-50 shadow-sm'
                    : 'border-warm-100 bg-white hover:border-[#0C6B4E]/40'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden"
                  style={{ backgroundColor: d.color }}
                >
                  {d.avatar_url
                    ? <img src={d.avatar_url} alt={d.name} className="w-full h-full object-cover" />
                    : getInitials(d.name)
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-warm-900 font-[family-name:var(--font-heading)]">{d.name}</p>
                  <p className="text-xs text-warm-400">
                    {slotCount} slot{slotCount !== 1 ? 's' : ''} available
                    {d.calendar_connected ? ' · Live availability' : ''}
                  </p>
                </div>
                {isSelected && <CheckCircle2 className="w-5 h-5 text-[#0C6B4E] flex-shrink-0" />}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Choose date */}
      <AnimatePresence>
        {selectedDesigner && (
          <motion.div key="date-picker" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <p className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-3 font-[family-name:var(--font-heading)]">
              Choose a date
            </p>
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setDateOffset((o) => Math.max(0, o - 7))} disabled={!canGoBack}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-warm-100 transition-colors disabled:opacity-30">
                <ChevronLeft className="w-4 h-4 text-warm-600" />
              </button>
              <span className="text-sm font-medium text-warm-700 font-[family-name:var(--font-heading)]">
                {visibleDates[0] && `${getMonthShort(visibleDates[0])} ${getDayNum(visibleDates[0])}`}
                {visibleDates.length > 1 && ` – ${getMonthShort(visibleDates[visibleDates.length - 1])} ${getDayNum(visibleDates[visibleDates.length - 1])}`}
              </span>
              <button onClick={() => setDateOffset((o) => Math.min(availableDates.length - 7, o + 7))} disabled={!canGoForward}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-warm-100 transition-colors disabled:opacity-30">
                <ChevronRight className="w-4 h-4 text-warm-600" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {visibleDates.map((iso, i) => {
                const isSelected = selectedDate === iso;
                return (
                  <motion.button key={iso} whileTap={{ scale: 0.92 }} onClick={() => { setSelectedDate(iso); setSelectedTime(null); }}
                    className={`relative flex flex-col items-center py-2.5 px-1 rounded-2xl transition-all text-center ${
                      isSelected ? 'bg-[#E8872B] text-white shadow-md' : 'bg-white border border-warm-100 hover:border-[#E8872B] text-warm-700'
                    }`}>
                    {dateOffset === 0 && i === 0 && !isSelected && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#0C6B4E] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap flex items-center gap-0.5">
                        <Zap className="w-2 h-2" />Next
                      </span>
                    )}
                    <span className={`text-[10px] font-medium uppercase ${isSelected ? 'text-orange-100' : 'text-warm-400'}`}>{getDayName(iso)}</span>
                    <span className="text-lg font-bold font-[family-name:var(--font-heading)]">{getDayNum(iso)}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 3: Choose time */}
      <AnimatePresence>
        {selectedDesigner && selectedDate && (
          <motion.div key="time-picker" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <CalendarCheck className="w-3.5 h-3.5 text-[#0C6B4E]" />
              <span className="text-xs text-warm-500">
                {slotsForDate.length} slot{slotsForDate.length !== 1 ? 's' : ''} available on {getDateLabel(selectedDate)}
              </span>
            </div>
            <div className="space-y-4">
              {groupedSlots.map((group) => (
                <div key={group.group}>
                  <p className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2 font-[family-name:var(--font-heading)]">{group.group}</p>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                    {group.slots.map((slot) => (
                      <motion.button key={slot} whileTap={{ scale: 0.92 }} onClick={() => setSelectedTime(slot)}
                        className={`py-2.5 rounded-2xl text-sm font-medium transition-all font-[family-name:var(--font-heading)] ${
                          selectedTime === slot ? 'bg-[#E8872B] text-white shadow-md' : 'bg-white border border-warm-100 text-warm-700 hover:border-[#E8872B]'
                        }`}>
                        {slot}
                      </motion.button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="flex items-center gap-2 mt-2 mb-6 text-xs text-warm-400">
        <Users className="w-3.5 h-3.5" />
        <span>No obligation · Reschedule anytime · Free consultation</span>
      </motion.div>

      {/* Confirm */}
      <AnimatePresence>
        {selectedDesigner && selectedDate && selectedTime && (
          <motion.div key="confirm" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-green-50 rounded-2xl p-4 flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-[#0C6B4E] flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-900 font-[family-name:var(--font-heading)]">
                  {getDateLabel(selectedDate)} at {selectedTime} with {selectedDesigner.name}
                </p>
                <p className="text-xs text-[#0C6B4E]">
                  {isBudget ? '20-minute online design check' : 'Up to 1 hour video consultation'}
                </p>
              </div>
            </div>
            <motion.button onClick={handleConfirm} whileTap={{ scale: 0.98 }}
              className="w-full px-6 py-4 bg-[#E8872B] text-white font-semibold rounded-2xl hover:bg-[#d47a24] transition-colors text-base font-[family-name:var(--font-heading)] flex items-center justify-center gap-2 shadow-lg shadow-orange-200/50">
              Confirm Booking
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="mt-8 border border-warm-100 rounded-2xl p-5 bg-warm-50/50">
        <p className="text-sm font-semibold text-warm-800 mb-3 font-[family-name:var(--font-heading)]">
          Can&apos;t find a time that works?
        </p>
        <Fallback />
      </motion.div>
    </div>
  );
}

function Fallback() {
  return (
    <div className="space-y-2.5">
      <a href="https://wa.me/447000000000?text=Hi%2C%20I%27d%20like%20to%20book%20a%20consultation%20but%20can%27t%20find%20a%20suitable%20time."
        target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-3 p-3 bg-white rounded-xl border border-warm-100 hover:border-[#0C6B4E] transition-colors group">
        <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 group-hover:bg-green-100 transition-colors">
          <MessageCircle className="w-4 h-4 text-[#0C6B4E]" />
        </div>
        <div>
          <p className="text-sm font-medium text-warm-800">Message us on WhatsApp</p>
          <p className="text-xs text-warm-400">Usually reply within a few hours</p>
        </div>
      </a>
      <a href="tel:+447000000000"
        className="flex items-center gap-3 p-3 bg-white rounded-xl border border-warm-100 hover:border-[#0C6B4E] transition-colors group">
        <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 group-hover:bg-green-100 transition-colors">
          <Phone className="w-4 h-4 text-[#0C6B4E]" />
        </div>
        <div>
          <p className="text-sm font-medium text-warm-800">Request a callback</p>
          <p className="text-xs text-warm-400">We&apos;ll call you to arrange a time</p>
        </div>
      </a>
    </div>
  );
}
