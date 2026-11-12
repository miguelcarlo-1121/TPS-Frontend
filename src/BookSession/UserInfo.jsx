import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar, Footer, Reveal, container, btnSolid, btnGhost } from "../components/Layout";
import { apiFetch } from "../auth";
import StepRail from "./StepRail";
import BookingSummary from "./BookingSummary";
import { useBooking } from "./bookingContext";

const pageShell = "font-sans text-black bg-tf-bg overflow-x-hidden antialiased";
const mainPad = "py-12 pb-24 max-[720px]:py-7 max-[720px]:pb-16 bg-tf-bg";
const gridClass =
  "grid grid-cols-[minmax(0,1fr)_320px] gap-7 mt-8 items-start max-[900px]:grid-cols-1";
const panelClass =
  "bg-white border border-black/[0.23] rounded-[21px] p-7 max-[720px]:p-5";
const inputClass =
  "font-serif text-[0.9rem] text-[#202020] bg-white border border-black/14 rounded-lg py-[11px] px-3.5 w-full outline-none transition-[border-color,box-shadow] duration-150 focus:border-tf-teal focus:shadow-[0_0_0_3px_rgba(74,155,142,0.15)] placeholder:text-[#666]/75";
const inputError = "border-red-400 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(248,113,113,0.2)]";

const pad = (n) => String(n).padStart(2, "0");

function to12(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? "PM" : "AM"}`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Letters (kasama accents/Ñ), space, tuldok, apostrophe, gitling. Walang numbers.
const NAME_RE = /^\p{L}[\p{L}\s.'’-]*$/u;
const NAME_STRIP = /[^\p{L}\s.'’-]/gu;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PH_MOBILE_RE = /^09\d{9}$/;

const onlyDigits11 = (v) => v.replace(/\D/g, "").slice(0, 11);

function Field({ id, label, hint, error, children, className = "" }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="font-serif font-bold text-[0.85rem] text-[#202020]">
        {label}
        <span className="ml-1 text-red-500">*</span>
        {hint && (
          <span className="ml-1.5 font-sans font-normal text-[0.7rem] text-[#666]">{hint}</span>
        )}
      </label>
      {children}
      {error && <p className="m-0 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function UserInfo() {
  const navigate = useNavigate();
  const { booking, updateClient, service, feeLabel } = useBooking();
  const c = booking.client || {};

  const [fullName, setFullName] = useState(c.fullName ?? "");
  const [birthdate, setBirthdate] = useState(c.birthdate ?? "");
  const [email, setEmail] = useState(c.email ?? "");
  const [mobile, setMobile] = useState(c.mobile ?? "");
  const [emergencyName, setEmergencyName] = useState(c.emergencyName ?? "");
  const [emergencyRelation, setEmergencyRelation] = useState(c.emergencyRelation ?? "");
  const [emergencyPhone, setEmergencyPhone] = useState(c.emergencyPhone ?? "");
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [serverError, setServerError] = useState("");

  const maxDob = todayStr();

  // Kunin ang naka-save na info (o prefill mula sa account) kung wala pang laman ang form
  useEffect(() => {
    let alive = true;
    setLoadingInfo(true);
    apiFetch("/booking/client-info")
      .then((d) => {
        if (!alive || !d.info) return;
        const i = d.info;
        setFullName(i.full_name || "");
        setBirthdate(i.birthdate || "");
        setEmail(i.email || "");
        setMobile(i.mobile || "");
        setEmergencyName(i.emergency_name || "");
        setEmergencyRelation(i.emergency_relation || "");
        setEmergencyPhone(i.emergency_phone || "");
      })
      .catch(() => { })
      .finally(() => alive && setLoadingInfo(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const errors = {
    fullName:
      fullName.trim().length < 2
        ? "Full name is required."
        : !NAME_RE.test(fullName.trim())
          ? "Full name must not contain numbers."
          : "",
    birthdate: !birthdate
      ? "Date of birth is required."
      : birthdate > maxDob
        ? "Date of birth cannot be in the future."
        : birthdate < "1900-01-01"
          ? "Enter a valid date of birth."
          : "",
    email: !EMAIL_RE.test(email.trim()) ? "Enter a valid email address (e.g. name@gmail.com)." : "",
    mobile: !PH_MOBILE_RE.test(mobile) ? "Enter an 11-digit mobile number (e.g. 09123456789)." : "",
    emergencyName:
      emergencyName.trim().length < 2
        ? "Emergency contact name is required."
        : !NAME_RE.test(emergencyName.trim())
          ? "Contact name must not contain numbers."
          : "",
    emergencyRelation:
      !emergencyRelation.trim()
        ? "Relationship is required."
        : !NAME_RE.test(emergencyRelation.trim())
          ? "Relationship must contain letters only."
          : "",
    emergencyPhone: !PH_MOBILE_RE.test(emergencyPhone)
      ? "Enter an 11-digit mobile number (e.g. 09123456789)."
      : "",
    agreed: !agreed ? "You must agree to data privacy terms." : "",
  };

  const canContinue = Object.values(errors).every((e) => !e);

  const clientData = () => ({
    fullName: fullName.trim(),
    birthdate,
    email: email.trim().toLowerCase(),
    mobile,
    emergencyName: emergencyName.trim(),
    emergencyRelation: emergencyRelation.trim(),
    emergencyPhone,
  });

  const submit = async () => {
    setSubmitted(true);
    setServerError("");
    if (!canContinue || saving) return;

    const data = clientData();
    setSaving(true);
    try {
      await apiFetch("/booking/client-info", {
        method: "POST",
        body: JSON.stringify({
          hold_id: booking.holdId,
          full_name: data.fullName,
          birthdate: data.birthdate,
          email: data.email,
          mobile: data.mobile,
          emergency_name: data.emergencyName,
          emergency_relation: data.emergencyRelation,
          emergency_phone: data.emergencyPhone,
        }),
      });
      updateClient(data);
      navigate("/book/review");
    } catch (err) {
      if (err.message?.includes("session expired")) {
        navigate("/signin");
        return;
      }
      setServerError(err.message || "Could not save your information. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    submit();
  };

  // Summary mula sa totoong napili sa DateTime
  const d = booking.date;
  const dateText =
    d && booking.timeStart
      ? `${new Date(d.year, d.month, d.day).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} · ${to12(booking.timeStart)} - ${to12(booking.timeEnd)}`
      : "To be set";

  const summaryRows = [
    { label: "SERVICE", value: service?.name || "—" },
    ...(booking.serviceId === "assessment" && booking.assessmentType?.name ? [{ label: "TYPE", value: booking.assessmentType.name }] : []),
    {
      label: "PSYCHOLOGIST",
      value:
        booking.serviceId === "psychotherapy"
          ? booking.psychologist?.name || "To be set"
          : "Assigned by the clinic",
    },
    { label: "DATE & TIME", value: dateText },
  ];

  const err = (key) => submitted && errors[key];

  return (
    <div className={pageShell}>
      <Navbar />
      <main className={mainPad}>
        <div className={container}>
          <Reveal>
            <StepRail current={2} />
          </Reveal>
          <div className={gridClass}>
            <Reveal className={panelClass} delay={140}>
              <header>
                <h2 className="m-0 mb-1.5 font-serif text-[1.4rem] font-normal text-[#202020]">
                  Tell us about you
                </h2>
                <p className="m-0 text-sm text-[#666]">
                  Session format (online or in-person) will be determined by your psychologist after booking.
                </p>
              </header>

              {loadingInfo && <p className="mt-3 mb-0 text-xs text-[#666]">Loading your details…</p>}

              <form className="flex flex-col gap-[18px] mt-4" onSubmit={onSubmit} noValidate>
                <p className="m-0 font-sans font-semibold text-[0.78rem] tracking-[0.1em] text-tf-teal">
                  ABOUT YOU
                </p>
                <div className="grid grid-cols-2 gap-4 max-[720px]:grid-cols-1">
                  <Field id="fullName" label="Full name" error={err("fullName")}>
                    <input
                      id="fullName"
                      type="text"
                      autoComplete="name"
                      maxLength={150}
                      readOnly
                      aria-describedby="account-name-hint"
                      className={`${inputClass} cursor-not-allowed bg-[#f4f4f4] ${err("fullName") ? inputError : ""}`}
                      value={fullName}
                    />
                    <span id="account-name-hint" className="text-xs text-[#666]">
                      This name comes from your account and cannot be changed here.
                    </span>
                  </Field>
                  <Field id="birthdate" label="Date of birth" error={err("birthdate")}>
                    <input
                      id="birthdate"
                      type="date"
                      min="1900-01-01"
                      max={maxDob}
                      className={`${inputClass} ${err("birthdate") ? inputError : ""}`}
                      value={birthdate}
                      onChange={(e) => setBirthdate(e.target.value)}
                    />
                  </Field>
                </div>

                <p className="m-0 mt-3 font-sans font-semibold text-[0.78rem] tracking-[0.1em] text-tf-teal">
                  HOW TO REACH YOU
                </p>
                <div className="grid grid-cols-2 gap-4 max-[720px]:grid-cols-1">
                  <Field id="email" label="Email address" error={err("email")}>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="name@gmail.com"
                      className={`${inputClass} ${err("email") ? inputError : ""}`}
                      value={email}
                      onChange={(e) => setEmail(e.target.value.replace(/\s/g, ""))}
                    />
                  </Field>
                  <Field id="mobile" label="Mobile number" hint="11 digits" error={err("mobile")}>
                    <input
                      id="mobile"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      maxLength={11}
                      placeholder="09123456789"
                      className={`${inputClass} ${err("mobile") ? inputError : ""}`}
                      value={mobile}
                      onChange={(e) => setMobile(onlyDigits11(e.target.value))}
                    />
                  </Field>
                </div>

                <p className="m-0 mt-3 font-sans font-semibold text-[0.78rem] tracking-[0.1em] text-tf-teal">
                  EMERGENCY CONTACT
                </p>
                <div className="grid grid-cols-2 gap-4 max-[720px]:grid-cols-1">
                  <Field id="emName" label="Contact name" error={err("emergencyName")}>
                    <input
                      id="emName"
                      type="text"
                      maxLength={150}
                      className={`${inputClass} ${err("emergencyName") ? inputError : ""}`}
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value.replace(NAME_STRIP, ""))}
                    />
                  </Field>
                  <Field id="emRelation" label="Relationship to client" error={err("emergencyRelation")}>
                    <input
                      id="emRelation"
                      type="text"
                      maxLength={60}
                      placeholder="e.g. Parent, Spouse, Sibling"
                      className={`${inputClass} ${err("emergencyRelation") ? inputError : ""}`}
                      value={emergencyRelation}
                      onChange={(e) => setEmergencyRelation(e.target.value.replace(NAME_STRIP, ""))}
                    />
                  </Field>
                  <Field
                    id="emMobile"
                    label="Contact phone number"
                    hint="11 digits"
                    error={err("emergencyPhone")}
                    className="max-[720px]:col-span-1 col-span-2"
                  >
                    <input
                      id="emMobile"
                      type="tel"
                      inputMode="numeric"
                      maxLength={11}
                      placeholder="09123456789"
                      className={`${inputClass} ${err("emergencyPhone") ? inputError : ""}`}
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(onlyDigits11(e.target.value))}
                    />
                  </Field>
                </div>

                <div className="rounded-xl border border-tf-teal/30 bg-tf-soft px-4 py-3 text-sm text-tf-ink">
                  <strong className="font-serif">Note:</strong> Online or in-person session format is
                  decided by your assigned psychologist. You do not need to choose a format here.
                </div>

                <label className="flex items-start gap-3 bg-[rgba(154,197,190,0.24)] rounded-[13px] py-3.5 px-4 cursor-pointer font-serif font-bold text-[0.85rem] text-[#666]/75 leading-[1.45]">
                  <input
                    type="checkbox"
                    className="shrink-0 w-5 h-5 mt-px accent-tf-teal cursor-pointer"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                  />
                  <span>
                    I agree to the processing of my personal information in line with the Data Privacy
                    Act.
                  </span>
                </label>
                {err("agreed") && <p className="m-0 -mt-2 text-xs text-red-600">{errors.agreed}</p>}

                {serverError && (
                  <p
                    role="alert"
                    className="m-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                  >
                    {serverError}
                  </p>
                )}

                <div className="flex items-center justify-between gap-4 flex-wrap mt-4 pt-5 border-t border-dashed border-[#d0e5dd]">
                  <Link to="/book/date-time" className={btnGhost}>
                    Back
                  </Link>
                  <button
                    type="submit"
                    disabled={saving}
                    className={`${btnSolid} disabled:opacity-55 disabled:cursor-not-allowed`}
                  >
                    {saving ? "Saving…" : "Continue"}
                  </button>
                </div>
              </form>
            </Reveal>

            <Reveal delay={200}>
              <BookingSummary
                step={3}
                title={service?.fullName || "Booking"}
                rows={summaryRows}
                fee={feeLabel}
                ctaDisabled={saving}
                onContinue={submit}
              />
            </Reveal>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}