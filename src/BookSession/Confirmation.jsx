import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Navbar,
  Footer,
  Reveal,
  container,
  btnSolid,
  btnGhost,
} from "../components/Layout";
import { apiFetch } from "../auth";
import { peso, to12 } from "../components/payUtils";
import { CLINIC } from "../data/clinic";
import StepRail from "./StepRail";
import BookingSummary from "./BookingSummary";
import { useBooking } from "./bookingContext";
import ReceiptModal from "../components/ReceiptModal";
import SkeletonBlock from "../components/SkeletonBlock";

const pageShell = "font-sans text-black bg-tf-bg overflow-x-hidden antialiased";
const mainPad = "py-12 pb-24 max-[720px]:py-7 max-[720px]:pb-16 bg-tf-bg";
const gridClass =
  "grid grid-cols-[minmax(0,1fr)_320px] gap-7 mt-8 items-start max-[900px]:grid-cols-1";
const panelClass =
  "bg-white border border-black/[0.23] rounded-[21px] p-7 max-[720px]:p-5";

// "2026-10-30" -> Date (local time, no timezone shift)
const parseDate = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};
const t12 = (t) => (t ? to12(String(t).slice(0, 5)) : "");

export default function Confirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const { booking, update } = useBooking();

  // Reference comes from the URL (survives refresh) or from the booking flow
  const ref = params.get("ref") || booking.referenceNumber || "";

  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(!!ref);
  const [error, setError] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    if (!ref) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError("");
    apiFetch(`/booking/confirmation?${new URLSearchParams({ reference: ref })}`)
      .then((d) => {
        if (!alive) return;
        setAppt(d.appointment);
        // keep the reference in the URL so a page refresh still works
        if (!params.get("ref")) setParams({ ref }, { replace: true });
      })
      .catch((err) => {
        if (!alive) return;
        if (err.message?.includes("session expired")) {
          return navigate("/signin", {
            state: { from: location.pathname + location.search },
          });
        }
        setError(err.message || "Could not load your appointment.");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  const confirmed = String(appt?.status || "").toUpperCase() === "CONFIRMED";
  useEffect(() => {
    if (!appt?.id || !confirmed) return;
    let alive = true;

    apiFetch(`/booking/payments/${appt.id}/finish`, { method: "POST" })
      .then(() => {
        if (!alive) return;
        update({
          serviceId: null,
          psychologistId: null,
          psychologist: null,
          date: null,
          time: null,
          timeStart: null,
          timeEnd: null,
          holdId: null,
          holdExpiresAt: null,
          providerId: null,
          approvalStatus: null,
        });
      })
      .catch(() => { });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appt?.id, confirmed]);

  const dateObj = parseDate(appt?.date);
  const dateLong = dateObj
    ? dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    : "—";
  const dateShort = dateObj
    ? dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";
  const timeText = appt?.start_time
    ? `${t12(appt.start_time)}${appt.end_time ? ` - ${t12(appt.end_time)}` : ""}`
    : "—";

  const paid = Number(appt?.payment?.amount_paid || 0);
  const remaining = Number(appt?.payment?.balance || 0);
  const total = paid + remaining;

  const serviceName = appt?.service?.full_name || appt?.service?.name || "—";
  const psychName = appt?.psychologist?.name || "To be assigned";

  const summaryRows = [
    { label: "SERVICE", value: appt?.service?.name || "—" },
    { label: "PSYCHOLOGIST", value: psychName },
    { label: "DATE & TIME", value: dateObj ? `${dateShort} · ${timeText}` : "—" },
  ];

  return (
    <div className={pageShell}>
      <Navbar />
      <main className={mainPad}>
        <div className={container}>
          <Reveal>
            <StepRail current={4} />
          </Reveal>
          <div className={gridClass}>
            <Reveal className={panelClass} delay={140}>
              {loading && (
                <div className="grid gap-5" role="status" aria-label="Loading your appointment">
                  <span className="sr-only">Loading your appointment…</span>
                  <div className="flex items-center gap-4">
                    <SkeletonBlock className="size-14 shrink-0 rounded-full" />
                    <div className="grid flex-1 gap-2">
                      <SkeletonBlock className="h-6 w-64 max-w-full rounded" />
                      <SkeletonBlock className="h-3 w-3/4 rounded" />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-black/10 bg-[#fbfdfc] p-5">
                    <SkeletonBlock className="mb-4 h-3 w-36 rounded" />
                    <div className="grid gap-3">
                      {[0, 1, 2].map((item) => (
                        <div key={item} className="flex justify-between gap-3">
                          <SkeletonBlock className="h-3 w-24 rounded" />
                          <SkeletonBlock className="h-3 w-36 max-w-[60%] rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {!loading && !ref && (
                <div className="rounded-xl border border-dashed border-[#b6d2c4] bg-[#f9fcfb] px-5 py-8 text-center">
                  <p className="m-0 font-serif text-base text-[#3d5c52]">No booking found</p>
                  <p className="m-0 mt-1 text-sm text-[#666]">
                    Start a booking first, or check your appointments.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <Link to="/book" className={btnSolid}>
                      Book a session
                    </Link>
                    <Link to="/appointments" className={btnGhost}>
                      My Appointments
                    </Link>
                  </div>
                </div>
              )}

              {!loading && error && (
                <p
                  role="alert"
                  className="m-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                >
                  {error}
                </p>
              )}

              {!loading && appt && (
                <>
                  <div
                    className={`mb-6 flex size-14 items-center justify-center rounded-full text-2xl ${confirmed ? "bg-tf-soft text-tf-teal" : "bg-amber-50 text-amber-700"
                      }`}
                  >
                    {confirmed ? "✓" : "…"}
                  </div>
                  <header>
                    <h2 className="m-0 mb-2 font-serif text-[1.6rem] font-normal text-[#202020]">
                      {confirmed ? "Appointment confirmed" : "Booking received"}
                    </h2>
                    <p className="m-0 text-sm text-[#666]">
                      {confirmed ? (
                        <>
                          Your appointment is booked under{" "}
                          <strong>{appt.client?.email || "your account"}</strong>. We look forward to
                          seeing you.
                        </>
                      ) : (
                        <>
                          Your booking is not confirmed yet. Current status:{" "}
                          <strong>{String(appt.status || "pending").replace(/_/g, " ").toLowerCase()}</strong>
                          .{" "}
                          <Link to="/book/approval" className="font-semibold text-tf-teal underline">
                            Check approval status
                          </Link>
                        </>
                      )}
                    </p>
                  </header>

                  <div className="mt-6 rounded-2xl border border-black/10 bg-[#fbfdfc] p-5">
                    <p className="m-0 text-[11px] font-bold tracking-[0.12em] text-tf-teal">
                      REFERENCE NUMBER
                    </p>
                    <p className="m-0 mt-1 font-serif text-2xl tracking-wide text-tf-ink">
                      {appt.reference || ref}
                    </p>

                    <dl className="m-0 mt-5 grid gap-3 border-t border-dashed border-[#d0e5dd] pt-4 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-[#666]">Service</dt>
                        <dd className="m-0 text-right font-medium">{serviceName}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-[#666]">Psychologist</dt>
                        <dd className="m-0 text-right font-medium">{psychName}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-[#666]">Date</dt>
                        <dd className="m-0 text-right font-medium">{dateLong}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-[#666]">Time</dt>
                        <dd className="m-0 text-right font-medium">{timeText}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-[#666]">Session format</dt>
                        <dd className="m-0 text-right font-medium">
                          {appt.session_format || "To be determined by psychologist"}
                        </dd>
                      </div>
                      {appt.payment?.method && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-[#666]">Payment method</dt>
                          <dd className="m-0 text-right font-medium">{appt.payment.method}</dd>
                        </div>
                      )}
                      <div className="flex justify-between gap-3">
                        <dt className="text-[#666]">Amount paid</dt>
                        <dd className="m-0 text-right font-medium">{peso(paid)}</dd>
                      </div>
                      {remaining > 0 && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-[#666]">Remaining balance</dt>
                          <dd className="m-0 text-right font-medium text-amber-800">
                            {peso(remaining)} (due after session)
                          </dd>
                        </div>
                      )}
                      <div className="flex justify-between gap-3">
                        <dt className="text-[#666]">Consent form</dt>
                        <dd className="m-0 text-right font-medium">
                          {!appt.consent_required
                            ? "Not required"
                            : appt.consent_complete
                              ? "Completed"
                              : "Pending"}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <p className="mt-5 text-sm leading-relaxed text-tf-body">
                    Clinic location:{" "}
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(CLINIC.address)}`}
                      className="font-medium text-tf-teal no-underline hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {CLINIC.address}
                    </a>
                    . Please arrive 10 minutes early for in-person sessions once the format is
                    confirmed.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setShowReceipt(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#2a6a53] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#235845] transition cursor-pointer"
                    >
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      View &amp; Print Receipt
                    </button>
                    <Link to="/" className={btnGhost}>
                      Back to Home
                    </Link>
                    <Link to="/appointments" className={btnSolid}>
                      View My Appointments
                    </Link>
                  </div>

                  {showReceipt && (
                    <ReceiptModal
                      appointment={appt}
                      onClose={() => setShowReceipt(false)}
                    />
                  )}
                </>
              )}
            </Reveal>

            <Reveal delay={200}>
              <BookingSummary
                step={5}
                title={appt?.service?.full_name || appt?.service?.name || "Booking"}
                rows={summaryRows}
                fee={peso(total)}
                status={appt ? (confirmed ? "Confirmed" : "Pending") : "Loading"}
              />
            </Reveal>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}