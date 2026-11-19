import React, { useCallback, useEffect, useState } from "react";
import AdminNavigation from "./adminnavigation";
import ProfileMenu from "../components/ProfileMenu";
import { API_URL, apiFetch, getToken } from "../auth";

const FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Inknut+Antiqua:wght@600&family=Inria+Serif:wght@400;700&family=Inter:wght@400;600;700&display=swap');`;

const inter = "font-['Inter',Helvetica,sans-serif]";
const serif = "font-['Inria_Serif',Georgia,serif]";
const cardShape =
  "border border-[#2020203d] bg-white rounded-tl-[18px] rounded-tr-[7px] rounded-br-[18px] rounded-bl-[7px]";
const EMPTY_SETTINGS = {
  enabled: false,
  frequency: "daily",
  time: "02:00",
  next_backup_at: null,
};

function Icon({ className = "", children }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const Calendar = (props) => (
  <Icon {...props}>
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
  </Icon>
);

const Bell = (props) => (
  <Icon {...props}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </Icon>
);

const Download = (props) => (
  <Icon {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7 10 5 5 5-5" />
    <path d="M12 15V3" />
  </Icon>
);

const RotateCcw = (props) => (
  <Icon {...props}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </Icon>
);

function formatDate(value, options = {}) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  });
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = bytes / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function typeLabel(type) {
  return ({ manual: "Manual", automatic: "Automatic", safety: "Safety copy" })[type] || type;
}

export default function BackupRestoreDashboard() {
  const [backups, setBackups] = useState([]);
  const [settings, setSettings] = useState(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [restoreCandidate, setRestoreCandidate] = useState(null);
  const [confirmation, setConfirmation] = useState("");

  const fetchData = useCallback(async () => {
    const [backupResponse, settingsResponse] = await Promise.all([
      apiFetch("/admin/backups"),
      apiFetch("/admin/backups/settings"),
    ]);
    return { backups: backupResponse.backups, settings: settingsResponse.settings };
  }, []);

  useEffect(() => {
    let active = true;
    fetchData()
      .then(({ backups: savedBackups, settings: savedSettings }) => {
        if (active) {
          setBackups(savedBackups);
          setSettings(savedSettings);
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Unable to load backups.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchData]);

  const refreshData = async () => {
    try {
      const { backups: savedBackups, settings: savedSettings } = await fetchData();
      setBackups(savedBackups);
      setSettings(savedSettings);
    } catch (requestError) {
      setError(requestError.message || "Unable to refresh backups.");
    }
  };

  const backUpNow = async () => {
    setBusy("backup");
    setError("");
    setNotice("");
    try {
      const response = await apiFetch("/admin/backups", { method: "POST" });
      setNotice("A database and uploads backup was created successfully.");
      await refreshData();
      return response.backup;
    } catch (requestError) {
      setError(requestError.message || "Unable to create the backup.");
    } finally {
      setBusy("");
    }
    return null;
  };

  const downloadBackup = async (backup) => {
    setBusy(`download-${backup.id}`);
    setError("");
    setNotice("");
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/backups/${encodeURIComponent(backup.id)}/download`, {
        headers: {
          Accept: "application/zip",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Unable to download this backup.");
      }

      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${backup.id}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (requestError) {
      setError(requestError.message || "Unable to download this backup.");
    } finally {
      setBusy("");
    }
  };

  const saveSchedule = async () => {
    setBusy("schedule");
    setError("");
    setNotice("");
    try {
      const response = await apiFetch("/admin/backups/settings", {
        method: "PUT",
        body: JSON.stringify({
          enabled: settings.enabled,
          frequency: settings.frequency,
          time: settings.time,
        }),
      });
      setSettings(response.settings);
      setNotice("Automatic backup schedule saved.");
    } catch (requestError) {
      setError(requestError.message || "Unable to save the backup schedule.");
    } finally {
      setBusy("");
    }
  };

  const restoreBackup = async () => {
    if (!restoreCandidate || confirmation !== "RESTORE") return;
    setBusy(`restore-${restoreCandidate.id}`);
    setError("");
    setNotice("");
    try {
      const response = await apiFetch(`/admin/backups/${encodeURIComponent(restoreCandidate.id)}/restore`, {
        method: "POST",
        body: JSON.stringify({ confirmation }),
      });
      setRestoreCandidate(null);
      setConfirmation("");
      setNotice(`Backup restored. A safety copy was saved as ${response.safety_backup.id}.`);
      await refreshData();
    } catch (requestError) {
      setError(requestError.message || "Unable to restore this backup.");
    } finally {
      setBusy("");
    }
  };

  const latestBackup = backups[0];
  const [today] = useState(() => new Date());

  return (
    <div className="flex min-h-screen w-full bg-[#f2f2f2] antialiased">
      <style>{FONT_CSS}</style>
      <AdminNavigation />

      <main className="min-w-0 flex-1 px-5 pb-[60px] pt-[62px] sm:px-8 lg:px-[41px] lg:pt-[51px]">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className={`${inter} text-[20px] font-bold tracking-[4.2px] text-[#4a9b8e]`}>
              BACKUP AND RESTORE
            </div>
            <h1 className={`${serif} mt-[8px] text-[34px] font-bold leading-[1.15] text-[#2f4a42] sm:text-[40px]`}>
              Is your data safe?
            </h1>
            <p className={`${serif} mt-[8px] max-w-xl text-[14px] font-bold text-[#2f4a42]`}>
              Save a copy of your clinic records, or bring back an earlier one if something goes wrong.
            </p>
          </div>

          <div className="flex items-center gap-[17px]">
            <div className="flex h-[34px] items-center justify-center gap-[8px] rounded-[6px] border border-[#4a9b8e] bg-[#e3f2ee] px-3">
              <Calendar className="h-[14px] w-[14px] text-[#2a8570]" />
              <span className={`${inter} text-[12px] font-bold text-[#2a8570]`}>
                {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </span>
            </div>
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex h-[37px] w-[46px] items-center justify-center rounded-[8px] border border-[#c7b6b6] bg-white"
            >
              <Bell className="h-[18px] w-[18px] text-[#2a8570]" />
            </button>
            <ProfileMenu size={37} />
          </div>
        </header>

        {error && (
          <div role="alert" className={`${inter} mt-6 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800`}>
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className={`${inter} mt-6 rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800`}>
            {notice}
          </div>
        )}

        <section className="mt-[28px] grid grid-cols-1 gap-[16px] sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Last backup" value={latestBackup ? formatDate(latestBackup.created_at) : "—"} />
          <StatCard title="Last backup size" value={latestBackup ? formatSize(latestBackup.size_bytes) : "—"} />
          <StatCard title="Saved backups" value={loading ? "…" : String(backups.length)} />
          <StatCard title="Auto backup schedule" value={settings.enabled ? settings.frequency : "Off"} />
        </section>

        <div className="mt-[24px] flex flex-col items-start gap-[24px] xl:flex-row">
          <section className={`${cardShape} w-full min-w-0 flex-1 overflow-hidden p-5 sm:p-[24px]`}>
            <h2 className={`${serif} text-[24px] font-bold text-[#2f4a42]`}>Backup history</h2>
            <p className={`${serif} mt-[4px] text-[14px] text-[#2f4a42] opacity-70`}>
              Download a saved copy or restore the system to an earlier point.
            </p>

            <div className="mt-[20px] overflow-x-auto">
              <div className="min-w-[670px]">
                <div className="grid h-[48px] grid-cols-[1.5fr_.8fr_.8fr_1.7fr] items-center bg-[#e6f2ec]">
                  {["Date & Time", "Type", "Size", "Actions"].map((heading, index) => (
                    <div
                      key={heading}
                      className={`${serif} flex h-full items-center px-3 text-[14px] font-bold text-[#2f4a42] sm:px-4 ${
                        index > 0 ? "border-l border-[#20202030]" : ""
                      } ${index === 3 ? "justify-center" : ""}`}
                    >
                      {heading}
                    </div>
                  ))}
                </div>

                {loading ? (
                  <div className={`${serif} border-b border-[#e4e4e4] px-4 py-8 text-center text-[#60716b]`}>
                    Loading saved backups…
                  </div>
                ) : backups.length === 0 ? (
                  <div className={`${serif} border-b border-[#e4e4e4] px-4 py-10 text-center text-[#60716b]`}>
                    No saved backups yet. Create one to see it here.
                  </div>
                ) : backups.map((backup) => (
                  <div
                    key={backup.id}
                    className="grid min-h-[72px] grid-cols-[1.5fr_.8fr_.8fr_1.7fr] items-center border-b border-[#e4e4e4] transition hover:bg-[#f3faf7]"
                  >
                    <div className={`${serif} px-3 text-[13px] font-bold text-[#2f4a42] sm:px-4`}>
                      {formatDate(backup.created_at, { hour: "numeric", minute: "2-digit" })}
                    </div>
                    <div className={`${serif} px-3 text-[13px] font-bold text-[#2f4a42] sm:px-4`}>
                      {typeLabel(backup.type)}
                    </div>
                    <div className={`${serif} px-3 text-[13px] font-bold text-[#2f4a42] sm:px-4`}>
                      {formatSize(backup.size_bytes)}
                    </div>
                    <div className="flex items-center justify-center gap-2 px-2">
                      <button
                        type="button"
                        onClick={() => downloadBackup(backup)}
                        disabled={busy !== ""}
                        className={`${serif} inline-flex items-center gap-[5px] rounded-[10px] border border-[#2020203d] bg-white px-[10px] py-[7px] text-[13px] font-bold text-[#2f4a42] transition hover:bg-[#e3f2ee] disabled:opacity-50`}
                      >
                        <Download className="h-[13px] w-[13px]" />
                        {busy === `download-${backup.id}` ? "Preparing…" : "Download"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRestoreCandidate(backup);
                          setConfirmation("");
                          setError("");
                        }}
                        disabled={busy !== ""}
                        className={`${serif} inline-flex items-center gap-[5px] rounded-[10px] border border-[#e6aaa6] bg-white px-[10px] py-[7px] text-[13px] font-bold text-[#b6372e] transition hover:bg-[#fff1f1] disabled:opacity-50`}
                      >
                        <RotateCcw className="h-[13px] w-[13px]" />
                        Restore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className={`${inter} mt-4 text-[12px] text-[#60716b]`}>
              Backups are stored privately on the server and include the database and uploaded files.
            </p>
          </section>

          <div className="flex w-full shrink-0 flex-col gap-[24px] xl:w-[403px]">
            <section className={`${cardShape} flex flex-col gap-[16px] px-[20px] py-[24px]`}>
              <div>
                <h2 className={`${serif} text-[20px] font-bold text-[#2f4a42]`}>Back up now</h2>
                <p className={`${serif} mt-1 text-[14px] text-[#2f4a42] opacity-80`}>
                  Save the current database and all clinic uploads.
                </p>
              </div>
              <div className="flex flex-wrap gap-[8px]">
                {["Clients", "Appointments", "Payments", "Schedules", "Services", "Uploaded files"].map((item) => (
                  <span
                    key={item}
                    className={`${serif} rounded-full bg-[#d6ede7] px-[13px] py-[6px] text-[13px] font-bold text-[#2f4a42]`}
                  >
                    {item}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={backUpNow}
                disabled={busy !== ""}
                className={`${serif} w-full rounded-[12px] bg-[#2f4a42] px-[20px] py-[14px] text-[16px] font-bold text-white transition hover:bg-[#1f322c] disabled:cursor-wait disabled:opacity-60`}
              >
                {busy === "backup" ? "Creating backup…" : "Back up now"}
              </button>
              <p className={`${serif} text-center text-[12px] font-bold text-[#2f4a42] opacity-60`}>
                {latestBackup ? `Last backup: ${formatDate(latestBackup.created_at, { hour: "numeric", minute: "2-digit" })}` : "No backups created yet"}
              </p>
            </section>

            <section className="flex flex-col gap-[16px] rounded-[16px] border border-[#d8e2e0] bg-white p-[20px]">
              <div className="flex items-center justify-between">
                <h2 className={`${serif} text-[22px] font-bold text-[#2f4a42]`}>Automatic backup</h2>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.enabled}
                  aria-label="Automatic backup"
                  disabled={busy !== ""}
                  onClick={() => setSettings((current) => ({ ...current, enabled: !current.enabled }))}
                  className={`flex h-[28px] w-[52px] items-center rounded-full p-[3px] transition-colors disabled:opacity-50 ${
                    settings.enabled ? "bg-[#088270]" : "bg-[#c9d3d0]"
                  }`}
                >
                  <span className={`h-[22px] w-[22px] rounded-full bg-white transition-transform ${settings.enabled ? "translate-x-[24px]" : "translate-x-0"}`} />
                </button>
              </div>
              <p className={`${serif} text-[14px] text-[#2f4a42] opacity-80`}>
                {settings.enabled ? "Automatic backups are enabled." : "Enable a recurring backup of your database and uploads."}
              </p>

              <SelectField
                label="HOW OFTEN"
                value={settings.frequency}
                onChange={(frequency) => setSettings((current) => ({ ...current, frequency }))}
                options={[
                  { value: "daily", label: "Every day" },
                  { value: "weekly", label: "Every week (Sunday)" },
                  { value: "monthly", label: "Every month (1st)" },
                ]}
                disabled={busy !== ""}
              />
              <SelectField
                label="TIME"
                value={settings.time}
                onChange={(time) => setSettings((current) => ({ ...current, time }))}
                disabled={busy !== ""}
              />

              <div className="rounded-[10px] bg-[#e2f2ea] px-[16px] py-[12px]">
                <p className={`${inter} text-[13px] font-bold text-[#2f4a42]`}>
                  {settings.enabled && settings.next_backup_at
                    ? `Next backup: ${formatDate(settings.next_backup_at, { weekday: "long", hour: "numeric", minute: "2-digit" })}`
                    : "Automatic backup is turned off"}
                </p>
                <p className={`${inter} mt-1 text-[11px] text-[#60716b]`}>
                  Keep 30 days of automatic backups. Manual and safety copies are kept. The Laravel scheduler must be running.
                </p>
              </div>

              <button
                type="button"
                onClick={saveSchedule}
                disabled={busy !== ""}
                className={`${inter} flex w-full justify-center rounded-[10px] border-[1.5px] border-[#088270] bg-white px-[20px] py-[14px] text-[13px] font-bold text-[#088270] transition hover:bg-[#e3f2ee] disabled:opacity-50`}
              >
                {busy === "schedule" ? "Saving…" : "Save schedule"}
              </button>
            </section>
          </div>
        </div>
      </main>

      {restoreCandidate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="restore-dialog-title"
            className="w-full max-w-[480px] rounded-[18px] bg-white p-6 shadow-xl"
          >
            <h2 id="restore-dialog-title" className={`${serif} text-[23px] font-bold text-[#2f4a42]`}>
              Restore this backup?
            </h2>
            <p className={`${serif} mt-3 text-[14px] leading-6 text-[#52655e]`}>
              This replaces the current database and uploaded files with the backup from{" "}
              <strong>{formatDate(restoreCandidate.created_at, { hour: "numeric", minute: "2-digit" })}</strong>.
              A safety backup of the current data will be created first.
            </p>
            <label htmlFor="restore-confirmation" className={`${inter} mt-5 block text-[12px] font-bold text-[#2f4a42]`}>
              Type RESTORE to confirm
            </label>
            <input
              id="restore-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              className={`${inter} mt-2 w-full rounded-[10px] border border-[#aabbb5] px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4a9b8e]`}
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setRestoreCandidate(null);
                  setConfirmation("");
                }}
                disabled={busy.startsWith("restore-")}
                className={`${inter} rounded-[10px] border border-[#b8c5c0] px-4 py-2 text-sm font-bold text-[#52655e]`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={restoreBackup}
                disabled={confirmation !== "RESTORE" || busy.startsWith("restore-")}
                className={`${inter} rounded-[10px] bg-[#b6372e] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {busy.startsWith("restore-") ? "Restoring…" : "Restore backup"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className={`${cardShape} min-h-[102px] px-5 py-4 sm:px-[28px]`}>
      <div className={`${serif} break-words text-[27px] font-bold leading-[1.15] text-[#2f4a42] sm:text-[32px]`}>{value}</div>
      <div className={`${serif} mt-[4px] text-[14px] font-bold text-[#2f4a42]`}>{title}</div>
    </div>
  );
}

function SelectField({ label, value, onChange, options, disabled }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <label className={`${inter} text-[11px] font-bold tracking-[0.8px] text-[#2f4a42]`}>{label}</label>
      {options ? (
        <select
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={`${inter} w-full rounded-[10px] border border-[#2020203d] bg-white px-[16px] py-[12px] text-[13px] text-[#2f4a42] focus:outline-none focus:ring-2 focus:ring-[#4a9b8e] disabled:opacity-50`}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : (
        <input
          type="time"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={`${inter} w-full rounded-[10px] border border-[#2020203d] bg-white px-[16px] py-[11px] text-[13px] text-[#2f4a42] focus:outline-none focus:ring-2 focus:ring-[#4a9b8e] disabled:opacity-50`}
        />
      )}
    </div>
  );
}
