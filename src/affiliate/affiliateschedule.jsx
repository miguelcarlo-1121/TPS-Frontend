import React, { useState, useEffect, useMemo, useCallback } from "react";
import AdminNavigation from "./affiliatenav";
import ProfileMenu from "../components/ProfileMenu";
import SkeletonBlock from "../components/SkeletonBlock";

const FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Inknut+Antiqua:wght@400;600;700&family=Inria+Serif:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&family=Inter:wght@400;500;600;700&display=swap');`;

const inter = "font-['Inter',Helvetica,sans-serif]";
const serif = "font-['Inria_Serif',Georgia,serif]";

/* ------------------------------------------------------------------ */
/*  API helper                                                         */
/* ------------------------------------------------------------------ */
const API_URL = "http://localhost:8000/api";
const BASE = "/affiliate/schedule"; // <-- affiliate endpoints

async function api(path, options = {}) {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    /* hindi JSON */
  }

  if (!res.ok) {
    console.error(`API ${options.method || "GET"} ${path} -> ${res.status}`, text);
    if (res.status === 401) throw new Error("Your session expired. Please sign in again.");
    if (res.status === 403) throw new Error("You don't have access to this page.");
    const firstError = data.errors ? Object.values(data.errors)[0][0] : null;
    throw new Error(firstError || data.message || `Server error (${res.status}). Check the browser console and laravel.log.`);
  }
  return data;
}

/* ------------------------------------------------------------------ */
/*  Date / time helpers                                                */
/* ------------------------------------------------------------------ */
const DAYS_HEADER = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const pad = (n) => String(n).padStart(2, "0");
const toISO = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`; // m is 0-based
const parseISO = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// "13:30" -> "1:30 PM"
const fmt = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hh} ${ap}` : `${hh}:${pad(m)} ${ap}`;
};
const fmtLong = (t) => {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${h >= 12 ? "PM" : "AM"}`;
};
const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const minutes = index * 30;
  const value = `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  return { value, label: fmtLong(value) };
});
const hoursBetween = (a, b) => {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return (bh * 60 + bm - (ah * 60 + am)) / 60;
};
const isFullDayUnavailable = (slot) =>
  slot.status === "unavailable" && slot.start_time === "00:00" && slot.end_time === "23:59";

const DateChip = ({ label, className = "" }) => (
  <div
    className={`h-[30px] min-w-[170px] items-center justify-center gap-[8px] rounded-[6px] border border-[#4a9b8e] bg-[#e3f2ee] px-[12px] ${className}`}
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2a8570" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
    <span className={`${inter} text-[12px] font-bold text-[#2a8570]`}>{label}</span>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Main Schedule Component                                            */
/* ------------------------------------------------------------------ */
export default function AffiliateSchedule() {
  const [navOpen, setNavOpen] = useState(false);
  const today = new Date();
  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate());

  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [selectingDates, setSelectingDates] = useState(false);
  const [selectedDates, setSelectedDates] = useState([]);
  const [slots, setSlots] = useState([]);
  const [stats, setStats] = useState({ open_slots: 0, booked: 0, pending: 0, not_available: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [availabilityMode, setAvailabilityMode] = useState("available");
  const [fromTime, setFromTime] = useState("08:00");
  const [toTime, setToTime] = useState("17:00");
  const [blockFromTime, setBlockFromTime] = useState("08:00");
  const [blockToTime, setBlockToTime] = useState("09:00");
  const selectedFromTime = availabilityMode === "blocked" ? blockFromTime : fromTime;
  const selectedToTime = availabilityMode === "blocked" ? blockToTime : toTime;

  const monthKey = `${view.year}-${pad(view.month + 1)}`;

  /* ---------- load from backend ---------- */
  const loadSchedule = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api(`${BASE}?month=${monthKey}`);
      setSlots(data.slots || []);
      setStats(data.stats || {});
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  /* ---------- group slots by date ---------- */
  const slotsByDate = useMemo(() => {
    const map = {};
    slots.forEach((s) => {
      (map[s.date] = map[s.date] || []).push(s);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.start_time.localeCompare(b.start_time)));
    return map;
  }, [slots]);

  /* ---------- build calendar cells ---------- */
  const cells = useMemo(() => {
    const { year, month } = view;
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const out = [];
    for (let i = first.getDay(); i > 0; i--) {
      const d = new Date(year, month, 1 - i);
      out.push({ date: toISO(d.getFullYear(), d.getMonth(), d.getDate()), d: d.getDate(), dow: d.getDay(), other: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({ date: toISO(year, month, d), d, dow: new Date(year, month, d).getDay(), other: false });
    }
    while (out.length % 7 !== 0) {
      const d = new Date(year, month, daysInMonth + (out.length - first.getDay() - daysInMonth) + 1);
      out.push({ date: toISO(d.getFullYear(), d.getMonth(), d.getDate()), d: d.getDate(), dow: d.getDay(), other: true });
    }
    return out;
  }, [view]);

  /* ---------- selected day info ---------- */
  const selDateObj = parseISO(selectedDate);
  const selSlots = slotsByDate[selectedDate] || [];
  const selIsPast = selectedDate < todayISO;
  const selAvailable = selSlots.filter((s) => s.status === "available");
  const selOpenHours = selAvailable.reduce((sum, s) => sum + hoursBetween(s.start_time, s.end_time), 0);
  const selBooked = selAvailable.reduce((sum, s) => sum + (s.booked || 0), 0);
  const selRequested = selAvailable.reduce((sum, s) => sum + (s.requested || 0), 0);
  const fullDayName = DAY_FULL[selDateObj.getDay()];

  const handleSelectDay = (cell) => {
    if (cell.date < todayISO) return;
    setSelectedDate(cell.date);
    if (selectingDates) {
      setSelectedDates((dates) =>
        dates.includes(cell.date) ? dates.filter((date) => date !== cell.date) : [...dates, cell.date]
      );
    } else {
      setSelectedDates([]);
    }
    setError("");
    setNotice("");
    setAvailabilityMode("available");
    if (cell.other) setView({ year: parseISO(cell.date).getFullYear(), month: parseISO(cell.date).getMonth() });
  };

  const toggleDateSelection = () => {
    setSelectingDates((selecting) => !selecting);
    setSelectedDates([]);
    setError("");
    setNotice("");
  };

  const changeMonth = (delta) => {
    const d = new Date(view.year, view.month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };

  /* ---------- save to backend ---------- */
  const handleAddAvailability = async () => {
    setError("");
    setNotice("");

    const datesToSave = selectingDates ? selectedDates : [selectedDate];
    if (datesToSave.length === 0) return setError("Select one or more dates on the calendar.");
    if (datesToSave.some((date) => date < todayISO)) return setError("Past dates cannot be changed.");

    if (!selectedFromTime || !selectedToTime) return setError("Please enter both start and end time.");
    if (selectedFromTime >= selectedToTime) return setError("End time must be later than start time.");

    setSaving(true);
    try {
      await api(`${BASE}/slots`, {
        method: "POST",
        body: JSON.stringify({
          ...(selectingDates ? { dates: datesToSave } : { date: selectedDate }),
          status: availabilityMode,
          start_time: selectedFromTime,
          end_time: selectedToTime,
        }),
      });
      await loadSchedule();
      setSelectedDates([]);
      setSelectingDates(false);
      setNotice(
        availabilityMode === "available"
          ? `Availability added for ${datesToSave.length} date${datesToSave.length === 1 ? "" : "s"}.`
          : `Time blocked for walk-ins on ${datesToSave.length} date${datesToSave.length === 1 ? "" : "s"}.`
      );
      setTimeout(() => setNotice(""), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async (id) => {
    setError("");
    setNotice("");
    try {
      await api(`${BASE}/slots/${id}`, { method: "DELETE" });
      await loadSchedule();
      setAvailabilityMode("available");
    } catch (e) {
      setError(e.message);
    }
  };

  const handleRestoreBlockedTime = async (id) => {
    setError("");
    setNotice("");
    try {
      await api(`${BASE}/slots/${id}/restore`, { method: "POST" });
      await loadSchedule();
      setNotice("Availability restored for that time.");
    } catch (e) {
      setError(e.message);
    }
  };

  const statCards = [
    { count: stats.open_slots ?? 0, label: "Open slots · next 30 days" },
    { count: stats.booked ?? 0, label: "Booked sessions" },
    { count: stats.pending ?? 0, label: "Pending requests" },
    { count: stats.not_available ?? 0, label: "Not available" },
  ];

  const headerDate = `${DAY_FULL[today.getDay()]}, ${MONTHS[today.getMonth()]} ${today.getDate()}`;

  return (
    <div className={`${inter} min-h-screen w-full bg-[#f4f6f5] text-[#1c1c1c] antialiased`}>
      <style>{FONT_CSS}</style>

      <div className="flex w-full items-start">
        {/* Sidebar: laging nakikita sa lg pataas */}
        <div className="hidden lg:block">
          <AdminNavigation />
        </div>

        {/* Sidebar: drawer sa mobile/tablet */}
        {navOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="h-full overflow-y-auto bg-white">
              <AdminNavigation />
            </div>
            <button
              aria-label="Close menu"
              onClick={() => setNavOpen(false)}
              className="flex-1 bg-black/40"
            />
          </div>
        )}

        <main className="flex-1 px-[40px] pt-[32px] pb-[60px] max-w-[1400px]">
          <header className="flex items-start justify-between">
            <div>
              <button
                type="button"
                onClick={() => setNavOpen(true)}
                aria-label="Open menu"
                className="mb-[12px] flex h-[37px] w-[46px] items-center justify-center rounded-[8px] border border-[#c7b6b6] bg-white lg:hidden"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2a8570" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              </button>
              <div className={`${inter} text-[20px] font-bold tracking-[4.2px] text-[#4a9b8e] uppercase`}>SCHEDULE</div>
              <h1 className={`${serif} text-[40px] font-bold leading-[1.15] text-[#2f4a42] mt-[8px]`}>When are you available?</h1>
              <p className={`${serif} text-[15px] text-[#555] mt-[8px] max-w-[620px]`}>
                Set the days and hours clients can book with you. Clients only see the times you open here.
              </p>
              {/* Date chip: nasa ilalim ng description sa mobile */}
              <DateChip label={headerDate} className="mt-[12px] inline-flex sm:hidden" />
            </div>

            <div className="flex items-center gap-[17px] pt-[6px]">
              <DateChip label={headerDate} className="hidden sm:flex" />

              <button
                aria-label="Notifications"
                className="relative flex h-[37px] w-[46px] cursor-pointer items-center justify-center rounded-[8px] border border-[#c7b6b6] bg-white transition-colors hover:bg-[#f9fbf9]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2a8570" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                </svg>
                <span className="absolute right-[10px] top-[8px] h-[7px] w-[7px] rounded-full bg-[#e07b6a]" />
              </button>
              <ProfileMenu size={37} />
            </div>
          </header>

          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-[24px] mt-[34px]">
            {statCards.map((card, i) => (
              <div key={i} className="bg-white border border-[#c7b6b6] rounded-[10px] p-[20px] shadow-sm flex flex-col justify-center min-h-[96px]">
                {loading
                  ? <SkeletonBlock className="h-9 w-16 rounded-md" />
                  : <div className={`${serif} text-[36px] font-bold text-[#202020] leading-none`}>{card.count}</div>}
                <div className={`${serif} text-[14px] text-[#555] font-normal mt-[8px]`}>{card.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[1.38fr_1fr] gap-[24px] mt-[24px]">
            {/* ------------------------ Calendar ------------------------ */}
            <div className="bg-white border border-[#c7b6b6] rounded-[10px] p-[28px] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className={`${serif} text-[24px] font-bold text-[#202020]`}>
                      {MONTHS[view.month]} {view.year}
                    </h2>
                    <p className={`${serif} text-[13px] text-[#666] mt-[2px]`}>
                      {loading
                        ? <SkeletonBlock className="mt-1 h-4 w-56 max-w-full rounded-md" />
                        : selectingDates
                          ? "Click dates to select multiple days for availability"
                          : "Click a date to manage its availability. Use Select for multiple dates."}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-[8px]">
                    <button
                      type="button"
                      onClick={toggleDateSelection}
                      className="rounded-[6px] border border-[#1f6b55] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#1f6b55] hover:bg-[#e3f2ee]"
                    >
                      {selectingDates ? "Cancel" : "Select"}
                    </button>
                    <button
                      onClick={() => changeMonth(-1)}
                      className="w-[28px] h-[28px] rounded-full bg-[#dcf0e8] text-[#1f6b55] flex items-center justify-center hover:bg-[#cbe8dc] transition-colors cursor-pointer border-0"
                      aria-label="Previous month"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                    <button
                      onClick={() => changeMonth(1)}
                      className="w-[28px] h-[28px] rounded-full bg-[#dcf0e8] text-[#1f6b55] flex items-center justify-center hover:bg-[#cbe8dc] transition-colors cursor-pointer border-0"
                      aria-label="Next month"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-[8px] mt-[20px] text-center">
                  {DAYS_HEADER.map((d, i) => (
                    <div key={i} className={`${serif} text-[14px] font-normal text-[#666]`}>{d}</div>
                  ))}
                </div>

                <div className="relative grid grid-cols-7 gap-[8px] mt-[10px]" aria-busy={loading || undefined}>
                  {cells.map((cell) => {
                    const daySlots = slotsByDate[cell.date] || [];
                    const isUnavailable = daySlots.some(isFullDayUnavailable);
                    const availSlots = daySlots.filter((s) => s.status === "available");
                    const blockedSlots = daySlots.filter((s) => s.status === "unavailable" && !isFullDayUnavailable(s));
                    const isAvailable = !isUnavailable && availSlots.length > 0;
                    const hasSession = availSlots.some((s) => (s.booked || 0) > 0);
                    const isSelected = selectingDates
                      ? selectedDates.includes(cell.date)
                      : cell.date === selectedDate;
                    const past = cell.date < todayISO;

                    let cardBg = "bg-white border-[#eef2f0] text-[#202020]";
                    let dayColor = "text-[#202020]";
                    let subtextColor = "text-[#8a9e97]";
                    let hoursColor = "text-[#202020]";
                    let ring = "";

                    if (past) {
                      cardBg = isUnavailable
                        ? "bg-[#f4e9e7] border-[#ecdcd9] opacity-60"
                        : isAvailable
                          ? "bg-[#e6efec] border-[#dce8e4] opacity-60"
                          : "bg-[#f3f4f4] border-[#eceeed] opacity-50";
                      dayColor = "text-[#9aa5a1]";
                      subtextColor = "text-[#aab4b0]";
                      hoursColor = "text-[#9aa5a1]";
                    } else if (cell.other && !isSelected) {
                      cardBg = "bg-white border-[#f2f5f3] opacity-40";
                      dayColor = "text-[#b0c0b9]";
                      subtextColor = "text-[#c2d0c9]";
                    } else if (isUnavailable) {
                      cardBg = "bg-[#f6d5d0] border-[#e2a9a1] text-[#7a2e22]";
                      dayColor = "text-[#7a2e22]";
                      subtextColor = "text-[#9a4a3e]";
                      hoursColor = "text-[#7a2e22]";
                      if (isSelected) ring = " ring-2 ring-[#184a3e] ring-offset-1";
                    } else if (isAvailable) {
                      cardBg = "bg-[#9ccac0] border-[#8fbeb4] text-[#16382f]";
                      dayColor = "text-[#16382f]";
                      subtextColor = "text-[#285045]";
                      hoursColor = "text-[#16382f]";
                      if (isSelected) ring = " ring-2 ring-[#184a3e] ring-offset-1";
                    } else if (isSelected) {
                      cardBg = "bg-[#184a3e] border-[#184a3e] text-white shadow-md";
                      dayColor = "text-white";
                      subtextColor = "text-[#cce2d9]";
                      hoursColor = "text-[#e2f0ea]";
                    }

                    return (
                      <button
                        type="button"
                        key={cell.date}
                        onClick={() => handleSelectDay(cell)}
                        disabled={past}
                        aria-pressed={isSelected}
                        aria-disabled={past}
                        title={past ? "This date has passed" : isUnavailable ? "Not available" : undefined}
                        className={`relative w-full rounded-[8px] border p-[6px] min-h-[66px] flex flex-col items-center justify-center transition-all ${past ? "cursor-not-allowed" : "cursor-pointer hover:scale-[1.02]"
                          } ${cardBg}${ring}`}
                      >
                        {hasSession && <span className="absolute top-[5px] w-[6px] h-[6px] rounded-full bg-[#f3b53f]" />}
                        {isUnavailable && (
                          <span
                            className={`absolute top-[4px] right-[4px] flex h-[13px] w-[13px] items-center justify-center rounded-full ${past ? "bg-[#c9a49e]" : "bg-[#c4574a]"
                              }`}
                          >
                            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round">
                              <path d="M6 6l12 12M18 6L6 18" />
                            </svg>
                          </span>
                        )}

                        <div className={`${serif} text-[16px] font-bold leading-tight ${dayColor}`}>{cell.d}</div>
                        <div className={`${serif} text-[11px] leading-tight mt-[1px] ${subtextColor}`}>{DAY_SHORT[cell.dow]}</div>

                        {isUnavailable && (
                          <div className={`${serif} text-[9px] font-bold leading-tight mt-[3px] text-center ${hoursColor}`}>Not available</div>
                        )}
                        {!isUnavailable &&
                          availSlots.slice(0, 2).map((s) => (
                            <div key={s.id} className={`${serif} text-[9px] font-medium leading-tight mt-[2px] text-center ${hoursColor}`}>
                              {fmt(s.start_time)} - {fmt(s.end_time)}
                            </div>
                          ))}
                        {!isUnavailable && availSlots.length > 2 && (
                          <div className={`${serif} text-[9px] leading-tight mt-[2px] ${subtextColor}`}>+{availSlots.length - 2} more</div>
                        )}
                        {!isUnavailable && blockedSlots.length > 0 && (
                          <div className={`${serif} text-[9px] font-bold leading-tight mt-[2px] text-center ${isAvailable ? "text-[#9a4a3e]" : hoursColor}`}>
                            {blockedSlots.length} blocked
                          </div>
                        )}
                      </button>
                    );
                  })}
                  {loading && (
                    <div className="absolute inset-0 z-10 grid grid-cols-7 gap-[8px] bg-white">
                      {cells.map((cell) => (
                        <SkeletonBlock key={cell.date} className="min-h-[66px] w-full rounded-[8px]" />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-[18px] mt-[26px] pt-[14px] border-t border-[#edf2ef] text-[12px] text-[#666]">
                <div className="flex items-center gap-[6px]">
                  <span className="h-[12px] w-[12px] rounded-[3px] bg-[#9ccac0]" />
                  <span className={serif}>Available</span>
                </div>
                <div className="flex items-center gap-[6px]">
                  <span className="w-[12px] h-[12px] rounded-[3px] bg-[#f6d5d0] border border-[#e2a9a1]" />
                  <span className={serif}>Not available</span>
                </div>
                <div className="flex items-center gap-[6px]">
                  <span className="w-[12px] h-[12px] rounded-[3px] bg-[#f3f4f4] border border-[#dfe2e1]" />
                  <span className={serif}>Past date</span>
                </div>
                <div className="flex items-center gap-[6px]">
                  <span className="w-[8px] h-[8px] rounded-full bg-[#f3b53f]" />
                  <span className={serif}>Has sessions</span>
                </div>
              </div>
            </div>

            {/* ------------------- Availability settings ------------------- */}
            <div className="bg-white border border-[#c7b6b6] rounded-[10px] p-[28px] shadow-sm flex flex-col justify-between">
              <div>
                <h3 className={`${serif} text-[24px] font-bold text-[#202020]`}>
                  {fullDayName}, {MONTHS[selDateObj.getMonth()]} {selDateObj.getDate()}
                </h3>
                <p className={`${serif} text-[13px] text-[#666] mt-[2px]`}>
                  {selectingDates && `${selectedDates.length} date${selectedDates.length === 1 ? "" : "s"} selected · `}
                  {loading ? (
                    <SkeletonBlock className="inline-block h-4 w-48 max-w-full align-middle rounded-md" />
                  ) : (
                    `${selOpenHours} open hours · ${selBooked} booked · ${selRequested} requested`
                  )}
                </p>
                {selectingDates && selectedDates.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Selected dates">
                    {[...selectedDates].sort().map((date) => (
                      <button
                        key={date}
                        type="button"
                        onClick={() => setSelectedDates((dates) => dates.filter((item) => item !== date))}
                        className={`${serif} rounded-full border border-[#a8dbc4] bg-[#e6f4ee] px-2.5 py-1 text-[11px] text-[#175240]`}
                        aria-label={`Remove ${date} from selected dates`}
                      >
                        {parseISO(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} ×
                      </button>
                    ))}
                  </div>
                )}

                {/* Availability modes */}
                <div className={`grid grid-cols-2 gap-[14px] mt-[20px] ${selIsPast ? "pointer-events-none opacity-50" : ""}`}>
                  {[
                    { key: "available", title: "Available", sub: "Client can book this date" },
                    { key: "blocked", title: "Not available", sub: "Block time for a walk-in" },
                  ].map((opt) => (
                    <div
                      key={opt.key}
                      onClick={() => setAvailabilityMode(opt.key)}
                      className={`rounded-[8px] border p-[12px] transition-all cursor-pointer ${availabilityMode === opt.key
                        ? "border-[#1f6b55] bg-white shadow-sm ring-1 ring-[#1f6b55]"
                        : "border-[#c7b6b6] bg-[#fbfdfc] opacity-70"
                        }`}
                    >
                      <div className="flex items-center gap-[6px] text-[#202020]">
                        {availabilityMode === opt.key && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1f6b55" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                        <span className={`${serif} font-bold text-[14px]`}>{opt.title}</span>
                      </div>
                      <div className={`${serif} text-[11px] text-[#666] mt-[3px]`}>{opt.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Saved slots for this day */}
                <div className="mt-[22px]">
                  <div className={`${inter} block text-[11px] font-bold tracking-[1.5px] text-[#666] uppercase mb-[8px]`}>
                    SAVED FOR THIS DAY
                  </div>
                  {loading ? (
                    <div className="flex flex-col gap-[8px]">
                      {[0, 1, 2].map((i) => (
                        <SkeletonBlock key={i} className="h-10 w-full rounded-[6px]" />
                      ))}
                    </div>
                  ) : selSlots.length === 0 ? (
                    <p className={`${serif} text-[13px] text-[#888]`}>Nothing saved yet. Add a time below.</p>
                  ) : (
                    <div className="flex flex-col gap-[8px]">
                      {selSlots.map((s) => (
                        <div
                          key={s.id}
                          className={`flex items-center justify-between rounded-[6px] border px-[12px] py-[8px] ${s.status === "unavailable" ? "border-[#e2a9a1] bg-[#fdf0ee]" : "border-[#a8dbc4] bg-[#e6f4ee]"
                            }`}
                        >
                          <span className={`${serif} text-[13px] text-[#202020]`}>
                            {s.status === "unavailable"
                              ? isFullDayUnavailable(s)
                                ? "Not available all day"
                                : `${fmtLong(s.start_time)} – ${fmtLong(s.end_time)} · Walk-in block`
                              : `${fmtLong(s.start_time)} – ${fmtLong(s.end_time)}`}
                            {s.created_by && (
                              <span className="ml-[8px] rounded-full bg-white/70 px-[8px] py-[1px] text-[10px] uppercase tracking-wide text-[#555]">
                                {s.created_by}
                              </span>
                            )}
                          </span>
                          {!selIsPast && (
                            isFullDayUnavailable(s) ? (
                              <button
                                onClick={() => handleDeleteSlot(s.id)}
                                className={`${serif} text-[12px] text-[#b4493a] hover:underline cursor-pointer bg-transparent border-0`}
                              >
                                Remove
                              </button>
                            ) : s.status === "unavailable" ? (
                              <button
                                onClick={() => handleRestoreBlockedTime(s.id)}
                                className={`${serif} text-[12px] text-[#1f6b55] hover:underline cursor-pointer bg-transparent border-0`}
                              >
                                Restore
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDeleteSlot(s.id)}
                                className={`${serif} text-[12px] text-[#b4493a] hover:underline cursor-pointer bg-transparent border-0`}
                              >
                                Remove
                              </button>
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add availability */}
                {selIsPast ? (
                  <div className={`${serif} mt-[24px] rounded-[8px] border border-[#dfe2e1] bg-[#f3f4f4] p-[14px] text-[13px] text-[#6b7571]`}>
                    This date has passed, so its schedule can't be changed.
                  </div>
                ) : (
                  <div className="mt-[24px]">
                    <h4 className={`${serif} text-[20px] font-bold text-[#202020]`}>
                      {availabilityMode === "blocked" ? "Block time for a walk-in" : "Add availability"}
                    </h4>
                    <p className={`${serif} text-[13px] text-[#666] mt-[2px]`}>
                      {availabilityMode === "blocked"
                        ? "Clients won't be able to book this time. Other available times remain open."
                        : "Pick the time for all selected dates. You can select multiple dates on the calendar."}
                    </p>

                    <div className="mt-[16px]">
                      <label className={`${inter} block text-[11px] font-bold tracking-[1.5px] text-[#666] uppercase mb-[6px]`}>
                        FROM AND TO
                      </label>
                      <div className="flex items-center gap-[10px]">
                        <select
                          value={selectedFromTime}
                          onChange={(e) => availabilityMode === "blocked" ? setBlockFromTime(e.target.value) : setFromTime(e.target.value)}
                          aria-label="From time"
                          className={`${serif} w-full rounded-[6px] border border-[#c7b6b6] bg-white px-[14px] py-[8px] text-[14px] text-[#202020] outline-none focus:border-[#1f6b55] focus:ring-1 focus:ring-[#1f6b55]`}
                        >
                          {TIME_OPTIONS.map((time) => (
                            <option key={time.value} value={time.value}>{time.label}</option>
                          ))}
                        </select>
                        <span className={`${serif} text-[13px] font-medium text-[#666] px-[2px]`}>To</span>
                        <select
                          value={selectedToTime}
                          onChange={(e) => availabilityMode === "blocked" ? setBlockToTime(e.target.value) : setToTime(e.target.value)}
                          aria-label="To time"
                          className={`${serif} w-full rounded-[6px] border border-[#c7b6b6] bg-white px-[14px] py-[8px] text-[14px] text-[#202020] outline-none focus:border-[#1f6b55] focus:ring-1 focus:ring-[#1f6b55]`}
                        >
                          {TIME_OPTIONS.map((time) => (
                            <option key={time.value} value={time.value}>{time.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className={`mt-[20px] bg-[#e6f4ee] border border-[#a8dbc4] rounded-[8px] p-[14px] text-[#175240] ${selIsPast ? "hidden" : ""}`}>
                  <span className={`${serif} text-[13px]`}>
                    {selectingDates && selectedDates.length === 0
                      ? "Select one or more dates on the calendar."
                      : availabilityMode === "blocked"
                      ? `You will block ${fmtLong(selectedFromTime)} – ${fmtLong(selectedToTime)} for a walk-in ${selectingDates
                          ? `on all ${selectedDates.length} selected date${selectedDates.length === 1 ? "" : "s"}`
                          : `on ${fullDayName}, ${MONTHS[selDateObj.getMonth()]} ${selDateObj.getDate()}`}.`
                      : selectedFromTime && selectedToTime
                        ? `You'll open ${fmtLong(selectedFromTime)} – ${fmtLong(selectedToTime)} ${selectingDates
                          ? `on all ${selectedDates.length} selected date${selectedDates.length === 1 ? "" : "s"}`
                          : `on ${fullDayName}, ${MONTHS[selDateObj.getMonth()]} ${selDateObj.getDate()}`}.`
                        : "Choose a start and end time."}
                  </span>
                </div>

                {error && (
                  <div className={`${serif} mt-[10px] rounded-[8px] border border-[#e8b4ab] bg-[#fdf0ee] p-[10px] text-[13px] text-[#9a3b2e]`}>
                    {error}
                  </div>
                )}

                {notice && (
                  <div className="mt-[10px] text-[13px] font-semibold text-[#1f6b55] flex items-center gap-[6px]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className={serif}>{notice}</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleAddAvailability}
                disabled={saving || (selectingDates ? selectedDates.length === 0 : selIsPast)}
                className={`${serif} w-full mt-[28px] py-[12px] bg-[#00a58a] hover:bg-[#00937a] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-[8px] text-[15px] font-semibold transition-all shadow-sm hover:shadow cursor-pointer border-0`}
              >
                {saving
                  ? "Saving…"
                  : selectingDates && selectedDates.length === 0
                    ? "Select dates to continue"
                    : availabilityMode === "blocked"
                        ? selectingDates
                          ? "Block time for selected dates"
                          : "Block time for walk-in"
                        : selectingDates
                          ? "+ Add availability for selected dates"
                          : "+ Add availability"}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}