import type { AiUsage } from './sandboxAiGateway';

function formatResetDate(value?: string): string {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function AiUsageMeter({ usage }: { usage: AiUsage }) {
  const hasQuota = usage.monthlyRequestsRemaining !== undefined || usage.monthlyCreditsRemaining !== undefined;
  if (!hasQuota) return null;

  const plan = usage.planCode ?? 'free';
  const requests = usage.monthlyRequestsRemaining ?? 0;
  const credits = usage.monthlyCreditsRemaining ?? 0;
  const daily = usage.dailyPageRemaining ?? 0;

  return (
    <div className="ai-usage-meter">
      <div className="ai-usage-head">
        <span className="ai-usage-plan">{plan.charAt(0).toUpperCase() + plan.slice(1)} plan</span>
        <span className="ai-usage-reset">Resets {formatResetDate(usage.resetDate)}</span>
      </div>
      <div className="ai-usage-rows">
        <div className="ai-usage-row">
          <span>Monthly requests</span>
          <b>{requests} left</b>
        </div>
        <div className="ai-usage-row">
          <span>Forge credits</span>
          <b>{credits} left</b>
        </div>
        <div className="ai-usage-row">
          <span>This page today</span>
          <b>{daily} left</b>
        </div>
      </div>
    </div>
  );
}