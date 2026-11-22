import { z } from 'zod';

export const ArtifactKindSchema = z.enum(['file', 'text', 'image', 'audio', 'video', 'reference']);
export type ArtifactKind = z.infer<typeof ArtifactKindSchema>;

export const ArtifactMetadataSchema = z.object({
  mimeType: z.string().optional(),
  size: z.number().int().nonnegative().optional(),
  encoding: z.string().optional(),
  checksum: z.string().optional(),
  duration: z.number().nonnegative().optional(),
  dimensions: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }).optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
  custom: z.record(z.unknown()).optional(),
});
export type ArtifactMetadata = z.infer<typeof ArtifactMetadataSchema>;

export const ArtifactSchema = z.object({
  id: z.string().uuid(),
  kind: ArtifactKindSchema,
  name: z.string().min(1),
  content: z.union([z.string(), z.instanceof(Uint8Array), z.instanceof(ArrayBuffer)]).optional(),
  uri: z.string().url().optional(),
  metadata: ArtifactMetadataSchema.default({}),
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
  updatedAt: z.string().datetime().default(() => new Date().toISOString()),
});
export type Artifact = z.infer<typeof ArtifactSchema>;

export const CreateArtifactSchema = ArtifactSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type CreateArtifact = z.infer<typeof CreateArtifactSchema>;

export const ArtifactReferenceSchema = z.object({
  artifactId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  access: z.enum(['read', 'write', 'owner']).default('read'),
});
export type ArtifactReference = z.infer<typeof ArtifactReferenceSchema>;

export function createArtifact(input: CreateArtifact): Artifact {
  const now = new Date().toISOString();
  return {
    ...input,
    id: crypto.randomUUID(),
    metadata: input.metadata ?? {},
    createdAt: now,
    updatedAt: now,
  } as Artifact;
}

export function isArtifactComplete(artifact: Artifact): boolean {
  return artifact.content !== undefined || artifact.uri !== undefined;
}

export function getArtifactSize(artifact: Artifact): number {
  if (artifact.metadata.size !== undefined) return artifact.metadata.size;
  if (artifact.content instanceof Uint8Array) return artifact.content.length;
  if (artifact.content instanceof ArrayBuffer) return artifact.content.byteLength;
  if (typeof artifact.content === 'string') return new TextEncoder().encode(artifact.content).length;
  return 0;
}