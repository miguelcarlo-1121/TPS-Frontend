import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useBooking } from "./bookingContext";

const RESET = {
  serviceId: null,
  psychologistId: null,
  psychologist: null,
  date: null,
  time: null,
  timeStart: null,
  timeEnd: null,
  holdId: null,
  holdExpiresAt: null,
  providerId: null,
  resumePath: null,
};

export default function HoldExpiryModal() {
  const { booking, update } = useBooking();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!booking.holdId || !booking.holdExpiresAt) return;
    const end = new Date(booking.holdExpiresAt).getTime();
    const check = () => {
      if (Date.now() >= end) setExpired(true);
    };
    check();
    const id = setInterval(check, 1000);
    // Kapag bumalik sa tab o nag-focus ulit (throttled ang timers sa background tabs)
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [booking.holdId, booking.holdExpiresAt]);

  if (!expired || pathname === "/book/confirmation") return null;

  const startOver = () => {
    update(RESET);
    setExpired(false);
    navigate("/book", { replace: true });
  };

  return (
    <div
      className="fixed inset-0 z-[200] grid place-items-center bg-black/45 p-4"
      role="alertdialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
        <h3 className="m-0 font-serif text-xl text-[#202020]">Your reservation expired</h3>
        <p className="mt-2 mb-0 text-sm text-[#666]">
          Your selected time was only held for 1 hour and payment wasn&apos;t completed. The
          time is open to others again. Please start your booking again.
        </p>
        <button
          type="button"
          onClick={startOver}
          className="mt-5 cursor-pointer rounded-lg border-0 bg-[#11a086] px-5 py-2 text-sm text-white hover:bg-[#0e8c75]"
        >
          Choose a service
        </button>
      </div>
    </div>
  );
}