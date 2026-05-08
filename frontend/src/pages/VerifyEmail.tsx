import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { verifyEmailRequest } from "../services/authService";

type Status = "loading" | "success" | "error";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const hasVerifiedRef = useRef(false);
  const { refreshUser } = useAuth();

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("Confirming your email...");

  useEffect(() => {
    if (!token || hasVerifiedRef.current) return;

    const safeToken = token;
    hasVerifiedRef.current = true;

    async function verifyEmail() {
      try {
        const { res, data } = await verifyEmailRequest(safeToken);

        if (!res.ok) {
          setStatus("error");
          setMessage(data?.message ?? "Email confirmation failed.");
          return;
        }

        setStatus("success");
        setMessage(data?.message ?? "Email confirmed successfully.");
        if (data?.code === "EMAIL_CHANGED") {
          await refreshUser();
        }
      } catch {
        setStatus("error");
        setMessage("Network error while confirming email.");
      }
    }

    verifyEmail();
  }, [token, refreshUser]);

  if (!token) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="rounded-lg border border-gray-300 bg-white p-6 shadow-sm">
          <h1 className="mb-4 text-2xl font-semibold">Email confirmation</h1>
          <div className="space-y-4">
            <p className="text-sm text-red-600">Missing verification token.</p>
            <Link
              to="/login"
              className="inline-block rounded-lg bg-black px-4 py-2 text-white transition hover:bg-gray-800"
            >
              Go to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="rounded-lg border border-gray-300 bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-2xl font-semibold">Email confirmation</h1>

        {status === "loading" && <p className="text-sm text-gray-700">{message}</p>}

        {status === "success" && (
          <div className="space-y-4">
            <p className="text-sm text-green-700">{message}</p>
            <Link
              to="/login"
              className="inline-block rounded-lg bg-black px-4 py-2 text-white transition hover:bg-gray-800"
            >
              Go to login
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <p className="text-sm text-red-600">{message}</p>
            <Link
              to="/login"
              className="inline-block rounded-lg bg-black px-4 py-2 text-white transition hover:bg-gray-800"
            >
              Go to login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
