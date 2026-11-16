import React, { useEffect, useMemo, useState } from "react";
import AdminNavigation from "./adminnavigation";
import ProfileMenu from "../components/ProfileMenu";
import SkeletonBlock from "../components/SkeletonBlock";
import { apiFetch } from "../auth";
import { peso, to12 } from "../components/payUtils";

const FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Inknut+Antiqua:wght@600&family=Inria+Serif:wght@400;700&family=Inter:wght@400;600;700&display=swap');`;

const inter = "font-['Inter',Helvetica,sans-serif]";
const serif = "font-['Inria_Serif',Georgia,serif]";

/* ---------- Role & Action Badges ---------- */
const ROLE_BADGES = {
  ADMIN: {
    label: "Admin",
    bg: "bg-[#1f4d3f] text-white border-transparent",
    dot: "bg-emerald-400",
  },
  AFFILIATE: {
    label: "Affiliate",
    bg: "bg-[#ede9fe] text-[#6d28d9] border-[#ddd6fe]",
    dot: "bg-[#8b5cf6]",
  },
  CLIENT: {
    label: "Client",
    bg: "bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]",
    dot: "bg-[#0284c7]",
  },
  SYSTEM: {
    label: "System",
    bg: "bg-[#f3f4f6] text-[#4b5563] border-[#e5e7eb]",
    dot: "bg-[#9ca3af]",
  },
};

const ACTION_COLORS = {
  appointment_booked: "bg-[#e0f2fe] text-[#0284c7] border-[#bae6fd]",
  appointment_approved: "bg-[#dcfce7] text-[#15803d] border-[#bbf7d0]",
  appointment_declined: "bg-red-100 text-red-700 border-red-200",
  appointment_completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  appointment_rescheduled: "bg-[#fef3c7] text-[#b45309] border-[#fde68a]",
  appointment_cancelled: "bg-rose-100 text-rose-700 border-rose-200",
  payment_submitted: "bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]",
  payment_verified: "bg-[#dcfce7] text-[#166534] border-[#bbf7d0]",
  payment_rejected: "bg-red-100 text-red-700 border-red-200",
  balance_submitted: "bg-[#fef3c7] text-[#b45309] border-[#fde68a]",
  balance_verified: "bg-[#dcfce7] text-[#166534] border-[#bbf7d0]",
  balance_rejected: "bg-red-100 text-red-700 border-red-200",
  schedule_created: "bg-[#f3e8ff] text-[#7e22ce] border-[#e9d5ff]",
  schedule_deleted: "bg-orange-100 text-orange-800 border-orange-200",
  service_created: "bg-[#ccfbf1] text-[#0f766e] border-[#99f6e4]",
  service_updated: "bg-[#ccfbf1] text-[#0f766e] border-[#99f6e4]",
  service_deleted: "bg-red-100 text-red-700 border-red-200",
  assessment_type_created: "bg-[#ccfbf1] text-[#0f766e] border-[#99f6e4]",
  assessment_type_updated: "bg-[#ccfbf1] text-[#0f766e] border-[#99f6e4]",
  assessment_type_deleted: "bg-red-100 text-red-700 border-red-200",
  account_created: "bg-indigo-100 text-indigo-700 border-indigo-200",
  account_updated: "bg-indigo-100 text-indigo-700 border-indigo-200",
  account_status_changed: "bg-amber-100 text-amber-800 border-amber-200",
  account_deleted: "bg-red-100 text-red-700 border-red-200",
};

const CATEGORIES = [
  { id: "all", label: "All Categories" },
  { id: "appointment", label: "Appointments" },
  { id: "payment", label: "Payments" },
  { id: "schedule", label: "Schedules" },
  { id: "service", label: "Services & Assessments" },
  { id: "account", label: "Accounts" },
];

const ROLES = [
  { id: "ALL", label: "All Roles" },
  { id: "ADMIN", label: "Admins" },
  { id: "AFFILIATE", label: "Affiliates" },
  { id: "CLIENT", label: "Clients" },
  { id: "SYSTEM", label: "System" },
];

const TIME_RANGES = [
  { id: "all", label: "All Time" },
  { id: "today", label: "Today" },
  { id: "this_week", label: "This Week" },
  { id: "this_month", label: "This Month" },
];

function formatTimeAgo(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFullDateTime(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function AdminActivityLogs() {
  const [navOpen, setNavOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Detail Modal
  const [activeLog, setActiveLog] = useState(null);

  const fetchLogs = async (targetPage = 1) => {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams({
        page: targetPage,
        per_page: 10,
      });
      if (search.trim()) q.set("q", search.trim());
      if (roleFilter !== "ALL") q.set("role", roleFilter);
      if (categoryFilter !== "all") q.set("category", categoryFilter);
      if (timeFilter !== "all") q.set("time_range", timeFilter);

      const res = await apiFetch(`/admin/activity-logs?${q.toString()}`);
      setLogs(res.logs || []);
      setStats(res.stats || null);
      setMeta(res.meta || { current_page: 1, last_page: 1, total: 0 });
      setPage(targetPage);
    } catch (err) {
      setError(err.message || "Failed to load activity logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, categoryFilter, timeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setRoleFilter("ALL");
    setCategoryFilter("all");
    setTimeFilter("all");
  };

  return (
    <>
      <style>{FONT_CSS}</style>
      <div className="flex min-h-screen bg-[#f2f2f2]">
        {/* Navigation Sidebar */}
        <AdminNavigation open={navOpen} onClose={() => setNavOpen(false)} />

        {/* Main Content */}
        <div className="flex-1 p-[24px] lg:p-[40px] max-w-full overflow-x-hidden">
          {/* Top Header */}
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <button
                type="button"
                onClick={() => setNavOpen(true)}
                aria-label="Open menu"
                className="mb-[12px] flex h-[37px] w-[46px] items-center justify-center rounded-[8px] border border-[#c7b6b6] bg-white lg:hidden"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2a8570"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              </button>
              <div className={`${inter} text-[13px] font-bold tracking-[3.5px] uppercase text-[#4a9b8e]`}>
                Audit Trail &amp; Monitoring
              </div>
              <h1 className={`${serif} mt-[6px] text-[34px] sm:text-[40px] font-bold leading-[1.15] text-[#2f4a42]`}>
                Activity Logs
              </h1>
              <p className={`${serif} mt-1 text-[14px] text-[#666] max-w-2xl`}>
                Complete history of actions across the clinic: admin decisions, affiliate appointments, client payments,
                reschedules, and cancellations.
              </p>
            </div>

            <div className="flex items-center gap-[14px]">
              <div className="hidden sm:flex h-[34px] items-center justify-center rounded-[6px] border border-[#4a9b8e] bg-[#e3f2ee] px-3.5">
                <span className={`${inter} text-[12px] font-bold text-[#2a8570]`}>
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <button
                type="button"
                onClick={() => fetchLogs(page)}
                disabled={loading}
                title="Refresh logs"
                className="flex h-[37px] w-[46px] items-center justify-center rounded-[8px] border border-[#c7b6b6] bg-white hover:bg-[#fbfbfb] transition"
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2a8570"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={loading ? "animate-spin" : ""}
                >
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-1.19" />
                </svg>
              </button>
              <ProfileMenu size={37} />
            </div>
          </header>

          {/* Metrics Counter Cards */}
          {stats ? (
            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: "Total Logs", value: stats.total_activities, color: "text-[#2f4a42]" },
                { label: "Admin Actions", value: stats.admin_actions, color: "text-[#1f4d3f]" },
                { label: "Affiliate Events", value: stats.affiliate_actions, color: "text-[#6d28d9]" },
                { label: "Client Activities", value: stats.client_actions, color: "text-[#0369a1]" },
                { label: "Payment Events", value: stats.payment_events, color: "text-[#15803d]" },
                { label: "Resched & Cancels", value: stats.reschedule_cancel, color: "text-[#b45309]" },
              ].map((c) => (
                <div
                  key={c.label}
                  className="rounded-[12px] border border-[#d8cfca] bg-white p-3.5 shadow-sm transition hover:shadow"
                >
                  <div className={`${inter} text-[11px] font-semibold text-[#777] uppercase tracking-wider`}>
                    {c.label}
                  </div>
                  <div className={`${serif} mt-1 text-[24px] font-bold ${c.color}`}>{c.value ?? 0}</div>
                </div>
              ))}
            </div>
          ) : loading ? (
            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-busy="true">
              {[0, 1, 2, 3, 4, 5].map((card) => (
                <div key={card} className="rounded-[12px] border border-[#d8cfca] bg-white p-3.5 shadow-sm">
                  <SkeletonBlock className="h-3 w-24 rounded" />
                  <SkeletonBlock className="mt-2 h-7 w-12 rounded" />
                </div>
              ))}
            </div>
          ) : null}

          {/* Filter Toolbar */}
          <div className="mt-6 rounded-[14px] border border-[#d8cfca] bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Search */}
              <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, action, ref code (TF-...), or keyword..."
                  className={`${inter} w-full rounded-[8px] border border-[#c7b6b6] bg-[#faf8f6] py-2 pl-9 pr-3 text-[13px] text-[#202020] placeholder-[#888] outline-none focus:border-[#4a9b8e] focus:bg-white`}
                />
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#888"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </form>

              {/* Dropdowns */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Category select */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className={`${inter} h-[36px] rounded-[8px] border border-[#c7b6b6] bg-white px-3 text-[12px] font-medium text-[#333] outline-none hover:border-[#4a9b8e]`}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>

                {/* Time range select */}
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className={`${inter} h-[36px] rounded-[8px] border border-[#c7b6b6] bg-white px-3 text-[12px] font-medium text-[#333] outline-none hover:border-[#4a9b8e]`}
                >
                  {TIME_RANGES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>

                {(search || roleFilter !== "ALL" || categoryFilter !== "all" || timeFilter !== "all") && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className={`${inter} h-[36px] cursor-pointer rounded-[8px] border border-red-200 bg-red-50 px-3 text-[12px] font-semibold text-red-700 hover:bg-red-100 transition`}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Role Pills */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[#f0eae5] pt-3">
              <span className={`${inter} mr-1 text-[11px] font-bold uppercase tracking-wider text-[#888]`}>
                Filter by Role:
              </span>
              {ROLES.map((r) => {
                const active = roleFilter === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRoleFilter(r.id)}
                    className={`${inter} cursor-pointer rounded-full px-3 py-1 text-[11px] font-bold transition ${
                      active
                        ? "bg-[#2a8570] text-white shadow-sm"
                        : "bg-[#f3ede8] text-[#555] hover:bg-[#e7dfd9]"
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-5 rounded-[10px] border border-red-200 bg-red-50 p-4 text-[13px] text-red-800">
              {error}
            </div>
          )}

          {/* Logs List */}
          <div className="mt-6">
            {loading ? (
              <div className="space-y-3" aria-busy="true">
                {[0, 1, 2, 3].map((row) => (
                  <div key={row} className="flex flex-col gap-3 rounded-[12px] border border-[#d8cfca] bg-white p-4 md:flex-row md:items-center">
                    <SkeletonBlock className="size-9 shrink-0 rounded-full" />
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-2">
                        <SkeletonBlock className="h-4 w-32 rounded" />
                        <SkeletonBlock className="h-5 w-16 rounded-full" />
                        <SkeletonBlock className="h-5 w-28 rounded-full" />
                      </div>
                      <SkeletonBlock className="mt-3 h-3 w-3/4 max-w-full rounded" />
                      <SkeletonBlock className="mt-2 h-3 w-1/2 max-w-full rounded" />
                    </div>
                    <SkeletonBlock className="h-3 w-24 rounded" />
                  </div>
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-[#c7b6b6] bg-white p-12 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-[#f3ede8] text-[#2a8570]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <h3 className={`${serif} mt-3 text-[18px] font-bold text-[#202020]`}>No activities found</h3>
                <p className={`${serif} mt-1 text-[13px] text-[#777] max-w-sm`}>
                  No log entries matched your current filter or search criteria.
                </p>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className={`${inter} mt-4 rounded-[6px] bg-[#2a8570] px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-[#236e5d] transition`}
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => {
                  const roleConfig = ROLE_BADGES[log.actor_role] || ROLE_BADGES.SYSTEM;
                  const actionStyle =
                    ACTION_COLORS[log.action] || "bg-[#f3f4f6] text-[#374151] border-[#e5e7eb]";

                  return (
                    <div
                      key={log.id}
                      className="group flex flex-col justify-between gap-3 rounded-[12px] border border-[#d8cfca] bg-white p-4 transition hover:border-[#4a9b8e] hover:shadow-md md:flex-row md:items-center"
                    >
                      {/* Left: Role Badge & Information */}
                      <div className="flex items-start gap-3.5">
                        {/* Role Indicator Circle */}
                        <div
                          className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border text-[13px] font-bold ${roleConfig.bg}`}
                          title={`Role: ${roleConfig.label}`}
                        >
                          {log.actor_name ? log.actor_name.charAt(0).toUpperCase() : "A"}
                        </div>

                        <div>
                          {/* Top Row: Actor Name, Role Badge, Action Tag */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`${serif} text-[15px] font-bold text-[#202020]`}>
                              {log.actor_name || "Unknown"}
                            </span>

                            <span
                              className={`${inter} inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${roleConfig.bg}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${roleConfig.dot}`} />
                              {roleConfig.label}
                            </span>

                            <span
                              className={`${inter} inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${actionStyle}`}
                            >
                              {log.title}
                            </span>

                            {log.reference && (
                              <span
                                className={`${inter} rounded bg-[#f3ede8] px-2 py-0.5 font-mono text-[11px] font-bold text-[#444]`}
                                title="Appointment Reference"
                              >
                                #{log.reference}
                              </span>
                            )}
                          </div>

                          {/* Description */}
                          <p className={`${serif} mt-1 text-[13px] leading-relaxed text-[#444]`}>
                            {log.description}
                          </p>

                          {/* Optional Metadata Tag Pills */}
                          {log.metadata && (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {log.metadata.service_name && (
                                <span className={`${inter} rounded-md bg-[#f6f6f6] px-2 py-0.5 text-[11px] text-[#555]`}>
                                  Service: <strong className="text-[#202020]">{log.metadata.service_name}</strong>
                                </span>
                              )}
                              {log.metadata.amount != null && (
                                <span className={`${inter} rounded-md bg-[#e3f2ee] px-2 py-0.5 text-[11px] font-bold text-[#1f4d3f]`}>
                                  {peso(log.metadata.amount)}
                                </span>
                              )}
                              {log.metadata.assigned_to && (
                                <span className={`${inter} rounded-md bg-[#faf5ff] px-2 py-0.5 text-[11px] text-[#6b21a8]`}>
                                  Assigned: <strong>{log.metadata.assigned_to}</strong>
                                </span>
                              )}
                              {log.metadata.reason && (
                                <span className={`${inter} rounded-md bg-rose-50 px-2 py-0.5 text-[11px] text-rose-700`}>
                                  Reason: "{log.metadata.reason}"
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Timestamp & Action */}
                      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#f0eae5] pt-2 md:flex-col md:items-end md:border-0 md:pt-0">
                        <div className="text-right">
                          <div className={`${inter} text-[11px] font-bold text-[#2a8570]`}>
                            {formatTimeAgo(log.created_at)}
                          </div>
                          <div className={`${inter} mt-0.5 text-[10px] text-[#888]`}>
                            {formatFullDateTime(log.created_at)}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveLog(log)}
                          className={`${serif} cursor-pointer rounded-[6px] border border-[#c7b6b6] bg-white px-2.5 py-1 text-[11px] text-[#2f4a42] hover:bg-[#e3f2ee] hover:border-[#2a8570] transition`}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {meta.last_page > 1 && (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#d8cfca] pt-4">
              <span className={`${inter} text-[12px] text-[#666]`}>
                Showing page <strong>{meta.current_page}</strong> of <strong>{meta.last_page}</strong> (
                {meta.total} total logs)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => fetchLogs(page - 1)}
                  className={`${inter} cursor-pointer rounded-[6px] border border-[#c7b6b6] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#2f4a42] hover:bg-[#e3f2ee] disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  Previous
                </button>

                <button
                  type="button"
                  disabled={page >= meta.last_page || loading}
                  onClick={() => fetchLogs(page + 1)}
                  className={`${inter} cursor-pointer rounded-[6px] border border-[#c7b6b6] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#2f4a42] hover:bg-[#e3f2ee] disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {activeLog && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-black/10 pb-4">
              <div>
                <span
                  className={`${inter} inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    ROLE_BADGES[activeLog.actor_role]?.bg || "bg-gray-100 text-gray-700"
                  }`}
                >
                  {activeLog.actor_role} Action
                </span>
                <h3 className={`${serif} m-0 mt-1.5 text-[20px] font-bold text-[#202020]`}>
                  {activeLog.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveLog(null)}
                className="grid h-8 w-8 place-items-center rounded-full text-[#888] hover:bg-[#f0f0f0] hover:text-[#202020]"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className={`${inter} text-[11px] font-bold uppercase tracking-wider text-[#888]`}>
                  Actor
                </label>
                <div className={`${serif} text-[15px] font-semibold text-[#202020]`}>
                  {activeLog.actor_name}
                  <span className={`${inter} ml-2 text-[12px] text-[#666]`}>
                    {activeLog.actor_role}
                  </span>
                </div>
              </div>

              <div>
                <label className={`${inter} text-[11px] font-bold uppercase tracking-wider text-[#888]`}>
                  Description
                </label>
                <p className={`${serif} m-0 text-[14px] leading-relaxed text-[#333]`}>
                  {activeLog.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-xl bg-[#faf7f5] p-3 text-sm">
                <div>
                  <span className={`${inter} block text-[10px] uppercase font-bold text-[#888]`}>Category</span>
                  <span className={`${inter} font-semibold capitalize text-[#202020]`}>
                    {activeLog.category}
                  </span>
                </div>
                <div>
                  <span className={`${inter} block text-[10px] uppercase font-bold text-[#888]`}>Reference</span>
                  <span className={`${inter} font-mono font-bold text-[#2a8570]`}>
                    {activeLog.reference ? `#${activeLog.reference}` : "N/A"}
                  </span>
                </div>
                <div>
                  <span className={`${inter} block text-[10px] uppercase font-bold text-[#888]`}>Date &amp; Time</span>
                  <span className={`${inter} text-[12px] text-[#333]`}>
                    {formatFullDateTime(activeLog.created_at)}
                  </span>
                </div>
              </div>

            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveLog(null)}
                className={`${serif} cursor-pointer rounded-[8px] bg-[#2a8570] px-5 py-2 text-[13px] font-bold text-white hover:bg-[#236e5d] transition`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

