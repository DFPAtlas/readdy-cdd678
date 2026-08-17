import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, Plus, Image, FileText, FileCode, Palette,
  Settings as SettingsIcon, Wrench, Code as CodeIcon,
  Play, ChevronDown, CheckCircle, AlertTriangle,
} from 'lucide-react';
import { useSandboxStore } from '@/stores/sandboxStore';
import { useToast } from '@/components/ui/Toast';
import {
  DropdownMenu, DropdownItem, DropdownDivider, DropdownLabel,
} from '@/components/ui/DropdownMenu';

export function ProjectToolbar() {
  const navigate = useNavigate();
  const toast = useToast();
  const { buildStatus, setBuildStatus, setBuildProgress } = useSandboxStore();
  const [buildMenuOpen, setBuildMenuOpen] = useState(false);

  const showToast = (label: string) => toast.show(`${label} — coming soon`);

  const handleBuild = () => {
    if (buildStatus === 'running') return;
    setBuildStatus('running');
    setBuildProgress(0);

    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 8 + 2;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setBuildStatus('success');
        setBuildProgress(100);
        toast.show('Preview complete — this build was simulated', 'success');
      } else {
        setBuildProgress(p);
      }
    }, 600);
  };

  const buildLabel = buildStatus === 'running' ? 'Building...' : 'Build';

  return (
    <div className="flex items-center gap-1.5 h-[58px] px-3 flex-shrink-0 select-none"
    >
      {/* Project Card */}
      <div className="flex items-center gap-2.5 h-[46px] px-3 rounded-xl border border-forge-border-subtle bg-[linear-gradient(135deg,rgba(18,22,27,0.98),rgba(8,11,15,0.98))] shadow-lg mr-4"
      >
        <div className="flex flex-col">
          <span className="text-[13px] font-bold text-forge-text-primary leading-tight">Preview Project</span>
          <span className="text-[10px] text-forge-text-muted">Demo workspace</span>
        </div>
        <span className="ml-3 text-[11px] text-forge-amber px-2 py-1 rounded-full border border-forge-amber/30 bg-forge-amber/10 whitespace-nowrap">
          Preview
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-forge-border-subtle mx-1"
      />

      {/* Upload File */}
      <ToolbarDropdown icon={<Upload className="h-3.5 w-3.5" />} label="Upload File">
        <DropdownItem onClick={() => showToast('Image upload')}>Image</DropdownItem>
        <DropdownItem onClick={() => showToast('Logo upload')}>Logo</DropdownItem>
        <DropdownItem onClick={() => showToast('Video upload')}>Video</DropdownItem>
        <DropdownItem onClick={() => showToast('PDF upload')}>PDF</DropdownItem>
        <DropdownDivider />
        <DropdownItem onClick={() => showToast('Brand guide upload')}>Brand guide</DropdownItem>
      </ToolbarDropdown>

      {/* Add Asset */}
      <ToolbarDropdown icon={<Plus className="h-3.5 w-3.5" />} label="Add Asset">
        <DropdownItem onClick={() => showToast('Upload asset')}>Upload asset</DropdownItem>
        <DropdownItem onClick={() => showToast('Choose from project')}>Choose from project</DropdownItem>
        <DropdownItem onClick={() => showToast('Generated assets')}>Generated assets</DropdownItem>
        <DropdownDivider />
        <DropdownItem onClick={() => showToast('Icons')}>Icons</DropdownItem>
        <DropdownItem onClick={() => showToast('Fonts')}>Fonts</DropdownItem>
      </ToolbarDropdown>

      {/* Generate Image */}
      <ToolbarDropdown icon={<Image className="h-3.5 w-3.5" />} label="Generate Image">
        <DropdownItem onClick={() => showToast('Hero image')}>Hero image</DropdownItem>
        <DropdownItem onClick={() => showToast('Section image')}>Section image</DropdownItem>
        <DropdownItem onClick={() => showToast('Background')}>Background</DropdownItem>
        <DropdownItem onClick={() => showToast('Product image')}>Product image</DropdownItem>
        <DropdownItem onClick={() => showToast('Illustration')}>Illustration</DropdownItem>
      </ToolbarDropdown>

      {/* Add Page */}
      <ToolbarDropdown icon={<FileText className="h-3.5 w-3.5" />} label="Add Page">
        <DropdownItem onClick={() => showToast('Blank page')}>Blank page</DropdownItem>
        <DropdownItem onClick={() => showToast('Home page')}>Home</DropdownItem>
        <DropdownItem onClick={() => showToast('About page')}>About</DropdownItem>
        <DropdownItem onClick={() => showToast('Services page')}>Services</DropdownItem>
        <DropdownItem onClick={() => showToast('Pricing page')}>Pricing</DropdownItem>
        <DropdownItem onClick={() => showToast('Contact page')}>Contact</DropdownItem>
        <DropdownItem onClick={() => showToast('Custom page')}>Custom</DropdownItem>
      </ToolbarDropdown>

      {/* Add Component */}
      <ToolbarDropdown icon={<FileCode className="h-3.5 w-3.5" />} label="Add Component">
        <DropdownItem onClick={() => showToast('Navigation')}>Navigation</DropdownItem>
        <DropdownItem onClick={() => showToast('Hero')}>Hero</DropdownItem>
        <DropdownItem onClick={() => showToast('Feature grid')}>Feature grid</DropdownItem>
        <DropdownItem onClick={() => showToast('Gallery')}>Gallery</DropdownItem>
        <DropdownItem onClick={() => showToast('Pricing')}>Pricing</DropdownItem>
        <DropdownItem onClick={() => showToast('Testimonials')}>Testimonials</DropdownItem>
        <DropdownItem onClick={() => showToast('FAQ')}>FAQ</DropdownItem>
        <DropdownItem onClick={() => showToast('Contact form')}>Contact form</DropdownItem>
        <DropdownItem onClick={() => showToast('Footer')}>Footer</DropdownItem>
      </ToolbarDropdown>

      {/* Tools */}
      <ToolbarDropdown icon={<Wrench className="h-3.5 w-3.5" />} label="Tools">
        <DropdownItem onClick={() => showToast('Accessibility check')}>Accessibility check</DropdownItem>
        <DropdownItem onClick={() => showToast('SEO check')}>SEO check</DropdownItem>
        <DropdownItem onClick={() => showToast('Responsive check')}>Responsive check</DropdownItem>
        <DropdownItem onClick={() => showToast('Performance check')}>Performance check</DropdownItem>
        <DropdownDivider />
        <DropdownItem onClick={() => showToast('Broken link check')}>Broken link check</DropdownItem>
        <DropdownItem onClick={() => showToast('Secret scan')}>Secret scan</DropdownItem>
      </ToolbarDropdown>

      {/* Code */}
      <ToolbarDropdown icon={<CodeIcon className="h-3.5 w-3.5" />} label="Code">
        <DropdownItem onClick={() => showToast('Open file explorer')}>Open file explorer</DropdownItem>
        <DropdownItem onClick={() => showToast('Open code editor')}>Open code editor</DropdownItem>
        <DropdownDivider />
        <DropdownItem onClick={() => showToast('View changes')}>View changes</DropdownItem>
        <DropdownItem onClick={() => showToast('Compare version')}>Compare version</DropdownItem>
      </ToolbarDropdown>

      {/* Settings */}
      <ToolbarDropdown icon={<SettingsIcon className="h-3.5 w-3.5" />} label="Settings">
        <DropdownItem onClick={() => navigate('/projects/settings')}>Project settings</DropdownItem>
        <DropdownItem onClick={() => showToast('AI routing')}>AI routing</DropdownItem>
        <DropdownItem onClick={() => showToast('Privacy mode')}>Privacy mode</DropdownItem>
        <DropdownItem onClick={() => showToast('Preview settings')}>Preview settings</DropdownItem>
        <DropdownDivider />
        <DropdownItem onClick={() => showToast('Export defaults')}>Export defaults</DropdownItem>
      </ToolbarDropdown>

      <div className="flex-1" />

      {/* Build Status */}
      <div className="hidden md:flex items-center gap-1.5 mr-2"
      >
        {buildStatus === 'success' && (
          <span className="flex items-center gap-1 text-[11px] text-forge-success px-2 py-1 rounded-full border border-forge-success/20 bg-forge-success/10"
          >
            <CheckCircle className="h-3 w-3" />
            Ready
          </span>
        )}
        {buildStatus === 'running' && (
          <span className="flex items-center gap-1 text-[11px] text-forge-amber px-2 py-1 rounded-full border border-forge-amber/20 bg-forge-amber/10"
          >
            <AlertTriangle className="h-3 w-3" />
            Building
          </span>
        )}
      </div>

      {/* Build Button */}
      <div className="relative"
      >
        <button
          onClick={handleBuild}
          disabled={buildStatus === 'running'}
          title="Workspace preview"
          className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-semibold whitespace-nowrap bg-forge-amber text-[#0B0D10] hover:bg-forge-amber/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_26px_rgba(251,191,36,0.24)] cursor-pointer"
        >
          <Play className="h-3 w-3" />
          {buildLabel}
          <ChevronDown
            className="h-3 w-3 ml-0.5"
            onClick={(e) => {
              e.stopPropagation();
              setBuildMenuOpen(!buildMenuOpen);
            }}
          />
        </button>
        {buildMenuOpen && (
          <div className="absolute top-full right-0 mt-1 z-50 min-w-[160px] bg-forge-panel-elevated border border-forge-border rounded-lg shadow-lg py-1"
          >
            <DropdownItem onClick={() => { setBuildMenuOpen(false); showToast('Build & Deploy'); }}>Build & Deploy</DropdownItem>
            <DropdownItem onClick={() => { setBuildMenuOpen(false); showToast('Build & Preview'); }}>Build & Preview</DropdownItem>
            <DropdownDivider />
            <DropdownItem onClick={() => { setBuildMenuOpen(false); showToast('Export'); }}>Export</DropdownItem>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarDropdown({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <DropdownMenu
      trigger={
        <button className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] text-forge-text-secondary hover:text-forge-text-primary hover:bg-forge-hover transition-colors whitespace-nowrap cursor-pointer border border-transparent hover:border-forge-border-subtle"
        >
          {icon}
          <span className="hidden lg:inline">{label}</span>
          <ChevronDown className="h-3 w-3 text-forge-text-muted" />
        </button>
      }
    >
      {children}
    </DropdownMenu>
  );
}