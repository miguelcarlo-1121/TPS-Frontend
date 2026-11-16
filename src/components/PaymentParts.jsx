import React, { useState } from "react";
import { apiFetch } from "../auth";
import { peso, to12 } from "./payUtils";



const inter = "font-['Inter',Helvetica,sans-serif]";
const serif = "font-['Inria_Serif',Georgia,serif]";

/* ---------- Icons ---------- */
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
const CheckCircle = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </Icon>
);
const AlertCircle = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </Icon>
);

const statusBadge = {
  to_verify: ["To verify", "bg-[#fdf1bc] text-[#7a5400]"],
  verified: ["Verified", "bg-[#e3f2ee] text-[#2a8570]"],
  rejected: ["Rejected", "bg-red-100 text-red-700"],
};

const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/* ---------- Row ---------- */
export function PaymentRow({ data, onOpen }) {
  const created = new Date(data.created_at);
  const bp = data.balance_payment;
  const balanceToVerify = bp?.status === "to_verify";
  const balanceRejected = bp?.status === "rejected";
  const balancePaid = !!data.balance_paid;
  const isDownpayment = data.payment_type === "down";
  const isPending = data.status === "to_verify" || balanceToVerify;

  const [statusText, statusCls] = balanceToVerify
    ? ["Balance to verify", statusBadge.to_verify[1]]
    : statusBadge[data.status] || statusBadge.to_verify;

  const sched = `${new Date(data.date + "T00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}, ${to12(data.start_time)}`;

  const actionLabel = balanceToVerify ? "Review balance" : isPending ? "Review receipt" : "View receipt";

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-[10px] border border-[#c7b6b6] bg-white p-4 transition hover:shadow-md md:flex-nowrap">
      {/* Date badge */}
      <div className="min-w-[90px] rounded-[8px] bg-[#e3f2ee] p-3 text-center">
        <div className={`${serif} text-2xl font-bold leading-none text-[#2f4a42]`}>{created.getDate()}</div>
        <div className={`${serif} text-xs text-[#2a8570]`}>
          {created.toLocaleDateString("en-US", { month: "short" })}
        </div>
        <div className={`${serif} mt-1 text-[10px] text-[#666]`}>
          {created.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </div>
      </div>

      {/* Client */}
      <div className="min-w-[200px] flex-1">
        <h4 className={`${serif} text-[16px] font-bold text-black`}>{data.client_name || "Client"}</h4>
        <p className={`${serif} text-[12px] text-[#666]`}>
          {data.service_name} · {sched}
        </p>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`${inter} rounded-full px-3 py-1 text-[11px] font-bold ${isDownpayment ? "bg-[#fdf1bc] text-[#7a5400]" : "bg-[#e3f2ee] text-[#2a8570]"
            }`}
        >
          {isDownpayment ? "Downpayment" : "Full payment"}
        </span>
        {balancePaid && (
          <span
            className={`${inter} inline-flex items-center gap-1 rounded-full bg-[#1f4d3f] px-3 py-1 text-[11px] font-bold text-white`}
            title="The client paid the remaining balance"
          >
            <CheckCircle className="h-3 w-3" />
            Balance paid
          </span>
        )}
        {balanceToVerify && (
          <span className={`${inter} rounded-full bg-[#fdf1bc] px-3 py-1 text-[11px] font-bold text-[#7a5400]`}>
            Balance sent
          </span>
        )}
        {balanceRejected && isDownpayment && (
          <span className={`${inter} rounded-full bg-red-100 px-3 py-1 text-[11px] font-bold text-red-700`}>
            Balance rejected
          </span>
        )}
        <span className={`${inter} rounded-full bg-[#f2f2f2] px-3 py-1 text-[11px] font-bold text-[#202020]`}>
          {data.method}
        </span>
      </div>

      {/* Amount */}
      <div className="min-w-[110px] text-right">
        <div className={`${inter} text-[16px] font-bold text-[#202020]`}>{peso(data.amount_paid)}</div>
        <div className={`${serif} text-[11px] text-[#666]`}>
          {balancePaid
            ? `Incl. ${peso(bp.amount)} balance`
            : isDownpayment
              ? `Balance ${peso(data.balance)}`
              : "Paid in full"}
        </div>
      </div>

      {/* Status & action */}
      <div className="flex items-center gap-3">
        <span className={`${inter} flex items-center gap-1 rounded px-2 py-1 text-[11px] font-bold ${statusCls}`}>
          {isPending ? (
            <AlertCircle className="h-3.5 w-3.5" />
          ) : data.status === "verified" ? (
            <CheckCircle className="h-3.5 w-3.5" />
          ) : null}
          {statusText}
        </span>

        <button
          type="button"
          onClick={() => onOpen(data)}
          className={`${serif} cursor-pointer rounded-[6px] px-4 py-1.5 text-[12px] transition ${isPending
            ? "border-0 bg-[#11a086] text-white hover:bg-[#0e8c75]"
            : "border border-[#c7b6b6] bg-white text-[#2f4a42] hover:bg-[#e3f2ee]"
            }`}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

/* ---------- Modal ---------- */
const QUICK_REPLIES = [
  ["Wrong amount", "The amount in your proof of payment does not match the amount due."],
  ["Blurry receipt", "Your receipt is blurry or cut off. Please upload a clear, full screenshot."],
  ["Not received", "We could not find this payment in our account yet. Please check and send it again."],
  ["Wrong method", "The receipt shows a different payment method than the one you selected."],
  ["Duplicate receipt", "This proof of payment has already been used in a previous booking. Please upload a new, unique screenshot."],
];

const BALANCE_REPLIES = [
  ["Wrong amount", "The amount in your receipt does not match your remaining balance."],
  ["Account name mismatch", "The account name you entered does not match your proof of payment."],
  ["Blurry receipt", "Your receipt is blurry or cut off. Please upload a clear, full screenshot."],
  ["Not received", "We could not find this payment in our account yet. Please check and send it again."],
];

export function ReceiptModal({ p, base, onClose, onUpdated }) {
  const bp = p.balance_payment;
  const [view, setView] = useState(bp ? "balance" : "down");
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const onBalance = view === "balance" && !!bp;
  const status = onBalance ? bp.status : p.status;
  const reviewable = status === "to_verify";
  const replies = onBalance ? BALANCE_REPLIES : QUICK_REPLIES;
  const receiptUrl = onBalance ? bp.receipt_url : p.receipt_url;
  const rejectNote = onBalance ? bp.reject_reason : p.reject_reason;

  const switchView = (v) => {
    setView(v);
    setRejecting(false);
    setReason("");
    setError("");
  };

  const act = async (kind) => {
    setBusy(true);
    setError("");
    try {
      const path = onBalance
        ? `${base}/payments/${p.id}/balance/${kind}`
        : `${base}/payments/${p.id}/${kind}`;
      const d = await apiFetch(path, {
        method: "POST",
        body: JSON.stringify(kind === "reject" ? { reason: reason.trim() } : {}),
      });
      onUpdated(d.payment);
      setRejecting(false);
      setReason("");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const schedule = `${new Date(p.date + "T00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })} · ${to12(p.start_time)} - ${to12(p.end_time)}`;

  const downRows = [
    ["Reference", p.reference],
    ["Client", p.client_name],
    ["Email", p.client_email],
    ["Mobile", p.client_mobile],
    ["Service", p.service_name],
    ["Schedule", schedule],
    ["Method", p.method],
    ["Sender number", p.wallet_number || "See receipt image"],
    ["Reference no.", p.reference_number || "See receipt image"],
    ["Session fee", peso(p.total_amount)],
    [p.balance_paid ? "Downpayment" : "Amount paid", peso(p.downpayment_amount ?? p.amount_paid)],
    ["Balance", p.balance_paid ? "Paid" : peso(p.balance)],
  ];

  const balanceRows = bp
    ? [
      ["Reference", p.reference],
      ["Client", p.client_name],
      ["Service", p.service_name],
      ["Schedule", schedule],
      ["Balance amount", peso(bp.amount)],
      ["Method", bp.method],
      ["Account name", bp.account_name],
      ["Sent on", fmtDateTime(bp.created_at)],
      ["Status", (statusBadge[bp.status] || statusBadge.to_verify)[0]],
    ]
    : [];

  const rows = onBalance ? balanceRows : downRows;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
        {/* Balance paid indicator */}
        {p.balance_paid && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-[#e3f2ee] px-3 py-2 text-sm text-[#1f4d3f]">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>
              The client paid the remaining balance
              {bp?.reviewed_at ? ` (verified ${fmtDateTime(bp.reviewed_at)})` : ""}. This is now a full payment.
            </span>
          </div>
        )}

        {/* Tabs: lalabas lang kapag may balance receipt */}
        {bp && (
          <div className="mb-4 inline-flex gap-[3px] rounded-[11px] bg-[#4a9b8e30] p-[3px]">
            {[
              ["down", p.balance_paid || p.payment_type === "full" ? "First payment" : "Downpayment"],
              ["balance", "Balance payment"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => switchView(id)}
                className={`${serif} h-[26px] cursor-pointer rounded-[9px] border-0 px-[14px] text-[12px] text-[#202020] ${view === id ? "bg-white font-bold" : "bg-transparent"
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-5 max-[720px]:grid-cols-1">
          <div>
            <h3 className={`${serif} m-0 mb-3 text-xl text-[#202020]`}>
              {onBalance ? "Balance receipt" : "Proof of payment"}
            </h3>
            <a href={receiptUrl} target="_blank" rel="noreferrer">
              <img
                src={receiptUrl}
                alt="Receipt"
                className="max-h-[460px] w-full rounded-lg border border-black/10 object-contain"
              />
            </a>
            <p className={`${serif} mt-2 text-[11px] text-[#666]`}>Click the image to open it full size.</p>
          </div>

          <div>
            <h3 className={`${serif} m-0 mb-3 text-xl text-[#202020]`}>Details</h3>
            <dl className="m-0 grid gap-2 text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="m-0 text-[#666]">{k}</dt>
                  <dd className="m-0 break-all text-right font-medium text-[#202020]">{v || "—"}</dd>
                </div>
              ))}
            </dl>

            {status === "rejected" && rejectNote && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                Message sent to client: {rejectNote}
              </p>
            )}

            {error && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            )}

            {rejecting && (
              <div className="mt-4">
                <p className={`${inter} m-0 mb-2 text-[11px] font-bold tracking-[1.5px] text-[#666]`}>
                  MESSAGE TO CLIENT
                </p>
                <div className="flex flex-wrap gap-2">
                  {replies.map(([label, text]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setReason(text)}
                      className={`${serif} cursor-pointer rounded-full border px-3 py-1 text-[12px] transition ${reason === text
                        ? "border-[#11a086] bg-[#e3f2ee] text-[#1f6b55]"
                        : "border-[#c7b6b6] bg-white text-[#202020] hover:bg-[#f2f2f2]"
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  maxLength={255}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Tap a quick reply above, or write your own message…"
                  className={`${serif} mt-3 w-full resize-none rounded-md border border-black/20 p-2 text-sm`}
                />
                <p className={`${serif} m-0 mt-1 text-right text-[11px] text-[#888]`}>{reason.length}/255</p>
                <p className={`${serif} m-0 mt-1 text-[11px] text-[#666]`}>
                  {onBalance
                    ? "The client will see this message and can send a new balance receipt."
                    : "The client will see this message on their appointment status page and will be asked to go back to payment."}
                </p>
              </div>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={rejecting ? () => { setRejecting(false); setReason(""); setError(""); } : onClose}
                className={`${serif} cursor-pointer rounded-md border border-[#c7b6b6] bg-white px-4 py-2 text-sm`}
              >
                {rejecting ? "Cancel" : "Close"}
              </button>
              {reviewable && !rejecting && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setRejecting(true)}
                  className={`${serif} cursor-pointer rounded-md border border-red-300 bg-white px-4 py-2 text-sm text-red-700 disabled:opacity-60`}
                >
                  Reject
                </button>
              )}
              {reviewable && rejecting && (
                <button
                  type="button"
                  disabled={busy || reason.trim().length < 3}
                  onClick={() => act("reject")}
                  className={`${serif} cursor-pointer rounded-md border-0 bg-red-600 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {busy ? "Please wait…" : "Send message & reject"}
                </button>
              )}
              {reviewable && !rejecting && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => act("verify")}
                  className={`${serif} cursor-pointer rounded-md border-0 bg-[#11a086] px-4 py-2 text-sm text-white hover:bg-[#0e8c75] disabled:opacity-60`}
                >
                  {busy ? "Please wait…" : onBalance ? "Verify balance" : "Verify payment"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}