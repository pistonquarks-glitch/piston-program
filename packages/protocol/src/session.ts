import { z } from 'zod';
import { ArtifactSchema, ArtifactReferenceSchema, type Artifact, type ArtifactReference } from './artifact.js';
import { PistonErrorCodeSchema, type PistonErrorCode } from './errors.js';

export const SessionStateSchema = z.enum(['created', 'active', 'paused', 'completed', 'failed', 'closed']);
export type SessionState = z.infer<typeof SessionStateSchema>;

export const SessionEventTypeSchema = z.enum([
  'created',
  'state_changed',
  'capability_invoked',
  'capability_completed',
  'capability_failed',
  'artifact_created',
  'artifact_updated',
  'artifact_deleted',
  'message_received',
  'message_sent',
  'error',
  'closed',
]);
export type SessionEventType = z.infer<typeof SessionEventTypeSchema>;

export const SessionEventSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  type: SessionEventTypeSchema,
  timestamp: z.string().datetime(),
  payload: z.record(z.unknown()).optional(),
  correlationId: z.string().uuid().optional(),
});
export type SessionEvent = z.infer<typeof SessionEventSchema>;

export const SessionConfigSchema = z.object({
  productPack: z.string().optional(),
  agentId: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  policies: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
  ttl: z.number().int().positive().optional(),
  maxEvents: z.number().int().positive(),
});
export type SessionConfig = z.infer<typeof SessionConfigSchema>;

export const CreateSessionInputSchema = SessionConfigSchema.extend({
  maxEvents: z.number().int().positive().default(10000),
});
export type CreateSessionInput = z.infer<typeof CreateSessionInputSchema>;

export const SessionSchema = z.object({
  id: z.string().uuid(),
  state: SessionStateSchema.default('created'),
  config: SessionConfigSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  closedAt: z.string().datetime().optional(),
  eventCount: z.number().int().nonnegative().default(0),
  artifacts: z.array(ArtifactSchema).default([]),
  artifactRefs: z.array(ArtifactReferenceSchema).default([]),
  lastError: z.object({
    code: PistonErrorCodeSchema,
    message: z.string(),
    timestamp: z.string().datetime(),
  }).optional(),
});
export type Session = z.infer<typeof SessionSchema>;

export const CreateSessionSchema = CreateSessionInputSchema;
export type CreateSession = z.infer<typeof CreateSessionSchema>;

export const UpdateSessionSchema = SessionSchema.partial().omit({ id: true, createdAt: true });
export type UpdateSession = z.infer<typeof UpdateSessionSchema>;

export function createSession(config: CreateSession = { maxEvents: 10000 }): Session {
  const now = new Date().toISOString();
  const parsedConfig = CreateSessionSchema.parse(config);
  return {
    id: crypto.randomUUID(),
    state: 'created',
    config: parsedConfig,
    createdAt: now,
    updatedAt: now,
    eventCount: 0,
    artifacts: [],
    artifactRefs: [],
  } as Session;
}

export function createSessionEvent(
  sessionId: string,
  type: SessionEventType,
  payload?: Record<string, unknown>,
  correlationId?: string
): SessionEvent {
  return {
    id: crypto.randomUUID(),
    sessionId,
    type,
    timestamp: new Date().toISOString(),
    payload,
    correlationId,
  } as SessionEvent;
}

export const SESSION_TERMINAL_STATES: readonly SessionState[] = ['completed', 'failed', 'closed'] as const;

export function isTerminalState(state: SessionState): boolean {
  return SESSION_TERMINAL_STATES.includes(state);
}

export function canTransition(from: SessionState, to: SessionState): boolean {
  const transitions: Record<SessionState, SessionState[]> = {
    created: ['active', 'closed'],
    active: ['paused', 'completed', 'failed', 'closed'],
    paused: ['active', 'closed'],
    completed: ['closed'],
    failed: ['closed'],
    closed: [],
  };
  return transitions[from]?.includes(to) ?? false;
}