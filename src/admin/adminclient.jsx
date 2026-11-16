import React, { useEffect, useMemo, useState } from "react";
import AdminNavigation from "./adminnavigation";
import ProfileMenu from "../components/ProfileMenu";
import SkeletonBlock from "../components/SkeletonBlock";
import { apiFetch } from "../auth";
import { sendClientMessage } from "./messageApi";

const FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Inria+Serif:wght@400;700&family=Inter:wght@400;600;700&display=swap');`;
const inter = "font-['Inter',Helvetica,sans-serif]";
const serif = "font-['Inria_Serif',Georgia,serif]";

const STATUS_STYLE = {
    Active: "bg-[#d7eee8] text-[#1f6b55]",
    Inactive: "bg-[#eeeeee] text-[#666]",
    Completed: "bg-[#d7eee8] text-[#1f6b55]",
    Confirmed: "bg-[#e3f2ee] text-[#2a8570]",
    Pending: "bg-[#fdf1bc] text-[#8a6a00]",
    Cancelled: "bg-[#fde3df] text-[#b3382a]",
    Paid: "bg-[#d7eee8] text-[#1f6b55]",
    "To verify": "bg-[#fdf1bc] text-[#8a6a00]",
    Refunded: "bg-[#eeeeee] text-[#666]",
};

const EMPTY = {
    name: "", email: "", phone: "", birthdate: "", address: "", guardian: "",
    emergencyName: "", emergencyPhone: "", status: "Active", appointments: [], payments: [],
};

const peso = (n) => `₱${Number(n || 0).toLocaleString()}`;
const fmtDate = (iso) =>
    iso ? new Date(String(iso).slice(0, 10) + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "—";
const ageOf = (iso) => (iso ? Math.floor((Date.now() - new Date(iso)) / 31557600000) : null);
const phoneOk = (v) => !v || /^09\d{9}$/.test(String(v).replace(/\D/g, ""));

const inputCls = `${inter} h-[38px] w-full min-w-0 rounded-[6px] border border-[#c7b6b6] bg-white px-[12px] text-[16px] sm:text-[13px] text-[#202020] outline-none focus:border-[#4a9b8e] focus:ring-2 focus:ring-[#4a9b8e]/25`;

const Field = ({ label, error, children }) => (
    <label className="flex min-w-0 flex-col gap-[6px]">
        <span className={`${inter} text-[12px] font-bold text-[#666]`}>{label}</span>
        {children}
        {error && <span className={`${serif} text-[11px] text-[#b3382a]`}>{error}</span>}
    </label>
);

const Pill = ({ children }) => (
    <span className={`${serif} inline-flex h-[20px] shrink-0 items-center whitespace-nowrap rounded-full px-[10px] text-[11px] font-bold ${STATUS_STYLE[children] || "bg-gray-100 text-gray-700"}`}>
        {children}
    </span>
);

const Avatar = ({ name, size = 34 }) => (
    <span
        className={`${inter} flex shrink-0 items-center justify-center rounded-full bg-[#4a9b8e30] text-[12px] font-bold text-[#1f6b55]`}
        style={{ width: size, height: size }}
    >
        {(name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
    </span>
);

/* ------------------------------------------------------------------ */
/*  Message modal                                                      */
/* ------------------------------------------------------------------ */
const MessageModal = ({ client, onClose, onSent }) => {
    const [channel, setChannel] = useState("sms");
    const [template, setTemplate] = useState("custom");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");

    const isSms = channel === "sms";
    const target = isSms ? client.phone : client.email;
    const canSend = isSms ? phoneOk(client.phone) : /\S+@\S+\.\S+/.test(client.email);

    const TEMPLATES = {
        reminder: {
            subject: "Upcoming appointment reminder",
            sms: `Hi ${client.name}, reminder for your upcoming session at Threefold Therapy. See you soon!`,
            email: `Hi ${client.name},\n\nThis is a friendly reminder for your upcoming session with Threefold Therapy. Please let us know if you need to reschedule at least 24 hours in advance.\n\nWarm regards,\nThreefold Therapy Team`,
        },
        payment: {
            subject: "Payment verification needed",
            sms: `Hi ${client.name}, please complete your downpayment to confirm your session. Thank you!`,
            email: `Hi ${client.name},\n\nWe noticed your downpayment is still pending verification. Please settle your payment so we can secure your session slot.\n\nWarm regards,\nThreefold Therapy Team`,
        },
        followup: {
            subject: "Checking in after your session",
            sms: `Hi ${client.name}, thank you for attending your session today. Take care!`,
            email: `Hi ${client.name},\n\nThank you for attending your session. We hope it was meaningful. Feel free to book your next session through your client dashboard anytime.\n\nWarm regards,\nThreefold Therapy Team`,
        },
        custom: { subject: "", sms: "", email: "" },
    };

    const chooseTemplate = (key) => {
        setTemplate(key);
        const t = TEMPLATES[key];
        setSubject(t.subject);
        setBody(isSms ? t.sms : t.email);
    };

    const switchChannel = (next) => {
        setChannel(next);
        const t = TEMPLATES[template];
        if (template !== "custom") {
            setBody(next === "sms" ? t.sms : t.email);
        }
    };

    const valid = canSend && body.trim() && (isSms || subject.trim());

    const send = async () => {
        if (!valid || sending) return;
        setSending(true);
        setError("");
        try {
            await sendClientMessage({
                clientId: client.id,
                channel,
                to: target,
                subject: isSms ? undefined : subject.trim(),
                body: body.trim(),
            });
            onSent(`Message sent via ${channel.toUpperCase()} to ${target}`);
            onClose();
        } catch (err) {
            setError(err.message || "Failed to send message.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-[10px] border border-[#c7b6b6] bg-white p-5 sm:p-7"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className={`${serif} text-[20px] font-bold text-[#2f4a42]`}>Message {client.name}</h2>
                        <p className={`${serif} mt-1 text-[12px] text-[#666]`}>Send an update or reminder.</p>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="grid h-[32px] w-[32px] place-items-center text-[22px] leading-none text-[#666] hover:text-black">×</button>
                </div>

                {!canSend && (
                    <div className="mt-4 rounded-[6px] border border-[#f5c2c7] bg-[#f8d7da] p-3 text-[12px] text-[#842029]">
                        Client has no valid {isSms ? "mobile number" : "email"} on file.
                    </div>
                )}

                <div className="mt-4 flex flex-col gap-3">
                    <Field label="Template">
                        <select className={inputCls} value={template} onChange={(e) => chooseTemplate(e.target.value)}>
                            <option value="custom">Custom message</option>
                            <option value="reminder">Appointment reminder</option>
                            <option value="payment">Payment notice</option>
                            <option value="followup">Post-session follow-up</option>
                        </select>
                    </Field>

                    {!isSms && (
                        <Field label="Subject">
                            <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} />
                        </Field>
                    )}

                    <Field label="Message">
                        <textarea
                            rows={isSms ? 4 : 6}
                            className={`${inputCls} h-auto py-2 resize-y`}
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                        />
                    </Field>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <button onClick={onClose} className={`${serif} h-[36px] rounded-[6px] border border-[#c7b6b6] bg-white px-4 text-[13px] hover:bg-[#f2f2f2]`}>
                        Cancel
                    </button>
                    <button
                        disabled={!valid || sending}
                        onClick={send}
                        className={`${serif} h-[36px] rounded-[6px] bg-[#11a086] px-4 text-[13px] text-white hover:bg-[#0e8c75] disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                        {sending ? "Sending…" : "Send message"}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ------------------------------------------------------------------ */
/*  Detail drawer                                                      */
/* ------------------------------------------------------------------ */
const ClientDrawer = ({ clientId, onClose, onSave, onMessage }) => {
    const [tab, setTab] = useState("Profile");
    const [client, setClient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(EMPTY);

    useEffect(() => {
        if (!clientId) return;
        setLoading(true);
        apiFetch(`/admin/clients/${clientId}`)
            .then((data) => {
                const c = data.client || {};
                setClient(c);
                setForm({
                    id: c.id,
                    name: c.name || "",
                    email: c.email || "",
                    phone: c.phone || "",
                    birthdate: c.birthdate || "",
                    address: c.address === "—" ? "" : (c.address || ""),
                    guardian: c.guardian || "",
                    emergencyName: c.emergencyName || "",
                    emergencyPhone: c.emergencyPhone || "",
                    emergencyRelation: c.emergencyRelation || "",
                    status: c.status || "Active",
                    appointments: c.appointments || [],
                    payments: c.payments || [],
                });
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [clientId]);

    const set = (k) => (e) => {
        let v = e.target.value;
        if (k === "phone" || k === "emergencyPhone") {
            v = v.replace(/\D/g, "").slice(0, 11);
        }
        setForm({ ...form, [k]: v });
    };

    const valid = form.name.trim() && /\S+@\S+\.\S+/.test(form.email) && phoneOk(form.phone) && phoneOk(form.emergencyPhone);

    const handleSave = async () => {
        if (!valid || saving) return;
        setSaving(true);
        try {
            await onSave(form);
            onClose();
        } catch (_) {
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex justify-end bg-black/40" onClick={onClose}>
            <aside
                role="dialog"
                aria-modal="true"
                className="flex h-full w-full flex-col bg-white sm:w-[560px] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Head */}
                <div className="flex items-start justify-between gap-3 border-b border-[#e8e8e8] px-5 py-5 sm:px-[28px] sm:py-[24px]">
                    <div className="flex min-w-0 items-center gap-[14px]">
                        <Avatar name={form.name || "?"} size={48} />
                        <div className="min-w-0">
                            <h2 className={`${serif} truncate text-[20px] font-bold text-[#2f4a42] sm:text-[22px]`}>
                                {loading ? <SkeletonBlock className="h-6 w-40 rounded" /> : form.name}
                            </h2>
                            <p className={`${serif} text-[12px] text-[#666]`}>
                                {client?.email} · Client since {fmtDate(client?.joined)}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="grid h-[36px] w-[36px] shrink-0 place-items-center text-[24px] leading-none text-[#666] hover:text-black cursor-pointer">×</button>
                </div>

                {/* Tabs */}
                <div className="px-5 pt-4 sm:px-[28px]">
                    <div className="flex h-[34px] w-fit max-w-full overflow-x-auto rounded-[11px] bg-[#4a9b8e30] p-[3px]">
                        {["Profile", "Appointments", "Payments"].map((t) => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`${serif} shrink-0 rounded-[9px] px-[16px] text-[12px] text-[#202020] cursor-pointer transition ${tab === t ? "bg-white font-bold shadow-sm" : ""}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-[28px]">
                    {loading ? (
                        <div className="space-y-5 py-2" aria-busy="true">
                            {[0, 1, 2, 3].map((row) => (
                                <div key={row}>
                                    <SkeletonBlock className="mb-2 h-3 w-24 rounded" />
                                    <SkeletonBlock className="h-10 w-full rounded-md" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            {tab === "Profile" && (
                                <div className="flex flex-col gap-[14px]">
                                    <Field label="Full name"><input className={inputCls} value={form.name} onChange={set("name")} /></Field>
                                    <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
                                        <Field label="Email"><input type="email" className={inputCls} value={form.email} onChange={set("email")} /></Field>
                                        <Field label="Phone number (11 digits)">
                                            <input
                                                type="tel"
                                                inputMode="numeric"
                                                maxLength={11}
                                                placeholder="09123456789"
                                                className={inputCls}
                                                value={form.phone}
                                                onChange={set("phone")}
                                            />
                                        </Field>
                                    </div>
                                    <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
                                        <Field label="Birthdate"><input type="date" className={inputCls} value={form.birthdate} onChange={set("birthdate")} /></Field>
                                        <Field label="Status">
                                            <select className={inputCls} value={form.status} onChange={set("status")}>
                                                <option value="Active">Active</option>
                                                <option value="Inactive">Inactive</option>
                                            </select>
                                        </Field>
                                    </div>
                                    <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
                                        <Field label="Emergency contact name"><input className={inputCls} value={form.emergencyName} onChange={set("emergencyName")} /></Field>
                                        <Field label="Emergency phone (11 digits)">
                                            <input
                                                type="tel"
                                                inputMode="numeric"
                                                maxLength={11}
                                                placeholder="09123456789"
                                                className={inputCls}
                                                value={form.emergencyPhone}
                                                onChange={set("emergencyPhone")}
                                            />
                                        </Field>
                                    </div>
                                </div>
                            )}

                            {tab === "Appointments" && (
                                <ul className="divide-y divide-[#eee]">
                                    {(form.appointments || []).length === 0 ? (
                                        <li className={`${serif} py-[32px] text-center text-[13px] text-[#666]`}>No appointment records found for this client.</li>
                                    ) : (
                                        form.appointments.map((a) => (
                                            <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                                                <div className="min-w-0">
                                                    <div className={`${serif} text-[13px] font-semibold text-black`}>{a.service} · {a.by}</div>
                                                    <div className={`${serif} text-[11px] text-[#666]`}>{a.date} · {a.mode} · Ref: {a.reference}</div>
                                                </div>
                                                <Pill>{a.status}</Pill>
                                            </li>
                                        ))
                                    )}
                                </ul>
                            )}

                            {tab === "Payments" && (
                                <ul className="divide-y divide-[#eee]">
                                    {(form.payments || []).length === 0 ? (
                                        <li className={`${serif} py-[32px] text-center text-[13px] text-[#666]`}>No payment records found.</li>
                                    ) : (
                                        form.payments.map((p) => (
                                            <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                                                <div className="min-w-0">
                                                    <div className={`${serif} text-[13px] font-semibold text-black`}>{peso(p.amount)} via {p.method}</div>
                                                    <div className={`${serif} text-[11px] text-[#666]`}>{fmtDate(p.date)}</div>
                                                </div>
                                                <Pill>{p.status}</Pill>
                                            </li>
                                        ))
                                    )}
                                </ul>
                            )}
                        </>
                    )}
                </div>

                {/* Foot */}
                <div className="flex flex-col gap-3 border-t border-[#e8e8e8] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-[28px]">
                    <button
                        onClick={() => onMessage(client || form)}
                        className={`${serif} h-[36px] rounded-[6px] border border-[#4a9b8e] bg-[#e3f2ee] px-4 text-[13px] text-[#2a8570] hover:bg-[#d7eee8] cursor-pointer`}
                    >
                        Message client
                    </button>
                    <div className="flex gap-[10px]">
                        <button onClick={onClose} className={`${serif} h-[36px] rounded-[6px] border border-[#c7b6b6] bg-white px-4 text-[13px] hover:bg-[#f2f2f2] cursor-pointer`}>
                            Cancel
                        </button>
                        <button
                            disabled={!valid || saving}
                            onClick={handleSave}
                            className={`${serif} h-[36px] rounded-[6px] bg-[#11a086] px-4 text-[13px] text-white hover:bg-[#0e8c75] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer`}
                        >
                            {saving ? "Saving…" : "Save changes"}
                        </button>
                    </div>
                </div>
            </aside>
        </div>
    );
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function AdminClients() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("All");
    const [activeClientId, setActiveClientId] = useState(null);
    const [messageTo, setMessageTo] = useState(null);
    const [toast, setToast] = useState("");

    const notify = (m) => {
        setToast(m);
        setTimeout(() => setToast(""), 2800);
    };

    const loadClients = () => {
        setLoading(true);
        apiFetch(`/admin/clients?q=${encodeURIComponent(query)}`)
            .then((data) => setClients(data.clients || []))
            .catch((err) => notify(err.message || "Could not load clients."))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadClients();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);

    const filtered = useMemo(() => {
        return clients.filter((c) => status === "All" || c.status === status);
    }, [clients, status]);

    const saveClient = async (form) => {
        await apiFetch(`/admin/clients/${form.id}`, {
            method: "PUT",
            body: JSON.stringify(form),
        });
        notify("Client profile updated successfully.");
        loadClients();
    };

    const stats = [
        ["TOTAL CLIENTS", clients.length],
        ["ACTIVE CLIENTS", clients.filter((c) => c.status === "Active").length],
        ["TOTAL SESSIONS", clients.reduce((s, c) => s + (c.appointments_count || 0), 0)],
        ["VERIFIED PAYMENTS", clients.reduce((s, c) => s + (c.payments_count || 0), 0)],
    ];

    const actionBtn = `${serif} h-[34px] rounded-[4px] px-[12px] text-[12px] xl:h-[24px] xl:px-[10px] xl:text-[11px] cursor-pointer transition`;

    return (
        <div className="flex min-h-screen w-full bg-[#f2f2f2] antialiased">
            <style>{FONT_CSS}</style>
            <AdminNavigation />

            <main className="min-w-0 flex-1 px-4 pb-[60px] pt-[68px] sm:px-6 lg:px-[41px] lg:pt-[51px]">
                <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <div className={`${inter} text-[14px] font-bold tracking-[4.2px] text-[#4a9b8e] sm:text-[20px]`}>CLIENTS</div>
                        <h1 className={`${serif} mt-[8px] text-[30px] font-bold leading-[1.15] text-[#2f4a42] sm:text-[40px]`}>Client management</h1>
                        <p className={`${serif} mt-[4px] text-[14px] text-[#666]`}>
                            Manage client personal details, emergency contacts, session histories, and verified payments.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-[17px]">
                        <ProfileMenu size={37} />
                    </div>
                </header>

                {/* Stats */}
                <div className="mt-[28px] grid grid-cols-2 gap-3 sm:mt-[34px] sm:gap-4 xl:grid-cols-4 xl:gap-[29px]">
                    {stats.map(([label, n], i) => (
                        <div
                            key={label}
                            className={`relative min-h-[96px] overflow-hidden rounded-xl border px-4 py-4 sm:min-h-[110px] sm:px-[23px] sm:py-0 ${
                                i === 0 ? "border-[#c7b6b6] bg-[#1f4d3f]" : "border-[#2020203d] bg-white"
                            }`}
                        >
                            <div className={`${inter} text-[10px] font-bold sm:mt-[24px] sm:text-[11px] ${i === 0 ? "text-[#a8c8b8]" : "text-[#666]"}`}>{label}</div>
                            <div className={`${inter} mt-[8px] text-[26px] font-bold sm:mt-[10px] sm:text-[32px] ${i === 0 ? "text-white" : "text-[#202020]"}`}>
                                {loading ? <SkeletonBlock className="h-8 w-12 rounded" /> : n}
                            </div>
                        </div>
                    ))}
                </div>

                <section className="mt-[24px] rounded-[10px] border border-[#c7b6b6] bg-white sm:mt-[32px]">
                    <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className={`${serif} text-[16px] text-black font-bold`}>Registered clients</h2>
                            <p className={`${serif} text-[11px] text-[#666]`}>
                                {loading ? <SkeletonBlock className="mt-1 h-3 w-24 rounded" /> : `${filtered.length} client records`}
                            </p>
                        </div>
                        <div className="flex flex-col gap-[12px] sm:flex-row sm:items-center">
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search name, email, or phone"
                                aria-label="Search clients"
                                className={`${inputCls} sm:!w-[280px]`}
                            />
                            <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" className={`${inputCls} sm:!w-[150px]`}>
                                <option value="All">All statuses</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full border-t border-[#e8e8e8] text-left">
                            <thead>
                                <tr className={`${inter} text-[11px] text-[#666] bg-[#fafafa]`}>
                                    <th className="px-[24px] py-[12px] font-bold">Client</th>
                                    <th className="py-[12px] font-bold">Contact</th>
                                    <th className="py-[12px] font-bold">Emergency</th>
                                    <th className="py-[12px] font-bold">Appointments</th>
                                    <th className="py-[12px] font-bold">Status</th>
                                    <th className="px-[24px] py-[12px] text-right font-bold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    [0, 1, 2, 3, 4].map((row) => (
                                        <tr key={row} className="border-t border-[#e8e8e8]" aria-hidden="true">
                                            <td className="px-[24px] py-[12px]">
                                                <div className="flex items-center gap-[12px]">
                                                    <SkeletonBlock className="size-10 shrink-0 rounded-full" />
                                                    <div className="min-w-[140px] flex-1">
                                                        <SkeletonBlock className="h-3 w-28 max-w-full rounded" />
                                                        <SkeletonBlock className="mt-2 h-2.5 w-36 max-w-full rounded" />
                                                    </div>
                                                </div>
                                            </td>
                                            <td><SkeletonBlock className="h-3 w-24 rounded" /></td>
                                            <td><SkeletonBlock className="h-3 w-24 rounded" /></td>
                                            <td><SkeletonBlock className="h-3 w-8 rounded" /></td>
                                            <td><SkeletonBlock className="h-5 w-16 rounded-full" /></td>
                                            <td className="px-[24px]"><SkeletonBlock className="ml-auto h-7 w-16 rounded" /></td>
                                        </tr>
                                    ))
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className={`${serif} px-[24px] py-[48px] text-center text-[13px] text-[#666]`}>
                                            No clients match your filter.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((c) => (
                                        <tr key={c.id} className="border-t border-[#e8e8e8] hover:bg-[#fafafa]">
                                            <td className="px-[24px] py-[12px]">
                                                <div className="flex items-center gap-[12px]">
                                                    <Avatar name={c.name} />
                                                    <div>
                                                        <div className={`${serif} text-[13px] font-bold text-black`}>{c.name}</div>
                                                        <div className={`${serif} text-[11px] text-[#666]`}>{c.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={`${serif} text-[12px] text-[#444]`}>{c.phone}</td>
                                            <td className={`${serif} text-[12px] text-[#444]`}>
                                                {c.emergencyName ? `${c.emergencyName} (${c.emergencyPhone})` : "—"}
                                            </td>
                                            <td className={`${serif} text-[12px] text-[#444]`}>
                                                {c.appointments_count || 0} sessions
                                            </td>
                                            <td><Pill>{c.status}</Pill></td>
                                            <td className="px-[24px] text-right">
                                                <div className="flex justify-end gap-1.5">
                                                    <button
                                                        onClick={() => setActiveClientId(c.id)}
                                                        className={`${actionBtn} border border-[#c7b6b6] bg-white text-[#202020] hover:bg-[#f2f2f2]`}
                                                    >
                                                        Manage
                                                    </button>
                                                    <button
                                                        onClick={() => setMessageTo(c)}
                                                        className={`${actionBtn} border border-[#4a9b8e] bg-[#e3f2ee] text-[#2a8570] hover:bg-[#d7eee8]`}
                                                    >
                                                        Message
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>

            {activeClientId && (
                <ClientDrawer
                    clientId={activeClientId}
                    onClose={() => setActiveClientId(null)}
                    onSave={saveClient}
                    onMessage={(c) => {
                        setActiveClientId(null);
                        setMessageTo(c);
                    }}
                />
            )}

            {messageTo && (
                <MessageModal
                    client={messageTo}
                    onClose={() => setMessageTo(null)}
                    onSent={notify}
                />
            )}

            {toast && (
                <div role="status" className={`${inter} fixed bottom-[16px] left-[16px] right-[16px] z-[70] rounded-[8px] bg-[#2f4a42] px-[18px] py-[10px] text-center text-[13px] text-white shadow-lg sm:bottom-[28px] sm:left-auto sm:right-[28px] sm:text-left`}>
                    {toast}
                </div>
            )}
        </div>
    );
}
