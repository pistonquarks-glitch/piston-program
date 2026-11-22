import { z } from 'zod';

export interface StorageAdapter {
  readonly name: string;
  get(key: string): Promise<unknown | undefined>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
  keys(prefix?: string): Promise<string[]>;
  clear(): Promise<void>;
  close(): Promise<void>;
}

const STORAGE_KEY_RE = /^[a-zA-Z0-9:_\-.]+$/;
export const StorageKeySchema = z.string().regex(STORAGE_KEY_RE);

export function storageKey(namespace: string, id: string): string {
  return `${namespace}:${id}`;
}

export class MemStorage implements StorageAdapter {
  public readonly name = 'memory';
  private readonly map = new Map<string, unknown>();

  async get(key: string): Promise<unknown | undefined> {
    return this.map.get(key);
  }

  async set(key: string, value: unknown): Promise<void> {
    this.map.set(key, structuredClone(value));
  }

  async delete(key: string): Promise<boolean> {
    return this.map.delete(key);
  }

  async keys(prefix = ''): Promise<string[]> {
    return [...this.map.keys()].filter(k => k.startsWith(prefix));
  }

  async clear(): Promise<void> {
    this.map.clear();
  }

  async close(): Promise<void> {
    this.map.clear();
  }
}

export const NAMESPACE_SESSIONS = 'sessions' as const;
export const NAMESPACE_EVENTS = 'events' as const;
export const NAMESPACE_CAPABILITIES = 'capabilities' as const;
export const NAMESPACE_POLICIES = 'policies' as const;
export const NAMESPACE_APPROVALS = 'approvals' as const;