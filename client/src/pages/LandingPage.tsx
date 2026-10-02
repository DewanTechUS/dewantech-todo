import type { ComponentType, SVGProps } from 'react';
import { Link } from 'react-router-dom';
import { AppLogo, CompanyCredit } from '../components/Brand';
import { CheckIcon, CloudIcon, MicIcon, ShieldIcon } from '../components/Icons';
import { APP_NAME } from '../lib/brand';

const features: { title: string; text: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { title: 'Just say it', text: 'Tap the mic and talk — your words appear as you speak. Fix anything, then tap the arrow.', Icon: MicIcon },
  { title: 'Works offline', text: 'Add and edit tasks with no connection. Everything syncs when you are back online.', Icon: CloudIcon },
  { title: 'Stay organised', text: 'Due dates, priorities, categories, search and filters keep the right task next.', Icon: CheckIcon },
  { title: 'Private by design', text: 'Your tasks are visible only to you. We never sell your data or record your voice.', Icon: ShieldIcon },
];

/** Public home page for visitors who are not signed in. */
export default function LandingPage() {
  return (
    <div className="space-y-14 py-4 sm:py-10">
      <section className="flex flex-col items-center text-center">
        <AppLogo size={96} />
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-brand-900 dark:text-white sm:text-5xl">
          Know what to <span className="text-brand-600 dark:text-brand-400">do next</span>.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-slate-600 dark:text-slate-300">
          {APP_NAME} is the simple to-do list you can talk to. Capture tasks by voice or typing on your phone, tablet or computer — online
          or offline.
        </p>
        <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <Link to="/signup" className="btn-primary px-8 text-lg">
            Get started — it’s free
          </Link>
          <Link to="/login" className="btn-secondary px-8 text-lg">
            Log in
          </Link>
        </div>
      </section>

      <section aria-labelledby="features-h">
        <h2 id="features-h" className="sr-only">
          Features
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {features.map(({ title, text, Icon }) => (
            <li key={title} className="card flex gap-4 p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-brand-300">
                <Icon width={24} height={24} />
              </span>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card flex flex-col items-center gap-4 bg-gradient-to-br from-brand-900 to-brand-700 p-8 text-center text-white dark:from-brand-900 dark:to-slate-900">
        <h2 className="text-2xl font-bold">Install it like an app</h2>
        <p className="max-w-lg text-brand-100">
          On your phone, open {APP_NAME} in your browser and choose <strong>Add to Home Screen</strong> (iPhone: Share menu · Android: ⋮
          menu). It opens full-screen and works offline.
        </p>
        <Link to="/signup" className="btn bg-white text-brand-900 hover:bg-brand-50">
          Create your free account
        </Link>
      </section>

      <div className="flex justify-center lg:hidden">
        <CompanyCredit compact />
      </div>
    </div>
  );
}
