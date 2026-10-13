/** Product and company branding, in one place. */
export const APP_NAME = 'DoNext';
export const COMPANY_NAME = 'DewanTech™';
export const COMPANY_LEGAL_NAME = 'Dewan Global LLC DBA DewanTech™';
export const SLOGAN = 'Technology Built with Purpose.';
export const COPYRIGHT = `© ${new Date().getFullYear()} ${COMPANY_LEGAL_NAME}`;

/** Confirm this is your company website. */
export const COMPANY_SITE_URL = 'https://dewantech.com';

/** Open-source repository (shown in the demo banner and footer). */
export const REPO_URL = 'https://github.com/DewanTechUS/donext';

/**
 * Business details shown on the Privacy Policy, Terms and Support pages.
 * ─ Fill in every empty value ('') below. Empty values appear on the pages as highlighted placeholders.
 * ─ Values marked "suggested" are common choices for a small app; change them if they don't fit you.
 * ─ When everything is filled in and you have read both pages, set `finalized: true`.
 *   The "Draft" banner then disappears. (A lawyer review is a good idea once you can afford it.)
 */
export const LEGAL = {
  effectiveDate: '', // the day you go live, e.g. 'November 1, 2026'
  lastUpdated: '', // same as effectiveDate at first; change it whenever you edit the policies
  businessAddress: '', // OPTIONAL — business address, or leave empty (individuals don't need to publish one)
  supportEmail: 'support@dewantech.com',
  infoEmail: 'info@dewantech.com', // general information and licensing
  privacyEmail: 'support@dewantech.com', // use a dedicated privacy@ address here if you create one
  hostingProvider: '', // where the API runs, e.g. 'Render' or 'DigitalOcean'
  databaseProvider: 'MongoDB Atlas',
  dataRegion: '', // shown in Atlas → your cluster, e.g. 'United States (AWS us-east-1)'
  emailProvider: '', // service that sends password reset emails (your SMTP provider), e.g. 'Amazon SES'
  otherProviders: 'none', // other services that process user data, or 'none'
  logRetention: '30 days', // suggested
  backupRetention: '30 days', // suggested
  minimumAge: '13', // suggested (U.S. COPPA). Use '16' if you target the EU.
  governingLaw: '', // the state your LLC is registered in, e.g. 'the State of New York, USA'
  disputeVenue: '', // e.g. 'the state and federal courts located in New York County, New York'
  pricing:
    'DoNext is currently free to use. If we introduce paid features, we will tell you in advance and you can choose whether to use them.', // suggested
  finalized: false,
};

export type LegalField = Exclude<keyof typeof LEGAL, 'finalized'>;

/** Details that may stay empty without keeping the pages in draft. */
const OPTIONAL = new Set(['finalized', 'businessAddress']);

/** True until every legal detail is filled in and the owner has marked the pages as final. */
export const LEGAL_IS_DRAFT =
  !LEGAL.finalized || Object.entries(LEGAL).some(([k, v]) => !OPTIONAL.has(k) && typeof v === 'string' && !v.trim());
