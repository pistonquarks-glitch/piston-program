import {
  type Session,
  type SessionState,
  type SessionEvent,
  type CapabilityRequest,
  type CapabilityResponse,
  type Capability,
  type Policy,
  type EvaluationContext,
  type EvaluationResult,
  createCapabilityRequest,
} from '@piston/protocol';
import { z as zod } from 'zod';
import { MemStorage, type StorageAdapter } from './storage-port.js';
import { SessionManager } from './session-manager.js';
import { CapabilityRegistry, type CapabilityHandler } from './capability-registry.js';
import { PolicyEngine } from './policy-engine.js';
import { EventJournal, type JournalEntry } from './event-journal.js';
import { AuthContext } from './auth-context.js';

export const InvokeOptionsSchema = zod.object({
  version: zod.string().optional(),
  timeout: zod.number().int().positive().optional(),
  correlationId: zod.string().optional(),
  skipPolicyCheck: zod.boolean().default(false),
});
export type InvokeOptions = zod.input<typeof InvokeOptionsSchema>;

interface ResolvedInvokeOptions {
  version?: string;
  timeout?: number;
  correlationId?: string;
  skipPolicyCheck: boolean;
}

function resolveInvokeOptions(input: InvokeOptions | undefined): ResolvedInvokeOptions {
  if (input === undefined) return { skipPolicyCheck: false };
  const parsed = InvokeOptionsSchema.parse(input);
  const resolved: ResolvedInvokeOptions = { skipPolicyCheck: parsed.skipPolicyCheck };
  if (parsed.version !== undefined) resolved.version = parsed.version;
  if (parsed.timeout !== undefined) resolved.timeout = parsed.timeout;
  if (parsed.correlationId !== undefined) resolved.correlationId = parsed.correlationId;
  return resolved;
}

export interface ControlPlaneEvents {
  onJournalEntry?: (entry: JournalEntry) => void;
}

export class PistonControlPlane {
  public readonly storage: StorageAdapter;
  public readonly sessions: SessionManager;
  public readonly capabilities: CapabilityRegistry;
  public readonly policies: PolicyEngine;
  public readonly journal: EventJournal;

  constructor(options?: { storage?: StorageAdapter; events?: ControlPlaneEvents }) {
    this.storage = options?.storage ?? new MemStorage();
    this.sessions = new SessionManager(this.storage);
    this.capabilities = new CapabilityRegistry();
    this.policies = new PolicyEngine(this.storage);
    this.journal = new EventJournal();
    if (options?.events?.onJournalEntry) {
      this.journal.subscribe(options.events.onJournalEntry);
    }
  }

  async startSession(config: Partial<Parameters<SessionManager['create']>[0]> = {}, auth: AuthContext = AuthContext.anonymous()): Promise<Session> {
    void auth;
    const session = await this.sessions.create(config);
    this.journal.sessionEvent({
      id: crypto.randomUUID(),
      sessionId: session.id,
      type: 'created',
      timestamp: session.createdAt,
      payload: { config: session.config },
    });
    await this.sessions.transition(session.id, 'active');
    return this.sessions.get(session.id);
  }

  async getState(sessionId: string): Promise<{ session: Session; events: SessionEvent[] }> {
    const session = await this.sessions.get(sessionId);
    const events = this.journal.query({ sessionId }).map(e => ({
      id: String(e.data.eventId ?? crypto.randomUUID()),
      sessionId: e.sessionId,
      type: (e.data.type as SessionEvent['type']) ?? 'state_changed',
      timestamp: e.timestamp,
      payload: e.data.payload as Record<string, unknown> | undefined,
    }));
    return { session, events };
  }

  async invokeCapability(
    sessionId: string,
    capability: string,
    params: Record<string, unknown> = {},
    options?: InvokeOptions,
    auth: AuthContext = AuthContext.anonymous()
  ): Promise<CapabilityResponse> {
    const opts = resolveInvokeOptions(options);
    const request = createCapabilityRequest(capability, sessionId, params, [], {
      ...(opts.version !== undefined ? { version: opts.version } : {}),
      ...(opts.timeout !== undefined ? { timeout: opts.timeout } : {}),
      ...(opts.correlationId !== undefined ? { correlationId: opts.correlationId } : {}),
    });

    if (!opts.skipPolicyCheck) {
      let manifest: Capability;
      try {
        manifest = this.capabilities.get(capability);
      } catch (err) {
        this.journal.capabilityInvoked(request);
        const response = await this.capabilities.invoke(request);
        this.journal.capabilityCompleted(response);
        return response;
      }
      for (const permission of manifest.permissions) {
        const context: EvaluationContext = {
          sessionId,
          capability,
          capabilityType: manifest.type,
          userId: auth.identity.id,
          roles: auth.identity.roles,
          environment: {},
          metadata: {},
        };
        const policyNames = (await this.sessions.get(sessionId)).config.policies ?? [];
        const result: EvaluationResult = this.policies.evaluate(permission, policyNames.length > 0 ? policyNames : ['default'], context);
        if (result.decision === 'deny') {
          const denied = await this.capabilities.invoke(request);
          this.journal.capabilityInvoked(request);
          const denyResponse: CapabilityResponse = {
            ...denied,
            success: false,
            error: { code: 'PERMISSION_DENIED', message: `Permission '${permission}' denied by policy` },
            duration: denied.duration,
            timestamp: new Date().toISOString(),
          };
          this.journal.capabilityCompleted(denyResponse);
          return denyResponse;
        }
      }
    }

    this.journal.capabilityInvoked(request);
    const response = await this.capabilities.invoke(request);
    await this.sessions.append(sessionId, response.success ? 'capability_completed' : 'capability_failed', {
      capability,
      requestId: request.id,
      duration: response.duration,
    }, request.id);
    this.journal.capabilityCompleted(response);
    return response;
  }

  async setSessionState(sessionId: string, state: SessionState): Promise<Session> {
    return this.sessions.transition(sessionId, state);
  }

  async closeSession(sessionId: string): Promise<Session> {
    return this.sessions.close(sessionId);
  }

  registerCapability(manifest: unknown, handler: CapabilityHandler): Capability {
    return this.capabilities.register(manifest, handler);
  }

  loadPolicy(policy: unknown): Promise<Policy> {
    return this.policies.loadPolicy(policy);
  }

  listCapabilities(): Capability[] {
    return this.capabilities.list();
  }

  streamEvents(listener: (entry: JournalEntry) => void): () => void {
    return this.journal.subscribe(listener);
  }

  async shutdown(): Promise<void> {
    for (const session of await this.sessions.list()) {
      try {
        await this.sessions.close(session.id);
      } catch {
        // already terminal
      }
    }
    await this.storage.close();
  }
}

export function createMockEchoHandler(): CapabilityHandler {
  return async request => ({
    success: true,
    result: { echo: request.params['message'] ?? null, receivedAt: new Date().toISOString() },
    artifacts: [],
    events: [],
  });
}
