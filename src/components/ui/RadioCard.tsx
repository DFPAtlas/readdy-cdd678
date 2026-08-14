interface RadioCardProps {
  value: string;
  selected: boolean;
  onChange: (value: string) => void;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export function RadioCard({ value, selected, onChange, label, description, icon, disabled }: RadioCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(value)}
      className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
        selected
          ? 'border-forge-amber bg-forge-amber/5'
          : 'border-forge-border-subtle bg-forge-panel hover:bg-forge-hover'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {icon && <span className="flex-shrink-0 mt-0.5">{icon}</span>}
      <div>
        <div className="text-sm font-medium text-forge-text-primary">{label}</div>
        {description && <div className="text-xs text-forge-text-muted mt-0.5">{description}</div>}
      </div>
    </button>
  );
}