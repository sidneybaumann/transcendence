let csrfToken: string | null = null;

type CsrfResponse = {
  csrfToken: string;
};

export async function getCsrfToken(): Promise<string> {
  if (csrfToken !== null) return csrfToken;

  const res = await fetch("/api/auth/csrf", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch CSRF token (${res.status})`);
  }

  const data: CsrfResponse = await res.json();

  csrfToken = data.csrfToken;
  return data.csrfToken;
}
