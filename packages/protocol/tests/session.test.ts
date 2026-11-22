import { describe, it, expect } from 'vitest';
import {
  SessionSchema,
  SessionConfigSchema,
  SessionEventSchema,
  CreateSessionSchema,
  UpdateSessionSchema,
  SessionStateSchema,
  SessionEventTypeSchema,
  createSession,
  createSessionEvent,
  isTerminalState,
  canTransition,
  SESSION_TERMINAL_STATES,
} from '../src';

describe('Session', () => {
  it('should validate session states', () => {
    expect(SessionStateSchema.safeParse('created').success).toBe(true);
    expect(SessionStateSchema.safeParse('active').success).toBe(true);
    expect(SessionStateSchema.safeParse('paused').success).toBe(true);
    expect(SessionStateSchema.safeParse('completed').success).toBe(true);
    expect(SessionStateSchema.safeParse('failed').success).toBe(true);
    expect(SessionStateSchema.safeParse('closed').success).toBe(true);
    expect(SessionStateSchema.safeParse('invalid').success).toBe(false);
  });

  it('should validate session event types', () => {
    expect(SessionEventTypeSchema.safeParse('created').success).toBe(true);
    expect(SessionEventTypeSchema.safeParse('state_changed').success).toBe(true);
    expect(SessionEventTypeSchema.safeParse('capability_invoked').success).toBe(true);
    expect(SessionEventTypeSchema.safeParse('capability_completed').success).toBe(true);
    expect(SessionEventTypeSchema.safeParse('capability_failed').success).toBe(true);
    expect(SessionEventTypeSchema.safeParse('artifact_created').success).toBe(true);
    expect(SessionEventTypeSchema.safeParse('artifact_updated').success).toBe(true);
    expect(SessionEventTypeSchema.safeParse('artifact_deleted').success).toBe(true);
    expect(SessionEventTypeSchema.safeParse('message_received').success).toBe(true);
    expect(SessionEventTypeSchema.safeParse('message_sent').success).toBe(true);
    expect(SessionEventTypeSchema.safeParse('error').success).toBe(true);
    expect(SessionEventTypeSchema.safeParse('closed').success).toBe(true);
  });

  it('should create session with generated ID and timestamps', () => {
    const session = createSession({ productPack: 'piston-code' });
    expect(session.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(session.state).toBe('created');
    expect(session.config.productPack).toBe('piston-code');
    expect(session.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(session.updatedAt).toBe(session.createdAt);
    expect(session.eventCount).toBe(0);
    expect(session.artifacts).toEqual([]);
    expect(session.artifactRefs).toEqual([]);
  });

  it('should create session event', () => {
    const sessionId = '123e4567-e89b-12d3-a456-426614174000';
    const event = createSessionEvent(sessionId, 'created', { source: 'test' }, 'corr-123');
    expect(event.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(event.sessionId).toBe(sessionId);
    expect(event.type).toBe('created');
    expect(event.payload).toEqual({ source: 'test' });
    expect(event.correlationId).toBe('corr-123');
    expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should identify terminal states', () => {
    expect(isTerminalState('completed')).toBe(true);
    expect(isTerminalState('failed')).toBe(true);
    expect(isTerminalState('closed')).toBe(true);
    expect(isTerminalState('created')).toBe(false);
    expect(isTerminalState('active')).toBe(false);
    expect(isTerminalState('paused')).toBe(false);
  });

  it('should have correct terminal states list', () => {
    expect(SESSION_TERMINAL_STATES).toEqual(['completed', 'failed', 'closed']);
  });

  it('should validate state transitions', () => {
    expect(canTransition('created', 'active')).toBe(true);
    expect(canTransition('created', 'closed')).toBe(true);
    expect(canTransition('active', 'paused')).toBe(true);
    expect(canTransition('active', 'completed')).toBe(true);
    expect(canTransition('active', 'failed')).toBe(true);
    expect(canTransition('active', 'closed')).toBe(true);
    expect(canTransition('paused', 'active')).toBe(true);
    expect(canTransition('paused', 'closed')).toBe(true);
    expect(canTransition('completed', 'closed')).toBe(true);
    expect(canTransition('failed', 'closed')).toBe(true);
    expect(canTransition('closed', 'active')).toBe(false);
    expect(canTransition('completed', 'active')).toBe(false);
  });

  it('should validate CreateSessionSchema', () => {
    const valid = {
      productPack: 'piston-code',
      agentId: 'coder',
      capabilities: ['code.generate', 'fs.read'],
      policies: ['code-pack'],
      metadata: { userId: '123' },
      ttl: 3600000,
    };
    expect(CreateSessionSchema.safeParse(valid).success).toBe(true);

    const invalid = {
      productPack: 123,
    };
    expect(CreateSessionSchema.safeParse(invalid).success).toBe(false);
  });

  it('should validate SessionConfigSchema', () => {
    const valid = {
      productPack: 'piston-code',
      capabilities: ['code.generate'],
      policies: ['code-pack'],
      metadata: {},
      maxEvents: 5000,
    };
    expect(SessionConfigSchema.safeParse(valid).success).toBe(true);

    expect(SessionConfigSchema.safeParse({ maxEvents: 10000 }).success).toBe(true);
    expect(CreateSessionSchema.safeParse({}).success).toBe(true);
  });

  it('should validate SessionEventSchema', () => {
    const valid = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      sessionId: '123e4567-e89b-12d3-a456-426614174001',
      type: 'created',
      timestamp: new Date().toISOString(),
      payload: { test: true },
      correlationId: '123e4567-e89b-12d3-a456-426614174002',
    };
    expect(SessionEventSchema.safeParse(valid).success).toBe(true);
  });

  it('should validate full SessionSchema', () => {
    const session = createSession();
    const result = SessionSchema.safeParse(session);
    expect(result.success).toBe(true);
  });
});