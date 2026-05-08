import { getCsrfToken } from "./csrf";

export async function loginRequest(email: string, password: string) {
  const token = await getCsrfToken();

  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-csrf-token": token },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));

  return { res, data };
}

export async function registerRequest(payload: { name: string; email: string; password: string }) {
  const token = await getCsrfToken();

  const res = await fetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": token,
    },
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));

  return { res, data };
}

export async function verifyTwoFactorLoginRequest(params: { userId: string; code: string }) {
  const csrfToken = await getCsrfToken();

  const res = await fetch("/api/2fa/verify-login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    credentials: "include",
    body: JSON.stringify(params),
  });

  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export async function resendVerificationEmailRequest(email: string) {
  const token = await getCsrfToken();

  const res = await fetch("/api/auth/resend-verification", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": token,
    },
    credentials: "include",
    body: JSON.stringify({ email }),
  });

  const data = await res.json().catch(() => ({}));

  return { res, data };
}

export async function verifyEmailRequest(token: string) {
  const res = await fetch("/api/auth/verify-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });

  const data = await res.json().catch(() => ({}));

  return { res, data };
}
