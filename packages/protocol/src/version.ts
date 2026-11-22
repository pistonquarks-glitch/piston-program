import { z } from 'zod';

export const PROTOCOL_VERSION = '1.0.0' as const;

export const ProtocolVersionSchema = z.string().regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/);

export type ProtocolVersion = z.infer<typeof ProtocolVersionSchema>;

export const CompatibilityMatrixSchema = z.record(z.string(), z.array(z.string()));

export type CompatibilityMatrix = z.infer<typeof CompatibilityMatrixSchema>;

export const SUPPORTED_PROTOCOL_VERSIONS = ['1.0.0'] as const;

export function isCompatibleVersion(version: string): boolean {
  return SUPPORTED_PROTOCOL_VERSIONS.includes(version as typeof SUPPORTED_PROTOCOL_VERSIONS[number]);
}

export function getMajorVersion(version: string): number {
  const match = version.match(/^(\d+)\./);
  return match ? parseInt(match[1]!, 10) : 0;
}

export function areCompatible(v1: string, v2: string): boolean {
  return getMajorVersion(v1) === getMajorVersion(v2);
}