/** Product and company branding, in one place. */
export const APP_NAME = 'DoNext';
export const COMPANY_NAME = 'DewanTech™';
export const COMPANY_LEGAL_NAME = 'Dewan Global LLC dba DewanTech™';
export const SLOGAN = 'Technology Built with Purpose.';
export const COPYRIGHT = `© ${new Date().getFullYear()} ${COMPANY_LEGAL_NAME}`;

/** Confirm this is your company website. */
export const COMPANY_SITE_URL = 'https://dewantech.com';

/**
 * Business details shown on the Privacy Policy, Terms and Support pages.
 * ─ Fill in every empty value ('') below. Empty values appear on the pages as highlighted placeholders.
 * ─ When everything is filled in AND a lawyer has reviewed the pages, set `reviewedByCounsel: true`.
 *   The "Template — not yet final" banner and review notes then disappear automatically.
 */
export const LEGAL = {
  effectiveDate: '', // e.g. 'November 1, 2026'
  lastUpdated: '', // e.g. 'November 1, 2026'
  businessAddress: '', // registered business address
  supportEmail: '', // e.g. 'support@dewantech.com'
  privacyEmail: '', // e.g. 'privacy@dewantech.com' (can be the same as support)
  hostingProvider: '', // where the API runs, e.g. 'Render' or 'DigitalOcean'
  databaseProvider: 'MongoDB Atlas',
  dataRegion: '', // e.g. 'United States (AWS us-east-1)'
  emailProvider: '', // service that sends password reset emails (your SMTP provider), e.g. 'Amazon SES'
  otherProviders: 'none', // other services that process user data, or 'none'
  logRetention: '', // e.g. '30 days'
  backupRetention: '', // e.g. '30 days'
  minimumAge: '', // e.g. '13'
  governingLaw: '', // e.g. 'the State of New York, USA'
  disputeVenue: '', // e.g. 'the state and federal courts located in New York County, New York'
  pricing: '', // e.g. 'DoNext is currently free to use. We will tell you before introducing any paid features.'
  reviewedByCounsel: false,
};

export type LegalField = Exclude<keyof typeof LEGAL, 'reviewedByCounsel'>;

/** True until every legal detail is filled in and reviewed. */
export const LEGAL_IS_DRAFT =
  !LEGAL.reviewedByCounsel ||
  Object.entries(LEGAL).some(([k, v]) => k !== 'reviewedByCounsel' && typeof v === 'string' && !v.trim());
