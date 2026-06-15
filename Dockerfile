FROM oven/bun:1-slim AS builder

WORKDIR /app
COPY package.json bun.lockb bunfig.toml ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
RUN bun install --frozen-lockfile

COPY packages/ packages/
COPY .env .env

FROM oven/bun:1-slim

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/packages packages
COPY --from=builder /app/package.json .
COPY --from=builder /app/.env .env

RUN mkdir -p uploads && chown -R bun:bun /app
USER bun
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["bun", "packages/server/src/index.ts"]
