# DoNext

DoNext is a mobile-friendly, offline-first to-do app by DewanTech. It's built with React, TypeScript and Tailwind CSS, installs as a PWA, and is packaged for iOS and Android with Capacitor 8.

**Everything stays on the device.** There's no server, no accounts and no database to pay for. Several people can share one device: each person has a profile, and tasks can be private, shared with everyone, or assigned to someone.

| Guide | What it covers |
| --- | --- |
| This README | Features, running it, tests, how it works |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Putting DoNext on dewantech.com or any web host (just files to upload) |
| [docs/HOSTINGER.md](docs/HOSTINGER.md) | Click-by-click upload to Hostinger (works on any plan) |
| [docs/MOBILE.md](docs/MOBILE.md) | iOS and Android builds, microphone permissions, store submission |

The earlier version with a Node.js/MongoDB server, accounts and cloud sync is saved in the git tag `v1-with-server`.

---

## Features

- **People on one device:**
  - "Who's using DoNext?" profile picker, with no sign-up or passwords.
  - Add, rename, recolour or remove people.
  - Switch person from the menu.
- **Sharing:** every task is **Only me** (private) or **Everyone** (shared), and can be **assigned** to a person.
  - Views: **My tasks** (yours plus assigned to you), **Shared**, and **All tasks**.
  - Tasks show who they're from and who they're for.
  - Only the person who created a task can delete it.
- **Tasks:** title, description, due date, priority and category, with complete, edit and delete.
  - Search, plus filters by status, priority and category.
  - Sort by due date, priority or newest. Overdue tasks are highlighted.
- **Voice input:** a chat-style composer with a big mic. Words appear as you speak; tap ➤ to add. Typing is the fallback.
- **Backup & data:**
  - **Download backup** (a JSON file) and **Import backup**. Importing merges, and the newest version of each task wins.
  - Copy tasks to another device the same way.
  - **Keep my data** asks the browser to protect DoNext's storage from being cleared.
  - **Erase everything.**
- **Works offline, always:** it's an installable PWA, and data lives in IndexedDB.
- **UX:**
  - Dark, light or system theme.
  - 44 px or larger touch targets.
  - Accessible dialogs and menu: focus trap, Escape to close, labelled controls.
  - A clean ☰ menu on phones and tablets, and a slim desktop footer.
- **Branding:** DoNext and DewanTech logos, "Technology Built with Purpose.", © Dewan Global LLC DBA DewanTech™.
- **Legal pages:** a Privacy Policy written for a local-only app, Terms ("AS IS"; no responsibility for data loss), and a Help & Support page.

## Running it

You need **Node.js 22 or later**.

```bash
npm install
npm run dev          # http://localhost:5173
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build in `client/dist/` (plain files: HTML, JS, CSS, icons) |
| `npm run preview` | Serve the production build locally at http://localhost:4173 |
| `npm test` | Run the tests |
| `npm run typecheck` | Type-check |
| `npm run icons` | Rebuild icons, splash screens and in-app logos from `branding/` |

To try it on your phone over Wi-Fi, run `npm run dev -- --host` and open `http://<your-PC-IP>:5173`. Voice input needs HTTPS or `localhost`, so test the mic on a deployed HTTPS copy or on the PC itself.

## Tests

```bash
npm test
```

There are **37 tests** (Vitest, Testing Library and fake IndexedDB):
- **People:** adding people, duplicate names, remembering who's selected after a restart.
- **Sharing rules:**
  - Private tasks stay private, while shared and assigned tasks are visible to others.
  - Only the creator can delete a task.
  - Removing a person deletes their private tasks, keeps their shared ones, and unassigns their work.
- **Backup:**
  - Export, then import on another device.
  - Importing the same file twice changes nothing, and the newer version wins.
  - Damaged or fake files are rejected or cleaned.
  - Erase everything.
- **Full app flows:** first run, then adding a task; two people sharing; private tasks hidden from the other person.
- **Voice composer:** live typing, the send arrow, the permission explainer, a denied microphone, and the no-speech and unsupported fallbacks.
- **Mobile menu, filters, sorting, form validation and accessibility.**

## Project structure

```
dt_to_do/
├─ package.json            npm workspace + scripts
├─ branding/               source logos (DoNext app, DewanTech company)
├─ scripts/generate-icons.mjs
├─ docs/                   deployment, Hostinger, mobile guides
└─ client/
   ├─ capacitor.config.ts  app id com.dewantech.donext, name DoNext
   ├─ android/, ios/       native projects (Capacitor 8)
   ├─ native/ios/          iOS privacy manifest template
   ├─ scripts/configure-native.mjs  mic/speech permissions + privacy manifest
   └─ src/
      ├─ lib/
      │  ├─ db.ts          IndexedDB (profiles, tasks, settings)
      │  ├─ appStore.ts    all app data + backup import/export
      │  ├─ visibility.ts  private / shared / assigned rules
      │  ├─ filters.ts, speech.ts, brand.ts (names, contacts, legal details)
      ├─ context/          AppContext (store), ThemeContext
      ├─ components/       Header (☰ menu), Footer, TaskForm, VoiceInput, TaskItem, Avatar…
      └─ pages/            Welcome (who's using), Tasks, People, Backup & data, Support, Privacy, Terms
```

## How it works

- **Storage:**
  - Profiles, tasks and settings live in one IndexedDB database, `donext`, in the browser (or in the app's storage on iOS and Android).
  - Theme and microphone-explainer flags live in `localStorage`.
  - Nothing is sent over the network except loading the app's own files.
- **Profiles** are a convenience, not security. Anyone using the device can switch profiles. The UI says this clearly to users.
- **Visibility:** someone can see a task if it's shared, they created it, or it's assigned to them (see `lib/visibility.ts`).
- **Backups** are versioned JSON files. Import validates and cleans every field, and merges by id, keeping whichever copy has the newer `updatedAt`.
- **Security:** production builds include a strict Content-Security-Policy `<meta>` tag (no inline or third-party scripts), and React escapes all user text.

### Voice input

| Platform | Engine | Notes |
| --- | --- | --- |
| Chrome and Edge (desktop and Android) | Web Speech API | Chrome sends audio to Google for recognition (disclosed in the app and the Privacy Policy). Needs HTTPS. |
| Safari on macOS and iOS | Web Speech API | Uses Apple's speech service. May be unavailable in home-screen web apps on some iOS versions; typing still works. |
| Firefox | Not supported | Typing fallback |
| iOS and Android apps | `@capacitor-community/speech-recognition` | Uses the phone's own speech recognizer, with native permission prompts |

## Before going public

Everything you fill in lives in one file, [client/src/lib/brand.ts](client/src/lib/brand.ts):

- [ ] In **`LEGAL`**, fill in your business address, go-live date (effective and last-updated), the state your LLC is registered in (governing law and dispute venue), and confirm the minimum age and pricing. Empty values show as highlighted placeholders on the Privacy and Terms pages.
- [ ] Read both pages, then set `finalized: true`. The "Draft" banner disappears.
- [ ] Confirm `COMPANY_SITE_URL`.

Already done: support and contact emails (support@dewantech.com, info@dewantech.com), company name, logos and icons.

## License

© 2026 Dewan Global LLC DBA DewanTech™. All rights reserved. See [LICENSE](LICENSE).
