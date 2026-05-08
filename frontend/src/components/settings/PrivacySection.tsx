import { useState } from "react";
import type { User } from "../../types/user";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { exportUserDataRequest, deleteAccountRequest } from "../../services/userService";
import { exportDataSchema } from "../../schemas/exportDataSchema";
import { deleteAccountSchema } from "../../schemas/deleteAccountSchema";
import { mapZodErrors } from "../../utils/zodErrors";

type Props = {
  user: User | null;
};

const PrivacySection = ({ user }: Props) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [currentPasswordForExport, setCurrentPasswordForExport] = useState("");
  const [twoFactorCodeForExport, setTwoFactorCodeForExport] = useState("");
  const [isExportSubmitting, setIsExportSubmitting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportInfo, setExportInfo] = useState<string | null>(null);
  const [currentPasswordForDelete, setCurrentPasswordForDelete] = useState("");
  const [twoFactorCodeForDelete, setTwoFactorCodeForDelete] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteInfo, setDeleteInfo] = useState<string | null>(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);

  const hasPassword = Boolean(user?.hasPassword);

  // EXPORT DATA
  const handleExportData = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setExportError(null);
    setExportInfo(null);

    const parsed = exportDataSchema.safeParse({
      currentPassword: currentPasswordForExport,
      twoFactorCode: twoFactorCodeForExport.trim() || undefined,
    });

    if (!parsed.success) {
      const fieldErrors = mapZodErrors(parsed.error);

      if (fieldErrors.currentPassword?.[0] && hasPassword) {
        setExportError(fieldErrors.currentPassword[0]);
        return;
      }

      if (fieldErrors.twoFactorCode?.[0]) {
        setExportError(fieldErrors.twoFactorCode[0]);
        return;
      }

      setExportError("Invalid input.");
      return;
    }

    if (user?.isTwoFactorEnabled && !parsed.data.twoFactorCode) {
      setExportError("Two-factor authentication code is required.");
      return;
    }

    try {
      setIsExportSubmitting(true);

      const result = await exportUserDataRequest({
        currentPassword: hasPassword ? parsed.data.currentPassword : undefined,
        twoFactorCode: user?.isTwoFactorEnabled ? parsed.data.twoFactorCode : undefined,
      });

      if (!result.success) {
        setExportError(result.message);
        return;
      }

      setCurrentPasswordForExport("");
      setTwoFactorCodeForExport("");
      setExportInfo("Your data export has been downloaded.");
    } catch {
      setExportError("Failed to export data.");
    } finally {
      setIsExportSubmitting(false);
    }
  };

  // DELETE ACCOUNT
  const handleDeleteAccount = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDeleteError(null);
    setDeleteInfo(null);

    const parsed = deleteAccountSchema.safeParse({
      currentPassword: hasPassword ? currentPasswordForDelete : undefined,
      twoFactorCode: twoFactorCodeForDelete.trim() || undefined,
      confirmation: deleteConfirmation,
    });

    if (!parsed.success) {
      const fieldErrors = mapZodErrors(parsed.error);

      if (fieldErrors.currentPassword?.[0] && hasPassword) {
        setDeleteError(fieldErrors.currentPassword[0]);
        return;
      }

      if (fieldErrors.twoFactorCode?.[0]) {
        setDeleteError(fieldErrors.twoFactorCode[0]);
        return;
      }

      if (fieldErrors.confirmation?.[0]) {
        setDeleteError(fieldErrors.confirmation[0]);
        return;
      }

      setDeleteError("Invalid input.");
      return;
    }

    if (user?.isTwoFactorEnabled && !parsed.data.twoFactorCode) {
      setDeleteError("Two-factor authentication code is required.");
      return;
    }

    try {
      setIsDeleteSubmitting(true);

      const payload: {
        currentPassword?: string;
        confirmation: string;
        twoFactorCode?: string;
      } = {
        confirmation: parsed.data.confirmation,
      };

      if (hasPassword) {
        payload.currentPassword = parsed.data.currentPassword;
      }

      if (user?.isTwoFactorEnabled) {
        payload.twoFactorCode = parsed.data.twoFactorCode;
      }

      const { res, data } = await deleteAccountRequest(payload);

      if (!res.ok) {
        setDeleteError(data?.message ?? "Failed to delete account.");
        return;
      }

      setDeleteInfo(data?.message ?? "Account deleted successfully.");

      setCurrentPasswordForDelete("");
      setTwoFactorCodeForDelete("");
      setDeleteConfirmation("");

      await logout();
      sessionStorage.setItem("authMessage", "Your account has been deleted.");
      navigate("/login", { replace: true });
    } catch {
      setDeleteError("Failed to delete account.");
    } finally {
      setIsDeleteSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 py-4">
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold mb-2">Delete account</h1>
        <hr />
        <form className="space-y-4 max-w-md" onSubmit={handleDeleteAccount}>
          <div className="space-y-4 pt-4">
            <p>
              This will permanently anonymise your account and remove your personal data. This
              action cannot be undone.
            </p>
          </div>

          {hasPassword && (
            <div>
              <label htmlFor="deleteCurrentPassword" className="block text-sm font-medium mb-1">
                Current password
              </label>
              <input
                id="deleteCurrentPassword"
                name="deleteCurrentPassword"
                type="password"
                value={currentPasswordForDelete}
                onChange={(e) => setCurrentPasswordForDelete(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
              />
            </div>
          )}

          {user?.isTwoFactorEnabled && (
            <div>
              <label htmlFor="deleteTwoFactorCode" className="block text-sm font-medium mb-1">
                Authentication code
              </label>
              <input
                id="deleteTwoFactorCode"
                name="deleteTwoFactorCode"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={twoFactorCodeForDelete}
                onChange={(e) => setTwoFactorCodeForDelete(e.target.value)}
                placeholder="Enter your 6-digit code"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
              />
            </div>
          )}

          <div>
            <label htmlFor="deleteConfirmation" className="block text-sm font-medium mb-1">
              Type <span className="text-red-600 font-semibold">DELETE</span> to confirm
            </label>
            <input
              id="deleteConfirmation"
              name="deleteConfirmation"
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="DELETE"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
            />
          </div>

          {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
          {deleteInfo && <p className="text-sm text-green-700">{deleteInfo}</p>}

          <button
            type="submit"
            disabled={isDeleteSubmitting}
            className="bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
          >
            {isDeleteSubmitting ? "Deleting account..." : "Delete account"}
          </button>
        </form>
      </div>
      <div className="max-w-md py-4">
        <h1 className="text-2xl font-semibold mb-2">Export your data</h1>
        <hr />
        <form className="space-y-4 max-w-md" onSubmit={handleExportData}>
          <div className="space-y-4 pt-4">
            <p>Download a copy of your personal data in JSON format.</p>
          </div>
          {hasPassword && (
            <div>
              <label htmlFor="currentPasswordForExport" className="block text-sm font-medium mb-1">
                Current password
              </label>
              <input
                id="currentPasswordForExport"
                name="currentPasswordForExport"
                type="password"
                placeholder="Enter password to download data"
                value={currentPasswordForExport}
                onChange={(e) => setCurrentPasswordForExport(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
              />
            </div>
          )}

          {user?.isTwoFactorEnabled && (
            <div>
              <label htmlFor="twoFactorCodeForExport" className="block text-sm font-medium mb-1">
                Authentication code
              </label>
              <input
                id="twoFactorCodeForExport"
                name="twoFactorCodeForExport"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter your 6-digit code"
                value={twoFactorCodeForExport}
                onChange={(e) => setTwoFactorCodeForExport(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
              />
            </div>
          )}

          {exportError && <p className="text-sm text-red-600">{exportError}</p>}
          {exportInfo && <p className="text-sm text-green-700">{exportInfo}</p>}

          <button
            type="submit"
            disabled={isExportSubmitting}
            className="bg-black text-white px-5 py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
          >
            {isExportSubmitting ? "Preparing export..." : "Download my data"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PrivacySection;
