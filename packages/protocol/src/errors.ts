import { z } from 'zod';

export const PISTON_ERROR_CODES = [
  'SESSION_NOT_FOUND',
  'SESSION_ALREADY_EXISTS',
  'SESSION_EXPIRED',
  'SESSION_INVALID_STATE',
  'CAPABILITY_NOT_FOUND',
  'CAPABILITY_UNAVAILABLE',
  'CAPABILITY_INVOCATION_FAILED',
  'CAPABILITY_TIMEOUT',
  'CAPABILITY_VALIDATION_ERROR',
  'PERMISSION_DENIED',
  'PERMISSION_REQUIRES_APPROVAL',
  'POLICY_EVALUATION_FAILED',
  'INVALID_CREDENTIALS',
  'VAULT_ERROR',
  'STORAGE_ERROR',
  'STORAGE_NOT_AVAILABLE',
  'SERIALIZATION_ERROR',
  'VALIDATION_ERROR',
  'INTERNAL_ERROR',
  'NOT_IMPLEMENTED',
  'UNSUPPORTED_PROTOCOL_VERSION',
] as const;

export type PistonErrorCode = typeof PISTON_ERROR_CODES[number];

export const PistonErrorCodeSchema = z.enum(PISTON_ERROR_CODES);

export class PistonError extends Error {
  public readonly code: PistonErrorCode;
  public readonly details: Record<string, unknown>;
  public override readonly cause: Error;

  constructor(code: PistonErrorCode, message: string, details: Record<string, unknown> = {}, cause?: Error) {
    super(message);
    this.name = 'PistonError';
    this.code = code;
    this.details = details;
    this.cause = cause ?? new Error(message);
    Error.captureStackTrace?.(this, PistonError);
  }

  static fromError(error: unknown, defaultCode: PistonErrorCode = 'INTERNAL_ERROR'): PistonError {
    if (error instanceof PistonError) return error;
    if (error instanceof Error) {
      return new PistonError(defaultCode, error.message, undefined, error);
    }
    return new PistonError(defaultCode, String(error));
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      cause: this.cause?.message,
      stack: this.stack,
    };
  }
}

export function isPistonError(error: unknown): error is PistonError {
  return error instanceof PistonError;
}

export const ErrorResponseSchema = z.object({
  code: PistonErrorCodeSchema,
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;