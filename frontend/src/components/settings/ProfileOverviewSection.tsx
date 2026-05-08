import type { User } from "../../types/user";
import { maskEmail } from "../../utils/format";
import { booleanColor } from "../../utils/ui";

type Props = {
  user: User | null;
};

const ProfileOverviewSection = ({ user }: Props) => {
  return (
    <div className="space-y-4 py-2 md:py-4">
      <h1 className="mb-2 text-2xl font-semibold">Account overview</h1>
      <div>
        <hr />
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 py-4 sm:grid-cols-[auto_1fr] sm:gap-y-2">
          <span className="font-medium">Current username:</span>
          <span className="font-semibold break-words">{user?.name}</span>
          <span className="font-medium">Current email:</span>{" "}
          <span className="font-semibold break-words">{user?.email ? maskEmail(user.email) : ""}</span>
          <span className="font-medium">Email status:</span>
          <span className={`font-semibold break-words ${booleanColor(user?.isEmailVerified)}`}>
            {user?.isEmailVerified ? "Verified" : "Not verified"}
          </span>
          <span className="font-medium">Google account:</span>
          <span className={`font-semibold break-words ${booleanColor(user?.isGoogleLinked)}`}>
            {user?.isGoogleLinked ? "Linked" : "Not linked"}
          </span>
          <span className="font-medium">Password:</span>
          <span className={`font-semibold break-words ${booleanColor(user?.hasPassword)}`}>
            {user?.hasPassword ? "Set" : "Not set"}
          </span>
          <span className="font-medium">Two-factor authentication:</span>
          <span className={`font-semibold break-words ${booleanColor(user?.isTwoFactorEnabled)}`}>
            {user?.isTwoFactorEnabled ? "Enabled" : "Disabled"}
          </span>
          <span className="font-medium">Recovery codes left:</span>
          <span className="font-semibold break-words">{user?.recoveryCodesCount ?? 0}</span>
        </div>
      </div>
    </div>
  );
};

export default ProfileOverviewSection;
