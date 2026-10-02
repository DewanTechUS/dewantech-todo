import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { APP_NAME, COMPANY_LEGAL_NAME, LEGAL } from '../lib/brand';

const faqs: { q: string; a: ReactNode }[] = [
  {
    q: 'How do I add a task by voice?',
    a: (
      <>
        Tap <strong>New task</strong>, then the microphone. Speak your task — the words appear as you talk. Fix anything by typing, then tap
        the arrow (or press Enter) to add it. Tap <strong>+ Add details</strong> for a due date, priority or category.
      </>
    ),
  },
  {
    q: 'The microphone isn’t working.',
    a: (
      <>
        Make sure microphone access is allowed. <strong>In a browser:</strong> tap the lock icon in the address bar and allow the microphone.{' '}
        <strong>iPhone/iPad app:</strong> Settings → {APP_NAME} → turn on Microphone and Speech Recognition.{' '}
        <strong>Android app:</strong> Settings → Apps → {APP_NAME} → Permissions → Microphone. Voice input isn’t available in some browsers
        (such as Firefox) — you can always type instead.
      </>
    ),
  },
  {
    q: 'How do I share tasks with other people?',
    a: (
      <>
        Everyone who uses this device can have their own profile. Add people on the{' '}
        <Link to="/people" className="font-semibold underline">
          People
        </Link>{' '}
        page. When you create a task, choose <strong>Everyone</strong> under “Who can see it” to share it, or <strong>Only me</strong> to
        keep it private. You can also <strong>assign</strong> a task to someone — they’ll see it in their list.
      </>
    ),
  },
  {
    q: 'How do I switch to another person?',
    a: 'Open the menu (☰) and tap Switch, or tap your picture in the top bar on a computer. Then pick a name.',
  },
  {
    q: 'Can people on other phones or computers see my shared tasks?',
    a: (
      <>
        No. DoNext keeps everything on this device and doesn’t use a server, so sharing works between people who use the same device. To
        copy tasks to another device, use <strong>Download backup</strong> on{' '}
        <Link to="/data" className="font-semibold underline">
          Backup & data
        </Link>
        , send the file to the other device, and use <strong>Import backup</strong> there.
      </>
    ),
  },
  {
    q: 'Does it work without internet?',
    a: 'Yes. DoNext works fully offline — everything is saved on your device. (Voice input in some browsers needs an internet connection; typing always works.)',
  },
  {
    q: 'How do I keep my tasks safe?',
    a: (
      <>
        Your tasks live only on this device. If you clear your browser data, uninstall the app or lose the device, they’re gone and{' '}
        <strong>can’t be recovered by DewanTech</strong>. Download a backup regularly from{' '}
        <Link to="/data" className="font-semibold underline">
          Backup & data
        </Link>
        , and tap <strong>Keep my data</strong> there if your browser offers it.
      </>
    ),
  },
  {
    q: 'How do I delete my data?',
    a: (
      <>
        Remove a person on the{' '}
        <Link to="/people" className="font-semibold underline">
          People
        </Link>{' '}
        page, or delete everything with <strong>Erase everything</strong> on{' '}
        <Link to="/data" className="font-semibold underline">
          Backup & data
        </Link>
        .
      </>
    ),
  },
  {
    q: 'How do I install it on my phone?',
    a: 'iPhone (Safari): tap Share → Add to Home Screen. Android (Chrome): tap ⋮ → Install app. It then opens like a regular app and works offline. Installing also makes your browser less likely to clear DoNext’s data.',
  },
];

export default function SupportPage() {
  const email = LEGAL.supportEmail.trim();
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Help & Support</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Answers to common questions about {APP_NAME}.</p>
      </div>

      <section aria-labelledby="faq-h">
        <h2 id="faq-h" className="sr-only">
          Frequently asked questions
        </h2>
        <div className="card divide-y divide-slate-100 dark:divide-slate-800">
          {faqs.map(({ q, a }) => (
            <details key={q} className="group">
              <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 px-5 font-medium [&::-webkit-details-marker]:hidden">
                {q}
                <span aria-hidden className="text-xl text-slate-400 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="px-5 pb-5 text-slate-600 dark:text-slate-300">{a}</div>
            </details>
          ))}
        </div>
      </section>

      <section className="card space-y-2 p-5" aria-labelledby="contact-h">
        <h2 id="contact-h" className="text-lg font-semibold">
          Still need help?
        </h2>
        {email ? (
          <>
            <dl className="grid gap-x-4 gap-y-1 text-slate-600 dark:text-slate-300 sm:grid-cols-[10rem_1fr]">
              <dt className="font-medium text-slate-800 dark:text-slate-100">Support</dt>
              <dd>
                <a
                  href={`mailto:${email}?subject=${encodeURIComponent(`${APP_NAME} support`)}`}
                  className="font-semibold text-brand-700 underline dark:text-brand-300"
                >
                  {email}
                </a>
              </dd>
              {LEGAL.infoEmail && (
                <>
                  <dt className="font-medium text-slate-800 dark:text-slate-100">General information</dt>
                  <dd>
                    <a href={`mailto:${LEGAL.infoEmail}`} className="font-semibold text-brand-700 underline dark:text-brand-300">
                      {LEGAL.infoEmail}
                    </a>
                  </dd>
                </>
              )}
            </dl>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              We aim to respond within a reasonable timeframe. Response times are not guaranteed.
            </p>
          </>
        ) : (
          <p className="text-slate-600 dark:text-slate-300">
            Email us at <mark className="placeholder-mark">[SUPPORT CONTACT EMAIL — set LEGAL.supportEmail in client/src/lib/brand.ts]</mark>.
          </p>
        )}
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {APP_NAME} is provided by {COMPANY_LEGAL_NAME}. See our <Link to="/privacy" className="underline">Privacy Policy</Link> and{' '}
          <Link to="/terms" className="underline">Terms of Service</Link>.
        </p>
      </section>
    </div>
  );
}
