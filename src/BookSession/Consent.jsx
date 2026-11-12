import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar, Footer, Reveal, container, btnSolid, btnGhost } from "../components/Layout";
import { apiFetch } from "../auth";
import { peso, to12 } from "../components/payUtils";
import { DSM5_OPTIONS, DSM5_QUESTIONS } from "../components/dsm5";
import StepRail from "./StepRail";
import BookingSummary from "./BookingSummary";
import { useBooking } from "./bookingContext";
import SignaturePad from "../components/SignaturePad";
import AbaConsentForm from "./AbaConsentForm";

const pageShell = "font-sans text-black bg-tf-bg overflow-x-hidden antialiased";
const mainPad = "py-12 pb-24 max-[720px]:py-7 max-[720px]:pb-16 bg-tf-bg";
const gridClass =
  "grid grid-cols-[minmax(0,1fr)_320px] gap-7 mt-8 items-start max-[900px]:grid-cols-1";
const panelClass =
  "bg-white border border-black/[0.23] rounded-[21px] p-7 max-[720px]:p-5";
const inputClass =
  "mt-1.5 w-full rounded-lg border border-black/14 bg-white px-3.5 py-2.5 font-serif text-sm outline-none focus:border-tf-teal focus:shadow-[0_0_0_3px_rgba(74,155,142,0.15)] disabled:bg-[#f4f4f4] disabled:text-[#777]";
const inputErr = "!border-red-400";
const sectionTitle = "m-0 mt-2 font-sans text-[0.78rem] font-semibold tracking-[0.1em] text-tf-teal";

const NAME_RE = /^\p{L}[\p{L}\s.'’-]*$/u;
const NAME_STRIP = /[^\p{L}\s.'’-]/gu;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PH_RE = /^09\d{9}$/;
const digits11 = (v) => v.replace(/\D/g, "").slice(0, 11);
const isAbaPayment = (payment) =>
  payment?.consent_type === "aba" ||
  payment?.service_id === "aba" ||
  String(payment?.service_name || "").toLowerCase().replace(/[^a-z0-9]/g, "") === "abatherapy";
const isPsychotherapyPayment = (payment) =>
  payment?.consent_type === "psychotherapy" ||
  payment?.service_id === "psychotherapy" ||
  String(payment?.service_name || "").toLowerCase().replace(/[^a-z0-9]/g, "").includes("psychotherapy");

const pad = (n) => String(n).padStart(2, "0");
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
function ageOf(birth) {
  if (!birth) return null;
  const b = new Date(birth + "T00:00");
  const t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
  return a;
}

const STEPS = ["Consent agreement", "Intake form", "Symptom checklist", "Sign & submit"];

const CHECKS = [
  { id: "read", label: "I have read and understood this Client Consent Agreement and had enough time to consider it." },
  { id: "confidentiality", label: "I understand the limits of confidentiality (suspected abuse, threats of harm to others, and risk of suicide)." },
  { id: "crisis", label: "I understand that Threefold is not a 24/7 crisis support facility. In a crisis I will go to the nearest hospital emergency department or contact a 24/7 crisis hotline." },
  { id: "fees", label: "I agree to the punctuality, commitment, cancellation and professional fee policies." },
  { id: "privacy", label: "I authorize the clinic to collect, process and retain my personal data strictly for evaluating and providing psychotherapy support (Data Privacy Act, RA 10173)." },
];

const emptyIntake = {
  full_name: "", nickname: "", gender: "", civil_status: "", birthdate: "", address: "",
  mobile: "", email: "", occupation: "", heard_about: "",
  e1_name: "", e1_relation: "", e1_mobile: "", e2_name: "", e2_relation: "", e2_mobile: "",
  reason: "", duration_unit: "", goals: "",
  prev_therapy: null, prev_therapy_details: "",
  diagnosed: null, diagnosed_details: "",
  medications: null, medications_details: "",
  medical: null, medical_details: "",
};

/* ---------------- small pieces ---------------- */
function Field({ label, error, hint, required = true, children, className = "" }) {
  return (
    <div className={`flex flex-col ${className}`}>
      <label className="font-serif text-[0.85rem] font-bold text-[#202020]">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
        {hint && <span className="ml-1.5 font-sans text-[0.7rem] font-normal text-[#666]">{hint}</span>}
        {children}
      </label>
      {error && <p className="m-0 mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function YesNo({ label, value, onChange, details, onDetails, error, detailError, detailLabel }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <p className="m-0 font-serif text-sm font-bold text-[#202020]">
        {label} <span className="text-red-500">*</span>
      </p>
      <div className="mt-2 flex gap-3">
        {[
          [true, "Yes"],
          [false, "No"],
        ].map(([v, t]) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange(v)}
            className={`cursor-pointer rounded-lg border px-5 py-1.5 font-serif text-sm ${value === v ? "border-tf-teal bg-tf-soft font-bold" : "border-black/15 bg-white hover:border-tf-teal"
              }`}
          >
            {t}
          </button>
        ))}
      </div>
      {error && <p className="m-0 mt-1 text-xs text-red-600">{error}</p>}
      {value === true && (
        <div className="mt-3">
          <input
            className={`${inputClass} !mt-0 ${detailError ? inputErr : ""}`}
            value={details}
            maxLength={500}
            placeholder={detailLabel}
            onChange={(e) => onDetails(e.target.value)}
          />
          {detailError && <p className="m-0 mt-1 text-xs text-red-600">{detailError}</p>}
        </div>
      )}
    </div>
  );
}

function DsmRow({ n, text, value, onPick }) {
  return (
    <fieldset className="m-0 rounded-xl border border-black/10 bg-white p-4">
      <legend className="sr-only">Question {n}</legend>
      <p className="m-0 text-sm leading-relaxed text-[#202020]">
        <strong className="mr-1.5 text-tf-teal">{n}.</strong>
        {text}
      </p>
      <div className="mt-3 grid grid-cols-5 gap-2 max-[560px]:grid-cols-2">
        {DSM5_OPTIONS.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => onPick(o.v)}
            aria-pressed={value === o.v}
            className={`cursor-pointer rounded-lg border px-2 py-2 text-center transition-colors ${value === o.v
              ? "border-[#2c5743] bg-[#2c5743] text-white"
              : "border-black/15 bg-white text-[#202020] hover:border-tf-teal"
              }`}
          >
            <span className="block font-serif text-sm font-bold">{o.v} · {o.label}</span>
            <span className={`block text-[10px] leading-tight ${value === o.v ? "text-white/80" : "text-[#666]"}`}>
              {o.sub}
            </span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/* ---------------- validation ---------------- */
function validateConsent(checks) {
  return CHECKS.every((c) => checks[c.id]) ? {} : { checks: "Please tick all the boxes to continue." };
}

function validateIntake(i) {
  const e = {};
  if (i.full_name.trim().length < 2) e.full_name = "Full name is required.";
  else if (!NAME_RE.test(i.full_name.trim())) e.full_name = "Full name must not contain numbers.";
  if (!i.birthdate) e.birthdate = "Date of birth is required.";
  else if (i.birthdate > todayStr()) e.birthdate = "Date of birth cannot be in the future.";
  else if (i.birthdate < "1900-01-01") e.birthdate = "Enter a valid date of birth.";
  if (i.address.trim().length < 5) e.address = "Complete address is required.";
  if (!PH_RE.test(i.mobile)) e.mobile = "Enter an 11-digit mobile number (e.g. 09123456789).";
  if (!EMAIL_RE.test(i.email.trim())) e.email = "Enter a valid email address.";

  if (i.e1_name.trim().length < 2) e.e1_name = "Contact name is required.";
  else if (!NAME_RE.test(i.e1_name.trim())) e.e1_name = "Name must not contain numbers.";
  if (!NAME_RE.test(i.e1_relation.trim())) e.e1_relation = "Relationship is required (letters only).";
  if (!PH_RE.test(i.e1_mobile)) e.e1_mobile = "Enter an 11-digit mobile number.";

  const e2Any = i.e2_name.trim() || i.e2_relation.trim() || i.e2_mobile;
  if (e2Any) {
    if (!NAME_RE.test(i.e2_name.trim())) e.e2_name = "Contact name is required (letters only).";
    if (!NAME_RE.test(i.e2_relation.trim())) e.e2_relation = "Relationship is required (letters only).";
    if (!PH_RE.test(i.e2_mobile)) e.e2_mobile = "Enter an 11-digit mobile number.";
  }

  if (i.reason.trim().length < 5) e.reason = "Please tell us the main reason you are seeking support.";
  if (!i.duration_unit) e.duration_unit = "Please choose how long.";
  if (i.goals.trim().length < 3) e.goals = "Please share your goals for therapy.";

  [["prev_therapy", "previous therapy"], ["diagnosed", "diagnosis"], ["medications", "medications"], ["medical", "medical conditions"]].forEach(
    ([k]) => {
      if (i[k] === null) e[k] = "Please choose Yes or No.";
      else if (i[k] === true && !i[k + "_details"].trim()) e[k + "_details"] = "Please add the details.";
    }
  );
  return e;
}

function validateDsm(a) {
  const left = a.filter((x) => x === null).length;
  return left ? { dsm: `Please answer all 23 items (${left} left).` } : {};
}

function validateSign(s, minor, g) {
  const e = {};
  if (!s.certify) e.certify = "Please certify that the information is true and accurate.";
  if (s.name.trim().length < 2) e.name = "Type your full name as your printed name.";
  else if (!NAME_RE.test(s.name.trim())) e.name = "Name must not contain numbers.";
  if (!s.signature) e.signature = "Please draw your signature in the box provided.";
  if (minor) {
    if (!NAME_RE.test(g.name.trim())) e.g_name = "Parent / guardian name is required.";
    if (!NAME_RE.test(g.relation.trim())) e.g_relation = "Relationship to the minor is required.";
    if (!g.signature) e.g_signature = "Parent / guardian signature is required.";
  }
  return e;
}

/* ---------------- page ---------------- */
export default function Consent() {
  const navigate = useNavigate();
  const { update } = useBooking();

  const [pay, setPay] = useState(null);
  const [prefill, setPrefill] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [step, setStep] = useState(0);
  const [checks, setChecks] = useState({});
  const [intake, setIntake] = useState(emptyIntake);
  const [dsm, setDsm] = useState(Array(23).fill(null));
  const [sign, setSign] = useState({ name: "", certify: false, signature: "" });
  const [guardian, setGuardian] = useState({ name: "", relation: "", signature: "" });

  const [errs, setErrs] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [done, setDone] = useState(false);

  // Modal na "kailangan sagutan muna". Lalabas din pagkatapos pindutin ang browser Back.
  const [leaveWarn, setLeaveWarn] = useState(() => {
    try {
      if (sessionStorage.getItem("tf_consent_warn")) {
        sessionStorage.removeItem("tf_consent_warn");
        return true;
      }
    } catch {
      /* ignore */
    }
    return false;
  });
  const hereRef = useRef(window.location.pathname + window.location.search);

  const draftKey = pay ? `tf_consent_draft_${pay.id}` : null;
  const isAba = isAbaPayment(pay);
  const isPsychotherapy = isPsychotherapyPayment(pay);

  // Bawal umalis hangga't hindi pa na-submit ang forms
  const guard = !!pay && pay.required && !pay.rejected && pay.approved && !pay.submitted && !done;

  // Kunin ang booking + prefill, at ibalik ang draft kung meron
  useEffect(() => {
    let alive = true;
    apiFetch("/booking/consent")
      .then((d) => {
        if (!alive) return;
        setPay(d.payment);
        setPrefill(d.prefill || null);
        if (!d.payment) return;
        if (isAbaPayment(d.payment)) return;

        let draft = null;
        try {
          draft = JSON.parse(sessionStorage.getItem(`tf_consent_draft_${d.payment.id}`) || "null");
        } catch {
          draft = null;
        }

        if (draft) {
          setStep(draft.step ?? 0);
          setChecks(draft.checks ?? {});
          setIntake({ ...emptyIntake, ...(draft.intake ?? {}) });
          setDsm(Array.isArray(draft.dsm) && draft.dsm.length === 23 ? draft.dsm : Array(23).fill(null));
          setSign(draft.sign ?? { name: "", certify: false });
          setGuardian(draft.guardian ?? { name: "", relation: "" });
        } else if (d.prefill) {
          const p = d.prefill;
          setIntake({
            ...emptyIntake,
            full_name: p.full_name || "",
            birthdate: p.birthdate || "",
            email: p.email || "",
            mobile: p.mobile || "",
            e1_name: p.emergency_name || "",
            e1_relation: p.emergency_relation || "",
            e1_mobile: p.emergency_phone || "",
          });
          setSign((s) => ({ ...s, name: p.full_name || "" }));
        }
      })
      .catch((err) => {
        if (!alive) return;
        if (err.message?.includes("session expired")) return navigate("/signin");
        setLoadError(err.message || "Could not load your consent form.");
      })
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Assessment lang ang walang consent form.
  useEffect(() => {
    if (loaded && pay && !pay.required) navigate("/book/confirmation", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, pay]);

  // I-save ang draft
  useEffect(() => {
    if (!draftKey || done || pay?.submitted || isAbaPayment(pay)) return;
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({ step, checks, intake, dsm, sign, guardian }));
    } catch {
      /* ignore */
    }
  }, [draftKey, step, checks, intake, dsm, sign, guardian, done, pay]);

  // Leave guard: hindi pwedeng umalis hangga't hindi pa tapos ang forms
  useEffect(() => {
    if (!guard) return;

    // 1) Pag-click ng kahit anong link palabas ng page
    const onClick = (ev) => {
      if (ev.defaultPrevented || ev.button !== 0) return;
      const a = ev.target.closest?.("a[href]");
      if (!a) return;
      const url = new URL(a.href, window.location.href);
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      ev.preventDefault();
      ev.stopPropagation();
      setLeaveWarn(true);
    };

    // 2) Refresh / close tab (ang browser mismo ang nagpapakita ng message)
    const onUnload = (ev) => {
      ev.preventDefault();
      ev.returnValue = "";
    };

    // 3) Browser Back button: ibalik sa page na ito at ipakita ang modal
    const onPop = () => {
      try {
        sessionStorage.setItem("tf_consent_warn", "1");
      } catch {
        /* ignore */
      }
      navigate(hereRef.current);
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("popstate", onPop);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("popstate", onPop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guard]);

  const setI = (k, v) => {
    setIntake((s) => ({ ...s, [k]: v }));
    setErrs((e) => ({ ...e, [k]: undefined, [k + "_details"]: undefined }));
  };

  const age = ageOf(intake.birthdate);
  const minor = age !== null && age < 18;

  const validators = [
    () => validateConsent(checks),
    () => validateIntake(intake),
    () => validateDsm(dsm),
    () => validateSign(sign, minor, guardian),
  ];

  const go = (n) => {
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const next = () => {
    const e = validators[step]();
    setErrs(e);
    if (Object.keys(e).length) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    go(step + 1);
  };

  const submit = async () => {
    if (submitting) return;
    const all = validators.map((v) => v());
    const firstBad = all.findIndex((e) => Object.keys(e).length);
    if (firstBad !== -1) {
      setErrs(all[firstBad]);
      go(firstBad);
      return;
    }

    setServerError("");
    setSubmitting(true);
    const i = intake;
    const emergency = [{ name: i.e1_name.trim(), relation: i.e1_relation.trim(), mobile: i.e1_mobile }];
    if (i.e2_name.trim() || i.e2_relation.trim() || i.e2_mobile) {
      emergency.push({ name: i.e2_name.trim(), relation: i.e2_relation.trim(), mobile: i.e2_mobile });
    }

    try {
      await apiFetch("/booking/consent", {
        method: "POST",
        body: JSON.stringify({
          intake: {
            full_name: i.full_name.trim(),
            nickname: i.nickname.trim() || null,
            gender: i.gender.trim() || null,
            civil_status: i.civil_status || null,
            birthdate: i.birthdate,
            address: i.address.trim(),
            mobile: i.mobile,
            email: i.email.trim(),
            occupation: i.occupation.trim() || null,
            heard_about: i.heard_about.trim() || null,
            emergency,
            reason: i.reason.trim(),
            duration_unit: i.duration_unit,
            goals: i.goals.trim(),
            prev_therapy: i.prev_therapy,
            prev_therapy_details: i.prev_therapy ? i.prev_therapy_details.trim() : null,
            diagnosed: i.diagnosed,
            diagnosed_details: i.diagnosed ? i.diagnosed_details.trim() : null,
            medications: i.medications,
            medications_details: i.medications ? i.medications_details.trim() : null,
            medical: i.medical,
            medical_details: i.medical ? i.medical_details.trim() : null,
          },
          consent: { read: true, confidentiality: true, crisis: true, fees: true, privacy: true },
          dsm5: dsm,
          sign: { name: sign.name.trim(), certify: true, signature_data: sign.signature },
          guardian: minor ? { name: guardian.name.trim(), relation: guardian.relation.trim(), signature_data: guardian.signature } : null,
        }),
      });
      try {
        sessionStorage.removeItem(draftKey);
      } catch {
        /* ignore */
      }
      update({ consentComplete: true });
      setDone(true);
      setTimeout(() => navigate(pay.approved ? "/book/confirmation" : "/book/approval", { replace: true }), 1200);
    } catch (err) {
      if (err.message?.includes("session expired")) return navigate("/signin");
      setServerError(err.message || "Could not submit your consent form. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- summary ---------- */
  const dateShort = pay
    ? new Date(pay.date + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";
  const summaryRows = [
    { label: "SERVICE", value: pay?.service_name || "—" },
    {
      label: "PSYCHOLOGIST",
      value: pay ? (isPsychotherapy ? pay.psychologist || "—" : "Assigned by the clinic") : "—",
    },
    {
      label: "DATE & TIME",
      value: pay ? `${dateShort} · ${to12(pay.start_time)} - ${to12(pay.end_time)}` : "—",
    },
  ];

  const status = pay?.submitted || done ? "Consent complete" : "Consent required";
  const e = errs;

  /* ---------- body ---------- */
  let body;

  if (!loaded) {
    body = (
      <div className="mt-8 flex items-center gap-3 text-sm text-[#5b6b64]">
        <span className="size-5 animate-spin rounded-full border-2 border-[#cfe3dc] border-t-tf-teal" aria-hidden />
        Loading your forms…
      </div>
    );
  } else if (loadError) {
    body = (
      <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</p>
    );
  } else if (!pay) {
    body = (
      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
        We could not find a booking.{" "}
        <Link to="/book" className="font-bold text-tf-teal underline">
          Book a session
        </Link>
      </div>
    );
  } else if (!pay.required) {
    body = <p className="mt-6 text-sm text-[#666]">No consent form is needed for this service. Redirecting…</p>;
  } else if (pay.rejected) {
    body = (
      <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900">
        This booking was rejected.{" "}
        <Link to="/book/approval" className="font-bold text-tf-teal underline">
          Check approval status
        </Link>
      </div>
    );
  } else if (!pay.approved) {
    body = (
      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
        The consent form opens after your appointment is approved.{" "}
        <Link to="/book/approval" className="font-bold text-tf-teal underline">
          Check approval status
        </Link>
      </div>
    );
  } else if (pay.submitted || done) {
    body = (
      <div className="mt-6 rounded-xl border border-tf-teal/40 bg-tf-soft px-5 py-5 text-sm text-tf-ink">
        <strong className="font-serif text-base">
          {done ? "Thank you. Your consent form was submitted." : "You already submitted your consent form."}
        </strong>
        <p className="m-0 mt-1">
          Your care team can now see it. {pay.approved ? "You may continue to your confirmation." : "Check your appointment approval status."}
        </p>
        <button
          type="button"
          className={`${btnSolid} mt-4`}
          onClick={() => navigate(pay.approved ? "/book/confirmation" : "/book/approval", { replace: true })}
        >
          {pay.approved ? "Continue to confirmation" : "Check approval status"}
        </button>
      </div>
    );
  } else if (isAba) {
    body = (
      <AbaConsentForm
        paymentId={pay.id}
        prefill={prefill}
        onComplete={() => {
          update({ consentComplete: true });
          setDone(true);
          setTimeout(() => navigate(pay.approved ? "/book/confirmation" : "/book/approval", { replace: true }), 1200);
        }}
      />
    );
  } else {
    body = (
      <>
        {/* Step indicator */}
        <ol className="m-0 mt-5 flex list-none flex-wrap gap-2 p-0">
          {STEPS.map((s, idx) => (
            <li
              key={s}
              className={`rounded-full px-3 py-1 text-xs font-bold ${idx === step
                ? "bg-[#1e4e41] text-white"
                : idx < step
                  ? "bg-tf-soft text-tf-teal"
                  : "bg-black/5 text-[#777]"
                }`}
            >
              {idx + 1}. {s}
            </li>
          ))}
        </ol>

        {Object.keys(e).length > 0 && (
          <p role="alert" className="mb-0 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Please fix the highlighted fields to continue.
            {e.checks && <> {e.checks}</>}
            {e.dsm && <> {e.dsm}</>}
          </p>
        )}

        {/* ---------- STEP 1: Consent ---------- */}
        {step === 0 && (
          <div className="mt-6">
            <article className="max-h-[420px] overflow-y-auto rounded-xl border border-black/10 bg-[#fbfdfc] p-5 text-sm leading-relaxed text-[#444]">
              <p className="m-0 text-center font-serif text-base font-bold text-[#202020]">
                CLIENT CONSENT AGREEMENT FOR PSYCHOTHERAPY SUPPORT
              </p>
              <p className="m-0 mt-1 text-center italic">Strictly Confidential</p>
              <p className="mt-3">
                Psychotherapy support (including counseling and psychological consultations) is a process of
                accompanying clients to clarify and manage their thoughts and feelings, and make healthy life
                decisions using integrative psychological approaches. As a client, your wellbeing is our utmost
                priority. By signing this document, you acknowledge your rights under the Philippine Psychology
                Act of 2009 (RA 10029) and the Data Privacy Act of 2012 (RA 10173).
              </p>

              <p className="mt-4 font-bold text-[#202020]">CONFIDENTIALITY &amp; RECORD-KEEPING</p>
              <p className="mt-1">
                All communications and records (brief session notes kept in secured storage) are strictly
                confidential. Information will only be released with your written permission, EXCEPT in the
                following situations where the professional is legally obligated to act:
              </p>
              <ul className="mt-1 list-disc pl-5">
                <li>Suspected abuse of a child, elderly, or disabled person.</li>
                <li>Threats of serious bodily harm to another person.</li>
                <li>
                  Threats of severe harm to yourself (suicide risk), requiring notification of family members or
                  protective services. <em>(These exceptions will be discussed with you before any action is taken.)</em>
                </li>
              </ul>

              <p className="mt-4 font-bold text-[#202020]">CRISIS AND EMERGENCY SUPPORT</p>
              <p className="mt-1">
                Threefold Behavioral Interventions and Psychological Services is <strong>NOT a 24/7 crisis support
                  facility</strong>. In the event of a severe mental health crisis, such as thoughts of suicide,
                self-harm, or being a danger to others, do not wait for your scheduled session.{" "}
                <strong>You must immediately go to the nearest hospital emergency department</strong> or contact a
                24/7 crisis hotline for medical support.
              </p>

              <p className="mt-4 font-bold text-[#202020]">CLIENT RIGHTS &amp; CLINIC POLICIES</p>
              <ul className="mt-1 list-disc pl-5">
                <li><strong>Diagnosis:</strong> Diagnoses are only formally provided upon your request following a comprehensive psychological assessment using standardized tests.</li>
                <li><strong>Therapy Process:</strong> You have the right to ask questions about the process, request alternative approaches, ask for a referral, or end therapy at any time.</li>
                <li><strong>Online Sessions:</strong> If sessions are conducted online, please be aware of inherent technical risks and privacy limitations of online platforms (e.g., Zoom, Google Meet), despite their security settings.</li>
                <li><strong>Disclaimer:</strong> The attending professional’s views, counseling techniques, and recommended interventions reflect their specific training and do not necessarily represent the overall corporate views of the clinic.</li>
              </ul>

              <p className="mt-4 font-bold text-[#202020]">RESPONSIBILITIES &amp; PROFESSIONAL FEES</p>
              <ul className="mt-1 list-disc pl-5">
                <li><strong>Punctuality:</strong> Arrive on time. Late arrivals will still end at the scheduled time. Sessions last 60 minutes (extendable by 15 mins). Additional fees apply for sessions reaching 1.5 hours.</li>
                <li><strong>Commitment:</strong> Your active cooperation and willingness to take action are major factors in the outcome of your therapy.</li>
                <li><strong>Cancellations:</strong> Notify the professional at least one (1) day in advance if you cannot attend. Cancellations without prior notice may be charged as a paid session. Emergency cancellations must be rescheduled within two (2) weeks.</li>
              </ul>

              <p className="mt-4 font-bold text-[#202020]">DATA PRIVACY CONSENT</p>
              <p className="mt-1">
                Under the Data Privacy Act (RA 10173), I authorize the clinic to collect, process, and retain my
                personal data strictly for evaluating and providing psychotherapy support. My personal information
                will be kept under strict confidentiality and will not be disclosed without my consent.
              </p>

              <p className="mt-4 font-bold text-[#202020]">CLIENT ATTESTATION &amp; CONSENT</p>
              <p className="mt-1">
                I have read, understood, and had sufficient time to carefully consider this agreement. I understand
                my rights, responsibilities, and the limits to confidentiality.
              </p>
              <ul className="mt-1 list-disc pl-5">
                <li>I agree to undertake psychotherapy support and understand I can end it at any time.</li>
                <li>I understand that in case of an emergency or mental health crisis, I will go to the nearest hospital emergency clinic to receive immediate support.</li>
                <li>I understand I am guided by the support process but remain capable of making my own choices. I do NOT hold Threefold Behavioral Interventions and Psychological Services liable for my personal actions and decisions.</li>
              </ul>
            </article>

            <div className="mt-5 flex flex-col gap-3">
              {CHECKS.map((c) => (
                <label
                  key={c.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm ${e.checks && !checks[c.id] ? "border-red-300" : "border-black/10"
                    }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 size-5 shrink-0 accent-tf-teal"
                    checked={!!checks[c.id]}
                    onChange={(ev) => {
                      setChecks((s) => ({ ...s, [c.id]: ev.target.checked }));
                      setErrs((x) => ({ ...x, checks: undefined }));
                    }}
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ---------- STEP 2: Intake ---------- */}
        {step === 1 && (
          <div className="mt-6 flex flex-col gap-4">
            <div>
              <h3 className="m-0 font-serif text-lg font-normal text-[#202020]">Psychotherapy Intake Form</h3>
              <p className="m-0 mt-1 text-sm italic text-[#666]">
                Strictly confidential. Please fill this out as completely as possible. It helps your attending
                professional better understand your needs.
              </p>
            </div>

            <p className={sectionTitle}>SECTION 1: GENERAL INFORMATION</p>
            <Field label="Full name" error={e.full_name}>
              <input
                className={`${inputClass} ${e.full_name ? inputErr : ""}`}
                value={intake.full_name}
                maxLength={150}
                onChange={(ev) => setI("full_name", ev.target.value.replace(NAME_STRIP, ""))}
              />
            </Field>
            <div className="grid grid-cols-3 gap-4 max-[720px]:grid-cols-1">
              <Field label="Nickname" required={false}>
                <input className={inputClass} value={intake.nickname} maxLength={60} onChange={(ev) => setI("nickname", ev.target.value)} />
              </Field>
              <Field label="Gender / pronouns" required={false}>
                <input className={inputClass} value={intake.gender} maxLength={60} placeholder="e.g. Female, she/her" onChange={(ev) => setI("gender", ev.target.value)} />
              </Field>
              <Field label="Civil status" required={false}>
                <select className={inputClass} value={intake.civil_status} onChange={(ev) => setI("civil_status", ev.target.value)}>
                  <option value="">Select…</option>
                  {["Single", "Married", "Separated", "Divorced", "Widowed", "Other"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4 max-[720px]:grid-cols-1">
              <Field label="Date of birth" error={e.birthdate}>
                <input
                  type="date"
                  min="1900-01-01"
                  max={todayStr()}
                  className={`${inputClass} ${e.birthdate ? inputErr : ""}`}
                  value={intake.birthdate}
                  onChange={(ev) => setI("birthdate", ev.target.value)}
                />
              </Field>
              <Field label="Age" required={false}>
                <input className={inputClass} value={age !== null && age >= 0 ? age : ""} disabled readOnly placeholder="Auto" />
              </Field>
            </div>
            <Field label="Complete address" error={e.address}>
              <input
                className={`${inputClass} ${e.address ? inputErr : ""}`}
                value={intake.address}
                maxLength={255}
                onChange={(ev) => setI("address", ev.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4 max-[720px]:grid-cols-1">
              <Field label="Mobile number" hint="11 digits" error={e.mobile}>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="09123456789"
                  className={`${inputClass} ${e.mobile ? inputErr : ""}`}
                  value={intake.mobile}
                  onChange={(ev) => setI("mobile", digits11(ev.target.value))}
                />
              </Field>
              <Field label="Email address" error={e.email}>
                <input
                  type="email"
                  placeholder="name@gmail.com"
                  className={`${inputClass} ${e.email ? inputErr : ""}`}
                  value={intake.email}
                  onChange={(ev) => setI("email", ev.target.value.replace(/\s/g, ""))}
                />
              </Field>
            </div>
            <Field label="Occupation / grade level (if student)" required={false}>
              <input className={inputClass} value={intake.occupation} maxLength={120} onChange={(ev) => setI("occupation", ev.target.value)} />
            </Field>
            <Field label="How did you hear about our clinic?" required={false}>
              <input className={inputClass} value={intake.heard_about} maxLength={190} onChange={(ev) => setI("heard_about", ev.target.value)} />
            </Field>

            <p className={`${sectionTitle} mt-4`}>SECTION 2: EMERGENCY CONTACT INFORMATION</p>
            <p className="m-0 text-xs italic text-[#666]">
              Someone we may contact in the event of a medical or mental health emergency.
            </p>
            <p className="m-0 font-serif text-sm font-bold text-[#202020]">Contact (1)</p>
            <div className="grid grid-cols-3 gap-4 max-[720px]:grid-cols-1">
              <Field label="Name" error={e.e1_name}>
                <input className={`${inputClass} ${e.e1_name ? inputErr : ""}`} value={intake.e1_name} maxLength={150} onChange={(ev) => setI("e1_name", ev.target.value.replace(NAME_STRIP, ""))} />
              </Field>
              <Field label="Relationship to client" error={e.e1_relation}>
                <input className={`${inputClass} ${e.e1_relation ? inputErr : ""}`} value={intake.e1_relation} maxLength={60} onChange={(ev) => setI("e1_relation", ev.target.value.replace(NAME_STRIP, ""))} />
              </Field>
              <Field label="Mobile number" hint="11 digits" error={e.e1_mobile}>
                <input type="tel" inputMode="numeric" maxLength={11} className={`${inputClass} ${e.e1_mobile ? inputErr : ""}`} value={intake.e1_mobile} onChange={(ev) => setI("e1_mobile", digits11(ev.target.value))} />
              </Field>
            </div>
            <p className="m-0 font-serif text-sm font-bold text-[#202020]">
              Contact (2) <span className="font-sans text-xs font-normal text-[#666]">optional</span>
            </p>
            <div className="grid grid-cols-3 gap-4 max-[720px]:grid-cols-1">
              <Field label="Name" required={false} error={e.e2_name}>
                <input className={`${inputClass} ${e.e2_name ? inputErr : ""}`} value={intake.e2_name} maxLength={150} onChange={(ev) => setI("e2_name", ev.target.value.replace(NAME_STRIP, ""))} />
              </Field>
              <Field label="Relationship to client" required={false} error={e.e2_relation}>
                <input className={`${inputClass} ${e.e2_relation ? inputErr : ""}`} value={intake.e2_relation} maxLength={60} onChange={(ev) => setI("e2_relation", ev.target.value.replace(NAME_STRIP, ""))} />
              </Field>
              <Field label="Mobile number" required={false} hint="11 digits" error={e.e2_mobile}>
                <input type="tel" inputMode="numeric" maxLength={11} className={`${inputClass} ${e.e2_mobile ? inputErr : ""}`} value={intake.e2_mobile} onChange={(ev) => setI("e2_mobile", digits11(ev.target.value))} />
              </Field>
            </div>

            <p className={`${sectionTitle} mt-4`}>SECTION 3: REASON FOR SEEKING SUPPORT</p>
            <Field label="In your own words, what is the main reason you are seeking psychotherapy today?" error={e.reason}>
              <textarea
                rows={3}
                maxLength={2000}
                className={`${inputClass} resize-y ${e.reason ? inputErr : ""}`}
                value={intake.reason}
                onChange={(ev) => setI("reason", ev.target.value)}
              />
            </Field>
            <div>
              <p className="m-0 font-serif text-[0.85rem] font-bold text-[#202020]">
                How long have you been experiencing these concerns? <span className="text-red-500">*</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[["days", "Days"], ["weeks", "Weeks"], ["months", "Months"], ["years", "Years"]].map(([v, t]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setI("duration_unit", v)}
                    className={`cursor-pointer rounded-lg border px-4 py-1.5 font-serif text-sm ${intake.duration_unit === v ? "border-tf-teal bg-tf-soft font-bold" : "border-black/15 bg-white hover:border-tf-teal"
                      }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {e.duration_unit && <p className="m-0 mt-1 text-xs text-red-600">{e.duration_unit}</p>}
            </div>
            <Field label="What are your goals for therapy? What would you like to achieve?" error={e.goals}>
              <textarea
                rows={3}
                maxLength={2000}
                className={`${inputClass} resize-y ${e.goals ? inputErr : ""}`}
                value={intake.goals}
                onChange={(ev) => setI("goals", ev.target.value)}
              />
            </Field>

            <p className={`${sectionTitle} mt-4`}>SECTION 4: MEDICAL &amp; MENTAL HEALTH HISTORY</p>
            <YesNo
              label="Have you previously received psychotherapy or counseling?"
              value={intake.prev_therapy}
              onChange={(v) => setI("prev_therapy", v)}
              details={intake.prev_therapy_details}
              onDetails={(v) => setI("prev_therapy_details", v)}
              detailLabel="When and for what reason?"
              error={e.prev_therapy}
              detailError={e.prev_therapy_details}
            />
            <YesNo
              label="Have you ever been formally diagnosed with a mental health condition?"
              value={intake.diagnosed}
              onChange={(v) => setI("diagnosed", v)}
              details={intake.diagnosed_details}
              onDetails={(v) => setI("diagnosed_details", v)}
              detailLabel="Please specify"
              error={e.diagnosed}
              detailError={e.diagnosed_details}
            />
            <YesNo
              label="Are you currently taking any prescription medications (for physical or mental health)?"
              value={intake.medications}
              onChange={(v) => setI("medications", v)}
              details={intake.medications_details}
              onDetails={(v) => setI("medications_details", v)}
              detailLabel="Please list them"
              error={e.medications}
              detailError={e.medications_details}
            />
            <YesNo
              label="Do you have any significant medical conditions or recent major surgeries?"
              value={intake.medical}
              onChange={(v) => setI("medical", v)}
              details={intake.medical_details}
              onDetails={(v) => setI("medical_details", v)}
              detailLabel="Please list them"
              error={e.medical}
              detailError={e.medical_details}
            />
          </div>
        )}

        {/* ---------- STEP 3: DSM-5 ---------- */}
        {step === 2 && (
          <div className="mt-6">
            <h3 className="m-0 font-serif text-lg font-normal text-[#202020]">
              DSM-5 Self-Rated Level 1 Cross-Cutting Symptom Measure
            </h3>
            <p className="m-0 mt-1 text-sm text-[#666]">
              The questions below ask about things that might have bothered you. For each question, choose how much
              (or how often) you have been bothered by each problem during the past <strong>TWO (2) WEEKS</strong>.
            </p>
            <p className="m-0 mt-2 text-xs font-bold text-tf-teal">
              {dsm.filter((x) => x !== null).length} of 23 answered
            </p>
            <div className="mt-4 flex flex-col gap-3">
              {DSM5_QUESTIONS.map((q, idx) => (
                <DsmRow
                  key={idx}
                  n={idx + 1}
                  text={q}
                  value={dsm[idx]}
                  onPick={(v) => {
                    setDsm((a) => a.map((x, j) => (j === idx ? v : x)));
                    setErrs((x) => ({ ...x, dsm: undefined }));
                  }}
                />
              ))}
            </div>
            <p className="mt-4 mb-0 rounded-lg bg-black/[0.03] px-4 py-3 text-xs text-[#666]">
              If you are having thoughts of hurting yourself, please do not wait for your session. Go to the nearest
              hospital emergency department or contact a 24/7 crisis hotline right away.
            </p>
          </div>
        )}

        {/* ---------- STEP 4: Sign ---------- */}
        {step === 3 && (
          <div className="mt-6 flex flex-col gap-4">
            <div>
              <h3 className="m-0 font-serif text-lg font-normal text-[#202020]">Acknowledgment &amp; signature</h3>
              <p className="m-0 mt-1 text-sm text-[#666]">
                This signature covers your Consent Agreement, Intake Form and Symptom Checklist.
              </p>
            </div>

            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm ${e.certify ? "border-red-300" : "border-black/10"
                }`}
            >
              <input
                type="checkbox"
                className="mt-0.5 size-5 shrink-0 accent-tf-teal"
                checked={sign.certify}
                onChange={(ev) => {
                  setSign((s) => ({ ...s, certify: ev.target.checked }));
                  setErrs((x) => ({ ...x, certify: undefined }));
                }}
              />
              <span>I certify that the information provided on these forms is true and accurate to the best of my knowledge.</span>
            </label>
            {e.certify && <p className="m-0 -mt-2 text-xs text-red-600">{e.certify}</p>}

            <div className="grid grid-cols-2 gap-4 max-[560px]:grid-cols-1">
              <Field label="Client’s printed name" error={e.name}>
                <input
                  className={`${inputClass} ${e.name ? inputErr : ""}`}
                  value={sign.name}
                  maxLength={150}
                  placeholder="Type your full name"
                  onChange={(ev) => {
                    setSign((s) => ({ ...s, name: ev.target.value.replace(NAME_STRIP, "") }));
                    setErrs((x) => ({ ...x, name: undefined }));
                  }}
                />
              </Field>
              <Field label="Date" required={false}>
                <input type="date" className={inputClass} value={todayStr()} disabled readOnly />
              </Field>
            </div>

            <SignaturePad
              label="Client’s Digital Signature"
              value={sign.signature}
              onChange={(sig) => {
                setSign((s) => ({ ...s, signature: sig }));
                setErrs((x) => ({ ...x, signature: undefined }));
              }}
              error={e.signature}
            />

            {minor && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="m-0 text-sm text-amber-900">
                  The client is under 18 years old. A parent or legal guardian must provide consent for the minor to
                  participate in psychotherapy support as outlined in this agreement.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-4 max-[560px]:grid-cols-1">
                  <Field label="Parent / guardian’s printed name" error={e.g_name}>
                    <input
                      className={`${inputClass} ${e.g_name ? inputErr : ""}`}
                      value={guardian.name}
                      maxLength={150}
                      onChange={(ev) => {
                        setGuardian((g) => ({ ...g, name: ev.target.value.replace(NAME_STRIP, "") }));
                        setErrs((x) => ({ ...x, g_name: undefined }));
                      }}
                    />
                  </Field>
                  <Field label="Relationship to minor" error={e.g_relation}>
                    <input
                      className={`${inputClass} ${e.g_relation ? inputErr : ""}`}
                      value={guardian.relation}
                      maxLength={60}
                      onChange={(ev) => {
                        setGuardian((g) => ({ ...g, relation: ev.target.value.replace(NAME_STRIP, "") }));
                        setErrs((x) => ({ ...x, g_relation: undefined }));
                      }}
                    />
                  </Field>
                </div>
                <div className="mt-4">
                  <SignaturePad
                    label="Parent / Guardian Digital Signature"
                    value={guardian.signature}
                    onChange={(sig) => {
                      setGuardian((g) => ({ ...g, signature: sig }));
                      setErrs((x) => ({ ...x, g_signature: undefined }));
                    }}
                    error={e.g_signature}
                  />
                </div>
              </div>
            )}

            {serverError && (
              <p role="alert" className="m-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {serverError}
              </p>
            )}
          </div>
        )}

        {/* ---------- nav ---------- */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-dashed border-[#d0e5dd] pt-5">
          {step === 0 ? (
            <span />
          ) : (
            <button type="button" className={btnGhost} onClick={() => go(step - 1)}>
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" className={btnSolid} onClick={next}>
              Next
            </button>
          ) : (
            <button type="button" className={`${btnSolid} disabled:opacity-55`} disabled={submitting} onClick={submit}>
              {submitting ? "Submitting…" : "Submit forms"}
            </button>
          )}
        </div>
      </>
    );
  }

  return (
    <div className={pageShell}>
      <Navbar />
      <main className={mainPad}>
        <div className={container}>
          <Reveal>
            <StepRail current={4} />
          </Reveal>
          <div className={gridClass}>
            <Reveal className={panelClass} delay={140}>
              <header>
                <h2 className="m-0 mb-1.5 font-serif text-[1.4rem] font-normal text-[#202020]">
                  {!loaded
                    ? "Loading consent form…"
                    : isAba
                      ? "ABA consent form"
                      : "Consent & intake forms"}
                </h2>
                <p className="m-0 text-sm text-[#666]">
                  {!loaded
                    ? "Loading your booking details…"
                    : isAba
                    ? "Please complete the ABA consent form after your appointment is approved. Your answers are confidential and visible to your care team."
                    : isPsychotherapy
                      ? "Please complete the Psychotherapy consent and intake forms after your appointment is approved. Your answers are confidential and visible to your psychologist."
                      : "Please complete these forms now that your appointment has been approved. Your answers are confidential and only visible to your psychologist."}
                </p>
              </header>
              {body}
            </Reveal>

            <Reveal delay={200}>
              <BookingSummary
                step={5}
                title={pay?.service_name || "Booking"}
                rows={summaryRows}
                fee={pay ? peso(pay.total_amount) : "—"}
                status={status}
              />
            </Reveal>
          </div>
        </div>
      </main>
      <Footer />

      {leaveWarn && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="leave-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 id="leave-title" className="m-0 font-serif text-xl text-[#202020]">
              {isAba ? "Please complete the ABA consent first" : "Please complete your forms first"}
            </h3>
            <p className="mb-0 mt-3 text-sm leading-relaxed text-[#555]">
              {isAba
                ? <>The ABA consent form is <strong>required</strong> before your appointment can proceed. Your progress is saved as you go.</>
                : <>The consent and intake forms are <strong>required</strong> before your appointment can proceed. Please answer all of them so you can continue. Your answers are saved as you go.</>}
            </p>
            <div className="mt-6 flex justify-end">
              <button type="button" className={btnSolid} onClick={() => setLeaveWarn(false)}>
                Continue answering
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}