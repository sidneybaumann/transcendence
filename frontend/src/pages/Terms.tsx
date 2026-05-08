import { useMemo, useState } from "react";
import type { ReactNode } from "react";

type SectionId =
  | "service"
  | "account"
  | "auth"
  | "acceptableUse"
  | "moderation"
  | "availability"
  | "dataLoss"
  | "liability"
  | "intellectualProperty"
  | "changes"
  | "contact";

type Section = {
  id: SectionId;
  title: string;
  content: ReactNode;
};

const Chevron = ({ open }: { open: boolean }) => (
  <span
    className={`inline-block transition-transform duration-800 ${open ? "rotate-450" : ""}`}
    aria-hidden="true"
  >
    ▶
  </span>
);

const Terms = () => {
  const sections: Section[] = useMemo(
    () => [
      {
        id: "service",
        title: "The service",
        content: (
          <p>
            Snake42 is a multiplayer game developed as part of the 42 school curriculum. It allows
            users to create accounts and play matches.
          </p>
        ),
      },
      {
        id: "account",
        title: "Your account",
        content: (
          <div className="space-y-4">
            <p>You are responsible for maintaining the security of your account:</p>

            <ul className="list-disc space-y-2 pl-5">
              <li>Keep your password confidential</li>
              <li>Do not share your login credentials</li>
              <li>You are responsible for all activity under your account</li>
            </ul>

            <p>
              If you suspect unauthorized access, you must take appropriate action (e.g., change
              your password).
            </p>
          </div>
        ),
      },
      {
        id: "auth",
        title: "Authentication methods",
        content: (
          <div className="space-y-4">
            <p>You may sign in using:</p>

            <ul className="list-disc space-y-2 pl-5">
              <li>Email and password</li>
              <li>Third-party providers (e.g. Google OAuth)</li>
            </ul>

            <p>
              When using third-party authentication, you also agree to the terms of the respective
              provider.
            </p>
          </div>
        ),
      },
      {
        id: "acceptableUse",
        title: "Acceptable use",
        content: (
          <div className="space-y-4">
            <p>You agree not to:</p>

            <ul className="list-disc space-y-2 pl-5">
              <li>Cheat or exploit bugs</li>
              <li>Attempt to disrupt or attack the service</li>
              <li>Use automated tools or scripts unfairly</li>
              <li>Harass, spam, or abuse other users</li>
            </ul>
          </div>
        ),
      },
      {
        id: "moderation",
        title: "Moderation and enforcement",
        content: (
          <p>
            We reserve the right to restrict or suspend accounts in case of abuse, misuse, or
            violation of these Terms.
          </p>
        ),
      },
      {
        id: "availability",
        title: "Availability",
        content: (
          <p>
            The service is provided as part of a student project. We do not guarantee continuous
            availability and may interrupt the service for maintenance, updates, or unforeseen
            issues.
          </p>
        ),
      },
      {
        id: "dataLoss",
        title: "Data and loss",
        content: (
          <p>
            We do not guarantee the preservation of statistics, or account information. Data may be
            lost due to bugs, resets, or technical issues.
          </p>
        ),
      },
      {
        id: "liability",
        title: "Liability",
        content: (
          <div className="space-y-4">
            <p>The service is provided “as is” without warranties of any kind.</p>

            <p>To the extent permitted by law, we are not liable for:</p>

            <ul className="list-disc space-y-2 pl-5">
              <li>Service interruptions</li>
              <li>Data loss</li>
              <li>Indirect or consequential damages</li>
            </ul>
          </div>
        ),
      },
      {
        id: "intellectualProperty",
        title: "Intellectual Property and Credits",
        content: (
          <div className="space-y-4">
            <p>This project uses assets from third parties:</p>

            <ul className="list-disc space-y-2 pl-5">
              <li>
                Snake emoji favicon based on Twemoji (© 2020 Twitter, Inc and contributors),
                licensed under{" "}
                <a
                  href="https://creativecommons.org/licenses/by/4.0/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline underline-offset-2"
                >
                  CC BY 4.0
                </a>
              </li>
              <li>Logo and Home illustration generated using AI (DALL·E and DeepAi)</li>
            </ul>
          </div>
        ),
      },
      {
        id: "changes",
        title: "Changes to the Terms",
        content: (
          <p>
            We may update these Terms as the project evolves. Continued use of the service means you
            accept the updated Terms.
          </p>
        ),
      },
      {
        id: "contact",
        title: "Contact",
        content: (
          <p>
            For questions regarding these Terms, please contact:{" "}
            <a
              href="mailto:snake42@app.com"
              className="font-medium text-blue-600 underline underline-offset-2"
            >
              snake42@app.com
            </a>
          </p>
        ),
      },
    ],
    [],
  );

  const [open, setOpen] = useState<Record<SectionId, boolean>>({
    service: false,
    account: false,
    auth: false,
    acceptableUse: false,
    moderation: false,
    availability: false,
    dataLoss: false,
    liability: false,
    intellectualProperty: false,
    changes: false,
    contact: false,
  });

  const toggle = (id: SectionId) => {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-6 py-6">
          <h1 className="text-2xl font-semibold">Terms of Use</h1>
          <p className="mt-2 text-sm text-gray-600">
            Game: <span className="font-medium">Snake42</span> · Updated on:{" "}
            <span className="font-medium">08/04/2026</span>
          </p>
          <p className="mt-4 text-gray-700">
            By creating an account or using Snake42, you agree to these Terms of Use. If you do not
            agree, please do not use the service.
          </p>
        </div>

        <div className="px-6 py-6">
          <div className="space-y-3">
            {sections.map((s) => (
              <section
                key={s.id}
                className="overflow-hidden rounded-xl border bg-white"
                aria-labelledby={`terms-${s.id}`}
              >
                <button
                  type="button"
                  onClick={() => toggle(s.id)}
                  className="flex w-full items-center justify-between px-4 py-4 text-left transition hover:bg-gray-50"
                >
                  <h2 id={`terms-${s.id}`} className="text-base font-semibold">
                    {s.title}
                  </h2>
                  <Chevron open={open[s.id]} />
                </button>

                {open[s.id] && (
                  <div className="border-t px-4 py-4 text-sm leading-7 text-gray-700">
                    {s.content}
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
