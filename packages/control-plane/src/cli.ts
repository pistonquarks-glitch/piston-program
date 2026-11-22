import { PistonControlPlane, createMockEchoHandler } from './api.js';
import { PROTOCOL_VERSION } from '@piston/protocol';

async function main(): Promise<void> {
  console.log('=== Piston Control Plane — CLI Demo ===');
  console.log(`Protocol version: ${PROTOCOL_VERSION}\n`);

  const cp = new PistonControlPlane();

  cp.registerCapability(
    {
      name: 'echo',
      version: '1.0.0',
      type: 'tool',
      description: 'Echoes back the given message (mock)',
      parameters: [{ name: 'message', type: 'string', required: true }],
      permissions: [],
      executionLocation: 'local',
      timeout: 5000,
      idempotent: true,
      deprecated: false,
      tags: ['demo'],
    },
    createMockEchoHandler()
  );
  console.log('[1] Capability registered: echo@1.0.0');

  await cp.loadPolicy({
    name: 'demo-policy',
    version: '1.0.0',
    description: 'Demo policy: allow everything',
    rules: [{ permission: 'net:fetch', decision: 'allow' }],
    defaultDecision: 'allow',
    inherits: [],
    metadata: {},
  });
  console.log('[2] Policy loaded: demo-policy (default allow)');

  const session = await cp.startSession({ productPack: 'piston-code', policies: ['demo-policy'] });
  console.log(`[3] Session started: ${session.id} (state=${session.state}, pack=${session.config.productPack})`);

  const response = await cp.invokeCapability(session.id, 'echo', { message: 'Hola desde Piston Control Plane' });
  console.log(`[4] Capability invoked: success=${response.success}, duration=${response.duration}ms`);
  console.log(`    Result: ${JSON.stringify(response.result)}`);

  const missing = await cp.invokeCapability(session.id, 'no.existe', {});
  console.log(`[5] Unknown capability handled: success=${missing.success}, error=${missing.error?.code}`);

  const state = await cp.getState(session.id);
  console.log(`[6] Journal entries for session: ${state.events.length}`);

  const closed = await cp.closeSession(session.id);
  console.log(`[7] Session closed: state=${closed.state}, events=${closed.eventCount}`);

  console.log('\nJournal completo:');
  for (const entry of cp.journal.query()) {
    console.log(`  #${entry.seq} [${entry.kind}] ${entry.timestamp}`);
  }

  await cp.shutdown();
  console.log('\n=== Demo completa OK ===');
}

main().catch(err => {
  console.error('CLI demo failed:', err);
  process.exit(1);
});
