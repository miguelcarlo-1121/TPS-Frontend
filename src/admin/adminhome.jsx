import React, { useEffect, useMemo, useRef, useState } from "react";
import AdminNavigation from "./adminnavigation";
import ProfileMenu from "../components/ProfileMenu";
import { API_URL, apiFetch } from "../auth";
import { getHomeContent, saveHomeContent, uploadHomeImage } from "./homeApi";
import { DEFAULT_HOME_CONTENT, mergeHomeContent } from "../data/homeDefaults";
import SkeletonBlock from "../components/SkeletonBlock";

const FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Inria+Serif:wght@400;700&family=Inter:wght@400;600;700&display=swap');`;
const inter = "font-['Inter',Helvetica,sans-serif]";
const serif = "font-['Inria_Serif',Georgia,serif]";

const MAX_IMAGE_MB = 2;
const STEP_ICONS = ["select", "calendar", "connect", "sprout"];
const SERVICE_ICONS = ["chat", "blocks", "check"];
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const EMPTY_ABOUT = { headline: "", intro: "", members: [] };

function homeImageSource(value) {
    if (typeof value !== "string" || !value.trim()) return "";
    const src = value.trim();
    return src.startsWith("/storage/") ? new URL(src, API_URL).toString() : src;
}

// 16px sa mobile para hindi mag-zoom ang iOS kapag nag-focus sa input
const inputCls = `${inter} w-full min-w-0 rounded-[6px] border border-[#c7b6b6] bg-white px-[12px] text-[16px] sm:text-[13px] text-[#202020] outline-none focus:border-[#4a9b8e] focus:ring-2 focus:ring-[#4a9b8e]/25`;
const inputH = `${inputCls} h-[38px]`;
const areaCls = `${inputCls} py-[8px]`;

/* ------------------------------------------------------------------ */
/*  Building blocks                                                    */
/* ------------------------------------------------------------------ */
const Card = ({ title, hint, action, children }) => (
    <section className="rounded-[10px] border border-[#c7b6b6] bg-white p-4 sm:p-[24px]">
        <div className="mb-[16px] flex items-start justify-between gap-[12px]">
            <div>
                <h2 className={`${serif} text-[16px] text-black`}>{title}</h2>
                {hint && <p className={`${serif} mt-[2px] text-[11px] text-[#666]`}>{hint}</p>}
            </div>
            {action}
        </div>
        {children}
    </section>
);

const Field = ({ label, error, hint, children }) => (
    <label className="flex min-w-0 flex-col gap-[6px]">
        <span className={`${inter} text-[12px] font-bold text-[#666]`}>{label}</span>
        {children}
        {hint && !error && <span className={`${serif} text-[11px] text-[#666]`}>{hint}</span>}
        {error && <span className={`${serif} text-[11px] text-[#b3382a]`}>{error}</span>}
    </label>
);

const SmallBtn = ({ danger, ...p }) => (
    <button
        type="button"
        {...p}
        className={`${serif} h-[30px] rounded-[4px] border bg-white px-[12px] text-[11px] disabled:cursor-not-allowed disabled:opacity-40 sm:h-[26px] ${danger ? "border-[#ff4c4c75] text-[#ff5656] hover:bg-[#fff1f1]" : "border-[#c7b6b6] text-[#202020] hover:bg-[#f2f2f2]"
            }`}
    />
);

/** Listahan na may add / remove / move up-down. */
function ListEditor({ items, onChange, min = 1, max = 8, addLabel, makeNew, label, preview, children }) {
    const patch = (id) => (p) => onChange(items.map((x) => (x.id === id ? { ...x, ...p } : x)));
    const move = (i, d) => {
        const j = i + d;
        if (j < 0 || j >= items.length) return;
        const next = [...items];
        [next[i], next[j]] = [next[j], next[i]];
        onChange(next);
    };
    return (
        <div>
            <div className="flex flex-col gap-[14px]">
                {items.map((item, i) => (
                    <div key={item.id} className="rounded-[8px] border border-[#e8e8e8] p-3 sm:p-[16px]">
                        <div className="mb-[12px] flex flex-col gap-[8px] sm:flex-row sm:items-center sm:justify-between sm:gap-[10px]">
                            <span className={`${inter} min-w-0 truncate text-[12px] font-bold text-[#2a8570]`}>
                                {label} {i + 1}
                                {preview(item) && <span className="font-normal text-[#666]"> · {preview(item)}</span>}
                            </span>
                            <div className="flex shrink-0 gap-[6px]">
                                <SmallBtn disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</SmallBtn>
                                <SmallBtn disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</SmallBtn>
                                <SmallBtn
                                    danger
                                    disabled={items.length <= min}
                                    title={items.length <= min ? `Keep at least ${min}` : undefined}
                                    onClick={() => onChange(items.filter((x) => x.id !== item.id))}
                                >
                                    Remove
                                </SmallBtn>
                            </div>
                        </div>
                        <div className="flex flex-col gap-[12px]">{children(item, patch(item.id))}</div>
                    </div>
                ))}
            </div>
            <div className="mt-[14px] flex flex-wrap items-center gap-[12px]">
                <SmallBtn disabled={items.length >= max} onClick={() => onChange([...items, { id: uid(), ...makeNew }])}>
                    {addLabel}
                </SmallBtn>
                <span className={`${serif} text-[11px] text-[#666]`}>{items.length} of {max} max</span>
            </div>
        </div>
    );
}

function PhotoField({ value, onChange, notify }) {
    const ref = useRef(null);
    const [busy, setBusy] = useState(false);
    const imageSrc = homeImageSource(value);
    const pick = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return notify("Use a PNG, JPG, or WebP image.", true);
        if (file.size > MAX_IMAGE_MB * 1024 * 1024) return notify(`Image must be under ${MAX_IMAGE_MB} MB.`, true);
        setBusy(true);
        try {
            const { url } = await uploadHomeImage(file);
            onChange(url);
        } catch (err) {
            notify(`Upload failed: ${err.message}`, true);
        } finally {
            setBusy(false);
        }
    };
    return (
        <div className="flex flex-wrap items-center gap-[14px]">
            <div className="flex h-[64px] w-[104px] shrink-0 items-center justify-center overflow-hidden rounded-[6px] border border-[#c7b6b6] bg-[#f2f2f2]">
                {imageSrc ? <img src={imageSrc} alt="" className="h-full w-full object-cover" /> : <span className={`${serif} text-[11px] text-[#666]`}>No photo</span>}
            </div>
            <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={pick} />
            <SmallBtn disabled={busy} onClick={() => ref.current?.click()}>{busy ? "Uploading…" : value ? "Replace" : "Upload"}</SmallBtn>
            {value && !busy && <SmallBtn danger onClick={() => onChange("")}>Remove</SmallBtn>}
            <span className={`${serif} text-[11px] text-[#666]`}>PNG, JPG, WebP · up to {MAX_IMAGE_MB} MB</span>
        </div>
    );
}

/** Mga taong lalabas sa About page. Awtomatiko galing sa admin at affiliate accounts. */
function AboutPeople({ members, onChange }) {
    const patch = (id, p) => onChange(members.map((m) => (m.user_id === id ? { ...m, ...p } : m)));
    const move = (i, d) => {
        const j = i + d;
        if (j < 0 || j >= members.length) return;
        const next = [...members];
        [next[i], next[j]] = [next[j], next[i]];
        onChange(next);
    };
    const initials = (m) => `${(m.first_name || "").charAt(0)}${(m.last_name || "").charAt(0)}`.toUpperCase() || "T";

    if (members.length === 0) {
        return <p className={`${serif} text-[13px] text-[#666]`}>No admin or affiliate accounts yet. They will appear here once they exist.</p>;
    }

    return (
        <div className="flex flex-col gap-[14px]">
            {members.map((m, i) => (
                <div
                    key={m.user_id}
                    className={`rounded-[8px] border border-[#e8e8e8] p-3 sm:p-[16px] ${m.visible ? "bg-white" : "bg-[#fafafa]"}`}
                >
                    <div className="flex flex-col gap-[12px] sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-[12px]">
                            {m.avatar_url ? (
                                <img src={m.avatar_url} alt="" className="h-[44px] w-[44px] shrink-0 rounded-full object-cover" />
                            ) : (
                                <span className={`${serif} grid h-[44px] w-[44px] shrink-0 place-items-center rounded-full bg-[#cfe4dc] text-[15px] text-[#214f44]`}>
                                    {initials(m)}
                                </span>
                            )}
                            <div className="min-w-0">
                                <div className={`${serif} truncate text-[14px] font-bold text-[#202020]`}>{m.name}</div>
                                <div className={`${inter} text-[11px] text-[#666]`}>{m.role === "ADMIN" ? "Admin account" : "Affiliate account"}</div>
                            </div>
                        </div>
                        <div className="flex shrink-0 gap-[6px]">
                            <SmallBtn disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</SmallBtn>
                            <SmallBtn disabled={i === members.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</SmallBtn>
                        </div>
                    </div>

                    <div className="mt-[14px] grid grid-cols-1 gap-[12px] md:grid-cols-[1fr_auto] md:items-end">
                        <Field label="Title shown to clients" hint="Leave blank to hide the title on the About page.">
                            <input
                                className={inputH}
                                maxLength={80}
                                value={m.title}
                                onChange={(e) => patch(m.user_id, { title: e.target.value })}
                            />
                        </Field>
                        <label className={`${serif} flex h-[38px] cursor-pointer items-center gap-[8px] text-[13px] text-[#202020]`}>
                            <input
                                type="checkbox"
                                className="h-[16px] w-[16px] accent-[#11a086]"
                                checked={m.visible}
                                onChange={(e) => patch(m.user_id, { visible: e.target.checked })}
                            />
                            Show on About page
                        </label>
                    </div>

                    <div className="mt-[12px] rounded-[6px] bg-[#f1f6f3] px-[12px] py-[10px]">
                        <p className={`${inter} m-0 text-[11px] font-bold text-[#666]`}>Background (from their Profile)</p>
                        {m.background ? (
                            <p className={`${serif} m-0 mt-[4px] line-clamp-3 whitespace-pre-line text-[12px] leading-[1.5] text-[#444]`}>{m.background}</p>
                        ) : (
                            <p className={`${serif} m-0 mt-[4px] text-[12px] italic text-[#666]`}>No background yet. They can add one in their Profile.</p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
const TABS = ["Hero", "How it works", "Services", "About", "FAQ", "Contact"];

export default function AdminHome() {
    const [content, setContent] = useState(DEFAULT_HOME_CONTENT);
    const [saved, setSaved] = useState(JSON.stringify(DEFAULT_HOME_CONTENT));
    const [about, setAbout] = useState(EMPTY_ABOUT);
    const [savedAbout, setSavedAbout] = useState(JSON.stringify(EMPTY_ABOUT));
    const [aboutDefaults, setAboutDefaults] = useState({ headline: "", intro: "" });
    const [aboutError, setAboutError] = useState("");
    const [tab, setTab] = useState("Hero");
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    const notify = (msg, error = false) => {
        setToast({ msg, error });
        setTimeout(() => setToast(null), 3000);
    };

    const load = async () => {
        setLoading(true);
        setLoadError("");
        setAboutError("");
        try {
            const merged = mergeHomeContent(await getHomeContent());
            setContent(merged);
            setSaved(JSON.stringify(merged));
        } catch (e) {
            setLoadError(e.message);
        }
        // Hiwalay ang About para hindi ma-block ang buong page kapag nagka-error dito
        try {
            const d = await apiFetch("/admin/about-team");
            const next = { headline: d.about.headline, intro: d.about.intro, members: d.members || [] };
            setAbout(next);
            setSavedAbout(JSON.stringify(next));
            setAboutDefaults(d.defaults || { headline: "", intro: "" });
        } catch (e) {
            setAboutError(e.message || "Could not load the About page settings.");
        }
        setLoading(false);
    };
    useEffect(() => { load(); }, []);

    const aboutReady = !aboutError;
    const dirty = JSON.stringify(content) !== saved || (aboutReady && JSON.stringify(about) !== savedAbout);
    useEffect(() => {
        if (!dirty) return;
        const h = (e) => { e.preventDefault(); e.returnValue = ""; };
        window.addEventListener("beforeunload", h);
        return () => window.removeEventListener("beforeunload", h);
    }, [dirty]);

    const setSection = (key, patch) => setContent((c) => ({ ...c, [key]: { ...c[key], ...patch } }));
    const setList = (key) => (list) => setContent((c) => ({ ...c, [key]: list }));

    /* ---- validation, per tab ---- */
    const errors = useMemo(() => {
        const { hero, steps, services, faqs, contact } = content;
        const e = {};
        e.Hero = [
            !hero.headline.trim() && "Headline is required.",
            !hero.ctaLabel.trim() && "Button label is required.",
        ].filter(Boolean);
        e["How it works"] = steps.some((s) => !s.title.trim() || !s.text.trim()) ? ["Every step needs a title and description."] : [];
        e.Services = services.some((s) => !s.title.trim() || !s.text.trim()) ? ["Every service needs a title and description."] : [];
        e.About = aboutReady
            ? [
                !about.headline.trim() && "The About page headline is required.",
                about.members.some((m) => m.title.length > 80) && "Titles can be up to 80 characters.",
            ].filter(Boolean)
            : [];
        e.FAQ = faqs.some((f) => !f.q.trim() || !f.a.trim()) ? ["Every FAQ needs a question and an answer."] : [];
        e.Contact = [
            !/\S+@\S+\.\S+/.test(contact.email) && "Enter a valid email.",
            !contact.phone.trim() && "Phone is required.",
            !contact.address.trim() && "Address is required.",
            contact.facebook && !/^https?:\/\//.test(contact.facebook) && "Facebook link must start with https://",
        ].filter(Boolean);
        return e;
    }, [content, about, aboutReady]);
    const totalErrors = Object.values(errors).reduce((n, l) => n + l.length, 0);
    const valid = totalErrors === 0;

    const save = async () => {
        setSaving(true);
        try {
            const payload = aboutReady
                ? {
                    ...content,
                    about: {
                        headline: about.headline.trim(),
                        intro: about.intro.trim(),
                        members: about.members.map((m) => ({
                            user_id: m.user_id,
                            title: m.title.trim(),
                            visible: m.visible,
                        })),
                    },
                }
                : content;
            const res = await saveHomeContent(payload);
            const next = mergeHomeContent(res || content);
            setContent(next);
            setSaved(JSON.stringify(next));
            if (aboutReady) setSavedAbout(JSON.stringify(about));
            notify("Home page updated");
        } catch (e) {
            notify(`Couldn't save: ${e.message}`, true);
        } finally {
            setSaving(false);
        }
    };

    const discard = () => {
        if (window.confirm("Discard all unsaved changes?")) {
            setContent(JSON.parse(saved));
            setAbout(JSON.parse(savedAbout));
        }
    };

    const resetDefaults = () => {
        if (window.confirm("Reset all home page content to the original text? You can still discard this before saving.")) {
            setContent(mergeHomeContent(null));
            if (aboutReady) setAbout((a) => ({ ...a, headline: aboutDefaults.headline, intro: aboutDefaults.intro }));
        }
    };

    const { hero, steps, services, faqs, contact } = content;
    const heroImageSrc = homeImageSource(hero.photo);
    const tabErrors = errors[tab];

    return (
        <div className="flex min-h-screen w-full bg-[#f2f2f2] antialiased">
            <style>{FONT_CSS}</style>

            {/* Sidebar + hamburger/drawer ay nasa AdminNavigation na */}
            <AdminNavigation />

            {/* pt-[68px] sa phone para hindi matakpan ng hamburger button */}
            <main className="min-w-0 flex-1 px-4 pb-[170px] pt-[68px] sm:px-6 sm:pb-[120px] lg:px-[41px] lg:pt-[51px]">
                <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <div className={`${inter} text-[14px] font-bold tracking-[4.2px] text-[#4a9b8e] sm:text-[20px]`}>HOME</div>
                        <h1 className={`${serif} mt-[8px] text-[30px] font-bold leading-[1.15] text-[#2f4a42] sm:text-[40px]`}>Manage home page</h1>
                        <p className={`${serif} mt-[4px] text-[14px] text-[#666]`}>Edit what clients see on the Client Site home and About pages, section by section.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-[17px] gap-y-2">
                        <button onClick={resetDefaults} className={`${serif} text-[12px] text-[#666] underline hover:text-black`}>Reset to original text</button>
                        <a href="/" target="_blank" rel="noopener noreferrer" className={`${serif} text-[12px] font-bold text-[#222b28] underline`}>Open client site</a>
                        <ProfileMenu size={37} />
                    </div>
                </header>

                {loading && (
                    <div className="mt-[28px] space-y-[18px] sm:mt-[34px]" aria-busy="true">
                        <div className="flex gap-2 overflow-hidden rounded-[11px] bg-[#4a9b8e30] p-[4px] lg:w-fit">
                            {TABS.map((item) => <SkeletonBlock key={item} className="h-[30px] w-20 shrink-0 rounded-[9px] bg-[#d7e8e2]" />)}
                        </div>
                        <section className="rounded-[10px] border border-[#c7b6b6] bg-white p-4 sm:p-[24px]">
                            <SkeletonBlock className="h-5 w-48 rounded" />
                            <SkeletonBlock className="mt-3 h-3 w-3/4 rounded" />
                            <div className="mt-6 grid gap-4 md:grid-cols-2">
                                {[0, 1, 2, 3].map((field) => (
                                    <div key={field}>
                                        <SkeletonBlock className="mb-2 h-3 w-28 rounded" />
                                        <SkeletonBlock className="h-10 w-full rounded-md" />
                                    </div>
                                ))}
                                <div className="md:col-span-2">
                                    <SkeletonBlock className="mb-2 h-3 w-24 rounded" />
                                    <SkeletonBlock className="h-24 w-full rounded-md" />
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {loadError && !loading && (
                    <div className="mt-[34px] rounded-[10px] border border-[#ff4c4c75] bg-white p-4 sm:p-[24px]">
                        <p className={`${serif} text-[14px] text-[#b3382a]`}>Couldn't load the content: {loadError}</p>
                        <button onClick={load} className={`${serif} mt-[12px] h-[34px] rounded-[6px] bg-[#11a086] px-[16px] text-[13px] text-white hover:bg-[#0e8c75]`}>Try again</button>
                    </div>
                )}

                {!loading && !loadError && (
                    <>
                        {/* Tabs: nag-i-scroll pahalang sa maliit na screen */}
                        <div className="mt-[28px] max-w-full overflow-x-auto rounded-[11px] bg-[#4a9b8e30] p-[4px] sm:mt-[34px] lg:w-fit" role="tablist">
                            <div className="flex w-max gap-[4px]">
                                {TABS.map((t) => (
                                    <button
                                        key={t}
                                        role="tab"
                                        aria-selected={tab === t}
                                        onClick={() => setTab(t)}
                                        className={`${serif} relative h-[34px] shrink-0 whitespace-nowrap rounded-[9px] px-[16px] text-[13px] text-[#202020] sm:h-[30px] ${tab === t ? "bg-white" : "hover:bg-white/50"}`}
                                    >
                                        {t}
                                        {errors[t].length > 0 && <span className="absolute right-[5px] top-[5px] h-[7px] w-[7px] rounded-full bg-[#e07b6a]" aria-label="Has errors" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {tabErrors.length > 0 && (
                            <ul role="alert" className={`${serif} mt-[16px] w-full list-disc rounded-[8px] border border-[#ff4c4c75] bg-[#fff1f1] py-[10px] pl-[32px] pr-[16px] text-[12px] text-[#b3382a]`}>
                                {tabErrors.map((m) => <li key={m}>{m}</li>)}
                            </ul>
                        )}

                        <div className="mt-[20px] flex w-full flex-col gap-[24px]">
                            {tab === "Hero" && (
                                <Card title="Hero" hint="The first section clients see. The highlighted words appear in green and bold.">
                                    <div className="flex flex-col gap-[14px]">
                                        <Field label="Small label above headline"><input className={inputH} value={hero.eyebrow} onChange={(e) => setSection("hero", { eyebrow: e.target.value })} /></Field>
                                        <div className="grid grid-cols-1 gap-[14px] md:grid-cols-2">
                                            <Field label="Headline"><input className={inputH} value={hero.headline} onChange={(e) => setSection("hero", { headline: e.target.value })} /></Field>
                                            <Field label="Highlighted words" hint="Shown after the headline, ending with a period."><input className={inputH} value={hero.highlight} onChange={(e) => setSection("hero", { highlight: e.target.value })} /></Field>
                                        </div>
                                        <Field label="Description"><textarea rows={3} className={areaCls} value={hero.subtext} onChange={(e) => setSection("hero", { subtext: e.target.value })} /></Field>
                                        <Field
                                            label="Hero banner image"
                                            hint="Shown as a full-width banner behind the text, with a soft fade on the left. Use a wide landscape photo (about 1920×800) and keep the main subject on the right. Any image is automatically cropped to fit."
                                        >
                                            <PhotoField
                                                value={hero.photo}
                                                onChange={(photo) => setSection("hero", { photo })}
                                                notify={notify}
                                            />
                                        </Field>
                                        <div className="grid grid-cols-1 gap-[14px] md:grid-cols-2">
                                            <Field label="Main button label"><input className={inputH} value={hero.ctaLabel} onChange={(e) => setSection("hero", { ctaLabel: e.target.value })} /></Field>
                                            <Field label="Secondary link label"><input className={inputH} value={hero.linkLabel} onChange={(e) => setSection("hero", { linkLabel: e.target.value })} /></Field>
                                        </div>
                                    </div>

                                    {/* Live preview: same banner + left fade as the client site */}
                                    <p className={`${inter} mb-[8px] mt-[20px] text-[12px] font-bold text-[#666]`}>Preview (what clients will see)</p>
                                    <div
                                        className={`relative isolate overflow-hidden rounded-[8px] border border-[#e8e8e8] ${heroImageSrc ? "bg-[#faf9f6]" : "bg-[#f1f6f3]"}`}
                                    >
                                        {heroImageSrc && (
                                            <>
                                                <img
                                                    src={heroImageSrc}
                                                    alt="Hero preview"
                                                    className="absolute inset-0 -z-[2] h-full w-full object-cover object-[72%_center] sm:object-right"
                                                />
                                                <div
                                                    className="absolute inset-0 -z-[1] bg-[linear-gradient(90deg,#faf9f6_0%,rgba(250,249,246,0.94)_28%,rgba(250,249,246,0.6)_46%,rgba(250,249,246,0.15)_68%,rgba(250,249,246,0)_85%)] max-sm:bg-[linear-gradient(180deg,rgba(250,249,246,0.94)_0%,rgba(250,249,246,0.82)_55%,rgba(250,249,246,0.4)_100%)]"
                                                    aria-hidden="true"
                                                />
                                            </>
                                        )}
                                        <div className="relative z-10 max-w-[380px] px-5 py-8 sm:px-8 sm:py-10">
                                            <p className={`${serif} text-[10px] tracking-[0.08em] text-[#5a615d]`}>{hero.eyebrow}</p>
                                            <p className={`${serif} mt-[6px] text-[22px] leading-[1.15] text-[#111] sm:text-[26px]`}>
                                                {hero.headline} <b className="text-[#4a9b8e]">{hero.highlight}</b>.
                                            </p>
                                            <p className={`${serif} mt-[8px] text-[12px] leading-[1.5] text-[#333]`}>{hero.subtext}</p>
                                            <div className="mt-[14px] flex flex-wrap items-center gap-[16px]">
                                                <span className={`${serif} inline-flex h-[34px] items-center rounded-[6px] bg-[#181c3b] px-[16px] text-[12px] text-white`}>{hero.ctaLabel}</span>
                                                <span className={`${serif} text-[12px] text-black/70 underline`}>{hero.linkLabel}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            )}

                            {tab === "How it works" && (
                                <Card title="How it works" hint="The numbered steps clients follow to get started.">
                                    <ListEditor
                                        items={steps} onChange={setList("steps")} min={1} max={6}
                                        label="Step" addLabel="Add step" makeNew={{ icon: "select", title: "", text: "" }}
                                        preview={(s) => s.title}
                                    >
                                        {(s, patch) => (
                                            <>
                                                <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-[1fr_160px]">
                                                    <Field label="Title"><input className={inputH} value={s.title} onChange={(e) => patch({ title: e.target.value })} /></Field>
                                                    <Field label="Icon">
                                                        <select className={inputH} value={s.icon} onChange={(e) => patch({ icon: e.target.value })}>
                                                            {STEP_ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
                                                        </select>
                                                    </Field>
                                                </div>
                                                <Field label="Description"><textarea rows={2} className={areaCls} value={s.text} onChange={(e) => patch({ text: e.target.value })} /></Field>
                                            </>
                                        )}
                                    </ListEditor>
                                </Card>
                            )}

                            {tab === "Services" && (
                                <Card title="Services section" hint="The service showcase on the home page. Session length and price for booking are managed in Services.">
                                    <ListEditor
                                        items={services} onChange={setList("services")} min={1} max={6}
                                        label="Service" addLabel="Add service" makeNew={{ icon: "chat", photo: "", meta: "", title: "", text: "" }}
                                        preview={(s) => s.title}
                                    >
                                        {(s, patch) => (
                                            <>
                                                <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2">
                                                    <Field label="Title"><input className={inputH} value={s.title} onChange={(e) => patch({ title: e.target.value })} /></Field>
                                                    <Field label="Small label (e.g. 1 Hour Session)"><input className={inputH} value={s.meta} onChange={(e) => patch({ meta: e.target.value })} /></Field>
                                                </div>
                                                <Field label="Description"><textarea rows={3} className={areaCls} value={s.text} onChange={(e) => patch({ text: e.target.value })} /></Field>
                                                <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-[160px_1fr] sm:items-end">
                                                    <Field label="Fallback icon" hint="Used if no photo.">
                                                        <select className={inputH} value={s.icon} onChange={(e) => patch({ icon: e.target.value })}>
                                                            {SERVICE_ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
                                                        </select>
                                                    </Field>
                                                    <PhotoField value={s.photo} onChange={(url) => patch({ photo: url })} notify={notify} />
                                                </div>
                                            </>
                                        )}
                                    </ListEditor>
                                </Card>
                            )}

                            {tab === "About" && (
                                <>
                                    {aboutError && (
                                        <div className="rounded-[10px] border border-[#ff4c4c75] bg-white p-4 sm:p-[24px]">
                                            <p className={`${serif} text-[14px] text-[#b3382a]`}>Couldn't load the About page settings: {aboutError}</p>
                                            <button onClick={load} className={`${serif} mt-[12px] h-[34px] rounded-[6px] bg-[#11a086] px-[16px] text-[13px] text-white hover:bg-[#0e8c75]`}>Try again</button>
                                        </div>
                                    )}

                                    {aboutReady && (
                                        <>
                                            <Card title="About page intro" hint="The opening text on the About page. Shown at the top, next to the book button.">
                                                <div className="flex flex-col gap-[14px]">
                                                    <Field label="Headline">
                                                        <input className={inputH} maxLength={160} value={about.headline} onChange={(e) => setAbout((a) => ({ ...a, headline: e.target.value }))} />
                                                    </Field>
                                                    <Field label="Introduction">
                                                        <textarea rows={4} maxLength={800} className={areaCls} value={about.intro} onChange={(e) => setAbout((a) => ({ ...a, intro: e.target.value }))} />
                                                    </Field>
                                                </div>
                                            </Card>

                                            <Card
                                                title="The people behind your care"
                                                hint="Added automatically from admin and affiliate accounts. Name, photo, and background come from each person's own Profile. Here you set the title clients see, who is shown, and the order."
                                            >
                                                <AboutPeople
                                                    members={about.members}
                                                    onChange={(members) => setAbout((a) => ({ ...a, members }))}
                                                />
                                            </Card>
                                        </>
                                    )}
                                </>
                            )}

                            {tab === "FAQ" && (
                                <Card title="Frequently asked questions">
                                    <ListEditor
                                        items={faqs} onChange={setList("faqs")} min={1} max={12}
                                        label="Question" addLabel="Add question" makeNew={{ q: "", a: "" }}
                                        preview={(f) => f.q}
                                    >
                                        {(f, patch) => (
                                            <>
                                                <Field label="Question"><input className={inputH} value={f.q} onChange={(e) => patch({ q: e.target.value })} /></Field>
                                                <Field label="Answer"><textarea rows={3} className={areaCls} value={f.a} onChange={(e) => patch({ a: e.target.value })} /></Field>
                                            </>
                                        )}
                                    </ListEditor>
                                </Card>
                            )}

                            {tab === "Contact" && (
                                <Card title="Contact & hours" hint="Shown in the “Message the clinic” section.">
                                    <div className="grid grid-cols-1 gap-[14px] md:grid-cols-2">
                                        <Field label="Email"><input type="email" className={inputH} value={contact.email} onChange={(e) => setSection("contact", { email: e.target.value })} /></Field>
                                        <Field label="Phone"><input type="tel" className={inputH} value={contact.phone} onChange={(e) => setSection("contact", { phone: e.target.value })} /></Field>
                                        <div className="md:col-span-2">
                                            <Field label="Address" hint="Also used for the “Open in Maps” link."><input className={inputH} value={contact.address} onChange={(e) => setSection("contact", { address: e.target.value })} /></Field>
                                        </div>
                                        <Field label="Facebook page link"><input className={inputH} placeholder="https://facebook.com/…" value={contact.facebook} onChange={(e) => setSection("contact", { facebook: e.target.value })} /></Field>
                                        <Field label="Facebook display name"><input className={inputH} value={contact.facebookLabel} onChange={(e) => setSection("contact", { facebookLabel: e.target.value })} /></Field>
                                        <div className="md:col-span-2">
                                            <Field label="Clinic hours"><input className={inputH} value={contact.hours} onChange={(e) => setSection("contact", { hours: e.target.value })} /></Field>
                                        </div>
                                    </div>
                                </Card>
                            )}
                        </div>
                    </>
                )}
            </main>

            {/* Sticky save bar */}
            {!loading && !loadError && (
                <div className="fixed bottom-0 left-0 right-0 z-30 flex flex-col gap-2 border-t border-[#c7b6b6] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:left-[321px] lg:px-[41px] lg:py-[14px]">
                    <span className={`${serif} text-[13px] ${dirty ? "text-[#8a6a00]" : "text-[#666]"}`}>
                        {!dirty
                            ? "All changes saved."
                            : valid
                                ? "You have unsaved changes."
                                : `Fix ${totalErrors} ${totalErrors === 1 ? "issue" : "issues"} (tabs with a red dot) to save.`}
                    </span>
                    <div className="flex gap-[10px] max-sm:[&>button]:flex-1">
                        <button disabled={!dirty || saving} onClick={discard} className={`${serif} h-[40px] rounded-[6px] border border-[#c7b6b6] bg-white px-[18px] text-[13px] hover:bg-[#f2f2f2] disabled:opacity-40 sm:h-[36px]`}>Discard</button>
                        <button disabled={!dirty || !valid || saving} onClick={save} className={`${serif} h-[40px] rounded-[6px] bg-[#11a086] px-[18px] text-[13px] text-white hover:bg-[#0e8c75] disabled:cursor-not-allowed disabled:opacity-50 sm:h-[36px]`}>
                            {saving ? "Saving…" : "Save changes"}
                        </button>
                    </div>
                </div>
            )}

            {toast && (
                <div role="status" className={`${inter} fixed bottom-[120px] left-4 right-4 z-[70] rounded-[8px] px-[18px] py-[10px] text-center text-[13px] text-white sm:bottom-[80px] sm:left-auto sm:right-[28px] sm:text-left ${toast.error ? "bg-[#b3382a]" : "bg-[#2f4a42]"}`}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}