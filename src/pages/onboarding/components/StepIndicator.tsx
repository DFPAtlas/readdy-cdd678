import { Check } from 'lucide-react';

interface StepIndicatorProps {
  current: number;
  labels: string[];
}

export function StepIndicator({ current, labels }: StepIndicatorProps) {
  const total = labels.length;
  return (
    <div aria-label={`Step ${current} of ${total}`}>
      <ol className="flex items-center gap-1.5 sm:gap-2">
        {labels.map((label, i) => {
          const n = i + 1;
          const isCurrent = n === current;
          const isDone = n < current;
          return (
            <li key={label} className="flex items-center gap-1.5 sm:gap-2">
              <span
                aria-current={isCurrent ? 'step' : undefined}
                className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  isCurrent
                    ? 'bg-forge-amber text-forge-text-inverse'
                    : isDone
                      ? 'bg-forge-amber/20 text-forge-amber'
                      : 'bg-forge-border text-forge-text-muted'
                }`}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : n}
              </span>
              <span
                className={`text-xs whitespace-nowrap hidden sm:inline ${
                  isCurrent ? 'text-forge-text-primary font-medium' : 'text-forge-text-muted'
                }`}
              >
                {label}
              </span>
              {n < total && <span className="h-px w-3 sm:w-6 bg-forge-border" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-forge-text-muted mt-2 sm:hidden">
        Step {current} of {total}
      </p>
    </div>
  );
}