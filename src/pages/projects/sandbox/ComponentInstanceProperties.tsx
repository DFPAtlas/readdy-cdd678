import { Pencil, Unlink } from 'lucide-react';
import type { CanvasElement, ComponentDefinition, ExposedProperty } from './sandboxPersistence';
import { defaultVariantFor } from './sandboxComponents';

type ComponentInstancePropertiesProps = {
  element: CanvasElement;
  definition: ComponentDefinition;
  instanceCount: number;
  onOverride: (propertyId: string, value: string) => void;
  onResetOverride: (propertyId: string) => void;
  onResetAllOverrides: () => void;
  onSwitchVariant: (variantId: string) => void;
  onEditMaster: () => void;
  onDetach: () => void;
};

export default function ComponentInstanceProperties({
  element,
  definition,
  instanceCount,
  onOverride,
  onResetOverride,
  onResetAllOverrides,
  onSwitchVariant,
  onEditMaster,
  onDetach,
}: ComponentInstancePropertiesProps) {
  const instance = element.component;
  if (!instance) return null;

  const variant = definition.variants.find((entry) => entry.id === instance.variantId) ?? defaultVariantFor(definition);
  const overridden = Object.keys(instance.overrides).filter((key) => instance.overrides[key] !== undefined && instance.overrides[key] !== '');

  return (
    <div className="component-instance-props">
      <div className="cip-heading">
        <span className="cip-title">{definition.name}</span>
        <span className="cip-linked">Linked · {instanceCount} instance{instanceCount === 1 ? '' : 's'}</span>
      </div>

      <label className="cip-field">Variant
        <select value={variant?.id ?? ''} onChange={(event) => onSwitchVariant(event.target.value)}>
          {definition.variants.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}{entry.isDefault ? ' (default)' : ''}</option>)}
        </select>
      </label>

      {definition.exposedProperties.length > 0 && (
        <div className="cip-section">
          <div className="cip-section-head">
            <span>Overrides</span>
            {overridden.length > 0 && <button onClick={onResetAllOverrides}>Reset all</button>}
          </div>
          {definition.exposedProperties.map((prop) => (
            <OverrideField
              key={prop.id}
              prop={prop}
              value={instance.overrides[prop.id] ?? ''}
              onChange={(value) => onOverride(prop.id, value)}
              onReset={() => onResetOverride(prop.id)}
            />
          ))}
        </div>
      )}

      <div className="cip-actions">
        <button onClick={onEditMaster}><Pencil size={13} /> Edit master</button>
        <button className="danger" onClick={onDetach}><Unlink size={13} /> Detach</button>
      </div>
      <p className="asset-hint">Detaching converts this instance into plain editable elements. Later master updates will no longer affect it.</p>
    </div>
  );
}

function OverrideField({ prop, value, onChange, onReset }: { prop: ExposedProperty; value: string; onChange: (value: string) => void; onReset: () => void }) {
  const isOverridden = value !== '';
  return (
    <div className={`cip-override ${isOverridden ? 'overridden' : ''}`}>
      <label>{prop.label}</label>
      <div className="cip-override-row">
        {prop.type === 'toggle' ? (
          <button className={`cip-toggle ${value === 'true' ? 'on' : ''}`} onClick={() => onChange(value === 'true' ? '' : 'true')}>{value === 'true' ? 'On' : 'Off'}</button>
        ) : prop.type === 'color' ? (
          <input type="color" value={value || prop.defaultValue || '#ffffff'} onChange={(event) => onChange(event.target.value)} />
        ) : (
          <input value={value} placeholder={prop.defaultValue || 'Default'} onChange={(event) => onChange(event.target.value)} />
        )}
        {isOverridden && <button className="cip-reset" onClick={onReset} title="Reset override">↺</button>}
      </div>
    </div>
  );
}