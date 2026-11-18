import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Navbar,
  Footer,
  Reveal,
  Photo,
  container,
  btnSolid,
  btnGhost,
} from "../components/Layout";
import { apiFetch, getFullName, getUser } from "../auth";
import { to12 } from "../components/payUtils";
import VideoCall from "../components/VideoCall"; // <-- IMPORT NG VIDEO CALL
import ReceiptModal from "../components/ReceiptModal";
import TherapistProfileModal from "../components/TherapistProfileModal";
import { getServiceProviderDisplay } from "../BookSession/serviceProviderDisplay";
import SkeletonBlock from "../components/SkeletonBlock";

const MESSAGES = {
  Confirmed: "Your appointment is confirmed. We look forward to seeing you.",
  "Pending approval": "Waiting for your psychologist to approve this appointment.",
  "Pending payment verification": "Payment verification is in progress before approval.",
  Completed: "Session completed. Thank you for attending.",
  Cancelled: "This appointment was cancelled. Payments are non-refundable.",
  Declined: "Your psychologist could not accept this request.",
  "Payment not verified": "We could not verify your payment.",
  Expired: "This appointment was not approved before its schedule.",
};

const BALANCE_ROUTE = (id) => `/appointments/balance/${id}`;
const BALANCE_PAYABLE = ["Confirmed", "Pending approval", "Completed"];
const isAppointmentInProgress = (appointment, now) => {
  const start = new Date(`${appointment.date}T${appointment.start_time}:00+08:00`);
  const end = new Date(`${appointment.date}T${appointment.end_time}:00+08:00`);
  return now >= start && now < end;
};
const toItem = (a) => {
  const provider = getServiceProviderDisplay(a.service_id, a.service_name, a.psychologist);
  const start = new Date(`${a.date}T${a.start_time}:00`);
  const sameDay = start.toDateString() === new Date().toDateString();
  const upcoming = a.tab === "upcoming";
  const pendingPay = a.label === "Pending payment verification";
  const balance = Number(a.balance) || 0;
  const balanceReview = balance > 0 && a.balance_status === "to_verify";
  const canPayBalance =
    balance > 0 && a.tab !== "cancelled" && BALANCE_PAYABLE.includes(a.label) && !balanceReview;
 
  let payment = "Paid in full";
  if (a.tab === "cancelled") payment = "No refund";
  else if (pendingPay) payment = "Pending verification";
  else if (balanceReview) payment = "Balance under review";
  else if (balance > 0) payment = "Downpayment received";
 
  let consent = "Pending";
  if (a.consent_status === "not_required") consent = "Not required";
  else if (a.consent_status === "submitted") consent = "Completed";
 
  return {
    id: String(a.id),
    raw: a,
    tab: a.tab,
    service: a.service_name,
    doctor: provider.value,
    providerLabel: provider.appointmentLabel,
    dateLabel: start.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    time: `${to12(a.start_time)} - ${to12(a.end_time)}`,
    format: "To be determined",
    status: a.label,
    payment,
    balance,
    canPayBalance,
    balanceReview,
    consent,
    target: upcoming ? start.getTime() : null,
    message: MESSAGES[a.label] || "",
    canChange: !!a.can_reschedule,
    canCancel: !!a.can_cancel,
    sameDay,
  };
};

const avatarClass = "size-12 rounded-full object-cover bg-[#aac6b7] shrink-0";
const avatarFallback = <div className="size-12 rounded-full bg-[#aac6b7]" />;
const cardLinkClass =
  "bg-transparent border-0 p-0 text-[#202020] text-[0.8rem] font-bold underline cursor-pointer font-[inherit]";

function Countdown({ target }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!target) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!target) return null;
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);

  return (
    <div className="flex gap-2">
      {[
        [String(days), "Days"],
        [String(hours).padStart(2, "0"), "Hours"],
        [String(mins).padStart(2, "0"), "Min"],
        [String(secs).padStart(2, "0"), "Sec"],
      ].map(([n, label]) => (
        <div
          key={label}
          className="flex h-14 w-12 flex-col items-center justify-center rounded-lg bg-white/10"
        >
          <strong className="text-[1.1rem] font-bold">{n}</strong>
          <span className="text-[0.6rem] opacity-80">{label}</span>
        </div>
      ))}
    </div>
  );
}

function Dialog({ title, children, onClose, onConfirm, confirmLabel, danger, busy, error }) {
  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="m-0 font-serif text-xl text-[#202020]">{title}</h3>
        <div className="mt-3 text-sm leading-relaxed text-[#555]">{children}</div>
        {error && (
          <p
            role="alert"
            className="mb-0 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" className={btnGhost} onClick={onClose} disabled={busy}>
            Keep appointment
          </button>
          <button
            type="button"
            disabled={busy}
            className={`${danger
                ? `${btnSolid} !bg-red-700 hover:!shadow-[0_10px_22px_-8px_rgba(153,27,27,0.45)]`
                : btnSolid
              } disabled:cursor-not-allowed disabled:opacity-55`}
            onClick={onConfirm}
          >
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ tab }) {
  const copy = {
    upcoming: "No upcoming appointments. Book a session when you are ready.",
    completed: "No completed appointments yet.",
    cancelled: "No cancelled appointments.",
  };
  return (
    <div className="rounded-2xl border border-dashed border-[#b6d2c4] bg-[#f9fcfb] px-6 py-14 text-center">
      <p className="m-0 font-serif text-lg text-[#3d5c52]">{copy[tab]}</p>
      {tab === "upcoming" && (
        <Link to="/book" className={`${btnSolid} mt-5 inline-flex no-underline`}>
          Book a session
        </Link>
      )}
    </div>
  );
}

export default function MyAppointments() {
  const navigate = useNavigate();
  const fullName = getFullName(getUser(), "Client");
  const [tab, setTab] = useState("upcoming");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [detailsId, setDetailsId] = useState(null);
  const [receiptApt, setReceiptApt] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null);
  
  // State para sa Video Call
  const [inCall, setInCall] = useState(false);
  const [callAppointmentId, setCallAppointmentId] = useState(null);
  const [callNow, setCallNow] = useState(() => new Date());

  const load = () =>
    apiFetch("/my-appointments")
      .then((d) => {
        const list = (d.appointments || []).map(toItem);
        const up = list
          .filter((a) => a.tab === "upcoming")
          .sort((a, b) => a.target - b.target);
        const rest = list.filter((a) => a.tab !== "upcoming");
        setItems([...up, ...rest]);
        setLoadError("");
      })
      .catch((err) => {
        if (err.message?.includes("session expired")) return navigate("/signin");
        setLoadError(err.message || "Could not load your appointments.");
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCallNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filtered = useMemo(() => items.filter((a) => a.tab === tab), [items, tab]);
  const next = items.find((a) => a.tab === "upcoming") || null;
  const details = items.find((a) => a.id === detailsId);

  const counts = {
    upcoming: items.filter((a) => a.tab === "upcoming").length,
    completed: items.filter((a) => a.tab === "completed").length,
    cancelled: items.filter((a) => a.tab === "cancelled").length,
  };

  const closeDialog = () => {
    setDialog(null);
    setDialogError("");
  };

  const confirmAction = async () => {
    if (!dialog) return;
    const item = items.find((a) => a.id === dialog.id);
    if (!item) return closeDialog();

    if (dialog.type === "reschedule") {
      const a = item.raw;
      navigate("/book/date-time", {
        state: {
          reschedule: {
            id: a.id,
            reference: a.reference,
            serviceId: a.service_id,
            providerId: a.provider_id,
            psychologistId: a.psychologist_user_id,
            psychologist: a.psychologist,
          },
        },
      });
      return;
    }

    setBusy(true);
    setDialogError("");
    try {
      await apiFetch(`/my-appointments/${item.raw.id}/cancel`, { method: "POST" });
      await load();
      closeDialog();
    } catch (err) {
      if (err.message?.includes("session expired")) return navigate("/signin");
      setDialogError(err.message || "Could not cancel this appointment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="font-sans text-[#202020]">
      <Navbar />
      <main className="bg-white py-12 pb-24">
        <div className={container}>
          <Reveal>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="m-0 text-[13px] font-bold tracking-[0.1em] text-tf-teal">
                  MY APPOINTMENTS
                </p>
                <h1 className="my-2 font-serif text-[2.5rem] text-[#111]">
                  Hi, <em className="italic text-tf-teal">{fullName}.</em>
                </h1>
                <p className="m-0 text-base text-[#666]">
                  Track upcoming, completed, and cancelled sessions.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-5">
                <Link to="/book" className={`${btnSolid} no-underline`}>
                  Book a new Session
                </Link>
                <Link
                  to="/contact"
                  className="border-b border-transparent font-serif text-[15px] text-black/70 no-underline hover:border-current hover:text-black"
                >
                  Message the clinic
                </Link>
              </div>
            </div>
          </Reveal>

          <Reveal delay={60}>
            <div className="mb-10 inline-flex flex-wrap gap-1 rounded-[11px] bg-tf-teal/19 p-1">
              {[
                ["upcoming", "Upcoming"],
                ["completed", "Completed"],
                ["cancelled", "Cancelled"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border-0 px-5 py-2 font-serif text-[0.9rem] text-[#202020] ${tab === id
                      ? "bg-white font-bold shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                      : "bg-transparent"
                    }`}
                  onClick={() => setTab(id)}
                >
                  {label}
                  <span className="grid size-[18px] place-items-center rounded-full bg-[#345e51]/15 font-sans text-[0.7rem]">
                    {counts[id]}
                  </span>
                </button>
              ))}
            </div>
          </Reveal>

          {loadError && (
            <p
              role="alert"
              className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {loadError}
            </p>
          )}

          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1fr_300px]">
            <div>
              {tab === "upcoming" && next && (
                <Reveal delay={120}>
                  <h2 className="mb-4 font-sans text-xs font-bold uppercase tracking-[0.15em] text-tf-teal">
                    YOUR NEXT SESSION
                  </h2>
                  <div className="grid grid-cols-1 items-center gap-8 rounded-[23px] bg-[#345e51] p-6 text-white md:grid-cols-[1fr_auto] md:p-8">
                    <div>
                      <h3 className="mb-3 mt-0 font-serif text-[1.6rem] font-bold">
                        {next.service}
                      </h3>
                      <div className="mb-4 flex items-center gap-3">
                        <Photo
                          src="/img/image.png"
                          className={avatarClass}
                          fallback={avatarFallback}
                        />
                        <div>
                          <strong className="block text-[0.95rem]">{next.doctor}</strong>
                          <small className="opacity-80">
                            {next.dateLabel} · {next.time}
                          </small>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-lg bg-white/10 px-3 py-1 text-xs font-semibold">
                          {next.payment}
                        </span>
                        {next.balance > 0 && (
                          <span className="rounded-lg bg-amber-400/30 px-3 py-1 text-xs font-semibold">
                            Balance ₱{next.balance.toLocaleString()}
                          </span>
                        )}
                        <span className="rounded-lg bg-white/10 px-3 py-1 text-xs font-semibold">
                          Consent · {next.consent}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-4 md:items-end">
                      <Countdown target={next.target} />
                      
                      {next.raw?.service_id === "psychotherapy" && next.status === "Confirmed" && (
                        <button
                          type="button"
                          disabled={!isAppointmentInProgress(next.raw, callNow)}
                          onClick={() => {
                            setCallAppointmentId(next.raw.id);
                            setInCall(true);
                          }}
                          className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg shadow transition disabled:cursor-not-allowed disabled:opacity-50"
                          title={isAppointmentInProgress(next.raw, callNow) ? "Join your appointment" : "Available during the scheduled appointment time"}
                        >
                          Join Video Call
                        </button>
                      )}
                      {next.canPayBalance && (
                      <Link
                        to={BALANCE_ROUTE(next.id)}
                        className="rounded-lg bg-amber-300 px-6 py-2 text-center text-sm font-bold text-[#3b2a00] no-underline shadow transition hover:bg-amber-200"
                      >
                        Pay balance · ₱{next.balance.toLocaleString()}
                      </Link>
                    )}
                    {next.balanceReview && (
                      <span className="rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold">
                        Balance receipt under review
                      </span>
                    )}
                      {next.canChange && (
                        <div className="flex gap-4">
                          <button
                            type="button"
                            className="cursor-pointer border-0 bg-transparent p-0 text-sm text-white underline"
                            onClick={() => setDialog({ type: "reschedule", id: next.id })}
                          >
                            Reschedule
                          </button>
                          {next.canCancel ? (
                            <button
                              type="button"
                              className="cursor-pointer border-0 bg-transparent p-0 text-sm text-white underline"
                              onClick={() => setDialog({ type: "cancel", id: next.id })}
                            >
                              Cancel
                            </button>
                          ) : next.sameDay ? (
                            <span className="text-xs text-white/80">Same-day sessions can’t be cancelled.</span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </Reveal>
              )}

              <Reveal delay={180}>
                <div className={tab === "upcoming" && next ? "mt-12" : ""}>
                  <h2 className="mb-4 font-sans text-xs font-bold uppercase tracking-[0.15em] text-tf-teal">
                    {tab === "upcoming"
                      ? "Other appointments"
                      : tab === "completed"
                        ? "Completed appointments"
                        : "Cancelled appointments"}
                  </h2>

                  {loading ? (
                    <div className="flex flex-col gap-5" role="status" aria-label="Loading appointments">
                      <span className="sr-only">Loading your appointments…</span>
                      {[0, 1, 2].map((item) => (
                        <div key={item} className="rounded-2xl border border-[#666]/20 bg-white p-6">
                          <div className="flex items-center gap-4">
                            <SkeletonBlock className="size-14 shrink-0 rounded-full" />
                            <div className="grid flex-1 gap-2">
                              <SkeletonBlock className="h-4 w-48 max-w-full rounded" />
                              <SkeletonBlock className="h-3 w-56 max-w-full rounded" />
                            </div>
                          </div>
                          <div className="mt-5 flex flex-wrap gap-2">
                            <SkeletonBlock className="h-6 w-28 rounded-lg" />
                            <SkeletonBlock className="h-6 w-24 rounded-lg" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filtered.length === 0 ? (
                    <EmptyState tab={tab} />
                  ) : (
                    <div className="flex flex-col gap-5">
                      {filtered.map((apt) => (
                        <div
                          key={apt.id}
                          className="rounded-2xl border border-[#666]/31 bg-white p-6"
                        >
                          <div className="mb-5 flex flex-col items-center gap-4 text-center md:flex-row md:text-left">
                            <button
                              type="button"
                              onClick={() => setViewingProfile({
                                name: apt.doctor,
                                role: apt.raw?.psychologist_role || "AFFILIATE",
                              })}
                              className="bg-transparent border-0 p-0 cursor-pointer transition hover:opacity-85"
                              title="View psychologist profile"
                            >
                              <Photo
                                src="/img/cartoon-female-psychologist-portrait.png"
                                className={avatarClass}
                                fallback={avatarFallback}
                              />
                            </button>
                            <div>
                              <h4 className="mb-1 mt-0 font-serif text-[1.1rem] text-[#355f52]">
                                {apt.service}
                              </h4>
                              <p className="m-0 text-[0.8rem] text-[#666]">
                                <button
                                  type="button"
                                  onClick={() => setViewingProfile({
                                    name: apt.doctor,
                                    role: apt.raw?.psychologist_role || "AFFILIATE",
                                  })}
                                  className="bg-transparent border-0 p-0 text-inherit hover:text-[#2a6a53] hover:underline cursor-pointer font-[inherit]"
                                  title="View psychologist profile"
                                >
                                  {apt.doctor}
                                </button>
                              </p>
                            </div>
                            <span className="rounded-lg bg-[#9ac5be]/24 px-2.5 py-1 text-[0.7rem] font-bold text-[#345e51] md:ml-auto">
                              {apt.status}
                            </span>
                          </div>

                          <div className="mb-5 grid grid-cols-2 gap-3 border-b border-[#eee] pb-5 text-center sm:grid-cols-4 md:text-left">
                            <div>
                              <span className="mb-1 block text-[0.7rem] text-[#666]">Date</span>
                              <strong className="text-[0.9rem]">{apt.dateLabel}</strong>
                            </div>
                            <div>
                              <span className="mb-1 block text-[0.7rem] text-[#666]">Time</span>
                              <strong className="text-[0.9rem]">{apt.time}</strong>
                            </div>
                            <div>
                              <span className="mb-1 block text-[0.7rem] text-[#666]">Payment</span>
                              <strong className="text-[0.9rem]">{apt.payment}</strong>
                            </div>
                            <div>
                              <span className="mb-1 block text-[0.7rem] text-[#666]">Consent</span>
                              <strong className="text-[0.9rem]">{apt.consent}</strong>
                            </div>
                          </div>

                          {apt.balance > 0 && apt.tab !== "cancelled" && (
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                            <span>Remaining balance: ₱{apt.balance.toLocaleString()}</span>
                            {apt.canPayBalance && (
                              <Link
                                to={BALANCE_ROUTE(apt.id)}
                                className="rounded-md bg-[#2a6a53] px-3 py-1.5 text-xs font-semibold text-white no-underline hover:bg-[#235845]"
                              >
                                Pay balance
                              </Link>
                            )}
                            {apt.balanceReview && (
                              <span className="text-xs font-semibold">Balance receipt under review</span>
                            )}
                          </div>
                        )}

                          {apt.message && (
                            <p className="mb-5 rounded-lg bg-[#9ac5be]/24 px-4 py-3 text-[0.8rem]">
                              {apt.message}
                            </p>
                          )}

                          <div className="flex flex-wrap justify-center gap-4 md:justify-start">
                            <button
                              type="button"
                              className={cardLinkClass}
                              onClick={() => setDetailsId(apt.id)}
                            >
                              View details
                            </button>
                            <button
                              type="button"
                              className={`${cardLinkClass} text-[#2a6a53]`}
                              onClick={() => setReceiptApt(apt.raw || apt)}
                            >
                              Print receipt
                            </button>
                            <Link to="/contact" className={cardLinkClass}>
                              Message
                            </Link>
                            {apt.canChange && (
                              <>
                                <button
                                  type="button"
                                  className={cardLinkClass}
                                  onClick={() => setDialog({ type: "reschedule", id: apt.id })}
                                >
                                  Reschedule
                                </button>
                                {apt.canCancel ? (
                                  <button
                                    type="button"
                                    className={`${cardLinkClass} text-[#dc0000]`}
                                    onClick={() => setDialog({ type: "cancel", id: apt.id })}
                                  >
                                    Cancel
                                  </button>
                                ) : apt.sameDay ? (
                                  <span className="text-xs text-[#666]">Same-day sessions can’t be cancelled.</span>
                                ) : null}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Reveal>
            </div>

            <Reveal
              className="sticky top-[100px] flex flex-col gap-6 max-lg:static"
              delay={160}
            >
              <div className="rounded-[10px] border border-black/24 bg-[#ebfef6] p-6 text-center">
                <h3 className="m-0 font-serif text-5xl text-[#28473a]">{counts.completed}</h3>
                <p className="mb-4 mt-1 text-[0.85rem] text-[#666]">Sessions completed</p>
                <div className="border-t border-black/10 pt-4">
                  <p className="m-0 font-serif text-[0.9rem] font-bold text-[#28473a]">
                    {counts.upcoming} upcoming
                  </p>
                </div>
              </div>
              <div className="rounded-[10px] border border-black/24 bg-[#ebfef6] p-6">
                <h4 className="mb-2 mt-0 font-serif text-base text-[#28473a]">
                  Book another session
                </h4>
                <p className="m-0 text-[0.8rem] text-[#666]">
                  Pick a service and a time that works for you.
                </p>
                <Link
                  to="/book"
                  className={`${btnSolid} mt-3 block w-full text-center no-underline`}
                >
                  Book now
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </main>
      <Footer />

      {/* KAPAG PININDOT ANG VIDEO CALL BUTTON, LALABAS ITO */}
      {inCall && (
        <VideoCall 
          appointmentId={callAppointmentId}
          onLeave={() => setInCall(false)} 
        />
      )}

      {dialog && (
        <Dialog
          title={dialog.type === "cancel" ? "Cancel appointment?" : "Reschedule appointment?"}
          confirmLabel={dialog.type === "cancel" ? "Yes, cancel" : "Choose new time"}
          danger={dialog.type === "cancel"}
          busy={busy}
          error={dialogError}
          onClose={closeDialog}
          onConfirm={confirmAction}
        >
          {dialog.type === "cancel" ? (
            <>
              <p className="m-0">Are you sure you want to cancel this appointment?</p>
              <p className="mb-0 mt-2 font-bold text-red-700">
                Your payment is non-refundable. This cannot be undone.
              </p>
            </>
          ) : (
            <p className="m-0">
              You will pick a new date and time. Your current schedule stays until you confirm
              the new one, then it becomes available to other clients.
            </p>
          )}
        </Dialog>
      )}

      {details && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="m-0 font-serif text-xl">{details.service}</h3>
            <dl className="mt-4 grid gap-2 text-sm">
              {[
                ["Reference", details.raw.reference],
                [details.providerLabel, details.doctor],
                ["Date", details.dateLabel],
                ["Time", details.time],
                ["Format", details.format],
                ["Status", details.status],
                ["Payment", details.payment],
                ["Balance", details.balance ? `₱${details.balance.toLocaleString()}` : "None"],
                ["Consent", details.consent],
                ...(details.raw.reschedule_count > 0
                  ? [["Rescheduled", `${details.raw.reschedule_count}x`]]
                  : []),
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-[#666]">{k}</dt>
                  <dd className="m-0 text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#2a6a53] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#235845] transition cursor-pointer"
                onClick={() => {
                  setReceiptApt(details.raw || details);
                  setDetailsId(null);
                }}
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Receipt
              </button>
              <button
                type="button"
                className={`${btnGhost} flex-1`}
                onClick={() => setDetailsId(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {receiptApt && (
        <ReceiptModal
          appointment={receiptApt}
          onClose={() => setReceiptApt(null)}
        />
      )}

      {viewingProfile && (
        <TherapistProfileModal
          profile={viewingProfile}
          onClose={() => setViewingProfile(null)}
        />
      )}
    </div>
  );
}