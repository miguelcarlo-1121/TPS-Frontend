import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AdminNavigation from "./adminnavigation";
import ProfileMenu from "../components/ProfileMenu";
import ConsentViewer from "../components/ConsentViewer";
import VideoCall from "../components/VideoCall"; // <-- IMPORT NG VIDEO CALL
import { apiFetch } from "../auth";
import { peso, to12 } from "../components/payUtils";

const FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Inknut+Antiqua:wght@600&family=Inria+Serif:wght@400;700&family=Inter:wght@400;600;700&display=swap');`;

const inter = "font-['Inter',Helvetica,sans-serif]";
const serif = "font-['Inria_Serif',Georgia,serif]";

const API_BASE = "/admin";
const PAYMENT_PATH = "/admin/payment";

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */
const STEP_LABELS = ["Paid", "Approved", "Done"];

const STATUS = {
    verify: { chip: "Verify payment", cls: "bg-[#fdf1bc] text-[#7a5d00]", steps: ["warn", "todo", "todo"] },
    pending: { chip: "Pending approval", cls: "bg-[#fde3d6] text-[#a4492a]", steps: ["done", "current", "todo"] },
    approved: { chip: "Approved", cls: "bg-[#a9d0c8] text-[#1f4d3f]", steps: ["done", "done", "current"] },
    completed: { chip: "Completed", cls: "bg-green-100 text-green-800", steps: ["done", "done", "done"] },
    declined: { chip: "Declined", cls: "bg-red-100 text-red-700", steps: ["done", "todo", "todo"] },
    cancelled: { chip: "Cancelled", cls: "bg-red-100 text-red-700", steps: ["done", "todo", "todo"] },
};

const FILTERS = [
    ["all", "All upcoming"],
    ["verify", "To verify"],
    ["pending", "Pending approval"],
    ["approved", "Approved"],
    ["history", "History"],
];

// Mga appointment na tapos na (napupunta sa History)
const FINISHED = ["completed", "declined", "cancelled"];

// Oras kung kailan natapos ang session (local time ng browser)
const endsAt = (a) => new Date(`${a.date}T${a.end_time}`);

// Approved na pero lagpas na ang end time = tapos na ang session
const isEnded = (a, now) => {
    if (a.state !== "approved") return false;
    const end = endsAt(a);
    return !isNaN(end) && end <= now;
};

const fmtStamp = (iso) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/* ------------------------------------------------------------------ */
/*  Building blocks                                                    */
/* ------------------------------------------------------------------ */
const Header = ({ onMenu }) => {
    const todayLabel = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
    });
    return (
        <header className="flex items-start justify-between">
            <div>
                <button
                    type="button"
                    onClick={onMenu}
                    aria-label="Open menu"
                    className="mb-[12px] flex h-[37px] w-[46px] items-center justify-center rounded-[8px] border border-[#c7b6b6] bg-white lg:hidden"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2a8570" strokeWidth="2" strokeLinecap="round">
                        <path d="M3 6h18M3 12h18M3 18h18" />
                    </svg>
                </button>
                <div className={`${inter} text-[20px] font-bold tracking-[4.2px] text-[#4a9b8e]`}>APPOINTMENT</div>
                <h1 className={`${serif} mt-[8px] text-[40px] font-bold leading-[1.15] text-[#2f4a42]`}>
                    Everyone who booked with you.
                </h1>
            </div>
            <div className="flex items-center gap-[17px]">
                <div className="flex h-[30px] min-w-[170px] items-center justify-center rounded-[6px] border border-[#4a9b8e] bg-[#e3f2ee] px-3">
                    <span className={`${inter} text-[12px] font-bold text-[#2a8570]`}>{todayLabel}</span>
                </div>
                <button
                    type="button"
                    aria-label="Notifications"
                    className="relative flex h-[37px] w-[46px] items-center justify-center rounded-[8px] border border-[#c7b6b6] bg-white"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2a8570" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                    </svg>
                </button>
                <ProfileMenu size={37} />
            </div>
        </header>
    );
};

const Stepper = ({ steps }) => (
    <div className="flex w-full items-start xl:w-auto" aria-label="Appointment progress">
        {steps.map((st, i) => (
            <React.Fragment key={STEP_LABELS[i]}>
                {i > 0 && (
                    <span
                        className={`mt-[11px] h-px w-[34px] ${steps[i - 1] === "done" && st !== "todo" ? "bg-[#4a9b8e]" : "bg-[#b9b9b9]"
                            }`}
                    />
                )}
                <div className="flex w-[40px] flex-col items-center">
                    <span
                        className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border ${st === "done"
                            ? "border-[#4a9b8e] bg-[#4a9b8e]"
                            : st === "current"
                                ? "border-[#202020] bg-white"
                                : st === "warn"
                                    ? "border-[#e8c547] bg-[#fdf1bc]"
                                    : "border-[#b9b9b9] bg-white"
                            }`}
                    >
                        {st === "done" && (
                            <svg width="11" height="9" viewBox="0 0 11 9" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 4.5 4 7.5 10 1.5" />
                            </svg>
                        )}
                    </span>
                    <span
                        className={`${serif} mt-[4px] whitespace-nowrap text-[9px] font-bold ${st === "todo" ? "text-[#9a9a9a]" : "text-[#202020]"
                            }`}
                    >
                        {STEP_LABELS[i]}
                    </span>
                </div>
            </React.Fragment>
        ))}
    </div>
);

const MessageBtn = ({ clientId }) => (
    <Link
        to={`/admin/messages?contact_id=${clientId}`}
        className={`${serif} flex h-[26px] cursor-pointer items-center gap-[6px] rounded-[5px] border border-[#00000024] bg-[#a9d0c8] px-[12px] text-[11px] text-[#202020] hover:bg-[#98c5bc] no-underline`}
    >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#202020" strokeWidth="2" strokeLinejoin="round">
            <path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12Z" />
        </svg>
        Message
    </Link>
);

const PrimaryBtn = ({ children, onClick, disabled }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`${serif} h-[26px] cursor-pointer rounded-[5px] border-0 bg-[#11a086] px-[14px] text-[11px] text-white hover:bg-[#0e8c75] disabled:cursor-not-allowed disabled:opacity-60`}
    >
        {children}
    </button>
);

const ConsentChip = ({ status }) => {
    if (status === "not_required") return null;
    const done = status === "submitted";
    return (
        <span
            className={`${serif} ml-[8px] inline-flex h-[18px] items-center rounded-full px-[8px] text-[10px] font-bold ${done ? "bg-[#e3f2ee] text-[#2a8570]" : "bg-[#fdf1bc] text-[#7a5d00]"
                }`}
        >
            {done ? "Consent submitted" : "Consent waiting"}
        </span>
    );
};

const StatusChip = ({ s, className = "" }) => (
    <span
        className={`${serif} h-[24px] items-center justify-center rounded-full px-[12px] text-[11px] font-bold ${s.cls} ${className}`}
    >
        {s.chip}
    </span>
);

const AppointmentCard = ({ a, open, onToggle, busy, onApprove, onVerify, onViewConsent, onJoinCall }) => {
    const s = STATUS[a.state] || STATUS.pending;
    const d = new Date(a.date + "T00:00");

    return (
        <article className="rounded-[10px] border border-[#c7b6b6] bg-white px-[16px] pb-[16px] pt-[16px] sm:px-[24px] sm:pt-[20px]">
            <div className="flex flex-wrap items-center gap-x-[16px] gap-y-[16px] xl:flex-nowrap xl:gap-x-0">
                <div className={`${serif} flex h-[68px] w-[62px] shrink-0 flex-col items-center justify-center rounded-[6px] bg-[#a9d0c8] leading-[1.15] text-[#1f4d3f]`}>
                    <span className="text-[17px] font-bold">{d.getDate()}</span>
                    <span className="text-[10px]">{d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}</span>
                    <span className="text-[10px]">{d.toLocaleDateString("en-US", { month: "short" })}</span>
                </div>

                <div className="ml-[22px] flex-1">
                    <div className={`${serif} text-[15px] font-bold text-[#202020]`}>{a.client_name || "Client"}</div>
                    <div className={`${serif} mt-[2px] text-[13px] text-[#444]`}>
                        {a.service_name} · {to12(a.start_time)} – {to12(a.end_time)}
                        <ConsentChip status={a.consent_status} />
                    </div>

                    {a.state === "completed" && (
                        <div className={`${serif} mt-[2px] text-[12px] text-[#666]`}>
                            Completed on {fmtStamp(a.completed_at || `${a.date}T00:00`)}
                        </div>
                    )}
                    {a.state === "cancelled" && a.cancelled_at && (
                        <div className={`${serif} mt-[2px] text-[12px] text-[#666]`}>Cancelled by client on {fmtStamp(a.cancelled_at)}</div>
                    )}
                    {a.state === "declined" && a.decline_reason && (
                        <div className={`${serif} mt-[2px] text-[12px] text-[#666]`}>Reason: {a.decline_reason}</div>
                    )}

                    <StatusChip s={s} className="mt-[8px] inline-flex xl:hidden" />
                </div>

                <Stepper steps={s.steps} />
                <StatusChip s={s} className="ml-[40px] hidden w-[118px] xl:flex" />
            </div>

            <div className="mt-[18px] flex flex-wrap items-center justify-between gap-x-[12px] gap-y-[12px] border-t border-[#e8e8e8] pt-[14px]">
                <button
                    type="button"
                    onClick={onToggle}
                    aria-expanded={open}
                    className={`${serif} flex cursor-pointer items-center gap-[4px] border-0 bg-transparent p-0 text-[11px] font-bold text-[#222b28] underline`}
                >
                    {open ? "Hide details" : "Client details"}
                    {open && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#222b28" strokeWidth="1.5" strokeLinecap="round">
                            <path d="m2 6.5 3-3 3 3" />
                        </svg>
                    )}
                </button>

                <div className="flex flex-wrap items-center gap-[8px]">
                    {a.consent_status === "submitted" && (
                        <button
                            type="button"
                            onClick={onViewConsent}
                            className={`${serif} h-[26px] cursor-pointer rounded-[5px] border border-[#4a9b8e] bg-white px-[12px] text-[11px] text-[#2a8570] hover:bg-[#e3f2ee]`}
                        >
                            {a.consent_type === "aba" || a.service_id === "aba" ? "View ABA consent" : "View consent form"}
                        </button>
                    )}
                    <MessageBtn />

                    {/* VIDEO CALL BUTTON PARA SA ADMIN - LALABAS KAPAG APPROVED */}
                    {a.state === "approved" && (
                        <button
                            type="button"
                            onClick={() => onJoinCall(a.id)}
                            className={`${serif} h-[26px] cursor-pointer rounded-[5px] border-0 bg-[#2f4a42] px-[12px] text-[11px] text-white hover:bg-[#20352f]`}
                        >
                            Join Video Call
                        </button>
                    )}

                    {a.state === "verify" && <PrimaryBtn onClick={onVerify}>Verify payment</PrimaryBtn>}
                    {a.state === "pending" && (
                        <PrimaryBtn disabled={busy} onClick={onApprove}>
                            {busy ? "Please wait…" : "Approve"}
                        </PrimaryBtn>
                    )}
                </div>
            </div>

            {open && (
                <div className="mt-[14px] grid grid-cols-1 gap-[16px] rounded-[6px] border border-[#c9d9d4] bg-[#e8f1ee] px-[16px] py-[16px] sm:grid-cols-3 sm:gap-[24px] sm:px-[24px] sm:py-[18px]">
                    <div className="min-w-0">
                        <div className={`${serif} text-[12px] font-bold text-[#202020]`}>Contact</div>
                        <div className={`${serif} mt-[6px] break-all text-[12px] leading-[16px] text-[#444]`}>
                            {a.client_email || "—"}
                            <br />
                            {a.client_mobile || "—"}
                            {a.birthdate && (
                                <>
                                    <br />
                                    Born{" "}
                                    {new Date(a.birthdate + "T00:00").toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    })}
                                </>
                            )}
                        </div>
                    </div>
                    <div className="min-w-0">
                        <div className={`${serif} text-[12px] font-bold text-[#202020]`}>Booking</div>
                        <div className={`${serif} mt-[6px] text-[12px] leading-[16px] text-[#444]`}>
                            Ref: {a.reference}
                            <br />
                            {a.service_name}
                            <br />
                            Paid {peso(a.amount_paid)} of {peso(a.total_amount)}
                            {a.balance > 0 && (
                                <>
                                    <br />
                                    Balance {peso(a.balance)}
                                </>
                            )}
                        </div>
                    </div>
                    <div className="min-w-0">
                        <div className={`${serif} text-[12px] font-bold text-[#202020]`}>Emergency Contact</div>
                        <div className={`${serif} mt-[6px] text-[12px] leading-[16px] text-[#444]`}>
                            {a.emergency_name || "—"}
                            {a.emergency_relation ? ` (${a.emergency_relation})` : ""}
                            <br />
                            {a.emergency_phone || "—"}
                        </div>
                    </div>
                </div>
            )}
        </article>
    );
};

const DayHeading = ({ children }) => (
    <div className="mt-[28px] flex items-center gap-[14px] first:mt-0 sm:mt-[34px]">
        <h2 className={`${inter} text-[13px] font-bold tracking-[2.5px] text-[#4a9b8e] sm:whitespace-nowrap sm:text-[15px] sm:tracking-[3.15px]`}>{children}</h2>
        <span className="h-px flex-1 bg-[#c9c9c9]" />
    </div>
);

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function AdminAppointment() {
    const navigate = useNavigate();
    const [navOpen, setNavOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [history, setHistory] = useState(null);
    const [historyCount, setHistoryCount] = useState(0);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("all");
    const [query, setQuery] = useState("");
    const [openIds, setOpenIds] = useState(() => new Set());
    const [busyId, setBusyId] = useState(null);
    const [viewing, setViewing] = useState(null);

    // Kasalukuyang oras (nire-refresh kada 30 seconds para kusang lumipat sa History)
    const [now, setNow] = useState(() => new Date());

    // State para sa Video Call
    const [inCall, setInCall] = useState(false);
    const [callChannel, setCallChannel] = useState("");

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        apiFetch(`${API_BASE}/appointments`)
            .then((d) => {
                setItems(d.appointments || []);
                setHistoryCount(d.history_count || 0);
            })
            .catch((err) => setError(err.message || "Could not load appointments."))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (filter !== "history" || history !== null) return;
        setHistoryLoading(true);
        apiFetch(`${API_BASE}/appointments/history`)
            .then((d) => setHistory(d.appointments || []))
            .catch((err) => setError(err.message || "Could not load history."))
            .finally(() => setHistoryLoading(false));
    }, [filter, history]);

    const act = async (id, kind, body) => {
        setError("");
        setBusyId(id);
        try {
            const d = await apiFetch(`${API_BASE}/appointments/${id}/${kind}`, {
                method: "POST",
                body: JSON.stringify(body || {}),
            });
            const next = d.appointment;
            if (FINISHED.includes(next.state)) {
                setItems((l) => l.filter((a) => a.id !== id));
                setHistoryCount((c) => c + 1);
                setHistory(null);
            } else {
                setItems((l) => l.map((a) => (a.id === id ? next : a)));
            }
        } catch (err) {
            setError(err.message || "Something went wrong.");
        } finally {
            setBusyId(null);
        }
    };

    const toggle = (id) =>
        setOpenIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    // Hindi pa tapos vs. tapos na ang session
    const upcoming = useMemo(() => items.filter((a) => !isEnded(a, now)), [items, now]);
    const ended = useMemo(
        () => items.filter((a) => isEnded(a, now)).map((a) => ({ ...a, state: "completed" })),
        [items, now]
    );

    // History = galing sa backend + mga auto-ended (walang duplicate)
    const historyAll = useMemo(() => {
        const base = history || [];
        const ids = new Set(base.map((a) => a.id));
        return [...ended.filter((a) => !ids.has(a.id)), ...base];
    }, [history, ended]);

    const counts = useMemo(() => {
        const c = {
            all: upcoming.filter((a) => !FINISHED.includes(a.state)).length,
            history: history !== null ? historyAll.length : historyCount + ended.length,
        };
        FILTERS.forEach(([k]) => {
            if (k !== "all" && k !== "history") c[k] = upcoming.filter((a) => a.state === k).length;
        });
        return c;
    }, [upcoming, ended, history, historyAll, historyCount]);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        const source = filter === "history" ? historyAll : upcoming;
        return source.filter((a) => {
            const byStatus = filter === "all" || filter === "history" || a.state === filter;
            return byStatus && (!q || (a.client_name || "").toLowerCase().includes(q));
        });
    }, [upcoming, historyAll, filter, query]);

    const groups = useMemo(() => {
        const today = new Date();
        const tomorrow = new Date(Date.now() + 86400000);
        const map = new Map();
        visible.forEach((a) => {
            const d = new Date(a.date + "T00:00");
            const label =
                d.toDateString() === today.toDateString()
                    ? "TODAY"
                    : d.toDateString() === tomorrow.toDateString()
                        ? "TOMORROW"
                        : d
                            .toLocaleDateString("en-US", {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                                year: filter === "history" ? "numeric" : undefined,
                            })
                            .toUpperCase();
            if (!map.has(a.date)) map.set(a.date, { label, items: [] });
            map.get(a.date).items.push(a);
        });
        const dir = filter === "history" ? -1 : 1;
        return [...map.entries()].sort(([x], [y]) => (x < y ? -dir : dir)).map(([, g]) => g);
    }, [visible, filter]);

    const busyLoading = loading || (filter === "history" && historyLoading);

    const handleJoinCall = (id) => {
        setCallChannel(`appointment-${id}`);
        setInCall(true);
    };

    return (
        <div className="flex min-h-screen w-full bg-[#f2f2f2] antialiased">
            <style>{FONT_CSS}</style>

            <div className="hidden lg:block">
                <AdminNavigation />
            </div>

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

            <main className="min-w-0 flex-1 px-[16px] pb-[48px] pt-[20px] sm:px-[28px] sm:pt-[32px] lg:px-[36px] lg:pb-[60px] lg:pt-[51px]">
                <Header onMenu={() => setNavOpen(true)} />

                <div className="mt-[28px] grid grid-cols-2 gap-[12px] sm:mt-[40px] sm:grid-cols-3 xl:mt-[56px] xl:grid-cols-5 xl:gap-[27px]">
                    {FILTERS.map(([key, label]) => {
                        const active = filter === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setFilter(key)}
                                aria-pressed={active}
                                className={`h-[84px] cursor-pointer rounded-tl-[18px] rounded-tr-[7px] rounded-br-[18px] rounded-bl-[7px] border border-[#2020203d] px-[19px] pt-[9px] text-left transition-colors ${active ? "bg-[#4a9b8e78]" : "bg-white hover:bg-[#4a9b8e22]"
                                    }`}
                            >
                                <div className={`${serif} text-[24px] font-bold leading-[1.2] text-[#2f4a42]`}>{counts[key] ?? 0}</div>
                                <div className={`${serif} text-[14px] font-bold leading-[1.1] text-[#2f4a42]`}>{label}</div>
                            </button>
                        );
                    })}
                </div>

                <label className="relative mt-[22px] block w-full sm:mt-[26px] sm:w-[286px]">
                    <span className="sr-only">Search people</span>
                    <svg className="absolute left-[15px] top-[8px]" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round">
                        <circle cx="11" cy="11" r="7" />
                        <path d="m16.5 16.5 4.5 4.5" />
                    </svg>
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search People"
                        className={`${serif} h-[39px] w-full rounded-[14px] border border-[#0000002b] bg-white pl-[43px] pr-[12px] text-[16px] font-bold text-black outline-none placeholder:text-[#666] focus:border-[#4a9b8e]`}
                    />
                </label>

                {error && (
                    <p className="mb-0 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        {error}
                    </p>
                )}

                <div className="mt-[26px]">
                    {busyLoading && <p className={`${serif} text-sm text-[#666]`}>Loading appointments…</p>}

                    {groups.map((g) => (
                        <section key={g.label} className="mb-[8px]">
                            <DayHeading>{g.label}</DayHeading>
                            <div className="mt-[16px] flex flex-col gap-[22px]">
                                {g.items.map((a) => (
                                    <AppointmentCard
                                        key={a.id}
                                        a={a}
                                        open={openIds.has(a.id)}
                                        onToggle={() => toggle(a.id)}
                                        busy={busyId === a.id}
                                        onApprove={() => act(a.id, "approve")}
                                        onVerify={() => navigate(PAYMENT_PATH)}
                                        onViewConsent={() => setViewing(a)}
                                        onJoinCall={handleJoinCall} // <-- IPINASA ANG FUNCTION
                                    />
                                ))}
                            </div>
                        </section>
                    ))}

                    {!busyLoading && visible.length === 0 && (
                        <div className={`${serif} rounded-[10px] border border-[#c7b6b6] bg-white px-[28px] py-[56px] text-center text-[14px] text-[#666]`}>
                            {filter === "history"
                                ? query
                                    ? "No history matches your search."
                                    : "No history yet. Completed, declined, and cancelled appointments will show up here."
                                : upcoming.length === 0
                                    ? "No appointments yet. They appear here once a client has paid."
                                    : "No appointments match. Try another status or clear the search."}
                        </div>
                    )}
                </div>
            </main>

            {viewing && <ConsentViewer base={API_BASE} appointment={viewing} onClose={() => setViewing(null)} />}

            {/* KAPAG PININDOT ANG VIDEO CALL BUTTON NG ADMIN, LALABAS ITO */}
            {inCall && (
                <VideoCall
                    channelName={callChannel}
                    onLeave={() => setInCall(false)}
                />
            )}
        </div>
    );
}