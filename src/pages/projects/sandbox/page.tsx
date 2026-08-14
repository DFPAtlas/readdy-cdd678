import SandboxLayout from '@/layouts/SandboxLayout';
import { ProjectToolbar } from '@/components/sandbox/ProjectToolbar';
import { WorkingPrompt } from '@/components/sandbox/WorkingPrompt';
import { SandboxPreview } from '@/components/sandbox/SandboxPreview';
import { LeftProjectPanel } from '@/components/sandbox/LeftProjectPanel';
import { MasterAgentPanel } from '@/components/sandbox/MasterAgentPanel';
import { BuildActivityDrawer } from '@/components/sandbox/BuildActivityDrawer';

export default function SandboxPage() {
  return (
    <SandboxLayout
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
  );
}