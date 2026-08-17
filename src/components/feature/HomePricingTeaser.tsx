import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Box,
  Check,
  Cpu,
  FileCode2,
  Layers3,
  Rocket,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Content config — non-numeric teaser only.                          */
/* Real plans/prices live in the pricing page; do not duplicate them. */
/* ------------------------------------------------------------------ */

type TeaserPlan = {
  icon: LucideIcon;
  name: string;
  audience: string;
  description: string;
  bullets: string[];
  popular?: boolean;
};

const TEASER_PLANS: TeaserPlan[] = [
  {
    icon: Box,
    name: 'Free',
    audience: 'For getting started',
    description: 'Core Forge workspace access with trial AI credits and preview-only publishing.',
    bullets: [
      '3 pages per site',
      '150 trial credits',
      'Preview only',
    ],
  },
  {
    icon: Rocket,
    name: 'Starter',
    audience: 'For your first real build',
    description: 'More capacity to build and publish your first live Forge site.',
    bullets: [
      '10 pages per site',
      '1,000 AI credits',
      '1 published site',
    ],
  },
  {
    icon: Layers3,
    name: 'Builder',
    audience: 'For regular builders',
    description: 'Broader capacity and capabilities for day-to-day building.',
    bullets: [
      '30 pages per site',
      '3,000 AI credits',
      '5 published sites',
    ],
    popular: true,
  },
];

const COMPARISON_CATEGORIES = [
  'Projects',
  'AI usage',
  'Pages',
  'Storage',
  'Versions',
  'Exports',
];

const CONFIDENCE_ITEMS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: FileCode2, title: 'Code Ownership', text: 'Your project remains yours.' },
  { icon: Cpu, title: 'Flexible AI', text: 'Use supported Forge AI provider options.' },
  { icon: TrendingUp, title: 'Built to Grow', text: 'Move to a larger plan as your project needs increase.' },
];

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export function HomePricingTeaser() {
  return (
    <section
      id="pricing-teaser"
      className="relative py-20 md:py-28 bg-forge-bg border-y border-forge-border-subtle scroll-mt-16"
    >
      {/* Restrained amber warmth near the top, kept subtle */}
      <div
        className="absolute inset-x-0 top-0 h-40 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(60% 100% at 50% 0%, hsl(var(--brand-amber) / 0.07), transparent 70%)',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-5 md:px-6">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-14 md:mb-16">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-forge-amber mb-4">
            Choose Your Forge
          </span>
          <h2 className="text-2xl md:text-4xl font-bold text-forge-text-primary tracking-tight">
            Start where you are. Scale when you need more.
          </h2>
          <p className="mt-4 text-forge-text-secondary text-sm md:text-base leading-relaxed">
            Choose the Forge plan that matches how you build. Compare full allowances, features and
            billing options on the pricing page.
          </p>
        </div>

        {/* Plan teaser cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          {TEASER_PLANS.map((plan) => {
            const Icon = plan.icon;
            return (
              <article
                key={plan.name}
                className={`relative flex flex-col rounded-lg border p-6 transition-all duration-300 hover:-translate-y-0.5 ${
                  plan.popular
                    ? 'border-forge-amber/35 bg-forge-panel'
                    : 'border-forge-border-subtle bg-forge-panel/60 hover:border-forge-amber/25'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-forge-amber text-forge-text-inverse text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap">
                    Most Popular
                  </span>
                )}

                <span
                  className={`flex items-center justify-center w-10 h-10 rounded-md mb-4 ${
                    plan.popular ? 'bg-forge-amber/15 text-forge-amber' : 'bg-forge-border/40 text-forge-text-secondary'
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>

                <h3 className="text-lg font-semibold text-forge-text-primary">{plan.name}</h3>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-forge-amber/80">
                  {plan.audience}
                </p>
                <p className="mt-3 text-sm text-forge-text-secondary leading-relaxed">
                  {plan.description}
                </p>

                <ul className="mt-5 space-y-2.5">
                  {plan.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2.5 text-sm text-forge-text-secondary">
                      <Check className="h-4 w-4 text-forge-amber shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-6">
                  <Link
                    to="/pricing"
                    className={`inline-flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-md font-medium text-sm transition-colors whitespace-nowrap cursor-pointer ${
                      plan.popular
                        ? 'bg-forge-amber text-forge-text-inverse hover:bg-forge-amber-dim'
                        : 'border border-forge-border-subtle text-forge-text-primary hover:border-forge-amber/25 hover:text-white'
                    }`}
                  >
                    View plans
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        {/* Feature comparison preview */}
        <div className="mt-12 md:mt-14 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {COMPARISON_CATEGORIES.map((cat) => (
              <span
                key={cat}
                className="px-3 py-1.5 rounded-full border border-forge-border-subtle bg-forge-panel text-xs text-forge-text-secondary whitespace-nowrap"
              >
                {cat}
              </span>
            ))}
          </div>
          <Link
            to="/pricing"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-forge-amber hover:text-forge-amber-dim transition-colors cursor-pointer"
          >
            Compare project limits, AI allowances, storage and included features
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {/* Confidence strip */}
        <div className="mt-14 md:mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CONFIDENCE_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex flex-col items-center text-center rounded-lg border border-forge-border-subtle bg-forge-panel/60 px-5 py-6"
              >
                <span className="flex items-center justify-center w-9 h-9 rounded-md bg-forge-amber/10 text-forge-amber mb-3">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h4 className="text-sm font-semibold text-forge-text-primary">{item.title}</h4>
                <p className="mt-1.5 text-xs text-forge-text-secondary leading-relaxed">{item.text}</p>
              </div>
            );
          })}
        </div>

        {/* Final mini CTA */}
        <div className="mt-14 md:mt-16 text-center">
          <h3 className="text-xl md:text-2xl font-bold text-forge-text-primary">
            Need the full breakdown?
          </h3>
          <p className="mt-3 text-forge-text-secondary text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            See all five plans — Free, Starter, Builder, Pro and Agency — with full allowances and
            included features before choosing.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-forge-amber text-forge-text-inverse font-medium text-sm hover:bg-forge-amber-dim transition-colors whitespace-nowrap cursor-pointer"
            >
              Compare all plans
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/help"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-forge-border-subtle text-forge-text-primary font-medium text-sm hover:border-forge-amber/25 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
            >
              Pricing questions?
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}