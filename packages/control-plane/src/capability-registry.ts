import {
  type Capability,
  type CapabilityManifest,
  CapabilityManifestSchema,
  type CapabilityRequest,
  type CapabilityResponse,
  createCapabilityResponse,
  PistonError,
  areCompatible,
} from '@piston/protocol';

export interface CapabilityHandler {
  (request: CapabilityRequest): Promise<Omit<CapabilityResponse, 'id' | 'requestId' | 'sessionId' | 'duration' | 'timestamp'>>;
}

export class CapabilityRegistry {
  private readonly capabilities = new Map<string, { manifest: CapabilityManifest; handler: CapabilityHandler }>();

  register(manifest: unknown, handler: CapabilityHandler): CapabilityManifest {
    const parsed = CapabilityManifestSchema.parse(manifest);
    if (this.capabilities.has(parsed.name)) {
      throw new PistonError('INTERNAL_ERROR', `Capability '${parsed.name}' already registered`, { capability: parsed.name });
    }
    this.capabilities.set(parsed.name, { manifest: parsed, handler });
    return parsed;
  }

  unregister(name: string): boolean {
    return this.capabilities.delete(name);
  }

  has(name: string, version?: string): boolean {
    const entry = this.capabilities.get(name);
    if (!entry) return false;
    if (!version) return true;
    return areCompatible(entry.manifest.version, version);
  }

  get(name: string): Capability & { handler: CapabilityHandler } {
    const entry = this.capabilities.get(name);
    if (!entry) {
      throw new PistonError('CAPABILITY_NOT_FOUND', `Capability '${name}' not registered`, { capability: name });
    }
    return { ...entry.manifest, handler: entry.handler };
  }

  list(): Capability[] {
    return [...this.capabilities.values()].map(e => {
      const { entryPoint: _ep, dependencies: _d, provides: _p, requires: _r, ...rest } = e.manifest;
      return rest as Capability;
    });
  }

  discover(filter?: { type?: Capability['type']; tag?: string }): Capability[] {
    return this.list().filter(c => {
      if (filter?.type && c.type !== filter.type) return false;
      if (filter?.tag && !c.tags.includes(filter.tag)) return false;
      return true;
    });
  }

  async invoke(request: CapabilityRequest): Promise<CapabilityResponse> {
    const start = Date.now();
    let entry = this.capabilities.get(request.capability);
    if (!entry) {
      return createCapabilityResponse(
        request,
        false,
        { error: { code: 'CAPABILITY_NOT_FOUND', message: `Capability '${request.capability}' not registered`, capability: request.capability, sessionId: request.sessionId, recoverable: false } },
        [],
        [],
        start
      );
    }
    if (request.version && !areCompatible(entry.manifest.version, request.version)) {
      return createCapabilityResponse(
        request,
        false,
        { error: { code: 'CAPABILITY_UNAVAILABLE', message: `Version mismatch: requested ${request.version}, available ${entry.manifest.version}`, capability: request.capability, sessionId: request.sessionId, recoverable: false } },
        [],
        [],
        start
      );
    }
    try {
      const partial = await entry.handler(request);
      return createCapabilityResponse(request, true, partial as { result?: unknown }, [], [], start);
    } catch (err) {
      const error = PistonError.fromError(err, 'CAPABILITY_INVOCATION_FAILED');
      return createCapabilityResponse(
        request,
        false,
        { error: { code: error.code, message: error.message, capability: request.capability, sessionId: request.sessionId, details: error.details, recoverable: false } },
        [],
        [],
        start
      );
    }
  }
}
