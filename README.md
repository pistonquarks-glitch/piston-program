# Piston Code Agent

Piston Code Agent is the first product pack of an open, modular platform for AI-assisted creation and automation.

## Phase 1 status

Phase 1 establishes the monorepo, quality gates, package boundaries and architecture records. It intentionally contains no agent, model, plugin, product or UI implementation.

## Workspace

- `apps/`: empty client shells for desktop and CLI surfaces.
- `product-packs/`: declarative product boundaries.
- `packages/`: platform contracts and runtime boundaries.
- `extensions/`: future built-in extensions.
- `docs/architecture/`: Architecture Decision Records.

## Commands

```bash
pnpm install
pnpm run check
pnpm run build
pnpm run verify:workspaces
```

## Architecture

The dependency direction is enforced by design: apps and product packs use public client/protocol contracts; implementations remain behind Control Plane, Agent Worker and Extension Host boundaries. See `docs/architecture` for accepted decisions.

## License

MIT. See [LICENSE](LICENSE).
