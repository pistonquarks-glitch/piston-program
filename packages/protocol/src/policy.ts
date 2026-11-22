import { z } from 'zod';
import { CapabilityPermissionSchema, type CapabilityPermission } from './capability.js';

export const PolicyDecisionSchema = z.enum(['allow', 'deny', 'ask']);
export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;

export const RateLimitSchema = z.object({
  maxRequests: z.number().int().positive(),
  windowMs: z.number().int().positive(),
  key: z.string().optional(),
});
export type RateLimit = z.infer<typeof RateLimitSchema>;

export const PermissionRuleSchema = z.object({
  permission: CapabilityPermissionSchema,
  decision: PolicyDecisionSchema,
  conditions: z.record(z.unknown()).optional(),
  rateLimit: RateLimitSchema.optional(),
  reason: z.string().optional(),
});
export type PermissionRule = z.infer<typeof PermissionRuleSchema>;

export const PolicySchema = z.object({
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/),
  description: z.string().optional(),
  rules: z.array(PermissionRuleSchema).default([]),
  defaultDecision: PolicyDecisionSchema.default('ask'),
  inherits: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).optional(),
});
export type Policy = z.infer<typeof PolicySchema>;

export const ApprovalRequestSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  capability: z.string(),
  permission: CapabilityPermissionSchema,
  context: z.record(z.unknown()).default({}),
  requestedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  status: z.enum(['pending', 'approved', 'denied', 'expired']).default('pending'),
  decidedAt: z.string().datetime().optional(),
  decidedBy: z.string().optional(),
});
export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;

export const ApprovalDecisionSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(['approved', 'denied']),
  reason: z.string().optional(),
  decidedBy: z.string(),
});
export type ApprovalDecision = z.infer<typeof ApprovalDecisionSchema>;

export const EvaluationContextSchema = z.object({
  sessionId: z.string().uuid(),
  capability: z.string(),
  capabilityType: z.string().optional(),
  userId: z.string().optional(),
  roles: z.array(z.string()).default([]),
  resource: z.string().optional(),
  action: z.string().optional(),
  environment: z.record(z.unknown()).default({}),
  metadata: z.record(z.unknown()).default({}),
});
export type EvaluationContext = z.infer<typeof EvaluationContextSchema>;

export const EvaluationResultSchema = z.object({
  decision: PolicyDecisionSchema,
  matchedRules: z.array(PermissionRuleSchema).default([]),
  rateLimit: RateLimitSchema.optional(),
  requiresApproval: z.boolean().default(false),
  approvalRequest: ApprovalRequestSchema.optional(),
  reason: z.string().optional(),
});
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;

export function createDefaultPolicy(name = 'default'): Policy {
  return {
    name,
    version: '1.0.0',
    description: 'Default policy - ask for all permissions',
    rules: [],
    defaultDecision: 'ask',
    inherits: [],
    metadata: {},
  } as Policy;
}

export function createPermissivePolicy(name = 'permissive'): Policy {
  return {
    name,
    version: '1.0.0',
    description: 'Permissive policy - allow all',
    rules: [
      { permission: 'fs:read', decision: 'allow' },
      { permission: 'fs:write', decision: 'allow' },
      { permission: 'fs:delete', decision: 'allow' },
      { permission: 'fs:list', decision: 'allow' },
      { permission: 'net:fetch', decision: 'allow' },
      { permission: 'net:listen', decision: 'allow' },
      { permission: 'process:spawn', decision: 'allow' },
      { permission: 'process:exec', decision: 'allow' },
      { permission: 'secrets:read', decision: 'allow' },
      { permission: 'secrets:write', decision: 'allow' },
      { permission: 'system:info', decision: 'allow' },
    ],
    defaultDecision: 'allow',
    inherits: [],
    metadata: {},
  } as Policy;
}

export function createRestrictivePolicy(name = 'restrictive'): Policy {
  return {
    name,
    version: '1.0.0',
    description: 'Restrictive policy - deny all by default',
    rules: [
      { permission: 'fs:read', decision: 'allow', conditions: { scope: 'session' } },
    ],
    defaultDecision: 'deny',
    inherits: [],
    metadata: {},
  } as Policy;
}

export function mergePolicies(base: Policy, override: Policy): Policy {
  const ruleMap = new Map(base.rules.map(r => [r.permission, r]));
  for (const rule of override.rules) {
    ruleMap.set(rule.permission, rule);
  }
  return {
    ...override,
    rules: Array.from(ruleMap.values()),
    inherits: [...new Set([...base.inherits, base.name, override.name, ...override.inherits])],
  };
}