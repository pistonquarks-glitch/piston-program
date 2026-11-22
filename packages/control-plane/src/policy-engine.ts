import {
  type Policy,
  type PolicyDecision,
  type EvaluationContext,
  type EvaluationResult,
  type ApprovalRequest,
  type ApprovalDecision,
  type PermissionRule,
  PolicySchema,
  createDefaultPolicy,
  PistonError,
} from '@piston/protocol';
import { NAMESPACE_POLICIES, NAMESPACE_APPROVALS, storageKey, type StorageAdapter } from './storage-port.js';

interface RateBucket {
  count: number;
  windowStart: number;
}

export class PolicyEngine {
  private readonly policies = new Map<string, Policy>();
  private readonly rateBuckets = new Map<string, RateBucket>();

  constructor(private readonly storage?: StorageAdapter) {
    const def = createDefaultPolicy('default');
    this.policies.set(def.name, def);
  }

  async loadPolicy(policy: unknown): Promise<Policy> {
    const parsed = PolicySchema.parse(policy);
    this.policies.set(parsed.name, parsed);
    if (this.storage) {
      await this.storage.set(storageKey(NAMESPACE_POLICIES, parsed.name), parsed);
    }
    return parsed;
  }

  getPolicy(name: string): Policy {
    const policy = this.policies.get(name);
    if (!policy) {
      throw new PistonError('POLICY_EVALUATION_FAILED', `Policy '${name}' not loaded`, { policy: name });
    }
    return policy;
  }

  listPolicies(): Policy[] {
    return [...this.policies.values()];
  }

  evaluate(permission: string, policies: string[], context: EvaluationContext): EvaluationResult {
    let decision: PolicyDecision | undefined;
    let matchedRule: PermissionRule | undefined;
    let reason: string | undefined;

    for (const policyName of [...policies].reverse()) {
      let policy: Policy;
      try {
        policy = this.getPolicy(policyName);
      } catch {
        continue;
      }
      const rule = policy.rules.find(r => r.permission === permission);
      if (rule) {
        decision = rule.decision;
        matchedRule = rule;
        reason = rule.reason;
        break;
      }
    }

    if (!decision) {
      const firstLoaded = policies.map(n => this.policies.get(n)).find(Boolean);
      decision = firstLoaded?.defaultDecision ?? 'ask';
      reason = reason ?? `No explicit rule for '${permission}'; applied default`;
    }

    if (decision === 'deny') {
      return { decision, matchedRules: matchedRule ? [matchedRule] : [], requiresApproval: false, reason };
    }

    if (matchedRule?.rateLimit) {
      const allowed = this.checkRateLimit(matchedRule.rateLimit.maxRequests, matchedRule.rateLimit.windowMs, `${context.sessionId}:${permission}`);
      if (!allowed) {
        return {
          decision: 'deny',
          matchedRules: [matchedRule],
          rateLimit: matchedRule.rateLimit,
          requiresApproval: false,
          reason: 'Rate limit exceeded',
        };
      }
      return {
        decision,
        matchedRules: [matchedRule],
        rateLimit: matchedRule.rateLimit,
        requiresApproval: decision === 'ask',
        reason,
      };
    }

    return {
      decision,
      matchedRules: matchedRule ? [matchedRule] : [],
      requiresApproval: decision === 'ask',
      reason,
    };
  }

  private checkRateLimit(maxRequests: number, windowMs: number, key: string): boolean {
    const now = Date.now();
    const bucket = this.rateBuckets.get(key);
    if (!bucket || now - bucket.windowStart >= windowMs) {
      this.rateBuckets.set(key, { count: 1, windowStart: now });
      return true;
    }
    bucket.count += 1;
    return bucket.count <= maxRequests;
  }

  async requestApproval(sessionId: string, capability: string, permission: string, context: Record<string, unknown> = {}): Promise<ApprovalRequest> {
    const approval: ApprovalRequest = {
      id: crypto.randomUUID(),
      sessionId,
      capability,
      permission: permission as ApprovalRequest['permission'],
      context,
      requestedAt: new Date().toISOString(),
      status: 'pending',
    };
    if (this.storage) {
      await this.storage.set(storageKey(NAMESPACE_APPROVALS, approval.id), approval);
    }
    return approval;
  }

  async decideApproval(decision: ApprovalDecision): Promise<ApprovalRequest> {
    if (!this.storage) {
      throw new PistonError('STORAGE_NOT_AVAILABLE', 'Approvals require a storage adapter');
    }
    const raw = await this.storage.get(storageKey(NAMESPACE_APPROVALS, decision.requestId));
    if (!raw) {
      throw new PistonError('VALIDATION_ERROR', `Approval '${decision.requestId}' not found`);
    }
    const approval = raw as ApprovalRequest;
    approval.status = decision.decision === 'approved' ? 'approved' : 'denied';
    approval.decidedAt = new Date().toISOString();
    approval.decidedBy = decision.decidedBy;
    await this.storage.set(storageKey(NAMESPACE_APPROVALS, approval.id), approval);
    return approval;
  }

  reset(): void {
    this.rateBuckets.clear();
  }
}
