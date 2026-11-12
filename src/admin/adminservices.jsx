import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminNavigation from "./adminnavigation";
import ProfileMenu from "../components/ProfileMenu";
import { apiFetch, API_URL, getToken } from "../auth";
import { peso } from "../components/payUtils";

const FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Inria+Serif:wght@400;700&family=Inter:wght@400;600;700&display=swap');`;
const inter = "font-['Inter',Helvetica,sans-serif]";
const serif = "font-['Inria_Serif',Georgia,serif]";

/* Routes used by the links on this page */
const PAYMENT_METHODS_PATH = "/admin/payment-method";

const MIN_HOURS = 0.5;
const MAX_HOURS = 8;
const STEP = 0.5;
const MAX_IMAGE_MB = 2;

const fmtHours = (h) => `${h} ${h === 1 ? "hr" : "hrs"}`;
const isAssessmentService = (service) => {
    if (service.id === "assessment" || service.slug === "assessment") return true;
    const normalizedName = String(service.name || "")
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]/g, "");
    return normalizedName === "assessmentandconsultation" || normalizedName === "assessmentconsultation";
};

const inputCls = `${inter} h-[40px] rounded-[6px] border border-[#c7b6b6] bg-white px-[12px] text-[16px] text-[#202020] outline-none focus:border-[#4a9b8e] focus:ring-2 focus:ring-[#4a9b8e]/25 sm:h-[38px] sm:text-[13px]`;
const areaCls = `${inter} rounded-[6px] border border-[#c7b6b6] bg-white px-[12px] py-[8px] text-[16px] leading-[1.45] text-[#202020] outline-none focus:border-[#4a9b8e] focus:ring-2 focus:ring-[#4a9b8e]/25 sm:text-[13px]`;
const atInputCls = `${serif} mt-[4px] h-[34px] w-full rounded-[4px] border border-[#c7b6b6] bg-white px-[10px] text-[12px] text-[#202020] outline-none focus:border-[#4a9b8e]`;

const Field = ({ label, hint, children }) => (
    <label className="flex flex-col gap-[6px]">
        <span className={`${inter} text-[12px] font-bold text-[#666]`}>{label}</span>
        {children}
        {hint && <span className={`${serif} text-[11px] text-[#888]`}>{hint}</span>}
    </label>
);

const serviceImageUrl = (url) => {
    if (!url) return "";
    try {
        return new URL(url, API_URL).toString();
    } catch {
        return url;
    }
};

async function uploadServiceImage(slug, file) {
    const body = new FormData();
    body.append("image", file);
    const token = getToken();
    const response = await fetch(`${API_URL}/admin/services/${encodeURIComponent(slug)}/image`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            ...(token ? { Authorization: "Bearer " + token } : {}),
        },
        body,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Could not upload service image.");
    return data.image_url;
}

function ServiceImageField({ value, file, onFileChange, onClear }) {
    const previewUrl = useRef("");
    const [preview, setPreview] = useState(() => value ? serviceImageUrl(value) : "");
    const [error, setError] = useState("");

    useEffect(() => {
        return () => {
            if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
        };
    }, []);

    const pick = (event) => {
        const selected = event.target.files?.[0];
        event.target.value = "";
        if (!selected) return;
        if (!/^image\/(png|jpe?g|webp)$/.test(selected.type)) {
            setError("Choose a PNG, JPG, or WebP image.");
            return;
        }
        if (selected.size > MAX_IMAGE_MB * 1024 * 1024) {
            setError(`Image must be no larger than ${MAX_IMAGE_MB} MB.`);
            return;
        }
        setError("");
        if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
        previewUrl.current = URL.createObjectURL(selected);
        setPreview(previewUrl.current);
        onFileChange(selected);
    };

    const clear = () => {
        if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
        previewUrl.current = "";
        setPreview("");
        setError("");
        onClear();
    };

    return (
        <div>
            <span className={`${inter} text-[12px] font-bold text-[#666]`}>Service image</span>
            <div className="mt-[6px] flex flex-wrap items-center gap-[12px]">
                <div className="flex h-[96px] w-[144px] shrink-0 items-center justify-center overflow-hidden rounded-[6px] border border-[#c7b6b6] bg-[#f7f9f8] p-1">
                    {preview
                        ? <img src={preview} alt="Service image preview" className="h-full w-full object-contain" />
                        : <span className={`${serif} text-[11px] text-[#666]`}>No image</span>}
                </div>
                <label className={`${serif} inline-flex h-[34px] cursor-pointer items-center rounded-[5px] border border-[#c7b6b6] bg-white px-[12px] text-[12px] text-[#202020] hover:bg-[#f2f2f2]`}>
                    {file || value ? "Choose another" : "Choose image"}
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={pick} />
                </label>
                {(file || value) && (
                    <button
                        type="button"
                        onClick={clear}
                        className={`${serif} h-[34px] rounded-[5px] border border-red-200 bg-white px-[12px] text-[12px] text-red-700 hover:bg-red-50`}
                    >
                        Remove image
                    </button>
                )}
            </div>
            <p className={`${serif} mt-[5px] text-[11px] text-[#888]`}>PNG, JPG, or WebP · up to {MAX_IMAGE_MB} MB</p>
            {error && <p role="alert" className={`${serif} mt-[4px] text-[11px] text-red-700`}>{error}</p>}
        </div>
    );
}

const Toggle = ({ on, onChange, label, disabled }) => (
    <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={`relative h-[26px] w-[50px] shrink-0 cursor-pointer rounded-full transition-colors disabled:opacity-60 ${on ? "bg-[#2a8570]" : "bg-[#989898]"}`}
    >
        <span
            className={`absolute top-[4px] h-[18px] w-[19px] rounded-full bg-white transition-all ${on ? "left-[27px]" : "left-[4px]"}`}
        />
    </button>
);

/* ------------------------------------------------------------------ */
/*  Duration stepper                                                  */
/* ------------------------------------------------------------------ */
const stepBtn =
    "flex h-[36px] w-[36px] items-center justify-center rounded-full border border-[#c7b6b6] bg-white text-[18px] text-[#202020] hover:bg-[#f2f2f2] disabled:opacity-40 sm:h-[28px] sm:w-[28px] sm:text-[16px]";

const DurationStepper = ({ hours, onChange, disabled }) => (
    <div className="flex items-center gap-[10px]">
        <button
            type="button"
            aria-label="Decrease duration"
            disabled={disabled || hours <= MIN_HOURS}
            onClick={() => onChange(hours - STEP)}
            className={stepBtn}
        >
            −
        </button>
        <span className={`${inter} min-w-[64px] text-center text-[18px] font-bold text-[#202020]`}>{fmtHours(hours)}</span>
        <button
            type="button"
            aria-label="Increase duration"
            disabled={disabled || hours >= MAX_HOURS}
            onClick={() => onChange(hours + STEP)}
            className={stepBtn}
        >
            +
        </button>
    </div>
);

/* ------------------------------------------------------------------ */
/*  Custom Delete Confirmation Modal                                   */
/* ------------------------------------------------------------------ */
function ConfirmDeleteModal({ title, message, onConfirm, onCancel, busy }) {
    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-[16px]" onClick={onCancel}>
            <div
                role="dialog"
                aria-modal="true"
                className="w-full max-w-[420px] rounded-[12px] border border-[#c7b6b6] bg-white p-[24px] shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-[12px]">
                    <div className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </div>
                    <div>
                        <h3 className={`${serif} m-0 text-[18px] font-bold text-[#202020]`}>{title}</h3>
                        <p className={`${serif} m-0 mt-[4px] text-[13px] text-[#666]`}>{message}</p>
                    </div>
                </div>

                <div className="mt-[24px] flex justify-end gap-[10px]">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={busy}
                        className={`${serif} h-[36px] rounded-[6px] border border-[#c7b6b6] bg-white px-[16px] text-[13px] text-[#202020] hover:bg-[#f2f2f2] disabled:opacity-60`}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={busy}
                        className={`${serif} h-[36px] rounded-[6px] border-0 bg-red-600 px-[16px] text-[13px] font-bold text-white hover:bg-red-700 disabled:opacity-60`}
                    >
                        {busy ? "Deleting…" : "Yes, Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Add Service Modal                                                  */
/* ------------------------------------------------------------------ */
const AddServiceModal = ({ onClose, onCreated }) => {
    const [form, setForm] = useState({
        name: "",
        title: "",
        hours: 1,
        meta: "",
        text: "",
        goodFor: "",
        steps: "",
        enabled: true,
    });
    const [imageFile, setImageFile] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const hoursOk = form.hours >= MIN_HOURS && form.hours <= MAX_HOURS;
    const valid = form.name.trim() && form.text.trim() && hoursOk;

    const submit = async () => {
        setBusy(true);
        setError("");
        try {
            const d = await apiFetch("/admin/services", {
                method: "POST",
                body: JSON.stringify({
                    name: form.name.trim(),
                    title: form.title.trim() || form.name.trim(),
                    hours: form.hours,
                    meta: form.meta.trim(),
                    text: form.text.trim(),
                    goodFor: form.goodFor.split(",").map((t) => t.trim()).filter(Boolean),
                    steps: form.steps.split("\n").map((t) => t.trim()).filter(Boolean),
                    enabled: form.enabled,
                }),
            });
            let created = d.service;
            let imageError = "";
            if (imageFile) {
                try {
                    const image_url = await uploadServiceImage(created.id, imageFile);
                    created = { ...created, image_url };
                } catch (uploadError) {
                    imageError = uploadError.message || "Could not upload service image.";
                }
            }
            onCreated(created, imageError);
        } catch (err) {
            setError(err.message || "Could not create service. Try again.");
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-[16px]" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                className="max-h-[92vh] w-full max-w-[560px] overflow-y-auto rounded-[10px] border border-[#c7b6b6] bg-white p-[20px] sm:p-[28px]"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className={`${serif} text-[20px] font-bold text-[#2f4a42]`}>Add new service</h2>
                <p className={`${serif} mt-[4px] text-[12px] text-[#666]`}>
                    Create a new service. It will appear on the public Services page and in Payment methods to set its fee.
                </p>

                <div className="mt-[20px] flex flex-col gap-[14px]">
                    <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
                        <Field label="Service name *" hint="e.g. Speech Therapy">
                            <input className={inputCls} value={form.name} onChange={set("name")} placeholder="Speech Therapy" />
                        </Field>
                        <Field label="Heading" hint="Optional section title">
                            <input className={inputCls} value={form.title} onChange={set("title")} placeholder="Speech & Language Therapy" />
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
                        <Field label="Session length (hours) *">
                            <input
                                type="number"
                                min={MIN_HOURS}
                                max={MAX_HOURS}
                                step={STEP}
                                className={inputCls}
                                value={form.hours}
                                onChange={(e) => setForm({ ...form, hours: parseFloat(e.target.value) || 0 })}
                            />
                        </Field>
                        <Field label="Short details" hint="e.g. Online or in-person">
                            <input className={inputCls} value={form.meta} onChange={set("meta")} placeholder="Online or in-person" />
                        </Field>
                    </div>
                    {!hoursOk && (
                        <p className={`${serif} text-[11px] text-[#b3382a]`}>
                            Duration must be between {MIN_HOURS} and {MAX_HOURS} hours.
                        </p>
                    )}

                    <Field label="Description *">
                        <textarea rows={4} className={areaCls} value={form.text} onChange={set("text")} placeholder="Write an overview of this service..." />
                    </Field>

                    <Field label="Good for" hint="Separate with commas. Each one becomes a tag.">
                        <input className={inputCls} value={form.goodFor} onChange={set("goodFor")} placeholder="Communication, Stuttering, Articulation" />
                    </Field>

                    <Field label="What happens" hint="One step per line.">
                        <textarea rows={4} className={areaCls} value={form.steps} onChange={set("steps")} placeholder="Initial consultation and goal setting&#10;Guided practice and skill exercises&#10;Home recommendations" />
                    </Field>

                    <ServiceImageField
                        file={imageFile}
                        onFileChange={setImageFile}
                        onClear={() => setImageFile(null)}
                    />

                    <div className="flex items-center justify-between gap-[12px]">
                        <span className={`${inter} text-[12px] font-bold text-[#666]`}>
                            Show on the Services page
                        </span>
                        <Toggle on={form.enabled} onChange={(v) => setForm({ ...form, enabled: v })} label="Visible to clients" />
                    </div>
                </div>

                {error && (
                    <p role="alert" className="mt-[14px] rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800">
                        {error}
                    </p>
                )}

                <div className="mt-[24px] flex justify-end gap-[10px]">
                    <button onClick={onClose} disabled={busy} className={`${serif} h-[38px] rounded-[6px] border border-[#c7b6b6] bg-white px-[16px] text-[13px] text-[#202020] hover:bg-[#f2f2f2] disabled:opacity-60 sm:h-[34px]`}>
                        Cancel
                    </button>
                    <button
                        disabled={!valid || busy}
                        onClick={submit}
                        className={`${serif} h-[38px] rounded-[6px] bg-[#11a086] px-[16px] text-[13px] text-white hover:bg-[#0e8c75] disabled:cursor-not-allowed disabled:opacity-50 sm:h-[34px]`}
                    >
                        {busy ? "Creating…" : "Create service"}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ------------------------------------------------------------------ */
/*  Edit modal                                                         */
/* ------------------------------------------------------------------ */
const toForm = (s) => ({
    name: s.name || "",
    title: s.title || "",
    hours: s.hours || 1,
    meta: s.meta || "",
    text: s.text || "",
    goodFor: (s.goodFor || []).join(", "),
    steps: (s.steps || []).join("\n"),
    enabled: s.enabled !== false,
});

const ServiceModal = ({ service, price, onClose, onSave }) => {
    const navigate = useNavigate();
    const [form, setForm] = useState(() => toForm(service));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [imageFile, setImageFile] = useState(null);
    const [removeImage, setRemoveImage] = useState(false);
    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const isAssessment = isAssessmentService(service);
    const hoursOk = form.hours >= MIN_HOURS && form.hours <= MAX_HOURS;
    const valid = form.name.trim() && form.text.trim() && hoursOk;

    const submit = async () => {
        setBusy(true);
        setError("");
        try {
            await onSave({
                name: form.name.trim(),
                title: form.title.trim() || form.name.trim(),
                hours: form.hours,
                meta: form.meta.trim(),
                text: form.text.trim(),
                goodFor: form.goodFor.split(",").map((t) => t.trim()).filter(Boolean),
                steps: form.steps.split("\n").map((t) => t.trim()).filter(Boolean),
                enabled: form.enabled,
            }, { imageFile, removeImage });
        } catch (err) {
            setError(err.message || "Could not save. Try again.");
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-[16px]" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                className="max-h-[92vh] w-full max-w-[560px] overflow-y-auto rounded-[10px] border border-[#c7b6b6] bg-white p-[20px] sm:p-[28px]"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className={`${serif} text-[20px] font-bold text-[#2f4a42]`}>Edit service</h2>
                <p className={`${serif} mt-[4px] text-[12px] text-[#666]`}>
                    Changes show on the public Services page right after you save.
                </p>

                <div className="mt-[20px] flex flex-col gap-[14px]">
                    <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
                        <Field label="Service name" hint="Used in the “At a glance” list and in admin.">
                            <input className={inputCls} value={form.name} onChange={set("name")} />
                        </Field>
                        <Field label="Heading" hint="Big title on the service section. Leave blank to use the name.">
                            <input className={inputCls} value={form.title} onChange={set("title")} />
                        </Field>
                    </div>

                    {!isAssessment && (
                        <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
                            <Field label="Session length (hours)">
                                <input
                                    type="number"
                                    min={MIN_HOURS}
                                    max={MAX_HOURS}
                                    step={STEP}
                                    className={inputCls}
                                    value={form.hours}
                                    onChange={(e) => setForm({ ...form, hours: parseFloat(e.target.value) || 0 })}
                                />
                            </Field>
                            <Field label="Short details" hint="e.g. Online or in-person">
                                <input className={inputCls} value={form.meta} onChange={set("meta")} />
                            </Field>
                        </div>
                    )}
                    {isAssessment && (
                        <Field label="Short details" hint="e.g. Online or in-person">
                            <input className={inputCls} value={form.meta} onChange={set("meta")} />
                        </Field>
                    )}

                    {!hoursOk && !isAssessment && (
                        <p className={`${serif} text-[11px] text-[#b3382a]`}>
                            Duration must be between {MIN_HOURS} and {MAX_HOURS} hours.
                        </p>
                    )}

                    <Field label="Description">
                        <textarea rows={4} className={areaCls} value={form.text} onChange={set("text")} />
                    </Field>

                    <Field label="Good for" hint="Separate with commas. Each one becomes a tag.">
                        <input className={inputCls} value={form.goodFor} onChange={set("goodFor")} placeholder="Anxiety, Low mood, Grief" />
                    </Field>

                    <Field label="What happens" hint="One step per line.">
                        <textarea rows={5} className={areaCls} value={form.steps} onChange={set("steps")} />
                    </Field>

                    <ServiceImageField
                        value={removeImage ? "" : service.image_url}
                        file={imageFile}
                        onFileChange={(file) => { setImageFile(file); setRemoveImage(false); }}
                        onClear={() => {
                            setImageFile(null);
                            setRemoveImage(!!service.image_url);
                        }}
                    />

                    {/* Price section — hidden for assessment consultation */}
                    {isAssessment ? (
                        <div className="rounded-[8px] bg-[#f6f6f6] px-[14px] py-[10px]">
                            <p className={`${serif} m-0 text-[12px] text-[#666]`}>
                                Assessment Consultation duration and prices are set individually per assessment type below and in{" "}
                                <button
                                    type="button"
                                    onClick={() => navigate(PAYMENT_METHODS_PATH)}
                                    className="cursor-pointer border-0 bg-transparent p-0 text-[#2a8570] underline font-bold"
                                >
                                    Payment methods
                                </button>
                                .
                            </p>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between gap-[12px] rounded-[8px] bg-[#f6f6f6] px-[14px] py-[10px]">
                            <div>
                                <div className={`${inter} text-[12px] font-bold text-[#666]`}>Price</div>
                                <div className={`${inter} text-[16px] font-bold text-[#202020]`}>{price ? peso(price) : "Not set"}</div>
                            </div>
                            <p className={`${serif} m-0 max-w-[240px] text-right text-[11px] text-[#666]`}>
                                Prices are set in Payment methods, so they stay the same everywhere.
                            </p>
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-[12px]">
                        <span className={`${inter} text-[12px] font-bold text-[#666]`}>
                            Show on the Services page
                        </span>
                        <Toggle on={form.enabled} onChange={(v) => setForm({ ...form, enabled: v })} label="Visible to clients" />
                    </div>
                </div>

                {error && (
                    <p role="alert" className="mt-[14px] rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800">
                        {error}
                    </p>
                )}

                <div className="mt-[24px] flex justify-end gap-[10px]">
                    <button onClick={onClose} disabled={busy} className={`${serif} h-[38px] rounded-[6px] border border-[#c7b6b6] bg-white px-[16px] text-[13px] text-[#202020] hover:bg-[#f2f2f2] disabled:opacity-60 sm:h-[34px]`}>
                        Cancel
                    </button>
                    <button
                        disabled={!valid || busy}
                        onClick={submit}
                        className={`${serif} h-[38px] rounded-[6px] bg-[#11a086] px-[16px] text-[13px] text-white hover:bg-[#0e8c75] disabled:cursor-not-allowed disabled:opacity-50 sm:h-[34px]`}
                    >
                        {busy ? "Saving…" : "Save changes"}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ------------------------------------------------------------------ */
/*  Assessment Types Panel                                             */
/* ------------------------------------------------------------------ */
// Helper to convert minutes to hours for form (e.g., 90 -> 1.5)
const minsToHours = (m) => (m ? Math.round((m / 60) * 10) / 10 : 1);

function AssessmentTypeForm({ initial, onSave, onCancel, busy }) {
    const [name, setName] = useState(initial?.name || "");
    const [hours, setHours] = useState(() => (initial?.duration_minutes ? minsToHours(initial.duration_minutes) : 1));
    const [description, setDescription] = useState(initial?.description || "");
    const [enabled, setEnabled] = useState(initial ? initial.enabled !== false : true);
    const [err, setErr] = useState("");

    const submit = async () => {
        setErr("");
        if (!name.trim()) return setErr("Name is required.");
        const h = Number(hours);
        if (!(h >= MIN_HOURS && h <= MAX_HOURS)) {
            return setErr(`Duration must be between ${MIN_HOURS} and ${MAX_HOURS} hours.`);
        }
        const mins = Math.round(h * 60);
        try {
            await onSave({
                name: name.trim(),
                description: description.trim() || null,
                duration_minutes: mins,
                enabled,
            });
        } catch (e) {
            setErr(e.message || "Could not save.");
        }
    };

    return (
        <div className="rounded-[8px] border border-[#4a9b8e]/40 bg-[#f4fbf9] p-[14px]">
            <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-2">
                <label className={`${serif} text-[11px] text-[#666] col-span-full`}>
                    Assessment type name *
                    <input className={atInputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Psychological Evaluation" />
                </label>

                {/* Duration in HOURS as requested */}
                <label className={`${serif} text-[11px] text-[#666] col-span-full sm:col-span-1`}>
                    Duration (hours) *
                    <input
                        type="number"
                        min={MIN_HOURS}
                        max={MAX_HOURS}
                        step={STEP}
                        className={atInputCls}
                        value={hours}
                        onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                    />
                </label>

                <div className={`${serif} col-span-full sm:col-span-1 flex flex-col justify-center text-[11px] text-[#2a8570] pt-4`}>
                    Fee is configured in{" "}
                    <a href={PAYMENT_METHODS_PATH} className="font-bold underline text-[#2a8570]">
                        Payment methods
                    </a>
                    .
                </div>

                <label className={`${serif} text-[11px] text-[#666] col-span-full`}>
                    Short description (optional)
                    <textarea
                        rows={2}
                        className={`${serif} mt-[4px] w-full rounded-[4px] border border-[#c7b6b6] bg-white px-[10px] py-[6px] text-[12px] text-[#202020] outline-none focus:border-[#4a9b8e] resize-none`}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Brief description shown to clients…"
                    />
                </label>

                <div className="col-span-full flex items-center gap-[8px]">
                    <input type="checkbox" id="at-enabled" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-[#4a9b8e]" />
                    <label htmlFor="at-enabled" className={`${serif} text-[11px] text-[#666] cursor-pointer`}>Show to clients</label>
                </div>
            </div>

            {err && <p className="mt-[8px] text-[11px] text-red-700">{err}</p>}

            <div className="mt-[10px] flex gap-[8px]">
                <button type="button" disabled={busy} onClick={submit} className={`${serif} h-[28px] rounded-[4px] border-0 bg-[#4a9b8e] px-[14px] text-[11px] font-bold text-white hover:bg-[#3f8a7d] disabled:opacity-60`}>
                    {busy ? "Saving…" : initial ? "Save changes" : "Add type"}
                </button>
                <button type="button" onClick={onCancel} className={`${serif} h-[28px] rounded-[4px] border border-[#c7b6b6] bg-white px-[12px] text-[11px] text-[#202020] hover:bg-[#f2f2f2]`}>
                    Cancel
                </button>
            </div>
        </div>
    );
}

function AssessmentTypeRow({ t, onEdit, onRequestDelete, onToggle, busy, onGoToPayment }) {
    const hours = minsToHours(t.duration_minutes);

    return (
        <div className="flex items-start gap-[12px] rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] p-[12px]">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-[8px] flex-wrap">
                    <span className={`${inter} text-[13px] font-bold text-[#202020]`}>{t.name}</span>
                    <span className={`${serif} text-[11px] font-bold ${t.price > 0 ? "text-[#2a8570]" : "text-[#b3382a]"}`}>
                        {t.price > 0 ? peso(t.price) : "Price not set"}
                    </span>
                    <span className={`${serif} text-[11px] text-[#666]`}>{fmtHours(hours)}</span>
                    {!t.enabled && <span className="text-[10px] rounded-full bg-[#f0e0e0] px-[8px] py-[1px] text-[#a44]">Hidden</span>}
                </div>
                {t.description && (
                    <p className={`${serif} mt-[2px] text-[11px] text-[#777] leading-[1.4]`}>{t.description}</p>
                )}
                {!(t.price > 0) && (
                    <button
                        type="button"
                        onClick={onGoToPayment}
                        className={`${serif} mt-[2px] cursor-pointer border-0 bg-transparent p-0 text-[11px] text-[#2a8570] underline`}
                    >
                        Set fee in Payment methods →
                    </button>
                )}
            </div>
            <div className="flex shrink-0 items-center gap-[6px]">
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => onToggle(t, !t.enabled)}
                    className={`${serif} h-[26px] rounded-[4px] border px-[8px] text-[11px] disabled:opacity-50 ${t.enabled ? "border-[#c7b6b6] bg-white text-[#555] hover:bg-[#f2f2f2]" : "border-[#4a9b8e] bg-[#e3f2ee] text-[#2a8570]"}`}
                >
                    {t.enabled ? "Hide" : "Show"}
                </button>
                <button type="button" onClick={() => onEdit(t)} className={`${serif} h-[26px] rounded-[4px] border border-[#c7b6b6] bg-white px-[8px] text-[11px] text-[#202020] hover:bg-[#f2f2f2]`}>
                    Edit
                </button>
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => onRequestDelete(t)}
                    className={`${serif} h-[26px] rounded-[4px] border border-red-200 bg-white px-[8px] text-[11px] text-red-600 hover:bg-red-50 disabled:opacity-50`}
                >
                    Delete
                </button>
            </div>
        </div>
    );
}

function AssessmentTypesPanel({ onGoToPayment }) {
    const [types, setTypes] = useState(null);
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deletingType, setDeletingType] = useState(null); // Type requested to be deleted (triggers popup modal)
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState("");
    const [loadError, setLoadError] = useState("");

    const notify = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

    useEffect(() => {
        apiFetch("/admin/assessment-types")
            .then((d) => {
                setTypes(d.types || []);
                setLoadError("");
            })
            .catch((err) => {
                setTypes([]);
                setLoadError(err.message || "Could not load assessment types.");
            });
    }, []);

    const saveNew = async (body) => {
        setBusy(true);
        try {
            const d = await apiFetch("/admin/assessment-types", { method: "POST", body: JSON.stringify(body) });
            setTypes((p) => [...(p || []), d.type]);
            setAdding(false);
            notify("Assessment type added! Remember to set its fee in Payment methods.");
        } finally { setBusy(false); }
    };

    const saveEdit = async (body) => {
        setBusy(true);
        try {
            const d = await apiFetch(`/admin/assessment-types/${editing.id}`, { method: "PUT", body: JSON.stringify(body) });
            setTypes((p) => p.map((x) => (x.id === d.type.id ? d.type : x)));
            setEditing(null);
            notify("Saved.");
        } finally { setBusy(false); }
    };

    const toggle = async (t, enabled) => {
        setBusy(true);
        try {
            const d = await apiFetch(`/admin/assessment-types/${t.id}`, { method: "PUT", body: JSON.stringify({ enabled }) });
            setTypes((p) => p.map((x) => (x.id === d.type.id ? d.type : x)));
        } finally { setBusy(false); }
    };

    // Confirmed delete from popup modal
    const confirmDelete = async () => {
        if (!deletingType) return;
        setBusy(true);
        try {
            await apiFetch(`/admin/assessment-types/${deletingType.id}`, { method: "DELETE" });
            setTypes((p) => p.filter((x) => x.id !== deletingType.id));
            notify(`"${deletingType.name}" deleted.`);
            setDeletingType(null);
        } catch (err) {
            notify(err.message || "Could not delete assessment type");
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="mt-[24px] rounded-[10px] border border-[#d8dedb] bg-white p-[16px] sm:p-[20px]">
            <div className="flex items-center justify-between gap-[8px] mb-[10px]">
                <div>
                    <div className={`${serif} text-[13px] font-bold text-[#2f4a42]`}>Assessment Types</div>
                    <div className={`${serif} text-[11px] text-[#888]`}>
                        Clients pick one type when booking Assessment. Fees are set in{" "}
                        <button
                            type="button"
                            onClick={onGoToPayment}
                            className="cursor-pointer border-0 bg-transparent p-0 text-[#2a8570] underline"
                        >
                            Payment methods
                        </button>
                        .
                    </div>
                </div>
                {!adding && (
                    <button
                        type="button"
                        onClick={() => { setAdding(true); setEditing(null); }}
                        className={`${serif} h-[28px] shrink-0 rounded-[4px] border-0 bg-[#4a9b8e] px-[12px] text-[11px] font-bold text-white hover:bg-[#3f8a7d]`}
                    >
                        + Add assessment type
                    </button>
                )}
            </div>

            {loadError && (
                <p role="alert" className={`${inter} mb-[10px] rounded-[6px] border border-red-200 bg-red-50 px-[12px] py-[8px] text-[11px] text-red-800`}>
                    {loadError}
                </p>
            )}

            {adding && (
                <div className="mb-[10px]">
                    <AssessmentTypeForm onSave={saveNew} onCancel={() => setAdding(false)} busy={busy} />
                </div>
            )}

            {types === null && <p className={`${serif} text-[11px] text-[#888]`}>Loading…</p>}
            {types !== null && types.length === 0 && !adding && (
                <p className={`${serif} text-[11px] text-[#888] italic`}>No assessment types yet. Add one above.</p>
            )}
            {types && types.length > 0 && (
                <div className="grid gap-[8px]">
                    {types.map((t) =>
                        editing?.id === t.id ? (
                            <AssessmentTypeForm
                                key={t.id}
                                initial={t}
                                onSave={saveEdit}
                                onCancel={() => setEditing(null)}
                                busy={busy}
                            />
                        ) : (
                            <AssessmentTypeRow
                                key={t.id}
                                t={t}
                                onEdit={setEditing}
                                onRequestDelete={(item) => setDeletingType(item)}
                                onToggle={toggle}
                                busy={busy}
                                onGoToPayment={onGoToPayment}
                            />
                        )
                    )}
                </div>
            )}

            {/* Custom Pop-up Confirmation Modal for deleting assessment type */}
            {deletingType && (
                <ConfirmDeleteModal
                    title="Delete Assessment Type"
                    message={`Are you sure you want to delete "${deletingType.name}"? This action cannot be undone.`}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeletingType(null)}
                    busy={busy}
                />
            )}

            {toast && (
                <p className={`${inter} mt-[10px] rounded-[6px] bg-[#2f4a42] px-[12px] py-[6px] text-[11px] text-white`}>{toast}</p>
            )}
        </section>
    );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function AdminServices() {
    const navigate = useNavigate();
    const [services, setServices] = useState(null); // null = loading
    const [prices, setPrices] = useState({}); // { psychotherapy: 1500, ... } from payment settings
    const [loadError, setLoadError] = useState("");
    const [modal, setModal] = useState(null); // null | service
    const [addingService, setAddingService] = useState(false);
    const [deletingService, setDeletingService] = useState(null); // service to delete via popup
    const [busyId, setBusyId] = useState(null);
    const [toast, setToast] = useState("");
    const [navOpen, setNavOpen] = useState(false);

    const notify = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(""), 3000);
    };

    useEffect(() => {
        Promise.all([apiFetch("/admin/services"), apiFetch("/admin/payment-settings")])
            .then(([sv, ps]) => {
                setServices(sv.services || []);
                setPrices(ps.prices || {});
            })
            .catch((err) => setLoadError(err.message || "Could not load services."));
    }, []);

    const update = async (s, body) => {
        const d = await apiFetch(`/admin/services/${s.id}`, { method: "PUT", body: JSON.stringify(body) });
        setServices((p) => p.map((x) => (x.id === s.id ? d.service : x)));
        return d.service;
    };

    const changeHours = async (s, hours) => {
        setBusyId(s.id);
        try {
            await update(s, { hours });
            notify(`${s.name} is now ${fmtHours(hours)}`);
        } catch (err) {
            notify(err.message || "Could not change the duration");
        } finally {
            setBusyId(null);
        }
    };

    const toggleVisible = async (s, enabled) => {
        setBusyId(s.id);
        try {
            await update(s, { enabled });
            notify(enabled ? `${s.name} is now shown` : `${s.name} is now hidden`);
        } catch (err) {
            notify(err.message || "Could not update");
        } finally {
            setBusyId(null);
        }
    };

    const saveModal = async (body, imageChange) => {
        let service = await update(modal, body);
        if (imageChange.imageFile) {
            const image_url = await uploadServiceImage(service.id, imageChange.imageFile);
            service = { ...service, image_url };
            setServices((previous) => previous.map((item) => item.id === service.id ? service : item));
        } else if (imageChange.removeImage) {
            const response = await apiFetch(`/admin/services/${service.id}/image`, { method: "DELETE" });
            service = { ...service, image_url: response.image_url };
            setServices((previous) => previous.map((item) => item.id === service.id ? service : item));
        }
        setModal(null);
        notify("Service updated");
    };

    const handleServiceCreated = (newService, imageError) => {
        setServices((prev) => [...(prev || []), newService]);
        setAddingService(false);
        notify(imageError
            ? `"${newService.name}" was created, but its image could not be uploaded: ${imageError}`
            : `"${newService.name}" created! You can now set its price in Payment methods.`);
    };

    const confirmDeleteService = async () => {
        if (!deletingService) return;
        setBusyId(deletingService.id);
        try {
            await apiFetch(`/admin/services/${deletingService.id}`, { method: "DELETE" });
            setServices((p) => p.filter((x) => x.id !== deletingService.id));
            notify(`"${deletingService.name}" deleted.`);
            setDeletingService(null);
        } catch (err) {
            notify(err.message || "Could not delete service");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="flex min-h-screen w-full bg-[#f2f2f2] antialiased">
            <style>{FONT_CSS}</style>

            {/* Sidebar desktop */}
            <div className="hidden lg:block">
                <AdminNavigation />
            </div>

            {/* Sidebar mobile/tablet */}
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
                <header className="flex items-start justify-between gap-[12px] flex-wrap">
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
                                SERVICES
                            </div>
                        </div>
                        <h1 className={`${serif} mt-[8px] text-[28px] font-bold leading-[1.15] text-[#2f4a42] sm:text-[34px] lg:text-[40px]`}>
                            Manage services
                        </h1>
                        <p className={`${serif} mt-[4px] max-w-[560px] text-[13px] text-[#666] sm:text-[14px]`}>
                            Edit what clients see on the Services page: descriptions, session length, tags and steps.
                            Prices are set in Payment methods.
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-[10px] sm:gap-[14px]">
                        <button
                            type="button"
                            onClick={() => setAddingService(true)}
                            className={`${serif} flex h-[37px] items-center gap-[6px] rounded-[8px] border-0 bg-[#11a086] px-[14px] text-[13px] font-bold text-white hover:bg-[#0e8c75] shadow-sm`}
                        >
                            <span>+</span>
                            <span>Add service</span>
                        </button>
                        <ProfileMenu size={37} />
                    </div>
                </header>

                {loadError && (
                    <p role="alert" className="mt-[24px] rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        {loadError}
                    </p>
                )}
                {!services && !loadError && <p className={`${serif} mt-[24px] text-sm text-[#666]`}>Loading…</p>}

                {services && services.length === 0 && (
                    <section className="mt-[24px] rounded-[10px] border border-[#c7b6b6] bg-white px-[16px] py-[48px] text-center sm:mt-[34px] sm:px-[24px] sm:py-[64px]">
                        <p className={`${serif} text-[15px] text-[#202020]`}>No services found.</p>
                        <p className={`${serif} mt-[4px] text-[13px] text-[#666]`}>
                            You can add a service using the button above.
                        </p>
                    </section>
                )}

                {services && services.length > 0 && (
                    <div className="mt-[24px] grid grid-cols-1 gap-[16px] sm:mt-[34px] md:grid-cols-2 md:gap-[20px] xl:grid-cols-3 xl:gap-[29px]">
                        {services.map((s) => {
                            const visible = s.enabled !== false;
                            const isAssessment = isAssessmentService(s);
                            const isCustom = !isAssessment && (s.is_custom || (!["psychotherapy", "aba", "assessment"].includes(s.id)));
                            const price = Number(prices[s.id]) || 0;

                            return (
                                <section
                                    key={s.id}
                                    className={`relative flex flex-col rounded-[12px] border border-[#d8dedb] bg-white shadow-[0_2px_8px_rgba(27,56,47,0.04)] transition-[border-color,box-shadow] hover:border-[#9dbbb0] hover:shadow-[0_8px_24px_rgba(27,56,47,0.08)] ${isAssessment ? "xl:col-span-3 md:col-span-2" : ""}`}
                                >
                                    <div className="flex flex-1 flex-col p-[20px] sm:p-[24px]">
                                        <div className="flex items-start justify-between gap-[12px] border-b border-[#e8eeeb] pb-[14px]">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-[8px]">
                                                    <h2 className={`${serif} m-0 text-[18px] font-bold leading-snug text-[#202020]`}>{s.name}</h2>
                                                    {isCustom && (
                                                        <span className="rounded-[4px] border border-[#dce7e2] px-[7px] py-[2px] text-[10px] text-[#547267] font-sans font-semibold">
                                                            Custom
                                                        </span>
                                                    )}
                                                </div>
                                                <p className={`${serif} mb-0 mt-[7px] flex items-center gap-[7px] text-[11px] ${visible ? "text-[#547267]" : "text-[#888]"}`}>
                                                    <span className={`size-[7px] rounded-full ${visible ? "bg-[#4a9b8e]" : "bg-[#aaa]"}`} aria-hidden="true" />
                                                    {visible ? "Shown on the Services page" : "Hidden from clients"}
                                                </p>
                                            </div>
                                            <Toggle
                                                on={visible}
                                                onChange={(v) => toggleVisible(s, v)}
                                                label={`${s.name} visible`}
                                                disabled={busyId === s.id}
                                            />
                                        </div>
                                        <p className={`${serif} mt-[8px] text-[13px] leading-[18px] text-[#666] sm:min-h-[54px]`}>
                                            {s.text || "No description."}
                                        </p>

                                        {s.goodFor?.length > 0 && (
                                            <div className="mt-[12px] flex flex-wrap gap-[6px]">
                                                {s.goodFor.map((t) => (
                                                    <span key={t} className={`${serif} rounded-full bg-[#e3f2ee] px-[10px] py-[2px] text-[11px] text-[#2f4a42]`}>
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {isAssessment && (
                                            <AssessmentTypesPanel onGoToPayment={() => navigate(PAYMENT_METHODS_PATH)} />
                                        )}

                                        {/* Card footer: Assessment has NO time/price stepper because hours & fees are set per assessment type */}
                                        {!isAssessment && (
                                            <div className="mt-[18px] flex flex-wrap items-end justify-between gap-x-[16px] gap-y-[14px] border-t border-[#e8e8e8] pt-[16px]">
                                                <div>
                                                    <div className={`${serif} mb-[8px] text-[11px] text-[#666]`}>Session length</div>
                                                    <DurationStepper
                                                        hours={s.hours}
                                                        disabled={busyId === s.id}
                                                        onChange={(h) => changeHours(s, h)}
                                                    />
                                                </div>
                                                <div className="text-right">
                                                    <div className={`${serif} mb-[8px] text-[11px] text-[#666]`}>Price</div>
                                                    <div className={`${inter} text-[18px] font-bold text-[#202020]`}>
                                                        {price ? peso(price) : "Not set"}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(PAYMENT_METHODS_PATH)}
                                                        className={`${serif} mt-[2px] cursor-pointer border-0 bg-transparent p-0 text-[11px] text-[#2a8570] underline`}
                                                    >
                                                        Change in Payment methods
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className={`mt-[20px] flex justify-end gap-[8px] ${isAssessment ? "border-t border-[#e8e8e8] pt-[16px]" : ""}`}>
                                            {isCustom && (
                                                <button
                                                    onClick={() => setDeletingService(s)}
                                                    disabled={busyId === s.id}
                                                    className={`${serif} h-[34px] rounded-[4px] border border-red-200 bg-white px-[12px] text-[12px] text-red-700 hover:bg-red-50 sm:h-[26px] sm:px-[10px] sm:text-[11px] disabled:opacity-50`}
                                                >
                                                    Delete
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setModal(s)}
                                                className={`${serif} h-[34px] rounded-[4px] border border-[#c7b6b6] bg-white px-[14px] text-[12px] text-[#202020] hover:bg-[#f2f2f2] sm:h-[26px] sm:px-[12px] sm:text-[11px]`}
                                            >
                                                Edit details
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Edit Service Modal */}
            {modal && (
                <ServiceModal
                    service={modal}
                    price={Number(prices[modal.id]) || 0}
                    onClose={() => setModal(null)}
                    onSave={saveModal}
                />
            )}

            {/* Add Service Modal */}
            {addingService && (
                <AddServiceModal
                    onClose={() => setAddingService(false)}
                    onCreated={handleServiceCreated}
                />
            )}

            {/* Custom Pop-up Modal for deleting a custom service */}
            {deletingService && (
                <ConfirmDeleteModal
                    title="Delete Service"
                    message={`Are you sure you want to delete "${deletingService.name}"? This service will be removed from your clinic offerings.`}
                    onConfirm={confirmDeleteService}
                    onCancel={() => setDeletingService(null)}
                    busy={busyId === deletingService.id}
                />
            )}

            {toast && (
                <div role="status" className={`${inter} fixed bottom-[16px] left-[16px] right-[16px] z-[70] rounded-[8px] bg-[#2f4a42] px-[18px] py-[10px] text-center text-[13px] text-white sm:bottom-[28px] sm:left-auto sm:right-[28px] sm:text-left shadow-lg`}>
                    {toast}
                </div>
            )}
        </div>
    );
}
