import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Logo, Photo } from "../components/Layout";
import { logout } from "../auth";

const inter = "font-['Inter',Helvetica,sans-serif]";
const serif = "font-['Inria_Serif',Georgia,serif]";

/* ---------- Menu, grouped under labels ----------
   exact: true  -> active only on that exact path
   otherwise    -> active on that path and any sub-page (e.g. /admin/payment-methods) */
const NAV_GROUPS = [
    {
        label: "Overview",
        items: [{ label: "Dashboard", to: "/admin", icon: "dashboard", exact: true }],
    },
    {
        label: "Clinic",
        items: [
            { label: "Appointment", to: "/admin/appointment", icon: "appointment" },
            { label: "Messages", to: "/admin/messages", icon: "messages" },
            { label: "Schedules", to: "/admin/schedule", icon: "schedules" },
        ],
    },
    {
        label: "Business",
        items: [
            { label: "Services", to: "/admin/services", icon: "services" },
            { label: "Payment", to: "/admin/payment", icon: "payment" },
        ],
    },
    {
        label: "People",
        items: [
            { label: "Client", to: "/admin/client", icon: "client" },
            { label: "Accounts", to: "/admin/accounts", icon: "accounts" },
        ],
    },
    {
        label: "Website & System",
        items: [
            { label: "Home", to: "/admin/home", icon: "home" },
            { label: "Activity Logs", to: "/admin/activity-logs", icon: "activitylogs" },
            { label: "Backup and Restore", to: "/admin/backup", icon: "backup" },
        ],
    },
];

// Para ma-preview ng admin ang ibang site nang hindi nagla-logout
const PREVIEW_ITEMS = [
    { label: "Client site", to: "/appointments", icon: "client" },
    { label: "Affiliate site", to: "/affiliate", icon: "accounts" },
];

/* ---------- Icons (24x24 stroke set) ---------- */
const ICONS = {
    dashboard: (
        <>
            <rect x="3" y="3" width="7" height="9" rx="1.5" />
            <rect x="14" y="3" width="7" height="5" rx="1.5" />
            <rect x="14" y="12" width="7" height="9" rx="1.5" />
            <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </>
    ),
    appointment: (
        <>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4" />
        </>
    ),
    messages: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />,
    schedules: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
        </>
    ),
    services: (
        <>
            <rect x="3" y="7" width="18" height="13" rx="2" />
            <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" />
        </>
    ),
    payment: (
        <>
            <path d="M3 7a2 2 0 0 1 2-2h13v4" />
            <path d="M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z" />
            <circle cx="16.5" cy="14.5" r="1" fill="currentColor" />
        </>
    ),
    client: (
        <>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
        </>
    ),
    accounts: (
        <>
            <circle cx="9" cy="8" r="3.5" />
            <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
            <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2A6.5 6.5 0 0 1 21.5 20" />
        </>
    ),
    home: (
        <>
            <path d="M3 11l9-8 9 8" />
            <path d="M5 10v10h14V10" />
            <path d="M10 20v-6h4v6" />
        </>
    ),
    backup: (
        <>
            <ellipse cx="12" cy="5" rx="8" ry="3" />
            <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
        </>
    ),
    activitylogs: (
        <>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
        </>
    ),
    logout: (
        <>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5M21 12H9" />
        </>
    ),
    external: <path d="M7 17L17 7M9 7h8v8" />,
};

const Icon = ({ name, size = 19 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="shrink-0"
    >
        {ICONS[name]}
    </svg>
);

const isActiveRoute = (pathname, item) =>
    item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to);

const GroupLabel = ({ id, children }) => (
    <h2
        id={id}
        className={`${inter} m-0 px-[30px] pb-[6px] text-[11px] font-bold uppercase tracking-[0.14em] text-[#7fb09b]`}
    >
        {children}
    </h2>
);

export default function AdminNavigation() {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false); // para sa mobile drawer lang

    const close = () => setOpen(false);

    // Isara kapag nagpalit ng page
    useEffect(() => { setOpen(false); }, [pathname]);

    // Esc para isara, at i-lock ang scroll ng page habang bukas ang drawer
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
        window.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [open]);

    const handleLogout = async () => {
        await logout();
        navigate("/signin", { replace: true });
    };

    return (
        <>
            {/* Hamburger: mobile at tablet lang */}
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Open menu"
                aria-expanded={open}
                className="fixed left-4 top-3 z-40 grid h-[40px] w-[40px] place-items-center rounded-[8px] border border-[#c7b6b6] bg-white lg:hidden"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2a8570" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* Backdrop: mobile lang */}
            {open && (
                <button
                    type="button"
                    aria-label="Close menu"
                    onClick={close}
                    className="fixed inset-0 z-40 cursor-default bg-black/40 lg:hidden"
                />
            )}

            <aside
                className={`fixed left-0 top-0 z-50 flex h-[100dvh] w-[min(288px,85vw)] shrink-0 flex-col rounded-r-[32px] bg-[#1f4d3f] transition-[transform,visibility] duration-300 lg:w-[288px] lg:translate-x-0 ${open ? "translate-x-0" : "max-lg:invisible max-lg:-translate-x-full"
                    }`}
            >
                {/* Close button: mobile lang */}
                <button
                    type="button"
                    onClick={close}
                    aria-label="Close menu"
                    className="absolute right-[18px] top-[22px] grid h-[36px] w-[36px] place-items-center rounded-full text-[#a8c8b8] hover:bg-white/10 hover:text-white lg:hidden"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                </button>

                {/* Brand */}
                <div className="shrink-0 px-[26px] pb-[20px] pt-[30px]">
                    <Link to="/" onClick={close} className="group flex items-center gap-[12px] no-underline" aria-label="Threefold Home">
                        <Photo
                            src="/img/Threefold%20logo.png"
                            className="h-[42px] w-[42px] shrink-0 object-contain transition-transform group-hover:scale-105"
                            fallback={<Logo size={42} />}
                        />
                        <div className="flex flex-col">
                            <span className={`${serif} text-[15px] font-bold leading-[16px] tracking-[0.05em] text-[#f2f7f4] transition-colors group-hover:text-white`}>
                                THREEFOLD
                            </span>
                            <span className={`${serif} mt-[3px] max-w-[170px] text-[8px] leading-[11px] text-[#a8c8b8]`}>
                                Behavioral Interventions And Psychological Services
                            </span>
                        </div>
                    </Link>
                    <span className={`${inter} mt-[14px] inline-block rounded-full bg-white/10 px-[10px] py-[3px] text-[10px] font-bold uppercase tracking-[0.12em] text-[#cfe3d8]`}>
                        Admin panel
                    </span>
                </div>

                <div className="mx-[26px] h-px shrink-0 bg-white/10" />

                {/* Scrollable menu area */}
                <nav aria-label="Admin navigation" className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-[18px] pr-[6px] [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.22)_transparent] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 hover:[&::-webkit-scrollbar-thumb]:bg-white/35">
                    {NAV_GROUPS.map((group, gi) => {
                        const labelId = `admin-nav-${gi}`;
                        return (
                            <div key={group.label} role="group" aria-labelledby={labelId} className={gi > 0 ? "mt-[20px]" : ""}>
                                <GroupLabel id={labelId}>{group.label}</GroupLabel>
                                <ul className="m-0 flex list-none flex-col gap-[3px] p-0">
                                    {group.items.map((item) => {
                                        const active = isActiveRoute(pathname, item);
                                        return (
                                            <li key={item.label} className="px-[16px]">
                                                <Link
                                                    to={item.to}
                                                    onClick={close}
                                                    aria-current={active ? "page" : undefined}
                                                    className={`${inter} flex h-[42px] items-center gap-[12px] rounded-[10px] px-[14px] text-[14px] no-underline transition-colors ${active
                                                        ? "bg-white font-bold text-[#1f4d3f] shadow-sm"
                                                        : "font-medium text-[#cfe3d8] hover:bg-white/10 hover:text-white"
                                                        }`}
                                                >
                                                    <span className={active ? "text-[#10a28c]" : "text-[#7fb09b]"}>
                                                        <Icon name={item.icon} />
                                                    </span>
                                                    {item.label}
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        );
                    })}

                    {/* Preview ng ibang site (hindi kailangang mag-logout) */}
                    <div role="group" aria-labelledby="admin-nav-preview" className="mt-[20px]">
                        <GroupLabel id="admin-nav-preview">Preview site</GroupLabel>
                        <ul className="m-0 flex list-none flex-col gap-[3px] p-0">
                            {PREVIEW_ITEMS.map((item) => (
                                <li key={item.label} className="px-[16px]">
                                    <Link
                                        to={item.to}
                                        onClick={close}
                                        className={`${inter} flex h-[42px] items-center gap-[12px] rounded-[10px] px-[14px] text-[14px] font-medium text-[#cfe3d8] no-underline transition-colors hover:bg-white/10 hover:text-white`}
                                    >
                                        <span className="text-[#7fb09b]">
                                            <Icon name={item.icon} />
                                        </span>
                                        {item.label}
                                        <span className="ml-auto text-[#7fb09b]">
                                            <Icon name="external" size={14} />
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </nav>

                {/* Logout: laging nasa ilalim */}
                <div className="shrink-0 border-t border-white/10 px-[16px] py-[16px]">
                    <button
                        type="button"
                        onClick={handleLogout}
                        className={`${inter} flex h-[42px] w-full cursor-pointer items-center gap-[12px] rounded-[10px] border-0 bg-transparent px-[14px] text-left text-[14px] font-medium text-[#cfe3d8] transition-colors hover:bg-white/10 hover:text-white`}
                    >
                        <span className="text-[#7fb09b]">
                            <Icon name="logout" />
                        </span>
                        Logout
                    </button>
                </div>
            </aside>

            {/* Spacer: sa desktop lang, dahil fixed ang sidebar */}
            <div className="hidden w-[288px] shrink-0 lg:block" aria-hidden="true" />
        </>
    );
}