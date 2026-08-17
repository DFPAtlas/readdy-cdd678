import { Zap } from 'lucide-react';

/**
 * Forge Hero Configuration
 * Central place for hero text, asset paths, and CTA configuration.
 * Replace posterSrc and logoSrc when real assets are uploaded.
 */
export const HERO_CONFIG = {
  title: 'Forge',
  tagline: 'Plan. Build. Refine. Deploy.',
  description:
    'The local-first AI development workspace for planning, building, refining, previewing, versioning, and exporting production-ready websites.',
  primaryCta: 'Start a new project',
  secondaryCta: 'Open Forge workspace',
  learnMore: 'See how Forge works',
  privacyIndicators: ['Local-first'],

  // Asset paths — replace with real uploads when available
  videoSrc:
    'https://storage.readdy-site.link/project_files/b7510476-8cf2-4bb3-a2b7-f911993db24b/7fb69914-5f87-4573-bfd9-0b59545d6f4c_Firefly-just-change-the-text-and-put-the-Text--The--to-the-top-of-the-text--Forge---say-on-top-of-th.mp4',
  posterSrc: '/assets/forge-hero-poster.jpg',
  logoSrc: '/assets/forge-logo.png',
  videoAlt: 'Forge workspace cinematic preview',
} as const;

/** Header navigation for the public hero page */
export const PUBLIC_NAV_LINKS = [
  { label: 'Product', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'AI', href: '#ai-agents' },
  { label: 'Use cases', href: '#use-cases' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Documentation', href: '/help' },
] as const;

/** Workflow step definitions */
export const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Plan',
    description: 'Complete the project wizard and create a blueprint.',
    icon: 'ClipboardList',
  },
  {
    step: '02',
    title: 'Build',
    description: 'Work with the Master Agent and submit the final prompt.',
    icon: 'Code',
  },
  {
    step: '03',
    title: 'Refine',
    description: 'Review the live preview and adjust content or layout.',
    icon: 'Eye',
  },
  {
    step: '04',
    title: 'Deploy',
    description: 'Export clean source code ready for your chosen host.',
    icon: 'Rocket',
  },
] as const;

/** Architecture pipeline nodes */
export const ARCHITECTURE_NODES = [
  { label: 'Wizard', icon: 'ClipboardList' },
  { label: 'Master Agent', icon: 'Bot' },
  { label: 'Specialist Agents', icon: 'Users' },
  { label: 'Live Preview', icon: 'MonitorPlay' },
  { label: 'Export', icon: 'Package' },
] as const;

/** Trust strip items */
export const TRUST_ITEMS = [
  { label: 'Local-first by design', icon: 'Shield' },
  { label: 'Your choice of AI providers', icon: 'Cpu' },
  { label: 'Controlled agent tools', icon: 'Settings' },
  { label: 'You own the source code', icon: 'FileCode' },
  { label: 'Reversible version history', icon: 'GitBranch' },
  { label: 'Portable export formats', icon: 'Package' },
] as const;

/** Loading screen rotating statuses */
export const LOADING_STATUSES = [
  'Heating the workspace',
  'Connecting Forge services',
  'Preparing your projects',
  'Opening the workshop',
] as const;

/** Logo fallback component when image is unavailable */
export function ForgeLogoFallback({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: { icon: 20, text: 'text-lg' },
    md: { icon: 28, text: 'text-2xl' },
    lg: { icon: 40, text: 'text-4xl' },
  };
  const s = sizes[size];
  return (
    <div className="flex items-center gap-2.5">
      <Zap className="text-forge-amber" style={{ width: s.icon, height: s.icon }} />
      <span className={`font-bold tracking-tight text-white ${s.text}`}>Forge</span>
    </div>
  );
}
