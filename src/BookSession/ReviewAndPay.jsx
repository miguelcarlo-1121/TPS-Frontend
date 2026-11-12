import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar, Footer, Reveal, container, btnSolid, btnGhost } from "../components/Layout";
import { apiFetch } from "../auth";
import { peso, to12, resizeToJpeg } from "../components/payUtils";
import StepRail from "./StepRail";
import BookingSummary from "./BookingSummary";
import { useBooking } from "./bookingContext";

const pageShell = "font-sans text-black bg-tf-bg overflow-x-hidden antialiased";
const mainPad = "py-12 pb-24 max-[720px]:py-7 max-[720px]:pb-16 bg-tf-bg";
const gridClass =
  "grid grid-cols-[minmax(0,1fr)_320px] gap-7 mt-8 items-start max-[900px]:grid-cols-1";
const panelClass =
  "bg-white border border-black/[0.23] rounded-[21px] p-7 max-[720px]:p-5";
const inputClass =
  "mt-1.5 w-full rounded-lg border border-black/14 bg-white px-3.5 py-2.5 font-serif text-sm outline-none focus:border-tf-teal focus:shadow-[0_0_0_3px_rgba(74,155,142,0.15)]";

function ReviewCard({ title, editTo, rows }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-[#fbfdfc] p-5">
      <header className="mb-3 flex items-center justify-between gap-3">
        <p className="m-0 text-[11px] font-bold tracking-[0.12em] text-tf-teal">{title}</p>
        <Link to={editTo} className="text-sm font-semibold text-tf-teal no-underline hover:underline">
          Edit
        </Link>
      </header>
      <dl className="m-0 grid gap-2">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-4 text-sm">
            <dt className="m-0 text-[#666]">{r.label}</dt>
            <dd className="m-0 text-right font-medium text-[#202020]">{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function ReviewAndPay() {
  const navigate = useNavigate();
  const { booking, service, updatePayment, update } = useBooking();

  const serviceId = booking.serviceId;
  const c = booking.client || {};
  const draft = booking.paymentDraft || null;
  const holdActive =
    !!booking.holdId &&
    !!booking.holdExpiresAt &&
    new Date(booking.holdExpiresAt).getTime() > Date.now();

  const [options, setOptions] = useState(null);
  const [optError, setOptError] = useState("");
  const [methodId, setMethodId] = useState(null);
  const [type, setType] = useState(draft?.type || "full");
  const [walletNumber, setWalletNumber] = useState(draft?.wallet_number || "");
  const [refNum, setRefNum] = useState(draft?.reference_number || "");
  const [receipt, setReceipt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showDownWarn, setShowDownWarn] = useState(false);
  const [confirmingDownSelection, setConfirmingDownSelection] = useState(false);

  useEffect(() => {
    if (!serviceId) return;
    let alive = true;
    const q = new URLSearchParams({ service: serviceId });
    if (serviceId === "assessment" && booking.assessmentTypeId) {
      q.set("assessment_type_id", booking.assessmentTypeId);
    }
    apiFetch(`/booking/payment-options?${q}`)
      .then((d) => {
        if (!alive) return;
        setOptions(d);
                setMethodId((cur) => {
          if (cur != null) return cur;
          const prev = draft && d.methods?.find((m) => m.name === draft.method_name);
          return prev?.id ?? d.methods?.[0]?.id ?? null;
        });
      })
      .catch((err) => {
        if (!alive) return;
        if (err.message?.includes("session expired")) return navigate("/signin");
        setOptError(err.message || "Could not load payment details.");
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  const price = options?.price ?? 0;
  const percent = options?.downpayment_percent ?? 50;
  const normalizedServiceName = String(service?.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const isPsycho = serviceId === "psychotherapy" || normalizedServiceName.includes("psychotherapy");
  const isFixedDownpayment = isPsycho || serviceId === "assessment";
  const isAba = serviceId === "aba" || normalizedServiceName === "abatherapy";
  const isFullPaymentOnly = isAba || options?.downpayment_allowed === false;
  const downAmount = isFixedDownpayment
    ? Number(options?.downpayment_amount) || 0
    : Math.round(price * percent) / 100;
  const downAvailable =
    !isFullPaymentOnly && downAmount > 0 && downAmount < price;
  const methods = options?.methods || [];
  const method = methods.find((m) => m.id === methodId) || null;

  const effectiveType = downAvailable ? type : "full";
  const amountDue = effectiveType === "full" ? price : downAmount;
  const remaining = Math.round((price - amountDue) * 100) / 100;

  const isFormValid =
    holdActive &&
    price > 0 &&
    !!method &&
    walletNumber.length === 11 &&
    /^[A-Za-z0-9-]{6,60}$/.test(refNum) &&
    !!receipt;

  const d = booking.date;
  const dateLong = d
    ? new Date(d.year, d.month, d.day).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    : "—";
  const timeText = booking.timeStart ? `${to12(booking.timeStart)} - ${to12(booking.timeEnd)}` : "—";
  const shortDate = d
    ? new Date(d.year, d.month, d.day).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";

  const psychName = isPsycho ? booking.psychologist?.name || "—" : "Assigned by the clinic";

  const summaryRows = [
    { label: "SERVICE", value: service?.name || "—" },
    { label: "PSYCHOLOGIST", value: psychName },
    { label: "DATE & TIME", value: d && booking.timeStart ? `${shortDate} · ${timeText}` : "To be set" },
  ];

  const commitAndGo = async () => {
    setError("");
    setSubmitting(true);
    try {
      const image = await resizeToJpeg(receipt, 1280, 0.85);
      const res = await apiFetch("/booking/payments", {
        method: "POST",
        body: JSON.stringify({
          hold_id: booking.holdId,
          type: effectiveType,
          method_id: method.id,
          wallet_number: walletNumber,
          reference_number: refNum,
          receipt: image,
        }),
      });
      const p = res.payment;
      updatePayment({
        type: effectiveType,
        method: method.name,
        amountPaid: p.amount_paid,
        remaining: p.balance,
        refNumber: refNum,
      });
      update({
        approvalStatus: "payment_pending",
        referenceNumber: p.reference,
        paymentId: p.id,
        holdId: null,
        holdExpiresAt: null,
        paymentDraft: null,
      });
      navigate("/book/approval", { replace: true });
    } catch (err) {
      if (err.message?.includes("session expired")) return navigate("/signin");
      // Expired na ang hold sa server: linisin ang naiwang hold sa context
      if (err.message?.includes("held time has expired")) {
        update({
          holdId: null,
          holdExpiresAt: null,
          date: null,
          time: null,
          timeStart: null,
          timeEnd: null,
          providerId: null,
        });
      }
      setError(err.message || "Could not submit your payment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const tryProceed = () => {
    if (!isFormValid || submitting) return;
    if (effectiveType === "down" && !isPsycho) {
      setShowDownWarn(true);
      return;
    }
    commitAndGo();
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
              <header>
                <h2 className="m-0 mb-1.5 font-serif text-[1.4rem] font-normal text-[#202020]">
                  Review &amp; payment
                </h2>
                <p className="m-0 text-sm text-[#666]">
                  Confirm your appointment details, then complete payment to secure your slot.
                </p>
              </header>

              {!serviceId && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Please select a service first.{" "}
                  <Link to="/book" className="font-bold text-tf-teal underline">
                    Go to Step 1
                  </Link>
                </div>
              )}

              {serviceId && !holdActive && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Your held time is no longer active. Please choose a date and time again.{" "}
                  <Link to="/book/date-time" className="font-bold text-tf-teal underline">
                    Pick a time
                  </Link>
                </div>
              )}

              {optError && (
                <p className="mt-5 mb-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {optError}
                </p>
              )}

              <div className="mt-6 grid gap-4">
                <ReviewCard
                  title="SCHEDULE"
                  editTo="/book/date-time"
                  rows={[
                    { label: "Date", value: dateLong },
                    { label: "Time", value: timeText },
                  ]}
                />
                <ReviewCard
                  title="SESSION"
                  editTo="/book"
                  rows={[
                    { label: "Service", value: service?.name || "—" },
                    ...(serviceId === "assessment" && booking.assessmentType?.name ? [{ label: "Assessment Type", value: booking.assessmentType.name }] : []),
                    { label: "Psychologist", value: psychName },
                  ]}
                />
                <ReviewCard
                  title="YOUR DETAILS"
                  editTo="/book/info"
                  rows={[
                    { label: "Name", value: c.fullName || "—" },
                    { label: "Email", value: c.email || "—" },
                    { label: "Mobile", value: c.mobile || "—" },
                  ]}
                />
              </div>

              <h3 className="mt-8 mb-3 font-serif text-lg font-normal text-[#202020]">Payment option</h3>
              {options && isFullPaymentOnly && (
                <p className="m-0 mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {service?.name || "This service"} requires full payment. Downpayment is not available.
                </p>
              )}
              <div className={`grid gap-3 ${downAvailable ? "grid-cols-2 max-[560px]:grid-cols-1" : "grid-cols-1"}`}>
                {[
                  { id: "full", title: "Full payment", amount: price, note: "Pay the full session fee now" },
                  ...(downAvailable
                    ? [
                      {
                        id: "down",
                        title: isFixedDownpayment ? "Downpayment" : `Downpayment (${percent}%)`,
                        amount: downAmount,
                        note: `Remaining ${peso(price - downAmount)} due after the session`,
                      },
                    ]
                    : []),
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      if (opt.id === "down" && isPsycho) {
                        setConfirmingDownSelection(true);
                        setShowDownWarn(true);
                        return;
                      }
                      setType(opt.id);
                    }}
                    className={[
                      "rounded-xl border p-4 text-left cursor-pointer transition-[border-color,background] duration-150",
                      effectiveType === opt.id
                        ? "border-tf-teal bg-tf-soft"
                        : "border-black/12 bg-white hover:border-tf-teal",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong className="font-serif text-base text-[#202020]">{opt.title}</strong>
                      <span className="font-bold text-tf-teal">{peso(opt.amount)}</span>
                    </div>
                    <p className="m-0 mt-1 text-xs text-[#666]">{opt.note}</p>
                  </button>
                ))}
              </div>

              <h3 className="mt-8 mb-3 font-serif text-lg font-normal text-[#202020]">Payment method</h3>
              {options && methods.length === 0 && (
                <p className="m-0 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  No payment method is available right now. Please contact the clinic.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
                {methods.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethodId(m.id)}
                    className={[
                      "flex items-center gap-3 rounded-xl border p-4 text-left cursor-pointer",
                      methodId === m.id ? "border-tf-teal bg-tf-soft" : "border-black/12 bg-white hover:border-tf-teal",
                    ].join(" ")}
                  >
                    <span
                      className="grid size-10 place-items-center rounded-full font-bold text-white"
                      style={{ background: m.badge }}
                    >
                      {m.letter}
                    </span>
                    <span>
                      <strong className="block text-sm">{m.name}</strong>
                      <small className="text-[#666]">Pay with {m.name}</small>
                    </span>
                  </button>
                ))}
              </div>

              {method && (
                <div className="mt-6 grid grid-cols-[220px_minmax(0,1fr)] gap-5 max-[720px]:grid-cols-1">
                  <div className="rounded-2xl border border-black/10 bg-white p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">{method.name}</span>
                      <strong className="text-tf-teal">{peso(amountDue)}</strong>
                    </div>
                    <div className="mt-4 grid place-items-center rounded-xl bg-[#f3f8f6] p-3 text-tf-teal">
                      {method.qr_url ? (
                        <img src={method.qr_url} alt={`${method.name} QR`} className="w-full rounded-lg object-contain" />
                      ) : (
                        <p className="m-0 py-8 text-xs text-[#666]">No QR available. Use the account details below.</p>
                      )}
                    </div>
                    <dl className="m-0 mt-3 grid gap-2 text-xs">
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#666]">Account</dt>
                        <dd className="m-0 text-right font-medium">{method.account_name}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#666]">Number</dt>
                        <dd className="m-0 text-right font-medium">{method.account_number}</dd>
                      </div>
                      {method.bank && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#666]">Bank</dt>
                          <dd className="m-0 text-right font-medium">{method.bank}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="rounded-2xl border border-black/10 bg-[#fbfdfc] p-4">
                      <p className="m-0 text-[11px] font-bold tracking-[0.1em] text-tf-teal">PAYMENT SUMMARY</p>
                      <div className="mt-3 grid gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[#666]">Session fee</span>
                          <span>{peso(price)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#666]">Amount due now</span>
                          <strong className="text-tf-teal">{peso(amountDue)}</strong>
                        </div>
                        {effectiveType === "down" && (
                          <div className="flex justify-between">
                            <span className="text-[#666]">Remaining balance</span>
                            <span>{peso(remaining)}</span>
                          </div>
                        )}
                      </div>
                      {options?.note && <p className="m-0 mt-3 text-xs leading-relaxed text-[#666]">{options.note}</p>}
                    </div>

                    <label className="block text-sm font-serif font-bold">
                      Your {method.name} number
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={11}
                        className={inputClass}
                        value={walletNumber}
                        onChange={(e) => setWalletNumber(e.target.value.replace(/\D/g, "").slice(0, 11))}
                        placeholder={`${method.name} Number`}
                      />
                    </label>
                    <label className="block text-sm font-serif font-bold">
                      Reference number
                      <input
                        type="text"
                        maxLength={60}
                        className={inputClass}
                        value={refNum}
                        onChange={(e) => setRefNum(e.target.value.replace(/[^A-Za-z0-9-]/g, ""))}
                        placeholder="Transaction / ref no."
                      />
                    </label>
                    <label
                      className={[
                        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors",
                        receipt ? "border-tf-teal bg-tf-soft" : "border-[#b6d2c4] bg-white hover:border-tf-teal",
                      ].join(" ")}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          if (f && !f.type.startsWith("image/")) {
                            setError("Please choose an image file (PNG or JPG).");
                            return;
                          }
                          setError("");
                          setReceipt(f);
                        }}
                      />
                      <span className="text-2xl text-tf-teal">↑</span>
                      <strong className="text-sm">{receipt ? receipt.name : "Upload proof of payment"}</strong>
                      <span className="text-xs text-[#666]">PNG or JPG screenshot</span>
                    </label>
                  </div>
                </div>
              )}

              {error && (
                <p
                  role="alert"
                  className="mt-5 mb-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                >
                  {error}
                </p>
              )}

              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-dashed border-[#d0e5dd] pt-5">
                <Link to="/book/info" className={btnGhost}>
                  Back
                </Link>
                <button
                  type="button"
                  className={`${btnSolid} disabled:opacity-55 disabled:cursor-not-allowed`}
                  disabled={!isFormValid || submitting}
                  onClick={tryProceed}
                >
                  {submitting ? "Submitting…" : "Proceed"}
                </button>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <BookingSummary
                step={4}
                title={service?.fullName || "Booking"}
                rows={summaryRows}
                fee={peso(price)}
                status={`Due now · ${peso(amountDue)}`}
              />
            </Reveal>
          </div>
        </div>
      </main>
      <Footer />

      {showDownWarn && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="down-warn-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 shadow-xl">
            <h3 id="down-warn-title" className="m-0 font-serif text-xl text-red-800">
              {confirmingDownSelection ? "Downpayment reminder" : "Confirm downpayment"}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-red-900">
              {confirmingDownSelection
                ? <>You will pay <strong>{peso(downAmount)}</strong> now. The remaining balance of{" "}
                  <strong>{peso(price - downAmount)}</strong> must be paid after your psychotherapy session.</>
                : <>You are paying <strong>{peso(amountDue)}</strong> now. The remaining balance of{" "}
                  <strong>{peso(remaining)}</strong> is due after your session. Continue with downpayment?</>}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                className={btnGhost}
                onClick={() => {
                  setShowDownWarn(false);
                  setConfirmingDownSelection(false);
                }}
              >
                {confirmingDownSelection ? "Choose full payment" : "Cancel"}
              </button>
              <button
                type="button"
                className={`${btnSolid} !bg-red-700 hover:!shadow-[0_10px_22px_-8px_rgba(153,27,27,0.45)]`}
                onClick={() => {
                  setShowDownWarn(false);
                  if (confirmingDownSelection) {
                    setType("down");
                    setConfirmingDownSelection(false);
                  } else {
                    commitAndGo();
                  }
                }}
              >
                {confirmingDownSelection ? "I understand, select downpayment" : "Continue with downpayment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}