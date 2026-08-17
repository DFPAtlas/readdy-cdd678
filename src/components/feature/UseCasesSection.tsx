import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  ChevronDown,
  FileText,
  Home,
  LayoutDashboard,
  Sparkles,
  Store,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Content config                                                      */
/* ------------------------------------------------------------------ */

const OTHER_TYPES = [
  'Portfolio Sites',
  'Landing Pages',
  'Membership Platforms',
  'Booking Systems',
  'Knowledge Bases',
  'Admin Portals',
  'Online Communities',
  'Business Tools',
];

/* ------------------------------------------------------------------ */
/* Visual mockups (illustrative only)                                  */
/* ------------------------------------------------------------------ */

function SaaSDashboardMock() {
  const stats = [
    { label: 'Revenue', value: '£12,480' },
    { label: 'Users', value: '1,284' },
    { label: 'Active projects', value: '24' },
  ];
  const bars = [40, 65, 50, 80, 60, 90, 70];
  return (
    <div className="rounded-md border border-forge-border-subtle bg-forge-bg overflow-hidden">
      <div className="flex">
        <div
          className="hidden sm:flex flex-col w-14 shrink-0 border-r border-forge-border-subtle bg-forge-panel p-2 gap-1.5"
          aria-hidden="true"
        >
          <div className="w-full h-5 rounded bg-forge-amber/20" />
          <div className="w-full h-1.5 rounded bg-forge-border/40" />
          <div className="w-full h-1.5 rounded bg-forge-border/40" />
          <div className="w-full h-1.5 rounded bg-forge-border/40" />
          <div className="w-full h-1.5 rounded bg-forge-border/40" />
        </div>
        <div className="flex-1 p-3">
          <div className="grid grid-cols-3 gap-2">
            {stats.map((s) => (
              <div key={s.label} className="rounded bg-forge-panel border border-forge-border-subtle p-2">
                <div className="text-[9px] text-forge-text-muted truncate">{s.label}</div>
                <div className="text-xs font-semibold text-forge-text-primary">{s.value}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 rounded bg-forge-panel border border-forge-border-subtle p-2">
            <div className="flex items-end gap-1 h-14" aria-hidden="true">
              {bars.map((h, i) => (
                <div key={i} className="flex-1 rounded-sm bg-forge-amber/50" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageTreeMock() {
  const pages = [
    { label: 'Home', icon: Home, active: true },
    { label: 'Services', icon: FileText, active: false },
    { label: 'About', icon: FileText, active: false },
    { label: 'Case Studies', icon: FileText, active: false },
    { label: 'Contact', icon: FileText, active: false },
  ];
  return (
    <div className="rounded-md border border-forge-border-subtle bg-forge-bg p-3">
      <div className="text-[10px] uppercase tracking-widest text-forge-text-muted mb-2">Pages</div>
      <div className="space-y-1">
        {pages.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.label}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
                p.active ? 'bg-forge-amber/10 text-forge-amber' : 'text-forge-text-secondary'
              }`}
            >
              <Icon className="h-3 w-3" aria-hidden="true" />
              {p.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MarketplaceMock() {
  const listings = [
    { name: 'Studio rental', price: '£45 / day' },
    { name: 'Design session', price: '£120 / hr' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {listings.map((l) => (
        <div key={l.name} className="rounded-md border border-forge-border-subtle bg-forge-bg p-2">
          <div className="h-10 rounded bg-forge-panel border border-forge-border-subtle mb-2" aria-hidden="true" />
          <div className="text-[10px] text-forge-text-primary truncate">{l.name}</div>
          <div className="text-[9px] text-forge-amber">{l.price}</div>
        </div>
      ))}
    </div>
  );
}

function PortalSidebarMock() {
  const items = ['Overview', 'Projects', 'Documents', 'Messages', 'Billing'];
  return (
    <div className="rounded-md border border-forge-border-subtle bg-forge-bg p-2">
      <div className="flex flex-col gap-1">
        {items.map((item, i) => (
          <div
            key={item}
            className={`px-2 py-1.5 rounded text-[11px] ${
              i === 0 ? 'bg-forge-amber/10 text-forge-amber' : 'text-forge-text-muted'
            }`}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function TableMock() {
  const rows: [string, string, string][] = [
    ['Order #1024', 'Paid', '£320'],
    ['Order #1023', 'Pending', '£86'],
    ['Order #1022', 'Paid', '£1,204'],
  ];
  return (
    <div className="rounded-md border border-forge-border-subtle bg-forge-bg overflow-hidden">
      <div className="grid grid-cols-3 px-2 py-1.5 bg-forge-panel border-b border-forge-border-subtle text-[9px] uppercase tracking-wider text-forge-text-muted">
        <span>Order</span>
        <span>Status</span>
        <span>Total</span>
      </div>
      {rows.map((r, i) => (
        <div
          key={i}
          className="grid grid-cols-3 px-2 py-1.5 text-[10px] border-b border-forge-border-subtle last:border-0"
        >
          <span className="text-forge-text-primary truncate">{r[0]}</span>
          <span className={r[1] === 'Paid' ? 'text-forge-success' : 'text-forge-warning'}>{r[1]}</span>
          <span className="text-forge-text-secondary">{r[2]}</span>
        </div>
      ))}
    </div>
  );
}

function AiChatMock() {
  return (
    <div className="rounded-md border border-forge-border-subtle bg-forge-bg p-3 space-y-1">
      <div className="text-[9px] uppercase tracking-wider text-forge-text-muted mb-1">Flow</div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-forge-text-secondary w-14 shrink-0">User</span>
        <div className="flex-1 rounded bg-forge-panel border border-forge-border-subtle px-2 py-1 text-[10px] text-forge-text-primary">
          Request
        </div>
      </div>
      <div className="flex justify-center text-forge-amber/70" aria-hidden="true">
        <ChevronDown className="h-3 w-3" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-forge-text-secondary w-14 shrink-0">AI</span>
        <div className="flex-1 rounded bg-forge-panel border border-forge-border-subtle px-2 py-1 text-[10px] text-forge-text-primary">
          Action
        </div>
      </div>
      <div className="flex justify-center text-forge-amber/70" aria-hidden="true">
        <ChevronDown className="h-3 w-3" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-forge-text-secondary w-14 shrink-0">Result</span>
        <div className="flex-1 rounded bg-forge-panel border border-forge-amber/25 px-2 py-1 text-[10px] text-forge-amber">
          Result
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

type UseCaseCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  large?: boolean;
  children: React.ReactNode;
};

function UseCaseCard({ icon: Icon, title, description, large = false, children }: UseCaseCardProps) {
  return (
    <div className="group relative flex flex-col rounded-lg border border-forge-border-subtle bg-forge-panel p-5 md:p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-forge-amber/30">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="flex items-center justify-center w-8 h-8 rounded-md bg-forge-amber/10 text-forge-amber transition-colors group-hover:bg-forge-amber/20">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <h3
          className={`font-semibold text-forge-text-primary ${
            large ? 'text-base md:text-lg' : 'text-sm md:text-base'
          }`}
        >
          {title}
        </h3>
      </div>
      <p className="text-sm text-forge-text-secondary leading-relaxed mb-4">{description}</p>
      <div className="mt-auto">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export function UseCasesSection() {
  const scrollToWorkspace = () => {
    document.querySelector('#sandbox-workspace')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      id="use-cases"
      className="relative py-20 md:py-28 bg-forge-bg scroll-mt-16"
    >
      <div className="max-w-6xl mx-auto px-5 md:px-6">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-14 md:mb-20">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-forge-amber mb-4">
            Build More Than Landing Pages
          </span>
          <h2 className="text-2xl md:text-4xl font-bold text-forge-text-primary tracking-tight">
            What will you build with Forge?
          </h2>
          <p className="mt-4 text-forge-text-secondary text-sm md:text-base leading-relaxed">
            From focused business websites to full application interfaces, Forge gives you one
            workspace for planning, building, refining and managing the project.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
          <div className="md:col-span-2 lg:col-span-7">
            <UseCaseCard
              icon={LayoutDashboard}
              title="Build the product, not just the homepage"
              description="Create dashboards, account areas, onboarding flows, pricing experiences and application interfaces from one organised project."
              large
            >
              <SaaSDashboardMock />
            </UseCaseCard>
          </div>

          <div className="md:col-span-2 lg:col-span-5">
            <UseCaseCard
              icon={Building2}
              title="From idea to complete business presence"
              description="Plan and assemble professional multi-page websites with reusable components, structured content and responsive layouts."
              large
            >
              <PageTreeMock />
            </UseCaseCard>
          </div>

          <div className="lg:col-span-3">
            <UseCaseCard
              icon={Store}
              title="Marketplaces"
              description="Design product, service, booking or listing experiences with structured pages and application-ready interfaces."
            >
              <MarketplaceMock />
            </UseCaseCard>
          </div>

          <div className="lg:col-span-3">
            <UseCaseCard
              icon={Users}
              title="Client Portals"
              description="Design organised customer areas for projects, documents, messages, subscriptions and account information."
            >
              <PortalSidebarMock />
            </UseCaseCard>
          </div>

          <div className="lg:col-span-3">
            <UseCaseCard
              icon={Wrench}
              title="Internal Tools"
              description="Build operational dashboards, admin interfaces and workflow tools for teams and businesses."
            >
              <TableMock />
            </UseCaseCard>
          </div>

          <div className="lg:col-span-3">
            <UseCaseCard
              icon={Sparkles}
              title="AI-Powered Products"
              description="Design applications where AI becomes part of the user experience rather than a separate tool."
            >
              <AiChatMock />
            </UseCaseCard>
          </div>
        </div>

        {/* Secondary row */}
        <div className="mt-12 md:mt-14">
          <div className="text-center mb-4">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-forge-text-muted">
              Other Project Types
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {OTHER_TYPES.map((type) => (
              <span
                key={type}
                className="px-3 py-1.5 rounded-full border border-forge-border-subtle bg-forge-panel text-xs text-forge-text-secondary whitespace-nowrap transition-colors hover:border-forge-amber/25 hover:text-forge-text-primary"
              >
                {type}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-14 md:mt-16 text-center">
          <h3 className="text-xl md:text-2xl font-bold text-forge-text-primary">
            Your idea doesn&apos;t need to fit a template.
          </h3>
          <p className="mt-3 text-forge-text-secondary text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            Start with the project you actually want to create and use Forge to organise the build.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/projects/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-forge-amber text-forge-text-inverse font-medium text-sm hover:bg-forge-amber-dim transition-colors whitespace-nowrap cursor-pointer"
            >
              Start a project
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={scrollToWorkspace}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-forge-border-subtle text-forge-text-primary font-medium text-sm hover:border-forge-amber/25 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
            >
              Explore Forge
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}