import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Navbar, Footer, Reveal, container, btnSolid, btnGhost } from "../components/Layout";
import { apiFetch } from "../auth";
import { peso, to12, resizeToJpeg } from "../components/payUtils";
import SkeletonBlock from "../components/SkeletonBlock";

/* Route: <Route path="/appointments/balance/:id" element={<PayBalance />} /> */

const longDate = (iso) =>
  new Date(`${iso}T00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

function Panel({ tone = "info", title, children, action }) {
  const tones = {
    info: "border-[#b6d2c4] bg-[#f9fcfb] text-[#3d5c52]",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
    ok: "border-[#9ac5be] bg-[#ebfef6] text-[#28473a]",
  };
  return (
    <div className={`rounded-2xl border px-6 py-10 text-center ${tones[tone]}`}>
      <h2 className="m-0 font-serif text-2xl">{title}</h2>
      <p className="mx-auto mb-0 mt-3 max-w-md text-sm leading-relaxed">{children}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export default function PayBalance() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [methodId, setMethodId] = useState(null);
  const [accountName, setAccountName] = useState("");
  const [receipt, setReceipt] = useState(null); // data URL (JPEG)
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiFetch(`/booking/balance/${id}`)
      .then((d) => {
        setData(d);
        setMethodId(d.methods?.[0]?.id ?? null);
      })
      .catch((err) => {
        if (err.message?.includes("session expired")) return navigate("/signin");
        setLoadError(err.message || "Could not load this balance.");
      });
  }, [id, navigate]);

  const pickReceipt = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setError("");
    try {
      setReceipt(await resizeToJpeg(f, 1400, 0.85));
      setFileName(f.name);
    } catch (err) {
      setError(err.message || "That image could not be used.");
    }
  };

  const submit = async () => {
    setError("");
    if (!methodId) return setError("Choose where you sent the payment.");
    if (accountName.trim().length < 2) return setError("Enter the account name you paid from.");
    if (!receipt) return setError("Upload a screenshot of your receipt.");

    setBusy(true);
    try {
      await apiFetch(`/booking/balance/${id}`, {
        method: "POST",
        body: JSON.stringify({
          method_id: methodId,
          account_name: accountName.trim(),
          receipt,
        }),
      });
      setSent(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      if (err.message?.includes("session expired")) return navigate("/signin");
      setError(err.message || "Could not send your receipt. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const a = data?.appointment;
  const method = data?.methods?.find((m) => m.id === methodId);
  const back = (
    <Link to="/appointments" className={`${btnSolid} no-underline`}>
      Back to my appointments
    </Link>
  );

  let body = null;
  if (loadError) {
    body = (
      <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {loadError}
      </p>
    );
  } else if (!data) {
    body = (
      <div className="grid gap-5 rounded-2xl border border-[#b6d2c4] bg-[#f9fcfb] px-6 py-10" role="status" aria-label="Loading balance">
        <span className="sr-only">Loading your balance…</span>
        <SkeletonBlock className="mx-auto h-6 w-48 rounded" />
        <SkeletonBlock className="mx-auto h-3 w-full max-w-md rounded" />
        <SkeletonBlock className="mx-auto h-11 w-40 rounded-lg" />
      </div>
    );
  } else if (sent) {
    body = (
      <Panel tone="ok" title="Receipt sent" action={back}>
        We received your proof of payment for {peso(a.balance)}. Once the clinic verifies it, your appointment will be
        marked as paid in full.
      </Panel>
    );
  } else if (data.state === "paid") {
    body = (
      <Panel tone="ok" title="Nothing left to pay" action={back}>
        This appointment is already paid in full. Thank you!
      </Panel>
    );
  } else if (data.state === "pending") {
    body = (
      <Panel tone="info" title="Your balance receipt is under review" action={back}>
        We are checking your payment of {peso(a.balance)}. You do not need to send anything else. We will update your
        appointment once it is verified.
      </Panel>
    );
  } else if (data.state === "unavailable") {
    body = (
      <Panel tone="warn" title="Balance is not available yet" action={back}>
        {data.message}
      </Panel>
    );
  }

  if (!id) return <BalanceChooser />;

  return (
    <div className="font-sans text-[#202020]">
      <Navbar />
      <main className="bg-white py-12 pb-24">
        <div className={container}>
          <Reveal>
            <div className="mb-8">
              <Link
                to="/appointments"
                className="text-[0.8rem] text-[#666] no-underline hover:text-black hover:underline"
              >
                ← My appointments
              </Link>
              <p className="m-0 mt-4 text-[13px] font-bold tracking-[0.1em] text-tf-teal">PAY BALANCE</p>
              <h1 className="my-2 font-serif text-[2.2rem] text-[#111]">
                Settle your <em className="italic text-tf-teal">remaining balance.</em>
              </h1>
              <p className="m-0 text-base text-[#666]">
                Send the exact amount below, then upload your receipt so we can verify it.
              </p>
            </div>
          </Reveal>

          {body}

          {data && !body && (
            <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1fr_340px]">
              {/* Left: how to pay */}
              <Reveal delay={60}>
                <div className="flex flex-col gap-8">
                  {/* Step 1 */}
                  <section>
                    <h2 className="mb-4 font-sans text-xs font-bold uppercase tracking-[0.15em] text-tf-teal">
                      1 · Send {peso(a.balance)}
                    </h2>

                    {data.methods.length === 0 ? (
                      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        No payment method is available right now. Please contact the clinic.
                      </p>
                    ) : (
                      <>
                        <div className="mb-4 flex flex-wrap gap-2">
                          {data.methods.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setMethodId(m.id)}
                              aria-pressed={methodId === m.id}
                              className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 font-serif text-[0.9rem] ${methodId === m.id
                                ? "border-[#10a28c] bg-[#ebfef6] font-bold text-[#28473a]"
                                : "border-[#666]/31 bg-white text-[#202020] hover:bg-[#f6faf8]"
                                }`}
                            >
                              <span
                                className="grid h-[24px] w-[26px] place-items-center rounded-md text-[13px] text-white"
                                style={{ background: m.badge || "#4a9b8e" }}
                              >
                                {m.letter || m.name?.[0]}
                              </span>
                              {m.name}
                            </button>
                          ))}
                        </div>

                        {method && (
                          <div className="flex flex-col gap-6 rounded-2xl border border-[#666]/31 bg-white p-6 sm:flex-row">
                            {method.qr_url ? (
                              <img
                                src={method.qr_url}
                                alt={`${method.name} QR code`}
                                className="h-[200px] w-[200px] shrink-0 self-center rounded-lg border border-black/10 object-cover"
                              />
                            ) : (
                              <div className="grid h-[200px] w-[200px] shrink-0 place-items-center self-center rounded-lg bg-[#f2f2f2] text-xs text-[#888]">
                                No QR available
                              </div>
                            )}
                            <dl className="m-0 grid content-center gap-3">
                              {[
                                ["Account name", method.account_name],
                                ["Account / mobile number", method.account_number],
                                ...(method.bank ? [["Bank", method.bank]] : []),
                              ].map(([k, v]) => (
                                <div key={k}>
                                  <dt className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[#666]">{k}</dt>
                                  <dd className="m-0 font-serif text-[1.05rem] text-[#202020]">{v || "Not set"}</dd>
                                </div>
                              ))}
                              <p className="m-0 rounded-lg bg-amber-50 px-3 py-2 text-[0.8rem] text-amber-900">
                                Please send exactly <b>{peso(a.balance)}</b>.
                              </p>
                            </dl>
                          </div>
                        )}
                      </>
                    )}

                    {data.note && (
                      <p className="mb-0 mt-4 rounded-lg bg-[#9ac5be]/24 px-4 py-3 text-[0.8rem] text-[#28473a]">
                        {data.note}
                      </p>
                    )}
                  </section>

                  {/* Step 2 */}
                  <section>
                    <h2 className="mb-4 font-sans text-xs font-bold uppercase tracking-[0.15em] text-tf-teal">
                      2 · Send your proof of payment
                    </h2>

                    {data.last?.status === "rejected" && (
                      <p
                        role="alert"
                        className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                      >
                        Your last receipt was not accepted
                        {data.last.reject_reason ? `: ${data.last.reject_reason}` : "."} Please send a new one.
                      </p>
                    )}

                    <div className="grid gap-5 rounded-2xl border border-[#666]/31 bg-white p-6">
                      <label className="grid gap-1.5">
                        <span className="text-[0.8rem] font-bold text-[#444]">Account name you paid from</span>
                        <input
                          value={accountName}
                          onChange={(e) => setAccountName(e.target.value)}
                          maxLength={120}
                          placeholder="e.g. Juan Dela Cruz"
                          autoComplete="name"
                          className="h-[44px] rounded-lg border border-black/20 bg-white px-3 text-[16px] outline-none focus:border-[#10a28c] focus:ring-2 focus:ring-[#10a28c]/25"
                        />
                      </label>

                      <div className="grid gap-1.5">
                        <span className="text-[0.8rem] font-bold text-[#444]">Receipt screenshot</span>
                        <div className="flex flex-wrap items-center gap-4">
                          {receipt && (
                            <img
                              src={receipt}
                              alt="Your receipt preview"
                              className="h-[96px] w-[96px] rounded-lg border border-black/10 object-cover"
                            />
                          )}
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#c7b6b6] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-[#f2f2f2]">
                            {receipt ? "Change screenshot" : "Upload screenshot"}
                            <input type="file" accept="image/*" hidden onChange={pickReceipt} />
                          </label>
                          {fileName && <span className="max-w-[220px] truncate text-xs text-[#666]">{fileName}</span>}
                        </div>
                        <small className="text-[#888]">Make sure the amount, date, and reference number are clearly visible.</small>
                      </div>

                      {error && (
                        <p role="alert" className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                          {error}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4">
                        <button
                          type="button"
                          onClick={submit}
                          disabled={busy || data.methods.length === 0}
                          className={`${btnSolid} disabled:cursor-not-allowed disabled:opacity-55`}
                        >
                          {busy ? "Sending…" : `Send receipt · ${peso(a.balance)}`}
                        </button>
                        <Link to="/appointments" className={`${btnGhost} no-underline`}>
                          Cancel
                        </Link>
                      </div>
                    </div>
                  </section>
                </div>
              </Reveal>

              {/* Right: summary */}
              <Reveal className="sticky top-[100px] max-lg:static" delay={120}>
                <aside className="rounded-[10px] border border-black/24 bg-[#ebfef6] p-6">
                  <h3 className="m-0 font-serif text-base text-[#28473a]">{a.service_name}</h3>
                  <p className="mb-0 mt-1 text-[0.8rem] text-[#666]">
                    {a.psychologist || "Assigned by the clinic"}
                  </p>
                  <p className="mb-0 mt-1 text-[0.8rem] text-[#666]">
                    {longDate(a.date)} · {to12(a.start_time)} - {to12(a.end_time)}
                  </p>
                  <p className="mb-0 mt-1 text-[0.7rem] text-[#888]">Ref. {a.reference}</p>

                  <dl className="mb-0 mt-5 grid gap-2 border-t border-black/10 pt-4 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#666]">Session fee</dt>
                      <dd className="m-0 font-medium">{peso(a.total_amount)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#666]">Already paid</dt>
                      <dd className="m-0 font-medium">− {peso(a.amount_paid)}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 rounded-lg bg-[#345e51] px-4 py-4 text-white">
                    <span className="block text-[0.7rem] font-bold uppercase tracking-[0.12em] opacity-80">
                      Balance due
                    </span>
                    <strong className="mt-1 block font-serif text-[2rem] leading-none">{peso(a.balance)}</strong>
                    <small className="mt-2 block opacity-80">This amount is set automatically.</small>
                  </div>
                </aside>
              </Reveal>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function BalanceChooser() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/my-appointments")
      .then((d) => setAppointments(d.appointments || []))
      .catch((err) => {
        if (err.message?.includes("session expired")) return navigate("/signin");
        setError(err.message || "Could not load your balances.");
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const balances = appointments.filter((appointment) => Number(appointment.balance) > 0);

  return (
    <div className="font-sans text-[#202020]">
      <Navbar />
      <main className="min-h-[60vh] bg-white py-12 pb-24">
        <div className={container}>
          <Reveal>
            <div className="mb-8">
              <Link
                to="/appointments"
                className="text-[0.8rem] text-[#666] no-underline hover:text-black hover:underline"
              >
                ← My appointments
              </Link>
              <p className="m-0 mt-4 text-[13px] font-bold tracking-[0.1em] text-tf-teal">BALANCE</p>
              <h1 className="my-2 font-serif text-[2.2rem] text-[#111]">
                Choose an <em className="italic text-tf-teal">appointment.</em>
              </h1>
              <p className="m-0 text-base text-[#666]">Select an appointment to view or pay its remaining balance.</p>
            </div>
          </Reveal>

          {loading && (
            <div className="grid gap-4" role="status" aria-label="Loading balances">
              <span className="sr-only">Loading your balances…</span>
              {[0, 1, 2].map((item) => (
                <div key={item} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#666]/20 bg-white p-5">
                  <div className="grid flex-1 gap-2">
                    <SkeletonBlock className="h-5 w-48 max-w-full rounded" />
                    <SkeletonBlock className="h-3 w-64 max-w-full rounded" />
                  </div>
                  <SkeletonBlock className="h-5 w-24 rounded" />
                </div>
              ))}
            </div>
          )}
          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          )}
          {!loading && !error && balances.length === 0 && (
            <Panel tone="ok" title="No balance due" action={<Link to="/appointments" className={`${btnSolid} no-underline`}>My appointments</Link>}>
              You do not have any appointment balances to pay.
            </Panel>
          )}
          {!loading && !error && balances.length > 0 && (
            <div className="grid gap-4">
              {balances.map((appointment) => {
                const pending = appointment.balance_status === "to_verify";
                return (
                  <Link
                    key={appointment.id}
                    to={`/appointments/balance/${appointment.id}`}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#666]/25 bg-white p-5 text-inherit no-underline transition hover:border-tf-teal hover:shadow-md"
                  >
                    <div>
                      <h2 className="m-0 font-serif text-lg text-[#28473a]">{appointment.service_name}</h2>
                      <p className="mb-0 mt-1 text-sm text-[#666]">
                        {appointment.date} · {to12(appointment.start_time)} · {appointment.psychologist || "Assigned by the clinic"}
                      </p>
                      {pending && <p className="mb-0 mt-2 text-xs font-semibold text-amber-800">Balance receipt under review</p>}
                    </div>
                    <div className="text-right">
                      <span className="block text-xs text-[#666]">{pending ? "Submitted balance" : "Balance due"}</span>
                      <strong className="font-serif text-xl text-[#28473a]">{peso(appointment.balance)}</strong>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}