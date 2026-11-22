import { z } from 'zod';
import { PistonError } from '@piston/protocol';

export const IdentitySchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  roles: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
});
export type Identity = z.infer<typeof IdentitySchema>;

export interface SecretsVault {
  readonly name: string;
  getSecret(key: string): Promise<string>;
  setSecret(key: string, value: string): Promise<void>;
  deleteSecret(key: string): Promise<boolean>;
  listKeys(): Promise<string[]>;
}

export class InMemoryVault implements SecretsVault {
  public readonly name = 'in-memory';
  private readonly secrets = new Map<string, string>();

  async getSecret(key: string): Promise<string> {
    const value = this.secrets.get(key);
    if (value === undefined) {
      throw new PistonError('VAULT_ERROR', `Secret '${key}' not found`, { key });
    }
    return value;
  }

  async setSecret(key: string, value: string): Promise<void> {
    this.secrets.set(key, value);
  }

  async deleteSecret(key: string): Promise<boolean> {
    return this.secrets.delete(key);
  }

  async listKeys(): Promise<string[]> {
    return [...this.secrets.keys()];
  }
}

export class AuthContext {
  constructor(
    public readonly identity: Identity,
    private readonly vault: SecretsVault = new InMemoryVault()
  ) {}

  static anonymous(): AuthContext {
    return new AuthContext({ id: 'anonymous', displayName: 'Anonymous', roles: [], metadata: {} });
  }

  static system(): AuthContext {
    return new AuthContext({ id: 'system', displayName: 'System', roles: ['admin'], metadata: {} });
  }

  hasRole(role: string): boolean {
    return this.identity.roles.includes(role);
  }

  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  vaultAccess(): SecretsVault {
    return this.vault;
  }
}

export function createIdentity(input: unknown): Identity {
  return IdentitySchema.parse(input);
}
