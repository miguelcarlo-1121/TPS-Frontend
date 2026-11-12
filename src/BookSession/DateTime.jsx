import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Navbar, Footer, Reveal, container, btnGhost, btnSolid } from "../components/Layout";
import { Avatar } from "../components/ProfileMenu";
import { apiFetch } from "../auth";
import StepRail from "./StepRail";
import BookingSummary from "./BookingSummary";
import { useBooking } from "./bookingContext";

const pageShell = "font-sans text-black bg-tf-bg overflow-x-hidden antialiased";
const mainPad = "py-12 pb-24 max-[720px]:py-7 max-[720px]:pb-16 bg-tf-bg";
const gridClass =
  "grid grid-cols-[minmax(0,1fr)_320px] gap-7 mt-8 items-start max-[900px]:grid-cols-1";
const panelClass =
  "bg-white border border-black/[0.23] rounded-[21px] p-7 max-[720px]:p-5";

const pad = (n) => String(n).padStart(2, "0");
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

// "13:00" -> "1:00 PM"
function to12(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? "PM" : "AM"}`;
}

function buildMonth(year, month) {
  const cells = [];
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

const CLEAR_HOLD = {
  date: null,
  time: null,
  timeStart: null,
  timeEnd: null,
  holdId: null,
  holdExpiresAt: null,
  providerId: null,
};

const MODES = [
  ["psychologist-first", "Psychologist first"],
  ["schedule-first", "Schedule first"],
];

function SlotButton({ time, selected, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "h-[42px] rounded-lg border font-serif text-[0.9rem] grid place-items-center transition-[background,border-color,color] duration-150",
        disabled && !selected && "cursor-not-allowed opacity-60",
        !selected && "cursor-pointer bg-white border-black/14 text-[#202020] hover:border-tf-teal",
        selected && "bg-[#2c5743] border-[#2c5743] text-white",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {time}
    </button>
  );
}

function PsychCard({ p, selected, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "w-full flex flex-col items-center text-center bg-[#fdfdfd] border border-black/[0.23] rounded-[21px] px-[18px] py-6 transition-[border-color,transform,box-shadow] duration-200",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(30,78,65,0.08)]",
        selected && "border-[3px] border-tf-teal",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Avatar user={p} size={96} />
      <h3 className="m-0 mt-3 font-sans font-bold text-tf-teal text-[1.05rem]">{p.name}</h3>
      <p className="m-0 mt-0.5 text-[#666] text-[0.85rem]">Psychologist</p>
    </button>
  );
}

export default function DateTime() {
  const navigate = useNavigate();
  const location = useLocation();
  const { booking, update, service, services, feeLabel } = useBooking();

  // Galing sa MyAppointments (Reschedule). Kapag wala, normal na booking.
  const reschedule = location.state?.reschedule || null;
  const isResched = !!reschedule;

  const serviceId = isResched ? reschedule.serviceId : booking.serviceId;
  const psychId = isResched ? reschedule.psychologistId : booking.psychologistId;
  const selectedService = services.find((item) => item.id === serviceId) || service;
  const normalizedServiceName = String(selectedService?.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const isPsycho = serviceId === "psychotherapy" || normalizedServiceName.includes("psychotherapy");
  const isAssessment =
    serviceId === "assessment" ||
    (normalizedServiceName.includes("assessment") && normalizedServiceName.includes("consultation"));

  const mode = isPsycho
    ? isResched
      ? "psychologist-first" // fixed: same psychologist, walang picker
      : MODES.some(([id]) => id === booking.bookingMode)
        ? booking.bookingMode
        : "psychologist-first"
    : null;
  const pFirst = mode === "psychologist-first";
  const sFirst = mode === "schedule-first";

  const holdActive =
    !!booking.holdId &&
    !!booking.holdExpiresAt &&
    new Date(booking.holdExpiresAt).getTime() > Date.now();

  const today = new Date();
  const [year, setYear] = useState(
    !isResched ? booking.date?.year ?? today.getFullYear() : today.getFullYear()
  );
  const [month, setMonth] = useState(
    !isResched ? booking.date?.month ?? today.getMonth() : today.getMonth()
  );
  // Sa reschedule, walang naka-pre-select na lumang hold
  const [day, setDay] = useState(!isResched && holdActive ? booking.date?.day ?? null : null);
  const [slot, setSlot] = useState(
    !isResched && holdActive && booking.timeStart
      ? { start: booking.timeStart, end: booking.timeEnd }
      : null
  );
  // Psychotherapy: step 1 / step 2 (depende sa mode). Reschedule: diretso calendar.
  const [step, setStep] = useState(
    isResched ? (isPsycho ? 2 : 1) : isPsycho && holdActive && psychId ? 2 : 1
  );

  const [availableDays, setAvailableDays] = useState(new Set());
  const [daysLoading, setDaysLoading] = useState(false);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [recs, setRecs] = useState([]); // history-based recommendations (Stage 2)
  const [psychList, setPsychList] = useState([]);
  const [psychLoading, setPsychLoading] = useState(false);
  const [holding, setHolding] = useState(false);
  const [error, setError] = useState("");

  // Alin ang ipapakita: listahan ng psychologists o calendar?
  const showPsychPicker = isPsycho && ((pFirst && step === 1) || (sFirst && step === 2));
  const showCalendar = !!serviceId && !showPsychPicker;
  const calendarReady = showCalendar && (!isPsycho || sFirst || !!psychId);

  const weeks = useMemo(() => buildMonth(year, month), [year, month]);
  const monthKey = `${year}-${pad(month + 1)}`;

  const handleErr = (err, fallback) => {
    if (err.message?.includes("session expired")) {
      navigate("/signin");
      return;
    }
    setError(err.message || fallback);
  };

  // Schedule-first step 2 na walang napiling date/oras -> balik sa step 1
  useEffect(() => {
    if (sFirst && step === 2 && (!day || !slot)) setStep(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sFirst, step]);

  const calendarParams = () => {
    const q = new URLSearchParams({ service: serviceId });
    if (isPsycho && pFirst) q.set("psychologist_id", psychId);
    if (isAssessment && booking.assessmentTypeId) q.set("assessment_type_id", booking.assessmentTypeId);
    // ABA / Assessment reschedule: same provider pa rin
    if (isResched && !isPsycho && reschedule.providerId) {
      q.set("provider_id", reschedule.providerId);
    }
    return q;
  };

  // 1) Mga petsa na may bakante
  useEffect(() => {
    if (!calendarReady) return;
    let alive = true;
    setDaysLoading(true);
    const q = calendarParams();
    q.set("month", monthKey);
    apiFetch(`/booking/availability?${q}`)
      .then((d) => {
        if (!alive) return;
        setAvailableDays(new Set((d.days || []).map((s) => Number(s.slice(8, 10)))));
      })
      .catch((err) => alive && handleErr(err, "Could not load the calendar."))
      .finally(() => alive && setDaysLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarReady, serviceId, mode, psychId, monthKey]);

  // 2) Mga oras sa napiling araw
  useEffect(() => {
    if (!calendarReady || !day) {
      setSlots([]);
      return;
    }
    let alive = true;
    setSlotsLoading(true);
    const q = calendarParams();
    q.set("date", ymd(year, month, day));
    apiFetch(`/booking/slots?${q}`)
      .then((d) => alive && setSlots(d.slots || []))
      .catch((err) => alive && handleErr(err, "Could not load time slots."))
      .finally(() => alive && setSlotsLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarReady, serviceId, mode, psychId, year, month, day]);

  // Recommended times (galing sa engine, base sa huling completed session ng client)
  const fetchRecs = (startTime) => {
    const q = new URLSearchParams({ service: serviceId, date: ymd(year, month, day) });
    if (isPsycho && psychId) q.set("psychologist_id", psychId);
    if (isAssessment && booking.assessmentTypeId) q.set("assessment_type_id", booking.assessmentTypeId);
    if (startTime) q.set("start_time", startTime);
    return apiFetch(`/booking/recommendations?${q}`).then((d) => d.recommendations || []);
  };

  useEffect(() => {
    setRecs([]);
    if (isResched || !calendarReady || !day || slotsLoading) return;
    if (isPsycho && !psychId) return;
    let alive = true;
    fetchRecs()
      .then((r) => alive && setRecs(r))
      .catch(() => { });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarReady, serviceId, psychId, year, month, day, slotsLoading]);

  // Pinili ng client ang isang recommendation: lipat sa petsa/oras na iyon
  const applyRec = (r) => {
    if (holding) return;
    const [y, m, d] = r.date.split("-").map(Number);
    if (booking.holdId) releaseHold();
    setError("");
    setYear(y);
    setMonth(m - 1);
    setDay(d);
    setSlot({ start: r.start, end: r.end });
  };

  // 3) Listahan ng psychologists
  useEffect(() => {
    if (!showPsychPicker) return;
    if (sFirst && (!day || !slot)) return;
    let alive = true;
    setPsychLoading(true);
    const req = pFirst
      ? apiFetch("/psychologists")
      : apiFetch(
        `/booking/psychologists?${new URLSearchParams({
          date: ymd(year, month, day),
          start_time: slot.start,
        })}`
      );
    req
      .then((d) => alive && setPsychList(d.psychologists || []))
      .catch((err) => alive && handleErr(err, "Could not load psychologists."))
      .finally(() => alive && setPsychLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPsychPicker, mode]);

  // ---------- hold helpers ----------
  const dropServerHold = () => {
    if (booking.holdId) {
      apiFetch(`/booking/hold/${booking.holdId}`, { method: "DELETE" }).catch(() => { });
    }
  };

  // Isang update() lang para hindi mag-overwrite ang state
  const releaseHold = (extra = {}) => {
    dropServerHold();
    update({ ...CLEAR_HOLD, ...extra });
  };

  // Reschedule: linisin ang naiwang hold at i-set ang service/psychologist sa context
  useEffect(() => {
    if (!isResched) return;
    dropServerHold();
    update({
      ...CLEAR_HOLD,
      serviceId: reschedule.serviceId,
      bookingMode: "psychologist-first",
      psychologistId: reschedule.psychologistId ?? null,
      psychologist: reschedule.psychologistId
        ? { id: reschedule.psychologistId, name: reschedule.psychologist }
        : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchMode = (id) => {
    if (id === mode) return;
    dropServerHold();
    update({ ...CLEAR_HOLD, bookingMode: id, psychologistId: null, psychologist: null });
    setDay(null);
    setSlot(null);
    setStep(1);
    setError("");
    setAvailableDays(new Set());
    setPsychList([]);
  };

  const changeMonth = (delta) => {
    releaseHold();
    setSlot(null);
    setDay(null);
    setError("");
    setAvailableDays(new Set());
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const selectDay = (d) => {
    if (d === day) return;
    releaseHold();
    setSlot(null);
    setError("");
    setDay(d);
  };

  const saveHold = (h, psych) =>
    update({
      ...(psych ? { psychologistId: psych.id, psychologist: psych } : {}),
      date: { year, month, day },
      time: to12(h.start_time),
      timeStart: h.start_time,
      timeEnd: h.end_time,
      holdId: h.id,
      holdExpiresAt: h.expires_at,
      providerId: h.provider_id,
    });

  // Pagpili ng oras: wala pang hold dito. Magho-hold lang pag pinindot ang Continue.
  const selectTime = (s) => {
    if (holding || slot?.start === s.start_time) return;
    setError("");
    if (booking.holdId) releaseHold(); // may naunang hold sa ibang oras
    setSlot({ start: s.start_time, end: s.end_time });
  };

  // Psychologist-first, step 1
  const pickPsychFirst = (p) => {
    if (p.id === psychId) return;
    releaseHold({ psychologistId: p.id, psychologist: p });
    setDay(null);
    setSlot(null);
    setError("");
  };

  // Schedule-first, step 2: pipili lang ng psychologist. Wala pang hold.
  const pickPsychForSlot = (p) => {
    if (holding || !day || !slot || p.id === psychId) return;
    setError("");
    releaseHold({ psychologistId: p.id, psychologist: p });
  };

  // DITO nagsisimula ang 1-hour hold (sa Continue lang tinatawag)
  const createHold = async () => {
    const d = await apiFetch("/booking/hold", {
      method: "POST",
      body: JSON.stringify({
        service: serviceId,
        psychologist_id: isPsycho ? psychId : null,
        ...(isAssessment && booking.assessmentTypeId ? { assessment_type_id: booking.assessmentTypeId } : {}),
        // ABA / Assessment reschedule: same provider
        ...(isResched && !isPsycho && reschedule.providerId
          ? { provider_id: reschedule.providerId }
          : {}),
        date: ymd(year, month, day),
        start_time: slot.start,
      }),
    });
    saveHold(d.hold, sFirst ? booking.psychologist : null);
    return d.hold;
  };

  // Kapag may nakaabot na ng slot bago siya (409 galing server)
  const onHoldFail = (err) => {
    handleErr(err, "Sorry, that time was just taken. Please pick another.");
    if (sFirst) {
      setPsychList((prev) => prev.filter((x) => x.id !== psychId));
      update({ psychologistId: null, psychologist: null });
    } else {
      const failedStart = slot?.start;
      setSlots((prev) => prev.filter((p) => p.start_time !== failedStart));
      setSlot(null);
      if (failedStart && !isResched) {
        fetchRecs(failedStart)
          .then((r) => setRecs(r))
          .catch(() => { });
      }
    }
  };

  // ---------- navigation ----------
  let canContinue = false;
  if (!serviceId) canContinue = false;
  else if (!isPsycho) canContinue = !!day && !!slot;
  else if (isResched) canContinue = !!day && !!slot;
  else if (pFirst && step === 1) canContinue = !!psychId;
  else if (pFirst && step === 2) canContinue = !!day && !!slot;
  else if (sFirst && step === 1) canContinue = !!day && !!slot;
  else canContinue = !!day && !!slot && !!psychId;

  // Reschedule: mag-hold muna, tapos palitan ang date at oras ng existing appointment
  const confirmReschedule = async () => {
    setError("");
    setHolding(true);
    try {
      const h = await createHold();
      const d = await apiFetch(`/my-appointments/${reschedule.id}/reschedule`, {
        method: "POST",
        body: JSON.stringify({ hold_id: h.id }),
      });
      update({ ...CLEAR_HOLD });
      navigate("/book/confirmation", {
        state: { rescheduled: true, appointment: d.appointment },
      });
    } catch (err) {
      onHoldFail(err);
    } finally {
      setHolding(false);
    }
  };

  const goNext = async () => {
    if (!canContinue || holding) return;
    setError("");
    if (isResched) {
      confirmReschedule();
      return;
    }
    if (isPsycho && step === 1) {
      setStep(2);
      return;
    }

    // Final step: dito magsisimula ang 1-hr hold.
    // Kung bumalik lang siya galing /book/info at pareho pa rin ang pinili, huwag nang mag-hold ulit.
    const sameHold =
      holdActive &&
      booking.timeStart === slot.start &&
      booking.date?.year === year &&
      booking.date?.month === month &&
      booking.date?.day === day &&
      (!isPsycho || booking.psychologistId === psychId);

    if (!sameHold) {
      setHolding(true);
      try {
        await createHold();
      } catch (err) {
        onHoldFail(err);
        setHolding(false);
        return;
      }
      setHolding(false);
    }
    navigate("/book/info");
  };

  const goBack = () => {
    setError("");
    if (isResched) {
      releaseHold();
      navigate("/my-appointments");
      return;
    }
    if (isPsycho && step === 2) {
      if (pFirst) {
        releaseHold();
        setDay(null);
        setSlot(null);
      } else {
        releaseHold({ psychologistId: null, psychologist: null }); // keep day & oras
      }
      setStep(1);
      return;
    }
    navigate("/book");
  };

  const morning = slots.filter((s) => Number(s.start_time.slice(0, 2)) < 12);
  const afternoon = slots.filter((s) => Number(s.start_time.slice(0, 2)) >= 12);

  const renderSlots = (list) => (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2.5 max-[720px]:grid-cols-2">
      {list.map((s) => (
        <SlotButton
          key={s.start_time}
          time={to12(s.start_time)}
          selected={slot?.start === s.start_time}
          disabled={holding}
          onClick={() => selectTime(s)}
        />
      ))}
    </div>
  );

  const dateLabel = day
    ? new Date(year, month, day).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";

  const pickedPsych =
    isResched && reschedule.psychologistId
      ? { id: reschedule.psychologistId, name: reschedule.psychologist }
      : booking.psychologist;

  const heading = showPsychPicker
    ? pFirst
      ? "Choose your psychologist"
      : "Psychologists available for this schedule"
    : isResched
      ? "Pick a new date & time"
      : "Pick a date & time";

  const summaryRows = [
    { label: "SERVICE", value: service?.name || "—" },
    {
      label: "PSYCHOLOGIST",
      value: isPsycho ? pickedPsych?.name || "To be set" : "Assigned by the clinic",
    },
    {
      label: "DATE & TIME",
      value:
        day && slot ? `${dateLabel} · ${to12(slot.start)} - ${to12(slot.end)}` : "To be set",
    },
  ];

  return (
    <div className={pageShell}>
      <Navbar />
      <main className={mainPad}>
        <div className={container}>
          {!isResched && (
            <Reveal>
              <StepRail current={1} />
            </Reveal>
          )}
          <div className={gridClass}>
            <Reveal className={panelClass} delay={140}>
              <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="m-0 mb-1.5 font-serif text-[1.4rem] font-normal text-[#202020]">
                    {heading}
                  </h2>
                  <p className="m-0 text-sm text-[#666]">
                    {service?.name || "Service"}
                    {isPsycho && pickedPsych ? ` · ${pickedPsych.name}` : ""}
                  </p>
                </div>
                {isPsycho && !isResched && (
                  <div className="inline-flex rounded-[11px] bg-tf-teal/19 p-1 gap-1">
                    {MODES.map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        className={[
                          "border-0 rounded-lg py-2 px-3 font-serif text-[0.78rem] cursor-pointer transition-[background,color] duration-200",
                          mode === id
                            ? "bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] font-bold text-[#202020]"
                            : "bg-transparent text-[#202020]",
                        ].join(" ")}
                        onClick={() => switchMode(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </header>

              {!serviceId && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Please select a service first.{" "}
                  <Link to="/book" className="font-bold text-tf-teal underline">
                    Go back to Step 1
                  </Link>
                </div>
              )}

              {isResched && (
                <p className="m-0 mt-4 rounded-lg bg-[#e3f2ee] px-4 py-3 text-sm text-[#2f4a42]">
                  You are rescheduling your appointment. Your current schedule stays until you
                  confirm the new one. Your payment and details stay the same.
                </p>
              )}

              {!isResched && isPsycho && pFirst && step === 2 && pickedPsych && (
                <p className="m-0 mt-4 text-sm text-tf-body">
                  Showing availability for <strong>{pickedPsych.name}</strong>.
                </p>
              )}
              {isPsycho && sFirst && step === 1 && (
                <p className="m-0 mt-4 text-sm text-tf-body">
                  Showing all available schedules. Pick a date and time, then choose from the
                  psychologists available for it.
                </p>
              )}
              {isPsycho && sFirst && step === 2 && day && slot && (
                <p className="m-0 mt-4 text-sm text-tf-body">
                  Available on{" "}
                  <strong>
                    {dateLabel} · {to12(slot.start)} - {to12(slot.end)}
                  </strong>
                  .
                </p>
              )}

              {error && (
                <p
                  role="alert"
                  className="mt-4 mb-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                >
                  {error}
                </p>
              )}

              {/* ---------- Psychologist picker ---------- */}
              {showPsychPicker && (
                <div className="mt-5">
                  {psychLoading && <p className="m-0 text-sm text-[#666]">Loading psychologists…</p>}
                  {!psychLoading && psychList.length === 0 && (
                    <p className="m-0 text-sm text-[#666]">
                      {pFirst
                        ? "No psychologists available right now."
                        : "No psychologists are available for this schedule. Go back and choose another time."}
                    </p>
                  )}
                  <ul className="list-none p-0 m-0 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-[18px] max-[720px]:grid-cols-1">
                    {psychList.map((p) => (
                      <li key={p.id}>
                        <PsychCard
                          p={p}
                          disabled={holding}
                          selected={psychId === p.id}
                          onClick={() => (pFirst ? pickPsychFirst(p) : pickPsychForSlot(p))}
                        />
                      </li>
                    ))}
                  </ul>
                  {sFirst && psychId && (
                    <p className="mt-4 mb-0 text-xs text-[#666]">
                      Your time will be held for 1 hour once you click Continue.
                    </p>
                  )}
                </div>
              )}

              {/* ---------- Calendar + oras ---------- */}
              {showCalendar && (
                <div className="grid grid-cols-[380px_minmax(0,1fr)] gap-7 mt-5 items-start max-[900px]:grid-cols-1">
                  <div className="bg-white border border-[#e8eeeb] rounded-[14px] px-4 pt-3.5 pb-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <button
                        type="button"
                        className="w-9 h-9 rounded-full border border-[#e8eeeb] bg-white text-[#1e4c40] text-[1.1rem] cursor-pointer grid place-items-center hover:bg-[#f3f8f6]"
                        onClick={() => changeMonth(-1)}
                      >
                        ‹
                      </button>
                      <p className="m-0 font-serif font-bold text-[#1e4c40] text-[1.1rem] text-center flex-1">
                        {new Date(year, month).toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      <button
                        type="button"
                        className="w-9 h-9 rounded-full border border-[#e8eeeb] bg-white text-[#1e4c40] text-[1.1rem] cursor-pointer grid place-items-center hover:bg-[#f3f8f6]"
                        onClick={() => changeMonth(1)}
                      >
                        ›
                      </button>
                    </div>
                    <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[0.7rem] font-bold tracking-wide text-[#8a9690]">
                      {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                        <span key={i}>{d}</span>
                      ))}
                    </div>
                    <div className={`flex flex-col gap-1.5 ${daysLoading ? "opacity-60" : ""}`}>
                      {weeks.map((week, wi) => (
                        <div key={wi} className="grid grid-cols-7 gap-1.5">
                          {week.map((d, di) => {
                            if (!d) return <span key={di} className="aspect-square block" />;
                            const isAvail = calendarReady && availableDays.has(d);
                            return (
                              <button
                                key={di}
                                type="button"
                                disabled={!isAvail}
                                className={[
                                  "relative aspect-square rounded-[14px] border-0 font-sans font-medium text-[0.95rem] grid place-items-center transition-[background,color] duration-150",
                                  !isAvail && "bg-white text-[#adb8b2] cursor-not-allowed",
                                  isAvail &&
                                  day !== d &&
                                  "bg-[#f3f8f6] text-[#29353b] cursor-pointer hover:outline hover:outline-2 hover:outline-[#b6d2c4]",
                                  day === d && "bg-[#1e4c40] text-white",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                onClick={() => selectDay(d)}
                              >
                                {d}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-[0.7rem] text-[#666]">
                      <span className="inline-flex items-center gap-1.5">
                        <i className="size-2.5 rounded-sm bg-[#f3f8f6] border border-[#c5d8ce] not-italic" />{" "}
                        Available
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <i className="size-2.5 rounded-sm bg-white border border-[#e5ebe8] not-italic" />{" "}
                        Unavailable
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <i className="size-2.5 rounded-sm bg-[#1e4c40] not-italic" /> Selected
                      </span>
                    </div>
                    {calendarReady && !daysLoading && availableDays.size === 0 && (
                      <p className="mt-3 mb-0 text-xs text-[#666]">
                        No available dates this month. Try the next month.
                      </p>
                    )}
                  </div>

                  <div className="min-w-0">
                    {!day && (
                      <div className="rounded-xl border border-dashed border-[#b6d2c4] bg-[#f9fcfb] px-5 py-10 text-center">
                        <p className="m-0 font-serif text-base text-[#3d5c52]">Select a date</p>
                        <p className="m-0 mt-1 text-sm text-[#666]">
                          Available days are highlighted on the calendar.
                        </p>
                      </div>
                    )}

                    {day && (
                      <>
                        <p className="m-0 mb-1 font-serif text-[1.15rem] text-[#202020]">
                          {new Date(year, month, day).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>

                        {slotsLoading ? (
                          <p className="mt-4 text-sm text-[#666]">Loading time slots…</p>
                        ) : slots.length === 0 ? (
                          <p className="mt-4 text-sm text-[#666]">
                            No open time slots left on this date. Please choose another day.
                          </p>
                        ) : (
                          <>
                            {morning.length > 0 && (
                              <div className="mt-4">
                                <p className="m-0 mb-2 font-serif font-bold text-[#666] text-[0.72rem] tracking-[0.1em]">
                                  MORNING
                                </p>
                                {renderSlots(morning)}
                              </div>
                            )}
                            {afternoon.length > 0 && (
                              <div className="mt-4">
                                <p className="m-0 mb-2 font-serif font-bold text-[#666] text-[0.72rem] tracking-[0.1em]">
                                  AFTERNOON
                                </p>
                                {renderSlots(afternoon)}
                              </div>
                            )}
                            {slot && !sFirst && (
                              <p className="mt-4 mb-0 text-xs text-[#666]">
                                Your time will be held for 1 hour once you click Continue.
                              </p>
                            )}
                          </>
                        )}

                        {/* Morning → Afternoon → Recommendations */}
                        {!slotsLoading && recs.length > 0 && (
                          <div className="mt-5 rounded-xl border border-tf-teal/30 bg-[#f9fcfb] p-4">
                            <p className="m-0 font-serif font-bold text-[#3d5c52] text-[0.72rem] tracking-[0.1em]">
                              RECOMMENDED FOR YOU
                            </p>
                            <p className="m-0 mt-1 mb-3 text-xs text-[#666]">
                              Based on your previous session. Pick one to select it.
                            </p>
                            <div className="grid gap-2">
                              {recs.map((r) => {
                                const [ry, rm, rd] = r.date.split("-").map(Number);
                                const label = new Date(ry, rm - 1, rd).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                });
                                const chosen =
                                  slot?.start === r.start && day === rd && month === rm - 1 && year === ry;
                                return (
                                  <button
                                    key={`${r.date}-${r.start}`}
                                    type="button"
                                    disabled={holding}
                                    onClick={() => applyRec(r)}
                                    className={[
                                      "flex items-center justify-between gap-3 rounded-lg border bg-white px-4 py-2.5 text-left text-sm cursor-pointer disabled:opacity-55",
                                      chosen ? "border-[2px] border-tf-teal" : "border-black/[0.15]",
                                    ].join(" ")}
                                  >
                                    <span className="font-medium text-[#202020]">
                                      {label} · {to12(r.start)} - {to12(r.end)}
                                    </span>
                                    <span className="text-xs text-tf-teal">
                                      {r.tier === "HISTORY_MATCH" ? "Your usual time" : "Close to your usual time"}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-4 flex-wrap mt-8 pt-5 border-t border-dashed border-[#d0e5dd]">
                {isResched || (isPsycho && step === 2) ? (
                  <button type="button" className={btnGhost} onClick={goBack}>
                    Back
                  </button>
                ) : (
                  <Link to="/book" className={btnGhost}>
                    Back
                  </Link>
                )}
                <button
                  type="button"
                  className={`${btnSolid} disabled:opacity-55 disabled:cursor-not-allowed`}
                  disabled={!canContinue || holding}
                  onClick={goNext}
                >
                  {isResched ? (holding ? "Please wait…" : "Confirm reschedule") : holding ? "Please wait…" : "Continue"}
                </button>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <BookingSummary
                step={2}
                title={service?.fullName || "Booking"}
                rows={summaryRows}
                fee={isResched ? "No additional charge" : feeLabel}
                ctaDisabled={!canContinue || holding}
                onContinue={goNext}
              />
            </Reveal>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}