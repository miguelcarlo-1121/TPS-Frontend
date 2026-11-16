import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar, Footer, Reveal, Photo, container, btnSolid } from "../components/Layout";
import { apiFetch, API_URL } from "../auth";
import { peso } from "../components/payUtils";
import SkeletonBlock from "../components/SkeletonBlock";

/* Where "Book now" goes. */
const BOOK_TO = "/book";

/* ---------- Original illustrations (inline SVG, one per service) ---------- */
const INK = "#2c4a4f";

/* Psychotherapy: a head with a plant growing inside, plus talking/caring bubbles */
function PsychotherapyArt({ className }) {
  return (
    <svg viewBox="0 0 500 440" className={className} role="img" aria-label="Illustration of a head with a plant growing inside it">
      <defs>
        <linearGradient id="gradPsy" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b9d4c7" />
          <stop offset="1" stopColor="#8fb5a3" />
        </linearGradient>
      </defs>
      <path d="M52 205C30 100 140 22 262 38c108 14 215-12 226 112 10 118-58 205-172 246-118 42-232-36-264-191Z" fill="url(#gradPsy)" />
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        {/* head profile */}
        <path d="M170 335V300C140 280 130 240 140 200 150 140 200 100 260 105c60 5 95 45 92 95v15l20 30c2 5-2 9-10 9h-10v26c0 20-17 30-37 30h-15v10z" fill="#f6e7c8" />
        {/* shoulders */}
        <path d="M110 372c10-28 50-40 90-40h100c40 0 70 12 82 40z" fill="#4a9b8e" />
        {/* soil + plant */}
        <ellipse cx="240" cy="272" rx="30" ry="8" fill="#c98a55" />
        <path d="M240 266C238 230 244 200 240 165" fill="none" strokeWidth="4" />
        <path d="M240 205C215 205 205 185 210 168 232 168 242 184 240 205z" fill="#10a28c" />
        <path d="M242 190C265 190 278 170 272 153 250 153 240 171 242 190z" fill="#6fbfa8" />
        <path d="M240 168C228 155 232 140 240 130 250 140 250 156 240 168z" fill="#10a28c" />
        {/* eye + smile */}
        <path d="M318 196q8 -6 16 0" fill="none" />
        <path d="M340 270q-8 8 -18 4" fill="none" />
        {/* bubble: talking */}
        <rect x="68" y="86" width="96" height="58" rx="20" fill="#fff" />
        <path d="M110 144l-8 20 26-20z" fill="#fff" />
        <circle cx="94" cy="115" r="5" fill={INK} stroke="none" />
        <circle cx="116" cy="115" r="5" fill={INK} stroke="none" />
        <circle cx="138" cy="115" r="5" fill={INK} stroke="none" />
        {/* bubble: care */}
        <rect x="372" y="84" width="66" height="62" rx="20" fill="#fff" />
        <path d="M400 146l12 18 6-18z" fill="#fff" />
        <path d="M405 130C385 116 383 98 396 95c6-1 9 4 9 7 0-3 3-8 9-7 13 3 11 21-9 35z" fill="#e58f6f" />
      </g>
      <circle cx="78" cy="250" r="5" fill="#fff" opacity=".7" />
      <circle cx="96" cy="276" r="3" fill="#fff" opacity=".7" />
      <circle cx="430" cy="230" r="4" fill="#fff" opacity=".7" />
    </svg>
  );
}

/* ABA Therapy: lettered blocks that climb like steps toward a star, with a child reaching up */
function AbaArt({ className }) {
  return (
    <svg viewBox="0 0 500 440" className={className} role="img" aria-label="Illustration of a child climbing lettered block steps toward a star">
      <defs>
        <linearGradient id="gradAba" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b9d4c7" />
          <stop offset="1" stopColor="#8fb5a3" />
        </linearGradient>
      </defs>
      <path d="M70 160C90 70 210 30 300 52c90 22 170 70 176 160 6 90-60 170-160 190-100 20-210-10-244-110-8-24-8-60-2-92z" fill="url(#gradAba)" />
      <ellipse cx="270" cy="376" rx="190" ry="12" fill="#4a9b8e" opacity=".75" />
      <path d="M150 215C200 120 290 100 326 118" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeDasharray="1 11" />
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        {/* block steps */}
        <rect x="180" y="320" width="70" height="52" rx="8" fill="#e58f6f" />
        <rect x="250" y="270" width="70" height="102" rx="8" fill="#f0c24f" />
        <rect x="320" y="220" width="70" height="152" rx="8" fill="#6fbfa8" />
        <rect x="390" y="170" width="60" height="202" rx="8" fill="#4a9b8e" />
        <g stroke="none" fill={INK} fontFamily="Georgia, serif" fontWeight="700" fontSize="30" textAnchor="middle">
          <text x="215" y="358">A</text>
          <text x="285" y="334">B</text>
          <text x="355" y="304">C</text>
        </g>
        {/* star */}
        <polygon points="420,112 426,127 443,128 430,138 434,154 420,145 406,154 410,138 397,128 414,127" fill="#f0c24f" />
        {/* child */}
        <rect x="117" y="324" width="12" height="30" rx="4" fill="#3f4f86" />
        <rect x="134" y="324" width="12" height="30" rx="4" fill="#3f4f86" />
        <ellipse cx="123" cy="358" rx="12" ry="6" fill={INK} />
        <ellipse cx="141" cy="358" rx="12" ry="6" fill={INK} />
        <path d="M112 330c-4-30 0-52 18-52s22 22 18 52z" fill="#e58f6f" />
        <path d="M146 292l36-30" strokeWidth="10" stroke="#e58f6f" fill="none" />
        <path d="M146 292l36-30" strokeWidth="3" fill="none" />
        <circle cx="130" cy="256" r="18" fill="#e8b48f" />
        <path d="M112 252c-2-16 8-24 20-24s20 8 18 22c-8-8-24-10-38 2z" fill="#4a2f25" />
        <path d="M123 264q7 6 14 0" fill="none" />
        {/* ball + balloon */}
        <circle cx="88" cy="352" r="14" fill="#f0c24f" />
        <path d="M80 346q8 8 16 0" fill="none" strokeWidth="2" />
        <circle cx="96" cy="120" r="24" fill="#e58f6f" />
        <path d="M96 144c-4 20 8 34 -2 56" fill="none" strokeWidth="2" />
      </g>
      <circle cx="170" cy="150" r="4" fill="#fff" opacity=".8" />
      <circle cx="300" cy="90" r="3" fill="#fff" opacity=".8" />
    </svg>
  );
}

/* Assessment & Consultation: clipboard checklist under a magnifying glass */
function AssessmentArt({ className }) {
  return (
    <svg viewBox="0 0 500 440" className={className} role="img" aria-label="Illustration of a clipboard checklist with a magnifying glass">
      <defs>
        <linearGradient id="gradAsm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b9d4c7" />
          <stop offset="1" stopColor="#8fb5a3" />
        </linearGradient>
      </defs>
      <path d="M44 240C20 140 100 50 220 40c110-9 232 20 252 130 20 108-40 200-150 226C210 422 70 350 44 240z" fill="url(#gradAsm)" />
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        {/* clipboard */}
        <rect x="150" y="80" width="190" height="262" rx="16" fill="#fbf6e9" />
        <rect x="215" y="64" width="60" height="30" rx="9" fill="#4a9b8e" />
        {[130, 175, 220, 265].map((y, i) => (
          <g key={y}>
            <rect x="174" y={y} width="24" height="24" rx="6" fill="#fff" />
            {i < 3 && <path d={`M179 ${y + 12}l6 6 9-12`} fill="none" stroke="#10a28c" strokeWidth="4" />}
            <rect x="214" y={y + 8} width={[104, 86, 96, 70][i]} height="9" rx="4.5" fill="#b9d4c7" stroke="none" />
          </g>
        ))}
        {/* question bubble */}
        <circle cx="108" cy="130" r="26" fill="#fff" />
        <path d="M96 150l-10 18 24-10z" fill="#fff" />
        <text x="108" y="141" stroke="none" fill="#10a28c" fontFamily="Georgia, serif" fontWeight="700" fontSize="32" textAnchor="middle">?</text>
        {/* puzzle piece */}
        <g fill="#f0c24f">
          <rect x="80" y="276" width="52" height="52" rx="6" />
          <circle cx="106" cy="272" r="10" />
          <circle cx="136" cy="302" r="10" />
        </g>
        {/* magnifier */}
        <path d="M382 306l44 44" strokeWidth="16" stroke={INK} fill="none" />
        <path d="M382 306l44 44" strokeWidth="10" stroke="#c98a55" fill="none" />
        <circle cx="345" cy="270" r="50" fill="#fff" fillOpacity=".7" strokeWidth="6" />
        <rect x="320" y="270" width="14" height="30" rx="3" fill="#10a28c" strokeWidth="2" />
        <rect x="340" y="252" width="14" height="48" rx="3" fill="#f0c24f" strokeWidth="2" />
        <rect x="360" y="280" width="14" height="20" rx="3" fill="#e58f6f" strokeWidth="2" />
      </g>
      <circle cx="430" cy="110" r="4" fill="#fff" opacity=".8" />
      <circle cx="70" cy="200" r="3" fill="#fff" opacity=".8" />
    </svg>
  );
}

/* Illustration per service id. New ids fall back to the assessment art. */
const ART = {
  psychotherapy: PsychotherapyArt,
  aba: AbaArt,
  assessment: AssessmentArt,
};

/* ---------- Content ----------
   The live content comes from the API (edited in Admin > Services, prices set in
   Admin > Payment methods). DEFAULTS below is only a fallback if the API can't be reached. */
const DEFAULTS = [
  {
    id: "psychotherapy",
    name: "Psychotherapy / Counseling",
    title: "Psychotherapy / Counseling",
    hours: 1,
    meta: "Online or in-person",
    text: "Individual talk therapy designed to build self-awareness, explore complex emotions, and develop healthy, lasting ways of coping with daily life.",
    goodFor: ["Anxiety", "Low mood", "Stress & burnout", "Relationships", "Grief"],
    steps: [
      "You talk through what's on your mind in a private, judgment-free space.",
      "Together we explore the patterns behind your thoughts, feelings, and reactions.",
      "You leave with practical coping skills you can use right away.",
    ],
  },
  {
    id: "aba",
    name: "ABA Therapy",
    title: "ABA Therapy",
    hours: 2,
    meta: "Intensive · For children · Parents involved",
    text: "Structured, play-based sessions using Applied Behavior Analysis. We focus on building skills step by step with positive reinforcement in a warm, encouraging space.",
    goodFor: ["Autism", "Developmental delays", "Communication", "Social skills", "Daily routines"],
    steps: [
      "Goals are set around your child's needs, strengths, and pace.",
      "Skills are built through play, practice, and positive reinforcement.",
      "Parents are guided on how to carry progress over to home.",
    ],
  },
  {
    id: "assessment",
    name: "Assessment & Consultation",
    title: "Assessment & Consultation",
    hours: 1,
    meta: "Comprehensive review · Adults & children",
    text: "A thorough review and structured interview that gives you a clear picture of what's going on, along with recommendations tailored to you or your child.",
    goodFor: ["Not sure where to start", "Seeking clarity", "Learning concerns", "Behavior concerns", "Next-step guidance"],
    steps: [
      "We gather background and clarify the concerns you want help understanding.",
      "A structured interview and review help map strengths, challenges, and context.",
      "You receive clear recommendations and next-step options tailored to you or your child.",
    ],
  },
];

/* Makes sure every service has what the markup needs, whatever the API sends. */
function normalize(s) {
  const hours = Number(s.hours) || 1;
  return {
    ...s,
    hours,
    title: s.title || s.name,
    meta: s.meta || "",
    text: s.text || "",
    goodFor: Array.isArray(s.goodFor) ? s.goodFor : [],
    steps: Array.isArray(s.steps) ? s.steps : [],
    assessment_types: Array.isArray(s.assessment_types) ? s.assessment_types : [],
    label: `${hours} · HOUR SESSION`,
    price: Number(s.price) || 0,
    downpayment_amount: Number(s.downpayment_amount) || 0,
    imageUrl: s.image_url || "",
    downpayment_percent: Number(s.downpayment_percent) || 0,
    full_only: !!s.full_only,
    Art: ART[s.id] || AssessmentArt,
  };
}

/* Downpayment in pesos, or 0 when the service is full-payment only. */
function downpaymentOf(s) {
  if (s.id === "psychotherapy") {
    return s.price > 0 && s.downpayment_amount > 0 && s.downpayment_amount < s.price
      ? s.downpayment_amount
      : 0;
  }
  if (!s.price || s.full_only || !(s.downpayment_percent > 0) || s.downpayment_percent >= 100) return 0;
  return Math.round(s.price * s.downpayment_percent) / 100;
}

/* ---------- Small pieces ---------- */
const Arrow = ({ dir = "right" }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={dir === "down" ? "rotate-90" : undefined}
  >
    <path d="M2 7h10M8 3l4 4-4 4" />
  </svg>
);

/* Small leaf used as the bullet in "What happens" */
const LeafBullet = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    aria-hidden="true"
    className="absolute left-0 top-[5px] shrink-0"
  >
    <path d="M1 11C1 5 4 1 11 1c0 6-3 10-10 10Z" fill="#10a28c" />
  </svg>
);

/* Wrapper for the illustration */
function ServiceArtwork({ Art, src, name }) {
  const [imageFailed, setImageFailed] = useState(false);
  return src && !imageFailed
    ? <img src={src} alt={`${name} service`} className="h-full w-full object-contain" onError={() => setImageFailed(true)} />
    : <Art className="h-full w-full object-contain" />;
}


/* Image frame: hugis-dahon na litrato, pareho ang itsura kahit anong i-upload ni admin */
function Blob({ Art, imageUrl, name }) {
  const [failedSrc, setFailedSrc] = useState("");

  let src = imageUrl;
  if (src) {
    try {
      src = new URL(src, API_URL).toString();
    } catch {
      // Keep externally supplied absolute URLs if URL parsing fails.
    }
  }
  const showPhoto = src && failedSrc !== src;

  /* Walang uploaded na image (o hindi ma-load): ang built-in na illustration */
  if (!showPhoto) {
    return (
      <div className="relative mx-auto flex aspect-[500/440] w-full max-w-[520px] items-center justify-center p-[6%]">
        <Art className="h-full w-full object-contain" />
      </div>
    );
  }

  const leaf = "rounded-[140px_28px_140px_28px]";

  return (
    <div className="mx-auto w-full max-w-[520px] px-5 pb-6 pt-5">
      <div className="group relative">
        {/* tuldok-tuldok na palamuti */}
        <svg
          viewBox="0 0 72 72"
          className="pointer-events-none absolute -right-5 -top-5 h-[72px] w-[72px]"
          aria-hidden="true"
        >
          {[0, 1, 2, 3].flatMap((r) =>
            [0, 1, 2, 3].map((c) => (
              <circle key={`${r}${c}`} cx={9 + c * 18} cy={9 + r * 18} r="2.4" fill="#10a28c" opacity="0.55" />
            ))
          )}
        </svg>

        {/* outline na sumusunod sa hugis ng litrato */}
        <div
          className={`pointer-events-none absolute inset-0 translate-x-4 translate-y-4 border-2 border-[#10a28c]/60 ${leaf}`}
          aria-hidden="true"
        />

        {/* litrato */}
        <figure
          className={`relative m-0 aspect-[5/4] overflow-hidden bg-[#e8f1ee] shadow-[0_26px_50px_-26px_rgba(32,62,67,0.65)] ${leaf}`}
        >
          <img
            src={src}
            alt={`${name} service`}
            loading="lazy"
            className="h-full w-full object-cover object-center transition-transform duration-700 ease-tf group-hover:scale-[1.04]"
            onError={() => setFailedSrc(src)}
          />
          <div className={`pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/10 ${leaf}`} aria-hidden="true" />
        </figure>

        {/* sprout badge */}
        <span
          className="absolute -bottom-5 -left-3 grid h-[64px] w-[64px] place-items-center rounded-full bg-white text-[#10a28c] shadow-[0_12px_28px_-10px_rgba(32,62,67,0.55)] ring-4 ring-[#a9cbbd]"
        >
          <img src="/img/Threefold%20logo.png" alt="Threefold logo" className="h-[42px] w-[42px] object-contain" />
        </span>
      </div>
    </div>
  );
}

/* Decorative leafy vine that sits at the page edge next to a service */
const LEAVES = [
  { x: 34, y: 40, r: -50, c: "#2f5f4f" },
  { x: 54, y: 70, r: 25, c: "#a8cdbc" },
  { x: 34, y: 100, r: -145, c: "#2f5f4f" },
  { x: 54, y: 132, r: 20, c: "#10a28c" },
  { x: 32, y: 165, r: -150, c: "#2f5f4f" },
  { x: 56, y: 195, r: 30, c: "#a8cdbc" },
  { x: 32, y: 228, r: -150, c: "#10a28c" },
  { x: 54, y: 258, r: 28, c: "#2f5f4f" },
  { x: 38, y: 290, r: -35, c: "#10a28c" },
];

function Vine({ side }) {
  return (
    <svg
      viewBox="0 0 90 330"
      aria-hidden="true"
      className={`absolute bottom-[8%] w-[56px] h-auto pointer-events-none max-[1180px]:hidden ${side === "left" ? "-left-[72px]" : "-right-[72px] -scale-x-100"
        }`}
    >
      <path d="M44 326C34 250 50 140 46 12" fill="none" stroke="#2f5f4f" strokeWidth="2" strokeLinecap="round" />
      {LEAVES.map((l, i) => (
        <path
          key={i}
          d="M0 0C6-14 22-16 30 0 22 14 6 14 0 0Z"
          fill={l.c}
          transform={`translate(${l.x} ${l.y}) rotate(${l.r})`}
        />
      ))}
      <circle cx="12" cy="236" r="2.5" fill="#10a28c" />
      <circle cx="-6" cy="262" r="1.8" fill="#a8cdbc" />
    </svg>
  );
}

function Glance({ services }) {
  return (
    <aside
      className="bg-[#fafafa] border border-black/15 rounded-[19px] pt-6 px-[26px] pb-2 max-[560px]:px-[18px]"
      aria-labelledby="sv-glance-title"
    >
      <h2 id="sv-glance-title" className="m-0 text-[15px] font-normal">
        At a glance
      </h2>
      <p className="m-0 mt-1 text-[11px] text-black/55">
        Tap a service to see what&apos;s included before you book.
      </p>
      <ul className="m-0 mt-3.5 p-0 list-none">
        {services.map((s) => (
          <li key={s.id} className="border-t border-tf-line first:border-t-0">
            <a
              href={`#${s.id}`}
              className="grid grid-cols-[1fr_auto_auto] max-[560px]:grid-cols-[1fr_auto] items-center gap-3.5 py-4 no-underline text-inherit transition-transform duration-250 ease-tf hover:translate-x-[3px] group"
            >
              <span>
                <b className="block font-normal text-sm">{s.name}</b>
                <small className="block mt-[3px] text-[10px] text-black/55">
                  See what&apos;s included &amp; how it works
                </small>
              </span>
              <span className="text-right font-serif text-sm text-tf-teal whitespace-nowrap">
                {s.hours} hr
                {s.price > 0 && (
                  <small className="block text-[11px] text-black/55">{peso(s.price)}</small>
                )}
              </span>
              <span className="grid place-items-center w-6 h-6 rounded-full bg-[#c9e0d5] text-tf-ink transition-[background,color] duration-250 group-hover:bg-tf-teal group-hover:text-white max-[560px]:hidden">
                <Arrow />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function Service({ s, index }) {
  const reversed = index % 2 === 1; // illustration left, text right
  const down = downpaymentOf(s);

  return (
    <Reveal className="relative">
      {/* thin fading divider between services */}
      {index > 0 && (
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#9fcfc2] to-transparent" />
      )}

      <section
        className="relative grid grid-cols-2 max-[900px]:grid-cols-1 gap-[clamp(28px,5vw,80px)] items-center py-[clamp(44px,6vw,80px)]"
        id={s.id}
        aria-labelledby={`${s.id}-title`}
      >
        <Vine side={reversed ? "right" : "left"} />

        {/* Text */}
        <div className={reversed ? "min-[901px]:order-2 min-[901px]:pl-[clamp(0px,3vw,48px)]" : ""}>
          <div className="flex items-center gap-3.5">
            <span
              className="shrink-0 grid content-center justify-items-center w-[52px] h-[52px] rounded-full border-[3px] border-[#10a28c] bg-white font-serif leading-none"
              aria-hidden="true"
            >
              <b className="text-[17px] font-normal">{s.hours}</b>
              <i className="text-[9px] not-italic mt-0.5">hr</i>
            </span>
            <p className="m-0 grid gap-[3px] font-serif">
              <span className="text-[11px] tracking-[0.08em] text-[#10a28c]">{s.label}</span>
              {s.meta && <small className="text-[11px] text-[#777]">{s.meta}</small>}
            </p>
          </div>

          <h2
            id={`${s.id}-title`}
            className="m-0 mt-5 mb-3 font-serif font-bold text-[#2c4a4f] text-[clamp(26px,3.2vw,36px)] leading-[1.15] max-w-[16ch]"
          >
            {s.title}
          </h2>

          <p className="m-0 font-serif text-[clamp(15px,1.6vw,17px)] leading-[1.6] text-[#777] max-w-[46ch]">
            {s.text}
          </p>

          {s.goodFor.length > 0 && (
            <>
              <h3 className="m-0 mt-6 mb-2.5 font-serif font-normal text-[11px] tracking-[0.14em] uppercase text-[#777]">
                Good for
              </h3>
              <ul className="flex flex-wrap gap-2 m-0 p-0 list-none">
                {s.goodFor.map((t) => (
                  <li
                    key={t}
                    className="font-serif text-[11px] text-[#2c4a4f]/80 bg-[#a9cbbd] py-1 px-3.5 rounded-full"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </>
          )}

          {s.steps.length > 0 && (
            <>
              <h3 className="m-0 mt-6 mb-3 font-serif font-normal text-[11px] tracking-[0.14em] uppercase text-[#777]">
                What happens
              </h3>
              <ol className="m-0 p-0 list-none grid gap-3.5 max-w-[44ch]">
                {s.steps.map((t) => (
                  <li
                    key={t}
                    className="relative pl-[20px] font-serif text-[14px] leading-normal text-[#777]"
                  >
                    <LeafBullet />
                    {t}
                  </li>
                ))}
              </ol>
            </>
          )}

          {s.assessment_types && s.assessment_types.length > 0 && (
            <div className="mt-6">
              <h3 className="m-0 mb-3 font-serif font-normal text-[11px] tracking-[0.14em] uppercase text-[#777]">
                Available assessment types
              </h3>
              <div className="grid gap-2.5 max-w-[48ch]">
                {s.assessment_types.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white/70 px-4 py-3"
                  >
                    <div>
                      <b className="font-serif text-[14px] font-bold text-[#2c4a4f]">{t.name}</b>
                      {t.description && (
                        <p className="m-0 mt-0.5 font-serif text-[12px] text-[#777] leading-relaxed">
                          {t.description}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      {t.price > 0 && (
                        <span className="block font-serif text-[14px] font-bold text-[#10a28c]">
                          {peso(t.price)}
                        </span>
                      )}
                      {t.downpayment_amount > 0 && (
                        <span className="block font-serif text-[11px] text-[#777]">
                          {peso(t.downpayment_amount)} downpayment
                        </span>
                      )}
                      <span className="block text-[11px] text-[#888]">
                        {t.duration_minutes >= 60 ? `${Math.round((t.duration_minutes / 60) * 10) / 10} hr` : `${t.duration_minutes} min`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Price comes from Admin > Payment methods */}
          {s.price > 0 && (
            <p className="m-0 mt-7 font-serif text-[#2c4a4f]">
              <span className="text-[24px] font-bold">{peso(s.price)}</span>{" "}
              <span className="text-[13px] text-[#777]">
                per session
                {down > 0 && ` · ${peso(down)} downpayment to hold your slot`}
              </span>
            </p>
          )}

          <div className={`flex items-center flex-wrap gap-[22px] ${s.price > 0 ? "mt-4" : "mt-7"}`}>
            <Link
              to={BOOK_TO}
              className={`${btnSolid} no-underline max-[560px]:flex-1 max-[560px]:min-w-[140px]`}
            >
              Book now
            </Link>
            <Link
              to="/#contact"
              className="font-serif text-[14px] text-tf-ink border-b border-transparent no-underline transition-[border-color,color] duration-250 hover:border-current"
            >
              Ask a question
            </Link>
          </div>
        </div>

        {/* Illustration */}
        <div className={reversed ? "min-[901px]:order-1" : ""}>
          <Blob Art={s.Art} imageUrl={s.imageUrl} name={s.name} />
        </div>
      </section>
    </Reveal>
  );
}

/* ---------- Page ---------- */
export default function Services() {
  const [services, setServices] = useState(null); // null = loading

  useEffect(() => {
    let off = false;
    apiFetch("/services")
      .then((d) => {
        if (off) return;
        const list = (d.services || []).filter((s) => s.enabled !== false).map(normalize);
        setServices(list);
      })
      .catch(() => {
        // API unreachable: show the built-in copy (no prices) rather than a blank page
        if (!off) setServices(DEFAULTS.map(normalize));
      });
    return () => {
      off = true;
    };
  }, []);

  // After the content loads, jump to the section if the URL has a #hash (e.g. /services#aba)
  useEffect(() => {
    if (services && window.location.hash) {
      document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
    }
  }, [services]);

  return (
    <div className="font-sans text-black bg-tf-bg overflow-x-hidden antialiased">
      <Navbar />
      <main>
        <header className="relative isolate overflow-hidden py-[clamp(48px,7vw,96px)]">
          <Photo
            src="/img/tree.png"
            className="absolute -right-[4%] -bottom-[6%] w-[min(46vw,560px)] opacity-[0.22] -z-10 pointer-events-none max-[900px]:w-[90vw] max-[900px]:-right-[20%] max-[900px]:opacity-[0.14]"
          />
          <div
            className={`${container} grid grid-cols-[minmax(0,1fr)_minmax(0,470px)] max-[900px]:grid-cols-1 gap-[clamp(32px,6vw,96px)] items-center`}
          >
            <div>
              <p className="m-0 text-[13px] font-bold tracking-[0.1em] text-tf-teal">OUR SERVICES</p>
              <h1 className="m-0 mt-2.5 mb-[18px] font-semibold text-[clamp(30px,4.2vw,40px)] leading-[1.15] max-w-[14ch] max-[900px]:max-w-none">
                Care that fits <em className="not-italic text-tf-teal">what you need.</em>
              </h1>
              <p className="m-0 text-base leading-relaxed text-black/70 max-w-[440px]">
                Clear ways we can support you. Every session is private, paced by you, and led by a qualified specialist.
              </p>
              {services && services.length > 0 && (
                <a
                  href={`#${services[0].id}`}
                  className="inline-flex items-center gap-3 mt-7 text-xs text-black/70 no-underline group"
                >
                  <span className="grid place-items-center w-[30px] h-[30px] rounded-full border border-black/25 transition-[background,border-color] duration-250 group-hover:bg-white group-hover:border-tf-teal">
                    <Arrow dir="down" />
                  </span>
                  Scroll to explore each service
                </a>
              )}
            </div>
            {services && services.length > 0 && <Glance services={services} />}
          </div>
        </header>

        <div className={`${container} pb-[clamp(40px,6vw,80px)]`}>
          {services === null && (
            <div className="py-[clamp(44px,6vw,80px)]" role="status" aria-label="Loading services">
              <span className="sr-only">Loading services…</span>
              {[0, 1].map((item) => (
                <section
                  key={item}
                  className="grid grid-cols-2 items-center gap-[clamp(28px,5vw,80px)] py-[clamp(32px,5vw,64px)] max-[900px]:grid-cols-1"
                >
                  <div className="space-y-5">
                    <div className="flex items-center gap-3.5">
                      <SkeletonBlock className="size-[52px] shrink-0 rounded-full" />
                      <div className="grid flex-1 gap-2">
                        <SkeletonBlock className="h-3 w-28 rounded" />
                        <SkeletonBlock className="h-3 w-36 rounded" />
                      </div>
                    </div>
                    <SkeletonBlock className="h-9 w-3/4 rounded-lg" />
                    <div className="grid gap-2">
                      <SkeletonBlock className="h-4 w-full rounded" />
                      <SkeletonBlock className="h-4 w-11/12 rounded" />
                      <SkeletonBlock className="h-4 w-2/3 rounded" />
                    </div>
                    <div className="flex gap-2">
                      <SkeletonBlock className="h-7 w-24 rounded-full" />
                      <SkeletonBlock className="h-7 w-28 rounded-full" />
                      <SkeletonBlock className="h-7 w-20 rounded-full" />
                    </div>
                  </div>
                  <SkeletonBlock className="mx-auto aspect-[500/440] w-full max-w-[520px] rounded-[140px_28px_140px_28px]" />
                </section>
              ))}
            </div>
          )}
          {services && services.length === 0 && (
            <p className="py-16 text-center font-serif text-[15px] text-[#777]">
              No services are available right now. Please check back soon.
            </p>
          )}
          {services &&
            services.map((s, i) => <Service key={s.id} s={s} index={i} />)}
        </div>
      </main>
      <Footer />
    </div>
  );
}