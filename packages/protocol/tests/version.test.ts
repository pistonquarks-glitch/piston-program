import { describe, it, expect } from 'vitest';
import { isCompatibleVersion, getMajorVersion, areCompatible, PROTOCOL_VERSION, SUPPORTED_PROTOCOL_VERSIONS } from '../src';

describe('Protocol Version', () => {
  it('should have correct protocol version', () => {
    expect(PROTOCOL_VERSION).toBe('1.0.0');
  });

  it('should list supported versions', () => {
    expect(SUPPORTED_PROTOCOL_VERSIONS).toContain('1.0.0');
  });

  it('should validate compatible versions', () => {
    expect(isCompatibleVersion('1.0.0')).toBe(true);
    expect(isCompatibleVersion('1.0.1')).toBe(false);
    expect(isCompatibleVersion('2.0.0')).toBe(false);
  });

  it('should extract major version', () => {
    expect(getMajorVersion('1.0.0')).toBe(1);
    expect(getMajorVersion('2.5.3')).toBe(2);
    expect(getMajorVersion('10.0.0')).toBe(10);
    expect(getMajorVersion('invalid')).toBe(0);
  });

  it('should check version compatibility', () => {
    expect(areCompatible('1.0.0', '1.0.1')).toBe(true);
    expect(areCompatible('1.2.3', '1.5.0')).toBe(true);
    expect(areCompatible('1.0.0', '2.0.0')).toBe(false);
    expect(areCompatible('2.0.0', '1.0.0')).toBe(false);
  });
});