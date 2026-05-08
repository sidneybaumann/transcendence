import { NavLink } from "react-router-dom";
import { useState } from "react";
import { emailSchema } from "../schemas/emailSchema";
import { forgotPasswordRequest } from "../services/userService";
import { mapZodErrors } from "../utils/zodErrors";

type FieldErrors = Record<string, string[]>;

const RequestPassword = () => {
  // FEEDBACK
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // USER INPUTS
  const [email, setEmail] = useState("");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);
    setInfoMessage(null);

    const trimmedEmail = email.trim();
    const parsed = emailSchema.safeParse({ email: trimmedEmail });

    if (!parsed.success) {
      setFieldErrors(mapZodErrors(parsed.error));
      return;
    }

    try {
      setIsSubmitting(true);

      const { res, data } = await forgotPasswordRequest(trimmedEmail);

      if (!res.ok) {
        if (data?.fieldErrors && typeof data.fieldErrors === "object") {
          setFieldErrors(data.fieldErrors);
        } else {
          setFormError(data?.message ?? "Failed to send password reset email.");
        }
        return;
      }

      setEmail("");
      setInfoMessage(
        data?.message ??
          "If an account with that email exists, a password reset link has been sent.",
      );
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-9">
      <div className="w-full max-w-md bg-gray-100 p-8 rounded-2xl shadow-md border">
        <h1 className="text-2xl font-semibold mb-6 text-center">Forgot password</h1>
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your account email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
            {fieldErrors.email?.[0] && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.email[0]}</p>
            )}
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          {infoMessage && <p className="text-sm text-green-700">{infoMessage}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
          >
            {isSubmitting ? "Sending request..." : "Send reset link"}
          </button>
          <span className="text-sm flex items-center justify-center">
            <NavLink to="/login">Go back to login</NavLink>
          </span>
        </form>
      </div>
    </div>
  );
};

export default RequestPassword;
