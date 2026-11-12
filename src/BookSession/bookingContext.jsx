import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getPsychologist } from "../data/clinic";
import { apiFetch } from "../auth";

const STORAGE_KEY = "tf_booking";

const defaultBooking = {
  serviceId: null,
  psychologistId: null,
  assessmentTypeId: null,   // only used when serviceId === "assessment"
  assessmentType: null,     // { id, name, price, duration_minutes, hours }
  bookingMode: "psychologist-first", // or "schedule-first"
  date: null, // { year, month, day }
  time: null,
  client: {
    fullName: "",
    birthdate: "",
    email: "",
    mobile: "",
    emergencyName: "",
    emergencyRelation: "",
    emergencyPhone: "",
  },
  payment: {
    type: "full", // full | down
    method: "gcash",
    amountPaid: 0,
    remaining: 0,
    refNumber: "",
  },
  approvalStatus: "none", // none | payment_pending | psychologist_pending | approved | rejected
  consentComplete: false,
  referenceNumber: "",
};

function load() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultBooking;
    const parsed = JSON.parse(raw);
    return {
      ...defaultBooking,
      ...parsed,
      client: { ...defaultBooking.client, ...parsed.client },
      payment: { ...defaultBooking.payment, ...parsed.payment },
    };
  } catch {
    return defaultBooking;
  }
}

const BookingContext = createContext(null);

export function BookingProvider({ children }) {
  const [booking, setBooking] = useState(load);
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState("");

  useEffect(() => {
    let alive = true;
    apiFetch("/services")
      .then((data) => {
        if (!alive) return;
        const availableServices = (data.services || []).map((item) => {
          const hours = Number(item.hours) || 1;
          return {
            ...item,
            fee: Number(item.price) || 0,
            fullName: item.title || item.name,
            duration: `${hours} ${hours === 1 ? "hour" : "hours"}`,
            description: item.text || "",
            details: Array.isArray(item.goodFor) ? item.goodFor : [],
          };
        });
        setServices(availableServices);
        setBooking((current) => {
          if (!current.serviceId || availableServices.some((item) => item.id === current.serviceId)) {
            return current;
          }

          const legacyServiceNames = {
            psychotherapy: (name) => name.includes("psychotherapy"),
            aba: (name) => name === "abatherapy",
            assessment: (name) => name.includes("assessment") && name.includes("consultation"),
          };
          const matchesLegacyService = legacyServiceNames[current.serviceId];
          const replacement = matchesLegacyService
            ? availableServices.find((item) =>
                matchesLegacyService(String(item.name || "").toLowerCase().replace(/[^a-z0-9]/g, ""))
              )
            : null;

          return replacement ? { ...current, serviceId: replacement.id } : current;
        });
        setServicesError("");
      })
      .catch((err) => {
        if (alive) setServicesError(err.message || "Could not load available services.");
      })
      .finally(() => {
        if (alive) setServicesLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(booking));
  }, [booking]);

  const update = (patch) => setBooking((b) => ({ ...b, ...patch }));
  const updateClient = (patch) =>
    setBooking((b) => ({ ...b, client: { ...b.client, ...patch } }));
  const updatePayment = (patch) =>
    setBooking((b) => ({ ...b, payment: { ...b.payment, ...patch } }));
  const reset = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setBooking(defaultBooking);
  };

  const service = services.find((item) => item.id === booking.serviceId) || null;
  const psychologist = getPsychologist(booking.psychologistId);

  const dateLabel = useMemo(() => {
    if (!booking.date || !booking.time) return "To be set";
    const { year, month, day } = booking.date;
    const d = new Date(year, month, day);
    const dateStr = d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    return `${dateStr} · ${booking.time}`;
  }, [booking.date, booking.time]);

  const dateLongLabel = useMemo(() => {
    if (!booking.date) return "—";
    const { year, month, day } = booking.date;
    return new Date(year, month, day).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [booking.date]);

  // If assessment type has its own price, use it; otherwise fall back to service fee
  const fee = useMemo(() => {
    if (booking.serviceId === "assessment" && booking.assessmentType?.price > 0) {
      return booking.assessmentType.price;
    }
    return service?.fee ?? 0;
  }, [booking.serviceId, booking.assessmentType, service]);

  const feeLabel = `₱${fee.toLocaleString()}`;

  const summaryRows = [
    { label: "SERVICE", value: service?.name || "To be set" },
    ...(booking.serviceId === "assessment"
      ? [{ label: "TYPE", value: booking.assessmentType?.name || "To be set" }]
      : []),
    {
      label: "PSYCHOLOGIST",
      value:
        psychologist?.name ||
        (booking.serviceId === "psychotherapy" ? "To be set" : booking.serviceId ? "Auto-assigned" : "To be set"),
    },
    { label: "DATE & TIME", value: dateLabel },
  ];

  const value = {
    booking,
    setBooking,
    update,
    updateClient,
    updatePayment,
    reset,
    service,
    psychologist,
    dateLabel,
    dateLongLabel,
    fee,
    feeLabel,
    summaryRows,
    services,
    servicesLoading,
    servicesError,
  };

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used within BookingProvider");
  return ctx;
}
