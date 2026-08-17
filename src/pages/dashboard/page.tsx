import { useDashboardData } from '@/hooks/useDashboardData';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';
import { DashboardHeader } from './components/DashboardHeader';
import { WorkspaceOverview } from './components/WorkspaceOverview';
import { ContinueBuilding } from './components/ContinueBuilding';
import { RecentActivity } from './components/RecentActivity';
import { NeedsAttention } from './components/NeedsAttention';
import { QuickActions } from './components/QuickActions';
import { ForgeStatus } from './components/ForgeStatus';

function DashboardSkeleton() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-6 w-56 mb-2" />
        <Skeleton className="h-4 w-40 mb-1" />
        <Skeleton className="h-3 w-72" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}>
            <Skeleton className="h-9 w-9 rounded-lg mb-3" />
            <Skeleton className="h-5 w-12 mb-1.5" />
            <Skeleton className="h-3 w-20" />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <Skeleton className="h-4 w-32 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </Card>
          <Card>
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-16 w-full" />
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-14 w-full" />
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, loading, error, retry } = useDashboardData();

  if (error) {
    return <ErrorState title="Unable to load workspace data" onRetry={retry} />;
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      <DashboardHeader userName={data.userName} />
      <WorkspaceOverview data={data} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ContinueBuilding projects={data.projects} />
          <RecentActivity activity={data.activity} />
        </div>

        <div className="space-y-6">
          <NeedsAttention items={data.attention} />
          <QuickActions />
          <ForgeStatus data={data} />
        </div>
      </div>
    </>
  );
}