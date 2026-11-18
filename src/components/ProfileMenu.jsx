import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch, getFullName, getToken, logout } from "../auth";

const ROLE_LABEL = { CLIENT: "Client", AFFILIATE: "Affiliate", ADMIN: "Admin" };
const ROLE_HOME = {
  ADMIN: ["/admin", "Go to dashboard"],
  AFFILIATE: ["/affiliate", "Go to dashboard"],
  CLIENT: ["/appointments", "My appointments"],
};

// --- Named Export: displayEmail ---
export const displayEmail = (u) =>
  !u?.email
    ? ""
    : u.email.endsWith("@facebook.local")
      ? "Facebook account (no email)"
      : u.email;

// --- Named Export: Avatar ---
export function Avatar({ user, size = 40, className = "" }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [user?.avatar_url]);

  const initials =
    ((user?.first_name?.[0] || "") + (user?.last_name?.[0] || "")).toUpperCase() || "?";
  const style = { width: size, height: size, fontSize: size * 0.38 };

  if (user?.avatar_url && !broken) {
    return (
      <img
        src={user.avatar_url}
        alt=""
        style={style}
        className={`shrink-0 rounded-full object-cover ${className}`}
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span
      style={style}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full bg-tf-teal font-serif font-bold text-white ${className}`}
    >
      {initials}
    </span>
  );
}

// --- Default Export: ProfileMenu ---
export default function ProfileMenu({ size = 40 }) {
  const [user, setUser] = useState(null);
  const [loaded, setLoaded] = useState(() => !getToken());
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    const loadProfile = (authChanged = false) => {
      if (!getToken()) {
        if (authChanged) {
          setUser(null);
          setLoaded(true);
        }
        return;
      }

      apiFetch("/profile")
        .then((d) => alive && setUser(d.user))
        .catch(() => alive && setUser(null))
        .finally(() => alive && setLoaded(true));
    };

    loadProfile();

    const onUpdate = (e) => setUser(e.detail);
    const onAuthChange = () => loadProfile(true);
    window.addEventListener("tf-auth-change", onAuthChange);
    window.addEventListener("tf-profile-updated", onUpdate);
    return () => {
      alive = false;
      window.removeEventListener("tf-auth-change", onAuthChange);
      window.removeEventListener("tf-profile-updated", onUpdate);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) =>
      boxRef.current && !boxRef.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Function para sa logout
  const handleLogout = async () => {
    await logout();
    window.dispatchEvent(new Event("tf-auth-change")); // I-update ang Navbar (kung naka-login/out)
    navigate("/signin", { replace: true });
  };

  if (!loaded) return null;

  // Kapag hindi naka-login, "Sign In" button lang ang ipapakita
  if (!user) {
    return (
      <Link
        to="/signin"
        className="inline-flex h-10 items-center rounded-lg border border-black/20 bg-white px-5 text-sm text-black no-underline hover:bg-black/5"
      >
        Sign In
      </Link>
    );
  }

  const [homePath, homeLabel] = ROLE_HOME[user.role] || ROLE_HOME.CLIENT;

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open profile menu"
        aria-expanded={open}
        className="cursor-pointer rounded-full border-2 border-transparent bg-transparent p-0 transition hover:border-tf-teal"
      >
        <Avatar user={user} size={size} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[280px] rounded-xl border border-black/10 bg-white p-4 text-left shadow-[0_16px_40px_-18px_rgba(0,0,0,0.4)]">
          {/* Profile Header */}
          <div className="flex items-center gap-3">
            <Avatar user={user} size={52} />
            <div className="min-w-0">
              <div className="truncate font-serif text-base font-bold text-[#202020]">
                {getFullName(user)}
              </div>
              <div className="truncate text-xs text-[#666]">{displayEmail(user)}</div>
              <span className="mt-1 inline-block rounded-full bg-tf-soft px-2.5 py-0.5 text-[11px] font-bold text-tf-teal">
                {ROLE_LABEL[user.role] || user.role}
              </span>
            </div>
          </div>

          <div className="my-3 h-px bg-black/10" />

          {/* Profile Links */}
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm text-[#202020] no-underline hover:bg-tf-soft"
          >
            View &amp; edit profile
          </Link>
          <Link
            to={homePath}
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm text-[#202020] no-underline hover:bg-tf-soft"
          >
            {homeLabel}
          </Link>
          {user.role === "CLIENT" && (
            <Link
              to="/appointments/balance"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-[#202020] no-underline hover:bg-tf-soft"
            >
              Balance
            </Link>
          )}

          {/* Logout Section */}
          <div className="my-2 h-px bg-black/10" />
          <button
            onClick={handleLogout}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 no-underline hover:bg-red-50"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}