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
