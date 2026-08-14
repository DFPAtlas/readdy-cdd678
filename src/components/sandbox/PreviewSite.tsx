import { useState } from 'react';
import { useSandboxStore } from '@/stores/sandboxStore';

export function PreviewSite() {
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const { buildStatus, buildProgress } = useSandboxStore();

  return (
    <div className="min-h-[740px] bg-[#080C11] text-white font-sans relative"
    >
      {/* Navigation */}
      <nav
        className="flex items-center justify-between px-6 py-5 border-b border-white/[0.08]"
        onMouseEnter={() => setHoveredSection('nav')}
        onMouseLeave={() => setHoveredSection(null)}
        data-section="Navigation"
      >
        <div className="font-extrabold text-lg tracking-tight">Brand</div>
        <div className="flex items-center gap-5 text-xs text-white/40">
          <span className="cursor-pointer hover:text-white/70 transition-colors">Services</span>
          <span className="cursor-pointer hover:text-white/70 transition-colors">About</span>
          <span className="cursor-pointer hover:text-white/70 transition-colors">Contact</span>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="grid md:grid-cols-[1.3fr_0.7fr] gap-7 px-7 pt-10 pb-7 items-center"
        onMouseEnter={() => setHoveredSection('hero')}
        onMouseLeave={() => setHoveredSection(null)}
        data-section="Hero"
      >
        <div>
          <h1 className="text-[clamp(34px,5vw,58px)] font-bold leading-[1.02] mb-4">
            Build smarter.
            <br />
            <span className="text-forge-amber">Ship faster.</span>
          </h1>
          <p className="text-sm text-[#B1B8C0] leading-relaxed max-w-[520px]">
            Plan, build, and deploy production-ready websites with local AI agents.
            Your code, your models, your control — all from one workspace.
          </p>
          <div className="flex flex-wrap gap-2.5 mt-6">
            <button className="px-5 py-2.5 rounded-md bg-forge-amber text-sm font-semibold text-[#0B0D10] hover:bg-forge-amber/90 transition-colors cursor-pointer whitespace-nowrap">
              Start Building
            </button>
            <button className="px-5 py-2.5 rounded-md border border-white/15 text-sm text-white/70 hover:border-white/30 hover:text-white transition-colors cursor-pointer whitespace-nowrap">
              View Docs
            </button>
          </div>
        </div>

        {/* Hero Art */}
        <div
          className="relative aspect-[0.82] rounded-[18px] overflow-hidden border border-forge-amber/30"
          style={{
            background: 'radial-gradient(circle at 70% 20%, rgba(251,191,36,0.58), transparent 28%), linear-gradient(145deg, #111820, #262018 50%, #0A0D11)',
          }}
        >
          <div className="absolute right-[10%] top-[20%] w-[55%] h-[65%] rounded-[18px] bg-gradient-to-b from-white/[0.12] to-white/[0.02]"
          />
          <div className="absolute left-[12%] bottom-[12%] w-[32%] h-[36%] rounded-[18px] bg-gradient-to-b from-white/[0.12] to-white/[0.02]"
          />
        </div>
      </section>

      {/* Booking / Services Section */}
      <section
        className="px-7 pb-8 pt-2"
        onMouseEnter={() => setHoveredSection('services')}
        onMouseLeave={() => setHoveredSection(null)}
        data-section="Services"
      >
        <div className="border border-white/[0.08] bg-[rgba(14,18,23,0.92)] rounded-[14px] p-4">
          <div className="text-sm font-semibold mb-3">Our Services</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {[
              { title: 'Landing Pages', desc: 'High-converting marketing pages' },
              { title: 'SaaS Apps', desc: 'Full-stack web applications' },
              { title: 'E-Commerce', desc: 'Online stores with checkout' },
            ].map((s, i) => (
              <div key={i} className="rounded-[11px] overflow-hidden">
                <div
                  className="h-[130px] rounded-[11px] mb-3"
                  style={{
                    background: 'linear-gradient(145deg, #20262D, #382719, #101419)',
                  }}
                />
                <h4 className="text-sm font-semibold mb-1.5">{s.title}</h4>
                <p className="text-xs text-[#9AA3AD] mb-3">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Build Progress Overlay */}
      {buildStatus === 'running' && (
        <div className="sticky bottom-4 mx-auto w-[calc(100%-40px)] max-w-[760px] flex items-center gap-3.5 px-3.5 py-3 rounded-xl border border-forge-amber/40 bg-[rgba(9,12,16,0.96)] shadow-[0_0_25px_rgba(251,191,36,0.12)]">
          <div className="flex-1">
            <div className="flex items-center justify-between text-[11px] text-[#9AA3AD] mb-1.5">
              <span>Building project...</span>
              <span className="tabular-nums">{Math.round(buildProgress)}%</span>
            </div>
            <div className="h-[6px] bg-[#1c2845] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${buildProgress}%`,
                  background: 'linear-gradient(90deg, var(--tw-colors-forge-amber), #FF9A33)',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}