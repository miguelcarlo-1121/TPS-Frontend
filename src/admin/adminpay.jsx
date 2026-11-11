import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminNavigation from "./adminnavigation";
import ProfileMenu from "../components/ProfileMenu";
import { apiFetch } from "../auth";
import { peso } from "../components/payUtils";
import {
  PaymentRow as SharedPaymentRow,
  ReceiptModal as SharedReceiptModal,
} from "../components/PaymentParts";
const FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Inknut+Antiqua:wght@600&family=Inria+Serif:wght@400;700&family=Inter:wght@400;600;700&display=swap');`;

const inter = "font-['Inter',Helvetica,sans-serif]";
const serif = "font-['Inria_Serif',Georgia,serif]";

const API_BASE = "/admin";

/* ---------- Icons (inline SVG) ----------- */
function Icon({ className = "", children }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const Search = (p) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </Icon>
);
const Bell = (p) => (
  <Icon {...p}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </Icon>
);
const Calendar = (p) => (
  <Icon {...p}>
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
  </Icon>
);
const PAYMENTS_PER_PAGE = 10;

/* ---------- Page ---------- */
export default function PaymentDashboard() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);

  const load = () => {
    apiFetch(`${API_BASE}/payments`)
      .then((d) => {
        setPayments(d.payments || []);
        setStats(d.stats || null);
        setError("");
      })
      .catch((err) => setError(err.message || "Could not load payments."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return payments.filter(
      (p) =>
        !q ||
        (p.client_name || "").toLowerCase().includes(q) ||
        (p.reference || "").toLowerCase().includes(q)
    );
  }, [payments, searchTerm]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAYMENTS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filtered.slice(
    (currentPage - 1) * PAYMENTS_PER_PAGE,
    currentPage * PAYMENTS_PER_PAGE
  );

  const groups = useMemo(() => {
    const today = new Date().toDateString();
    const yest = new Date(Date.now() - 86400000).toDateString();
    const map = new Map();
    pageItems.forEach((p) => {
      const d = new Date(p.created_at);
      const key = d.toDateString();
      const label =
        key === today
          ? "TODAY"
          : key === yest
            ? "YESTERDAY"
            : d
              .toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
              .toUpperCase();
      if (!map.has(key)) map.set(key, { label, items: [] });
      map.get(key).items.push(p);
    });
    return [...map.values()];
  }, [pageItems]);

  const onUpdated = (np) => {
    setPayments((list) => list.map((p) => (p.id === np.id ? np : p)));
    setOpen(np);
    load();
  };

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex min-h-screen w-full bg-[#f2f2f2] antialiased">
      <style>{FONT_CSS}</style>

      <AdminNavigation />

      <main className="flex-1 overflow-y-auto px-[41px] pb-[60px] pt-[51px]">
        {/* Header */}
        <header className="flex items-start justify-between">
          <div>
            <div className={`${inter} text-[20px] font-bold tracking-[4.2px] text-[#4a9b8e]`}>PAYMENT</div>
            <h1 className={`${serif} mt-[8px] text-[40px] font-bold leading-[1.15] text-[#2f4a42]`}>
              receipts &amp; payments.
            </h1>
            <p className={`${serif} mt-[8px] max-w-xl text-[13px] text-[#666]`}>
              See everyone who paid a downpayment or the full amount, open the receipt they uploaded, and set where clients should send their money.
            </p>
          </div>

          <div className="flex items-center gap-[17px]">
            <div className="flex h-[30px] min-w-[170px] items-center justify-center gap-[8px] rounded-[6px] border border-[#4a9b8e] bg-[#e3f2ee] px-3">
              <Calendar className="h-[14px] w-[14px] text-[#2a8570]" />
              <span className={`${inter} text-[12px] font-bold text-[#2a8570]`}>{todayLabel}</span>
            </div>
            <button
              aria-label="Notifications"
              className="relative flex h-[37px] w-[46px] items-center justify-center rounded-[8px] border border-[#c7b6b6] bg-white"
            >
              <Bell className="h-[18px] w-[18px] text-[#2a8570]" />
              {(stats?.to_verify ?? 0) > 0 && (
                <span className="absolute right-[10px] top-[8px] h-[7px] w-[7px] rounded-full bg-[#e07b6a]" />
              )}
            </button>
            <ProfileMenu size={37} />
          </div>
        </header>

        {/* Stat cards */}
        <section className="mt-[34px] grid grid-cols-1 gap-[29px] md:grid-cols-2 lg:grid-cols-4">
          <StatCard variant="dark" title="VERIFIED PAYMENTS" value={peso(stats?.verified_total)} subtitle="Total verified" />
          <StatCard variant="warn" title="RECEIPTS TO VERIFY" value={stats?.to_verify ?? 0} subtitle="Waiting for review" />
          <StatCard title="BALANCE DUE" value={peso(stats?.balance_due)} subtitle="Balance due from downpayments" />
          <StatCard
            title="PAYMENT SUMMARY"
            value={`${stats?.full_count ?? 0} / ${stats?.down_count ?? 0}`}
            subtitle="Full payments / downpayments"
          />
        </section>

        {/* Tabs & search */}
        <div className="mb-[24px] mt-[41px] flex flex-wrap items-center justify-between gap-4">
          <div className="flex h-[28px] items-center gap-[3px] rounded-[11px] bg-[#4a9b8e30] p-[3px]">
            <button
              type="button"
              className={`${serif} h-[22px] rounded-[9px] bg-white px-[14px] text-[11px] text-[#202020]`}
            >
              Payments Receive
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/payment-method")}
              className={`${serif} h-[22px] cursor-pointer rounded-[9px] border-0 bg-transparent px-[14px] text-[11px] text-[#202020]`}
            >
              Payment methods
            </button>
          </div>

          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666]" />
            <input
              type="text"
              placeholder="Search client or reference"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className={`${serif} w-full rounded-[10px] border border-[#c7b6b6] bg-white py-2 pl-9 pr-4 text-[13px] text-black focus:outline-none focus:ring-2 focus:ring-[#4a9b8e]`}
            />
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        )}
        {loading && <p className={`${serif} text-sm text-[#666]`}>Loading payments…</p>}
        {!loading && !error && groups.length === 0 && (
          <p className={`${serif} text-sm text-[#666]`}>No payments yet.</p>
        )}

        {groups.map((g) => (
          <Group key={g.label} label={g.label} items={g.items} onOpen={setOpen} />
        ))}
        {!loading && !error && filtered.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#d8dedb] py-4">
            <p className={`${serif} m-0 text-[12px] text-[#666]`}>
              Showing {(currentPage - 1) * PAYMENTS_PER_PAGE + 1}–{Math.min(currentPage * PAYMENTS_PER_PAGE, filtered.length)} of {filtered.length} payments
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={currentPage === 1}
                className={`${serif} rounded-[6px] border border-[#c7b6b6] bg-white px-3 py-1.5 text-[12px] text-[#202020] disabled:cursor-not-allowed disabled:opacity-45`}
              >
                Previous
              </button>
              <span className={`${inter} text-[11px] text-[#666]`}>Page {currentPage} of {pageCount}</span>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                disabled={currentPage === pageCount}
                className={`${serif} rounded-[6px] border border-[#c7b6b6] bg-white px-3 py-1.5 text-[12px] text-[#202020] disabled:cursor-not-allowed disabled:opacity-45`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>

      {open && (
        <SharedReceiptModal p={open} base={API_BASE} onClose={() => setOpen(null)} onUpdated={onUpdated} />
      )}
    </div>
  );
}

function Group({ label, items, onOpen }) {
  return (
    <section className="mb-[32px]">
      <div className="mb-4 flex items-center gap-4">
        <h3 className={`${inter} text-[12px] font-bold tracking-[2.5px] text-[#4a9b8e]`}>{label}</h3>
        <div className="h-px flex-1 bg-[#c7b6b6]" />
      </div>
      <div className="space-y-[14px]">
        {items.map((item) => (
          <SharedPaymentRow key={item.id} data={item} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

function StatCard({ title, value, subtitle, variant = "light" }) {
  const base =
    "h-[140px] overflow-hidden border px-[23px] py-[22px] rounded-tl-[18px] rounded-tr-[7px] rounded-br-[18px] rounded-bl-[7px]";
  const styles = {
    dark: "bg-[#1f4d3f] border-[#c7b6b6]",
    warn: "bg-gradient-to-b from-[#fdf1bc] to-[#fffbdd] from-0% to-25% border-[#2020203d]",
    light: "bg-white border-[#2020203d]",
  };
  const label = variant === "dark" ? "text-[#a8c8b8]" : "text-[#666]";
  const num = variant === "dark" ? "text-white" : "text-[#202020]";
  const sub = variant === "dark" ? "text-[#a8c8b8]" : "text-[#666]";

  return (
    <div className={`${base} ${styles[variant]}`}>
      <div className={`${inter} text-[11px] font-bold ${label}`}>{title}</div>
      <div className={`${inter} mt-[14px] text-[32px] font-bold leading-none ${num}`}>{value}</div>
      <p className={`${inter} mt-[12px] text-[11px] font-bold ${sub}`}>{subtitle}</p>
    </div>
  );
}
