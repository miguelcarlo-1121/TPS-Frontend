import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar, Footer, Reveal, container, btnGhost, btnSolid } from "../components/Layout";
import { apiFetch } from "../auth";
import StepRail from "./StepRail";
import BookingSummary from "./BookingSummary";
import { useBooking } from "./bookingContext";

const pageShell = "font-sans text-black bg-tf-bg overflow-x-hidden antialiased";
const mainPad = "py-12 pb-24 max-[720px]:py-7 max-[720px]:pb-16 bg-tf-bg";
const gridClass =
  "grid grid-cols-[minmax(0,1fr)_320px] gap-7 mt-7 items-start max-[900px]:grid-cols-1";
const panelClass =
  "bg-white border border-black/[0.23] rounded-[21px] p-7 max-[720px]:p-5";

const CHECK_TIMEOUT_MS = 8000;

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);

const peso = (n) => `₱${Number(n).toLocaleString("en-PH")}`;
const fmtMins = (m) => {
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${rem} min`;
  if (rem === 0) return `${h} ${h === 1 ? "hr" : "hrs"}`;
  return `${h}h ${rem}m`;
};

/* ---------- Professional loading (skeleton) ---------- */
const Bar = ({ className = "" }) => (
  <div className={`animate-pulse rounded-md bg-[#e3ece8] ${className}`} />
);

function BookingSkeleton() {
  return (
    <div className={pageShell} aria-busy="true" aria-live="polite">
      <Navbar />
      <main className={mainPad}>
        <div className={container}>
          <Bar className="h-3 w-28" />
          <Bar className="mt-4 h-9 w-[min(420px,80%)]" />

          <div className="mt-6 flex items-center gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex flex-1 items-center gap-3">
                <div className="size-8 shrink-0 animate-pulse rounded-full bg-[#d7eee8]" />
                <Bar className="h-3 flex-1" />
              </div>
            ))}
          </div>

          <div className={gridClass}>
            <div className={panelClass}>
              <Bar className="h-6 w-48" />
              <Bar className="mt-3 h-3 w-72 max-w-full" />
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-[18px] border border-black/[0.12] p-5">
                    <Bar className="h-2.5 w-16" />
                    <Bar className="mt-4 h-5 w-3/4" />
                    <Bar className="mt-3 h-3 w-full" />
                    <Bar className="mt-2 h-3 w-5/6" />
                    <Bar className="mt-5 h-2.5 w-2/3" />
                    <Bar className="mt-2 h-2.5 w-1/2" />
                  </div>
                ))}
              </div>
              <div className="mt-8 flex items-center justify-between border-t border-dashed border-[#d0e5dd] pt-5">
                <Bar className="h-10 w-24 rounded-lg" />
                <Bar className="h-10 w-28 rounded-lg" />
              </div>
            </div>
            <div className={panelClass}>
              <Bar className="h-3 w-24" />
              <Bar className="mt-4 h-6 w-3/4" />
              <div className="mt-6 grid gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center justify-between gap-4">
                    <Bar className="h-3 w-20" />
                    <Bar className="h-3 w-24" />
                  </div>
                ))}
              </div>
              <Bar className="mt-8 h-10 w-full rounded-lg" />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-3 text-sm text-[#5b6b64]">
            <span className="size-5 animate-spin rounded-full border-2 border-[#cfe3dc] border-t-tf-teal" aria-hidden="true" />
            <span>Checking your booking…</span>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

/* ---------- Assessment Type Picker ---------- */
function AssessmentTypePicker({ selectedId, onSelect }) {
  const [types, setTypes] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    apiFetch("/assessment-types")
      .then((d) => { if (alive) setTypes(d.types || []); })
      .catch((err) => { if (alive) setError(err.message || "Could not load assessment types."); });
    return () => { alive = false; };
  }, []);

  if (error) {
    return (
      <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </p>
    );
  }

  if (types === null) {
    return (
      <div className="mt-4 grid gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-[14px] border border-black/[0.12] p-4">
            <Bar className="h-4 w-48" />
            <Bar className="mt-2 h-3 w-72 max-w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (types.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-[#b6d2c4] bg-[#f9fcfb] px-5 py-6 text-center">
        <p className="m-0 font-serif text-sm text-[#3d5c52]">No assessment types available yet.</p>
        <p className="m-0 mt-1 text-xs text-[#666]">The admin hasn't added any assessment types. Please check back later.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-3">
      {types.map((t) => {
        const selected = selectedId === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t)}
            className={[
              "text-left rounded-[14px] border p-4 cursor-pointer transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_18px_-10px_rgba(30,78,65,0.3)] bg-white",
              selected
                ? "border-[2.5px] border-tf-teal shadow-[0_6px_14px_-10px_rgba(74,155,142,0.45)]"
                : "border-black/[0.15]",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h4 className="m-0 font-serif text-[1rem] font-semibold text-[#202020]">{t.name}</h4>
                {t.description && (
                  <p className="m-0 mt-1 text-sm leading-relaxed text-[#666]">{t.description}</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                {t.price > 0 && (
                  <span className="block font-serif text-[0.95rem] font-bold text-tf-teal">{peso(t.price)}</span>
                )}
                <span className="block text-xs text-[#888]">{fmtMins(t.duration_minutes)}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Main Page ---------- */
export default function BookSession() {
  const navigate = useNavigate();
  const { booking, update, service, services, servicesLoading, servicesError, summaryRows, feeLabel } = useBooking();
  const serviceId = booking.serviceId;
  const isAssessment = service?.id === "assessment";

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let alive = true;

    withTimeout(apiFetch("/booking/active"), CHECK_TIMEOUT_MS)
      .then((d) => {
        if (!alive) return;
        if (d.active) {
          navigate("/book/approval", { replace: true });
        } else {
          setChecking(false);
        }
      })
      .catch((err) => {
        if (!alive) return;
        if (err.message?.includes("session expired")) {
          navigate("/signin");
          return;
        }
        setChecking(false);
      });

    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleServiceSelect = (id) => {
    if (id === serviceId) return;
    if (booking.holdId) {
      apiFetch(`/booking/hold/${booking.holdId}`, { method: "DELETE" }).catch(() => { });
    }
    update({
      serviceId: id,
      psychologistId: null,
      psychologist: null,
      assessmentTypeId: null,
      assessmentType: null,
      date: null,
      time: null,
      timeStart: null,
      timeEnd: null,
      holdId: null,
      holdExpiresAt: null,
      providerId: null,
    });
  };

  const handleAssessmentTypeSelect = (t) => {
    update({ assessmentTypeId: t.id, assessmentType: t });
  };

  // For assessment, also require an assessment type to be chosen
  const canContinue = isAssessment
    ? !!service && !!booking.assessmentTypeId
    : !!service;

  if (checking || servicesLoading) return <BookingSkeleton />;

  return (
    <div className={pageShell}>
      <Navbar />
      <main className={mainPad}>
        <div className={container}>
          <Reveal>
            <p className="m-0 text-[13px] font-bold tracking-[0.1em] text-tf-teal">BOOK A SESSION</p>
            <h1 className="font-serif font-normal text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.15] my-2 mb-3 text-[#111]">
              Let&apos;s find a time <em className="text-tf-teal italic">that works for you.</em>
            </h1>
          </Reveal>
          <Reveal delay={80}>
            <StepRail current={0} />
          </Reveal>

          <div className={gridClass}>
            <Reveal className={panelClass} delay={140}>
              {/* ---- Service Selection ---- */}
              <header>
                <h2 className="m-0 mb-1.5 font-serif text-[1.4rem] font-normal text-[#202020]">
                  Choose a service
                </h2>
                <p className="m-0 mb-5 text-[#202020] text-[0.9rem] leading-normal">
                  Select the type of session you&apos;d like to book.
                </p>
              </header>

              {servicesError && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {servicesError}
                </p>
              )}

              {services.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {services.map((s) => {
                  const selected = serviceId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleServiceSelect(s.id)}
                      className={[
                        "text-left rounded-[18px] border bg-white p-5 cursor-pointer transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-14px_rgba(30,78,65,0.35)]",
                        selected
                          ? "border-[2.5px] border-tf-teal shadow-[0_8px_20px_-12px_rgba(74,155,142,0.45)]"
                          : "border-black/[0.18]",
                      ].join(" ")}
                    >
                      <p className="m-0 text-[11px] font-bold tracking-[0.12em] text-tf-teal">
                        {s.duration.toUpperCase()}
                      </p>
                      <h3 className="m-0 mt-2 font-serif text-lg text-[#202020]">{s.name}</h3>
                      <p className="m-0 mt-2 text-sm leading-relaxed text-[#666]">{s.description}</p>
                      <ul className="m-0 mt-3 list-none p-0 space-y-1">
                        {s.details.map((d) => (
                          <li
                            key={d}
                            className="text-xs text-tf-body before:content-['·'] before:mr-1.5 before:text-tf-teal"
                          >
                            {d}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
                </div>
              ) : !servicesError ? (
                <div className="rounded-xl border border-dashed border-[#b6d2c4] bg-[#f9fcfb] px-5 py-8 text-center">
                  <p className="m-0 font-serif text-base text-[#3d5c52]">No services available right now</p>
                  <p className="m-0 mt-1 text-sm text-[#666]">Please check back later.</p>
                </div>
              ) : null}

              {/* ---- Assessment Type Picker (shown only when assessment is selected) ---- */}
              {isAssessment && (
                <div className="mt-7 border-t border-dashed border-[#d0e5dd] pt-6">
                  <h3 className="m-0 mb-1 font-serif text-[1.1rem] font-normal text-[#202020]">
                    Select assessment type
                  </h3>
                  <p className="m-0 text-sm text-[#666]">
                    Choose the specific type of assessment you need.
                  </p>
                  <AssessmentTypePicker
                    selectedId={booking.assessmentTypeId}
                    onSelect={handleAssessmentTypeSelect}
                  />
                </div>
              )}

              {/* ---- Contextual hints ---- */}
              {!service && (
                <div className="mt-6 rounded-xl border border-dashed border-[#b6d2c4] bg-[#f9fcfb] px-5 py-8 text-center">
                  <p className="m-0 font-serif text-base text-[#3d5c52]">No service selected yet</p>
                  <p className="m-0 mt-1 text-sm text-[#666]">Choose an available service to continue.</p>
                </div>
              )}

              {serviceId === "psychotherapy" && (
                <p className="mt-6 mb-0 rounded-xl border border-tf-teal/30 bg-[#f9fcfb] px-5 py-4 text-sm text-tf-body">
                  In the next step, you can choose your psychologist first, or pick a schedule first
                  and see who is available.
                </p>
              )}
              {serviceId && serviceId !== "psychotherapy" && !isAssessment && (
                <p className="mt-6 mb-0 rounded-xl border border-tf-teal/30 bg-[#f9fcfb] px-5 py-4 text-sm text-tf-body">
                  We will automatically assign the best available specialist for {service?.name}.
                </p>
              )}
              {isAssessment && booking.assessmentTypeId && (
                <p className="mt-4 mb-0 rounded-xl border border-tf-teal/30 bg-[#f9fcfb] px-5 py-4 text-sm text-tf-body">
                  A specialist will be automatically assigned for your{" "}
                  <strong>{booking.assessmentType?.name}</strong> assessment.
                </p>
              )}

              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-dashed border-[#d0e5dd] pt-5">
                <Link to="/" className={btnGhost}>
                  Back
                </Link>
                <button
                  type="button"
                  className={`${btnSolid} disabled:opacity-55 disabled:cursor-not-allowed`}
                  disabled={!canContinue}
                  onClick={() => navigate("/book/date-time")}
                >
                  Continue
                </button>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <BookingSummary
                step={1}
                title={service?.fullName || "Select a service"}
                rows={summaryRows}
                fee={feeLabel}
                ctaDisabled={!canContinue}
                onContinue={() => navigate("/book/date-time")}
              />
            </Reveal>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
