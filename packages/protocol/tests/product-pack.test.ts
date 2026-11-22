import { describe, it, expect } from 'vitest';
import {
  ProductPackManifestSchema,
  ProductPackInstanceSchema,
  ProductPackUISchema,
  UILayoutSchema,
  BUILTIN_PRODUCT_PACKS,
  getBuiltinProductPack,
  getAllBuiltinProductPacks,
  createProductPackInstance,
  type BuiltinProductPackId,
} from '../src';

describe('Product Pack', () => {
  it('should validate UI layout', () => {
    const valid = {
      panels: [
        { id: 'chat', type: 'chat', position: 'right', size: { width: 360 }, defaultOpen: true },
        { id: 'editor', type: 'editor', position: 'center', defaultOpen: true },
      ],
      theme: 'dark',
      fontSize: 14,
      fontFamily: 'JetBrains Mono',
    };
    expect(UILayoutSchema.safeParse(valid).success).toBe(true);
  });

  it('should validate ProductPackUISchema', () => {
    const valid = {
      layout: {
        panels: [
          { id: 'chat', type: 'chat', position: 'right', defaultOpen: true },
        ],
        theme: 'system',
      },
      defaultAgent: 'coder',
      welcomeMessage: 'Welcome!',
      onboardingSteps: [
        { title: 'Step 1', description: 'Create a session', action: 'create-session' },
      ],
    };
    expect(ProductPackUISchema.safeParse(valid).success).toBe(true);
  });

  it('should have all builtin product packs', () => {
    expect(BUILTIN_PRODUCT_PACKS).toHaveProperty('piston-code');
    expect(BUILTIN_PRODUCT_PACKS).toHaveProperty('piston-gold');
    expect(BUILTIN_PRODUCT_PACKS).toHaveProperty('piston-music');
    expect(BUILTIN_PRODUCT_PACKS).toHaveProperty('piston-video');
  });

  it('should get builtin product pack by id', () => {
    const codePack = getBuiltinProductPack('piston-code');
    expect(codePack.id).toBe('piston-code');
    expect(codePack.name).toBe('Piston Code');
    expect(codePack.agents).toContain('planner');
    expect(codePack.agents).toContain('coder');
    expect(codePack.agents).toContain('reviewer');
    expect(codePack.agents).toContain('debugger');
    expect(codePack.extensions).toContain('git');
    expect(codePack.extensions).toContain('terminal');
    expect(codePack.extensions).toContain('filesystem');
    expect(codePack.extensions).toContain('browser');
    expect(codePack.extensions).toContain('mcp-client');
    expect(codePack.policies).toContain('code-pack');
  });

  it('should get all builtin product packs', () => {
    const packs = getAllBuiltinProductPacks();
    expect(packs.length).toBe(4);
    expect(packs.map(p => p.id)).toEqual(['piston-code', 'piston-gold', 'piston-music', 'piston-video']);
  });

  it('should validate piston-gold pack', () => {
    const pack = getBuiltinProductPack('piston-gold');
    expect(pack.agents).toContain('documenter');
    expect(pack.agents).toContain('analyzer');
    expect(pack.agents).toContain('summarizer');
    expect(pack.extensions).toContain('pdf');
    expect(pack.extensions).toContain('office');
    expect(pack.extensions).toContain('web-search');
    expect(pack.ui.defaultAgent).toBe('documenter');
  });

  it('should validate piston-music pack', () => {
    const pack = getBuiltinProductPack('piston-music');
    expect(pack.agents).toContain('composer');
    expect(pack.agents).toContain('transcriber');
    expect(pack.agents).toContain('stem-splitter');
    expect(pack.extensions).toContain('audio-io');
    expect(pack.extensions).toContain('youtube');
    expect(pack.extensions).toContain('midi');
    expect(pack.ui.layout.panels.some(p => p.type === 'custom')).toBe(true);
  });

  it('should validate piston-video pack', () => {
    const pack = getBuiltinProductPack('piston-video');
    expect(pack.agents).toContain('scriptwriter');
    expect(pack.agents).toContain('editor');
    expect(pack.agents).toContain('thumbnailer');
    expect(pack.extensions).toContain('ffmpeg');
    expect(pack.extensions).toContain('remotion');
    expect(pack.extensions).toContain('stock-video');
    expect(pack.ui.layout.panels.some(p => p.id === 'render-queue')).toBe(true);
  });

  it('should create product pack instance', () => {
    const manifest = getBuiltinProductPack('piston-code');
    const instance = createProductPackInstance(manifest, 'session-123');
    expect(instance.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(instance.manifest.id).toBe('piston-code');
    expect(instance.sessionId).toBe('session-123');
    expect(instance.enabledAgents).toEqual(manifest.agents);
    expect(instance.enabledExtensions).toEqual(manifest.extensions);
    expect(instance.activePolicies).toEqual(manifest.policies);
    expect(instance.state).toBe('inactive');
    expect(instance.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should validate ProductPackManifestSchema', () => {
    const valid = {
      id: 'custom-pack',
      name: 'Custom Pack',
      version: '1.0.0',
      description: 'A custom product pack',
      agents: ['custom-agent'],
      extensions: ['custom-ext'],
      policies: ['custom-policy'],
      ui: {
        layout: { panels: [] },
        defaultAgent: 'custom-agent',
      },
      requiredProtocolVersion: '1.0.0',
      minProtocolVersion: '1.0.0',
    };
    expect(ProductPackManifestSchema.safeParse(valid).success).toBe(true);
  });

  it('should validate ProductPackInstanceSchema', () => {
    const valid = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      manifest: {
        id: 'piston-code',
        name: 'Piston Code',
        version: '1.0.0',
        description: 'Software development',
        agents: ['planner', 'coder'],
        extensions: ['git', 'terminal'],
        policies: ['code-pack'],
        ui: { layout: { panels: [] } },
      },
      sessionId: '123e4567-e89b-12d3-a456-426614174001',
      enabledAgents: ['planner', 'coder'],
      enabledExtensions: ['git', 'terminal'],
      activePolicies: ['code-pack'],
      state: 'active',
      createdAt: new Date().toISOString(),
      activatedAt: new Date().toISOString(),
    };
    expect(ProductPackInstanceSchema.safeParse(valid).success).toBe(true);
  });

  it('should reject invalid product pack ID', () => {
    const invalid = {
      id: 'Invalid-Pack',
      name: 'Invalid',
      version: '1.0.0',
      description: 'Invalid ID',
      agents: [],
      extensions: [],
      policies: [],
      ui: { layout: { panels: [] } },
    };
    expect(ProductPackManifestSchema.safeParse(invalid).success).toBe(false);
  });

  it('should have correct panel configurations for piston-code', () => {
    const pack = getBuiltinProductPack('piston-code');
    const panelIds = pack.ui.layout.panels.map(p => p.id);
    expect(panelIds).toContain('file-tree');
    expect(panelIds).toContain('editor');
    expect(panelIds).toContain('terminal');
    expect(panelIds).toContain('chat');
    expect(panelIds).toContain('artifacts');
  });
});