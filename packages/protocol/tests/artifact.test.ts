import { describe, it, expect } from 'vitest';
import {
  ArtifactSchema,
  ArtifactMetadataSchema,
  ArtifactReferenceSchema,
  CreateArtifactSchema,
  ArtifactKindSchema,
  createArtifact,
  isArtifactComplete,
  getArtifactSize,
} from '../src';

describe('Artifacts', () => {
  it('should validate artifact kinds', () => {
    expect(ArtifactKindSchema.safeParse('file').success).toBe(true);
    expect(ArtifactKindSchema.safeParse('text').success).toBe(true);
    expect(ArtifactKindSchema.safeParse('image').success).toBe(true);
    expect(ArtifactKindSchema.safeParse('audio').success).toBe(true);
    expect(ArtifactKindSchema.safeParse('video').success).toBe(true);
    expect(ArtifactKindSchema.safeParse('reference').success).toBe(true);
    expect(ArtifactKindSchema.safeParse('invalid').success).toBe(false);
  });

  it('should validate artifact metadata', () => {
    const valid = {
      mimeType: 'text/plain',
      size: 100,
      encoding: 'utf-8',
      checksum: 'abc123',
      duration: 30,
      dimensions: { width: 1920, height: 1080 },
      source: 'generated',
      tags: ['test', 'demo'],
      custom: { key: 'value' },
    };
    expect(ArtifactMetadataSchema.safeParse(valid).success).toBe(true);
  });

  it('should validate artifact reference', () => {
    const valid = {
      artifactId: '123e4567-e89b-12d3-a456-426614174000',
      sessionId: '123e4567-e89b-12d3-a456-426614174001',
      access: 'read',
    };
    expect(ArtifactReferenceSchema.safeParse(valid).success).toBe(true);
  });

  it('should create artifact with generated ID and timestamps', () => {
    const input = {
      kind: 'text' as const,
      name: 'test.txt',
      content: 'Hello world',
      metadata: { mimeType: 'text/plain' },
    };
    const artifact = createArtifact(input);
    expect(artifact.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(artifact.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(artifact.updatedAt).toBe(artifact.createdAt);
    expect(artifact.kind).toBe('text');
    expect(artifact.name).toBe('test.txt');
    expect(artifact.content).toBe('Hello world');
  });

  it('should validate artifact with content', () => {
    const artifact = createArtifact({
      kind: 'text',
      name: 'test.txt',
      content: 'Hello',
    });
    expect(ArtifactSchema.safeParse(artifact).success).toBe(true);
    expect(isArtifactComplete(artifact)).toBe(true);
  });

  it('should validate artifact with URI', () => {
    const artifact = createArtifact({
      kind: 'image',
      name: 'test.png',
      uri: 'https://example.com/test.png',
    });
    expect(ArtifactSchema.safeParse(artifact).success).toBe(true);
    expect(isArtifactComplete(artifact)).toBe(true);
  });

  it('should detect incomplete artifact', () => {
    const artifact = createArtifact({
      kind: 'file',
      name: 'empty.txt',
    });
    expect(isArtifactComplete(artifact)).toBe(false);
  });

  it('should calculate artifact size from content', () => {
    const artifact = createArtifact({
      kind: 'text',
      name: 'test.txt',
      content: 'Hello world',
    });
    expect(getArtifactSize(artifact)).toBe(11);
  });

  it('should calculate artifact size from Uint8Array', () => {
    const artifact = createArtifact({
      kind: 'file',
      name: 'test.bin',
      content: new Uint8Array([1, 2, 3, 4, 5]),
    });
    expect(getArtifactSize(artifact)).toBe(5);
  });

  it('should calculate artifact size from ArrayBuffer', () => {
    const artifact = createArtifact({
      kind: 'file',
      name: 'test.bin',
      content: new ArrayBuffer(10),
    });
    expect(getArtifactSize(artifact)).toBe(10);
  });

  it('should use metadata size when available', () => {
    const artifact = createArtifact({
      kind: 'file',
      name: 'test.bin',
      content: 'small',
      metadata: { size: 1000 },
    });
    expect(getArtifactSize(artifact)).toBe(1000);
  });

  it('should validate CreateArtifactSchema', () => {
    const valid = {
      kind: 'text',
      name: 'test.txt',
      content: 'Hello',
      metadata: { mimeType: 'text/plain' },
    };
    expect(CreateArtifactSchema.safeParse(valid).success).toBe(true);

    const invalid = {
      kind: 'text',
      name: '',
    };
    expect(CreateArtifactSchema.safeParse(invalid).success).toBe(false);
  });
});