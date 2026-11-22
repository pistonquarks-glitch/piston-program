import { describe, it, expect } from 'vitest';
import {
  AgentManifestSchema,
  AgentInstanceSchema,
  AgentEventSchema,
  AgentStepSchema,
  AgentConfigSchema,
  AgentEventTypeSchema,
  BUILTIN_AGENT_CAPABILITIES,
  createAgentInstance,
  createAgentEvent,
} from '../src';

describe('Agent', () => {
  it('should validate agent event types', () => {
    expect(AgentEventTypeSchema.safeParse('initialized').success).toBe(true);
    expect(AgentEventTypeSchema.safeParse('started').success).toBe(true);
    expect(AgentEventTypeSchema.safeParse('step').success).toBe(true);
    expect(AgentEventTypeSchema.safeParse('tool_call').success).toBe(true);
    expect(AgentEventTypeSchema.safeParse('tool_result').success).toBe(true);
    expect(AgentEventTypeSchema.safeParse('thinking').success).toBe(true);
    expect(AgentEventTypeSchema.safeParse('message').success).toBe(true);
    expect(AgentEventTypeSchema.safeParse('paused').success).toBe(true);
    expect(AgentEventTypeSchema.safeParse('resumed').success).toBe(true);
    expect(AgentEventTypeSchema.safeParse('stopped').success).toBe(true);
    expect(AgentEventTypeSchema.safeParse('completed').success).toBe(true);
    expect(AgentEventTypeSchema.safeParse('error').success).toBe(true);
    expect(AgentEventTypeSchema.safeParse('invalid').success).toBe(false);
  });

  it('should have builtin agent capabilities', () => {
    expect(BUILTIN_AGENT_CAPABILITIES).toContain('task.decompose');
    expect(BUILTIN_AGENT_CAPABILITIES).toContain('code.generate');
    expect(BUILTIN_AGENT_CAPABILITIES).toContain('fs.read');
    expect(BUILTIN_AGENT_CAPABILITIES).toContain('terminal.exec');
    expect(BUILTIN_AGENT_CAPABILITIES).toContain('git.clone');
  });

  it('should validate agent manifest', () => {
    const valid = {
      id: 'coder',
      name: 'Code Generator',
      version: '1.0.0',
      description: 'Generates code from prompts',
      author: 'Piston',
      license: 'MIT',
      keywords: ['code', 'generation'],
      capabilities: ['code.generate', 'code.edit'],
      requiredCapabilities: ['fs.read', 'fs.write'],
      optionalCapabilities: ['git.diff'],
      configSchema: {
        type: 'object',
        properties: {
          temperature: { type: 'number', default: 0.2 },
          maxTokens: { type: 'number', default: 4000 },
        },
        required: [],
      },
      defaultConfig: { temperature: 0.2, maxTokens: 4000 },
      entryPoint: './coder.ts',
      runtime: 'worker',
      tags: ['coding'],
      deprecated: false,
    };
    expect(AgentManifestSchema.safeParse(valid).success).toBe(true);
  });

  it('should validate AgentManifestSchema with minimal config', () => {
    const minimal = {
      id: 'simple-agent',
      name: 'Simple Agent',
      version: '1.0.0',
      description: 'A simple agent',
      capabilities: [],
      requiredCapabilities: [],
      optionalCapabilities: [],
      runtime: 'node',
    };
    expect(AgentManifestSchema.safeParse(minimal).success).toBe(true);
  });

  it('should reject invalid agent ID', () => {
    const invalid = {
      id: 'Invalid-Agent',
      name: 'Invalid',
      version: '1.0.0',
      description: 'Invalid ID',
      capabilities: [],
      requiredCapabilities: [],
      optionalCapabilities: [],
    };
    expect(AgentManifestSchema.safeParse(invalid).success).toBe(false);
  });

  it('should create agent instance', () => {
    const manifest = {
      id: 'coder',
      name: 'Code Generator',
      version: '1.0.0',
      description: 'Generates code',
      capabilities: ['code.generate'],
      requiredCapabilities: ['fs.write'],
      optionalCapabilities: [],
      runtime: 'worker' as const,
    };
    const instance = createAgentInstance(manifest, { temperature: 0.2 }, 'session-123');
    expect(instance.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(instance.manifest.id).toBe('coder');
    expect(instance.config).toEqual({ temperature: 0.2 });
    expect(instance.sessionId).toBe('session-123');
    expect(instance.state).toBe('initializing');
    expect(instance.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should create agent event', () => {
    const event = createAgentEvent('agent-123', 'session-123', 'tool_call', { capability: 'fs.write', params: { path: 'test.ts' } }, 'corr-123');
    expect(event.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(event.agentId).toBe('agent-123');
    expect(event.sessionId).toBe('session-123');
    expect(event.type).toBe('tool_call');
    expect(event.payload).toEqual({ capability: 'fs.write', params: { path: 'test.ts' } });
    expect(event.correlationId).toBe('corr-123');
  });

  it('should validate AgentInstanceSchema', () => {
    const valid = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      manifest: {
        id: 'coder',
        name: 'Code Generator',
        version: '1.0.0',
        description: 'Generates code',
        capabilities: ['code.generate'],
        requiredCapabilities: ['fs.write'],
        optionalCapabilities: [],
        runtime: 'worker',
      },
      config: { temperature: 0.2 },
      sessionId: '123e4567-e89b-12d3-a456-426614174001',
      state: 'running',
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      metadata: {},
    };
    expect(AgentInstanceSchema.safeParse(valid).success).toBe(true);
  });

  it('should validate AgentEventSchema', () => {
    const valid = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      agentId: '123e4567-e89b-12d3-a456-426614174001',
      sessionId: '123e4567-e89b-12d3-a456-426614174002',
      type: 'tool_call',
      timestamp: new Date().toISOString(),
      payload: { capability: 'fs.write' },
      correlationId: '123e4567-e89b-12d3-a456-426614174003',
    };
    expect(AgentEventSchema.safeParse(valid).success).toBe(true);
  });

  it('should validate AgentStepSchema', () => {
    const valid = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      agentId: '123e4567-e89b-12d3-a456-426614174001',
      sessionId: '123e4567-e89b-12d3-a456-426614174002',
      stepNumber: 1,
      type: 'tool_call',
      input: { prompt: 'Create file' },
      output: { success: true },
      toolCalls: [
        { capability: 'fs.write', params: { path: 'test.ts', content: 'export {}' }, result: { ok: true } },
      ],
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      duration: 500,
      metadata: {},
    };
    expect(AgentStepSchema.safeParse(valid).success).toBe(true);
  });

  it('should validate AgentConfigSchema', () => {
    const valid = { temperature: 0.2, maxTokens: 4000, model: 'gpt-4' };
    expect(AgentConfigSchema.safeParse(valid).success).toBe(true);
  });
});