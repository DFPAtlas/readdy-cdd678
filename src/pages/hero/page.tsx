import { Link } from 'react-router-dom';
import { PublicHeader } from '@/components/feature/PublicHeader';
import { HeroVideo } from '@/components/feature/HeroVideo';
import { HeroContent } from '@/components/feature/HeroContent';
import { WorkflowSteps } from '@/components/feature/WorkflowSteps';
import { ArchitectureStrip } from '@/components/feature/ArchitectureStrip';
import { TrustStrip } from '@/components/feature/TrustStrip';
import { Zap, ChevronDown, ArrowUpRight } from 'lucide-react';
import SandboxLayout from '@/layouts/SandboxLayout';
import { ProjectToolbar } from '@/components/sandbox/ProjectToolbar';
import { WorkingPrompt } from '@/components/sandbox/WorkingPrompt';
import { SandboxPreview } from '@/components/sandbox/SandboxPreview';
import { LeftProjectPanel } from '@/components/sandbox/LeftProjectPanel';
import { MasterAgentPanel } from '@/components/sandbox/MasterAgentPanel';
import { BuildActivityDrawer } from '@/components/sandbox/BuildActivityDrawer';

export default function HeroPage() {
  const scrollToSandbox = () => {
    document.querySelector('#sandbox-workspace')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative">
      {/* Public navigation header */}
      <PublicHeader />

      {/* Hero Section — forced dark regardless of app theme */}
      <section
        className="relative min-h-screen flex items-center overflow-hidden"
        style={{ backgroundColor: '#0B0D10' }}
        aria-label="Forge hero"
      >
        {/* Video background */}
        <HeroVideo />

        {/* Layered overlay for readability */}
        <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" aria-hidden="true" />

        {/* Restrained amber warmth near bottom center */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-forge-amber/5 rounded-full blur-[100px]"
          aria-hidden="true"
        />

        {/* Hero content */}
        <HeroContent />

        {/* Scroll indicator */}
        <button
          onClick={scrollToSandbox}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center cursor-pointer group"
          aria-label="Scroll to sandbox workspace"
        >
          {/* Animated vertical line */}
          <div className="relative w-px h-10 bg-white/10 overflow-hidden" aria-hidden="true">
            <div className="absolute top-0 left-0 w-full bg-white/50 animate-scroll-line" style={{ height: '100%' }} />
          </div>
          {/* Circular arrow container */}
          <div className="mt-2 w-8 h-8 rounded-full border border-white/15 flex items-center justify-center group-hover:border-white/30 group-hover:bg-white/5 transition-all duration-300" aria-hidden="true">
            <ChevronDown className="h-3.5 w-3.5 text-white/40 group-hover:text-white/70 transition-colors duration-300 animate-bounce" />
          </div>
        </button>
      </section>

      {/* ─── Sandbox Workspace ─── */}
      <section
        id="sandbox-workspace"
        className="relative py-10 md:py-14 bg-[#060A0F] scroll-mt-16"
      >
        <div className="max-w-[1440px] mx-auto px-5 md:px-8">
          {/* Section header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-forge-amber/25 bg-forge-amber/8 text-xs font-medium text-forge-amber mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-forge-amber animate-pulse" aria-hidden="true" />
                Live Workspace
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Start building right now
              </h2>
              <p className="mt-2 text-sm text-white/50 max-w-lg">
                This is a fully functional workspace. Add pages, generate images, chat with the agent, and watch your site come together in real time.
              </p>
            </div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-white/15 text-white/60 text-sm whitespace-nowrap hover:border-white/30 hover:text-white transition-colors"
            >
              Full workspace
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          {/* Embedded sandbox */}
          <SandboxLayout
            embedded
            toolbar={<ProjectToolbar />}
            leftPanel={<LeftProjectPanel />}
            mainContent={
              <>
                <WorkingPrompt />
                <SandboxPreview />
              </>
            }
            rightPanel={<MasterAgentPanel />}
            bottomDrawer={<BuildActivityDrawer />}
          />
        </div>
      </section>

      {/* Workflow Section */}
      <section id="how-it-works" className="relative py-20 md:py-28 bg-forge-bg scroll-mt-16">
        <WorkflowSteps />
      </section>

      {/* Architecture Pipeline */}
      <ArchitectureStrip />

      {/* Trust Strip */}
      <TrustStrip />

      {/* Bottom footer strip */}
      <footer className="py-12" style={{ backgroundColor: '#0B0D10' }}>
        <div className="max-w-6xl mx-auto px-5 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-forge-amber" aria-hidden="true" />
              <span className="text-sm font-semibold text-white/80">Forge</span>
            </div>
            <p className="text-xs text-white/40 text-center md:text-right">
              Local-first AI development workspace. Your code, your models, your control.
            </p>
          </div>
          <div className="mt-6 pt-6 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[11px] text-white/30">
              &copy; {new Date().getFullYear()} Forge. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-[11px] text-white/30">
              <Link to="/help?topic=privacy" className="hover:text-white/50 transition-colors cursor-pointer">Privacy</Link>
              <Link to="/help?topic=terms" className="hover:text-white/50 transition-colors cursor-pointer">Terms</Link>
              <Link to="/help" className="hover:text-white/50 transition-colors cursor-pointer">Documentation</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}