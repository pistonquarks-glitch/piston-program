import { describe, it, expect } from 'vitest';
import {
  PISTON_ERROR_CODES,
  PistonError,
  PistonErrorCodeSchema,
  ErrorResponseSchema,
  isPistonError,
} from '../src';

describe('Piston Errors', () => {
  it('should have all error codes defined', () => {
    expect(PISTON_ERROR_CODES).toContain('SESSION_NOT_FOUND');
    expect(PISTON_ERROR_CODES).toContain('CAPABILITY_NOT_FOUND');
    expect(PISTON_ERROR_CODES).toContain('PERMISSION_DENIED');
    expect(PISTON_ERROR_CODES).toContain('VALIDATION_ERROR');
    expect(PISTON_ERROR_CODES).toContain('INTERNAL_ERROR');
  });

  it('should validate error code schema', () => {
    expect(PistonErrorCodeSchema.safeParse('SESSION_NOT_FOUND').success).toBe(true);
    expect(PistonErrorCodeSchema.safeParse('INVALID_CODE').success).toBe(false);
  });

  it('should create PistonError with code and message', () => {
    const error = new PistonError('SESSION_NOT_FOUND', 'Session not found');
    expect(error.code).toBe('SESSION_NOT_FOUND');
    expect(error.message).toBe('Session not found');
    expect(error.name).toBe('PistonError');
  });

  it('should create PistonError with details', () => {
    const error = new PistonError('VALIDATION_ERROR', 'Invalid input', { field: 'email', reason: 'invalid format' });
    expect(error.details).toEqual({ field: 'email', reason: 'invalid format' });
  });

  it('should create PistonError with cause', () => {
    const cause = new Error('Network error');
    const error = new PistonError('CAPABILITY_INVOCATION_FAILED', 'Capability failed', undefined, cause);
    expect(error.cause).toBe(cause);
  });

  it('should serialize to JSON', () => {
    const error = new PistonError('SESSION_NOT_FOUND', 'Session not found', { sessionId: '123' });
    const json = error.toJSON();
    expect(json.code).toBe('SESSION_NOT_FOUND');
    expect(json.message).toBe('Session not found');
    expect(json.details).toEqual({ sessionId: '123' });
  });

  it('should identify PistonError instances', () => {
    const error = new PistonError('SESSION_NOT_FOUND', 'test');
    expect(isPistonError(error)).toBe(true);
    expect(isPistonError(new Error('test'))).toBe(false);
    expect(isPistonError({})).toBe(false);
    expect(isPistonError(null)).toBe(false);
  });

  it('should create PistonError from unknown error', () => {
    const error = PistonError.fromError(new Error('Original error'), 'CAPABILITY_INVOCATION_FAILED');
    expect(error.code).toBe('CAPABILITY_INVOCATION_FAILED');
    expect(error.message).toBe('Original error');
    expect(error.cause).toBeInstanceOf(Error);
  });

  it('should handle non-Error in fromError', () => {
    const error = PistonError.fromError('string error', 'INTERNAL_ERROR');
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.message).toBe('string error');
  });

  it('should validate error response schema', () => {
    const validResponse = {
      code: 'SESSION_NOT_FOUND',
      message: 'Session not found',
      details: { sessionId: '123' },
    };
    expect(ErrorResponseSchema.safeParse(validResponse).success).toBe(true);

    const invalidResponse = {
      code: 'INVALID_CODE',
      message: 'test',
    };
    expect(ErrorResponseSchema.safeParse(invalidResponse).success).toBe(false);
  });
});