# ──────────────────────────────────────────────
# Stage 1: base – shared Node 20 + pnpm + ffmpeg
# ──────────────────────────────────────────────
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.29.2 --activate
RUN apk add --no-cache ffmpeg
WORKDIR /app

# ──────────────────────────────────────────────
# Stage 2: deps – install all workspace deps
# ──────────────────────────────────────────────
FROM base AS deps

# Copy workspace manifests first (for cache)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json              apps/api/package.json
COPY apps/web/package.json              apps/web/package.json
COPY apps/media-worker/package.json     apps/media-worker/package.json
COPY packages/db/package.json           packages/db/package.json
COPY packages/queue/package.json        packages/queue/package.json
COPY packages/s3/package.json           packages/s3/package.json

RUN pnpm install --frozen-lockfile

# ──────────────────────────────────────────────
# Stage 3: source – copy all source + generate prisma
# ──────────────────────────────────────────────
FROM deps AS source
COPY . .
RUN pnpm --filter @gallery/db exec prisma generate

# ──────────────────────────────────────────────
# Stage 4: build-web – vite build for production
# ──────────────────────────────────────────────
FROM source AS build-web
WORKDIR /app
ARG VITE_API_URL=http://localhost:3000
ARG VITE_GOOGLE_CLIENT_ID=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN pnpm --filter gallery-web build

# ═══════════════════════════════════════════════
# FINAL: api – tsx runs TypeScript directly
# ═══════════════════════════════════════════════
FROM source AS api
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["npx", "tsx", "-r", "tsconfig-paths/register", "src/server.ts"]

# ═══════════════════════════════════════════════
# FINAL: worker – tsx runs TypeScript directly
# ═══════════════════════════════════════════════
FROM source AS worker
WORKDIR /app/apps/media-worker
CMD ["npx", "tsx", "src/index.ts"]

# ═══════════════════════════════════════════════
# FINAL: web – nginx serves static build
# ═══════════════════════════════════════════════
FROM nginx:alpine AS web

COPY --from=build-web /app/apps/web/dist /usr/share/nginx/html

# SPA fallback: route all paths to index.html
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    add_header Cross-Origin-Opener-Policy "same-origin-allow-popups";\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
