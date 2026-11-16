import React, { useEffect, useMemo, useState } from "react";
import AdminNavigation from "./adminnavigation";
import ProfileMenu from "../components/ProfileMenu";
import SkeletonBlock from "../components/SkeletonBlock";
import { apiFetch } from "../auth";

const FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Inria+Serif:wght@400;700&family=Inter:wght@400;600;700&display=swap');`;
const inter = "font-['Inter',Helvetica,sans-serif]";
const serif = "font-['Inria_Serif',Georgia,serif]";

const ROLES = ["All", "Client", "Affiliate", "Admin"];
const STATUS_STYLE = {
    Active: "bg-[#d7eee8] text-[#1f6b55]",
    Pending: "bg-[#fdf1bc] text-[#8a6a00]",
    Suspended: "bg-[#fde3df] text-[#b3382a]",
};
const PAGE_SIZE = 8;

/* ------------------------------------------------------------------ */
/*  Small pieces                                                       */
/* ------------------------------------------------------------------ */
const Avatar = ({ name }) => {
    const initials = (name || "Account")
        .replace(/^Dr\.\s*/i, "")
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
    return (
        <span className={`${inter} flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[#4a9b8e30] text-[12px] font-bold text-[#1f6b55]`}>
            {initials}
        </span>
    );
};

const StatusBadge = ({ status }) => (
    <span className={`${serif} inline-flex h-[20px] items-center rounded-full px-[10px] text-[11px] font-bold ${STATUS_STYLE[status] || STATUS_STYLE.Active}`}>
        {status}
    </span>
);

const Field = ({ label, children }) => (
    <label className="flex flex-col gap-[6px]">
        <span className={`${inter} text-[12px] font-bold text-[#666]`}>{label}</span>
        {children}
    </label>
);

const inputCls = `${inter} h-[40px] rounded-[6px] border border-[#c7b6b6] bg-white px-[12px] text-[16px] text-[#202020] outline-none focus:border-[#4a9b8e] focus:ring-2 focus:ring-[#4a9b8e]/25 sm:h-[38px] sm:text-[13px]`;
const actionBtn = `${serif} h-[32px] rounded-[4px] border px-[12px] text-[12px] md:h-[24px] md:px-[10px] md:text-[11px] cursor-pointer transition`;
const neutralBtn = `${actionBtn} border-[#c7b6b6] bg-white text-[#202020] hover:bg-[#f2f2f2]`;

const RowActions = ({ a, onApprove, onEdit, onSuspend, onDelete, className = "" }) => (
    <div className={`flex flex-wrap gap-[6px] ${className}`}>
        {a.status === "Pending" && (
            <button onClick={() => onApprove(a)} className={`${actionBtn} border-transparent bg-[#11a086] text-white hover:bg-[#0e8c75]`}>
                Approve
            </button>
        )}
        <button onClick={() => onEdit(a)} className={neutralBtn}>Edit</button>
        {a.status !== "Pending" && (
            <button onClick={() => onSuspend(a)} className={neutralBtn}>
                {a.status === "Suspended" ? "Reactivate" : "Suspend"}
            </button>
        )}
        <button onClick={() => onDelete(a)} className={`${actionBtn} border-[#ff4c4c75] bg-white text-[#ff5656] hover:bg-[#fff1f1]`}>
            Delete
        </button>
    </div>
);

/* ------------------------------------------------------------------ */
/*  Add / edit modal                                                   */
/* ------------------------------------------------------------------ */
const AccountModal = ({ account, onClose, onSave }) => {
    const isEdit = !!account;
    const [form, setForm] = useState(
        account
            ? {
                first_name: account.first_name || account.name?.split(" ")[0] || "",
                last_name: account.last_name || account.name?.split(" ").slice(1).join(" ") || "",
                email: account.email || "",
                phone: account.phone === "—" ? "" : (account.phone || ""),
                password: "",
                role: account.raw_role || (account.role?.toUpperCase() === "ADMIN" ? "ADMIN" : account.role?.toUpperCase() === "AFFILIATE" ? "AFFILIATE" : "CLIENT"),
                status: account.status || "Active",
            }
            : { first_name: "", last_name: "", email: "", phone: "", password: "", role: "CLIENT", status: "Active" }
    );
    const [showPw, setShowPw] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const set = (k) => (e) => {
        let v = e.target.value;
        if (k === "phone") {
            v = v.replace(/\D/g, "").slice(0, 11);
        }
        setForm({ ...form, [k]: v });
    };

    const phoneOk = !form.phone || /^09\d{9}$/.test(form.phone);
    const pwOk = isEdit ? form.password === "" || form.password.length >= 8 : form.password.length >= 8;
    const valid = form.first_name.trim() && form.last_name.trim() && /\S+@\S+\.\S+/.test(form.email) && phoneOk && pwOk;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!valid || saving) return;
        setSaving(true);
        setError("");
        try {
            await onSave(form, account?.id);
            onClose();
        } catch (err) {
            setError(err.message || "Failed to save account.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-[16px]" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                className="max-h-[90vh] w-full max-w-[440px] overflow-y-auto rounded-[10px] border border-[#c7b6b6] bg-white p-[20px] sm:p-[28px]"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className={`${serif} text-[20px] font-bold text-[#2f4a42]`}>
                    {account ? "Edit account" : "Add account"}
                </h2>
                {error && (
                    <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                        {error}
                    </p>
                )}
                <form onSubmit={handleSubmit} className="mt-[20px] flex flex-col gap-[14px]">
                    <div className="grid grid-cols-2 gap-2">
                        <Field label="First name">
                            <input className={inputCls} value={form.first_name} onChange={set("first_name")} required />
                        </Field>
                        <Field label="Last name">
                            <input className={inputCls} value={form.last_name} onChange={set("last_name")} required />
                        </Field>
                    </div>
                    <Field label="Email">
                        <input type="email" className={inputCls} value={form.email} onChange={set("email")} required />
                    </Field>
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
                        {form.phone && !phoneOk && (
                            <span className={`${serif} text-[11px] text-[#b3382a]`}>
                                Must be 11 digits starting with 09 (e.g. 09123456789).
                            </span>
                        )}
                    </Field>
                    <Field label={isEdit ? "New password (leave blank to keep current)" : "Password"}>
                        <div className="relative">
                            <input
                                type={showPw ? "text" : "password"}
                                autoComplete="new-password"
                                placeholder={isEdit ? "Leave blank to keep current" : "At least 8 characters"}
                                className={`${inputCls} w-full pr-[60px]`}
                                value={form.password}
                                onChange={set("password")}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw(!showPw)}
                                className={`${serif} absolute right-[10px] top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#2a8570] underline cursor-pointer`}
                            >
                                {showPw ? "Hide" : "Show"}
                            </button>
                        </div>
                    </Field>
                    <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
                        <Field label="Role">
                            <select className={inputCls} value={form.role} onChange={set("role")}>
                                <option value="CLIENT">Client</option>
                                <option value="AFFILIATE">Affiliate</option>
                                <option value="ADMIN">Admin</option>
                            </select>
                        </Field>
                        <Field label="Status">
                            <select className={inputCls} value={form.status} onChange={set("status")}>
                                <option value="Active">Active</option>
                                <option value="Suspended">Suspended</option>
                            </select>
                        </Field>
                    </div>
                    <div className="mt-[24px] flex justify-end gap-[10px]">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`${serif} h-[38px] rounded-[6px] border border-[#c7b6b6] bg-white px-[16px] text-[13px] text-[#202020] hover:bg-[#f2f2f2] cursor-pointer sm:h-[34px]`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!valid || saving}
                            className={`${serif} h-[38px] rounded-[6px] bg-[#11a086] px-[16px] text-[13px] text-white hover:bg-[#0e8c75] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer sm:h-[34px]`}
                        >
                            {saving ? "Saving…" : "Save changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function AdminAccounts() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState("All");
    const [status, setStatus] = useState("All");
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [roleCounts, setRoleCounts] = useState({ All: 0, Client: 0, Affiliate: 0, Admin: 0 });
    const [modal, setModal] = useState(null);
    const [toast, setToast] = useState("");
    const [navOpen, setNavOpen] = useState(false);

    const notify = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(""), 2800);
    };

    const loadAccounts = () => {
        setLoading(true);
        const params = new URLSearchParams({
            role,
            q: query,
            page: String(page),
            per_page: String(PAGE_SIZE),
        });

        apiFetch(`/admin/accounts?${params.toString()}`)
            .then((data) => {
                setAccounts(data.accounts || []);
                if (data.meta) setMeta(data.meta);
                if (data.role_counts) setRoleCounts(data.role_counts);
            })
            .catch((err) => notify(err.message || "Failed to load accounts."))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadAccounts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [role, query, page]);

    const filtered = useMemo(() => {
        if (status === "All") return accounts;
        return accounts.filter((a) => a.status === status);
    }, [accounts, status]);

    const saveAccount = async (formData, id) => {
        if (id) {
            await apiFetch(`/admin/accounts/${id}`, {
                method: "PUT",
                body: JSON.stringify(formData),
            });
            notify("Account updated successfully.");
        } else {
            await apiFetch("/admin/accounts", {
                method: "POST",
                body: JSON.stringify(formData),
            });
            notify("Account created successfully.");
        }
        loadAccounts();
    };

    const toggleSuspend = async (a) => {
        const next = a.status === "Suspended" ? "Active" : "Suspended";
        try {
            await apiFetch(`/admin/accounts/${a.id}/status`, {
                method: "POST",
                body: JSON.stringify({ status: next }),
            });
            notify(next === "Suspended" ? "Account suspended." : "Account reactivated.");
            loadAccounts();
        } catch (err) {
            notify(err.message || "Could not update status.");
        }
    };

    const approve = async (a) => {
        try {
            await apiFetch(`/admin/accounts/${a.id}/status`, {
                method: "POST",
                body: JSON.stringify({ status: "Active" }),
            });
            notify("Account approved.");
            loadAccounts();
        } catch (err) {
            notify(err.message || "Could not approve account.");
        }
    };

    const remove = async (a) => {
        if (!window.confirm(`Delete ${a.name}'s account? This action cannot be undone.`)) return;
        try {
            await apiFetch(`/admin/accounts/${a.id}`, { method: "DELETE" });
            notify("Account deleted successfully.");
            loadAccounts();
        } catch (err) {
            notify(err.message || "Could not delete account.");
        }
    };

    const actionProps = { onApprove: approve, onEdit: setModal, onSuspend: toggleSuspend, onDelete: remove };

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

            <main className="min-w-0 flex-1 px-[16px] pb-[48px] pt-[20px] sm:px-[28px] sm:pt-[32px] lg:px-[41px] lg:pb-[60px] lg:pt-[51px]">
                <header className="flex items-start justify-between gap-[12px]">
                    <div className="min-w-0">
                        <div className="flex items-center gap-[12px]">
                            <button
                                onClick={() => setNavOpen(true)}
                                aria-label="Open menu"
                                className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[8px] border border-[#c7b6b6] bg-white text-[#2f4a42] lg:hidden"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <path d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                            <div className={`${inter} text-[14px] font-bold tracking-[3px] text-[#4a9b8e] sm:text-[20px] sm:tracking-[4.2px]`}>
                                ACCOUNTS
                            </div>
                        </div>
                        <h1 className={`${serif} mt-[8px] text-[28px] font-bold leading-[1.15] text-[#2f4a42] sm:text-[34px] lg:text-[40px]`}>
                            Manage accounts
                        </h1>
                        <p className={`${serif} mt-[4px] text-[13px] text-[#666] sm:text-[14px]`}>
                            Connected live to database. Add, edit, suspend, or delete client, affiliate, and admin accounts.
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-[10px] sm:gap-[17px]">
                        <button
                            onClick={() => setModal("new")}
                            aria-label="Add account"
                            className={`${inter} flex h-[37px] items-center gap-[8px] rounded-[8px] bg-[#1f4d3f] px-[12px] text-[13px] font-bold text-white hover:bg-[#2f4a42] transition cursor-pointer sm:px-[16px]`}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            <span className="hidden sm:inline">Add account</span>
                        </button>
                        <ProfileMenu size={37} />
                    </div>
                </header>

                {/* Role selection tabs */}
                <div className="mt-[24px] grid grid-cols-2 gap-[12px] sm:mt-[34px] lg:grid-cols-4 lg:gap-[16px]">
                    {ROLES.map((r) => {
                        const on = role === r;
                        return (
                            <button
                                key={r}
                                onClick={() => { setRole(r); setPage(1); }}
                                aria-pressed={on}
                                className={`relative h-[88px] overflow-hidden rounded-xl border px-[16px] text-left transition-colors cursor-pointer ${
                                    on ? "border-[#1f4d3f] bg-[#1f4d3f] text-white" : "border-[#2020203d] bg-white hover:bg-[#fafafa]"
                                }`}
                            >
                                <div className={`${inter} text-[10px] font-bold sm:text-[11px] ${on ? "text-[#a8c8b8]" : "text-[#666]"}`}>
                                    {r === "All" ? "ALL ROLES" : r.toUpperCase()}
                                </div>
                                <div className={`${inter} mt-[10px] text-[20px] font-bold sm:mt-[14px] sm:text-[24px] ${on ? "text-white" : "text-[#202020]"}`}>
                                    {roleCounts[r] ?? 0}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Table card */}
                <section className="mt-[24px] rounded-[10px] border border-[#c7b6b6] bg-white sm:mt-[32px]">
                    <div className="flex flex-col gap-[12px] px-[16px] py-[16px] sm:px-[24px] sm:py-[20px] md:flex-row md:items-center md:justify-between md:gap-[16px]">
                        <div>
                            <h2 className={`${serif} text-[16px] text-black font-bold`}>
                                {role === "All" ? "All registered accounts" : `${role} accounts`}
                            </h2>
                            <p className={`${serif} text-[11px] text-[#666]`}>
                                {loading ? <SkeletonBlock className="mt-1 h-3 w-24 rounded" /> : `${meta.total || filtered.length} total accounts`}
                            </p>
                        </div>
                        <div className="flex flex-col gap-[10px] sm:flex-row sm:items-center sm:gap-[12px]">
                            <input
                                value={query}
                                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                                placeholder="Search name, email, or phone"
                                aria-label="Search accounts"
                                className={`${inputCls} w-full sm:flex-1 md:w-[240px] md:flex-none`}
                            />
                            <select
                                value={status}
                                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                                aria-label="Filter by status"
                                className={`${inputCls} w-full sm:w-[150px]`}
                            >
                                <option value="All">All statuses</option>
                                <option value="Active">Active</option>
                                <option value="Suspended">Suspended</option>
                            </select>
                        </div>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className={`${inter} text-[11px] font-bold text-[#666] bg-[#fcfcfc]`}>
                                    <th className="px-[24px] py-[12px] font-bold">User</th>
                                    <th className="py-[12px] pr-[12px] font-bold">Role</th>
                                    <th className="py-[12px] pr-[12px] font-bold">Status</th>
                                    <th className="hidden py-[12px] pr-[12px] font-bold xl:table-cell">Joined</th>
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
                                                    <div className="min-w-[150px] flex-1">
                                                        <SkeletonBlock className="h-3 w-32 max-w-full rounded" />
                                                        <SkeletonBlock className="mt-2 h-2.5 w-44 max-w-full rounded" />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="pr-[12px]"><SkeletonBlock className="h-3 w-16 rounded" /></td>
                                            <td className="pr-[12px]"><SkeletonBlock className="h-5 w-16 rounded-full" /></td>
                                            <td className="hidden pr-[12px] xl:table-cell"><SkeletonBlock className="h-3 w-20 rounded" /></td>
                                            <td className="px-[24px]"><SkeletonBlock className="ml-auto h-7 w-16 rounded" /></td>
                                        </tr>
                                    ))
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className={`${serif} px-[24px] py-[48px] text-center text-[13px] text-[#666]`}>
                                            No accounts found.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((a) => (
                                        <tr key={a.id} className="border-t border-[#e8e8e8] hover:bg-[#fafafa]">
                                            <td className="px-[24px] py-[12px]">
                                                <div className="flex items-center gap-[12px]">
                                                    <Avatar name={a.name} />
                                                    <div className="min-w-0">
                                                        <div className={`${serif} text-[13px] font-semibold text-black`}>{a.name}</div>
                                                        <div className={`${serif} break-all text-[11px] text-[#666]`}>
                                                            {a.email} {a.phone !== "—" && `· ${a.phone}`}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={`${serif} pr-[12px] text-[13px] text-black font-medium`}>{a.role}</td>
                                            <td className="pr-[12px]"><StatusBadge status={a.status} /></td>
                                            <td className={`${serif} hidden pr-[12px] text-[13px] text-[#666] xl:table-cell`}>{a.joined}</td>
                                            <td className="px-[24px]">
                                                <RowActions a={a} {...actionProps} className="justify-end" />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between gap-[12px] border-t border-[#e8e8e8] px-[16px] py-[14px] sm:px-[24px]">
                        <span className={`${serif} text-[11px] text-[#666]`}>
                            Page {meta.current_page || page} of {meta.last_page || 1}
                        </span>
                        <div className="flex gap-[6px]">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className={`${serif} h-[32px] rounded-[4px] border border-[#c7b6b6] bg-white px-[14px] text-[12px] disabled:opacity-40 cursor-pointer sm:h-[24px] sm:px-[12px] sm:text-[11px]`}
                            >
                                Previous
                            </button>
                            <button
                                disabled={page >= (meta.last_page || 1)}
                                onClick={() => setPage((p) => p + 1)}
                                className={`${serif} h-[32px] rounded-[4px] border border-[#c7b6b6] bg-white px-[14px] text-[12px] disabled:opacity-40 cursor-pointer sm:h-[24px] sm:px-[12px] sm:text-[11px]`}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </section>
            </main>

            {modal && (
                <AccountModal
                    account={modal === "new" ? null : modal}
                    onClose={() => setModal(null)}
                    onSave={saveAccount}
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
