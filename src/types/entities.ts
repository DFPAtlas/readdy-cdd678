// ============================================================
// Forge — Core Entity Types
// ============================================================

// --- User & Workspace ---

export interface User {
  id: string;
  email: string;
  displayName: string;
  initials: string;
  avatarUrl?: string;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  sidebarCollapsed: boolean;
  fontSize: 'small' | 'medium' | 'large';
  reducedMotion: boolean;
  keyboardShortcutsEnabled: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
  memberCount: number;
  projectCount: number;
  settings: WorkspaceSettings;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSettings {
  defaultProvider?: string;
  allowExternalModels: boolean;
  storageLimit: number;
}

// --- Project ---

export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  workspaceId: string;
  status: ProjectStatus;
  blueprint?: ProjectBlueprint;
  settings: ProjectSettings;
  stats: ProjectStats;
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = 'draft' | 'active' | 'building' | 'previewing' | 'archived';

export interface ProjectSettings {
  framework: string;
  styling: string;
  outputDir: string;
  previewPort: number;
  autoSave: boolean;
  autoPreview: boolean;
  gitEnabled: boolean;
  environmentVariables: Record<string, string>;
}

export interface ProjectStats {
  fileCount: number;
  assetCount: number;
  buildCount: number;
  versionCount: number;
  lastBuiltAt?: string;
  totalSizeBytes: number;
}

export interface ProjectBlueprint {
  name: string;
  type: 'landing' | 'saas' | 'ecommerce' | 'portfolio' | 'blog' | 'custom';
  pages: BlueprintPage[];
  features: string[];
  techStack: BlueprintTechStack;
}

export interface BlueprintPage {
  path: string;
  title: string;
  description: string;
  sections: string[];
}

export interface BlueprintTechStack {
  framework: string;
  css: string;
  database?: string;
  deployment?: string;
}

// --- Wizard ---

export interface WizardSession {
  id: string;
  projectId?: string;
  currentStep: number;
  totalSteps: number;
  responses: WizardResponse[];
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface WizardResponse {
  step: number;
  question: string;
  answer: string;
  timestamp: string;
}

// --- Conversation & Messages ---

export interface Conversation {
  id: string;
  projectId: string;
  title: string;
  messages: Message[];
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  workingPrompt?: WorkingPrompt;
  toolCalls?: ToolCall[];
  buildPrompts?: BuildPrompt[];
  timestamp: string;
  status: 'sending' | 'sent' | 'error';
}

export interface WorkingPrompt {
  id: string;
  raw: string;
  refined: string;
  tokens: number;
  model: string;
}

export interface BuildPrompt {
  id: string;
  type: 'file-create' | 'file-edit' | 'file-delete' | 'shell' | 'preview';
  payload: Record<string, unknown>;
  status: 'pending' | 'executing' | 'success' | 'error';
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  status: 'pending' | 'running' | 'success' | 'error';
  startedAt: string;
  completedAt?: string;
}

// --- Build ---

export interface Build {
  id: string;
  projectId: string;
  version: string;
  status: BuildStatus;
  tasks: BuildTask[];
  events: BuildEvent[];
  startedAt: string;
  completedAt?: string;
  duration?: number;
}

export type BuildStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled';

export interface BuildTask {
  id: string;
  buildId: string;
  name: string;
  type: string;
  status: BuildStatus;
  startedAt?: string;
  completedAt?: string;
  logs: string[];
}

export interface BuildEvent {
  id: string;
  buildId: string;
  type: string;
  message: string;
  timestamp: string;
}

// --- Agents ---

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  type: 'builder' | 'reviewer' | 'optimizer' | 'deployer' | 'custom';
  model: string;
  systemPrompt: string;
  tools: string[];
  isActive: boolean;
}

export interface AgentRun {
  id: string;
  agentId: string;
  projectId: string;
  conversationId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  toolCalls: ToolCall[];
  messages: Message[];
}

// --- Files & Assets ---

export interface ProjectFile {
  id: string;
  projectId: string;
  path: string;
  name: string;
  extension: string;
  size: number;
  content?: string;
  changes: FileChange[];
  createdAt: string;
  updatedAt: string;
}

export interface FileChange {
  id: string;
  fileId: string;
  type: 'create' | 'edit' | 'delete';
  diff?: string;
  author: 'user' | 'agent' | 'system';
  timestamp: string;
}

export interface ComponentMetadata {
  id: string;
  fileId: string;
  name: string;
  type: string;
  props: Record<string, unknown>;
  children: ComponentMetadata[];
}

export interface VisualEditCommand {
  id: string;
  fileId: string;
  componentId: string;
  action: 'update-prop' | 'add-child' | 'remove-child' | 'reorder';
  payload: Record<string, unknown>;
  status: 'pending' | 'applied' | 'reverted';
}

export interface Asset {
  id: string;
  projectId: string;
  name: string;
  type: 'image' | 'font' | 'video' | 'document' | 'other';
  mimeType: string;
  size: number;
  url?: string;
  altText?: string;
  createdAt: string;
}

// --- Versions & Exports ---

export interface ProjectVersion {
  id: string;
  projectId: string;
  label: string;
  description?: string;
  buildId?: string;
  isCheckpoint: boolean;
  createdAt: string;
}

export interface Preview {
  id: string;
  projectId: string;
  versionId?: string;
  url: string;
  port: number;
  status: 'starting' | 'running' | 'stopped' | 'error';
  startedAt?: string;
}

export interface ExportRecord {
  id: string;
  projectId: string;
  versionId?: string;
  format: 'zip' | 'static' | 'docker';
  status: 'pending' | 'building' | 'completed' | 'failed';
  fileSize?: number;
  downloadUrl?: string;
  createdAt: string;
  completedAt?: string;
}

// --- Providers ---

export interface ProviderConnection {
  id: string;
  provider: 'openai' | 'anthropic' | 'ollama' | 'google' | 'custom';
  label: string;
  isLocal: boolean;
  baseUrl?: string;
  isConnected: boolean;
  models: ProviderModel[];
  lastCheckedAt?: string;
}

export interface ProviderModel {
  id: string;
  name: string;
  provider: string;
  isAvailable: boolean;
  contextWindow: number;
  capabilities: string[];
}

// --- Notifications ---

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'build' | 'agent';
  title: string;
  message: string;
  isRead: boolean;
  projectId?: string;
  actionUrl?: string;
  createdAt: string;
}

// --- System ---

export interface SystemService {
  id: string;
  name: string;
  status: ServiceStatus;
  latency?: number;
  version?: string;
  lastCheckedAt?: string;
  message?: string;
}

export type ServiceStatus = 'online' | 'degraded' | 'offline' | 'unknown';