import { useNavigate, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { loginSchema } from "../schemas/loginSchema";
import { otpOrRecoveryCodeSchema } from "../schemas/otpOrRecoveryCodeSchema";
import {
  resendVerificationEmailRequest,
  loginRequest,
  verifyTwoFactorLoginRequest,
} from "../services/authService";
import { mapZodErrors } from "../utils/zodErrors";

type FieldErrors = Record<string, string[]>;

const Login = () => {
  const navigate = useNavigate();
  const { login, refreshUser } = useAuth();

  // FEEDBACK
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);

  // USER INPUTS
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 2FA
  const [isTwoFactorStep, setIsTwoFactorStep] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [isTwoFactorSubmitting, setIsTwoFactorSubmitting] = useState(false);

  useEffect(() => {
    const message = sessionStorage.getItem("authMessage");

    if (message) {
      setAuthMessage(message);
      sessionStorage.removeItem("authMessage");
    }
  }, []);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);
    setInfoMessage(null);
    setNeedsEmailVerification(false);

    const parsed = loginSchema.safeParse({ email, password });

    if (!parsed.success) {
      setFieldErrors(mapZodErrors(parsed.error));
      return;
    }

    try {
      setIsSubmitting(true);

      const { res, data } = await loginRequest(email, password);

      if (!res.ok) {
        if (data?.code === "EMAIL_NOT_VERIFIED") {
          setNeedsEmailVerification(true);
        }

        if (data?.fieldErrors && typeof data.fieldErrors === "object") {
          setFieldErrors(data.fieldErrors);
        } else {
          setFormError(data?.message ?? "Login failed");
        }
        return;
      }
      if (data?.code === "TWO_FACTOR_REQUIRED") {
        setPendingUserId(data.pendingUserId);
        setIsTwoFactorStep(true);
        setPassword("");
        setFormError(null);
        setInfoMessage(null);
        return;
      }
      login(data);
      await refreshUser();
      navigate("/play", { replace: true });
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    setFormError(null);
    setInfoMessage(null);

    if (!email.trim()) {
      setFormError("Please enter your email first.");
      return;
    }

    try {
      const { res, data } = await resendVerificationEmailRequest(email.trim());

      if (!res.ok) {
        setFormError(data?.message ?? "Failed to resend verification email.");
        return;
      }

      setInfoMessage(data?.message ?? "Verification email sent.");
    } catch {
      setFormError("Network error. Please try again.");
    }
  };

  const handleTwoFactorSubmit = async () => {
    setFormError(null);
    setInfoMessage(null);

    if (!pendingUserId) {
      setFormError("Missing pending login information.");
      return;
    }

    const parsed = otpOrRecoveryCodeSchema.safeParse({
      code: otpCode,
    });

    if (!parsed.success) {
      setFormError(mapZodErrors(parsed.error).code?.[0] ?? "Invalid code.");
      return;
    }

    try {
      setIsTwoFactorSubmitting(true);

      const { res, data } = await verifyTwoFactorLoginRequest({
        userId: pendingUserId,
        code: parsed.data.code,
      });

      if (!res.ok) {
        setFormError(data?.message ?? "Invalid verification code.");
        return;
      }

      setPendingUserId(null);
      setOtpCode("");
      setIsTwoFactorStep(false);

      login(data);
      await refreshUser();
      navigate("/play", { replace: true });
    } catch {
      setFormError("Failed to verify authentication code.");
    } finally {
      setIsTwoFactorSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-9">
      <div className="w-full max-w-md bg-gray-100 p-8 rounded-2xl shadow-md border">
        {!isTwoFactorStep ? (
          <>
            <h1 className="text-2xl font-semibold mb-6 text-center">Login</h1>

            {authMessage && (
              <p className="mb-4 rounded-lg bg-green-100 px-4 py-2 text-sm text-green-800">
                {authMessage}
              </p>
            )}

            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFormError(null);
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
                />
                {fieldErrors.email?.[0] && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.email[0]}</p>
                )}
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1">
                  Password
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFormError(null);
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
                />

                <div className="mt-1 text-right text-xs">
                  <NavLink
                    to="/forgot-password"
                    className="text-gray-600 hover:underline hover:text-black"
                  >
                    Forgot password?
                  </NavLink>
                </div>

                {fieldErrors.password?.[0] && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.password[0]}</p>
                )}
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              {needsEmailVerification && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  className="text-sm underline"
                >
                  Resend verification email
                </button>
              )}
              {infoMessage && <p className="text-sm text-green-700">{infoMessage}</p>}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
              >
                {isSubmitting ? "Signing In..." : "Sign In"}
              </button>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 h-px bg-gray-300" />
                <span className="text-sm text-gray-500">OR</span>
                <div className="flex-1 h-px bg-gray-300" />
              </div>{" "}
              {/* https://developers.google.com/identity/branding-guidelines */}
              <a
                href="/api/auth/google"
                className="w-full inline-flex items-center justify-center gap-3 bg-white border border-gray-300 py-2 rounded-lg hover:bg-gray-200 transition"
              >
                {/* Google logo */}
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <path
                    fill="#4285F4"
                    d="M24 9.5c3.54 0 6.36 1.22 8.28 3.22l6.18-6.18C34.36 2.36 29.64 0 24 0 14.64 0 6.6 5.4 2.64 13.28l7.2 5.6C12.04 13.36 17.56 9.5 24 9.5z"
                  />
                  <path
                    fill="#34A853"
                    d="M46.5 24.5c0-1.64-.14-3.22-.4-4.76H24v9.02h12.7c-.54 2.9-2.2 5.36-4.68 7.02l7.2 5.6c4.2-3.86 6.62-9.56 6.62-16.88z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M9.84 28.88c-1.08-3.2-1.08-6.64 0-9.84l-7.2-5.6C.96 16.92 0 20.34 0 24s.96 7.08 2.64 10.56l7.2-5.6z"
                  />
                  <path
                    fill="#EA4335"
                    d="M24 48c6.48 0 11.92-2.14 15.9-5.82l-7.2-5.6c-2 1.34-4.56 2.14-8.7 2.14-6.44 0-11.96-3.86-14.16-9.38l-7.2 5.6C6.6 42.6 14.64 48 24 48z"
                  />
                </svg>

                <span>Continue with Google</span>
              </a>
              <div className="text-sm text-center">
                Don&apos;t have an account? Sign up{" "}
                <NavLink to="/register" className="text-gray-600 hover:underline hover:text-black">
                  <b>here</b>
                </NavLink>
                .
              </div>
            </form>
          </>
        ) : (
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold mb-2 text-center">Verify your account</h1>
            <p className="text-sm text-gray-700">
              Enter the 6-digit code from your authenticator app or a recovery code to complete
              sign-in.
            </p>

            <input
              type="text"
              inputMode="text"
              maxLength={9}
              value={otpCode}
              onChange={(e) => {
                setOtpCode(e.target.value);
                setFormError(null);
              }}
              placeholder="Enter OTP or recovery code"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />

            {formError && <p className="text-sm text-red-600">{formError}</p>}
            {infoMessage && <p className="text-sm text-green-700">{infoMessage}</p>}

            <button
              type="button"
              disabled={isTwoFactorSubmitting}
              onClick={handleTwoFactorSubmit}
              className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
            >
              {isTwoFactorSubmitting ? "Verifying code..." : "Verify code"}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsTwoFactorStep(false);
                setPendingUserId(null);
                setOtpCode("");
                setFormError(null);
                setInfoMessage(null);
              }}
              className="w-full border border-gray-300 py-2 rounded-lg hover:bg-gray-100 transition"
            >
              Back to login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
