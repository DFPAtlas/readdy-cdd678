/* ──────────────────────────────────────────────────────────────
   Forge Workflows — domain types for the visual workflow builder,
   node catalogue, connections and run records.

   The server (RLS + triggers) is authoritative. These types mirror
   the workflows / workflow_versions / workflow_connections /
   workflow_runs / workflow_step_runs / workflow_approvals tables.
   ────────────────────────────────────────────────────────────── */

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'failed';

export const WORKFLOW_STATUSES: { value: WorkflowStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'failed', label: 'Failed' },
];

export type Workflow = {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  currentVersionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ValidationStatus = 'unvalidated' | 'valid' | 'invalid';

export type WorkflowVersion = {
  id: string;
  workflowId: string;
  versionNumber: number;
  definition: WorkflowDefinition | null;
  validationStatus: ValidationStatus;
  createdAt: string;
};

export type ConnectionType =
  | 'resend' | 'n8n' | 'slack' | 'webhook' | 'supabase' | 'google' | 'custom_api';

export const CONNECTION_TYPES: { value: ConnectionType; label: string; description: string }[] = [
  { value: 'resend', label: 'Resend', description: 'Transactional email delivery.' },
  { value: 'n8n', label: 'n8n', description: 'External n8n automation workflows.' },
  { value: 'slack', label: 'Slack', description: 'Slack incoming webhooks for alerts.' },
  { value: 'webhook', label: 'Approved webhook', description: 'Signed outbound HTTP webhook.' },
  { value: 'supabase', label: 'Supabase', description: 'Server-side Supabase service access.' },
  { value: 'google', label: 'Google services', description: 'Google Sheets, Drive and more.' },
  { value: 'custom_api', label: 'Custom API', description: 'Approved custom HTTP API endpoint.' },
];

export type ConnectionStatus = 'enabled' | 'disabled' | 'error';

export type WorkflowConnection = {
  id: string;
  projectId: string;
  connectionType: ConnectionType;
  displayName: string;
  status: ConnectionStatus;
  createdAt: string;
  updatedAt: string;
};

export type RunStatus =
  | 'queued' | 'running' | 'waiting' | 'succeeded'
  | 'failed' | 'cancelled' | 'expired' | 'dead_letter';

export const RUN_STATUSES: { value: RunStatus; label: string }[] = [
  { value: 'queued', label: 'Queued' },
  { value: 'running', label: 'Running' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'succeeded', label: 'Succeeded' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'expired', label: 'Expired' },
  { value: 'dead_letter', label: 'Dead letter' },
];

export type WorkflowRun = {
  id: string;
  workflowId: string;
  workflowVersionId: string;
  projectId: string;
  triggerType: string;
  triggerReference: string | null;
  status: RunStatus;
  isTest: boolean;
  startedAt: string | null;
  completedAt: string | null;
  safeError: string | null;
};

export type StepStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'cancelled';

export type WorkflowStepRun = {
  id: string;
  workflowRunId: string;
  nodeId: string;
  nodeType: string;
  status: StepStatus;
  attemptNumber: number;
  safeError: string | null;
};

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export type WorkflowApproval = {
  id: string;
  workflowRunId: string;
  nodeId: string;
  status: ApprovalStatus;
  expiresAt: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
};

/* ── Visual builder graph model ── */

export type WorkflowNodeCategory =
  | 'trigger' | 'condition' | 'action' | 'delay' | 'branch' | 'approval' | 'transform' | 'end';

export const NODE_CATEGORIES: { value: WorkflowNodeCategory; label: string }[] = [
  { value: 'trigger', label: 'Trigger' },
  { value: 'condition', label: 'Condition' },
  { value: 'action', label: 'Action' },
  { value: 'delay', label: 'Delay' },
  { value: 'branch', label: 'Branch' },
  { value: 'approval', label: 'Approval' },
  { value: 'transform', label: 'Transform' },
  { value: 'end', label: 'End' },
];

export type WorkflowNode = {
  id: string;
  category: WorkflowNodeCategory;
  type: string;
  label: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
};

export type WorkflowEdge = { id: string; from: string; to: string };

export type WorkflowDefinition = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

/* ── Node catalogue ── */

export type NodeCatalogItem = {
  type: string;
  label: string;
  category: WorkflowNodeCategory;
  description: string;
};

export const TRIGGER_TYPES: NodeCatalogItem[] = [
  { type: 'form_submitted', label: 'Form submitted', category: 'trigger', description: 'A site form is submitted.' },
  { type: 'new_site_member', label: 'New site member', category: 'trigger', description: 'A visitor signs up.' },
  { type: 'member_approved', label: 'Member approved', category: 'trigger', description: 'A pending member is approved.' },
  { type: 'cms_item_created', label: 'CMS item created', category: 'trigger', description: 'A content item is created.' },
  { type: 'cms_item_published', label: 'CMS item published', category: 'trigger', description: 'A content item is published.' },
  { type: 'cms_item_updated', label: 'CMS item updated', category: 'trigger', description: 'A content item is updated.' },
  { type: 'file_uploaded', label: 'File uploaded', category: 'trigger', description: 'A file is uploaded to the site.' },
  { type: 'button_action', label: 'Button action', category: 'trigger', description: 'A configured button is clicked.' },
  { type: 'deployment_completed', label: 'Deployment completed', category: 'trigger', description: 'A build finishes successfully.' },
  { type: 'deployment_failed', label: 'Deployment failed', category: 'trigger', description: 'A build fails.' },
  { type: 'schedule', label: 'Schedule', category: 'trigger', description: 'Run on a recurring schedule.' },
  { type: 'manual_run', label: 'Manual run', category: 'trigger', description: 'Started manually by a member.' },
  { type: 'inbound_webhook', label: 'Inbound webhook', category: 'trigger', description: 'A signed external webhook arrives.' },
];

export const CONDITION_TYPES: NodeCatalogItem[] = [
  { type: 'equals', label: 'Equals', category: 'condition', description: 'Field equals a value.' },
  { type: 'not_equal', label: 'Not equal', category: 'condition', description: 'Field does not equal a value.' },
  { type: 'contains', label: 'Contains', category: 'condition', description: 'Field contains a value.' },
  { type: 'not_contains', label: 'Does not contain', category: 'condition', description: 'Field does not contain a value.' },
  { type: 'greater_than', label: 'Greater than', category: 'condition', description: 'Numeric field is greater than a value.' },
  { type: 'less_than', label: 'Less than', category: 'condition', description: 'Numeric field is less than a value.' },
  { type: 'is_empty', label: 'Is empty', category: 'condition', description: 'Field is empty or missing.' },
  { type: 'is_not_empty', label: 'Is not empty', category: 'condition', description: 'Field has a value.' },
  { type: 'before', label: 'Before', category: 'condition', description: 'Date field is before a point in time.' },
  { type: 'after', label: 'After', category: 'condition', description: 'Date field is after a point in time.' },
  { type: 'in_list', label: 'In list', category: 'condition', description: 'Field is one of a set of values.' },
  { type: 'member_has_role', label: 'Member has role', category: 'condition', description: 'The member holds a site role.' },
  { type: 'form_field_matches', label: 'Form field matches', category: 'condition', description: 'A submitted form field matches.' },
  { type: 'cms_field_matches', label: 'CMS field matches', category: 'condition', description: 'A CMS item field matches.' },
];

export const ACTION_TYPES: NodeCatalogItem[] = [
  { type: 'send_email', label: 'Send email', category: 'action', description: 'Send an email via a connection.' },
  { type: 'send_notification', label: 'Project notification', category: 'action', description: 'Notify project collaborators.' },
  { type: 'send_webhook', label: 'Signed webhook', category: 'action', description: 'POST to a signed outbound webhook.' },
  { type: 'trigger_n8n', label: 'Trigger n8n workflow', category: 'action', description: 'Start an external n8n workflow.' },
  { type: 'create_cms_item', label: 'Create CMS item', category: 'action', description: 'Create a content item.' },
  { type: 'update_cms_item', label: 'Update CMS item', category: 'action', description: 'Update an existing content item.' },
  { type: 'assign_role', label: 'Assign member role', category: 'action', description: 'Assign a site role to a member.' },
  { type: 'remove_role', label: 'Remove member role', category: 'action', description: 'Remove a site role from a member.' },
  { type: 'add_tag', label: 'Add internal tag', category: 'action', description: 'Add an internal tag.' },
  { type: 'create_approval', label: 'Create approval request', category: 'action', description: 'Request human approval.' },
  { type: 'run_ai_task', label: 'Run approved AI task', category: 'action', description: 'Run an approved AI task.' },
  { type: 'generate_document', label: 'Generate document', category: 'action', description: 'Generate a document request.' },
  { type: 'delay', label: 'Add delay', category: 'action', description: 'Wait for a configured duration.' },
  { type: 'stop', label: 'Stop workflow', category: 'action', description: 'Stop execution immediately.' },
];

export const SINGLE_NODES: NodeCatalogItem[] = [
  { type: 'delay', label: 'Delay', category: 'delay', description: 'Wait before continuing.' },
  { type: 'branch', label: 'Branch', category: 'branch', description: 'Split into two paths.' },
  { type: 'approval', label: 'Approval', category: 'approval', description: 'Require human approval to continue.' },
  { type: 'transform', label: 'Transform', category: 'transform', description: 'Reshape data between nodes.' },
  { type: 'end', label: 'End', category: 'end', description: 'Mark the end of a path.' },
];

export function fullCatalog(): NodeCatalogItem[] {
  return [...TRIGGER_TYPES, ...CONDITION_TYPES, ...ACTION_TYPES, ...SINGLE_NODES];
}

/* ── Safe sample variables for the picker ── */

export type VariableDescriptor = {
  path: string;
  sourceType: string;
  dataType: string;
  example: string;
  required: boolean;
};

export const SAMPLE_VARIABLES: VariableDescriptor[] = [
  { path: 'form.email', sourceType: 'form_submitted', dataType: 'string', example: 'jane@example.com', required: true },
  { path: 'form.name', sourceType: 'form_submitted', dataType: 'string', example: 'Jane Doe', required: false },
  { path: 'member.id', sourceType: 'new_site_member', dataType: 'uuid', example: '9f1c…e42a', required: true },
  { path: 'member.email', sourceType: 'new_site_member', dataType: 'string', example: 'jane@example.com', required: true },
  { path: 'cms_item.slug', sourceType: 'cms_item_created', dataType: 'string', example: 'welcome-post', required: true },
  { path: 'cms_item.title', sourceType: 'cms_item_published', dataType: 'string', example: 'Welcome post', required: false },
  { path: 'deployment.url', sourceType: 'deployment_completed', dataType: 'url', example: 'https://site.example.com', required: true },
  { path: 'deployment.error', sourceType: 'deployment_failed', dataType: 'string', example: 'Build exited with code 1', required: false },
];

/* ── Starter templates ── */

export type WorkflowTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  definition: WorkflowDefinition;
};

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'contact_form_email',
    name: 'Contact form → email notification',
    description: 'Notify the team by email whenever a contact form is submitted.',
    category: 'Forms',
    definition: {
      nodes: [
        { id: 'n1', category: 'trigger', type: 'form_submitted', label: 'Form submitted', position: { x: 80, y: 140 }, config: { form: '' } },
        { id: 'n2', category: 'action', type: 'send_email', label: 'Send email', position: { x: 340, y: 140 }, config: { subject: 'New contact submission', connection: '' } },
      ],
      edges: [{ id: 'e1', from: 'n1', to: 'n2' }],
    },
  },
  {
    id: 'form_to_n8n',
    name: 'Form submission → n8n',
    description: 'Forward a form submission to an external n8n workflow.',
    category: 'Integrations',
    definition: {
      nodes: [
        { id: 'n1', category: 'trigger', type: 'form_submitted', label: 'Form submitted', position: { x: 80, y: 140 }, config: { form: '' } },
        { id: 'n2', category: 'action', type: 'trigger_n8n', label: 'Trigger n8n', position: { x: 340, y: 140 }, config: { connection: '' } },
      ],
      edges: [{ id: 'e1', from: 'n1', to: 'n2' }],
    },
  },
  {
    id: 'new_member_welcome',
    name: 'New member → welcome email',
    description: 'Send a welcome email when a new member signs up.',
    category: 'Members',
    definition: {
      nodes: [
        { id: 'n1', category: 'trigger', type: 'new_site_member', label: 'New site member', position: { x: 80, y: 140 }, config: {} },
        { id: 'n2', category: 'action', type: 'send_email', label: 'Welcome email', position: { x: 340, y: 140 }, config: { subject: 'Welcome aboard', connection: '' } },
      ],
      edges: [{ id: 'e1', from: 'n1', to: 'n2' }],
    },
  },
  {
    id: 'member_approval_role',
    name: 'Member approval → assign role',
    description: 'Assign a default role once a member is approved.',
    category: 'Members',
    definition: {
      nodes: [
        { id: 'n1', category: 'trigger', type: 'member_approved', label: 'Member approved', position: { x: 80, y: 140 }, config: {} },
        { id: 'n2', category: 'action', type: 'assign_role', label: 'Assign role', position: { x: 340, y: 140 }, config: { role: '' } },
      ],
      edges: [{ id: 'e1', from: 'n1', to: 'n2' }],
    },
  },
  {
    id: 'cms_review_schedule',
    name: 'CMS scheduled review',
    description: 'Remind the team to review content on a schedule.',
    category: 'Content',
    definition: {
      nodes: [
        { id: 'n1', category: 'trigger', type: 'schedule', label: 'Schedule', position: { x: 80, y: 140 }, config: { frequency: 'daily' } },
        { id: 'n2', category: 'action', type: 'send_notification', label: 'Notify team', position: { x: 340, y: 140 }, config: { message: 'Review pending content' } },
      ],
      edges: [{ id: 'e1', from: 'n1', to: 'n2' }],
    },
  },
  {
    id: 'deployment_failure_alert',
    name: 'Deployment failure → alert',
    description: 'Alert collaborators when a deployment fails.',
    category: 'Publishing',
    definition: {
      nodes: [
        { id: 'n1', category: 'trigger', type: 'deployment_failed', label: 'Deployment failed', position: { x: 80, y: 140 }, config: {} },
        { id: 'n2', category: 'action', type: 'send_notification', label: 'Alert team', position: { x: 340, y: 140 }, config: { message: 'Deployment failed' } },
      ],
      edges: [{ id: 'e1', from: 'n1', to: 'n2' }],
    },
  },
  {
    id: 'ai_content_approval',
    name: 'AI content proposal → approval',
    description: 'Require human approval before applying an AI content proposal.',
    category: 'AI',
    definition: {
      nodes: [
        { id: 'n1', category: 'trigger', type: 'manual_run', label: 'Manual run', position: { x: 80, y: 80 }, config: {} },
        { id: 'n2', category: 'action', type: 'run_ai_task', label: 'Run AI task', position: { x: 340, y: 80 }, config: { task: '' } },
        { id: 'n3', category: 'approval', type: 'approval', label: 'Approval', position: { x: 600, y: 80 }, config: { approver: '' } },
        { id: 'n4', category: 'action', type: 'create_cms_item', label: 'Create CMS item', position: { x: 860, y: 40 }, config: {} },
        { id: 'n5', category: 'end', type: 'end', label: 'End', position: { x: 860, y: 160 }, config: {} },
      ],
      edges: [
        { id: 'e1', from: 'n1', to: 'n2' },
        { id: 'e2', from: 'n2', to: 'n3' },
        { id: 'e3', from: 'n3', to: 'n4' },
        { id: 'e4', from: 'n3', to: 'n5' },
      ],
    },
  },
];

export function emptyDefinition(): WorkflowDefinition {
  return {
    nodes: [
      { id: 'n1', category: 'trigger', type: 'manual_run', label: 'Manual run', position: { x: 80, y: 140 }, config: {} },
    ],
    edges: [],
  };
}