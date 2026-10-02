#!/usr/bin/env node
/**
 * Adds the microphone / speech-recognition permissions the voice input needs to the
 * native projects created by `npx cap add ios` and `npx cap add android`.
 * Safe to run repeatedly (idempotent). Run from client/:  node scripts/configure-native.mjs
 *
 * Review the usage-description strings: Apple shows them to users and App Review checks them.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] ?? process.cwd();

const IOS_KEYS = {
  NSMicrophoneUsageDescription:
    'DoNext uses the microphone only when you tap the microphone button, so you can add tasks by speaking.',
  NSSpeechRecognitionUsageDescription:
    'DoNext converts your speech into task text when you use voice input. DoNext does not store audio.',
};

const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function configureIOS() {
  const plist = join(root, 'ios/App/App/Info.plist');
  if (!existsSync(plist)) return console.log('• iOS project not found (run `npx cap add ios` on a Mac) — skipped');
  let xml = readFileSync(plist, 'utf8');
  let changed = false;
  for (const [key, value] of Object.entries(IOS_KEYS)) {
    if (xml.includes(`<key>${key}</key>`)) continue;
    // Insert before the closing </dict> of the root dictionary.
    const idx = xml.lastIndexOf('</dict>');
    if (idx === -1) throw new Error('Unexpected Info.plist format');
    xml = `${xml.slice(0, idx)}\t<key>${key}</key>\n\t<string>${escapeXml(value)}</string>\n${xml.slice(idx)}`;
    changed = true;
  }
  if (changed) writeFileSync(plist, xml);
  console.log(`✓ iOS Info.plist ${changed ? 'updated' : 'already configured'}`);
  addPrivacyManifest();
}

/** Copies native/ios/PrivacyInfo.xcprivacy into the app and registers it as a bundle resource in Xcode. */
function addPrivacyManifest() {
  const source = join(root, 'native/ios/PrivacyInfo.xcprivacy');
  const target = join(root, 'ios/App/App/PrivacyInfo.xcprivacy');
  const pbxproj = join(root, 'ios/App/App.xcodeproj/project.pbxproj');
  if (!existsSync(source) || !existsSync(pbxproj)) return;
  writeFileSync(target, readFileSync(source));

  let proj = readFileSync(pbxproj, 'utf8');
  if (proj.includes('PrivacyInfo.xcprivacy')) return console.log('✓ iOS privacy manifest already registered');

  // Fixed, unique object ids for the file reference and its build-file entry.
  const FILE = 'D0E7A11C0FFEE00000000001';
  const BUILD = 'D0E7A11C0FFEE00000000002';
  const insertAfter = (pattern, text) => {
    const m = proj.match(pattern);
    if (!m) throw new Error(`Unexpected project.pbxproj format (missing ${pattern})`);
    const at = m.index + m[0].length;
    proj = proj.slice(0, at) + text + proj.slice(at);
  };
  insertAfter(/\/\* Begin PBXBuildFile section \*\/\n/, `\t\t${BUILD} /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = ${FILE} /* PrivacyInfo.xcprivacy */; };\n`);
  insertAfter(
    /\/\* Begin PBXFileReference section \*\/\n/,
    `\t\t${FILE} /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };\n`,
  );
  // Add to the App group (next to config.xml) and to the Resources build phase.
  insertAfter(/\t+[0-9A-F]{24} \/\* config\.xml \*\/,\n/, `\t\t\t\t${FILE} /* PrivacyInfo.xcprivacy */,\n`);
  insertAfter(/\t+[0-9A-F]{24} \/\* config\.xml in Resources \*\/,\n/, `\t\t\t\t${BUILD} /* PrivacyInfo.xcprivacy in Resources */,\n`);
  writeFileSync(pbxproj, proj);
  console.log('✓ iOS privacy manifest added to the Xcode project');
}

function configureAndroid() {
  const manifest = join(root, 'android/app/src/main/AndroidManifest.xml');
  if (!existsSync(manifest)) return console.log('• Android project not found (run `npx cap add android`) — skipped');
  let xml = readFileSync(manifest, 'utf8');
  let changed = false;

  if (!xml.includes('android.permission.RECORD_AUDIO')) {
    xml = xml.replace('</manifest>', '    <uses-permission android:name="android.permission.RECORD_AUDIO" />\n</manifest>');
    changed = true;
  }
  // Android 11+ package visibility: required to find the system speech recognition service.
  if (!xml.includes('android.speech.RecognitionService')) {
    xml = xml.replace(
      '</manifest>',
      '    <queries>\n        <intent>\n            <action android:name="android.speech.RecognitionService" />\n        </intent>\n    </queries>\n</manifest>',
    );
    changed = true;
  }
  if (changed) writeFileSync(manifest, xml);
  console.log(`✓ AndroidManifest.xml ${changed ? 'updated' : 'already configured'}`);
}

configureIOS();
configureAndroid();
