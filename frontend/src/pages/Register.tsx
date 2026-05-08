import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { registerSchema } from "../schemas/registerSchema";
import { registerRequest } from "../services/authService";
import { mapZodErrors } from "../utils/zodErrors";

type Props = {
  onSubmit?: () => void;
};

type FieldErrors = Record<string, string[]>;

const Register = ({ onSubmit }: Props) => {
  const navigate = useNavigate();

  // FEEDBACK
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  // USER INPUTS
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault(); //empeche rechargement
    setFieldErrors({});
    setFormError(null);

    const formData = {
      name,
      email,
      password,
      confirmPassword,
    };

    const parsed = registerSchema.safeParse(formData);
    if (!parsed.success) {
      setFieldErrors(mapZodErrors(parsed.error));
      return;
    }

    try {
      const { res, data } = await registerRequest({
        name: parsed.data.name,
        email: parsed.data.email,
        password,
      });

      if (!res.ok) {
        if (data?.fieldErrors && typeof data.fieldErrors === "object") {
          setFieldErrors(data.fieldErrors);
        } else if (res.status === 409) {
          setFormError("Email already in use");
        } else if (res.status === 403) {
          setFormError("Security check failed. Please refresh the page and try again.");
        } else {
          setFormError(typeof data?.message === "string" ? data.message : "Registration failed");
        }
        return;
      }
    } catch {
      setFormError("Network error. Please try again.");
      return;
    }

    sessionStorage.setItem(
      "authMessage",
      "Registration successful. Please verify your email before logging in.",
    );

    onSubmit?.();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex items-center justify-center py-9">
      <div className="w-full max-w-md bg-gray-100 p-8 rounded-2xl shadow-md border">
        <h1 className="text-2xl font-semibold mb-6 text-center">Register</h1>

        {formError && <p className="mb-4 text-sm text-red-600">{formError}</p>}

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Username
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={name}
              placeholder="Your username"
              onChange={(e) => {
                setName(e.target.value);
                setFormError(null);
              }}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
            {fieldErrors.name?.[0] && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.name[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              placeholder="you@example.com"
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
              value={password}
              placeholder="••••••••"
              onChange={(e) => {
                setPassword(e.target.value);
                setFormError(null);
              }}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
            {fieldErrors.password?.[0] && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.password[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              placeholder="••••••••"
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setFormError(null);
              }}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
            {fieldErrors.confirmPassword?.[0] && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.confirmPassword[0]}</p>
            )}
          </div>
          <button
            type="submit"
            className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition"
          >
            Create account
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
