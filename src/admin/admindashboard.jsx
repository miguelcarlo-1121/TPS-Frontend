import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminNavigation from "./adminnavigation";
import { Logo, Photo } from "../components/Layout";
import ProfileMenu from "../components/ProfileMenu";
import SkeletonBlock from "../components/SkeletonBlock";
import { apiFetch, getFullName } from "../auth";
import { peso, to12 } from "../components/payUtils";

const FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Inknut+Antiqua:wght@600&family=Inria+Serif:wght@400;700&family=Inter:wght@400;600;700&display=swap');`;

const inter = "font-['Inter',Helvetica,sans-serif]";
const serif = "font-['Inria_Serif',Georgia,serif]";

const API_BASE = "/admin";
const pad = (n) => String(n).padStart(2, "0");

const SERVICE_COLORS = {
    psychotherapy: "#345e51",
    aba: "#34b09a",
    assessment: "#4a9b8e78",
};

const SESSION_META = {
    completed: { label: "Completed", color: "#2d6a4f" },
    confirmed: { label: "Confirmed", color: "#52b788" },
    pending: { label: "Pending", color: "#f4a623" },
    cancelled: { label: "Cancelled", color: "#e07b6a" },
};

const STATE_CHIP = {
    verify: ["Verify payment", "bg-[#fdf1bc] text-[#7a5d00]"],
    pending: ["Pending approval", "bg-[#fde3d6] text-[#a4492a]"],
    approved: ["Approved", "bg-[#a9d0c8] text-[#1f4d3f]"],
    completed: ["Completed", "bg-[#e6e6e6] text-[#555]"],
};

function timeAgo(iso) {
    const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return "just now";
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} hr${h > 1 ? "s" : ""} ago`;
    const d = Math.floor(h / 24);
    return `${d} day${d > 1 ? "s" : ""} ago`;
}

function monthLabel(key) {
    const [y, m] = key.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long" }).toUpperCase();
}

/* ------------------------------------------------------------------ */
/*  Small building blocks                                              */
/* ------------------------------------------------------------------ */
const Card = ({ className = "", children }) => (
    <section className={`relative rounded-[10px] border border-[#c7b6b6] bg-white ${className}`}>{children}</section>
);

const CardTitle = ({ children, className = "" }) => (
    <h2 className={`${serif} text-[16px] text-black ${className}`}>{children}</h2>
);

// Sparkline mula sa totoong numbers
function sparkPaths(values) {
    const W = 184;
    const H = 45;
    const vals = values && values.length > 1 ? values : [0, 0];
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    const range = max - min || 1;
    const pts = vals.map((v, i) => [
        (i / (vals.length - 1)) * W,
        max === min ? H - 8 : H - 6 - ((v - min) / range) * (H - 14),
    ]);
    const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    return { d, area: `${d} V${H} H0Z`, last: pts[pts.length - 1] };
}

const Sparkline = ({ id, stroke, fill, values }) => {
    const { d, area, last } = sparkPaths(values);
    return (
        <div className="relative mt-[10px] h-[45px] w-full max-w-[187px]">
            <svg viewBox="0 0 187 45" className="absolute inset-0 h-full w-full" fill="none">
                <defs>
                    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor={fill} stopOpacity="0.45" />
                        <stop offset="1" stopColor={fill} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={area} fill={`url(#${id})`} />
                <path d={d} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx={last[0]} cy={last[1]} r="3" fill={stroke} />
            </svg>
        </div>
    );
};

const Delta = ({ pct, dark }) => {
    const none = pct === null || pct === undefined;
    const down = !none && pct < 0;
    return (
        <div className="mt-auto flex flex-wrap items-center gap-[6px] pt-[12px]">
            <span
                className={`${inter} flex h-[16px] items-center gap-[4px] rounded-full px-[8px] text-[10px] font-bold ${dark ? "bg-[#4a9b8e78] text-[#a8c8b8]" : "bg-[#83cec2c9] text-[#666]"
                    }`}
            >
                {!none && (
                    <svg width="10" height="7" viewBox="0 0 10 7" style={{ transform: down ? "rotate(180deg)" : "none" }}>
                        <path d="M5 0 10 7H0z" fill="currentColor" />
                    </svg>
                )}
                {none ? "—" : `${Math.abs(pct)}%`}
            </span>
            <span className={`${inter} whitespace-nowrap text-[10px] font-bold ${dark ? "text-[#a8c8b8]" : "text-[#666]"}`}>
                VS&nbsp;&nbsp;LAST MONTH
            </span>
        </div>
    );
};

const statCardBase =
    "relative flex min-h-[204px] flex-col overflow-hidden border border-[#2020203d] px-[23px] pb-[14px] pt-[28px] rounded-tl-[18px] rounded-tr-[7px] rounded-br-[18px] rounded-bl-[7px]";

/* ------------------------------------------------------------------ */
/*  Sections                                                           */
/* ------------------------------------------------------------------ */
const DateChip = ({ className = "" }) => (
    <div className={`h-[30px] items-center justify-center gap-[8px] rounded-[6px] border border-[#4a9b8e] bg-[#e3f2ee] px-[12px] ${className}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2a8570" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <span className={`${inter} whitespace-nowrap text-[12px] font-bold text-[#2a8570]`}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </span>
    </div>
);

const Header = ({ onMenu, user, attention }) => {
    const h = new Date().getHours();
    const greet = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    return (
        <header className="flex items-start justify-between gap-[12px]">
            <div className="min-w-0">
                <div className="flex items-center gap-[12px]">
                    <button
                        onClick={onMenu}
                        aria-label="Open menu"
                        className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[8px] border border-[#c7b6b6] bg-white text-[#2f4a42] lg:hidden"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <div className={`${inter} text-[14px] font-bold tracking-[3px] text-[#4a9b8e] sm:text-[20px] sm:tracking-[4.2px]`}>DASHBOARD</div>
                </div>
                <h1 className={`${serif} mt-[8px] text-[26px] font-bold leading-[1.15] sm:text-[34px] lg:text-[40px]`}>
                    <span className="text-[#2f4a42]">{greet}, </span>
                    <span className="text-[#4a9b8e]">{getFullName(user, "there")}</span>
                </h1>
                <DateChip className="mt-[12px] inline-flex sm:hidden" />
            </div>
            <div className="flex shrink-0 items-center gap-[10px] sm:gap-[17px]">
                <DateChip className="hidden sm:flex" />
                <Link
                    to="/admin/appointment"
                    aria-label="Notifications"
                    className="relative flex h-[37px] w-[46px] items-center justify-center rounded-[8px] border border-[#c7b6b6] bg-white"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2a8570" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                    </svg>
                    {attention > 0 && <span className="absolute right-[10px] top-[8px] h-[7px] w-[7px] rounded-full bg-[#e07b6a]" />}
                </Link>
                <ProfileMenu size={37} />
            </div>
        </header>
    );
};

const StatCards = ({ d }) => (
    <div className="mt-[24px] grid grid-cols-1 gap-[12px] sm:mt-[34px] sm:grid-cols-2 sm:gap-[16px] xl:grid-cols-4 xl:gap-[29px]">
        {/* Total income */}
        <div className={`${statCardBase} bg-[#1f4d3f] !border-[#c7b6b6]`}>
            <div className={`${inter} text-[11px] font-bold text-[#a8c8b8]`}>
                TOTAL CLINIC INCOME · {new Date().toLocaleDateString("en-US", { month: "long" }).toUpperCase()}
            </div>
            <div className={`${inter} mt-[22px] text-[32px] font-bold leading-none text-white`}>
                {d ? peso(d.income.this_month) : "—"}
            </div>
            <Sparkline id="sa" stroke="#8ff1d7" fill="#8ff1d7" values={d?.income.series} />
            <Delta dark pct={d?.income.delta_pct} />
        </div>

        {/* New clients */}
        <div className={`${statCardBase} bg-white`}>
            <div className={`${inter} text-[11px] font-bold text-[#666]`}>NEW CLIENTS</div>
            <div className={`${inter} mt-[28px] font-bold leading-none text-[#202020]`}>
                <span className="text-[24px]">{d ? d.new_clients.this_month : "—"} </span>
                <span className="text-[15px]">THIS MONTH</span>
            </div>
            <Sparkline id="sb" stroke="#2a8570" fill="#83cec2" values={d?.new_clients.series} />
            <Delta pct={d?.new_clients.delta_pct} />
        </div>

        {/* Sessions */}
        <div className={`${statCardBase} bg-white`}>
            <div className={`${inter} text-[11px] font-bold text-[#666]`}>SESSIONS</div>
            <div className={`${inter} mt-[28px] font-bold leading-none text-[#202020]`}>
                <span className="text-[24px]">{d ? d.sessions.this_month : "—"}</span>
                <span className="text-[20px]">&nbsp;</span>
                <span className="text-[15px]">THIS MONTH</span>
            </div>
            <Sparkline id="sc" stroke="#2a8570" fill="#83cec2" values={d?.sessions.series} />
            <Delta pct={d?.sessions.delta_pct} />
        </div>

        {/* Needs attention */}
        <Link
            to="/admin/appointment"
            className={`${statCardBase} bg-gradient-to-b from-[#fdf1bc] to-[#fffbdd] from-0% to-25% no-underline`}
        >
            <div className={`${inter} text-[11px] font-bold text-[#666]`}>NEEDS ATTENTION</div>
            <div className={`${inter} mt-[33px] text-[24px] font-bold leading-none text-[#202020]`}>
                {d ? d.attention.total : "—"}
                <span className="text-[15px]"> BOOKINGS</span>
            </div>
            <p className={`${inter} mt-[15px] text-[11px] font-bold leading-[13px] text-[#666]`}>
                {d ? `${d.attention.to_verify} PAYMENTS TO VERIFY · ${d.attention.awaiting} AWAITING APPROVAL` : ""}
            </p>
        </Link>
    </div>
);

const MonthlyIncome = ({ d }) => {
    const [range, setRange] = useState(6);
    const monthly = d?.income.monthly || [];
    const shown = monthly.slice(-range);
    const max = Math.max(1, ...shown.map((m) => m.total));
    const bestLabel = d?.income.best ? `${monthLabel(d.income.best.label)} · ${peso(d.income.best.total)}` : "—";

    return (
        <Card className="flex flex-col p-[20px] sm:p-[28px]">
            <div className="flex items-start justify-between gap-[12px]">
                <div className="min-w-0">
                    <CardTitle>Monthly income</CardTitle>
                    <p className={`${serif} mt-[3px] max-w-[289px] text-[11px] text-black`}>
                        Total verified payments received by the whole clinic each month.
                    </p>
                </div>

                <div className="flex h-[28px] w-[95px] shrink-0 items-center rounded-[11px] bg-[#4a9b8e30] p-[3px]">
                    {[6, 12].map((n) => (
                        <button
                            key={n}
                            type="button"
                            onClick={() => setRange(n)}
                            className={`${serif} h-[20px] flex-1 cursor-pointer rounded-[11px] border-0 text-[10px] text-[#202020] ${range === n ? "bg-white" : "bg-transparent"
                                }`}
                        >
                            {n}M
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-[20px] flex flex-wrap gap-x-[28px] gap-y-[12px]">
                {[
                    ["12-month total", d ? peso(d.income.total_12) : "—"],
                    ["Monthly average", d ? peso(d.income.average_12) : "—"],
                    ["Best month", bestLabel],
                ].map(([label, value]) => (
                    <div key={label} className="whitespace-nowrap">
                        <div className={`${serif} text-[10px] text-[#666]`}>{label}</div>
                        <div className={`${inter} mt-[7px] text-[14px] font-bold text-[#202020]`}>{value}</div>
                    </div>
                ))}
            </div>

            <div className="relative mt-[24px] h-[272px]">
                {[0, 43, 87, 131, 180, 222, 268].map((t) => (
                    <div key={t} className="absolute left-0 right-0 h-px bg-[#e4e4e4]" style={{ top: t }} />
                ))}
                <div className="absolute inset-x-0 bottom-[2px] flex items-end px-[4px]">
                    {shown.map((b) => (
                        <div key={b.key} className="flex flex-1 justify-center" title={`${b.label}: ${peso(b.total)}`}>
                            <div
                                className="w-full max-w-[36px] rounded-t-[5px] bg-[#345e51]"
                                style={{ height: Math.max(b.total > 0 ? 4 : 0, (b.total / max) * 260) }}
                            />
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-[8px] flex px-[4px]">
                {shown.map((b) => (
                    <span key={b.key} className={`${serif} flex-1 text-center text-[13px] text-[#666] sm:text-[15px]`}>
                        {b.label}
                    </span>
                ))}
            </div>

            <div className="mt-[18px] flex items-center gap-[8px]">
                <span className="h-[10px] w-[10px] rounded-full bg-[#345e51]" />
                <span className={`${serif} text-[15px] text-[#666]`}>Total clinic income</span>
            </div>
        </Card>
    );
};

const Earnings = ({ d }) => {
    const services = d?.income.services || [];
    const total = services.reduce((s, x) => s + x.amount, 0);
    const pct = (a) => (total ? Math.round((a / total) * 100) : 0);

    return (
        <Card className="flex flex-col p-[20px] xl:min-h-[465px]">
            <CardTitle>Earnings this month</CardTitle>
            <div className={`${serif} mt-[2px] text-[11px] text-black`}>
                {new Date().toLocaleDateString("en-US", { month: "long" })} · so far
            </div>

            <div className="mt-[14px] flex h-[9px] overflow-hidden rounded-[3px] bg-[#eeeeee]">
                {services.map((s) => (
                    <div key={s.id} style={{ width: `${pct(s.amount)}%`, background: SERVICE_COLORS[s.id] }} />
                ))}
            </div>

            <div className={`${inter} mt-[16px] text-[14px] font-bold text-[#202020]`}>{peso(total)}</div>
            <div className={`${serif} mt-[2px] max-w-[221px] text-[11px] text-black`}>
                Total clinic income (all verified payments)
            </div>

            <div className="mt-[20px]">
                {services.map((e) => (
                    <div key={e.id} className="flex items-start gap-[8px] border-t border-[#e4e4e4] py-[16px]">
                        <span className="relative mt-[2px] flex h-[28px] w-[30px] shrink-0 items-center justify-center rounded-full border border-[#0000001c]">
                            <span className="h-[21px] w-[22px] rounded-full" style={{ background: SERVICE_COLORS[e.id] }} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className={`${inter} text-[10px] font-bold uppercase text-[#202020]`}>{e.name}</div>
                            <div className={`${serif} mt-[9px] text-[11px] text-black`}>{pct(e.amount)}% of income</div>
                        </div>
                        <div className={`${serif} shrink-0 text-[11px] font-bold text-black`}>{peso(e.amount)}</div>
                    </div>
                ))}
            </div>

            <div className="mt-auto rounded-[10px] bg-[#fdf1bc]/60 px-[20px] py-[14px] sm:px-[28px]">
                <p className={`${serif} text-[11px] leading-[13px] text-black`}>
                    Note: this month is still accruing, so totals will grow as payments are verified.
                </p>
            </div>
        </Card>
    );
};

/* ---------- Calendar (pumalit sa "Needs your attention") ---------- */
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

const CalendarCard = () => {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [selected, setSelected] = useState(now.getDate());
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const key = `${year}-${pad(month + 1)}`;
    const weeks = useMemo(() => buildMonth(year, month), [year, month]);

    useEffect(() => {
        let alive = true;
        setLoading(true);
        apiFetch(`${API_BASE}/dashboard/calendar?month=${key}`)
            .then((r) => {
                if (!alive) return;
                setItems(r.appointments || []);
                setError("");
            })
            .catch((err) => alive && setError(err.message || "Could not load the calendar."))
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, [key]);

    const byDay = useMemo(() => {
        const m = {};
        items.forEach((a) => {
            const day = Number(a.date.slice(8, 10));
            (m[day] = m[day] || []).push(a);
        });
        return m;
    }, [items]);

    const move = (delta) => {
        const dt = new Date(year, month + delta, 1);
        setYear(dt.getFullYear());
        setMonth(dt.getMonth());
        setSelected(null);
    };

    const isToday = (d) => d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
    const list = selected ? byDay[selected] || [] : [];

    return (
        <Card className="flex flex-col p-[20px] sm:p-[23px] xl:min-h-[464px]">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <CardTitle>Appointment calendar</CardTitle>
                    <p className={`${serif} mt-[4px] text-[13px] text-[#666]`}>Dates with clients booked with you.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => move(-1)} aria-label="Previous month" className="grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-[#e8eeeb] bg-white text-[#1e4c40] hover:bg-[#f3f8f6]">
                        ‹
                    </button>
                    <span className={`${serif} min-w-[120px] text-center text-[14px] font-bold text-[#1e4c40]`}>
                        {new Date(year, month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </span>
                    <button type="button" onClick={() => move(1)} aria-label="Next month" className="grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-[#e8eeeb] bg-white text-[#1e4c40] hover:bg-[#f3f8f6]">
                        ›
                    </button>
                </div>
            </div>

            <div className="mt-[16px] grid grid-cols-7 gap-1.5 text-center text-[0.7rem] font-bold tracking-wide text-[#8a9690]">
                {["S", "M", "T", "W", "T", "F", "S"].map((x, i) => (
                    <span key={i}>{x}</span>
                ))}
            </div>
            <div className="mt-2 flex flex-col gap-1.5" aria-busy={loading}>
                {weeks.map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7 gap-1.5">
                        {week.map((d, di) => {
                            if (!d) return <span key={di} className="block h-[42px]" />;
                            if (loading) {
                                return (
                                    <div key={di} className="grid h-[42px] place-items-center rounded-[12px] bg-white">
                                        <SkeletonBlock className="h-4 w-4 rounded-full" />
                                    </div>
                                );
                            }
                            const n = (byDay[d] || []).length;
                            const sel = selected === d;
                            return (
                                <button
                                    key={di}
                                    type="button"
                                    onClick={() => setSelected(d)}
                                    className={[
                                        "relative grid h-[42px] cursor-pointer place-items-center rounded-[12px] border-0 font-sans text-[0.9rem] font-medium transition-colors",
                                        sel ? "bg-[#1e4c40] text-white" : n > 0 ? "bg-[#e3f2ee] text-[#1f4d3f] hover:outline hover:outline-2 hover:outline-[#b6d2c4]" : "bg-white text-[#29353b] hover:bg-[#f3f8f6]",
                                        isToday(d) && !sel ? "outline outline-2 outline-[#4a9b8e]" : "",
                                    ].join(" ")}
                                >
                                    {d}
                                    {n > 0 && (
                                        <span className={`absolute bottom-[3px] flex h-[12px] min-w-[12px] items-center justify-center rounded-full px-[3px] text-[8px] font-bold ${sel ? "bg-white text-[#1e4c40]" : "bg-[#345e51] text-white"}`}>
                                            {n}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>

            {error && <p className="mt-3 mb-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>}

            <div className="mt-[16px] border-t border-[#e8e8e8] pt-[12px]">
                <p className={`${serif} m-0 text-[12px] font-bold text-[#202020]`}>
                    {selected
                        ? new Date(year, month, selected).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
                        : "Select a date"}
                </p>
                {selected && list.length === 0 && (
                    <p className={`${serif} m-0 mt-2 text-[12px] text-[#666]`}>No clients booked on this date.</p>
                )}
                <ul className="m-0 mt-2 list-none p-0">
                    {list.map((a) => {
                        const [label, cls] = STATE_CHIP[a.state] || STATE_CHIP.pending;
                        return (
                            <li key={a.id} className="flex items-center justify-between gap-3 border-b border-[#e8e8e8] py-[8px] last:border-0">
                                <div className="min-w-0">
                                    <div className={`${serif} truncate text-[13px] text-black`}>{a.client_name}</div>
                                    <div className={`${serif} text-[11px] text-[#666]`}>
                                        {a.service_name} · {to12(a.start_time)} – {to12(a.end_time)}
                                    </div>
                                </div>
                                <span className={`${serif} shrink-0 rounded-full px-[8px] py-[2px] text-[10px] font-bold ${cls}`}>{label}</span>
                            </li>
                        );
                    })}
                </ul>
            </div>

            <div className="mt-auto pt-[14px]">
                <Link to="/admin/appointment" className={`${serif} text-[11px] font-bold text-[#222b28] underline`}>
                    All appointments
                </Link>
                <Link to="/admin/payment" className={`${serif} ml-[14px] text-[11px] font-bold text-[#222b28] underline`}>
                    All payments
                </Link>
            </div>
        </Card>
    );
};

const Today = ({ d }) => {
    const list = d?.today || [];
    const live = list.find((t) => t.status === "In Session");

    return (
        <Card className="p-[16px] sm:p-[20px] xl:min-h-[464px]">
            <div className="flex items-start justify-between gap-[12px]">
                <div>
                    <CardTitle>Today&#39;s sessions</CardTitle>
                    <div className={`${serif} mt-[4px] text-[11px] text-[#666]`}>
                        {list.length} session{list.length === 1 ? "" : "s"} scheduled
                    </div>
                </div>
                <Link to="/admin/schedule" className={`${serif} shrink-0 text-[11px] font-bold text-[#222b28] underline`}>
                    Open schedule
                </Link>
            </div>

            {live && (
                <div className="mt-[16px] flex min-h-[44px] items-center gap-[12px] rounded-[11px] bg-[#2f4a42] px-[8px] py-[6px]">
                    <span className="flex h-[21px] w-[24px] shrink-0 items-center justify-center rounded-[6px] bg-white/10">
                        <Photo src="/img/Threefold%20logo.png" className="h-[16px] w-[17px] object-contain" fallback={<Logo size={16} />} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className={`${serif} text-[11px] text-[#f2f2f2]`}>In Session now</div>
                        <div className={`${serif} truncate text-[11px] font-bold text-[#f2f2f2]`}>
                            {live.client_name} - {live.service_name}
                        </div>
                    </div>
                    <span className={`${serif} flex h-[21px] shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-[#4a9b8e] px-[10px] text-[10px] text-white`}>
                        Until {to12(live.end_time)}
                    </span>
                </div>
            )}

            {list.length === 0 && (
                <p className={`${serif} mt-[24px] rounded-[10px] border border-dashed border-[#b6d2c4] bg-[#f9fcfb] px-4 py-8 text-center text-[13px] text-[#666]`}>
                    No approved sessions today.
                </p>
            )}

            <div className="mt-[22px] flex flex-col gap-[23px]">
                {list.map((t, i) => {
                    const active = t.status === "In Session";
                    return (
                        <div key={t.id} className="relative flex h-[52px] items-start">
                            <div className={`${serif} w-[44px] shrink-0 pt-[2px] text-[8px] font-bold leading-[10px] text-[#202020] sm:w-[47px]`}>
                                {to12(t.start_time)}
                            </div>
                            <div className="relative -mt-[4px] mr-[10px] flex w-[20px] shrink-0 flex-col items-center sm:mr-[15px]">
                                <span className="flex h-[19px] w-[20px] items-center justify-center rounded-full bg-[#d7eee8]">
                                    <span className="flex h-[14px] w-[14px] items-center justify-center rounded-full bg-[#32ac97]">
                                        <Photo src="/img/Threefold%20logo.png" className="h-[9px] w-[9px] object-contain" fallback={<Logo size={9} />} />
                                    </span>
                                </span>
                                {i < list.length - 1 && <span className="absolute top-[19px] h-[56px] w-px bg-[#32ac97]/60" />}
                            </div>
                            <div
                                className={`flex h-[52px] min-w-0 flex-1 items-center gap-[8px] overflow-hidden rounded-tl-[7px] rounded-tr-[18px] rounded-br-[7px] rounded-bl-[18px] border px-[8px] ${active ? "border-[#4a9b8e] bg-[#4a9b8e52]" : "border-[#2020203d] bg-white"
                                    }`}
                            >
                                <span className="flex h-[23px] w-[28px] shrink-0 items-center justify-center rounded-[6px] border border-[#00000036] bg-white">
                                    <Photo src="/img/Threefold%20logo.png" className="h-[14px] w-[15px] object-contain" fallback={<Logo size={14} />} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className={`${serif} truncate text-[10px] font-bold text-[#666]`}>
                                        {t.service_name} · {to12(t.start_time)} – {to12(t.end_time)}
                                    </div>
                                    <div className={`${serif} mt-[2px] truncate text-[10px] font-bold text-[#202020]`}>{t.client_name}</div>
                                </div>
                                <span
                                    className={`${serif} flex h-[18px] w-[72px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${active ? "bg-[#2a8570] text-white" : "bg-[#f2f2f2] text-[#202020]"
                                        }`}
                                >
                                    {t.status}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};

const IncomeByService = ({ d }) => {
    const R = 38;
    const C = 2 * Math.PI * R;
    const services = d?.income.services || [];
    const total = services.reduce((s, x) => s + x.amount, 0);
    const sessions = services.reduce((s, x) => s + x.sessions, 0);
    let offset = 0;

    return (
        <Card className="p-[20px] sm:p-[22px]">
            <CardTitle>Income by service</CardTitle>
            <div className={`${serif} mt-[6px] text-[13px] text-[#666]`}>
                {new Date().toLocaleDateString("en-US", { month: "long" })} - {peso(total)}
            </div>

            <div className="mt-[22px] flex flex-wrap items-center gap-x-[28px] gap-y-[18px]">
                <div className="relative h-[106px] w-[106px] shrink-0">
                    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                        <circle cx="50" cy="50" r={R} fill="none" stroke="#eeeeee" strokeWidth="14" />
                        {total > 0 &&
                            services.map((s) => {
                                const len = (s.amount / total) * C;
                                const el = len > 0 && (
                                    <circle
                                        key={s.id}
                                        cx="50"
                                        cy="50"
                                        r={R}
                                        fill="none"
                                        stroke={SERVICE_COLORS[s.id]}
                                        strokeWidth="14"
                                        strokeDasharray={`${Math.max(0, len - 1)} ${C - Math.max(0, len - 1)}`}
                                        strokeDashoffset={-offset}
                                    />
                                );
                                offset += len;
                                return el;
                            })}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className={`${serif} text-[20px] font-bold leading-[22px]`}>{sessions}</span>
                        <span className={`${inter} text-[12px] font-semibold`}>Sessions</span>
                    </div>
                </div>

                <div className="flex min-w-[150px] flex-1 flex-col gap-[12px]">
                    {services.map((s) => (
                        <div key={s.id} className="flex items-start gap-[8px]">
                            <span className="mt-[3px] h-[9px] w-[11px] shrink-0" style={{ background: SERVICE_COLORS[s.id] }} />
                            <div>
                                <div className={`${serif} text-[10px] leading-[12px] text-[#666]`}>{s.name}</div>
                                <div className={`${serif} text-[10px] leading-[12px] text-[#666]`}>{peso(s.amount)}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
};

const YourSessions = ({ d }) => {
    const rows = d?.sessions.breakdown || [];
    return (
        <section className="flex min-h-[263px] w-full flex-col rounded-[10px] border border-[#c7b6b6] bg-white px-5 py-6">
            <h2 className={`${inter} text-[16px] text-[#1a1a1a]`}>Your sessions</h2>
            <p className={`${inter} text-[13px] text-[#888]`}>
                {d ? d.sessions.month_total : 0} session{d?.sessions.month_total === 1 ? "" : "s"} in{" "}
                {new Date().toLocaleDateString("en-US", { month: "long" })}
            </p>
            <div className="mt-[20px] flex flex-col gap-[10px]">
                {rows.map((s) => {
                    const meta = SESSION_META[s.key];
                    return (
                        <div key={s.key} className="flex flex-col gap-[6px]">
                            <div className="flex items-center justify-between">
                                <span className={`${inter} text-[13px] text-[#333]`}>{meta.label}</span>
                                <span className="inline-flex items-center gap-[2px]">
                                    <span className={`${inter} text-[13px] font-bold text-[#1a1a1a]`}>{s.n}</span>
                                    <span className={`${inter} text-[13px] text-[#888]`}>·</span>
                                    <span className={`${inter} text-[13px] font-bold text-[#1a1a1a]`}>{s.pct}%</span>
                                </span>
                            </div>
                            <div className="h-[8px] w-full rounded-[4px] bg-[#eeeeee]">
                                <div className="h-[8px] rounded-[4px]" style={{ width: `${s.pct}%`, background: meta.color }} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

const RecentActivity = ({ d }) => {
    const list = d?.activity || [];
    return (
        <Card className="p-[20px] sm:p-[15px] sm:pb-[20px]">
            <CardTitle className="sm:mt-[4px]">Recent Activity</CardTitle>
            <div className={`${serif} mt-[3px] text-[11px] text-[#666]`}>What&#39;s happened lately.</div>
            {list.length === 0 && <p className={`${serif} mt-4 text-[13px] text-[#666]`}>No activity yet.</p>}
            <ul className="m-0 mt-[16px] list-none p-0">
                {list.map((a) => (
                    <li key={a.id} className="border-b border-[#e4e4e4] py-[10px] last:border-0">
                        <p className={`${serif} m-0 text-[13px] text-black`}>{a.text}</p>
                        <p className={`${serif} m-0 mt-[6px] text-[13px] text-[#666]`}>{timeAgo(a.at)}</p>
                    </li>
                ))}
            </ul>
        </Card>
    );
};

function DashboardSkeleton() {
    return (
        <div aria-busy="true">
            <div className="mt-[24px] grid grid-cols-1 gap-[12px] sm:mt-[34px] sm:grid-cols-2 sm:gap-[16px] xl:grid-cols-4 xl:gap-[29px]">
                {[0, 1, 2, 3].map((card) => (
                    <div key={card} className={`${statCardBase} min-h-[140px] bg-white`}>
                        <SkeletonBlock className="h-3 w-36 rounded" />
                        <SkeletonBlock className="mt-5 h-8 w-28 rounded" />
                        <SkeletonBlock className="mt-4 h-3 w-24 rounded" />
                    </div>
                ))}
            </div>
            <div className="mt-[24px] grid grid-cols-1 gap-[16px] xl:grid-cols-[1fr_324px] xl:gap-[24px]">
                <Card className="min-h-[320px] p-[20px]">
                    <SkeletonBlock className="h-5 w-40 rounded" />
                    <SkeletonBlock className="mt-3 h-3 w-56 rounded" />
                    <div className="mt-8 flex h-48 items-end gap-3 border-b border-[#e8e8e8] px-2">
                        {["h-1/3", "h-2/3", "h-1/2", "h-3/4", "h-1/2", "h-full"].map((height, i) => (
                            <SkeletonBlock key={i} className={`flex-1 rounded-t ${height}`} />
                        ))}
                    </div>
                </Card>
                <Card className="min-h-[320px] p-[20px]">
                    <SkeletonBlock className="h-5 w-32 rounded" />
                    {[0, 1, 2, 3].map((row) => (
                        <div key={row} className="mt-6">
                            <SkeletonBlock className="h-3 w-40 rounded" />
                            <SkeletonBlock className="mt-3 h-2 w-full rounded" />
                        </div>
                    ))}
                </Card>
            </div>
            <div className="mt-[16px] grid grid-cols-1 gap-[16px] xl:grid-cols-[570fr_412fr] xl:gap-[27px]">
                <Card className="min-h-[464px] p-[20px]">
                    <SkeletonBlock className="h-5 w-40 rounded" />
                    <SkeletonBlock className="mt-3 h-3 w-56 rounded" />
                    <div className="mt-6 grid grid-cols-7 gap-2">
                        {Array.from({ length: 35 }, (_, i) => <SkeletonBlock key={i} className="h-10 rounded-lg" />)}
                    </div>
                </Card>
                <Card className="min-h-[464px] p-[20px]">
                    <SkeletonBlock className="h-5 w-40 rounded" />
                    {[0, 1, 2, 3, 4].map((row) => (
                        <div key={row} className="mt-6 flex items-center gap-3">
                            <SkeletonBlock className="size-9 rounded-full" />
                            <div className="flex-1">
                                <SkeletonBlock className="h-3 w-36 rounded" />
                                <SkeletonBlock className="mt-2 h-3 w-24 rounded" />
                            </div>
                        </div>
                    ))}
                </Card>
            </div>
            <div className="mt-[16px] grid grid-cols-1 items-start gap-[14px] md:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2].map((card) => (
                    <Card key={card} className="min-h-[263px] p-[20px]">
                        <SkeletonBlock className="h-5 w-36 rounded" />
                        {[0, 1, 2, 3].map((row) => (
                            <div key={row} className="mt-5 flex items-center gap-3">
                                <SkeletonBlock className="size-8 rounded-full" />
                                <SkeletonBlock className="h-3 flex-1 rounded" />
                            </div>
                        ))}
                    </Card>
                ))}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function AdminDashboard() {
    const [navOpen, setNavOpen] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let alive = true;
        apiFetch(`${API_BASE}/dashboard`)
            .then((d) => alive && setData(d))
            .catch((err) => alive && setError(err.message || "Could not load the dashboard."));
        return () => {
            alive = false;
        };
    }, []);

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
                    <button aria-label="Close menu" onClick={() => setNavOpen(false)} className="flex-1 bg-black/40" />
                </div>
            )}

            <main className="min-w-0 flex-1 px-[16px] pb-[48px] pt-[20px] sm:px-[28px] sm:pt-[32px] lg:px-[41px] lg:pb-[60px] lg:pt-[51px]">
                <Header onMenu={() => setNavOpen(true)} user={data?.user} attention={data?.attention.total || 0} />

                {error && (
                    <p className="mb-0 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
                )}

                {!data && !error ? (
                    <DashboardSkeleton />
                ) : (
                    <>
                        <StatCards d={data} />

                        <div className="mt-[24px] grid grid-cols-1 gap-[16px] sm:mt-[32px] xl:mt-[41px] xl:grid-cols-[1fr_324px] xl:gap-[24px]">
                            <MonthlyIncome d={data} />
                            <Earnings d={data} />
                        </div>

                        <div className="mt-[16px] grid grid-cols-1 gap-[16px] sm:mt-[24px] xl:mt-[28px] xl:grid-cols-[570fr_412fr] xl:gap-[27px]">
                            <CalendarCard />
                            <Today d={data} />
                        </div>

                        <div className="mt-[16px] grid grid-cols-1 items-start gap-[14px] sm:mt-[24px] md:grid-cols-2 xl:mt-[26px] xl:grid-cols-3">
                            <IncomeByService d={data} />
                            <YourSessions d={data} />
                            <div className="md:col-span-2 xl:col-span-1">
                                <RecentActivity d={data} />
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}