import { describe, it, expect } from 'vitest';
import {
  CapabilitySchema,
  CapabilityManifestSchema,
  CapabilityRequestSchema,
  CapabilityResponseSchema,
  CapabilityEventSchema,
  CapabilityErrorSchema,
  CapabilityTypeSchema,
  ExecutionLocationSchema,
  CapabilityPermissionSchema,
  createCapabilityRequest,
  createCapabilityResponse,
  createCapabilityEvent,
} from '../src';

describe('Capability', () => {
  it('should validate capability types', () => {
    expect(CapabilityTypeSchema.safeParse('model').success).toBe(true);
    expect(CapabilityTypeSchema.safeParse('tool').success).toBe(true);
    expect(CapabilityTypeSchema.safeParse('storage').success).toBe(true);
    expect(CapabilityTypeSchema.safeParse('resource').success).toBe(true);
    expect(CapabilityTypeSchema.safeParse('prompt').success).toBe(true);
    expect(CapabilityTypeSchema.safeParse('invalid').success).toBe(false);
  });

  it('should validate execution locations', () => {
    expect(ExecutionLocationSchema.safeParse('local').success).toBe(true);
    expect(ExecutionLocationSchema.safeParse('remote').success).toBe(true);
    expect(ExecutionLocationSchema.safeParse('hybrid').success).toBe(true);
    expect(ExecutionLocationSchema.safeParse('invalid').success).toBe(false);
  });

  it('should validate capability permissions', () => {
    expect(CapabilityPermissionSchema.safeParse('fs:read').success).toBe(true);
    expect(CapabilityPermissionSchema.safeParse('fs:write').success).toBe(true);
    expect(CapabilityPermissionSchema.safeParse('net:fetch').success).toBe(true);
    expect(CapabilityPermissionSchema.safeParse('process:spawn').success).toBe(true);
    expect(CapabilityPermissionSchema.safeParse('secrets:read').success).toBe(true);
    expect(CapabilityPermissionSchema.safeParse('invalid').success).toBe(false);
  });

  it('should validate capability name format', () => {
    const validNames = ['code.generate', 'fs.read', 'terminal.exec', 'git.clone', 'model.complete'];
    for (const name of validNames) {
      expect(CapabilitySchema.shape.name.safeParse(name).success).toBe(true);
    }

    const invalidNames = ['Code.Generate', 'fs_read', '123.generate', '-generate', ''];
    for (const name of invalidNames) {
      expect(CapabilitySchema.shape.name.safeParse(name).success).toBe(false);
    }
  });

  it('should validate capability version', () => {
    expect(CapabilitySchema.shape.version.safeParse('1.0.0').success).toBe(true);
    expect(CapabilitySchema.shape.version.safeParse('1.2.3-beta.1').success).toBe(true);
    expect(CapabilitySchema.shape.version.safeParse('2.0.0+build.123').success).toBe(true);
    expect(CapabilitySchema.shape.version.safeParse('invalid').success).toBe(false);
  });

  it('should validate capability manifest', () => {
    const valid = {
      name: 'code.generate',
      version: '1.0.0',
      type: 'tool',
      description: 'Generate code from prompt',
      parameters: [
        { name: 'prompt', type: 'string', description: 'Code generation prompt', required: true },
        { name: 'language', type: 'string', default: 'typescript', required: false },
      ],
      returns: { type: 'artifact', description: 'Generated code file', artifactKind: 'file' },
      permissions: ['fs:write'],
      executionLocation: 'local',
      timeout: 60000,
      idempotent: false,
      deprecated: false,
      tags: ['code', 'generation'],
      entryPoint: './generate.ts',
      dependencies: [],
      provides: ['code.generate'],
      requires: [],
    };
    expect(CapabilityManifestSchema.safeParse(valid).success).toBe(true);
  });

  it('should create capability request', () => {
    const request = createCapabilityRequest(
      'code.generate',
      '123e4567-e89b-12d3-a456-426614174000',
      { prompt: 'Create a function', language: 'typescript' },
      [],
      { version: '1.0.0', correlationId: 'corr-123', timeout: 30000 }
    );
    expect(request.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(request.capability).toBe('code.generate');
    expect(request.version).toBe('1.0.0');
    expect(request.sessionId).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(request.correlationId).toBe('corr-123');
    expect(request.params).toEqual({ prompt: 'Create a function', language: 'typescript' });
    expect(request.timeout).toBe(30000);
  });

  it('should create capability response', () => {
    const request = createCapabilityRequest('code.generate', 'session-1', {});
    const response = createCapabilityResponse(
      request,
      true,
      { result: { code: 'function test() {}' } },
      [],
      [],
      Date.now() - 100
    );
    expect(response.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.requestId).toBe(request.id);
    expect(response.sessionId).toBe(request.sessionId);
    expect(response.success).toBe(true);
    expect(response.result).toEqual({ code: 'function test() {}' });
    expect(response.error).toBeUndefined();
    expect(response.duration).toBeGreaterThanOrEqual(100);
  });

  it('should create capability response with error', () => {
    const request = createCapabilityRequest('code.generate', 'session-1', {});
    const response = createCapabilityResponse(
      request,
      false,
      {
        error: {
          code: 'CAPABILITY_INVOCATION_FAILED',
          message: 'Model unavailable',
          capability: 'code.generate',
          sessionId: 'session-1',
          recoverable: true,
          retryAfter: 5000,
        },
      },
      [],
      [],
      Date.now() - 50
    );
    expect(response.success).toBe(false);
    expect(response.error?.code).toBe('CAPABILITY_INVOCATION_FAILED');
    expect(response.error?.recoverable).toBe(true);
    expect(response.error?.retryAfter).toBe(5000);
  });

  it('should create capability event', () => {
    const event = createCapabilityEvent('code.generate', 'session-1', 'started', { progress: 0, message: 'Starting...' });
    expect(event.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(event.capability).toBe('code.generate');
    expect(event.sessionId).toBe('session-1');
    expect(event.type).toBe('started');
    expect(event.progress).toBe(0);
    expect(event.message).toBe('Starting...');
  });

  it('should validate CapabilityRequestSchema', () => {
    const valid = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      capability: 'code.generate',
      version: '1.0.0',
      sessionId: '123e4567-e89b-12d3-a456-426614174001',
      correlationId: '123e4567-e89b-12d3-a456-426614174002',
      params: { prompt: 'test' },
      artifacts: [],
      timeout: 30000,
      metadata: {},
    };
    expect(CapabilityRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('should validate CapabilityResponseSchema', () => {
    const valid = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      requestId: '123e4567-e89b-12d3-a456-426614174001',
      sessionId: '123e4567-e89b-12d3-a456-426614174002',
      success: true,
      result: { test: true },
      artifacts: [],
      events: [],
      duration: 100,
      timestamp: new Date().toISOString(),
    };
    expect(CapabilityResponseSchema.safeParse(valid).success).toBe(true);
  });

  it('should validate CapabilityEventSchema', () => {
    const valid = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      capability: 'code.generate',
      sessionId: '123e4567-e89b-12d3-a456-426614174001',
      type: 'progress',
      progress: 0.5,
      message: 'Generating...',
      data: { step: 2 },
      timestamp: new Date().toISOString(),
    };
    expect(CapabilityEventSchema.safeParse(valid).success).toBe(true);
  });

  it('should validate CapabilityErrorSchema', () => {
    const valid = {
      code: 'CAPABILITY_INVOCATION_FAILED',
      message: 'Failed to invoke capability',
      capability: 'code.generate',
      sessionId: '123e4567-e89b-12d3-a456-426614174000',
      requestId: '123e4567-e89b-12d3-a456-426614174001',
      recoverable: true,
      retryAfter: 5000,
      details: { reason: 'timeout' },
    };
    expect(CapabilityErrorSchema.safeParse(valid).success).toBe(true);
  });
});