import { useState } from "react";
import { useAuth } from "../context/AuthContext";

import ProfileOverviewSection from "../components/settings/ProfileOverviewSection";
import AccountSettingsSection from "../components/settings/AccountSettingsSection";
import TwoFactorSection from "../components/settings/TwoFactorSection";
import PrivacySection from "../components/settings/PrivacySection";

type SettingsSection = "profile" | "account" | "authentication" | "privacy";

const Settings = () => {

  // UI / NAVIGATION
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");

  const { user, refreshUser } = useAuth();

  const handleSectionChange = (section: SettingsSection) => {
    setActiveSection(section);
  };

  const sectionButtonClass = (section: SettingsSection) =>
    `w-full text-left px-4 py-3 rounded-lg transition-colors ${
      activeSection === section ? "bg-black text-white" : "bg-gray-100 hover:bg-gray-200"
    }`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <aside className="col-span-12 border-b border-gray-300 pb-4 md:col-span-4 md:border-b-0 md:border-r md:pb-0 md:pr-6 lg:col-span-3">
          <h1 className="mb-4 text-2xl font-semibold md:mb-6">Settings</h1>

          <nav className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:flex md:flex-col">
            <button
              onClick={() => handleSectionChange("profile")}
              className={sectionButtonClass("profile")}
            >
              Profile
            </button>

            <button
              onClick={() => handleSectionChange("account")}
              className={sectionButtonClass("account")}
            >
              Account settings
            </button>

            <button
              onClick={() => handleSectionChange("authentication")}
              className={sectionButtonClass("authentication")}
            >
              2FA Authentication
            </button>

            <button
              onClick={() => handleSectionChange("privacy")}
              className={sectionButtonClass("privacy")}
            >
              Privacy
            </button>
          </nav>
        </aside>

        <section className="col-span-12 px-0 py-2 md:col-span-8 md:px-2 md:py-0 lg:col-span-9 lg:px-4">

          {activeSection === "profile" && <ProfileOverviewSection user={user} />}

          {activeSection === "account" && (
            <AccountSettingsSection user={user} refreshUser={refreshUser} />
          )}

          {activeSection === "authentication" && (
            <TwoFactorSection user={user} refreshUser={refreshUser} />
          )}

          {activeSection === "privacy" && <PrivacySection user={user} />}

        </section>
      </div>
    </div>
  );
};

export default Settings;
