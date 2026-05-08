import { useState } from "react";
import type { User } from "../../types/user";
import {
  updateUserNameRequest,
  updatePasswordRequest,
  updateEmailRequest,
} from "../../services/userService";
import { mapZodErrors } from "../../utils/zodErrors";
import { newNameSchema } from "../../schemas/newNameSchema";
import { updatePasswordSchema } from "../../schemas/updatePasswordSchema";
import { updateEmailSchema } from "../../schemas/updateEmailSchema";

type FieldErrors = Record<string, string[]>;

type Props = {
  user: User | null;
  refreshUser: () => Promise<void>;
};

const AccountSettingsSection = ({ user, refreshUser }: Props) => {
  // UPDATE NAME FEEDBACK
  const [nameFieldErrors, setNameFieldErrors] = useState<FieldErrors>({});
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameInfo, setNameInfo] = useState<string | null>(null);

  // UPDATE PASSWORD FEEDBACK
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<FieldErrors>({});
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordInfo, setPasswordInfo] = useState<string | null>(null);

  // UPDATE EMAIL FEEDBACK
  const [emailFieldErrors, setEmailFieldErrors] = useState<FieldErrors>({});
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailInfo, setEmailInfo] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [currentPasswordForPassword, setCurrentPasswordForPassword] = useState("");
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState("");

  const [twoFactorCodeForEmail, setTwoFactorCodeForEmail] = useState("");
  const [twoFactorCodeForPassword, setTwoFactorCodeForPassword] = useState("");

  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // UPDATE USERNAME
  const updateUserName = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNameError(null);
    setNameFieldErrors({});
    setNameInfo(null);

    const parsed = newNameSchema.safeParse({
      name,
    });

    if (!parsed.success) {
      setNameFieldErrors(mapZodErrors(parsed.error));
      return;
    }

    try {
      setIsUpdatingName(true);

      const { res, data } = await updateUserNameRequest(parsed.data.name);

      if (!res.ok) {
        if (data?.fieldErrors) {
          setNameFieldErrors(data.fieldErrors);
        } else {
          setNameError(data?.message ?? "Username update failed");
        }
        return;
      }

      await refreshUser();
      setName("");
      setNameInfo("Username updated successfully.");
    } catch {
      setNameError("Failed to update username.");
    } finally {
      setIsUpdatingName(false);
    }
  };

  // UPDATE PASSWORD
  const updatePassword = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordFieldErrors({});
    setPasswordInfo(null);

    const trimmedTwoFactorCode = twoFactorCodeForPassword.trim();

    const parsed = updatePasswordSchema.safeParse({
      currentPassword: currentPasswordForPassword,
      newPassword,
      confirmPassword,
      twoFactorCode: trimmedTwoFactorCode || undefined,
    });

    if (!parsed.success) {
      setPasswordFieldErrors(mapZodErrors(parsed.error));
      return;
    }

    if (user?.isTwoFactorEnabled && !parsed.data.twoFactorCode) {
      setPasswordFieldErrors({
        twoFactorCode: ["Two-factor authentication code is required."],
      });
      return;
    }

    try {
      setIsUpdatingPassword(true);

      const payload: {
        currentPassword: string;
        newPassword: string;
        twoFactorCode?: string;
      } = {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
      };

      if (user?.isTwoFactorEnabled) {
        payload.twoFactorCode = parsed.data.twoFactorCode;
      }

      const { res, data } = await updatePasswordRequest(payload);

      if (!res.ok) {
        if (data?.fieldErrors && typeof data.fieldErrors === "object") {
          setPasswordFieldErrors(data.fieldErrors);
        } else {
          setPasswordError(data?.message ?? "Password update failed.");
        }
        return;
      }

      setCurrentPasswordForPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTwoFactorCodeForPassword("");

      sessionStorage.setItem("authMessage", "Password updated successfully. Please log in again.");

      await refreshUser();
    } catch {
      setPasswordError("Failed to update password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // UPDATE EMAIL
  const updateEmail = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmailError(null);
    setEmailFieldErrors({});
    setEmailInfo(null);

    const parsed = updateEmailSchema.safeParse({
      newEmail: newEmail.trim(),
      currentPassword: currentPasswordForEmail,
      twoFactorCode: twoFactorCodeForEmail.trim() || undefined,
    });

    if (!parsed.success) {
      setEmailFieldErrors(mapZodErrors(parsed.error));
      return;
    }

    if (user?.isTwoFactorEnabled && !parsed.data.twoFactorCode) {
      setEmailFieldErrors({
        twoFactorCode: ["Two-factor authentication code is required."],
      });
      return;
    }

    try {
      setIsUpdatingEmail(true);

      const payload: {
        newEmail: string;
        currentPassword: string;
        twoFactorCode?: string;
      } = {
        newEmail: parsed.data.newEmail,
        currentPassword: parsed.data.currentPassword,
      };

      if (user?.isTwoFactorEnabled) {
        payload.twoFactorCode = parsed.data.twoFactorCode;
      }

      const { res, data } = await updateEmailRequest(payload);

      if (!res.ok) {
        if (data?.fieldErrors && typeof data.fieldErrors === "object") {
          setEmailFieldErrors(data.fieldErrors);
        } else {
          setEmailError(data?.message ?? "Email update failed.");
        }
        return;
      }

      setNewEmail("");
      setCurrentPasswordForEmail("");
      setTwoFactorCodeForEmail("");
      setEmailInfo(data?.message ?? "Please verify your new email address.");
    } catch {
      setEmailError("Failed to update email.");
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  return (
    <div>
      <div className="space-y-4 py-2 md:py-4">
        <h1 className="mb-2 text-2xl font-semibold">Change username</h1>

        <form className="max-w-md space-y-4" onSubmit={updateUserName}>
          <hr />
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              New username
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                id="name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Current username: ${user?.name ?? ""}`}
                className="w-full flex-1 rounded-lg border bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              />

              <button
                type="submit"
                disabled={isUpdatingName}
                className="w-full rounded-lg bg-black px-4 py-2 text-white transition hover:bg-gray-800 disabled:opacity-50 sm:w-auto"
              >
                {isUpdatingName ? "Updating..." : "Update"}
              </button>
            </div>

            {nameFieldErrors.name?.[0] && (
              <p className="mt-1 text-sm text-red-600">{nameFieldErrors.name[0]}</p>
            )}
          </div>

          {nameError && <p className="text-sm text-red-600">{nameError}</p>}
          {nameInfo && <p className="text-sm text-green-700">{nameInfo}</p>}
        </form>
      </div>

      <div className="space-y-4 py-2 md:py-4">
        <h1 className="mb-2 text-2xl font-semibold">Change password</h1>

        <form className="max-w-md space-y-4" onSubmit={updatePassword}>
          <hr />
          <div>
            <label htmlFor="currentPasswordForPassword" className="block text-sm font-medium mb-1">
              Current password
            </label>
            <input
              id="currentPasswordForPassword"
              name="currentPasswordForPassword"
              type="password"
              value={currentPasswordForPassword}
              onChange={(e) => setCurrentPasswordForPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {passwordFieldErrors.currentPassword?.[0] && (
            <p className="mt-1 text-sm text-red-600">{passwordFieldErrors.currentPassword[0]}</p>
          )}

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium mb-1">
              New password
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {passwordFieldErrors.newPassword?.[0] && (
            <p className="mt-1 text-sm text-red-600">{passwordFieldErrors.newPassword[0]}</p>
          )}

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {passwordFieldErrors.confirmPassword?.[0] && (
            <p className="mt-1 text-sm text-red-600">{passwordFieldErrors.confirmPassword[0]}</p>
          )}

          {user?.isTwoFactorEnabled && (
            <div>
              <label htmlFor="twoFactorCodeForPassword" className="block text-sm font-medium mb-1">
                Authentication code
              </label>
              <input
                id="twoFactorCodeForPassword"
                name="twoFactorCodeForPassword"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter your 6-digit code"
                value={twoFactorCodeForPassword}
                onChange={(e) => setTwoFactorCodeForPassword(e.target.value)}
                className="w-full rounded-lg border bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              />
              {passwordFieldErrors.twoFactorCode?.[0] && (
                <p className="mt-1 text-sm text-red-600">{passwordFieldErrors.twoFactorCode[0]}</p>
              )}
            </div>
          )}
          {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
          {passwordInfo && <p className="text-sm text-green-700">{passwordInfo}</p>}

          <button
            type="submit"
            disabled={isUpdatingPassword}
            className="w-full rounded-lg bg-black py-3 text-white transition hover:bg-gray-800 disabled:opacity-50"
          >
            {isUpdatingPassword ? "Updating password..." : "Change password"}
          </button>
        </form>
      </div>

      <div className="space-y-4 py-4">
        <h1 className="text-2xl font-semibold mb-2">Change email address</h1>
        <form className="space-y-4 max-w-md" onSubmit={updateEmail} noValidate>
          <hr />
          <div>
            <label htmlFor="newEmail" className="block text-sm font-medium mb-1">
              New email
            </label>
            <input
              id="newEmail"
              name="newEmail"
              type="email"
              value={newEmail}
              placeholder="you@example.com"
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full rounded-lg border bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            />
            {emailFieldErrors.newEmail?.[0] && (
              <p className="mt-1 text-sm text-red-600">{emailFieldErrors.newEmail[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="currentPasswordForEmail" className="block text-sm font-medium mb-1">
              Current password
            </label>
            <input
              id="currentPasswordForEmail"
              name="currentPasswordForEmail"
              type="password"
              placeholder="••••••••"
              value={currentPasswordForEmail}
              onChange={(e) => setCurrentPasswordForEmail(e.target.value)}
              className="w-full rounded-lg border bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            />
            {emailFieldErrors.currentPassword?.[0] && (
              <p className="mt-1 text-sm text-red-600">{emailFieldErrors.currentPassword[0]}</p>
            )}
          </div>

          {user?.isTwoFactorEnabled && (
            <div>
              <label htmlFor="twoFactorCodeForEmail" className="block text-sm font-medium mb-1">
                Authentication code
              </label>
              <input
                id="twoFactorCodeForEmail"
                name="twoFactorCodeForEmail"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter your 6-digit code"
                value={twoFactorCodeForEmail}
                onChange={(e) => setTwoFactorCodeForEmail(e.target.value)}
                className="w-full rounded-lg border bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              />
              {emailFieldErrors.twoFactorCode?.[0] && (
                <p className="mt-1 text-sm text-red-600">{emailFieldErrors.twoFactorCode[0]}</p>
              )}
            </div>
          )}

          {emailError && <p className="text-sm text-red-600">{emailError}</p>}
          {emailInfo && <p className="text-sm text-green-700">{emailInfo}</p>}

          <button
            type="submit"
            disabled={isUpdatingEmail}
            className="w-full rounded-lg bg-black py-3 text-white transition hover:bg-gray-800 disabled:opacity-50"
          >
            {isUpdatingEmail ? "Updating email..." : "Change email"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AccountSettingsSection;
