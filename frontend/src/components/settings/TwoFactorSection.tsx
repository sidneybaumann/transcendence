import { useState } from "react";
import type { User } from "../../types/user";
import {
  enableTwoFactorRequest,
  verifyTwoFactorRequest,
  disableTwoFactorRequest,
  cancelTwoFactorSetupRequest,
} from "../../services/twoFactorService";
import { otpCodeSchema } from "../../schemas/otpCodeSchema";
import { mapZodErrors } from "../../utils/zodErrors";
import { otpOrRecoveryCodeSchema } from "../../schemas/otpOrRecoveryCodeSchema";

type Props = {
  user: User | null;
  refreshUser: () => Promise<void>;
};

const TwoFactorSection = ({ user, refreshUser }: Props) => {
  // 2FA
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState<string | null>(null);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [twoFactorInfo, setTwoFactorInfo] = useState<string | null>(null);
  const [isTwoFactorSubmitting, setIsTwoFactorSubmitting] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isDisablingTwoFactor, setIsDisablingTwoFactor] = useState(false);
  const [disableTwoFactorCode, setDisableTwoFactorCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  // ENABLE 2FA
  const enableTwoFactor = async () => {
    setTwoFactorError(null);
    setTwoFactorInfo(null);
    setRecoveryCodes(null);

    try {
      setIsTwoFactorSubmitting(true);

      const { res, data } = await enableTwoFactorRequest();

      if (!res.ok) {
        setTwoFactorError(data?.message ?? "2FA setup failed.");
        return;
      }

      setQrCodeDataUrl(data?.qrCodeDataUrl ?? null);
      setManualKey(data?.manualKey ?? null);
      setTwoFactorInfo(data?.message ?? "Scan the QR code or enter the key manually.");
    } catch {
      setTwoFactorError("Failed to start 2FA setup.");
    } finally {
      setIsTwoFactorSubmitting(false);
    }
  };

  // VERIFY 2FA
  const verifyTwoFactor = async () => {
    setTwoFactorError(null);
    setTwoFactorInfo(null);

    const parsed = otpCodeSchema.safeParse({ code: otpCode.trim() });

    if (!parsed.success) {
      setTwoFactorError(mapZodErrors(parsed.error).code?.[0] ?? "Invalid code.");
      return;
    }

    try {
      setIsTwoFactorSubmitting(true);

      const { res, data } = await verifyTwoFactorRequest(parsed.data.code);

      if (!res.ok) {
        setTwoFactorError(data?.message ?? "Invalid code.");
        return;
      }

      await refreshUser();
      setTwoFactorInfo("Two-factor authentication enabled successfully.");
      setTimeout(() => {
        setTwoFactorInfo(null);
      }, 3000);
      setOtpCode("");
      setRecoveryCodes(data?.recoveryCodes ?? null);
      setQrCodeDataUrl(null);
      setManualKey(null);
    } catch {
      setTwoFactorError("Failed to verify code.");
    } finally {
      setIsTwoFactorSubmitting(false);
    }
  };

  const startDisableTwoFactor = () => {
    setTwoFactorError(null);
    setTwoFactorInfo(null);
    setDisableTwoFactorCode("");
    setIsDisablingTwoFactor(true);
  };

  // DISABLE 2FA
  const disableTwoFactor = async () => {
    setTwoFactorError(null);
    setTwoFactorInfo(null);

    const parsed = otpOrRecoveryCodeSchema.safeParse({ code: disableTwoFactorCode.trim() });

    if (!parsed.success) {
      setTwoFactorError(mapZodErrors(parsed.error).code?.[0] ?? "Invalid code.");
      return;
    }

    try {
      setIsTwoFactorSubmitting(true);

      const { res, data } = await disableTwoFactorRequest(parsed.data.code);

      if (!res.ok) {
        setTwoFactorError(data?.message ?? "Could not disable two-factor authentication.");
        return;
      }

      await refreshUser();
      setDisableTwoFactorCode("");
      setIsDisablingTwoFactor(false);
      setQrCodeDataUrl(null);
      setManualKey(null);
      setOtpCode("");
      setTwoFactorInfo("Two-factor authentication disabled successfully.");
      setRecoveryCodes(null);
    } catch {
      setTwoFactorError("Network error. Please try again.");
    } finally {
      setIsTwoFactorSubmitting(false);
    }
  };

  // CANCEL 2FA
  const cancelTwoFactorSetup = async () => {
    setTwoFactorError(null);
    setTwoFactorInfo(null);

    try {
      setIsTwoFactorSubmitting(true);

      const { res, data } = await cancelTwoFactorSetupRequest();

      if (!res.ok) {
        setTwoFactorError(data?.message ?? "Could not cancel 2FA setup.");
        return;
      }

      setQrCodeDataUrl(null);
      setManualKey(null);
      setOtpCode("");
      setTwoFactorInfo("Two-factor setup canceled.");
      await refreshUser();
    } catch {
      setTwoFactorError("Network error. Please try again.");
    } finally {
      setIsTwoFactorSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 py-2 md:py-4">
      <div className="max-w-md">
        <h1 className="mb-2 text-2xl font-semibold">Two-factor Authentication (2FA)</h1>
        <hr />

        {!user?.isTwoFactorEnabled ? (
          <div className="space-y-4 pt-4">
            <p>
              Add an additional layer of security to your account with Two Factor Authentication
              (2FA). When signing in, you will be asked for a second authentication code generated
              by your authenticator app.
            </p>

            {twoFactorError && <p className="text-sm text-red-600">{twoFactorError}</p>}
            {twoFactorInfo && <p className="text-sm text-green-700">{twoFactorInfo}</p>}

            {!qrCodeDataUrl ? (
              <button
                type="button"
                disabled={isTwoFactorSubmitting}
                onClick={enableTwoFactor}
                className="w-full rounded-lg bg-black py-3 text-white transition hover:bg-gray-800 disabled:opacity-50"
              >
                {isTwoFactorSubmitting ? "Enabling 2FA..." : "Enable 2FA"}
              </button>
            ) : (
              <>
                <img
                  src={qrCodeDataUrl}
                  alt="2FA QR code"
                  className="h-auto w-full max-w-48 rounded-lg border bg-white p-2"
                />

                {manualKey && <p className="break-words text-sm">Manual key: {manualKey}</p>}

                <h2 className="text-xl font-semibold pt-4">Verify your account</h2>

                <label htmlFor="otpCode" className="block text-sm font-medium mb-1">
                  Authentication code
                </label>
                <input
                  id="otpCode"
                  name="otpCode"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Enter your OTP code"
                  className="w-full rounded-lg border bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                />

                <button
                  type="button"
                  disabled={isTwoFactorSubmitting}
                  onClick={verifyTwoFactor}
                  className="w-full rounded-lg bg-black py-3 text-white transition hover:bg-gray-800 disabled:opacity-50"
                >
                  {isTwoFactorSubmitting ? "Verifying code..." : "Verify code"}
                </button>

                <button
                  type="button"
                  disabled={isTwoFactorSubmitting}
                  onClick={cancelTwoFactorSetup}
                  className="w-full rounded-lg border border-gray-300 py-3 transition hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancel setup
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="max-w-md space-y-4 pt-4">
            <p className="font-medium text-green-700">● Two-factor authentication is enabled</p>

            {recoveryCodes && (
              <div className="mt-4 rounded-lg border bg-yellow-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="mb-2 text-lg font-semibold">Recovery codes</h2>
                    <p className="mb-3 text-sm">
                      Save these recovery codes somewhere safe. Each code can be used only once.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setRecoveryCodes(null)}
                    className="self-start text-sm underline"
                  >
                    I saved them
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {recoveryCodes.map((code) => (
                    <div
                      key={code}
                      className="break-all rounded border bg-white px-3 py-2 font-mono text-sm"
                    >
                      {code}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {twoFactorInfo && <p className="text-sm text-green-700">{twoFactorInfo}</p>}
            {twoFactorError && <p className="text-sm text-red-600">{twoFactorError}</p>}

            {!isDisablingTwoFactor ? (
              <button
                type="button"
                disabled={isTwoFactorSubmitting}
                onClick={startDisableTwoFactor}
                className="w-full rounded-lg bg-red-600 py-3 text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                Disable 2FA
              </button>
            ) : (
              <>
                <label htmlFor="disableTwoFactorCode" className="block text-sm font-medium mb-1">
                  Authentication Code
                </label>
                <input
                  id="disableTwoFactorCode"
                  name="disableTwoFactorCode"
                  type="text"
                  inputMode="numeric"
                  maxLength={9}
                  value={disableTwoFactorCode}
                  onChange={(e) => setDisableTwoFactorCode(e.target.value)}
                  placeholder="Enter your OTP code"
                  className="w-full rounded-lg border bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                />

                <button
                  type="button"
                  disabled={isTwoFactorSubmitting}
                  onClick={disableTwoFactor}
                  className="w-full rounded-lg bg-red-600 py-3 text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {isTwoFactorSubmitting ? "Disabling 2FA..." : "Confirm disable 2FA"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsDisablingTwoFactor(false);
                    setDisableTwoFactorCode("");
                    setTwoFactorError(null);
                  }}
                  className="w-full rounded-lg border border-gray-300 py-3 transition hover:bg-gray-100"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TwoFactorSection;
