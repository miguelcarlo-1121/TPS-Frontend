import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Navbar, Footer, Logo, Photo, btnSolid, btnGhost } from "../components/Layout";
import { apiFetch, saveAuth } from "../auth"; // <- ayusin ang path kung iba ang lokasyon ng auth.js

// Where the user goes after login, depending on role.
const ROLE_HOME = {
  ADMIN: "/admin",
  AFFILIATE: "/affiliate",
  CLIENT: "/appointments",
};

// Vite env vars. (If you use Create React App, use process.env.REACT_APP_... instead.)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID;

// Loads an external script once and resolves when ready.
function loadScript(src, id) {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id);
    if (existing) {
      if (existing.dataset.loaded === "true") return resolve();
      existing.addEventListener("load", resolve);
      existing.addEventListener("error", reject);
      return;
    }
    const s = document.createElement("script");
    s.id = id;
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = () => {
      s.dataset.loaded = "true";
      resolve();
    };
    s.onerror = reject;
    document.body.appendChild(s);
  });
}

function EyeIcon({ off }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M3 3l18 18" />}
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  );
}

const inputClass =
  "mt-1.5 w-full rounded-lg border border-black/14 bg-white px-3.5 py-3 font-serif text-sm outline-none focus:border-tf-teal focus:shadow-[0_0_0_3px_rgba(74,155,142,0.15)]";

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/appointments";

  const [mode, setMode] = useState("signin"); // signin | signup | forgot | verify
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(() => localStorage.getItem("tf_user") || "");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [remember, setRemember] = useState(() => !!localStorage.getItem("tf_user"));
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(""); // "" | "google" | "facebook"

  // Email verification state
  const [verifyEmail, setVerifyEmail] = useState("");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [verifyRemember, setVerifyRemember] = useState(true);
  const [facebookAccessToken, setFacebookAccessToken] = useState("");

  const googleBtnRef = useRef(null);
  const googleHandlerRef = useRef(null);
  const fbReadyRef = useRef(false);

  const fail = (msg) => {
    setError(msg);
    setInfo("");
    setShaking(true);
    setTimeout(() => setShaking(false), 450);
  };

  // After a successful login/register/verification
  const finish = (data, rememberMe) => {
    saveAuth(data.token, data.user, rememberMe);
    rememberMe
      ? localStorage.setItem("tf_user", data.user.email)
      : localStorage.removeItem("tf_user");

    // Client -> back to where they came from (default /appointments). Admin/Affiliate -> their dashboard.
    const target = data.user.role === "CLIENT" ? from : ROLE_HOME[data.user.role] || from;
    navigate(target, { replace: true });
    window.dispatchEvent(new Event("tf-auth-change"));
  };

  // Common handler for any auth response. If the backend says the email
  // is not verified yet, switch to the code-entry screen instead of logging in.
  const handleAuthResponse = (data, rememberMe) => {
    if (data?.needs_verification) {
      setVerifyRemember(rememberMe);
      setVerifyEmail(data.email || email);
      setCode("");
      setCooldown(30);
      setMode("verify");
      setError("");
      setInfo(`We sent a 6-digit code to ${data.email || email}. Enter it below to continue.`);
      return;
    }
    finish(data, rememberMe);
  };

  const handleAuthError = (err, rememberMe) => {
    if (err?.data?.needs_verification) {
      handleAuthResponse(err.data, rememberMe);
      return;
    }
    fail(err.message);
  };

  // ---------- Google ----------
  // Always points to the latest handler so the Google callback never goes stale.
  googleHandlerRef.current = async (credential) => {
    if (!credential) return fail("Google sign-in was cancelled.");
    setSocialLoading("google");
    setError("");
    try {
      // The backend must verify the ID token AND check that email_verified === true.
      const data = await apiFetch("/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential }),
      });
      handleAuthResponse(data, true);
    } catch (err) {
      handleAuthError(err, true);
    } finally {
      setSocialLoading("");
    }
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || (mode !== "signin" && mode !== "signup")) return;
    let cancelled = false;

    loadScript("https://accounts.google.com/gsi/client", "google-gsi")
      .then(() => {
        if (cancelled || !googleBtnRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (res) => googleHandlerRef.current(res.credential),
        });
        const w = Math.min(400, Math.max(200, googleBtnRef.current.offsetWidth || 320));
        googleBtnRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "center",
          width: w,
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [mode]);

  // ---------- Facebook ----------
  // Preload the SDK on mount so FB.login can run directly inside the click
  // (otherwise the browser may block the popup).
  useEffect(() => {
    if (!FACEBOOK_APP_ID) return;
    loadScript("https://connect.facebook.net/en_US/sdk.js", "facebook-sdk")
      .then(() => {
        if (!window.FB) return;
        window.FB.init({
          appId: FACEBOOK_APP_ID,
          cookie: true,
          xfbml: false,
          version: "v19.0",
        });
        fbReadyRef.current = true;
      })
      .catch(() => {});
  }, []);

  const onFacebook = () => {
    if (!FACEBOOK_APP_ID) return fail("Facebook login is not configured yet.");
    if (!fbReadyRef.current || !window.FB) {
      return fail("Facebook is still loading. Please try again in a moment.");
    }
    setError("");
    window.FB.login(
      (response) => {
        const accessToken = response?.authResponse?.accessToken;
        if (!accessToken) {
          fail("Facebook sign-in was cancelled.");
          return;
        }
        setSocialLoading("facebook");
        apiFetch("/auth/facebook", {
          method: "POST",
          body: JSON.stringify({ access_token: accessToken }),
        })
          .then((data) => {
            if (data.needs_email) {
              setFacebookAccessToken(accessToken);
              setEmail(data.email || "");
              setMode("facebook-email");
              setInfo(data.message || "Confirm an email address for appointment reminders.");
              return;
            }
            handleAuthResponse(data, true);
          })
          .catch((err) => handleAuthError(err, true))
          .finally(() => setSocialLoading(""));
      },
      { scope: "public_profile,email" }
    );
  };

  // ---------- Resend countdown ----------
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const resendCode = async () => {
    if (cooldown > 0 || loading) return;
    setError("");
    setLoading(true);
    try {
      await apiFetch("/email/resend", {
        method: "POST",
        body: JSON.stringify({ email: verifyEmail }),
      });
      setCooldown(30);
      setInfo(`A new code was sent to ${verifyEmail}.`);
    } catch (err) {
      fail(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setInfo("");

    if (mode === "facebook-email") {
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return fail("Enter a valid email address for appointment reminders.");
      }
      if (!facebookAccessToken) {
        setMode("signin");
        return fail("Facebook sign-in expired. Please try again.");
      }

      setLoading(true);
      try {
        const data = await apiFetch("/auth/facebook/email", {
          method: "POST",
          body: JSON.stringify({
            access_token: facebookAccessToken,
            email: email.trim(),
          }),
        });
        setFacebookAccessToken("");
        handleAuthResponse(data, true);
      } catch (err) {
        handleAuthError(err, true);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === "verify") {
      if (!/^\d{6}$/.test(code.trim())) return fail("Enter the 6-digit code from your email.");
      setLoading(true);
      try {
        const data = await apiFetch("/email/verify", {
          method: "POST",
          body: JSON.stringify({ email: verifyEmail, code: code.trim() }),
        });
        finish(data, verifyRemember);
      } catch (err) {
        fail(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === "forgot") {
      if (!email.includes("@")) return fail("Enter a valid email address.");
      // TODO: no backend for this yet
      setInfo("If an account exists for that email, a reset link would be sent (demo only).");
      return;
    }

    if (mode === "signup") {
      if (!firstName.trim() || !lastName.trim()) return fail("Please enter your first and last name.");
      if (!email.includes("@")) return fail("Enter a valid email address.");
      if (phone.trim() && !/^09\d{9}$/.test(phone.trim())) {
        return fail("Phone number must be 11 digits starting with 09 (e.g. 09123456789).");
      }
      if (password.length < 8) return fail("Password must be at least 8 characters.");
      if (password !== confirm) return fail("Passwords do not match.");

      setLoading(true);
      try {
        const data = await apiFetch("/register", {
          method: "POST",
          body: JSON.stringify({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: email.trim(),
            phone: phone.trim() || null,
            password,
            password_confirmation: confirm,
          }),
        });
        handleAuthResponse(data, true);
      } catch (err) {
        handleAuthError(err, true);
      } finally {
        setLoading(false);
      }
      return;
    }

    // signin
    if (!email.trim() || !password) return fail("Please enter your email and password.");
    setLoading(true);
    try {
      const data = await apiFetch("/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      handleAuthResponse(data, remember);
    } catch (err) {
      handleAuthError(err, remember);
    } finally {
      setLoading(false);
    }
  };

  const showSocial = mode === "signin" || mode === "signup";
  const busy = loading || !!socialLoading;

  return (
    <div className="font-sans text-black bg-tf-bg min-h-screen overflow-x-hidden antialiased">
      <Navbar />
      <main className="relative py-14 pb-24">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <span className="absolute -left-20 top-10 size-64 rounded-full bg-tf-soft opacity-70" />
          <span className="absolute -right-16 bottom-20 size-72 rounded-full bg-[#d7eee8] opacity-60" />
        </div>

        <div className="relative z-10 mx-auto grid w-[min(1040px,calc(100%-40px))] grid-cols-2 gap-10 max-[900px]:grid-cols-1">
          <section className="flex flex-col justify-center max-[900px]:text-center">
            <div className="mb-6 flex items-center gap-3 max-[900px]:justify-center">
              <Photo
                src="/img/Threefold%20logo.png"
                alt="Threefold logo"
                className="h-[42px] w-[42px] shrink-0 object-contain"
                fallback={<Logo size={42} />}
              />
              <span>
                <strong className="block font-serif text-sm tracking-[0.04em] text-tf-forest">
                  THREEFOLD
                </strong>
                <small className="text-[10px] text-[#666]">
                  Behavioral Interventions And Psychological Services
                </small>
              </span>
            </div>
            <h1 className="m-0 font-serif text-[clamp(2rem,4vw,2.8rem)] font-normal leading-tight text-[#111]">
              Welcome back to <em className="italic text-tf-teal">Threefold</em>
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-[#555] max-[900px]:mx-auto">
              Sign in to manage appointments, message your care team, and continue your wellness
              journey.
            </p>
            <ul className="mt-6 list-none space-y-2 p-0 text-sm text-tf-body max-[900px]:mx-auto max-[900px]:text-left">
              {[
                "View and manage your appointments",
                "Secure messaging with the clinic",
                "Track payment and consent status",
              ].map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-tf-teal" />
                  {p}
                </li>
              ))}
            </ul>
          </section>

          <section
            className={[
              "rounded-2xl border border-black/10 bg-white p-8 shadow-[0_16px_40px_-24px_rgba(0,0,0,0.35)] max-[560px]:p-5",
              shaking ? "animate-[tf-shake_0.45s_ease]" : "",
            ].join(" ")}
          >
            <div className="mb-6 flex gap-2 rounded-[11px] bg-tf-teal/15 p-1">
              {[
                ["signin", "Sign In"],
                ["signup", "Register"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`flex-1 rounded-lg border-0 py-2 font-serif text-sm cursor-pointer ${mode === id || (mode !== "signup" && id === "signin" && (mode === "forgot" || mode === "verify"))
                      ? "bg-white font-bold shadow-sm"
                      : "bg-transparent"
                    }`}
                  onClick={() => {
                    setMode(id);
                    setError("");
                    setInfo("");
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <h2 className="m-0 font-serif text-2xl text-[#202020]">
              {mode === "signup"
                ? "Create account"
                : mode === "forgot"
                  ? "Reset password"
                  : mode === "verify"
                    ? "Verify your email"
                        : mode === "facebook-email"
                          ? "Confirm your reminder email"
                        : "Sign In"}
            </h2>
            <p className="mt-1 text-sm text-[#666]">
              {mode === "signup"
                ? "Create a client account to book and manage your sessions."
                : mode === "forgot"
                  ? "Enter your email to receive reset instructions."
                  : mode === "verify"
                    ? "For your security, confirm your email address to finish signing in."
                    : mode === "facebook-email"
                      ? "Confirm or enter the email address where we can send appointment reminders. We’ll send a code to verify you can receive messages there."
                    : "Use the email and password you registered with."}
            </p>

            {/* Social login */}
            {showSocial && (
              <div className="mt-6">
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={onFacebook}
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-3 rounded-lg border-0 bg-[#1877F2] px-4 py-3 font-sans text-sm font-medium text-white cursor-pointer transition hover:bg-[#166fe0] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FacebookIcon />
                    {socialLoading === "facebook" ? "Connecting…" : "Continue with Facebook"}
                  </button>

                  {/* Official Google button renders inside this div */}
                  {GOOGLE_CLIENT_ID ? (
                    <div
                      className={`flex w-full justify-center ${busy ? "pointer-events-none opacity-60" : ""}`}
                    >
                      <div ref={googleBtnRef} className="w-full min-h-[44px] flex justify-center" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fail("Google login is not configured yet.")}
                      className="w-full rounded-lg border border-black/14 bg-white px-4 py-3 text-sm cursor-pointer"
                    >
                      Continue with Google
                    </button>
                  )}
                </div>

                <div className="my-5 flex items-center gap-3 text-xs text-[#888]">
                  <span className="h-px flex-1 bg-black/10" />
                  or use your email
                  <span className="h-px flex-1 bg-black/10" />
                </div>
              </div>
            )}

            <form
              className={`${showSocial ? "" : "mt-6"} flex flex-col gap-4`}
              onSubmit={submit}
              noValidate
            >
              {mode === "verify" ? (
                <label className="text-xs font-bold tracking-[0.08em] text-[#666]">
                  VERIFICATION CODE
                  <input
                    className={`${inputClass} text-center text-xl tracking-[0.5em]`}
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                      setError("");
                    }}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="••••••"
                    maxLength={6}
                    autoFocus
                  />
                </label>
              ) : mode === "facebook-email" ? (
                <label className="text-xs font-bold tracking-[0.08em] text-[#666]">
                  EMAIL FOR APPOINTMENT REMINDERS
                  <input
                    type="email"
                    className={inputClass}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    autoComplete="email"
                    placeholder="you@email.com"
                    required
                    autoFocus
                  />
                </label>
              ) : (
                <>
                  {mode === "signup" && (
                    <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
                      <label className="text-xs font-bold tracking-[0.08em] text-[#666]">
                        FIRST NAME
                        <input
                          className={inputClass}
                          value={firstName}
                          onChange={(e) => {
                            setFirstName(e.target.value);
                            setError("");
                          }}
                          autoComplete="given-name"
                        />
                      </label>
                      <label className="text-xs font-bold tracking-[0.08em] text-[#666]">
                        LAST NAME
                        <input
                          className={inputClass}
                          value={lastName}
                          onChange={(e) => {
                            setLastName(e.target.value);
                            setError("");
                          }}
                          autoComplete="family-name"
                        />
                      </label>
                    </div>
                  )}

                  <label className="text-xs font-bold tracking-[0.08em] text-[#666]">
                    EMAIL
                    <input
                      type="email"
                      className={inputClass}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError("");
                      }}
                      autoComplete="email"
                      placeholder="you@email.com"
                    />
                  </label>

                  {mode === "signup" && (
                    <label className="text-xs font-bold tracking-[0.08em] text-[#666]">
                      PHONE (OPTIONAL)
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={11}
                        className={inputClass}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                        autoComplete="tel"
                        placeholder="09123456789"
                      />
                    </label>
                  )}

                  {mode !== "forgot" && (
                    <label className="text-xs font-bold tracking-[0.08em] text-[#666]">
                      PASSWORD
                      <div className="relative mt-1.5">
                        <input
                          type={show ? "text" : "password"}
                          className={`${inputClass} !mt-0 pr-12`}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setError("");
                          }}
                          autoComplete={mode === "signup" ? "new-password" : "current-password"}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 border-0 bg-transparent text-[#666] cursor-pointer"
                          onClick={() => setShow((s) => !s)}
                          aria-label={show ? "Hide password" : "Show password"}
                        >
                          <EyeIcon off={show} />
                        </button>
                      </div>
                    </label>
                  )}

                  {mode === "signup" && (
                    <label className="text-xs font-bold tracking-[0.08em] text-[#666]">
                      CONFIRM PASSWORD
                      <input
                        type={show ? "text" : "password"}
                        className={inputClass}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        autoComplete="new-password"
                      />
                    </label>
                  )}

                  {mode === "signin" && (
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          className="size-4 accent-tf-teal"
                          checked={remember}
                          onChange={(e) => setRemember(e.target.checked)}
                        />
                        Remember me
                      </label>
                      <button
                        type="button"
                        className="border-0 bg-transparent p-0 text-tf-teal underline cursor-pointer"
                        onClick={() => {
                          setMode("forgot");
                          setError("");
                          setInfo("");
                        }}
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}
                </>
              )}

              {(error || info) && (
                <p
                  role="alert"
                  className={`m-0 rounded-lg px-4 py-3 text-sm ${error
                      ? "border border-red-200 bg-red-50 text-red-800"
                      : "border border-tf-teal/30 bg-tf-soft text-tf-ink"
                    }`}
                >
                  {error || info}
                </p>
              )}

              <button type="submit" className={`${btnSolid} w-full`} disabled={busy}>
                {loading
                  ? "Please wait…"
                  : mode === "signup"
                    ? "Create account"
                    : mode === "forgot"
                      ? "Send reset link"
                      : mode === "verify"
                        ? "Verify & continue"
                        : mode === "facebook-email"
                          ? "Send verification code"
                        : "Sign in"}
              </button>
            </form>

            {mode === "facebook-email" && (
              <button
                type="button"
                className="mt-4 w-full border-0 bg-transparent p-0 text-sm text-tf-teal underline cursor-pointer"
                onClick={() => {
                  setFacebookAccessToken("");
                  setMode("signin");
                  setError("");
                  setInfo("");
                }}
              >
                Cancel Facebook sign-in
              </button>
            )}

            {mode === "verify" && (
              <div className="mt-4 flex flex-col gap-3">
                <button
                  type="button"
                  className={`${btnGhost} w-full`}
                  onClick={resendCode}
                  disabled={cooldown > 0 || loading}
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                </button>
                <button
                  type="button"
                  className="border-0 bg-transparent p-0 text-sm text-tf-teal underline cursor-pointer"
                  onClick={() => {
                    setMode("signin");
                    setError("");
                    setInfo("");
                  }}
                >
                  Back to Sign In
                </button>
              </div>
            )}

            {mode === "forgot" && (
              <button
                type="button"
                className={`${btnGhost} mt-4 w-full`}
                onClick={() => setMode("signin")}
              >
                Back to Sign In
              </button>
            )}

            {mode !== "verify" && (
              <p className="mt-6 text-center text-sm text-[#666]">
                New here? Choose <b>Register</b> above to create an account, then you can book a session.
              </p>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}