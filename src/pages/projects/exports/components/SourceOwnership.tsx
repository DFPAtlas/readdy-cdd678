import { Unlock } from 'lucide-react';

export function SourceOwnership() {
  return (
    <div className="rounded-lg border border-forge-amber/30 bg-forge-amber/5 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Unlock className="h-4 w-4 text-forge-amber" />
        <h2 className="text-sm font-semibold text-forge-amber">Built to leave Forge</h2>
      </div>
      <p className="text-sm text-forge-text-secondary">
        Exports are intended to give you a usable project package rather than lock the finished
        build inside the Forge interface.
      </p>
    </div>
  );
}