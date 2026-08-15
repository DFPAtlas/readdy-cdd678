/* ──────────────────────────────────────────────────────────────
   Forge Members — domain types for site accounts, roles, profile
   fields and the project-level auth configuration.

   The server (RLS + triggers) is authoritative. These types mirror
   the site_members / site_roles / site_member_roles /
   site_profile_fields / site_profile_values / site_auth_events
   tables and the siteAuth block inside projects.settings.
   ────────────────────────────────────────────────────────────── */

export type SiteMemberStatus = 'pending' | 'invited' | 'active' | 'suspended';

export const SITE_MEMBER_STATUSES: SiteMemberStatus[] = ['pending', 'invited', 'active', 'suspended'];

export type SiteMember = {
  id: string;
  projectId: string;
  authUserId: string | null;
  emailNormalized: string | null;
  displayName: string;
  status: SiteMemberStatus;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string | null;
  roles: SiteRole[];
  profileValues: Record<string, unknown>;
};

export type SiteRole = {
  id: string;
  projectId: string;
  roleKey: string;
  name: string;
  description: string;
  createdAt: string;
};

export type SiteMemberRole = {
  id: string;
  projectId: string;
  siteMemberId: string;
  siteRoleId: string;
  grantedBy: string | null;
  createdAt: string;
};

export type ProfileFieldType =
  | 'text' | 'textarea' | 'select' | 'multiselect'
  | 'date' | 'image' | 'url' | 'tel' | 'boolean';

export const PROFILE_FIELD_TYPES: { value: ProfileFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'select', label: 'Select' },
  { value: 'multiselect', label: 'Multi-select' },
  { value: 'date', label: 'Date' },
  { value: 'image', label: 'Image' },
  { value: 'url', label: 'URL' },
  { value: 'tel', label: 'Telephone' },
  { value: 'boolean', label: 'Boolean' },
];

export type ProfileFieldVisibility = 'private' | 'admin' | 'members' | 'public';

export const PROFILE_FIELD_VISIBILITIES: { value: ProfileFieldVisibility; label: string }[] = [
  { value: 'private', label: 'Private to member' },
  { value: 'admin', label: 'Visible to administrators' },
  { value: 'members', label: 'Visible to other members' },
  { value: 'public', label: 'Public' },
];

export type ProfileFieldConfiguration = {
  options?: string[];
  placeholder?: string;
  helpText?: string;
  maxLength?: number;
};

export type SiteProfileField = {
  id: string;
  projectId: string;
  fieldKey: string;
  fieldType: ProfileFieldType;
  label: string;
  required: boolean;
  memberEditable: boolean;
  visibility: ProfileFieldVisibility;
  configuration: ProfileFieldConfiguration;
  createdAt: string;
  updatedAt: string;
};

export type SiteAuthEvent = {
  id: string;
  projectId: string;
  siteMemberId: string | null;
  eventType: string;
  safeMetadata: Record<string, unknown>;
  createdAt: string;
};

/* ── Auth configuration (stored in projects.settings.siteAuth) ── */

export type SignupMode = 'open' | 'invitation' | 'approval' | 'disabled';

export const SIGNUP_MODES: { value: SignupMode; label: string; description: string }[] = [
  { value: 'open', label: 'Open registration', description: 'Anyone can create an account.' },
  { value: 'invitation', label: 'Invitation only', description: 'Only invited email addresses can sign up.' },
  { value: 'approval', label: 'Admin approval', description: 'New sign-ups require administrator approval.' },
  { value: 'disabled', label: 'Registration disabled', description: 'No new members can join.' },
];

export type AuthMethodKey = 'email_password' | 'magic_link' | 'google' | 'microsoft' | 'apple' | 'github';

export const AUTH_METHODS: { value: AuthMethodKey; label: string; description: string; oauth: boolean }[] = [
  { value: 'email_password', label: 'Email & password', description: 'Traditional sign-in with an email and password.', oauth: false },
  { value: 'magic_link', label: 'Magic link', description: 'Passwordless sign-in via an emailed link.', oauth: false },
  { value: 'google', label: 'Google', description: 'Sign in with a Google account.', oauth: true },
  { value: 'microsoft', label: 'Microsoft', description: 'Sign in with a Microsoft account.', oauth: true },
  { value: 'apple', label: 'Apple', description: 'Sign in with an Apple ID.', oauth: true },
  { value: 'github', label: 'GitHub', description: 'Sign in with a GitHub account.', oauth: true },
];

export type SiteAuthConfig = {
  enabled: boolean;
  signupMode: SignupMode;
  methods: Record<AuthMethodKey, boolean>;
  requireEmailVerification: boolean;
  postSignupDestination: string;
  termsUrl: string;
  privacyUrl: string;
  marketingConsent: boolean;
  allowlistRedirect: string[];
};

export function defaultSiteAuthConfig(): SiteAuthConfig {
  return {
    enabled: false,
    signupMode: 'invitation',
    methods: {
      email_password: true,
      magic_link: false,
      google: false,
      microsoft: false,
      apple: false,
      github: false,
    },
    requireEmailVerification: true,
    postSignupDestination: '',
    termsUrl: '',
    privacyUrl: '',
    marketingConsent: false,
    allowlistRedirect: [],
  };
}

export function siteAuthConfigFromSettings(settings: unknown): SiteAuthConfig {
  const base = defaultSiteAuthConfig();
  if (!settings || typeof settings !== 'object') return base;
  const cfg = (settings as Record<string, unknown>).siteAuth;
  if (!cfg || typeof cfg !== 'object') return base;
  const c = cfg as Partial<SiteAuthConfig>;
  return {
    enabled: typeof c.enabled === 'boolean' ? c.enabled : base.enabled,
    signupMode: (c.signupMode as SignupMode) ?? base.signupMode,
    methods: { ...base.methods, ...(c.methods ?? {}) },
    requireEmailVerification: typeof c.requireEmailVerification === 'boolean' ? c.requireEmailVerification : base.requireEmailVerification,
    postSignupDestination: c.postSignupDestination ?? base.postSignupDestination,
    termsUrl: c.termsUrl ?? base.termsUrl,
    privacyUrl: c.privacyUrl ?? base.privacyUrl,
    marketingConsent: typeof c.marketingConsent === 'boolean' ? c.marketingConsent : base.marketingConsent,
    allowlistRedirect: Array.isArray(c.allowlistRedirect) ? c.allowlistRedirect : base.allowlistRedirect,
  };
}