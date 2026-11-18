import Echo from "laravel-echo";
import Pusher from "pusher-js";

window.Pusher = Pusher;

const scheme = import.meta.env.VITE_REVERB_SCHEME || "http";
const port = Number(import.meta.env.VITE_REVERB_PORT || 8080);

const echo = new Echo({
  broadcaster: "reverb",
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
  wsPort: port,
  wssPort: port,
  forceTLS: scheme === "https",
  disableStats: true,
  enabledTransports: scheme === "https" ? ["wss"] : ["ws"],
  authEndpoint: `${scheme}://localhost:8000/broadcasting/auth`,
  auth: {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      Accept: "application/json",
    },
  },
});

export default echo;