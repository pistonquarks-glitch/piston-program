import {
  type Session,
  type SessionState,
  type SessionEvent,
  createSession,
  createSessionEvent,
  canTransition,
  isTerminalState,
  PistonError,
} from '@piston/protocol';
import { CreateSessionSchema, type CreateSession } from '@piston/protocol';
import type { StorageAdapter } from './storage-port.js';
import { NAMESPACE_SESSIONS, NAMESPACE_EVENTS, storageKey } from './storage-port.js';

export class SessionManager {
  constructor(private readonly storage: StorageAdapter) {}

  async create(config: Partial<CreateSession> = {}): Promise<Session> {
    const parsed = CreateSessionSchema.parse({ maxEvents: 10000, ...config });
    const session = createSession(parsed);
    const existing = await this.storage.get(storageKey(NAMESPACE_SESSIONS, session.id));
    if (existing) {
      throw new PistonError('SESSION_ALREADY_EXISTS', `Session ${session.id} already exists`);
    }
    const createdEvent = createSessionEvent(session.id, 'created', { config: session.config });
    session.eventCount = 1;
    await this.storage.set(storageKey(NAMESPACE_SESSIONS, session.id), session);
    await this.appendRawEvent(createdEvent);
    return session;
  }

  async get(sessionId: string): Promise<Session> {
    const raw = await this.storage.get(storageKey(NAMESPACE_SESSIONS, sessionId));
    if (!raw) {
      throw new PistonError('SESSION_NOT_FOUND', `Session ${sessionId} not found`, { sessionId });
    }
    return raw as Session;
  }

  async getOrNull(sessionId: string): Promise<Session | null> {
    try {
      return await this.get(sessionId);
    } catch {
      return null;
    }
  }

  async list(): Promise<Session[]> {
    const keys = await this.storage.keys(`${NAMESPACE_SESSIONS}:`);
    const sessions = await Promise.all(keys.map(k => this.storage.get(k)));
    return sessions
      .filter((s): s is Session => s !== undefined)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async transition(sessionId: string, to: SessionState): Promise<Session> {
    const session = await this.get(sessionId);
    if (!canTransition(session.state, to)) {
      throw new PistonError('SESSION_INVALID_STATE', `Cannot transition from '${session.state}' to '${to}'`, {
        sessionId,
        from: session.state,
        to,
      });
    }
    session.state = to;
    session.updatedAt = new Date().toISOString();
    if (isTerminalState(to)) {
      session.closedAt = session.updatedAt;
    }
    await this.storage.set(storageKey(NAMESPACE_SESSIONS, sessionId), session);
    await this.append(sessionId, 'state_changed', { from: session.state, to });
    return session;
  }

  async update(sessionId: string, patch: Partial<Pick<Session, 'config' | 'artifacts' | 'artifactRefs' | 'lastError'>>): Promise<Session> {
    const session = await this.get(sessionId);
    if (patch.config !== undefined) session.config = { ...session.config, ...patch.config };
    if (patch.artifacts !== undefined) session.artifacts = patch.artifacts;
    if (patch.artifactRefs !== undefined) session.artifactRefs = patch.artifactRefs;
    if (patch.lastError !== undefined) session.lastError = patch.lastError;
    session.updatedAt = new Date().toISOString();
    await this.storage.set(storageKey(NAMESPACE_SESSIONS, sessionId), session);
    return session;
  }

  async close(sessionId: string): Promise<Session> {
    const session = await this.get(sessionId);
    if (isTerminalState(session.state)) {
      return session;
    }
    const target: SessionState = session.state === 'active' || session.state === 'paused' ? 'completed' : 'closed';
    let current = await this.transition(sessionId, target);
    if (current.state !== 'closed') {
      current = await this.transition(sessionId, 'closed');
    }
    await this.append(sessionId, 'closed');
    return current;
  }

  async append(sessionId: string, type: SessionEvent['type'], payload?: Record<string, unknown>, correlationId?: string): Promise<SessionEvent> {
    const event = createSessionEvent(sessionId, type, payload, correlationId);
    return this.appendRawEvent(event);
  }

  private async appendRawEvent(event: SessionEvent): Promise<SessionEvent> {
    const key = storageKey(NAMESPACE_EVENTS, `${event.sessionId}:${event.timestamp}:${event.id}`);
    await this.storage.set(key, event);
    const session = await this.storage.get(storageKey(NAMESPACE_SESSIONS, event.sessionId)) as Session | undefined;
    if (session) {
      session.eventCount += 1;
      session.updatedAt = new Date().toISOString();
      if (session.eventCount > session.config.maxEvents) {
        session.lastError = {
          code: 'STORAGE_ERROR',
          message: `Event limit (${session.config.maxEvents}) exceeded`,
          timestamp: new Date().toISOString(),
        };
      }
      await this.storage.set(storageKey(NAMESPACE_SESSIONS, session.id), session);
    }
    return event;
  }
}
