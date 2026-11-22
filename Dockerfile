FROM node:24-bookworm-slim

WORKDIR /workspace
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY .prettierrc.json .prettierignore eslint.config.mjs ./
COPY apps ./apps
COPY packages ./packages
COPY configs ./configs

RUN pnpm install --frozen-lockfile
RUN pnpm run check

CMD ["pnpm", "run", "test"]
