import { getCsrfToken } from "./csrf";

export async function updateUserNameRequest(newName: string) {
  const token = await getCsrfToken();

  const res = await fetch("/api/users/me", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": token,
    },
    credentials: "include",
    body: JSON.stringify({ newName }),
  });

  const data = await res.json().catch(() => ({}));

  return { res, data };
}

export async function updatePasswordRequest(payload: {
  currentPassword: string;
  newPassword: string;
  twoFactorCode?: string;
}) {
  const token = await getCsrfToken();

  const res = await fetch("/api/users/password", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": token,
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  return { res, data };
}

export async function updateEmailRequest(payload: {
  newEmail: string;
  currentPassword: string;
  twoFactorCode?: string;
}) {
  const csrfToken = await getCsrfToken();

  const res = await fetch("/api/users/email", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export async function forgotPasswordRequest(email: string) {
  const res = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  const data = await res.json().catch(() => ({}));

  return { res, data };
}

export async function resetPasswordRequest(
  token: string,
  newPassword: string,
  twoFactorCode?: string,
) {
  const body: {
    token: string;
    newPassword: string;
    twoFactorCode?: string;
  } = { token, newPassword };

  if (twoFactorCode) {
    body.twoFactorCode = twoFactorCode;
  }

  const res = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  return { res, data };
}

export async function exportUserDataRequest(payload: {
  currentPassword?: string;
  twoFactorCode?: string;
}) {
  const csrfToken = await getCsrfToken();

  const res = await fetch("/api/users/export-data", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return {
      success: false as const,
      message: data?.message ?? "Failed to export data.",
    };
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "user-data.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);

  return {
    success: true as const,
  };
}

export async function deleteAccountRequest(payload: {
  currentPassword?: string;
  confirmation: string;
  twoFactorCode?: string;
}) {
  const csrfToken = await getCsrfToken();

  const res = await fetch("/api/users/delete-account", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  return { res, data };
}
