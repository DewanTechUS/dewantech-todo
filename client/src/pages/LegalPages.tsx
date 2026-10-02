import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { COMPANY_LEGAL_NAME, LEGAL, LEGAL_IS_DRAFT, type LegalField } from '../lib/brand';

/**
 * Highlighted placeholder. Business details come from LEGAL in lib/brand.ts — fill them in there.
 */
function Ph({ children }: { children: ReactNode }) {
  return <mark className="placeholder-mark">[{children}]</mark>;
}

/** A business detail from LEGAL in lib/brand.ts, or a highlighted placeholder while it is empty. */
function V({ k, label }: { k: LegalField; label: string }) {
  const value = String(LEGAL[k] ?? '').trim();
  return value ? <>{value}</> : <Ph>{label}</Ph>;
}

function DraftNotice() {
  if (!LEGAL_IS_DRAFT) return null;
  return (
    <div role="note" className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100">
      <strong>Draft.</strong> Some details on this page (<mark className="placeholder-mark">[highlighted]</mark>) are still being
      completed and will be updated before launch.
    </div>
  );
}

export function PrivacyPage() {
  return (
    <article className="prose-page mx-auto max-w-3xl">
      <h1 className="mb-1 text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="text-sm">
        Effective date: <V k="effectiveDate" label="EFFECTIVE DATE" /> · Last updated: <V k="lastUpdated" label="LAST UPDATED DATE" />
      </p>
      <DraftNotice />

      <p>
        This policy explains how DoNext (the “App”), provided by {COMPANY_LEGAL_NAME} (“DewanTech”, “we”, “us”), located at{' '}
        <V k="businessAddress" label="REGISTERED BUSINESS ADDRESS" />, handles your information.
      </p>

      <h2>The short version</h2>
      <p>
        <strong>DoNext keeps your data on your device.</strong> There are no accounts, and your names and tasks are not sent to
        DewanTech or to any server we operate. We cannot see, access, recover or delete your tasks.
      </p>

      <h2>What the App stores on your device</h2>
      <ul>
        <li>
          <strong>People (profiles):</strong> the names and colours you add for people who use the App on this device.
        </li>
        <li>
          <strong>Tasks:</strong> titles, descriptions, due dates, priorities, categories, completion status, and whether each task
          is private, shared or assigned.
        </li>
        <li>
          <strong>Settings:</strong> your theme choice and which profile is currently selected.
        </li>
      </ul>
      <p>
        This information is saved in your browser’s storage (IndexedDB and local storage) or, for the installed app, in the app’s
        storage on your device. It stays there until you delete it, remove a profile, use <strong>Erase everything</strong>, clear
        your browser data or uninstall the App.
      </p>

      <h2>Profiles and other people on your device</h2>
      <p>
        Profiles are a convenience for people who share a device; they are not password-protected. Anyone who can use your device
        can switch profiles and see shared tasks, and could see private tasks by opening that profile. Don’t store sensitive
        information in DoNext on a shared device.
      </p>

      <h2>Voice input and microphone</h2>
      <p>
        The microphone is used only when you tap the microphone button, to turn your speech into task text. DoNext does not record
        or store audio. Speech recognition is performed by your browser or device’s speech service — for example, Google Chrome may
        send audio to Google, and Apple devices may send audio to Apple — under their own privacy policies. You can deny or remove
        microphone permission at any time in your browser or device settings and type instead.
      </p>

      <h2>Backups</h2>
      <p>
        When you use <strong>Download backup</strong>, the App creates a file containing your profiles and tasks and saves it where
        you choose. That file is under your control; anyone who has it can read its contents. Importing a backup only adds data to
        the device you import it on.
      </p>

      <h2>Website hosting</h2>
      <p>
        If you use DoNext in a web browser, the App’s files are downloaded from our website like any web page. The web server may
        record standard technical information (such as IP address, browser type and time of request) for security and reliability.
        This does not include your tasks or profile names.
      </p>

      <h2>What we don’t do</h2>
      <ul>
        <li>We don’t require an account, email address or password.</li>
        <li>We don’t use advertising, analytics or tracking in the App.</li>
        <li>We don’t sell or share your personal information.</li>
      </ul>

      <h2>Your choices and rights</h2>
      <p>
        Because your data stays on your device, you are in control of it: you can view, change, download (
        <Link to="/data" className="underline">
          Backup & data
        </Link>
        ) or delete it at any time. Depending on where you live, you may have privacy rights under laws such as the GDPR (EEA and UK)
        or the California Consumer Privacy Act. We do not hold your task data, so requests to access or delete it should be carried
        out in the App itself. For any other privacy question, email{' '}
        <V k="privacyEmail" label="PRIVACY CONTACT EMAIL" />.
      </p>

      <h2>Children</h2>
      <p>
        The App is not directed to children under <V k="minimumAge" label="MINIMUM AGE" />.
      </p>

      <h2>Changes</h2>
      <p>We will update this page and the “Last updated” date if this policy changes.</p>

      <h2>Contact</h2>
      <p>
        {COMPANY_LEGAL_NAME}, <V k="businessAddress" label="REGISTERED BUSINESS ADDRESS" /> · Email: <V k="privacyEmail" label="PRIVACY CONTACT EMAIL" />
      </p>
    </article>
  );
}

export function TermsPage() {
  return (
    <article className="prose-page mx-auto max-w-3xl">
      <h1 className="mb-1 text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="text-sm">
        Effective date: <V k="effectiveDate" label="EFFECTIVE DATE" />
      </p>
      <DraftNotice />

      <p>
        These Terms govern your use of DoNext (the “App”), provided by {COMPANY_LEGAL_NAME} (“DewanTech”). By using the App you
        agree to these Terms and our{' '}
        <Link to="/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>

      <h2>Using the App</h2>
      <p>
        You must be at least <V k="minimumAge" label="MINIMUM AGE" /> years old to use the App. You may add profiles for other people
        who use your device. Profiles are not password-protected; you are responsible for who can use your device and what is stored
        in the App.
      </p>

      <h2>Your content</h2>
      <p>You own the tasks and other content you create. It is stored on your device and is not sent to DewanTech.</p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Do not use the App for unlawful purposes or to store unlawful content.</li>
        <li>Do not attempt to interfere with the App or the website it is served from.</li>
      </ul>

      <h2>Pricing</h2>
      <p>
        <V k="pricing" label="STATE WHETHER THE APP IS FREE, OR DESCRIBE PAID PLANS" />
      </p>

      <h2>Availability and changes</h2>
      <p>We may modify or discontinue the App or any feature at any time.</p>

      <h2>Provided “as is”</h2>
      <p>
        Like all applications and services provided by DewanTech™, the App is offered <strong>“AS IS” and “AS AVAILABLE”, without
        warranties of any kind</strong>, whether express or implied, including any warranties of merchantability, fitness for a
        particular purpose, accuracy, reliability or non-infringement. We do not promise that the App will always be available, will
        be free of errors, or will meet your needs.
      </p>

      <h2>Your data and backups</h2>
      <p>
        Your data is stored only on your device. <strong>You are responsible for keeping backups</strong> (
        <Link to="/data" className="underline">
          Backup & data
        </Link>
        ). DewanTech cannot recover your data and <strong>is not responsible for any loss, corruption or deletion of your data</strong>,
        for any reason — including clearing browser data, browser or device problems, storage limits, software errors, another person
        using your device, or uninstalling the App.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, DewanTech and its owners, employees and suppliers will not be liable for any direct,
        indirect, incidental, special, consequential or punitive damages, or for any loss of data, use, profits, revenue or goodwill,
        arising out of or related to your use of (or inability to use) the App, even if we have been told such damages are possible.
      </p>
      <p>
        Our total liability for any claim relating to the App is limited to the amount you paid DewanTech for the App in the 12 months
        before the claim. While the App is free, that amount is zero. Some places do not allow certain warranties or liabilities to be
        excluded or limited; where that applies, our liability is limited to the smallest amount the law allows.
      </p>

      <h2>Governing law</h2>
      <p>
        These Terms are governed by the laws of <V k="governingLaw" label="GOVERNING JURISDICTION" />. Disputes will be resolved in{' '}
        <V k="disputeVenue" label="VENUE / DISPUTE RESOLUTION METHOD" />.
      </p>

      <h2>Contact</h2>
      <p>
        {COMPANY_LEGAL_NAME}, <V k="businessAddress" label="REGISTERED BUSINESS ADDRESS" /> · Email: <V k="supportEmail" label="SUPPORT CONTACT EMAIL" />
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
