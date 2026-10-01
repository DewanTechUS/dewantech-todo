# iOS and Android apps (Capacitor)

The same React app is packaged as native iOS and Android apps with **Capacitor 7**. The native shell loads the built web files from inside the app and calls your deployed API over HTTPS.

> **Nothing has been submitted to Apple or Google.** This guide explains how *you* build, sign, and submit the apps. Every step that needs a developer account, a signing key, or a store dashboard is marked 🔑. Store approval is decided by Apple and Google and is not guaranteed.

---

## 1. Prerequisites

| | Android | iOS |
| --- | --- | --- |
| Computer | Windows, macOS, or Linux | **macOS only** |
| Tools | Android Studio (current stable) with Android SDK and **JDK 21** | **Xcode 16 or later** (use the current release Apple requires for uploads), plus Xcode command line tools |
| Device for testing | Android 6.0 (API 23) or later | iOS 14 or later |
| 🔑 Account to publish | Google Play Console: one-time US$25 registration fee | Apple Developer Program: US$99 per year |

Your API must already be deployed on HTTPS (see [DEPLOYMENT.md](DEPLOYMENT.md)). Native apps can't use `localhost` on your PC.

## 2. One-time setup

All of these commands run from the `client/` folder.

```bash
cd client

# a) Point the mobile build at your live API
cp .env.mobile.example .env.mobile    # then edit VITE_API_URL=https://todo.dewantech.com

# b) Choose your permanent app id (reverse domain you control) in capacitor.config.ts
#    appId: 'com.dewantech.todo'  ← cannot change after the first store release

# c) Build the web app and create the native projects
npm run build:mobile
npx cap add android
npx cap add ios          # macOS only

# d) Add microphone + speech permissions to the native projects (idempotent)
npm run cap:configure

# e) Generate app icons and splash screens from client/assets/
npm run cap:assets
```

On the server, add the native origins to `CORS_ORIGINS`:

```ini
CORS_ORIGINS=https://todo.dewantech.com,capacitor://localhost,https://localhost
```

- `capacitor://localhost` is the iOS app's origin.
- `https://localhost` is the Android app's origin.

The `android/` and `ios/` folders are generated, and the repo's `.gitignore` excludes them. If you customise native code (signing settings, extra plugins), remove those lines from `.gitignore` and commit the folders.

## 3. Day-to-day build and run

```bash
npm run cap:android   # build → sync → configure permissions → open Android Studio
npm run cap:ios       # build → sync → configure permissions → open Xcode
```

- **Android Studio:** pick a device or emulator and press ▶ Run.
- **Xcode:**
  1. Select the **App** target.
  2. Under **Signing & Capabilities**, choose your 🔑 Team (you can test on your own device with a free Apple ID).
  3. Pick a device and press ▶.

Re-run the same command after every web change.

## Microphone and speech permissions

The voice button uses [`@capacitor-community/speech-recognition`](https://github.com/capacitor-community/speech-recognition), which uses the operating system's speech recognizer.

`npm run cap:configure` ([client/scripts/configure-native.mjs](../client/scripts/configure-native.mjs)) adds the following:

| Platform | What gets added | Why |
| --- | --- | --- |
| iOS `Info.plist` | `NSMicrophoneUsageDescription` | Text shown in the microphone permission prompt. **Required**: the app crashes on first use without it, and Apple rejects vague text. |
| iOS `Info.plist` | `NSSpeechRecognitionUsageDescription` | Text shown in the speech recognition prompt. Also required. |
| Android `AndroidManifest.xml` | `android.permission.RECORD_AUDIO` | Runtime microphone permission |
| Android `AndroidManifest.xml` | `<queries>` for `android.speech.RecognitionService` | On Android 11 and later, lets the app find the system speech service |

Review the wording of the two iOS strings in the script before you submit. They must describe the app's real use.

**What the user sees:**

1. They tap the mic, and an in-app explainer appears.
2. They tap **Continue**, and the OS permission prompt or prompts appear. iOS asks twice: once for the microphone and once for speech recognition.
3. Once permission is granted, they speak and then confirm the text in the editable preview.
4. If they deny permission, the app shows how to re-enable it:
   - **iOS:** Settings → DewanTech To-Do → Microphone / Speech Recognition.
   - **Android:** Settings → Apps → DewanTech To-Do → Permissions → Microphone.
5. **Type instead** is always available.

**Testing notes:**

- Test voice on **real devices**. Speech recognition is limited or missing on the iOS Simulator and on many Android emulators.
- Android devices need a speech recognition service. On most devices it comes from the Google app; recognition may happen on the device or on Google's servers, depending on the device.

## 4. Release builds

### Android: signed App Bundle (.aab)

1. Set the version in `android/app/build.gradle`. Increase `versionCode` (an integer) on every upload, and set `versionName` (for example `1.0.0`).
2. Check the **target SDK** in `android/variables.gradle` against Google Play's *current* target API level requirement. Capacitor 7 targets API 35. If Play requires a higher level when you submit, raise `targetSdkVersion` and `compileSdkVersion`, or upgrade Capacitor. Test after either change.
3. 🔑 Create an **upload key**, once:
   ```bash
   keytool -genkey -v -keystore dewantech-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
   ```
   Back it up somewhere safe and **never commit it**. If you lose it, you have to ask Google support to reset it.
4. In Android Studio, choose **Build → Generate Signed App Bundle → Android App Bundle**, select your keystore, and choose the *release* variant. The output is `app-release.aab`.
5. Enrol in **Play App Signing** when you create the app in Play Console. Google then holds the final app-signing key.

### iOS: archive and upload

1. 🔑 In the [Apple Developer portal](https://developer.apple.com/account), register the **App ID** (bundle identifier = `appId`).
2. In Xcode, open **App target → General**. Set the *Version* (for example 1.0.0) and the *Build* number, which must increase with every upload.
3. Under **Signing & Capabilities**, choose your 🔑 team and keep *Automatically manage signing* on.
4. Choose **Product → Archive**, then in **Organizer**, click **Distribute App → App Store Connect → Upload**.
5. The build appears in App Store Connect after processing. Test it with **TestFlight** before you submit.
6. Add a **privacy manifest** (`PrivacyInfo.xcprivacy`) following Capacitor's current *iOS Privacy Manifest* guide. Apple requires one for apps that use certain system APIs, including UserDefaults, which Capacitor uses.

---

## 5. Store submission requirements

Each item is marked with its status in this project:

- ✅ already implemented
- 📝 you need to provide something
- 🔑 needs your developer account

### Both stores

- ✅ **In-app account deletion.** Apple requires it for apps that let users create accounts, and Google requires it too. It's under **Account → Delete account**.
- 📝 **Privacy policy URL.** Publish the completed `/privacy` page, for example `https://todo.dewantech.com/privacy`. Fill in every highlighted placeholder first and have it reviewed.
- 📝 **Support URL or contact email.**
- 📝 **Demo account for reviewers.** Create a test account with sample tasks and put the email and password in the review notes (Apple: *App Review Information*; Google: *App access*).
- 📝 **Screenshots:**
  - iPhone 6.9" or 6.7" (and iPad, if you keep iPad support).
  - Android phone, plus 7" and 10" tablet if you list tablet support.
- 📝 **Store listing:**
  - Name, subtitle or short description, full description, keywords (Apple), and category (Productivity).
  - Icon: 1024×1024 for Apple; 512×512 plus a 1024×500 feature graphic for Google.
- 📝 **Age or content rating questionnaire.**

### Apple App Store (🔑 App Store Connect)

- **App Privacy ("nutrition label").** Based on this codebase:
  - The app collects Name, Email Address, and *User Content* (tasks).
  - That data is linked to the user and used for App Functionality.
  - It is not used for tracking.
  - Audio is converted to text by Apple's speech service and is not collected by the app.

  Confirm all of this against your final setup, including any analytics or crash reporting you add later.
- **Export compliance.** The app only uses standard HTTPS. You will answer the encryption questions in App Store Connect; you can add `ITSAppUsesNonExemptEncryption = NO` to Info.plist once you have confirmed it applies to you.
- **Minimum functionality (Guideline 4.2).** Apps that are only a "website in a wrapper" can be rejected. This app has offline storage, native speech recognition, and native permissions, which helps. Describe these in your review notes.
- **Sign in with Apple** isn't required, because the app only offers its own email and password login. It becomes required if you add third-party logins such as Google or Facebook.
- **Terms.** Either use Apple's standard EULA or make sure your Terms page includes Apple's minimum terms; this is flagged in the Terms template.

### Google Play (🔑 Play Console)

- **Data safety form.** Declare the account data (name, email) and user content (tasks) that are collected, that data is encrypted in transit, and that users can request deletion. Answer the microphone and audio questions according to how the system speech service processes audio on your target devices, and check Google's current guidance.
- **Account deletion web link.** Google also requires a URL where users can request deletion without the app. Use `https://<your-url>/account`, where users log in and delete, or a support email process that you describe on your privacy page.
- **Testing requirement for new personal accounts.** Newer *personal* developer accounts must run a **closed test** with a minimum number of testers (currently 12) for 14 continuous days before production access. Check the current rule in Play Console.
- **Target API level.** Check it at submission time (see Android release step 2).
- **Permissions.** `RECORD_AUDIO` doesn't need a special declaration form, but it must be justified by visible features, which the mic button is, and reflected in the Data safety form.

### Suggested release path

1. Internal testing on your own devices, using a TestFlight internal group and a Play *Internal testing* track.
2. External or closed testing with real users.
3. Fix the issues they report, then submit for review.
4. If a store rejects the app, read its message, make the requested changes, and resubmit. Review outcomes and timelines are up to Apple and Google.
