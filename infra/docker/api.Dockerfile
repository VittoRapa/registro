# Stage 1: Base & Dependencies
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS dependencies
WORKDIR /app

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages/config/package.json ./packages/config/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM dependencies AS builder
WORKDIR /app

COPY packages/config ./packages/config
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY tsconfig.json* turbo.json ./

# Generate Prisma client and build API
RUN pnpm --filter @registro/api prisma:generate
RUN pnpm --filter @registro/api build
RUN pnpm --filter @registro/api --prod deploy /app/pruned

# Stage 3: Runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/pruned/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./package.json

USER nestjs

EXPOSE 4000
CMD ["node", "dist/main.js"]
