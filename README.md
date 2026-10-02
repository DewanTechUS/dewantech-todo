# DoNext

DoNext is a mobile-friendly, offline-first to-do app by DewanTech.

- **Frontend:** React 18, TypeScript, Tailwind CSS, Vite, installable PWA
- **Backend:** Node.js, Express 5, TypeScript, Zod validation
- **Database:** MongoDB with Mongoose
- **Mobile:** Capacitor 7, packaged for iOS and Android

| Guide | What it covers |
| --- | --- |
| This README | Features, MongoDB setup, local development, tests, configuration, architecture |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Putting the app on your DewanTech website (subdomain or `/todo/` sub-path), Docker, production checklist |
| [docs/MOBILE.md](docs/MOBILE.md) | iOS/Android builds, microphone permissions, signing, App Store and Google Play submission requirements |

---

## Features

- **Accounts:** sign up, log in, log out, log out of all devices, and delete your account (asks for your password again).
- **Tasks:** create, edit, complete, and delete tasks. Each task has a title, description, due date, priority (low/medium/high), and category.
- **Finding tasks:** search across title, description, and category. Filter by status, priority, or category, and sort by due date, priority, or newest. Overdue tasks are highlighted.
- **Privacy:** every query is scoped to the logged-in user, so nobody can read or change another user's tasks (covered by tests). Each account also gets its own offline database on the device, and that database is erased when you log out.
- **Voice input:**
  - A microphone button turns speech into text.
  - Before the first permission prompt, a short note explains why the app needs the microphone.
  - You can edit what was heard in a preview before it's used.
  - Denied permission, no microphone, and no speech heard each get their own message.
  - Where voice isn't supported, the app falls back to typing.
- **Offline and sync:** the app keeps working with no connection. Changes are saved on the device and synced automatically when you're back online.
  - Conflicts are resolved by last write wins.
  - Deletions reach your other devices.
  - Edits made while a sync is in progress are never lost.
- **PWA:** installable, with an app shell that loads offline and updates itself.
- **User experience:**
  - Dark, light, or system theme.
  - Touch targets of at least 44 px.
  - Accessibility: skip link, labelled controls, focus-trapped dialogs, `aria-live` status updates, and reduced-motion support.
  - Loading indicators and plain-language error messages.
- **Security:**
  - Passwords hashed with bcrypt (12 rounds).
  - JWTs (HS256) that can be revoked by bumping a per-user token version.
  - Helmet with a strict CSP, an allow-list for CORS, and rate-limited auth endpoints.
  - Strict Zod schemas that reject unknown fields and NoSQL operator injection.
  - Secrets only in environment variables, and the server won't start if `JWT_SECRET` is weak or still the placeholder.
- **Legal pages:** Privacy Policy and Terms templates, with every detail you need to supply shown as a highlighted placeholder.

## Project structure

```
dt_to_do/
├─ package.json            npm workspaces + root scripts
├─ .env.example            sample server environment
├─ Dockerfile              single-container production image
├─ branding/              source logos: donext-logo.png (app), dewantech-logo.png (company)
├─ scripts/generate-icons.mjs   builds all icons, splash screens and in-app logos from branding/
├─ server/
│  ├─ src/
│  │  ├─ index.ts          entry: env → MongoDB → HTTP server
│  │  ├─ app.ts            Express app (security middleware, routes, optional static client)
│  │  ├─ config.ts         validated environment variables
│  │  ├─ models/           User, Task (Mongoose)
│  │  ├─ routes/           auth.ts, tasks.ts (CRUD + /sync)
│  │  ├─ middleware/       auth (JWT), error handler, zod parsing
│  │  └─ lib/validation.ts all request schemas
│  ├─ scripts/dev-memory.ts  run the API with a disposable local MongoDB
│  └─ test/                auth, tasks/privacy/CORS, sync conflict tests
└─ client/
   ├─ capacitor.config.ts  native app id/name
   ├─ vite.config.ts       PWA manifest + service worker
   ├─ scripts/configure-native.mjs  adds mic/speech permissions to native projects
   ├─ assets/              icon/splash sources for @capacitor/assets
   ├─ public/              icons, theme bootstrap script
   └─ src/
      ├─ lib/              api, IndexedDB store, sync engine, filters, speech
      ├─ context/          Auth, Tasks, Theme providers
      ├─ components/       Header, Footer, TaskForm, VoiceInput, TaskItem, FilterBar, Modal…
      └─ pages/            Tasks, Login/Signup, Account, Privacy, Terms
```

## Prerequisites

- **Node.js 20.11 or later** (22 LTS recommended), with npm 10 or later.
- **MongoDB:** one of the three options below.
- **Mobile builds only:**
  - Android: Android Studio.
  - iOS: a Mac with Xcode.
  - Details are in [docs/MOBILE.md](docs/MOBILE.md).

## MongoDB setup

Pick one option.

### Option A: MongoDB Atlas (recommended for production)

1. Create a free account at <https://www.mongodb.com/cloud/atlas>. *(You need your own account for this.)*
2. Create a cluster. The free M0 tier is fine to start with; choose a region close to your users and your API host.
3. Under **Database Access**, add a database user with a strong password and the *Read and write to any database* role. Scoping it to the `dewantech_todo` database is better.
4. Under **Network Access**, add your API server's outbound IP address. During development you can add your own IP. Avoid `0.0.0.0/0` in production unless your host has no static IP.
5. Click **Connect → Drivers** and copy the connection string. Put it in `server/.env`, adding the database name:
   ```
   MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/dewantech_todo?retryWrites=true&w=majority
   ```
   If the password contains special characters such as `@ : / ? #`, URL-encode them.

### Option B: Local MongoDB Community Server

- **Windows:** install the MSI from <https://www.mongodb.com/try/download/community> and leave "Install as a Service" ticked. If `mongod` exits immediately, install the [Microsoft Visual C++ Redistributable (x64)](https://learn.microsoft.com/cpp/windows/latest-supported-vc-redist).
- **macOS:** run `brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community`.
- **Linux:** follow the official package instructions for your distribution.
- **Docker:** run `docker run -d -p 27017:27017 --name mongo -v mongo-data:/data/db mongo:7`.

Then set `MONGODB_URI=mongodb://127.0.0.1:27017/dewantech_todo`.

### Option C: Try it with no install

```bash
npm run dev:memory
```

This downloads a MongoDB binary on first run, then starts it on port 27018 with data kept in `server/.data/`, and runs the API and the web app.

- It's for development only.
- Delete `server/.data/` to reset.
- On Windows it needs the same Visual C++ Redistributable as Option B.

## Local development

```bash
# 1. Install everything (both workspaces)
npm install

# 2. Configure the server
cp .env.example server/.env        # Windows PowerShell: Copy-Item .env.example server/.env
#    then edit server/.env: set MONGODB_URI and a real JWT_SECRET:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3. Start the API (port 4000) and the web app (port 5173) together
npm run dev
```

Open <http://localhost:5173>. Vite proxies `/api` to the API, so you don't need to change CORS for local web development.

Other useful commands:

| Command | Purpose |
| --- | --- |
| `npm test` | Run all server and client tests |
| `npm run typecheck` | Type-check both workspaces |
| `npm run build` | Production build (`client/dist` and `server/dist`) |
| `npm start` | Run the built server (`server/dist/index.js`) |
| `npm run icons` | Rebuild every icon, splash screen and in-app logo from the files in `branding/` |

**Testing on your phone over Wi-Fi:** run `npm run dev -w client -- --host` and open `http://<your-PC-IP>:5173` on the phone. Browsers only allow the microphone on HTTPS or `localhost`, so voice input won't work over plain LAN HTTP. Use a tunnel such as `ngrok http 5173`, or a deployed HTTPS build, to test voice on a phone.

## Tests

```bash
npm test
```

There are 50 tests.

**Server: 23 tests.** Supertest against a real in-memory MongoDB.
- Signup and login, including identical errors for a wrong email or wrong password so accounts can't be discovered.
- Password hashing, tampered tokens, log out everywhere, and account deletion (requires the password, removes all tasks).
- Task CRUD and validation, including the 200-character limit, impossible dates, unknown fields, and `$`-operator injection.
- Privacy between users, search with regex characters escaped, and filters.
- Sync: idempotent retries, last-write-wins conflicts, clamping of future clock times, deletions reaching other devices and staying deleted, partial rejection, cross-user overwrite attempts, and batch limits.
- CORS allow-list and security headers.

**Client: 27 tests.** Vitest, Testing Library, and fake IndexedDB.
- Offline queueing and later push.
- Combining several edits to the same task into one change.
- An edit made during an in-flight sync isn't lost.
- Pulling changes from other devices.
- 401 and network-failure handling.
- Data persists across restarts and stays separate for each user.
- Filtering and sorting.
- The voice flow: explainer, editable preview, denied permission, nothing heard, and the unsupported-browser fallback.
- Form validation and accessibility.

The first server test run downloads a MongoDB binary of about 70 MB. On Windows, that binary needs the Visual C++ Redistributable.

## Environment variables

**Server** (`server/.env`; template: [.env.example](.env.example))

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | 32+ random characters; the server won't start with the placeholder in production |
| `JWT_EXPIRES_IN` | no | Session length (default `7d`) |
| `PORT` | no | Default `4000` |
| `CORS_ORIGINS` | no | Comma-separated origins allowed to call the API. Add `capacitor://localhost,https://localhost` for the native apps |
| `SERVE_CLIENT` | no | `true` makes Express serve `client/dist` as well (single-server deploy) |
| `TRUST_PROXY` | no | Number of reverse proxies in front of Express (needed for correct rate limiting behind Nginx or a PaaS) |
| `NODE_ENV` | no | `production` in production |

**Client** (`client/.env`, `client/.env.mobile`; templates: [client/.env.example](client/.env.example), [client/.env.mobile.example](client/.env.mobile.example)). These values are embedded in public JavaScript, so never put secrets here.

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | API origin. Leave empty when the API is on the same origin. **Required for native builds.** |
| `VITE_BASE_PATH` | Sub-path the web app is served from, e.g. `/todo/` (default `/`) |

## How it works

### Authentication

- Login returns a JWT, which the client stores and sends as `Authorization: Bearer …`. Bearer tokens work the same way in browsers and in Capacitor's native WebViews, where third-party cookies are unreliable.
- Each token carries the user's `tokenVersion`. *Log out of all devices* increments that version, which immediately invalidates every token already issued.
- Storing the token in `localStorage` means an XSS bug could read it. The strict CSP (no inline or third-party scripts) and React's escaping reduce that risk. If you need to, you can move to httpOnly cookies for web-only deployments.

### Offline sync

The full design is commented in [client/src/lib/taskStore.ts](client/src/lib/taskStore.ts) and [server/src/routes/tasks.ts](server/src/routes/tasks.ts).

1. Task ids are UUIDs generated on the device, so tasks can be created offline.
2. Every edit is written to IndexedDB along with an **outbox** entry, in the same transaction. The outbox keeps one entry per task, so the latest edit wins locally.
3. `POST /api/tasks/sync` pushes the outbox and pulls everything that changed since the last cursor.
   - The server keeps the edit with the newest `updatedAt` and ignores older ones.
   - Times from client clocks are capped at the server's current time.
   - Deletions are tombstones, so they reach other devices, and they're sticky: an edit can't bring a deleted task back.
   - The pull cursor is the server's own write time (`serverUpdatedAt`) minus a 5-second safety window, so a write that lands during a sync isn't missed.
4. Sync runs a moment after each edit, when the connection comes back, when the app regains focus, and every 60 seconds.
5. The service worker precaches the app shell, so the app opens offline. API responses are **never** cached by the service worker; the per-user IndexedDB copy is the only offline copy.

### Voice input

| Platform | Engine | Notes |
| --- | --- | --- |
| Chrome and Edge (desktop and Android) | Web Speech API | Chrome sends audio to Google for recognition (disclosed in the UI and the privacy policy). Needs HTTPS. |
| Safari on macOS and iOS | Web Speech API | Uses Apple's speech service. Support inside home-screen (standalone) web apps varies by iOS version; when it's unavailable, the typing fallback is shown. |
| Firefox | Not supported | Typing fallback is shown. |
| iOS and Android apps | `@capacitor-community/speech-recognition` | Uses the operating system's speech recognizer, with native permission prompts. See [docs/MOBILE.md](docs/MOBILE.md#microphone-and-speech-permissions). |

**Permission flow:**

1. Before the first permission prompt, an explainer appears offering **Continue** or **Type instead**.
2. While listening, you see a live transcript.
3. Once you stop, you get an editable preview with **Use this text**, **Try again**, or **Discard**.
4. The text you confirm goes into the title field, which you can still edit before saving.
5. If something goes wrong, the message explains how to re-enable access, for example through the browser's lock icon or the device's Settings app.

## Before going public: placeholders checklist

Search the code for `<Ph>` and `PLACEHOLDER`.

- [ ] [client/src/pages/LegalPages.tsx](client/src/pages/LegalPages.tsx): the company name is filled in (Dewan Global LLC dba DewanTech™); fill in the address, contact emails, dates, hosting and database providers, data region, retention periods, minimum age, governing law, and pricing. Then **have a lawyer review the text.**
- [ ] [client/src/lib/brand.ts](client/src/lib/brand.ts): confirm `COMPANY_SITE_URL`. App name, legal name, slogan and copyright are also set here.
- [ ] [client/capacitor.config.ts](client/capacitor.config.ts): `appId` (permanent after the first store release) and `appName`.
- [x] Icons and splash screens are generated from your logos in `branding/`. To change them, replace those files (square, 1024 px or larger) and run `npm run icons`.
- [ ] `server/.env`: a real `JWT_SECRET`, production `MONGODB_URI`, and `CORS_ORIGINS`.
