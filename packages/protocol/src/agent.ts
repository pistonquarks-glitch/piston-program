import { z } from 'zod';
import { CapabilitySchema, type Capability } from './capability.js';
import { PolicySchema, type Policy } from './policy.js';

export const AgentConfigSchema = z.record(z.unknown());
export type AgentConfig = z.infer<typeof AgentConfigSchema>;

export const AgentManifestSchema = z.object({
  id: z.string().min(1).regex(/^[a-z][a-z0-9-]*$/),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/),
  description: z.string().min(1),
  author: z.string().optional(),
  license: z.string().optional(),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  keywords: z.array(z.string()).default([]),
  capabilities: z.array(z.string()).default([]),
  requiredCapabilities: z.array(z.string()).default([]),
  optionalCapabilities: z.array(z.string()).default([]),
  configSchema: z.object({
    type: z.literal('object'),
    properties: z.record(z.object({
      type: z.string(),
      description: z.string().optional(),
      default: z.unknown().optional(),
      enum: z.array(z.unknown()).optional(),
    })).optional(),
    required: z.array(z.string()).optional(),
  }).optional(),
  defaultConfig: AgentConfigSchema.default({}),
  entryPoint: z.string().optional(),
  runtime: z.enum(['node', 'worker', 'iframe']).default('worker'),
  tags: z.array(z.string()).default([]),
  deprecated: z.boolean().default(false),
});
export type AgentManifest = z.infer<typeof AgentManifestSchema>;

export const AgentInstanceSchema = z.object({
  id: z.string().uuid(),
  manifest: AgentManifestSchema,
  config: AgentConfigSchema,
  sessionId: z.string().uuid(),
  state: z.enum(['initializing', 'ready', 'running', 'paused', 'stopped', 'error']).default('initializing'),
  createdAt: z.string().datetime(),
  startedAt: z.string().datetime().optional(),
  stoppedAt: z.string().datetime().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    timestamp: z.string().datetime(),
  }).optional(),
  metadata: z.record(z.unknown()).default({}),
});
export type AgentInstance = z.infer<typeof AgentInstanceSchema>;

export const AgentEventTypeSchema = z.enum([
  'initialized',
  'started',
  'step',
  'tool_call',
  'tool_result',
  'thinking',
  'message',
  'paused',
  'resumed',
  'stopped',
  'completed',
  'error',
]);
export type AgentEventType = z.infer<typeof AgentEventTypeSchema>;

export const AgentEventSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
  sessionId: z.string().uuid(),
  type: AgentEventTypeSchema,
  timestamp: z.string().datetime(),
  payload: z.record(z.unknown()).optional(),
  correlationId: z.string().uuid().optional(),
});
export type AgentEvent = z.infer<typeof AgentEventSchema>;

export const AgentStepSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
  sessionId: z.string().uuid(),
  stepNumber: z.number().int().positive(),
  type: z.enum(['reasoning', 'tool_call', 'observation', 'final']),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  toolCalls: z.array(z.object({
    capability: z.string(),
    params: z.record(z.unknown()),
    result: z.unknown().optional(),
    error: z.unknown().optional(),
  })).default([]),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  duration: z.number().int().nonnegative().optional(),
  metadata: z.record(z.unknown()).default({}),
});
export type AgentStep = z.infer<typeof AgentStepSchema>;

export function createAgentInstance(
  manifest: AgentManifest,
  config: AgentConfig,
  sessionId: string
): AgentInstance {
  return {
    id: crypto.randomUUID(),
    manifest,
    config,
    sessionId,
    state: 'initializing',
    createdAt: new Date().toISOString(),
    metadata: {},
  } as AgentInstance;
}

export function createAgentEvent(
  agentId: string,
  sessionId: string,
  type: AgentEventType,
  payload?: Record<string, unknown>,
  correlationId?: string
): AgentEvent {
  return {
    id: crypto.randomUUID(),
    agentId,
    sessionId,
    type,
    timestamp: new Date().toISOString(),
    payload,
    correlationId,
  } as AgentEvent;
}

export const BUILTIN_AGENT_CAPABILITIES = [
  'task.decompose',
  'task.plan',
  'code.generate',
  'code.edit',
  'code.review',
  'code.debug',
  'fs.read',
  'fs.write',
  'fs.list',
  'terminal.exec',
  'git.clone',
  'git.commit',
  'git.diff',
  'git.push',
  'git.pull',
] as const;

export type BuiltinAgentCapability = typeof BUILTIN_AGENT_CAPABILITIES[number];