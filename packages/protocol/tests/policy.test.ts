import { describe, it, expect } from 'vitest';
import {
  PolicySchema,
  PermissionRuleSchema,
  RateLimitSchema,
  ApprovalRequestSchema,
  ApprovalDecisionSchema,
  EvaluationContextSchema,
  EvaluationResultSchema,
  PolicyDecisionSchema,
  createDefaultPolicy,
  createPermissivePolicy,
  createRestrictivePolicy,
  mergePolicies,
} from '../src';

describe('Policy', () => {
  it('should validate policy decisions', () => {
    expect(PolicyDecisionSchema.safeParse('allow').success).toBe(true);
    expect(PolicyDecisionSchema.safeParse('deny').success).toBe(true);
    expect(PolicyDecisionSchema.safeParse('ask').success).toBe(true);
    expect(PolicyDecisionSchema.safeParse('invalid').success).toBe(false);
  });

  it('should validate rate limit', () => {
    const valid = { maxRequests: 100, windowMs: 60000, key: 'user' };
    expect(RateLimitSchema.safeParse(valid).success).toBe(true);
  });

  it('should validate permission rule', () => {
    const valid = {
      permission: 'fs:read',
      decision: 'allow',
      conditions: { scope: 'session' },
      rateLimit: { maxRequests: 100, windowMs: 60000 },
      reason: 'Allow reading session files',
    };
    expect(PermissionRuleSchema.safeParse(valid).success).toBe(true);
  });

  it('should create default policy', () => {
    const policy = createDefaultPolicy('test-policy');
    expect(policy.name).toBe('test-policy');
    expect(policy.version).toBe('1.0.0');
    expect(policy.defaultDecision).toBe('ask');
    expect(policy.rules).toEqual([]);
  });

  it('should create permissive policy', () => {
    const policy = createPermissivePolicy('permissive');
    expect(policy.defaultDecision).toBe('allow');
    expect(policy.rules.length).toBe(11);
    for (const rule of policy.rules) {
      expect(rule.decision).toBe('allow');
    }
  });

  it('should create restrictive policy', () => {
    const policy = createRestrictivePolicy('restrictive');
    expect(policy.defaultDecision).toBe('deny');
    expect(policy.rules.length).toBe(1);
    expect(policy.rules[0].permission).toBe('fs:read');
    expect(policy.rules[0].decision).toBe('allow');
    expect(policy.rules[0].conditions).toEqual({ scope: 'session' });
  });

  it('should merge policies', () => {
    const base = createPermissivePolicy('base');
    const override = createRestrictivePolicy('override');
    const merged = mergePolicies(base, override);

    expect(merged.name).toBe('override');
    expect(merged.defaultDecision).toBe('deny');
    expect(merged.inherits).toContain('base');
    expect(merged.inherits).toContain('override');
  });

  it('should validate PolicySchema', () => {
    const valid = {
      name: 'test-policy',
      version: '1.0.0',
      description: 'Test policy',
      rules: [
        { permission: 'fs:read', decision: 'allow' },
        { permission: 'fs:write', decision: 'ask', conditions: { scope: 'project' } },
      ],
      defaultDecision: 'ask',
      inherits: [],
      metadata: {},
    };
    expect(PolicySchema.safeParse(valid).success).toBe(true);
  });

  it('should validate ApprovalRequestSchema', () => {
    const valid = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      sessionId: '123e4567-e89b-12d3-a456-426614174001',
      capability: 'terminal.exec',
      permission: 'process:spawn',
      context: { command: 'npm test' },
      requestedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      status: 'pending',
    };
    expect(ApprovalRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('should validate ApprovalDecisionSchema', () => {
    const valid = {
      requestId: '123e4567-e89b-12d3-a456-426614174000',
      decision: 'approved',
      reason: 'User approved',
      decidedBy: 'user-123',
    };
    expect(ApprovalDecisionSchema.safeParse(valid).success).toBe(true);
  });

  it('should validate EvaluationContextSchema', () => {
    const valid = {
      sessionId: '123e4567-e89b-12d3-a456-426614174000',
      capability: 'fs.write',
      capabilityType: 'tool',
      userId: 'user-123',
      roles: ['developer'],
      resource: '/project/src/file.ts',
      action: 'write',
      environment: { project: 'my-project' },
      metadata: {},
    };
    expect(EvaluationContextSchema.safeParse(valid).success).toBe(true);
  });

  it('should validate EvaluationResultSchema', () => {
    const valid = {
      decision: 'ask',
      matchedRules: [{ permission: 'fs:write', decision: 'ask', conditions: { scope: 'project' } }],
      rateLimit: { maxRequests: 10, windowMs: 60000 },
      requiresApproval: true,
      approvalRequest: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        sessionId: '123e4567-e89b-12d3-a456-426614174001',
        capability: 'fs.write',
        permission: 'fs:write',
        context: {},
        requestedAt: new Date().toISOString(),
        status: 'pending',
      },
      reason: 'Requires approval for project files',
    };
    expect(EvaluationResultSchema.safeParse(valid).success).toBe(true);
  });
});