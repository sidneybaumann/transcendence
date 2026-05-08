import { useMemo, useState } from "react";
import type { ReactNode } from "react";

type SectionId = "who" | "data" | "purposes" | "thirdParty" | "cookies" | "retention" | "security" | "rights" | "contact";

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

const Privacy = () => {
  const sections: Section[] = useMemo(
    () => [
      {
        id: "who",
        title: "Who we are",
        content: (
          <p>
            Snake42 is a student project developed as part of the 42 school curriculum. We
            operate and host the application to allow users to create accounts and play the Snake game.
          </p>
        ),
      },
      {
        id: "data",
        title: "What data we collect",
        content: (
          <div className="space-y-4">
            <p>We collect only the data necessary to operate the service:</p>

            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-medium">Account data:</span> email address, username,
                and password (securely hashed)
              </li>
              <li>
                <span className="font-medium">Authentication data:</span>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Session identifiers (cookies or tokens)</li>
                  <li>
                    Two-factor authentication data (TOTP secrets and recovery codes, stored
                    securely)
                  </li>
                </ul>
              </li>
              <li>
                <span className="font-medium">OAuth data</span> (if you use Google login):
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Basic profile information (e.g. email, name, provider ID)</li>
                </ul>
              </li>
              <li>
                <span className="font-medium">Technical data:</span>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Timestamps, browser/device info</li>
                  <li>
                    Data (such as logs) used to ensure security, monitor performance, and
                    debug issues
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: "purposes",
        title: "Why we collect it (Legal basis)",
        content: (
          <div className="space-y-4">
            <p>
              <a
                href="https://gdpr-info.eu/art-6-gdpr"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline underline-offset-2"
              >
                https://gdpr-info.eu/art-6-gdpr
              </a>
            </p>

            <p>We process your data for the following purposes:</p>

            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-medium">
                  Contractual necessity (Art. 6(1)(b) GDPR):
                </span>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>To create and manage your account</li>
                  <li>To provide gameplay features</li>
                </ul>
              </li>
              <li>
                <span className="font-medium">
                  Legitimate interest (Art. 6(1)(f) GDPR):
                </span>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>To secure the application and prevent abuse</li>
                  <li>To monitor system performance and debug issues</li>
                </ul>
              </li>
              <li>
                <span className="font-medium">Consent (Art. 6(1)(a) GDPR):</span>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>When using third-party authentication (e.g. Google OAuth)</li>
                </ul>
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: "thirdParty",
        title: "Third-party services",
        content: (
          <div className="space-y-4">
            <p>We use trusted third-party providers to operate the service:</p>

            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-medium">Google OAuth</span> – authentication provider
              </li>
              <li>
                <span className="font-medium">Resend</span> – sending transactional emails
                (e.g. verification, password reset)
              </li>
              <li>
                <span className="font-medium">
                  Monitoring tools (ELK stack, Prometheus, Grafana)
                </span>{" "}
                – system logs, metrics, and observability
              </li>
            </ul>

            <p>
              These providers may process limited personal data strictly for the purposes
              described above.
            </p>
          </div>
        ),
      },
      {
        id: "cookies",
        title: "Sessions, cookies and local storage",
        content: (
          <div className="space-y-4">
            <p>We use secure cookies or tokens to:</p>

            <ul className="list-disc space-y-2 pl-5">
              <li>Maintain your authenticated session</li>
              <li>Maintain secure sessions and prevent unauthorized access</li>
            </ul>

            <p>We do not use cookies for advertising or cross-site tracking.</p>
          </div>
        ),
      },
      {
        id: "retention",
        title: "How long we keep data",
        content: (
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-medium">Account data:</span> stored until account
              deletion
            </li>
            <li>
              <span className="font-medium">Authentication data:</span> kept as long as
              needed for security
            </li>
            <li>
              <span className="font-medium">Logs & monitoring data:</span> retained for a
              limited period (7 days)
            </li>
          </ul>
        ),
      },
      {
        id: "security",
        title: "Security",
        content: (
          <div className="space-y-4">
            <p>
              We implement appropriate technical and organizational measures, including:
            </p>

            <ul className="list-disc space-y-2 pl-5">
              <li>Password hashing</li>
              <li>Secure session handling</li>
              <li>Two-factor authentication (optional)</li>
              <li>Access controls and monitoring</li>
            </ul>
          </div>
        ),
      },
      {
        id: "rights",
        title: "Your rights",
        content: (
          <div className="space-y-4">
            <p>Under GDPR, you have the right to:</p>

            <ul className="list-disc space-y-2 pl-5">
              <li>Access your data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion (“right to be forgotten”)</li>
              <li>Restrict or object to processing</li>
              <li>Request data portability</li>
            </ul>

            <p>
              You can exercise these rights via the application or by contacting us.
            </p>
          </div>
        ),
      },
      {
        id: "contact",
        title: "Contact",
        content: (
          <p>
            For any questions regarding this Privacy Policy or your data, please contact:{" "}
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
    who: false,
    data: false,
    purposes: false,
    thirdParty: false,
    cookies: false,
    retention: false,
    security: false,
    rights: false,
    contact: false,
  });

  const toggle = (id: SectionId) => {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-6 py-6">
          <h1 className="text-2xl font-semibold">Privacy Policy</h1>
          <p className="mt-2 text-sm text-gray-600">
            Game: <span className="font-medium">Snake42</span> · Updated on:{" "}
            <span className="font-medium">01/03/2026</span>
          </p>
          <p className="mt-4 text-gray-700">
            This Privacy Policy explains what data we collect, why we collect it, and your
            rights under applicable data protection laws (including GDPR).
          </p>
        </div>

        <div className="px-6 py-6">
          <div className="space-y-3">
            {sections.map((s) => (
              <section
                key={s.id}
                className="overflow-hidden rounded-xl border bg-white"
                aria-labelledby={`privacy-${s.id}`}
              >
                <button
                  type="button"
                  onClick={() => toggle(s.id)}
                  className="flex w-full items-center justify-between px-4 py-4 text-left transition hover:bg-gray-50"
                >
                  <h2 id={`privacy-${s.id}`} className="text-base font-semibold">
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

export default Privacy;
