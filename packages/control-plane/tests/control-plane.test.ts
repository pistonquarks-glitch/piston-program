import { describe, it, expect, beforeEach } from 'vitest';
import {
  PistonControlPlane,
  createMockEchoHandler,
  MemStorage,
  InMemoryVault,
  AuthContext,
  SessionManager,
  CapabilityRegistry,
  PolicyEngine,
  EventJournal,
} from '../src';

function makeCp() {
  return new PistonControlPlane({ storage: new MemStorage() });
}

const echoManifest = {
  name: 'echo',
  version: '1.0.0',
  type: 'tool',
  description: 'Echoes back the given message',
  parameters: [{ name: 'message', type: 'string', required: true }],
  permissions: ['net:fetch'],
  executionLocation: 'local',
  timeout: 5000,
  idempotent: true,
  deprecated: false,
  tags: ['demo'],
} as const;

describe('SessionManager', () => {
  let mgr: SessionManager;

  beforeEach(() => {
    mgr = new SessionManager(new MemStorage());
  });

  it('creates a session with defaults and created event', async () => {
    const s = await mgr.create({ productPack: 'piston-code' });
    expect(s.state).toBe('created');
    expect(s.config.productPack).toBe('piston-code');
    expect(s.config.maxEvents).toBe(10000);
    expect(s.eventCount).toBe(1);
    expect(await mgr.get(s.id)).toMatchObject({ id: s.id });
  });

  it('throws on duplicate session id', async () => {
    const s = await mgr.create();
    await expect(mgr.storage.set(`sessions:${s.id}`, {})).resolves.toBeUndefined();
  });

  it('rejects invalid transitions', async () => {
    const s = await mgr.create();
    await expect(mgr.transition(s.id, 'completed')).rejects.toMatchObject({ code: 'SESSION_INVALID_STATE' });
  });

  it('transitions created -> active -> paused -> active -> closed', async () => {
    const s = await mgr.create();
    await mgr.transition(s.id, 'active');
    await mgr.transition(s.id, 'paused');
    await mgr.transition(s.id, 'active');
    const closed = await mgr.close(s.id);
    expect(closed.state).toBe('closed');
    expect(closed.closedAt).toBeDefined();
  });

  it('lists sessions sorted by createdAt', async () => {
    await mgr.create();
    await new Promise(r => setTimeout(r, 5));
    await mgr.create();
    const list = await mgr.list();
    expect(list.length).toBe(2);
    expect(list[0]!.createdAt <= list[1]!.createdAt).toBe(true);
  });
});

describe('CapabilityRegistry', () => {
  let reg: CapabilityRegistry;

  beforeEach(() => {
    reg = new CapabilityRegistry();
  });

  it('registers and discovers capabilities', () => {
    reg.register(echoManifest, async () => ({ success: true, result: { ok: 1 }, artifacts: [], events: [] }));
    expect(reg.has('echo')).toBe(true);
    expect(reg.has('nope')).toBe(false);
    expect(reg.discover({ type: 'tool' }).map(c => c.name)).toContain('echo');
    expect(reg.discover({ type: 'model' })).toHaveLength(0);
  });

  it('rejects duplicate registration', () => {
    reg.register(echoManifest, async () => ({ success: true, artifacts: [], events: [] }));
    expect(() => reg.register(echoManifest, async () => ({ success: true, artifacts: [], events: [] }))).toThrow(/already registered/);
  });

  it('invokes handler and returns success response', async () => {
    reg.register(echoManifest, createMockEchoHandler());
    const req = {
      id: crypto.randomUUID(),
      capability: 'echo',
      sessionId: crypto.randomUUID(),
      params: { message: 'hi' },
      artifacts: [],
    };
    const res = await reg.invoke(req as never);
    expect(res.success).toBe(true);
    expect((res.result as { echo?: string }).echo).toBe('hi');
    expect(res.duration).toBeGreaterThanOrEqual(0);
  });

  it('returns CAPABILITY_NOT_FOUND for unknown capability', async () => {
    const req = { id: crypto.randomUUID(), capability: 'ghost', sessionId: crypto.randomUUID(), params: {}, artifacts: [] };
    const res = await reg.invoke(req as never);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('CAPABILITY_NOT_FOUND');
  });

  it('catches handler errors into error responses', async () => {
    reg.register(echoManifest, async () => {
      throw new Error('boom');
    });
    const req = { id: crypto.randomUUID(), capability: 'echo', sessionId: crypto.randomUUID(), params: {}, artifacts: [] };
    const res = await reg.invoke(req as never);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('CAPABILITY_INVOCATION_FAILED');
    expect(res.error?.message).toContain('boom');
  });
});

describe('PolicyEngine', () => {
  let pe: PolicyEngine;

  beforeEach(() => {
    pe = new PolicyEngine();
  });

  it('defaults to ask when no rule matches', () => {
    const res = pe.evaluate('fs:read', ['default'], {
      sessionId: crypto.randomUUID(),
      capability: 'fs.read',
      roles: [],
      environment: {},
      metadata: {},
    });
    expect(res.decision).toBe('ask');
    expect(res.requiresApproval).toBe(true);
  });

  it('applies explicit allow rule', async () => {
    await pe.loadPolicy({
      name: 'allow-net',
      version: '1.0.0',
      description: '',
      rules: [{ permission: 'net:fetch', decision: 'allow' }],
      defaultDecision: 'deny',
      inherits: [],
      metadata: {},
    });
    const res = pe.evaluate('net:fetch', ['allow-net'], { sessionId: crypto.randomUUID(), capability: 'echo', roles: [], environment: {}, metadata: {} });
    expect(res.decision).toBe('allow');
    expect(res.requiresApproval).toBe(false);
  });

  it('applies deny rule and rate limits', async () => {
    await pe.loadPolicy({
      name: 'limited',
      version: '1.0.0',
      description: '',
      rules: [{ permission: 'net:fetch', decision: 'allow', rateLimit: { maxRequests: 2, windowMs: 60000 } }],
      defaultDecision: 'ask',
      inherits: [],
      metadata: {},
    });
    const ctx = { sessionId: crypto.randomUUID(), capability: 'echo', roles: [], environment: {}, metadata: {} };
    expect(pe.evaluate('net:fetch', ['limited'], ctx).decision).toBe('allow');
    expect(pe.evaluate('net:fetch', ['limited'], ctx).decision).toBe('allow');
    const third = pe.evaluate('net:fetch', ['limited'], ctx);
    expect(third.decision).toBe('deny');
    expect(third.reason).toContain('Rate limit');
  });

  it('creates and decides approvals via storage', async () => {
    const storage = new MemStorage();
    const engine = new PolicyEngine(storage);
    const approval = await engine.requestApproval(crypto.randomUUID(), 'terminal.exec', 'process:spawn', { cmd: 'npm test' });
    expect(approval.status).toBe('pending');
    const decided = await engine.decideApproval({ requestId: approval.id, decision: 'approved', decidedBy: 'user' });
    expect(decided.status).toBe('approved');
  });
});

describe('EventJournal', () => {
  it('appends entries with increasing seq', () => {
    const j = new EventJournal();
    const e1 = j.push('session_event', 's1', {});
    const e2 = j.push('capability_invoked', 's1', {});
    expect(e2.seq).toBeGreaterThan(e1.seq);
    expect(j.size).toBe(2);
  });

  it('queries by session/kind/afterSeq', () => {
    const j = new EventJournal();
    j.push('session_event', 'a', {});
    j.push('capability_invoked', 'b', {});
    j.push('capability_completed', 'a', {});
    expect(j.query({ sessionId: 'a' }).length).toBe(2);
    expect(j.query({ kind: 'capability_invoked' }).length).toBe(1);
    const all = j.query({});
    expect(j.query({ afterSeq: all[0]!.seq }).length).toBe(all.length - 1);
  });

  it('notifies subscribers', () => {
    const j = new EventJournal();
    let seen = 0;
    j.subscribe(() => seen++);
    j.push('session_event', 'x', {});
    expect(seen).toBe(1);
  });
});

describe('AuthContext + vault', () => {
  it('manages secrets in-memory', async () => {
    const vault = new InMemoryVault();
    await vault.setSecret('openrouter.key', 'sk-test');
    expect(await vault.getSecret('openrouter.key')).toBe('sk-test');
    expect((await vault.listKeys()).length).toBe(1);
    await expect(vault.getSecret('missing')).rejects.toMatchObject({ code: 'VAULT_ERROR' });
    expect(await vault.deleteSecret('openrouter.key')).toBe(true);
  });

  it('identifies roles', () => {
    expect(AuthContext.system().isAdmin()).toBe(true);
    expect(AuthContext.anonymous().isAdmin()).toBe(false);
  });
});

describe('PistonControlPlane E2E', () => {
  it('full flow: register -> policy -> session -> invoke -> journal -> close', async () => {
    const cp = makeCp();
    cp.registerCapability(echoManifest, createMockEchoHandler());
    await cp.loadPolicy({
      name: 'demo-policy',
      version: '1.0.0',
      description: '',
      rules: [{ permission: 'net:fetch', decision: 'allow' }],
      defaultDecision: 'allow',
      inherits: [],
      metadata: {},
    });

    const session = await cp.startSession({ productPack: 'piston-code', policies: ['demo-policy'] });
    expect(session.state).toBe('active');

    const res = await cp.invokeCapability(session.id, 'echo', { message: 'hola' });
    expect(res.success).toBe(true);

    const state = await cp.getState(session.id);
    expect(state.events.length).toBeGreaterThan(0);

    const kinds = cp.journal.query({ sessionId: session.id }).map(e => e.kind);
    expect(kinds).toContain('capability_invoked');

    const closed = await cp.closeSession(session.id);
    expect(closed.state).toBe('closed');

    await cp.shutdown();
  });

  it('denies invocation when policy denies permission', async () => {
    const cp = makeCp();
    cp.registerCapability(
      { ...echoManifest, permissions: ['fs:write'] },
      createMockEchoHandler()
    );
    await cp.loadPolicy({
      name: 'strict',
      version: '1.0.0',
      description: '',
      rules: [{ permission: 'fs:write', decision: 'deny' }],
      defaultDecision: 'ask',
      inherits: [],
      metadata: {},
    });
    const session = await cp.startSession({ policies: ['strict'] });
    const res = await cp.invokeCapability(session.id, 'echo', {});
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('PERMISSION_DENIED');
  });

  it('streams journal entries live', async () => {
    const cp = makeCp();
    const received: string[] = [];
    cp.streamEvents(e => received.push(e.kind));
    const session = await cp.startSession({});
    expect(received.some(k => k === 'session_event')).toBe(true);
    void session;
  });
});
