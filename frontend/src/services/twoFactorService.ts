import { getCsrfToken } from "./csrf";
import type { TwoFactorSetupResponse } from "../types/2fa";

export async function enableTwoFactorRequest() {
  const token = await getCsrfToken();

  const res = await fetch("/api/2fa/setup", {
    method: "POST",
    headers: {
      "x-csrf-token": token,
    },
    credentials: "include",
  });

  const data: TwoFactorSetupResponse = await res.json().catch(() => ({}));

  return { res, data };
}

export async function verifyTwoFactorRequest(code: string) {
  const csrfToken = await getCsrfToken();

  const res = await fetch("/api/2fa/verify-setup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    credentials: "include",
    body: JSON.stringify({ code }),
  });

  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export async function disableTwoFactorRequest(code: string) {
  const csrfToken = await getCsrfToken();

  const res = await fetch("/api/2fa/disable", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    credentials: "include",
    body: JSON.stringify({ code }),
  });

  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export async function cancelTwoFactorSetupRequest() {
  const csrfToken = await getCsrfToken();

  const res = await fetch("/api/2fa/cancel-setup", {
    method: "POST",
    headers: {
      "x-csrf-token": csrfToken,
    },
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));
  return { res, data };
}
