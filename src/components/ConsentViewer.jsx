import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../auth";
import { DSM5_OPTIONS, DSM5_QUESTIONS, domainResults } from "./dsm5";
import AbaConsentDocument from "./AbaConsentDocument";

const inter = "font-['Inter',Helvetica,sans-serif]";
const serif = "font-['Inria_Serif',Georgia,serif]";
// Font ng mismong papel (kapareho ng PDF forms)
const doc = "font-['Times_New_Roman',Times,serif]";

// Ilagay dito ang path ng logo ng clinic kung meron (hal. "/images/threefold-logo.png")
const LOGO_SRC = "";

const CLINIC = {
    name: "THREEFOLD",
    tagline: "BEHAVIORAL INTERVENTIONS AND PSYCHOLOGICAL SERVICES",
    address: "16 Dr. Sixto Antonio Avenue, Kapasigan, Pasig, Philippines, 1600",
    phone: "0961 837 6345",
    email: "threefoldpsychological@gmail.com",
};

const TABS = [
    ["consent", "Consent agreement"],
    ["intake", "Intake form"],
    ["dsm", "DSM-5 checklist"],
];

// Mga domain ng DSM-5 Level 1 (0-based na index ng mga tanong)
const DOMAINS = [
    ["I", 0, 1],
    ["II", 2, 2],
    ["III", 3, 4],
    ["IV", 5, 7],
    ["V", 8, 9],
    ["VI", 10, 10],
    ["VII", 11, 12],
    ["VIII", 13, 13],
    ["IX", 14, 14],
    ["X", 15, 16],
    ["XI", 17, 17],
    ["XII", 18, 19],
    ["XIII", 20, 22],
];

const SCALE = [
    ["None", "Not at all"],
    ["Slight", "Rare, less than a day or two"],
    ["Mild", "Several days"],
    ["Moderate", "More than half the days"],
    ["Severe", "Nearly every day"],
];

const fmtDate = (s, opts = { month: "long", day: "numeric", year: "numeric" }) =>
    s ? new Date(s.length === 10 ? s + "T00:00" : s).toLocaleDateString("en-US", opts) : "";

const mdy = (s) => fmtDate(s, { month: "2-digit", day: "2-digit", year: "numeric" });

/* ------------------------------------------------------------------ */
/*  Building blocks ng papel                                           */
/* ------------------------------------------------------------------ */
function Letterhead() {
    return (
        <div>
            <div className="h-[10px] bg-[#7c9f7a]" />
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 pb-4 pt-5 sm:px-10">
                <div className="flex items-center gap-3">
                    {LOGO_SRC && <img src={LOGO_SRC} alt="" className="h-[58px] w-auto" />}
                    <div className="border-l-[3px] border-[#7c9f7a] pl-3">
                        <div className={`${inter} text-[28px] font-bold leading-none tracking-[0.5px] text-[#2f5560]`}>{CLINIC.name}</div>
                        <div className={`${inter} mt-1 max-w-[210px] text-[8.5px] font-semibold leading-[1.2] text-[#4a7a70]`}>
                            {CLINIC.tagline}
                        </div>
                    </div>
                </div>
                <div className={`${inter} text-[12px] font-semibold leading-[1.7] text-[#3f7f73]`}>
                    <div>{CLINIC.address}</div>
                    <div>{CLINIC.phone}</div>
                    <div>{CLINIC.email}</div>
                </div>
            </div>
            <div className="mx-6 h-[6px] bg-[#2f5560] sm:mx-10" />
        </div>
    );
}

function Paper({ title, subtitle, children, footer }) {
    return (
        <article className={`${doc} mx-auto max-w-[820px] bg-white text-[14px] leading-[1.45] text-black shadow-[0_1px_6px_rgba(0,0,0,0.18)]`}>
            <Letterhead />
            <div className="px-6 pb-6 pt-6 sm:px-12">
                <h2 className="m-0 text-center text-[20px] font-bold tracking-[0.2px]">{title}</h2>
                {subtitle && <p className="m-0 mt-1 text-center italic">{subtitle}</p>}
                <div className="mt-4">{children}</div>
            </div>
            <div className="flex items-center justify-end border-t border-black/10 px-6 py-2 text-[11px] font-bold sm:px-12">{footer || title}</div>
        </article>
    );
}

// Label + sagot na may linya sa ilalim (parang fill-in na form)
function Field({ label, value, className = "" }) {
    return (
        <div className={`flex min-w-0 items-baseline gap-2 ${className}`}>
            <span className="shrink-0 font-bold">{label}</span>
            <span className="min-h-[1.5em] min-w-0 flex-1 break-words border-b border-black px-1">{value || "\u00A0"}</span>
        </div>
    );
}

function Box({ checked, label }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex h-[15px] w-[15px] items-center justify-center border border-black text-[12px] font-bold leading-none">
                {checked ? "✓" : ""}
            </span>
            {label}
        </span>
    );
}

function Heading({ children, note }) {
    return (
        <h3 className="m-0 mb-2 mt-5 text-[14px] font-bold first:mt-0">
            {children}
            {note && <span className="font-normal italic"> {note}</span>}
        </h3>
    );
}

// Maliit na marka para sa admin: tinanggap ba ng client ang seksyon
function Accepted({ ok }) {
    return (
        <span
            className={`${inter} ml-2 inline-block rounded-full px-2 py-[1px] align-middle text-[10px] font-semibold ${ok ? "bg-[#e3f2ee] text-[#2a8570]" : "bg-red-100 text-red-700"
                }`}
        >
            {ok ? "✓ Accepted" : "Not accepted"}
        </span>
    );
}

function Signature({ img, name, date, alt }) {
    return (
        <div className="mt-6 w-full max-w-[380px]">
            <div className="flex min-h-[64px] items-end">
                {img && <img src={img} alt={alt} className="max-h-[64px] max-w-full object-contain" />}
            </div>
            <div className="border-t border-black pt-1">
                <div className="min-h-[1.4em]">
                    {name}
                    {date ? ` / ${date}` : ""}
                </div>
                <div className="text-[13px]">Client’s Printed Name &amp; Signature / Date</div>
            </div>
        </div>
    );
}

function MinorBlock({ clientName, data }) {
    const g = data.guardian || {};
    const sig = data.guardian_signature_data || data.agreements?.guardian_signature_data;
    return (
        <div className="mt-6 border-t border-dashed border-black/40 pt-4">
            <p className="m-0 text-[13px]">
                <em>(If the client is under 18 years of age)</em> I am the parent or legal guardian of the minor client named below. I hereby
                provide consent for the minor to participate in psychotherapy support as outlined in this agreement.
            </p>
            <div className="mt-3 flex flex-col gap-3">
                <Field label="Minor Client’s Printed Name:" value={clientName} />
                <div className="mt-2 w-full max-w-[460px]">
                    <div className="flex min-h-[64px] items-end">
                        {sig && <img src={sig} alt="Parent or guardian signature" className="max-h-[64px] max-w-full object-contain" />}
                    </div>
                    <div className="border-t border-black pt-1">
                        <div className="min-h-[1.4em]">
                            {g.name}
                            {data.signed_date ? ` / ${fmtDate(data.signed_date)}` : ""}
                        </div>
                        <div className="text-[13px]">Parent / Guardian’s Printed Name &amp; Signature / Date</div>
                    </div>
                </div>
                <Field label="Relationship to Minor:" value={g.relation} className="max-w-[460px]" />
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Consent agreement                                                  */
/* ------------------------------------------------------------------ */
function ConsentPaper({ data, clientName }) {
    const a = data.agreements || {};
    const sig = data.signature_data || a.signature_data;
    const T = "CLIENT CONSENT AGREEMENT FOR PSYCHOTHERAPY SUPPORT";

    return (
        <Paper title={T} subtitle="Strictly Confidential">
            <p className="m-0">
                Psychotherapy support (including counseling and psychological consultations) is a process of accompanying clients to clarify
                and manage their thoughts and feelings, and make healthy life decisions using integrative psychological approaches. As a
                client, your wellbeing is our utmost priority. By signing this document, you acknowledge your rights under the Philippine
                Psychology Act of 2009 (RA 10029) and the Data Privacy Act of 2012 (RA 10173).
                <Accepted ok={a.read} />
            </p>

            <Heading>
                CONFIDENTIALITY &amp; RECORD-KEEPING <Accepted ok={a.confidentiality} />
            </Heading>
            <p className="m-0">
                All communications and records (brief session notes kept in secured storage) are strictly confidential. Information will only be
                released with your written permission, <strong>EXCEPT</strong> in the following situations where the professional is legally
                obligated to act:
            </p>
            <ul className="mb-0 mt-2 list-disc pl-8">
                <li>Suspected abuse of a child, elderly, or disabled person.</li>
                <li>Threats of serious bodily harm to another person.</li>
                <li>
                    Threats of severe harm to yourself (suicide risk), requiring notification of family members or protective services.{" "}
                    <em>(Note: These exceptions will be discussed with you before any action is taken.)</em>
                </li>
            </ul>

            <Heading>
                CRISIS AND EMERGENCY SUPPORT <Accepted ok={a.crisis} />
            </Heading>
            <p className="m-0">
                Please be advised that Threefold Behavioral Interventions and Psychological Services <strong>is NOT a 24/7 crisis support facility</strong>. In
                the event of a severe mental health crisis, such as thoughts of suicide, self-harm, or being a danger to others, do not wait
                for your scheduled session. <strong>You must immediately go to the nearest hospital emergency department</strong> or contact a 24/7
                crisis hotline for medical support.
            </p>

            <Heading>CLIENT RIGHTS &amp; CLINIC POLICIES</Heading>
            <ul className="m-0 list-disc pl-8">
                <li>
                    <strong>Diagnosis:</strong> Diagnoses are only formally provided upon your request following a comprehensive psychological
                    assessment using standardized tests.
                </li>
                <li>
                    <strong>Therapy Process:</strong> You have the right to ask questions about the process, request alternative approaches, ask
                    for a referral, or end therapy at any time.
                </li>
                <li>
                    <strong>Online Sessions:</strong> If sessions are conducted online, please be aware of inherent technical risks and privacy
                    limitations of online platforms (e.g., Zoom, Google Meet), despite their security settings.
                </li>
                <li>
                    <strong>Disclaimer:</strong> The attending professional’s views, counseling techniques, and recommended interventions reflect
                    their specific training and do not necessarily represent the overall corporate views of the clinic.
                </li>
            </ul>

            <Heading>
                RESPONSIBILITIES &amp; PROFESSIONAL FEES <Accepted ok={a.fees} />
            </Heading>
            <ul className="m-0 list-disc pl-8">
                <li>
                    <strong>Punctuality:</strong> Arrive on time. Late arrivals will still end at the scheduled time. Sessions last 60 minutes
                    (extendable by 15 mins). Additional fees apply for sessions reaching 1.5 hours.
                </li>
                <li>
                    <strong>Commitment:</strong> Your active cooperation and willingness to take action are major factors in the outcome of your
                    therapy.
                </li>
                <li>
                    <strong>Cancellations:</strong> Notify the professional at least one (1) day in advance if you cannot attend. Cancellations
                    without prior notice may be charged as a paid session. Emergency cancellations must be rescheduled within two (2) weeks.
                </li>
            </ul>

            <Heading>
                DATA PRIVACY CONSENT <Accepted ok={a.privacy} />
            </Heading>
            <p className="m-0">
                Under the Data Privacy Act (RA 10173), I authorize the clinic to collect, process, and retain my personal data strictly for
                evaluating and providing psychotherapy support. My personal information will be kept under strict confidentiality and will not
                be disclosed without my consent.
            </p>

            <Heading>CLIENT ATTESTATION &amp; CONSENT</Heading>
            <p className="m-0">
                I have read, understood, and had sufficient time to carefully consider this agreement. I understand my rights,
                responsibilities, and the limits to confidentiality.
            </p>
            <ul className="mb-0 mt-2 list-disc pl-8">
                <li>I agree to undertake psychotherapy support and understand I can end it at any time.</li>
                <li>
                    I understand that in case of an emergency or mental health crisis, I will go to the nearest hospital emergency clinic to
                    receive immediate support.
                </li>
                <li>
                    I understand I am guided by the support process but remain capable of making my own choices. I do NOT hold Threefold
                    Behavioral Interventions and Psychological Services liable for my personal actions and decisions.
                </li>
            </ul>

            <Signature img={sig} name={data.signed_name} date={fmtDate(data.signed_date)} alt="Client signature" />

            {data.is_minor && <MinorBlock clientName={clientName} data={data} />}
        </Paper>
    );
}

/* ------------------------------------------------------------------ */
/*  Intake form                                                        */
/* ------------------------------------------------------------------ */
function IntakePaper({ data }) {
    const i = data.intake || {};
    const contacts = [0, 1].map((n) => (i.emergency || [])[n] || {});
    const sig = data.signature_data || data.agreements?.signature_data;
    const units = [
        ["days", "Days"],
        ["weeks", "Weeks"],
        ["months", "Months"],
        ["years", "Years"],
    ];

    const YesNo = ({ q, yes, details, ifYes }) => (
        <div className="mt-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>{q}</span>
                <Box checked={!!yes} label="Yes" />
                <Box checked={!yes} label="No" />
            </div>
            <Field label={ifYes} value={yes ? details : ""} className="mt-1.5" />
        </div>
    );

    return (
        <Paper title="PSYCHOTHERAPY INTAKE FORM" subtitle="Strictly Confidential">
            <p className="m-0 italic">
                Please fill out this form as completely as possible. The information you provide is strictly confidential and will help your
                attending professional better understand your needs.
            </p>

            <Heading>SECTION 1: GENERAL INFORMATION</Heading>
            <div className="flex flex-col gap-3">
                <Field label="Full Name:" value={i.full_name} />
                <div className="flex flex-wrap gap-x-5 gap-y-3">
                    <Field label="Nickname:" value={i.nickname} className="min-w-[160px] flex-1" />
                    <Field label="Gender / Pronouns:" value={i.gender} className="min-w-[160px] flex-1" />
                    <Field label="Civil Status:" value={i.civil_status} className="min-w-[160px] flex-1" />
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-3">
                    <Field label="Date of Birth: (MM/DD/YYYY)" value={mdy(i.birthdate)} className="min-w-[260px] flex-[2]" />
                    <Field label="Age:" value={i.age} className="min-w-[100px] flex-1" />
                </div>
                <Field label="Complete Address:" value={i.address} />
                <div className="flex flex-wrap gap-x-5 gap-y-3">
                    <Field label="Mobile Number:" value={i.mobile} className="min-w-[220px] flex-1" />
                    <Field label="Email Address:" value={i.email} className="min-w-[220px] flex-1" />
                </div>
                <Field label="Occupation / Grade Level (if student):" value={i.occupation} />
                <Field label="How did you hear about our clinic?" value={i.heard_about} />
            </div>

            <Heading note="(Please provide the name of someone we may contact in the event of a medical or mental health emergency.)">
                SECTION 2: EMERGENCY CONTACT INFORMATION
            </Heading>
            <div className="flex flex-col gap-5 pl-2 sm:pl-6">
                {contacts.map((c, idx) => (
                    <div key={idx} className="flex gap-2">
                        <span className="shrink-0">({idx + 1})</span>
                        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                            <Field label="Emergency Contact Name:" value={c.name} />
                            <Field label="Relationship to Client:" value={c.relation} />
                            <Field label="Mobile Number:" value={c.mobile} />
                        </div>
                    </div>
                ))}
            </div>

            <Heading>SECTION 3: REASON FOR SEEKING SUPPORT</Heading>
            <p className="m-0">In your own words, what is the main reason you are seeking psychotherapy today?</p>
            <p className="m-0 mt-1 min-h-[3em] whitespace-pre-wrap break-words border-b border-black px-1">{i.reason}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>How long have you been experiencing these concerns?</span>
                {units.map(([k, label]) => (
                    <Box key={k} checked={i.duration_unit === k} label={label} />
                ))}
            </div>
            <p className="m-0 mt-3">What are your goals for therapy? What would you like to achieve?</p>
            <p className="m-0 mt-1 min-h-[3em] whitespace-pre-wrap break-words border-b border-black px-1">{i.goals}</p>

            <Heading>SECTION 4: MEDICAL &amp; MENTAL HEALTH HISTORY</Heading>
            <YesNo q="Have you previously received psychotherapy or counseling?" yes={i.prev_therapy} details={i.prev_therapy_details} ifYes="If yes, when and for what reason?" />
            <YesNo q="Have you ever been formally diagnosed with a mental health condition?" yes={i.diagnosed} details={i.diagnosed_details} ifYes="If yes, please specify:" />
            <YesNo q="Are you currently taking any prescription medications (for physical or mental health)?" yes={i.medications} details={i.medications_details} ifYes="If yes, please list them:" />
            <YesNo q="Do you have any significant medical conditions or recent major surgeries?" yes={i.medical} details={i.medical_details} ifYes="If yes, please list them:" />

            <Heading>SECTION 5: ACKNOWLEDGMENT</Heading>
            <p className="m-0">I certify that the information provided on this form is true and accurate to the best of my knowledge.</p>
            <Signature img={sig} name={data.signed_name} date={fmtDate(data.signed_date)} alt="Client signature" />

            {data.is_minor && <MinorBlock clientName={i.full_name} data={data} />}
        </Paper>
    );
}

/* ------------------------------------------------------------------ */
/*  DSM-5 Level 1                                                      */
/* ------------------------------------------------------------------ */
function DsmPaper({ data, results, clientName }) {
    const i = data.intake || {};
    const ans = data.dsm5 || [];

    return (
        <Paper
            title="DSM-5 Self-Rated Level 1 Cross-Cutting Symptom Measure—Adult"
            footer="Copyright © 2013 American Psychiatric Association. All Rights Reserved."
        >
            <div className="flex flex-wrap gap-x-5 gap-y-3">
                <Field label="Name:" value={clientName} className="min-w-[240px] flex-[3]" />
                <Field label="Age:" value={i.age} className="min-w-[80px] flex-1" />
                <Field label="Date:" value={fmtDate(data.submitted_at, { month: "2-digit", day: "2-digit", year: "numeric" })} className="min-w-[140px] flex-1" />
            </div>

            <p className="mb-0 mt-4 text-[13px]">
                <strong>Instructions:</strong> The questions below ask about things that might have bothered you. For each question, circle the
                number that best describes how much (or how often) you have been bothered by each problem during the past TWO (2) WEEKS.
            </p>

            <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
                    <thead>
                        <tr className="align-bottom">
                            <th className="border border-black p-1.5 text-left font-bold" colSpan={2}>
                                During the past TWO (2) WEEKS, how much (or how often) have you been bothered by the following problems?
                            </th>
                            {SCALE.map(([a, b]) => (
                                <th key={a} className="w-[62px] border border-black p-1 text-center text-[11px] font-bold leading-tight">
                                    {a}
                                    <div className="font-normal">{b}</div>
                                </th>
                            ))}
                            <th className="w-[70px] border border-black p-1 text-center text-[11px] font-bold leading-tight">
                                Highest Domain Score <span className="font-normal">(clinician)</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {DOMAINS.map(([roman, start, end], d) => {
                            const scores = ans.slice(start, end + 1).map((n) => Number(n) || 0);
                            const highest = scores.length ? Math.max(...scores) : 0;
                            const flagged = !!results[d]?.flagged;
                            const n = end - start + 1;

                            return Array.from({ length: n }, (_, k) => {
                                const q = start + k;
                                const v = ans[q];
                                return (
                                    <tr key={q}>
                                        {k === 0 && (
                                            <td rowSpan={n} className="w-[34px] border border-black p-1 text-center align-top font-bold">
                                                {roman}.
                                            </td>
                                        )}
                                        <td className="border border-black p-1.5">
                                            {q + 1}. {DSM5_QUESTIONS[q]}
                                        </td>
                                        {[0, 1, 2, 3, 4].map((opt) => (
                                            <td key={opt} className="border border-black p-1 text-center">
                                                <span
                                                    className={`inline-flex h-[24px] w-[24px] items-center justify-center rounded-full ${Number(v) === opt ? "border-2 border-black font-bold" : ""
                                                        }`}
                                                >
                                                    {opt}
                                                </span>
                                            </td>
                                        ))}
                                        {k === 0 && (
                                            <td
                                                rowSpan={n}
                                                className={`border border-black p-1 text-center align-middle font-bold ${flagged ? "bg-[#fdf1bc]" : ""}`}
                                            >
                                                {highest}
                                                {flagged && <div className="text-[10px] font-normal text-[#7a5400]">⚑ follow-up</div>}
                                            </td>
                                        )}
                                    </tr>
                                );
                            });
                        })}
                    </tbody>
                </table>
            </div>

            <p className={`${inter} mb-0 mt-3 text-[11px] text-[#666]`}>
                Highlighted domains reached the DSM-5 Level 1 follow-up threshold. This is a screening guide only; clinical judgment applies.
            </p>
        </Paper>
    );
}

function AbaConsentPaper({ data }) {
    const intake = data.intake || {};
    const consent = data.agreements || {};
    const guardian = data.guardian || {};

    return (
        <AbaConsentDocument
            values={{
                clientName: intake.full_name,
                birthdate: mdy(intake.birthdate),
                guardianNames: intake.guardian_names,
                providerName: intake.provider_name,
                mediaRecording: !!consent.media_recording,
                telehealthConsent: !!consent.telehealth,
                agreement: !!consent.agreement,
                signerName: intake.guardian_printed_name || data.signed_name || guardian.name,
                relationship: intake.guardian_relation || guardian.relation,
                signatureData: data.signature_data || data.guardian_signature_data || consent.guardian_signature_data,
                signedDate: fmtDate(data.signed_date, { month: "2-digit", day: "2-digit", year: "numeric" }),
            }}
        />
    );
}

/* ------------------------------------------------------------------ */
/*  Modal                                                              */
/* ------------------------------------------------------------------ */
/**
 * Props:
 *  base        - "/admin" o "/affiliate"
 *  appointment - ang appointment (kailangan ang id at client_name)
 *  onClose     - isara ang modal
 */
export default function ConsentViewer({ base, appointment, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [tab, setTab] = useState("consent");
    const isAba = appointment.consent_type === "aba" || appointment.service_id === "aba";
    const tabs = isAba ? [["consent", "ABA consent"]] : TABS;

    useEffect(() => {
        let alive = true;
        apiFetch(`${base}/appointments/${appointment.id}/consent`)
            .then((d) => alive && setData(d.consent))
            .catch((err) => alive && setError(err.message || "Could not load the consent form."))
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, [base, appointment.id]);

    const results = useMemo(() => (data ? domainResults(data.dsm5) : []), [data]);
    const flaggedCount = results.filter((r) => r.flagged).length;
    const selfHarm = data ? Number(data.dsm5?.[10]) || 0 : 0;
    const clientName = data?.intake?.full_name || appointment.client_name;

    return (
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/45 p-3 sm:p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-5xl rounded-2xl bg-white p-4 shadow-xl sm:p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className={`${serif} m-0 text-xl text-[#202020]`}>
                            {isAba ? "ABA consent form" : "Consent & intake forms"}
                        </h3>
                        <p className={`${serif} m-0 mt-0.5 text-sm text-[#666]`}>
                            {appointment.client_name}
                            {data && <> · submitted {fmtDate(data.submitted_at, { month: "short", day: "numeric", year: "numeric" })}</>}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`${serif} cursor-pointer rounded-md border border-[#c7b6b6] bg-white px-4 py-1.5 text-sm`}
                    >
                        Close
                    </button>
                </div>

                {loading && <p className={`${serif} mt-6 text-sm text-[#666]`}>Loading…</p>}
                {error && <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
                {!loading && !error && !data && (
                    <p className={`${serif} mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900`}>
                        The client has not submitted the consent form yet.
                    </p>
                )}

                {data && (
                    <>
                        {selfHarm >= 1 && (
                            <p className="mb-0 mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                                <strong>Please review promptly:</strong> the client reported thoughts of hurting themselves (question 11
                                answered {selfHarm} · {DSM5_OPTIONS[selfHarm]?.label}).
                            </p>
                        )}

                        <div className="mt-4 inline-flex gap-[3px] rounded-[11px] bg-[#4a9b8e30] p-[3px]">
                            {tabs.map(([id, label]) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setTab(id)}
                                    className={`${serif} h-[26px] cursor-pointer rounded-[9px] border-0 px-[14px] text-[12px] text-[#202020] ${tab === id ? "bg-white font-bold" : "bg-transparent"
                                        }`}
                                >
                                    {label}
                                    {id === "dsm" && flaggedCount > 0 && (
                                        <span className="ml-1.5 rounded-full bg-[#fdf1bc] px-1.5 text-[10px] text-[#7a5400]">{flaggedCount}</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="mt-4 max-h-[72vh] overflow-y-auto rounded-lg bg-[#e4e8e6] p-2 sm:p-5">
                            {tab === "consent" && (isAba
                                ? <AbaConsentPaper data={data} />
                                : <ConsentPaper data={data} clientName={clientName} />)}
                            {tab === "intake" && <IntakePaper data={data} />}
                            {tab === "dsm" && <DsmPaper data={data} results={results} clientName={clientName} />}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}