import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import {
  Undo2, Redo2, Save, CheckCircle2, XCircle, LayoutGrid, Power, Pause, Info,
} from 'lucide-react';
import type { Workflow, WorkflowNode, WorkflowEdge, WorkflowDefinition, WorkflowConnection, ValidationStatus } from '../workflowTypes';
import { WORKFLOW_STATUSES, emptyDefinition } from '../workflowTypes';
import { saveVersion, setWorkflowStatus, listConnections, listVersions } from '../workflowData';
import { NodePalette, NodeInspector, CONFIG_FIELDS, CONDITION_FIELDS } from './WorkflowPalette';

const NODE_W = 180;
const NODE_H = 60;

function validateDefinition(def: WorkflowDefinition): string[] {
  const errors: string[] = [];
  const triggers = def.nodes.filter((n) => n.category === 'trigger');
  if (triggers.length === 0) errors.push('Add a trigger node to start the workflow.');
  if (triggers.length > 1) errors.push('A workflow can only have one trigger node.');
  if (!def.nodes.some((n) => n.category === 'end' || n.type === 'stop')) {
    errors.push('Add an End (or Stop) node to terminate the workflow.');
  }
  const hasIncoming = new Set(def.edges.map((e) => e.to));
  const hasOutgoing = new Set(def.edges.map((e) => e.from));
  def.nodes.forEach((n) => {
    if (n.category !== 'trigger' && !hasIncoming.has(n.id)) errors.push(`"${n.label}" has no incoming connection.`);
    if (n.category !== 'end' && n.type !== 'stop' && !hasOutgoing.has(n.id)) errors.push(`"${n.label}" has no outgoing connection.`);
  });
  def.nodes.forEach((n) => {
    const fields = n.category === 'condition' ? CONDITION_FIELDS : (CONFIG_FIELDS[n.type] ?? []);
    fields.forEach((f) => {
      if (f.required && !String((n.config[f.key] as string) ?? '').trim()) {
        errors.push(`"${n.label}" is missing required field "${f.label}".`);
      }
    });
  });
  return errors;
}

let nodeSeq = 0;
function nextNodeId() {
  nodeSeq += 1;
  return `n${Date.now().toString(36)}_${nodeSeq}`;
}
let edgeSeq = 0;
function nextEdgeId() {
  edgeSeq += 1;
  return `e${Date.now().toString(36)}_${edgeSeq}`;
}

function reachableNodes(def: WorkflowDefinition): WorkflowNode[] {
  const trigger = def.nodes.find((n) => n.category === 'trigger') ?? def.nodes[0];
  if (!trigger) return [];
  const adj = new Map<string, string[]>();
  def.edges.forEach((e) => {
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from)!.push(e.to);
  });
  const seen = new Set<string>();
  const order: WorkflowNode[] = [];
  const stack = [trigger.id];
  const byId = new Map(def.nodes.map((n) => [n.id, n]));
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const node = byId.get(id);
    if (node) order.push(node);
    (adj.get(id) ?? []).forEach((t) => stack.push(t));
  }
  return order;
}

export function WorkflowBuilder({ projectId, workflow, role, onBack, onRefresh }: {
  projectId: string;
  workflow: Workflow;
  role: string | null;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const [definition, setDefinition] = useState<WorkflowDefinition>(emptyDefinition());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewport, setViewport] = useState({ x: 40, y: 40, scale: 1 });
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [connections, setConnections] = useState<WorkflowConnection[]>([]);
  const [validation, setValidation] = useState<ValidationStatus>('unvalidated');
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; text: string; action: () => void } | null>(null);

  const past = useRef<WorkflowDefinition[]>([]);
  const future = useRef<WorkflowDefinition[]>([]);
  const drag = useRef<{ id: string; startX: number; startY: number; nodeX: number; nodeY: number } | null>(null);
  const pan = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const canEdit = role === 'owner' || role === 'admin' || role === 'developer';
  const canAdmin = role === 'owner' || role === 'admin';

  const loadDefinition = useCallback(async () => {
    // Seed the local draft with the latest saved version if one exists.
    const versions = await listVersions(workflow.id);
    if (versions[0]?.definition) setDefinition(versions[0].definition);
  }, [workflow.id]);

  useEffect(() => {
    void loadDefinition();
    void listConnections(projectId).then(setConnections);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow.id, projectId]);

  useEffect(() => {
    setErrors(validateDefinition(definition));
  }, [definition]);

  const commit = useCallback((next: WorkflowDefinition, record = true) => {
    if (record) {
      past.current.push(definition);
      future.current = [];
    }
    setDefinition(next);
  }, [definition]);

  const undo = useCallback(() => {
    if (past.current.length === 0) return;
    future.current.push(definition);
    setDefinition(past.current.pop()!);
  }, [definition]);

  const redo = useCallback(() => {
    if (future.current.length === 0) return;
    past.current.push(definition);
    setDefinition(future.current.pop()!);
  }, [definition]);

  /* ── Pan / zoom ── */

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setViewport((v) => {
        const next = Math.min(1.6, Math.max(0.4, v.scale * (e.deltaY < 0 ? 1.08 : 0.92)));
        return { ...v, scale: next };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (pan.current) {
        const p = pan.current;
        setViewport((v) => ({ ...v, x: p.originX + (e.clientX - p.startX), y: p.originY + (e.clientY - p.startY) }));
        return;
      }
      if (drag.current) {
        const d = drag.current;
        const dx = (e.clientX - d.startX) / viewport.scale;
        const dy = (e.clientY - d.startY) / viewport.scale;
        setDefinition((prev) => ({
          ...prev,
          nodes: prev.nodes.map((n) => (n.id === d.id ? { ...n, position: { x: d.nodeX + dx, y: d.nodeY + dy } } : n)),
        }));
      }
    };
    const onUp = () => { drag.current = null; pan.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [viewport.scale]);

  const startPan = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    pan.current = { startX: e.clientX, startY: e.clientY, originX: viewport.x, originY: viewport.y };
  };

  const startDragNode = (e: React.MouseEvent, node: WorkflowNode) => {
    e.stopPropagation();
    past.current.push(definition);
    future.current = [];
    drag.current = { id: node.id, startX: e.clientX, startY: e.clientY, nodeX: node.position.x, nodeY: node.position.y };
    setSelectedId(node.id);
  };

  /* ── Node / edge ops ── */

  const addNode = (type: string, category: WorkflowNode['category'], label: string) => {
    const count = definition.nodes.length;
    const node: WorkflowNode = {
      id: nextNodeId(),
      category,
      type,
      label,
      position: { x: 120 + (count % 3) * 40, y: 120 + (count % 5) * 60 },
      config: {},
    };
    commit({ ...definition, nodes: [...definition.nodes, node] });
    setSelectedId(node.id);
  };

  const updateNode = (patch: Partial<WorkflowNode>) => {
    if (!selectedId) return;
    commit({ ...definition, nodes: definition.nodes.map((n) => (n.id === selectedId ? { ...n, ...patch } : n)) });
  };

  const deleteNode = () => {
    if (!selectedId) return;
    commit({
      nodes: definition.nodes.filter((n) => n.id !== selectedId),
      edges: definition.edges.filter((e) => e.from !== selectedId && e.to !== selectedId),
    });
    setSelectedId(null);
  };

  const connect = (from: string, to: string) => {
    if (from === to) return;
    if (definition.edges.some((e) => e.from === from && e.to === to)) return;
    const edge: WorkflowEdge = { id: nextEdgeId(), from, to };
    commit({ ...definition, edges: [...definition.edges, edge] });
  };

  const deleteEdge = (id: string) => {
    commit({ ...definition, edges: definition.edges.filter((e) => e.id !== id) });
  };

  const autoLayout = () => {
    const order = reachableNodes(definition);
    const level = new Map<string, number>();
    const triggerId = definition.nodes.find((n) => n.category === 'trigger')?.id ?? order[0]?.id;
    level.set(triggerId, 0);
    definition.edges.forEach((e) => level.set(e.to, Math.max(level.get(e.to) ?? 0, (level.get(e.from) ?? 0) + 1)));
    const byLevel = new Map<number, number>();
    const nodes = definition.nodes.map((n) => {
      const l = level.get(n.id) ?? 0;
      const row = byLevel.get(l) ?? 0;
      byLevel.set(l, row + 1);
      return { ...n, position: { x: 80 + l * (NODE_W + 120), y: 80 + row * (NODE_H + 60) } };
    });
    commit({ ...definition, nodes });
  };

  /* ── Save / activate ── */

  const handleSave = async () => {
    const errs = validateDefinition(definition);
    setErrors(errs);
    const status: ValidationStatus = errs.length === 0 ? 'valid' : 'invalid';
    setValidation(status);
    setSaving(true);
    const res = await saveVersion(workflow.id, definition, status);
    setSaving(false);
    setMessage(res.message);
    if (res.ok) await onRefresh();
  };

  const handleToggleStatus = async () => {
    const next = workflow.status === 'active' ? 'paused' : 'active';
    if (next === 'active') {
      const errs = validateDefinition(definition);
      if (errs.length > 0) {
        setErrors(errs);
        setMessage('Fix validation errors before activating.');
        return;
      }
    }
    const res = await setWorkflowStatus(workflow.id, next);
    setMessage(res.message);
    if (res.ok) await onRefresh();
  };

  const selected = definition.nodes.find((n) => n.id === selectedId) ?? null;
  const statusLabel = WORKFLOW_STATUSES.find((s) => s.value === workflow.status)?.label ?? workflow.status;

  const pointFor = (id: string, side: 'in' | 'out') => {
    const n = definition.nodes.find((x) => x.id === id);
    if (!n) return { x: 0, y: 0 };
    return side === 'out'
      ? { x: n.position.x + NODE_W, y: n.position.y + NODE_H / 2 }
      : { x: n.position.x, y: n.position.y + NODE_H / 2 };
  };

  return (
    <div className="rounded-lg border border-forge-border-subtle bg-forge-panel overflow-hidden">
      {/* Header / toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-forge-border-subtle flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack}>Back</Button>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-forge-text-primary truncate">{workflow.name}</span>
          <Badge variant={workflow.status === 'active' ? 'success' : workflow.status === 'failed' ? 'error' : 'default'}>{statusLabel}</Badge>
        </div>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" icon={<Undo2 className="h-3.5 w-3.5" />} onClick={undo} disabled={past.current.length === 0}>Undo</Button>
        <Button variant="ghost" size="sm" icon={<Redo2 className="h-3.5 w-3.5" />} onClick={redo} disabled={future.current.length === 0}>Redo</Button>
        <Button variant="secondary" size="sm" icon={<LayoutGrid className="h-3.5 w-3.5" />} onClick={autoLayout} disabled={!canEdit}>Auto-layout</Button>
        <Button variant="secondary" size="sm" icon={<Save className="h-3.5 w-3.5" />} onClick={handleSave} loading={saving} disabled={!canEdit}>Save</Button>
        {canAdmin && (
          workflow.status === 'active'
            ? <Button variant="secondary" size="sm" icon={<Pause className="h-3.5 w-3.5" />} onClick={handleToggleStatus}>Pause</Button>
            : <Button size="sm" icon={<Power className="h-3.5 w-3.5" />} onClick={handleToggleStatus}>Activate</Button>
        )}
      </div>

      {/* Validation banner */}
      {(errors.length > 0 || validation !== 'unvalidated') && (
        <div className={`px-3 py-1.5 text-xs flex items-center gap-2 border-b ${errors.length > 0 ? 'bg-forge-error/10 text-forge-error border-forge-error/20' : 'bg-forge-success/10 text-forge-success border-forge-success/20'}`}>
          {errors.length > 0 ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          {errors.length > 0 ? `${errors.length} issue${errors.length === 1 ? '' : 's'}: ${errors[0]}` : 'Workflow is valid.'}
        </div>
      )}

      <div className="flex" style={{ height: '62vh' }}>
        <NodePalette onAdd={addNode} />

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="relative flex-1 overflow-hidden bg-forge-bg cursor-grab"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
          onMouseDown={startPan}
        >
          <div className="absolute top-0 left-0" style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`, transformOrigin: '0 0' }}>
            <svg className="absolute top-0 left-0 overflow-visible" width="4000" height="4000" style={{ pointerEvents: 'none' }}>
              {definition.edges.map((e) => {
                const a = pointFor(e.from, 'out');
                const b = pointFor(e.to, 'in');
                return (
                  <line
                    key={e.id}
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke="#f5b942" strokeWidth="1.5"
                    style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                    onClick={() => deleteEdge(e.id)}
                    title="Click to remove connection"
                  />
                );
              })}
            </svg>
            {definition.nodes.map((node) => (
              <div
                key={node.id}
                className={`absolute rounded-md border bg-forge-panel-elevated ${selectedId === node.id ? 'border-forge-amber ring-1 ring-forge-amber/40' : 'border-forge-border'} ${connectingFrom === node.id ? 'ring-2 ring-forge-accent/50' : ''}`}
                style={{ left: node.position.x, top: node.position.y, width: NODE_W, height: NODE_H }}
              >
                {/* input port */}
                {node.category !== 'trigger' && (
                  <button
                    className="absolute -left-2 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-forge-border hover:bg-forge-amber border border-forge-border-subtle cursor-crosshair"
                    onClick={(e) => { e.stopPropagation(); if (connectingFrom) { connect(connectingFrom, node.id); setConnectingFrom(null); } }}
                    aria-label="Connect input"
                  />
                )}
                {/* output port */}
                {node.category !== 'end' && node.type !== 'stop' && (
                  <button
                    className="absolute -right-2 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-forge-amber hover:bg-forge-amber-dim cursor-crosshair"
                    onClick={(e) => { e.stopPropagation(); setConnectingFrom(node.id); }}
                    aria-label="Connect output"
                  />
                )}
                <div
                  className="flex flex-col justify-center h-full px-3 cursor-move"
                  onMouseDown={(e) => startDragNode(e, node)}
                >
                  <div className="text-[10px] uppercase tracking-wide text-forge-text-muted truncate">{node.category}</div>
                  <div className="text-xs font-medium text-forge-text-primary truncate">{node.label}</div>
                </div>
              </div>
            ))}
          </div>
          {connectingFrom && (
            <div className="absolute bottom-3 left-3 text-xs text-forge-amber bg-forge-panel-elevated border border-forge-border rounded px-2 py-1">
              Click an input port to connect (Esc to cancel)
            </div>
          )}
        </div>

        <NodeInspector
          node={selected}
          connections={connections}
          onChange={updateNode}
          onDelete={deleteNode}
        />
      </div>

      {/* Status / message bar */}
      <div className="px-3 py-2 border-t border-forge-border-subtle flex items-center gap-2 text-xs text-forge-text-muted">
        {message && <span className="text-forge-text-secondary">{message}</span>}
        {!message && <span>Drag nodes to move · scroll to zoom · drag background to pan · click ports to connect.</span>}
      </div>

      {/* Execution engine note */}
      <div className="px-3 py-2 border-t border-forge-border-subtle bg-forge-bg flex items-start gap-2 text-xs text-forge-text-muted">
        <Info className="h-3.5 w-3.5 text-forge-amber shrink-0 mt-0.5" />
        <span>This editor saves your workflow configuration, but the execution engine is not active yet — saved workflows do not run automatically. There is no manual “run now” until the engine is wired up.</span>
      </div>

      <ConfirmationModal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => { confirm?.action(); setConfirm(null); }}
        title={confirm?.title ?? ''}
        message={confirm?.text ?? ''}
        variant="danger"
      />
    </div>
  );
}