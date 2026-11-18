import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar, Footer } from "../components/Layout";
import { apiFetch, getFullName } from "../auth";
import { Avatar, displayEmail } from "../components/ProfileMenu";
import AdminNavigation from "../admin/adminnavigation";
import AffiliateNavigation from "../affiliate/affiliatenav";
import SkeletonBlock from "../components/SkeletonBlock";

const ROLE_LABEL = { CLIENT: "Client", AFFILIATE: "Affiliate", ADMIN: "Admin" };
const PROVIDER_LABEL = { SYSTEM: "Email & password", GOOGLE: "Google", FACEBOOK: "Facebook" };

const inputClass =
  "mt-1.5 w-full rounded-lg border border-black/14 bg-white px-3.5 py-3 font-serif text-sm outline-none focus:border-tf-teal focus:shadow-[0_0_0_3px_rgba(74,155,142,0.15)] disabled:bg-[#f4f4f4] disabled:text-[#777]";
const labelClass = "text-xs font-bold tracking-[0.08em] text-[#666]";
const btnPrimary =
  "inline-flex h-11 items-center justify-center rounded-lg border-0 bg-tf-navy px-6 text-sm text-white cursor-pointer transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
const btnGhost =
  "inline-flex h-11 items-center justify-center rounded-lg border border-black/20 bg-white px-5 text-sm text-black cursor-pointer hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60";

function toSquareJpeg(file, size = 400) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      canvas
        .getContext("2d")
        .drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That image could not be read. Try a JPG or PNG."));
    };
    img.src = url;
  });
}

function Shell({ role, children }) {
  if (role === "ADMIN" || role === "AFFILIATE") {
    return (
      <div className="flex min-h-screen w-full bg-[#f2f2f2] antialiased">
        {role === "ADMIN" ? <AdminNavigation /> : <AffiliateNavigation />}
        <main className="min-w-0 flex-1 px-10 py-12">
          <div className="mx-auto w-[min(860px,100%)]">{children}</div>
        </main>
      </div>
    );
  }
  return (
    <div className="min-h-screen overflow-x-hidden bg-tf-bg font-sans text-black antialiased">
      <Navbar />
      <main className="py-14 pb-24">
        <div className="mx-auto w-[min(860px,calc(100%-40px))]">{children}</div>
      </main>
      <Footer />
    </div>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <section className="mt-6 rounded-2xl border border-black/10 bg-white p-7 shadow-[0_16px_40px_-28px_rgba(0,0,0,0.35)] max-[560px]:p-5">
      <h2 className="m-0 font-serif text-xl text-[#202020]">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-[#666]">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Notice({ msg }) {
  if (!msg) return null;
  return (
    <p
      role="alert"
      className={`m-0 rounded-lg px-4 py-3 text-sm ${
        msg.type === "ok"
          ? "border border-tf-teal/30 bg-tf-soft text-tf-ink"
          : "border border-red-200 bg-red-50 text-red-800"
      }`}
    >
      {msg.text}
    </p>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "", background: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMsg, setPhotoMsg] = useState(null);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  // Email change flow
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailStep, setEmailStep] = useState("request"); // "request" | "confirm"
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState(null);

  const fillForm = (u) =>
    setForm({
      first_name: u.first_name || "",
      last_name: u.last_name || "",
      phone: u.phone || "",
      background: u.background || "",
    });

  const publish = (u) => {
    setUser(u);
    fillForm(u);
    window.dispatchEvent(new CustomEvent("tf-profile-updated", { detail: u }));
  };

  useEffect(() => {
    apiFetch("/profile")
      .then((d) => {
        setUser(d.user);
        fillForm(d.user);
      })
      .catch(() => navigate("/signin", { state: { from: "/profile" } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center px-5" role="status" aria-label="Loading your profile">
        <span className="sr-only">Loading your profile…</span>
        <div className="w-full max-w-3xl rounded-2xl border border-black/10 bg-white p-7 shadow-[0_16px_40px_-28px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-4">
            <SkeletonBlock className="size-16 shrink-0 rounded-full" />
            <div className="grid flex-1 gap-2">
              <SkeletonBlock className="h-5 w-40 rounded" />
              <SkeletonBlock className="h-3 w-56 max-w-full rounded" />
            </div>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="grid gap-2">
                <SkeletonBlock className="h-3 w-28 rounded" />
                <SkeletonBlock className="h-11 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isStaff = user.role === "ADMIN" || user.role === "AFFILIATE";
  const isSystem = user.login_provider === "SYSTEM";

  const saveProfile = async (e) => {
    e.preventDefault();
    if (saving) return;
    setMsg(null);
    if (!form.first_name.trim() || !form.last_name.trim()) {
      return setMsg({ type: "err", text: "Please enter your first and last name." });
    }
    if (form.phone.trim() && !/^09\d{9}$/.test(form.phone.trim())) {
      return setMsg({ type: "err", text: "Phone number must be 11 digits starting with 09 (e.g. 09123456789)." });
    }
    setSaving(true);
    try {
      const body = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim() || null,
        ...(isStaff ? { background: form.background.trim() || null } : {}),
      };
      const d = await apiFetch("/profile", { method: "POST", body: JSON.stringify(body) });
      publish(d.user);
      setMsg({ type: "ok", text: "Profile updated." });
    } catch (err) {
      setMsg({ type: "err", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const onPickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoMsg(null);
    if (!file.type.startsWith("image/")) {
      return setPhotoMsg({ type: "err", text: "Please choose an image file." });
    }
    if (file.size > 8 * 1024 * 1024) {
      return setPhotoMsg({ type: "err", text: "Please choose an image under 8 MB." });
    }
    setPhotoBusy(true);
    try {
      const image = await toSquareJpeg(file);
      const d = await apiFetch("/profile/avatar", {
        method: "POST",
        body: JSON.stringify({ image }),
      });
      publish(d.user);
      setPhotoMsg({ type: "ok", text: "Photo updated." });
    } catch (err) {
      setPhotoMsg({ type: "err", text: err.message });
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    setPhotoMsg(null);
    setPhotoBusy(true);
    try {
      const d = await apiFetch("/profile/avatar/remove", { method: "POST" });
      publish(d.user);
      setPhotoMsg({ type: "ok", text: "Photo removed." });
    } catch (err) {
      setPhotoMsg({ type: "err", text: err.message });
    } finally {
      setPhotoBusy(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwBusy) return;
    setPwMsg(null);
    if (!pw.current) return setPwMsg({ type: "err", text: "Enter your current password." });
    if (pw.next.length < 8) {
      return setPwMsg({ type: "err", text: "New password must be at least 8 characters." });
    }
    if (pw.next !== pw.confirm) return setPwMsg({ type: "err", text: "Passwords do not match." });
    setPwBusy(true);
    try {
      await apiFetch("/profile/password", {
        method: "POST",
        body: JSON.stringify({
          current_password: pw.current,
          password: pw.next,
          password_confirmation: pw.confirm,
        }),
      });
      setPw({ current: "", next: "", confirm: "" });
      setPwMsg({ type: "ok", text: "Password updated." });
    } catch (err) {
      setPwMsg({ type: "err", text: err.message });
    } finally {
      setPwBusy(false);
    }
  };

  const resetEmailFlow = () => {
    setEmailOpen(false);
    setEmailStep("request");
    setNewEmail("");
    setCode("");
    setEmailMsg(null);
    setEmailBusy(false);
  };

  const requestEmailCode = async (e) => {
    e.preventDefault();
    if (emailBusy) return;
    setEmailMsg(null);
    if (!newEmail.includes("@")) {
      return setEmailMsg({ type: "err", text: "Enter a valid email address." });
    }
    setEmailBusy(true);
    try {
      const d = await apiFetch("/profile/email/request", {
        method: "POST",
        body: JSON.stringify({ email: newEmail.trim() }),
      });
      setEmailStep("confirm");
      setEmailMsg({
        type: "ok",
        text: d.message || `We sent a 6-digit code to ${d.email || newEmail}.`,
      });
    } catch (err) {
      setEmailMsg({ type: "err", text: err.message });
    } finally {
      setEmailBusy(false);
    }
  };

  const confirmEmailCode = async (e) => {
    e.preventDefault();
    if (emailBusy) return;
    setEmailMsg(null);
    if (!/^\d{6}$/.test(code.trim())) {
      return setEmailMsg({ type: "err", text: "Enter the 6-digit code from the email." });
    }
    setEmailBusy(true);
    try {
      const d = await apiFetch("/profile/email/confirm", {
        method: "POST",
        body: JSON.stringify({ email: newEmail.trim(), code: code.trim() }),
      });
      publish(d.user);
      resetEmailFlow();
      setMsg({ type: "ok", text: "Email address updated." });
    } catch (err) {
      setEmailMsg({ type: "err", text: err.message });
    } finally {
      setEmailBusy(false);
    }
  };

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  const details = [
    ["Role", ROLE_LABEL[user.role] || user.role],
    ["Signs in with", PROVIDER_LABEL[user.login_provider] || user.login_provider],
    ["Email", displayEmail(user) || "—"],
    ["Phone", user.phone || "Not added yet"],
    ["Account status", user.is_active ? "Active" : "Disabled"],
    ["Member since", memberSince],
  ];

  return (
    <Shell role={user.role}>
      <h1 className="m-0 font-serif text-[clamp(1.8rem,3.5vw,2.4rem)] font-normal text-[#111]">
        My <em className="italic text-tf-teal">profile</em>
      </h1>

      {/* Profile Photo Card */}
      <Card title="Profile photo" subtitle="Your photo appears in the top right corner of the site.">
        <div className="flex flex-wrap items-center gap-6">
          <div className="relative">
            <Avatar user={user} size={112} className={photoBusy ? "opacity-50" : ""} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={photoBusy}
              aria-label="Change photo"
              className="absolute bottom-0 right-0 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-tf-teal text-white shadow hover:opacity-90"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="font-serif text-2xl text-[#202020]">
              {getFullName(user)}
            </div>
            <div className="mt-1 flex flex-wrap gap-2">
              <span className="rounded-full bg-tf-soft px-3 py-1 text-xs font-bold text-tf-teal">
                {ROLE_LABEL[user.role] || user.role}
              </span>
              <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-bold text-[#555]">
                {PROVIDER_LABEL[user.login_provider] || user.login_provider}
              </span>
            </div>

            {/* Display professional background snippet in profile card if available */}
            {isStaff && user.background && (
              <p className="mt-3 font-serif text-sm italic text-[#555] leading-relaxed max-w-xl">
                “{user.background}”
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className={btnPrimary} onClick={() => fileRef.current?.click()} disabled={photoBusy}>
                {photoBusy ? "Please wait…" : "Change photo"}
              </button>
              {user.avatar_url && (
                <button type="button" onClick={removePhoto} disabled={photoBusy} className={btnGhost}>
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
        {photoMsg && (
          <div className="mt-4">
            <Notice msg={photoMsg} />
          </div>
        )}
      </Card>

      {/* Personal Information & Background Card */}
      <Card
        title="Personal information"
        subtitle={isStaff ? "Update your personal details and professional background below." : "Update your details below."}
      >
        <form className="flex flex-col gap-4" onSubmit={saveProfile} noValidate>
          <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
            <label className={labelClass}>
              FIRST NAME
              <input
                className={inputClass}
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                autoComplete="given-name"
              />
            </label>
            <label className={labelClass}>
              LAST NAME
              <input
                className={inputClass}
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                autoComplete="family-name"
              />
            </label>
          </div>

          <div>
            <label className={labelClass}>
              EMAIL
              <input
                type="email"
                className={inputClass}
                value={displayEmail(user)}
                readOnly
                disabled
                autoComplete="email"
              />
            </label>

            {isSystem ? (
              <>
                {!emailOpen && (
                  <button
                    type="button"
                    className={`${btnGhost} mt-2`}
                    onClick={() => {
                      setEmailOpen(true);
                      setEmailStep("request");
                      setNewEmail("");
                      setCode("");
                      setEmailMsg(null);
                    }}
                  >
                    Change email
                  </button>
                )}

                {emailOpen && emailStep === "request" && (
                  <div className="mt-3 flex flex-col gap-3 rounded-lg border border-black/10 bg-[#fafafa] p-4">
                    <label className={labelClass}>
                      NEW EMAIL
                      <input
                        type="email"
                        className={inputClass}
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="new@example.com"
                        autoComplete="email"
                        autoFocus
                      />
                    </label>
                    <Notice msg={emailMsg} />
                    <div className="flex gap-3">
                      <button type="button" onClick={requestEmailCode} className={btnPrimary} disabled={emailBusy}>
                        {emailBusy ? "Sending…" : "Send code"}
                      </button>
                      <button type="button" className={btnGhost} onClick={resetEmailFlow} disabled={emailBusy}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {emailOpen && emailStep === "confirm" && (
                  <div className="mt-3 flex flex-col gap-3 rounded-lg border border-black/10 bg-[#fafafa] p-4">
                    <div className="text-sm text-[#555]">
                      Code sent to <strong>{newEmail}</strong>. Enter it below.
                    </div>
                    <label className={labelClass}>
                      6-DIGIT CODE
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        className={`${inputClass} text-center tracking-[0.5em]`}
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="000000"
                        autoComplete="one-time-code"
                        autoFocus
                      />
                    </label>
                    <Notice msg={emailMsg} />
                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={confirmEmailCode} className={btnPrimary} disabled={emailBusy}>
                        {emailBusy ? "Confirming…" : "Confirm new email"}
                      </button>
                      <button
                        type="button"
                        className={btnGhost}
                        onClick={() => {
                          setEmailStep("request");
                          setCode("");
                          setEmailMsg(null);
                        }}
                        disabled={emailBusy}
                      >
                        Use a different email
                      </button>
                      <button type="button" className={btnGhost} onClick={resetEmailFlow} disabled={emailBusy}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <span className="mt-1 block text-[11px] font-normal tracking-normal text-[#888]">
                This account signs in with {PROVIDER_LABEL[user.login_provider]}, so the email can't be changed here.
              </span>
            )}
          </div>

          <label className={labelClass}>
            PHONE
            <input
              type="tel"
              inputMode="numeric"
              maxLength={11}
              className={inputClass}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })}
              autoComplete="tel"
              placeholder="09123456789"
            />
          </label>

          {/* Background field for Admin & Affiliate only */}
          {isStaff && (
            <label className={labelClass}>
              BACKGROUND / ABOUT YOU
              <textarea
                rows={5}
                className={`${inputClass} leading-relaxed resize-y`}
                value={form.background}
                onChange={(e) => setForm({ ...form, background: e.target.value })}
                placeholder="e.g. I am a registered psychologist specializing in psychotherapy, cognitive behavioral therapy, and child assessments with over 5 years of clinical experience..."
              />
              <span className="mt-1 block text-xs font-normal text-[#888]">
                Describe your professional background, credentials, and expertise.
              </span>
            </label>
          )}

          <Notice msg={msg} />
          <div>
            <button type="submit" className={btnPrimary} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </Card>

      <Card title="Account details">
        <dl className="m-0 grid grid-cols-2 gap-x-8 gap-y-4 max-[560px]:grid-cols-1">
          {details.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs font-bold tracking-[0.08em] text-[#888]">{k.toUpperCase()}</dt>
              <dd className="m-0 mt-1 break-words text-sm text-[#202020]">{v}</dd>
            </div>
          ))}
          {isStaff && user.background && (
            <div className="col-span-2 max-[560px]:col-span-1 border-t border-black/5 pt-3 mt-1">
              <dt className="text-xs font-bold tracking-[0.08em] text-[#888]">PROFESSIONAL BACKGROUND</dt>
              <dd className="m-0 mt-1 whitespace-pre-line text-sm text-[#202020] leading-relaxed">
                {user.background}
              </dd>
            </div>
          )}
        </dl>
      </Card>

      {isSystem && (
        <Card title="Change password" subtitle="Use at least 8 characters.">
          <form className="flex flex-col gap-4" onSubmit={changePassword} noValidate>
            <label className={labelClass}>
              CURRENT PASSWORD
              <input
                type="password"
                className={inputClass}
                value={pw.current}
                onChange={(e) => setPw({ ...pw, current: e.target.value })}
                autoComplete="current-password"
              />
            </label>
            <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
              <label className={labelClass}>
                NEW PASSWORD
                <input
                  type="password"
                  className={inputClass}
                  value={pw.next}
                  onChange={(e) => setPw({ ...pw, next: e.target.value })}
                  autoComplete="new-password"
                />
              </label>
              <label className={labelClass}>
                CONFIRM NEW PASSWORD
                <input
                  type="password"
                  className={inputClass}
                  value={pw.confirm}
                  onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                  autoComplete="new-password"
                />
              </label>
            </div>
            <Notice msg={pwMsg} />
            <div>
              <button type="submit" className={btnPrimary} disabled={pwBusy}>
                {pwBusy ? "Updating…" : "Update password"}
              </button>
            </div>
          </form>
        </Card>
      )}
    </Shell>
  );
}
