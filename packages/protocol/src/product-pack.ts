import { z } from 'zod';
import { AgentManifestSchema, type AgentManifest } from './agent.js';
import { PolicySchema, type Policy } from './policy.js';
import { CapabilitySchema, type Capability } from './capability.js';

export const UILayoutSchema = z.object({
  panels: z.array(z.object({
    id: z.string().min(1),
    type: z.enum(['chat', 'editor', 'terminal', 'file-tree', 'artifacts', 'extensions', 'settings', 'custom']),
    position: z.enum(['left', 'right', 'top', 'bottom', 'center', 'overlay']),
    size: z.object({
      width: z.number().optional(),
      height: z.number().optional(),
      minWidth: z.number().optional(),
      minHeight: z.number().optional(),
      maxWidth: z.number().optional(),
      maxHeight: z.number().optional(),
    }).optional(),
    defaultOpen: z.boolean().default(true),
    config: z.record(z.unknown()).optional(),
  })).default([]),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  fontSize: z.number().default(14),
  fontFamily: z.string().optional(),
});
export type UILayout = z.infer<typeof UILayoutSchema>;

export const ProductPackUISchema = z.object({
  layout: UILayoutSchema.default({ panels: [] }),
  defaultAgent: z.string().optional(),
  welcomeMessage: z.string().optional(),
  onboardingSteps: z.array(z.object({
    title: z.string(),
    description: z.string(),
    action: z.string().optional(),
  })).default([]),
});
export type ProductPackUI = z.infer<typeof ProductPackUISchema>;

export const ProductPackManifestSchema = z.object({
  id: z.string().min(1).regex(/^[a-z][a-z0-9-]*$/),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/),
  description: z.string().min(1),
  author: z.string().optional(),
  license: z.string().optional(),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  keywords: z.array(z.string()).default([]),
  agents: z.array(z.string()).default([]),
  agentConfigs: z.record(AgentManifestSchema).optional(),
  extensions: z.array(z.string()).default([]),
  extensionConfigs: z.record(z.record(z.unknown())).optional(),
  policies: z.array(z.string()).default([]),
  policyConfigs: z.record(PolicySchema).optional(),
  capabilities: z.array(z.string()).default([]),
  capabilityConfigs: z.record(CapabilitySchema).optional(),
  ui: ProductPackUISchema.default({}),
  requiredProtocolVersion: z.string().default('1.0.0'),
  minProtocolVersion: z.string().default('1.0.0'),
  deprecated: z.boolean().default(false),
});
export type ProductPackManifest = z.infer<typeof ProductPackManifestSchema>;

export const ProductPackInstanceSchema = z.object({
  id: z.string().uuid(),
  manifest: ProductPackManifestSchema,
  sessionId: z.string().uuid(),
  enabledAgents: z.array(z.string()).default([]),
  enabledExtensions: z.array(z.string()).default([]),
  activePolicies: z.array(z.string()).default([]),
  state: z.enum(['inactive', 'activating', 'active', 'deactivating', 'error']).default('inactive'),
  createdAt: z.string().datetime(),
  activatedAt: z.string().datetime().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    timestamp: z.string().datetime(),
  }).optional(),
});
export type ProductPackInstance = z.infer<typeof ProductPackInstanceSchema>;

export function createProductPackInstance(
  manifest: ProductPackManifest,
  sessionId: string
): ProductPackInstance {
  return {
    id: crypto.randomUUID(),
    manifest,
    sessionId,
    enabledAgents: manifest.agents,
    enabledExtensions: manifest.extensions,
    activePolicies: manifest.policies,
    state: 'inactive',
    createdAt: new Date().toISOString(),
  } as ProductPackInstance;
}

export const BUILTIN_PRODUCT_PACKS = {
  'piston-code': {
    id: 'piston-code',
    name: 'Piston Code',
    version: '0.1.0',
    description: 'Software development product pack',
    agents: ['planner', 'coder', 'reviewer', 'debugger'],
    extensions: ['git', 'terminal', 'filesystem', 'browser', 'mcp-client'],
    policies: ['code-pack'],
    capabilities: ['code.generate', 'code.edit', 'code.review', 'code.debug', 'fs.read', 'fs.write', 'terminal.exec', 'git.clone', 'git.commit', 'git.diff', 'git.push', 'git.pull'],
    agentConfigs: {},
    extensionConfigs: {},
    policyConfigs: {},
    capabilityConfigs: {},
    ui: {
      layout: {
        panels: [
          { id: 'file-tree', type: 'file-tree', position: 'left', size: { width: 280 }, defaultOpen: true },
          { id: 'editor', type: 'editor', position: 'center', defaultOpen: true },
          { id: 'terminal', type: 'terminal', position: 'bottom', size: { height: 200 }, defaultOpen: true },
          { id: 'chat', type: 'chat', position: 'right', size: { width: 360 }, defaultOpen: true },
          { id: 'artifacts', type: 'artifacts', position: 'right', size: { width: 360 }, defaultOpen: false },
        ],
        theme: 'dark',
        fontSize: 14,
      },
      defaultAgent: 'coder',
      welcomeMessage: 'Welcome to Piston Code. Start by describing what you want to build.',
      onboardingSteps: [
        { title: 'Create Session', description: 'Click "New Session" to start', action: 'create-session' },
        { title: 'Describe Task', description: 'Tell the agent what you want to build', action: 'send-message' },
        { title: 'Review & Iterate', description: 'Review generated code and ask for changes', action: 'review-code' },
      ],
    },
    requiredProtocolVersion: '1.0.0',
    minProtocolVersion: '1.0.0',
    deprecated: false,
    keywords: ['code', 'development', 'software', 'programming'],
  },
  'piston-gold': {
    id: 'piston-gold',
    name: 'Piston Gold',
    version: '0.1.0',
    description: 'Document automation product pack',
    agents: ['documenter', 'analyzer', 'summarizer'],
    extensions: ['pdf', 'office', 'web-search'],
    policies: ['gold-pack'],
    capabilities: ['document.generate', 'document.analyze', 'document.summarize', 'pdf.read', 'pdf.write', 'office.read', 'office.write', 'web.search'],
    agentConfigs: {},
    extensionConfigs: {},
    policyConfigs: {},
    capabilityConfigs: {},
    ui: {
      layout: {
        panels: [
          { id: 'document', type: 'editor', position: 'center', defaultOpen: true },
          { id: 'chat', type: 'chat', position: 'right', size: { width: 360 }, defaultOpen: true },
          { id: 'citations', type: 'artifacts', position: 'right', size: { width: 360 }, defaultOpen: false },
        ],
        theme: 'light',
        fontSize: 14,
      },
      defaultAgent: 'documenter',
      welcomeMessage: 'Welcome to Piston Gold. Upload a document or describe what you need.',
      onboardingSteps: [
        { title: 'Upload Document', description: 'Drag and drop a PDF or Office document', action: 'upload-document' },
        { title: 'Analyze', description: 'Ask the agent to analyze or summarize', action: 'analyze-document' },
        { title: 'Generate', description: 'Create new documents from templates', action: 'generate-document' },
      ],
    },
    requiredProtocolVersion: '1.0.0',
    minProtocolVersion: '1.0.0',
    deprecated: false,
    keywords: ['document', 'automation', 'pdf', 'office', 'summarization'],
  },
  'piston-music': {
    id: 'piston-music',
    name: 'Piston Music',
    version: '0.1.0',
    description: 'Audio and MIDI product pack',
    agents: ['composer', 'transcriber', 'stem-splitter'],
    extensions: ['audio-io', 'youtube', 'midi'],
    policies: ['music-pack'],
    capabilities: ['audio.generate', 'audio.transcribe', 'audio.split-stems', 'midi.generate', 'midi.edit', 'youtube.download'],
    agentConfigs: {},
    extensionConfigs: {},
    policyConfigs: {},
    capabilityConfigs: {},
    ui: {
      layout: {
        panels: [
          { id: 'timeline', type: 'custom', position: 'bottom', size: { height: 200 }, defaultOpen: true },
          { id: 'piano-roll', type: 'custom', position: 'center', defaultOpen: true },
          { id: 'library', type: 'file-tree', position: 'left', size: { width: 280 }, defaultOpen: true },
          { id: 'chat', type: 'chat', position: 'right', size: { width: 360 }, defaultOpen: true },
        ],
        theme: 'dark',
        fontSize: 14,
      },
      defaultAgent: 'composer',
      welcomeMessage: 'Welcome to Piston Music. Create, transcribe, or transform audio.',
      onboardingSteps: [
        { title: 'Import Audio', description: 'Load an audio file or YouTube link', action: 'import-audio' },
        { title: 'Compose', description: 'Generate music from a prompt', action: 'compose-music' },
        { title: 'Transcribe', description: 'Convert audio to MIDI or notation', action: 'transcribe-audio' },
      ],
    },
    requiredProtocolVersion: '1.0.0',
    minProtocolVersion: '1.0.0',
    deprecated: false,
    keywords: ['music', 'audio', 'midi', 'composition', 'transcription'],
  },
  'piston-video': {
    id: 'piston-video',
    name: 'Piston Video',
    version: '0.1.0',
    description: 'Video creation product pack',
    agents: ['scriptwriter', 'editor', 'thumbnailer'],
    extensions: ['ffmpeg', 'remotion', 'stock-video'],
    policies: ['video-pack'],
    capabilities: ['video.generate', 'video.edit', 'video.thumbnail', 'script.write', 'ffmpeg.execute', 'remotion.render', 'stock.search'],
    agentConfigs: {},
    extensionConfigs: {},
    policyConfigs: {},
    capabilityConfigs: {},
    ui: {
      layout: {
        panels: [
          { id: 'timeline', type: 'custom', position: 'bottom', size: { height: 200 }, defaultOpen: true },
          { id: 'preview', type: 'custom', position: 'center', defaultOpen: true },
          { id: 'assets', type: 'file-tree', position: 'left', size: { width: 280 }, defaultOpen: true },
          { id: 'chat', type: 'chat', position: 'right', size: { width: 360 }, defaultOpen: true },
          { id: 'render-queue', type: 'custom', position: 'right', size: { width: 360 }, defaultOpen: false },
        ],
        theme: 'dark',
        fontSize: 14,
      },
      defaultAgent: 'scriptwriter',
      welcomeMessage: 'Welcome to Piston Video. Write scripts, edit videos, create thumbnails.',
      onboardingSteps: [
        { title: 'Write Script', description: 'Generate a video script from a topic', action: 'write-script' },
        { title: 'Edit Video', description: 'Assemble clips on the timeline', action: 'edit-video' },
        { title: 'Render', description: 'Export your final video', action: 'render-video' },
      ],
    },
    requiredProtocolVersion: '1.0.0',
    minProtocolVersion: '1.0.0',
    deprecated: false,
    keywords: ['video', 'editing', 'ffmpeg', 'remotion', 'thumbnail'],
  },
} as const satisfies Record<string, ProductPackManifest>;

export type BuiltinProductPackId = keyof typeof BUILTIN_PRODUCT_PACKS;

export function getBuiltinProductPack(id: BuiltinProductPackId): ProductPackManifest {
  return BUILTIN_PRODUCT_PACKS[id];
}

export function getAllBuiltinProductPacks(): ProductPackManifest[] {
  return Object.values(BUILTIN_PRODUCT_PACKS);
}