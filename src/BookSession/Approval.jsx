import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar, Footer, Reveal, container, btnSolid } from "../components/Layout";
import { apiFetch } from "../auth";
import { peso, to12 } from "../components/payUtils";
import StepRail from "./StepRail";
import BookingSummary from "./BookingSummary";
import { useBooking } from "./bookingContext";

const pageShell = "font-sans text-black bg-tf-bg overflow-x-hidden antialiased";
const mainPad = "py-12 pb-24 max-[720px]:py-7 max-[720px]:pb-16 bg-tf-bg";
const gridClass =
  "grid grid-cols-[minmax(0,1fr)_320px] gap-7 mt-8 items-start max-[900px]:grid-cols-1";
const panelClass =
  "bg-white border border-black/[0.23] rounded-[21px] p-7 max-[720px]:p-5";

const POLL_MS = 8000;

// Route ng ReviewAndPay.jsx (Review & payment). PALITAN kung iba ang path sa router mo.
const PAYMENT_PATH = "/book/review";

const ROLE_LABEL = { ADMIN: "Admin", AFFILIATE: "Affiliate" };

const STAGES = [
  {
    id: "payment_pending",
    title: "Payment verification",
    detail: "Our team is reviewing your proof of payment.",
  },
  {
    id: "psychologist_pending",
    title: "Appointment approval",
    detail: "After payment is verified, our team confirms the appointment.",
  },
  {
    id: "approved",
    title: "Appointment approved",
    detail: "Your booking is confirmed.",
  },
];

function StatusBadge({ status }) {
  const map = {
    payment_pending: { label: "Pending payment verification", cls: "bg-amber-100 text-amber-900" },
    psychologist_pending: { label: "Pending approval", cls: "bg-sky-100 text-sky-900" },
    approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-900" },
    rejected: { label: "Not approved", cls: "bg-red-100 text-red-900" },
  };
  const m = map[status] || map.payment_pending;
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${m.cls}`}>{m.label}</span>
  );
}

export default function Approval() {
  const navigate = useNavigate();
  const { booking, update } = useBooking();

  const [pay, setPay] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState("");

  // Wala nang back: hinaharang ang browser back button
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const block = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", block);
    return () => window.removeEventListener("popstate", block);
  }, []);

  // Kunin ang status, tapos ulitin habang hindi pa final
  useEffect(() => {
    let alive = true;
    let timer;

    const load = async () => {
      try {
        const d = await apiFetch("/booking/payments/latest");
        if (!alive) return;
        setPay(d.payment);
        setError("");
        if (d.payment) update({ approvalStatus: d.payment.stage, referenceNumber: d.payment.reference });
        const final = d.payment && (d.payment.stage === "approved" || d.payment.stage === "rejected");
        if (!final) timer = setTimeout(load, POLL_MS);
      } catch (err) {
        if (!alive) return;
        if (err.message?.includes("session expired")) return navigate("/signin");
        setError(err.message || "Could not check your appointment status.");
        timer = setTimeout(load, POLL_MS * 2);
      } finally {
        if (alive) setLoaded(true);
      }
    };

    load();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = pay?.stage || booking.approvalStatus || "payment_pending";
  const stageIndex =
    status === "rejected" ? -1 : status === "payment_pending" ? 0 : status === "psychologist_pending" ? 1 : 2;

  const whenText = pay
    ? `${new Date(pay.date + "T00:00").toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })} · ${to12(pay.start_time)} - ${to12(pay.end_time)}`
    : "—";

  const isPsychotherapy =
    pay?.consent_type === "psychotherapy" ||
    pay?.service_id === "psychotherapy" ||
    String(pay?.service_name || "").toLowerCase().replace(/[^a-z0-9]/g, "").includes("psychotherapy");
  const isAba =
    pay?.consent_type === "aba" ||
    pay?.service_id === "aba" ||
    String(pay?.service_name || "").toLowerCase().replace(/[^a-z0-9]/g, "") === "abatherapy";
  const psychText = pay
    ? isPsychotherapy
      ? pay.psychologist || "—"
      : "Assigned by the clinic"
    : "—";

  const summaryRows = [
    { label: "SERVICE", value: pay?.service_name || "—" },
    { label: "PSYCHOLOGIST", value: psychText },
    {
      label: "DATE & TIME",
      value: pay
        ? `${new Date(pay.date + "T00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })} · ${to12(pay.start_time)} - ${to12(pay.end_time)}`
        : "—",
    },
  ];

  const rejectedByPayment = pay?.rejected_by === "payment";
  const needsConsent = !pay || isPsychotherapy || isAba;

  // Payment na-reject: hindi pwedeng mag-continue, "Back to payment" lang
  const paymentRejected = status === "rejected" && rejectedByPayment;
  const reviewerLabel = pay?.reviewer
    ? `${pay.reviewer}${pay.reviewer_role ? ` (${ROLE_LABEL[pay.reviewer_role] || pay.reviewer_role})` : ""}`
    : "the clinic";

  // Ire-reserve ulit ang parehong oras, tapos balik sa payment step
  const backToPayment = async () => {
    if (retrying || !pay) return;
    setRetrying(true);
    setRetryError("");
    try {
      const d = await apiFetch(`/booking/payments/${pay.id}/retry`, { method: "POST" });
      const h = d.hold;
      const [y, m, day] = h.date.split("-").map(Number);

      update({
        serviceId: d.service_id,
        psychologistId: d.psychologist?.id ?? null,
        psychologist: d.psychologist ?? null,
        date: { year: y, month: m - 1, day },
        time: to12(h.start_time),
        timeStart: h.start_time,
        timeEnd: h.end_time,
        holdId: h.id,
        holdExpiresAt: h.expires_at,
        providerId: h.provider_id,
        approvalStatus: null,
        referenceNumber: null,
        paymentId: null,
        // Ibalik sa payment form ang mga isinulat ng client dati
        paymentDraft: {
          type: d.previous?.type ?? null,
          method_name: d.previous?.method_name ?? null,
          wallet_number: d.previous?.wallet_number ?? "",
          reference_number: d.previous?.reference_number ?? "",
          reason: d.previous?.reason ?? null,
          reviewer: d.previous?.reviewer ?? null,
        },
      });
      navigate(PAYMENT_PATH, { replace: true });
    } catch (err) {
      if (err.message?.includes("session expired")) return navigate("/signin");
      setRetryError(err.message || "Could not go back to payment. Please try again.");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className={pageShell}>
      <Navbar />
      <main className={mainPad}>
        <div className={container}>
          <Reveal>
            <StepRail current={3} />
          </Reveal>
          <div className={gridClass}>
            <Reveal className={panelClass} delay={140}>
              <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="m-0 mb-1.5 font-serif text-[1.4rem] font-normal text-[#202020]">
                    Appointment status
                  </h2>
                  <p className="m-0 text-sm text-[#666]">
                    Appointment approval follows payment verification. This page updates automatically.
                  </p>
                </div>
                <StatusBadge status={status} />
              </header>

              {error && (
                <p className="mt-4 mb-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </p>
              )}

              {loaded && !pay && !error && (
                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                  We could not find a booking. <Link to="/book" className="font-bold text-tf-teal underline">Book a session</Link>
                </div>
              )}

              <ol className="m-0 mt-8 list-none space-y-0 p-0">
                {STAGES.map((s, i) => {
                  const done = stageIndex > i || status === "approved";
                  const active = stageIndex === i;
                  return (
                    <li key={s.id} className="relative flex gap-4 pb-8 last:pb-0">
                      {i < 2 && (
                        <span
                          className={`absolute left-[15px] top-9 h-[calc(100%-24px)] w-0.5 ${done ? "bg-tf-teal" : "bg-[#d0e5dd]"
                            }`}
                          aria-hidden
                        />
                      )}
                      <span
                        className={[
                          "relative z-[1] grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold",
                          done && "bg-tf-teal text-white",
                          active && !done && "bg-[#1e4e41] text-white shadow-[0_0_0_6px_#d7eee8]",
                          !done && !active && "bg-white border-2 border-[#d0e5dd] text-[#65736d]",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {done ? "✓" : i + 1}
                      </span>
                      <div>
                        <h3 className="m-0 font-serif text-base text-[#202020]">{s.title}</h3>
                        <p className="m-0 mt-1 text-sm text-[#666]">{s.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              {status === "rejected" && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900">
                  <strong>{rejectedByPayment ? "Payment not verified." : "Appointment not approved."}</strong>{" "}
                  {rejectedByPayment
                    ? "We could not verify your payment."
                    : isPsychotherapy
                      ? "Your psychologist could not accept this request."
                      : "The clinic could not accept this request."}
                  {pay?.reason && <> Reason: {pay.reason}</>}{" "}
                  {rejectedByPayment ? "Please go back to payment and submit it again." : "Please contact the clinic or book again."}
                </div>
              )}

              <div className="mt-8 rounded-2xl border border-black/10 bg-[#fbfdfc] p-5">
                <p className="m-0 text-[11px] font-bold tracking-[0.1em] text-tf-teal">APPOINTMENT DETAILS</p>
                <dl className="m-0 mt-3 grid gap-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#666]">Service</dt>
                    <dd className="m-0 font-medium">{pay?.service_name || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#666]">{isPsychotherapy ? "Psychologist" : "Provider"}</dt>
                    <dd className="m-0 font-medium">{psychText}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#666]">When</dt>
                    <dd className="m-0 text-right font-medium">{whenText}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#666]">Paid</dt>
                    <dd className="m-0 font-medium">
                      {pay ? peso(pay.amount_paid) : "—"}
                      {pay && pay.balance > 0 ? ` (balance ${peso(pay.balance)})` : ""}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#666]">Reference</dt>
                    <dd className="m-0 font-medium">{pay?.reference || "Pending"}</dd>
                  </div>
                </dl>
                <p className="m-0 mt-4 text-sm text-tf-body">
                  {status === "payment_pending" &&
                    (isPsychotherapy
                      ? "Next: wait for payment verification, then psychologist review."
                      : "Next: wait for payment verification, then clinic review.")}
                  {status === "psychologist_pending" &&
                    (isPsychotherapy
                      ? "Payment verified. Waiting for psychologist confirmation."
                      : "Payment verified. Waiting for clinic confirmation.")}
                  {status === "approved" &&
                    (needsConsent
                      ? "Next step: complete the consent form before your session."
                      : "Your appointment is confirmed. You may continue.")}
                  {status === "rejected" &&
                    (rejectedByPayment
                      ? "Go back to payment to send your payment details again."
                      : "You may return home or message the clinic for assistance.")}
                </p>
              </div>

              {retryError && !paymentRejected && (
                <p className="mt-4 mb-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {retryError}
                </p>
              )}

              <div className="mt-8 flex flex-wrap items-center justify-end gap-4 border-t border-dashed border-[#d0e5dd] pt-5">
                {status === "approved" ? (
                  <button
                    type="button"
                    className={btnSolid}
                    onClick={() => navigate(needsConsent ? "/book/consent" : "/book/confirmation")}
                  >
                    {needsConsent ? "Continue to consent form" : "Continue"}
                  </button>
                ) : paymentRejected ? (
                  <button
                    type="button"
                    className={`${btnSolid} disabled:opacity-55 disabled:cursor-not-allowed`}
                    disabled={retrying}
                    onClick={backToPayment}
                  >
                    {retrying ? "Please wait…" : "Back to payment"}
                  </button>
                ) : status === "rejected" ? (
                  <Link to="/" className={btnSolid}>
                    Back to home
                  </Link>
                ) : (
                  <button type="button" className={`${btnSolid} opacity-55 cursor-not-allowed`} disabled>
                    Waiting for approval…
                  </button>
                )}
              </div>
            </Reveal>

            <Reveal delay={200}>
              <BookingSummary
                step={4}
                title={pay?.service_name || "Booking"}
                rows={summaryRows}
                fee={pay ? peso(pay.total_amount) : "—"}
                status={status.replace(/_/g, " ")}
              />
            </Reveal>
          </div>
        </div>
      </main>
      <Footer />

      {/* Pop-up: message galing kay admin / affiliate kapag na-reject ang payment */}
      {paymentRejected && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pay-rejected-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-100 text-lg font-bold text-red-700">
                !
              </span>
              <h3 id="pay-rejected-title" className="m-0 font-serif text-xl text-[#202020]">
                Payment not verified
              </h3>
            </div>

            <p className="mt-4 mb-1 text-xs font-bold tracking-[0.08em] text-[#666]">
              MESSAGE FROM {reviewerLabel.toUpperCase()}
            </p>
            <blockquote className="m-0 rounded-lg border-l-4 border-red-300 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-900">
              {pay?.reason || "We could not verify your payment."}
            </blockquote>

            <p className="mt-4 mb-0 text-sm text-[#555]">
              Please go back to payment and send your details again. We will try to reserve your
              selected time again.
            </p>

            {retryError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {retryError}{" "}
                <Link to="/book" className="font-bold text-tf-teal underline">
                  Book a new schedule
                </Link>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className={`${btnSolid} disabled:opacity-55 disabled:cursor-not-allowed`}
                disabled={retrying}
                onClick={backToPayment}
              >
                {retrying ? "Please wait…" : "Back to payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}