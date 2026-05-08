import { Link, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { passwordSchema } from "../schemas/passwordSchema";
import { resetPasswordRequest } from "../services/userService";
import { mapZodErrors } from "../utils/zodErrors";

type FieldErrors = Record<string, string[]>;

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // 2FA
  const [twoFactorCode, setTwoFactorCode] = useState("");

  if (!token) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="rounded-lg border border-gray-300 bg-white p-6 shadow-sm">
          <h1 className="mb-4 text-2xl font-semibold">Reset password</h1>
          <p className="text-sm text-red-600">Missing password reset token.</p>
          <Link
            to="/forgot-password"
            className="mt-4 inline-block rounded-lg bg-black px-4 py-2 text-white transition hover:bg-gray-800"
          >
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);
    setInfoMessage(null);

    const trimmedTwoFactorCode = twoFactorCode.trim();

    const parsed = passwordSchema.safeParse({
      newPassword: newPassword,
      confirmPassword: confirmPassword,
    });

    if (!parsed.success) {
      setFieldErrors(mapZodErrors(parsed.error));
      return;
    }

    try {
      setIsSubmitting(true);

      const { res, data } = await resetPasswordRequest(
        token,
        newPassword,
        trimmedTwoFactorCode || undefined,
      );

      if (!res.ok) {
        setFormError(data?.message ?? "Failed to reset password.");
        return;
      }

      setIsSuccess(true);
      setInfoMessage(data?.message ?? "Password reset successfully. Please log in again.");
      setNewPassword("");
      setConfirmPassword("");
      setTwoFactorCode("");
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-9">
      <div className="w-full max-w-md bg-gray-100 p-8 rounded-2xl shadow-md border">
        <h1 className="text-2xl font-semibold mb-6 text-center">Reset password</h1>

        {!isSuccess ? (
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="block text-sm font-medium mb-1">New password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
              />
              {fieldErrors.newPassword?.[0] && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.newPassword[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Confirm new password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
              />
              {fieldErrors.confirmPassword?.[0] && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.confirmPassword[0]}</p>
              )}
            </div>

            <div>
              <label htmlFor="twoFactorCode" className="block text-sm font-medium mb-1">
                Authentication code (if 2FA is enabled)
              </label>
              <input
                id="twoFactorCode"
                name="twoFactorCode"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter your 6-digit code if 2FA is enabled"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
              />
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            {infoMessage && <p className="text-sm text-green-700">{infoMessage}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
            >
              {isSubmitting ? "Resetting password..." : "Reset password"}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            {infoMessage && <p className="text-sm text-green-700">{infoMessage}</p>}
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
};

export default ResetPassword;
