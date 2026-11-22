import { z } from 'zod';
import { ArtifactSchema, ArtifactReferenceSchema, type Artifact, type ArtifactReference } from './artifact.js';
import { SessionEventSchema, type SessionEvent } from './session.js';
import { PistonErrorCodeSchema, type PistonErrorCode } from './errors.js';

export const CapabilityTypeSchema = z.enum(['model', 'tool', 'storage', 'resource', 'prompt']);
export type CapabilityType = z.infer<typeof CapabilityTypeSchema>;

export const ExecutionLocationSchema = z.enum(['local', 'remote', 'hybrid']);
export type ExecutionLocation = z.infer<typeof ExecutionLocationSchema>;

export const CapabilityPermissionSchema = z.enum([
  'fs:read',
  'fs:write',
  'fs:delete',
  'fs:list',
  'net:fetch',
  'net:listen',
  'process:spawn',
  'process:exec',
  'secrets:read',
  'secrets:write',
  'system:info',
]);
export type CapabilityPermission = z.infer<typeof CapabilityPermissionSchema>;

export const CapabilityParameterSchema = z.object({
  name: z.string().min(1),
  type: z.string(),
  description: z.string().optional(),
  required: z.boolean().default(false),
  default: z.unknown().optional(),
  enum: z.array(z.unknown()).optional(),
});
export type CapabilityParameter = z.infer<typeof CapabilityParameterSchema>;

export const CapabilitySchema = z.object({
  name: z.string().min(1).regex(/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$/),
  version: z.string().regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/),
  type: CapabilityTypeSchema,
  description: z.string().min(1),
  parameters: z.array(CapabilityParameterSchema).default([]),
  returns: z.object({
    type: z.string(),
    description: z.string().optional(),
    artifactKind: z.string().optional(),
  }).optional(),
  permissions: z.array(CapabilityPermissionSchema).default([]),
  executionLocation: ExecutionLocationSchema.default('local'),
  timeout: z.number().int().positive().default(30000),
  idempotent: z.boolean().default(false),
  deprecated: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});
export type Capability = z.infer<typeof CapabilitySchema>;

export const CapabilityManifestSchema = CapabilitySchema.extend({
  entryPoint: z.string().optional(),
  dependencies: z.array(z.string()).default([]),
  provides: z.array(z.string()).default([]),
  requires: z.array(z.string()).default([]),
});
export type CapabilityManifest = z.infer<typeof CapabilityManifestSchema>;

export const CapabilityRequestSchema = z.object({
  id: z.string().uuid(),
  capability: z.string(),
  version: z.string().optional(),
  sessionId: z.string().uuid(),
  correlationId: z.string().uuid().optional(),
  params: z.record(z.unknown()).default({}),
  artifacts: z.array(ArtifactReferenceSchema).default([]),
  timeout: z.number().int().positive().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type CapabilityRequest = z.infer<typeof CapabilityRequestSchema>;

export const CapabilityResponseSchema = z.object({
  id: z.string().uuid(),
  requestId: z.string().uuid(),
  sessionId: z.string().uuid(),
  success: z.boolean(),
  result: z.unknown().optional(),
  error: z.object({
    code: PistonErrorCodeSchema,
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }).optional(),
  artifacts: z.array(ArtifactSchema).default([]),
  events: z.array(SessionEventSchema).default([]),
  duration: z.number().int().nonnegative(),
  timestamp: z.string().datetime(),
});
export type CapabilityResponse = z.infer<typeof CapabilityResponseSchema>;

export const CapabilityEventSchema = z.object({
  id: z.string().uuid(),
  capability: z.string(),
  sessionId: z.string().uuid(),
  type: z.enum(['started', 'progress', 'completed', 'failed', 'cancelled']),
  progress: z.number().min(0).max(1).optional(),
  message: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime(),
});
export type CapabilityEvent = z.infer<typeof CapabilityEventSchema>;

export const CapabilityErrorSchema = z.object({
  code: PistonErrorCodeSchema,
  message: z.string(),
  capability: z.string(),
  sessionId: z.string().uuid(),
  requestId: z.string().uuid().optional(),
  recoverable: z.boolean().default(false),
  retryAfter: z.number().int().positive().optional(),
  details: z.record(z.unknown()).optional(),
});
export type CapabilityError = z.infer<typeof CapabilityErrorSchema>;

export function createCapabilityRequest(
  capability: string,
  sessionId: string,
  params: Record<string, unknown> = {},
  artifacts: ArtifactReference[] = [],
  options?: { version?: string; correlationId?: string; timeout?: number }
): CapabilityRequest {
  return {
    id: crypto.randomUUID(),
    capability,
    version: options?.version,
    sessionId,
    correlationId: options?.correlationId,
    params,
    artifacts,
    timeout: options?.timeout,
    metadata: {},
  } as CapabilityRequest;
}

export function createCapabilityResponse(
  request: CapabilityRequest,
  success: boolean,
  resultOrError: { result?: unknown; error?: CapabilityError },
  artifacts: Artifact[] = [],
  events: SessionEvent[] = [],
  startTime = Date.now()
): CapabilityResponse {
  return {
    id: crypto.randomUUID(),
    requestId: request.id,
    sessionId: request.sessionId,
    success,
    result: resultOrError.result,
    error: resultOrError.error,
    artifacts,
    events,
    duration: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  } as CapabilityResponse;
}

export function createCapabilityEvent(
  capability: string,
  sessionId: string,
  type: CapabilityEvent['type'],
  options?: { progress?: number; message?: string; data?: Record<string, unknown> }
): CapabilityEvent {
  return {
    id: crypto.randomUUID(),
    capability,
    sessionId,
    type,
    progress: options?.progress,
    message: options?.message,
    data: options?.data,
    timestamp: new Date().toISOString(),
  } as CapabilityEvent;
}