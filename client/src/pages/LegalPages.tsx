import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * Highlighted placeholder for details only the app owner can provide.
 * Search the codebase for "<Ph>" to find every one before publishing.
 */
function Ph({ children }: { children: ReactNode }) {
  return <mark className="placeholder-mark">[{children}]</mark>;
}

function DraftNotice() {
  return (
    <div role="note" className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100">
      <strong>Template — not yet final.</strong> Highlighted <mark className="placeholder-mark">[PLACEHOLDERS]</mark> must be
      completed by the app owner, and the text should be reviewed by a qualified lawyer for the jurisdictions you operate in.
      This template is not legal advice.
    </div>
  );
}

export function PrivacyPage() {
  return (
    <article className="prose-page mx-auto max-w-3xl">
      <h1 className="mb-1 text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="text-sm">
        Effective date: <Ph>EFFECTIVE DATE</Ph> · Last updated: <Ph>LAST UPDATED DATE</Ph>
      </p>
      <DraftNotice />

      <p>
        This policy explains how <Ph>LEGAL COMPANY NAME</Ph> (“DewanTech”, “we”, “us”), located at <Ph>REGISTERED BUSINESS ADDRESS</Ph>,
        collects, uses and protects information when you use the DewanTech To-Do web app and mobile apps (the “App”).
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Account information:</strong> your name, email address, and a securely hashed version of your password (we never
          store your password in readable form).
        </li>
        <li>
          <strong>Your tasks:</strong> titles, descriptions, due dates, priorities, categories and completion status that you enter.
        </li>
        <li>
          <strong>Technical data:</strong> our servers and hosting provider may log IP addresses, request times and error
          information for security and reliability. Logs are kept for <Ph>LOG RETENTION PERIOD, e.g. 30 days</Ph>.
        </li>
      </ul>
      <p>We do not use advertising trackers, sell your personal information, or share it for cross-context behavioural advertising.</p>

      <h2>Voice input and microphone</h2>
      <p>
        The microphone is used only when you tap the microphone button, to convert your speech into task text. DewanTech does not
        record, receive or store audio — only the text you choose to save. Speech recognition is performed by your browser or
        device's speech service: for example, Google Chrome may send audio to Google, and Apple devices may send audio to Apple, to
        perform recognition under their own privacy policies. You can deny or revoke microphone permission at any time in your
        browser or device settings and type tasks instead.
      </p>

      <h2>Data stored on your device</h2>
      <p>
        To work offline, the App stores a copy of your tasks and a sign-in token on your device (browser storage / IndexedDB). This
        copy is removed when you log out or delete your account.
      </p>

      <h2>How we use information</h2>
      <ul>
        <li>To provide the App: authenticate you, store and sync your tasks across your devices.</li>
        <li>To keep the service secure, prevent abuse and fix problems.</li>
        <li>To contact you about your account or important changes to this policy.</li>
      </ul>
      <p>
        Legal bases (where applicable, e.g. GDPR): performance of our contract with you, and our legitimate interests in security.{' '}
        <Ph>CONFIRM LEGAL BASES WITH COUNSEL</Ph>
      </p>

      <h2>Service providers</h2>
      <p>
        We use the following providers to run the App, who process data on our behalf: hosting — <Ph>HOSTING PROVIDER</Ph>; database —{' '}
        <Ph>DATABASE PROVIDER, e.g. MongoDB Atlas</Ph>, region <Ph>DATA STORAGE REGION</Ph>. <Ph>LIST ANY OTHER PROVIDERS</Ph>
      </p>

      <h2>Retention and deletion</h2>
      <p>
        We keep your data while your account is active. You can permanently delete your account and all tasks at any time from{' '}
        <Link to="/account" className="underline">
          Account → Delete account
        </Link>
        . Deleted data is removed from our active database immediately and from backups within <Ph>BACKUP RETENTION PERIOD</Ph>.
      </p>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit (HTTPS). Passwords are hashed with bcrypt. Access to each user's tasks is restricted to that
        user. No method of transmission or storage is completely secure, but we work to protect your information.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on where you live, you may have rights to access, correct, export or delete your data, and to object to or
        restrict processing. To exercise these rights, contact us at <Ph>PRIVACY CONTACT EMAIL</Ph>. <Ph>ADD REGION-SPECIFIC
        DISCLOSURES (GDPR/UK GDPR, CCPA/CPRA, etc.) IF APPLICABLE</Ph>
      </p>

      <h2>Children</h2>
      <p>
        The App is not directed to children under <Ph>MINIMUM AGE, e.g. 13 or 16</Ph>, and we do not knowingly collect their personal
        information.
      </p>

      <h2>Changes</h2>
      <p>We will update this page and the “Last updated” date when this policy changes, and notify you of material changes.</p>

      <h2>Contact</h2>
      <p>
        <Ph>LEGAL COMPANY NAME</Ph>, <Ph>REGISTERED BUSINESS ADDRESS</Ph> · Email: <Ph>PRIVACY CONTACT EMAIL</Ph>
      </p>
    </article>
  );
}

export function TermsPage() {
  return (
    <article className="prose-page mx-auto max-w-3xl">
      <h1 className="mb-1 text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="text-sm">
        Effective date: <Ph>EFFECTIVE DATE</Ph>
      </p>
      <DraftNotice />

      <p>
        These Terms govern your use of DewanTech To-Do (the “App”), provided by <Ph>LEGAL COMPANY NAME</Ph> (“DewanTech”). By creating
        an account or using the App you agree to these Terms and our{' '}
        <Link to="/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>

      <h2>Your account</h2>
      <p>
        You must provide accurate information and keep your password secure. You are responsible for activity under your account.
        You must be at least <Ph>MINIMUM AGE</Ph> years old to use the App.
      </p>

      <h2>Your content</h2>
      <p>
        You own the tasks and other content you create. You grant DewanTech a limited licence to store, process and transmit that
        content solely to provide the App to you.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Do not attempt to access other users' data or interfere with the App's security or operation.</li>
        <li>Do not use the App for unlawful purposes or to store unlawful content.</li>
        <li>Do not reverse engineer or overload the service except as permitted by law.</li>
      </ul>

      <h2>Pricing</h2>
      <p>
        <Ph>STATE WHETHER THE APP IS FREE, OR DESCRIBE PAID PLANS AND BILLING TERMS. Note: in-app digital purchases on iOS/Android
        generally must use Apple/Google billing.</Ph>
      </p>

      <h2>Availability and changes</h2>
      <p>
        We aim to keep the App available but do not guarantee uninterrupted service. We may modify or discontinue features, and
        will give reasonable notice of material changes where practical.
      </p>

      <h2>Termination</h2>
      <p>
        You may stop using the App and delete your account at any time. We may suspend or terminate accounts that violate these
        Terms.
      </p>

      <h2>Disclaimers and limitation of liability</h2>
      <p>
        The App is provided “as is” without warranties of any kind, to the extent permitted by law. To the extent permitted by law,
        DewanTech is not liable for indirect or consequential losses, or for lost data.{' '}
        <Ph>HAVE COUNSEL REVIEW LIABILITY LANGUAGE FOR YOUR JURISDICTION</Ph>
      </p>

      <h2>Governing law</h2>
      <p>
        These Terms are governed by the laws of <Ph>GOVERNING JURISDICTION</Ph>. Disputes will be resolved in{' '}
        <Ph>VENUE / DISPUTE RESOLUTION METHOD</Ph>.
      </p>

      <h2>App store terms</h2>
      <p>
        If you downloaded the App from the Apple App Store or Google Play, you also agree to that store's terms. Apple and Google are
        not parties to these Terms and are not responsible for the App or its support. <Ph>CONFIRM INCLUSION OF APPLE'S MINIMUM
        EULA TERMS OR USE APPLE'S STANDARD EULA</Ph>
      </p>

      <h2>Contact</h2>
      <p>
        <Ph>LEGAL COMPANY NAME</Ph>, <Ph>REGISTERED BUSINESS ADDRESS</Ph> · Email: <Ph>SUPPORT CONTACT EMAIL</Ph>
      </p>
    </article>
  );
}

export function NotFoundPage() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary mt-6">
        Go to my tasks
      </Link>
    </div>
  );
}
