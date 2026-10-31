import { Zap } from 'lucide-react';

/**
 * Forge Hero Configuration
 * Central place for hero text, asset paths, and CTA configuration.
 * Set posterSrc to an uploaded still of the video once one exists; until
 * then the hero shows a dark gradient while the video loads.
 */
export const HERO_CONFIG = {
  eyebrow: 'Forge · AI website builder',
  headline: 'Build your site with AI. Keep the code.',
  description:
    'Forge plans, builds and previews your website with a team of AI agents you can watch at work — then hands you clean source code to host anywhere.',
  primaryCta: 'Start a new project',
  secondaryCta: 'See it in action',
  proofPoints: ['Export clean source code', 'The right AI model for each task', 'Every version reversible'],

  videoSrc:
    'https://storage.readdy-site.link/project_files/b7510476-8cf2-4bb3-a2b7-f911993db24b/7fb69914-5f87-4573-bfd9-0b59545d6f4c_Firefly-just-change-the-text-and-put-the-Text--The--to-the-top-of-the-text--Forge---say-on-top-of-th.mp4',
  posterSrc: undefined as string | undefined,
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
