import { type SessionEvent, type CapabilityRequest, type CapabilityResponse } from '@piston/protocol';

export interface JournalEntry {
  seq: number;
  timestamp: string;
  kind: 'session_event' | 'capability_invoked' | 'capability_completed' | 'capability_failed';
  sessionId: string;
  data: Record<string, unknown>;
}

export class EventJournal {
  private readonly entries: JournalEntry[] = [];
  private seq = 0;
  private readonly listeners = new Set<(entry: JournalEntry) => void>();
  private readonly maxEntries: number;

  constructor(maxEntries = 50000) {
    this.maxEntries = maxEntries;
  }

  private push(kind: JournalEntry['kind'], sessionId: string, data: Record<string, unknown>): JournalEntry {
    const entry: JournalEntry = {
      seq: ++this.seq,
      timestamp: new Date().toISOString(),
      kind,
      sessionId,
      data,
    };
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch {
        // listener errors must not break the journal
      }
    }
    return entry;
  }

  sessionEvent(event: SessionEvent): JournalEntry {
    return this.push('session_event', event.sessionId, { eventId: event.id, type: event.type, payload: event.payload });
  }

  capabilityInvoked(request: CapabilityRequest): JournalEntry {
    return this.push('capability_invoked', request.sessionId, { requestId: request.id, capability: request.capability, params: request.params });
  }

  capabilityCompleted(response: CapabilityResponse): JournalEntry {
    return this.push(
      response.success ? 'capability_completed' : 'capability_failed',
      response.sessionId,
      { requestId: response.requestId, duration: response.duration, result: response.result ?? undefined, error: response.error ?? undefined }
    );
  }

  subscribe(listener: (entry: JournalEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  query(filter?: { sessionId?: string; kind?: JournalEntry['kind']; afterSeq?: number; limit?: number }): JournalEntry[] {
    let result = this.entries;
    if (filter?.sessionId) result = result.filter(e => e.sessionId === filter.sessionId);
    if (filter?.kind) result = result.filter(e => e.kind === filter.kind);
    if (filter?.afterSeq !== undefined) result = result.filter(e => e.seq > filter.afterSeq!);
    const limit = filter?.limit ?? 1000;
    return result.slice(-limit);
  }

  get size(): number {
    return this.entries.length;
  }
}
