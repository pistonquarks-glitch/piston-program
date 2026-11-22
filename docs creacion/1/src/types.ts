export type SupportedLanguage = 'typescript' | 'javascript' | 'python' | 'cpp' | 'rust' | 'html' | 'css' | 'json' | 'dockerfile' | 'markdown';

export interface FileNode {
  id: string;
  name: string;
  path: string;
  content?: string;
  language?: SupportedLanguage;
  type: 'file' | 'folder';
  parentId?: string;
  children?: FileNode[];
  isModified?: boolean;
  isOpen?: boolean;
}

export interface EditorTab {
  id: string;
  fileId: string;
  path: string;
  name: string;
  language: SupportedLanguage;
  isDirty?: boolean;
}

export interface GitCommit {
  id: string;
  hash: string;
  author: string;
  message: string;
  timestamp: string;
  branch: string;
  filesChangedCount: number;
  snapshotFileMap: Record<string, string>; // path -> content
}

export interface GitBranch {
  name: string;
  isCurrent: boolean;
  lastCommitHash: string;
}

export interface GitDiffItem {
  filePath: string;
  status: 'modified' | 'added' | 'deleted';
  originalContent: string;
  currentContent: string;
}

export interface PeerUser {
  id: string;
  name: string;
  avatar: string;
  color: string;
  cursorFileId?: string;
  cursorLine?: number;
  cursorCol?: number;
  status: 'active' | 'idle' | 'editing';
}

export interface ChatMessage {
  id: string;
  sender: string;
  avatar: string;
  text: string;
  timestamp: string;
  fileRef?: string;
  lineRef?: number;
}

export interface TerminalLog {
  id: string;
  text: string;
  type: 'input' | 'output' | 'error' | 'success' | 'system' | 'info';
  timestamp: string;
}

export interface Dependency {
  name: string;
  version: string;
  ecosystem: 'npm' | 'pip' | 'cargo';
  status: 'installed' | 'installing' | 'outdated';
  latestVersion: string;
}

export interface BackupSnapshot {
  id: string;
  name: string;
  timestamp: string;
  sizeKb: number;
  commitHash: string;
  isAuto: boolean;
  fileMap: Record<string, string>;
}

export interface DeploymentConfig {
  id: string;
  name: string;
  target: 'cloud-run' | 'kubernetes' | 'vercel' | 'docker';
  status: 'idle' | 'building' | 'deploying' | 'live' | 'failed';
  liveUrl?: string;
  containerId?: string;
  cpuLimit: string;
  memLimit: string;
  lastDeployedAt?: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  durationMs?: number;
  logs: string[];
}

export interface PerformanceMetric {
  timestamp: string;
  cpu: number; // 0-100%
  memory: number; // MB
  networkMs: number;
  fps: number;
  diskIoKb: number;
  riskIndex: number; // 0-100
}

export interface DiagnosticResult {
  analysis: string;
  rootCause: string;
  suggestedFix: string;
  predictiveRiskScore: number;
  warnings: string[];
  optimizations: string[];
}

export type AiProviderId = 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'groq' | 'mistral' | 'huggingface';

export interface ApiProviderConfig {
  id: AiProviderId;
  name: string;
  iconName: string;
  apiKey: string;
  defaultModel: string;
  availableModels: string[];
  status: 'unconfigured' | 'configured' | 'verified' | 'error';
  lastTestedAt?: string;
  latencyMs?: number;
}

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  timestamp: string;
  provider?: AiProviderId;
  model?: string;
  codeBlocks?: Array<{
    language: string;
    code: string;
    filename?: string;
  }>;
  attachedFile?: {
    name: string;
    content: string;
  };
}

