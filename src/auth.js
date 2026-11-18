// src/auth.js — token at API calls

export const API_URL = "http://localhost:8000/api";

// Remember me = localStorage (tumatagal), hindi naka-check = sessionStorage (mawawala pag sinara ang tab)
export const getToken = () => localStorage.getItem("token") || sessionStorage.getItem("token");

export const getFullName = (user, fallback = "") =>
    [user?.first_name, user?.last_name].map((part) => part?.trim()).filter(Boolean).join(" ") || fallback;

export const getUser = () => {
    try {
        return JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "null");
    } catch {
        return null;
    }
};

export function saveAuth(token, user, remember = true) {
    clearAuth();
    const store = remember ? localStorage : sessionStorage;
    store.setItem("token", token);
    store.setItem("user", JSON.stringify(user));
    sessionStorage.setItem("tf_auth", "1");
}

export function clearAuth() {
    ["token", "user"].forEach((k) => {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
    });
    sessionStorage.removeItem("tf_auth");
}

export async function apiFetch(path, options = {}) {
    const token = getToken();
    let res;
    try {
        res = await fetch(`${API_URL}${path}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...(options.headers || {}),
            },
        });
    } catch {
        throw new Error("Can't reach the server. Is the backend running?");
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        if (res.status === 401 && token) {
            clearAuth();
            throw new Error("Your session expired. Please sign in again.");
        }
        const firstError = data.errors ? Object.values(data.errors)[0][0] : null;
        const error = new Error(firstError || data.message || "Something went wrong.");
        error.status = res.status;
        error.data = data;
        throw error;
    }
    return data;
}

export async function logout() {
    try {
        await apiFetch("/logout", { method: "POST" });
    } catch {
        /* kahit mag-error, ituloy ang paglinis */
    }
    clearAuth();
}