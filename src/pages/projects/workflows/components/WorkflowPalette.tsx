import { useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { WorkflowNode, WorkflowConnection } from '../workflowTypes';
import { NODE_CATEGORIES, TRIGGER_TYPES, CONDITION_TYPES, ACTION_TYPES, SINGLE_NODES } from '../workflowTypes';

/* ── Editable config fields per node type ── */

export type ConfigField = {
  key: string;
  label: string;
  kind: 'text' | 'select';
  options?: string[];
  required: boolean;
  placeholder?: string;
};

export const CONFIG_FIELDS: Record<string, ConfigField[]> = {
  send_email: [
    { key: 'subject', label: 'Subject', kind: 'text', required: true },
    { key: 'connection', label: 'Connection', kind: 'select', required: true },
    { key: 'to', label: 'Recipient', kind: 'text', required: false, placeholder: 'e.g. form.email' },
  ],
  send_webhook: [{ key: 'url', label: 'Webhook URL', kind: 'text', required: true, placeholder: 'https://…' }],
  trigger_n8n: [{ key: 'connection', label: 'Connection', kind: 'select', required: true }],
  assign_role: [{ key: 'role', label: 'Role key', kind: 'text', required: true }],
  remove_role: [{ key: 'role', label: 'Role key', kind: 'text', required: true }],
  create_cms_item: [{ key: 'collection', label: 'Collection', kind: 'text', required: true }],
  update_cms_item: [{ key: 'collection', label: 'Collection', kind: 'text', required: true }],
  run_ai_task: [{ key: 'task', label: 'Task type', kind: 'text', required: true }],
  schedule: [{ key: 'frequency', label: 'Frequency', kind: 'select', options: ['once', 'hourly', 'daily', 'weekly', 'monthly'], required: true }],
  delay: [{ key: 'duration', label: 'Duration', kind: 'text', required: false, placeholder: 'e.g. 5m' }],
  approval: [
    { key: 'approver', label: 'Approver', kind: 'text', required: true },
    { key: 'message', label: 'Request message', kind: 'text', required: false },
  ],
  send_notification: [{ key: 'message', label: 'Message', kind: 'text', required: false }],
  form_submitted: [{ key: 'form', label: 'Form', kind: 'text', required: false }],
};

export const CONDITION_FIELDS: ConfigField[] = [
  { key: 'field', label: 'Field', kind: 'text', required: true, placeholder: 'e.g. form.email' },
  { key: 'value', label: 'Value', kind: 'text', required: false },
];

/* ── Palette ── */

type PaletteItem = { type: string; label: string; description: string };

function Group({ title, items, onAdd }: { title: string; items: PaletteItem[]; onAdd: (item: PaletteItem) => void }) {
  return (
    <div className="mb-4">
      <div className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-forge-text-muted">{title}</div>
      <div className="space-y-0.5">
        {items.map((item) => (
          <button
            key={`${title}-${item.type}`}
            onClick={() => onAdd(item)}
            className="w-full text-left px-2 py-1.5 rounded-md hover:bg-forge-hover group cursor-pointer"
            title={item.description}
          >
            <div className="text-xs text-forge-text-primary whitespace-nowrap">{item.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function NodePalette({ onAdd }: { onAdd: (type: string, category: WorkflowNode['category'], label: string) => void }) {
  return (
    <div className="w-56 shrink-0 border-r border-forge-border-subtle bg-forge-panel p-2 overflow-y-auto">
      <Group title="Triggers" items={TRIGGER_TYPES} onAdd={(i) => onAdd(i.type, 'trigger', i.label)} />
      <Group title="Conditions" items={CONDITION_TYPES} onAdd={(i) => onAdd(i.type, 'condition', i.label)} />
      <Group title="Actions" items={ACTION_TYPES} onAdd={(i) => onAdd(i.type, 'action', i.label)} />
      <Group title="Flow" items={SINGLE_NODES} onAdd={(i) => onAdd(i.type, i.category as WorkflowNode['category'], i.label)} />
    </div>
  );
}

/* ── Inspector ── */

type InspectorProps = {
  node: WorkflowNode | null;
  connections: WorkflowConnection[];
  onChange: (patch: Partial<WorkflowNode>) => void;
  onDelete: () => void;
};

export function NodeInspector({ node, connections, onChange, onDelete }: InspectorProps) {
  const fields = useMemo<ConfigField[]>(() => {
    if (!node) return [];
    if (node.category === 'condition') return CONDITION_FIELDS;
    return CONFIG_FIELDS[node.type] ?? [];
  }, [node]);

  if (!node) {
    return (
      <div className="w-64 shrink-0 border-l border-forge-border-subtle bg-forge-panel p-4">
        <p className="text-xs text-forge-text-muted">Select a node to edit its settings, or drag nodes from the palette to add them.</p>
      </div>
    );
  }

  const categoryLabel = NODE_CATEGORIES.find((c) => c.value === node.category)?.label ?? node.category;

  return (
    <div className="w-64 shrink-0 border-l border-forge-border-subtle bg-forge-panel overflow-y-auto">
      <div className="px-4 py-3 border-b border-forge-border-subtle flex items-center justify-between">
        <span className="text-xs font-semibold text-forge-text-primary">Node settings</span>
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-forge-error">Delete</Button>
      </div>
      <div className="p-4 space-y-3">
        <div className="text-[10px] uppercase tracking-wider text-forge-text-muted">{categoryLabel}</div>
        <div>
          <label className="block text-xs text-forge-text-secondary mb-1">Label</label>
          <Input value={node.label} onChange={(e) => onChange({ label: e.target.value })} />
        </div>
        {fields.map((f) => {
          const value = (node.config[f.key] as string) ?? '';
          if (f.kind === 'select') {
            const options = f.key === 'connection'
              ? connections.map((c) => ({ value: c.displayName, label: c.displayName }))
              : (f.options ?? []).map((o) => ({ value: o, label: o }));
            return (
              <div key={f.key}>
                <label className="block text-xs text-forge-text-secondary mb-1">
                  {f.label}{f.required && <span className="text-forge-error"> *</span>}
                </label>
                <Select
                  options={options}
                  value={value}
                  placeholder={options.length ? 'Select…' : 'No connections yet'}
                  onChange={(e) => onChange({ config: { ...node.config, [f.key]: e.target.value } })}
                  className="w-full"
                />
              </div>
            );
          }
          return (
            <div key={f.key}>
              <label className="block text-xs text-forge-text-secondary mb-1">
                {f.label}{f.required && <span className="text-forge-error"> *</span>}
              </label>
              <Input
                value={value}
                placeholder={f.placeholder}
                onChange={(e) => onChange({ config: { ...node.config, [f.key]: e.target.value } })}
              />
            </div>
          );
        })}
        {fields.length === 0 && <p className="text-xs text-forge-text-muted">No configurable fields for this node.</p>}
      </div>
    </div>
  );
}