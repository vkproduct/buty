# syntax=docker/dockerfile:1

# --- deps: установка зависимостей ---
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12.6.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# --- build: временный Postgres для SSG + сборка Next ---
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache postgresql16 postgresql16-client
RUN corepack enable && corepack prepare pnpm@12.6.0 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
# generateStaticParams и SSG идут в БД — поднимаем одноразовый Postgres на время сборки
RUN mkdir -p /tmp/pgdata && chown postgres:postgres /tmp/pgdata \
  && su postgres -c "initdb -D /tmp/pgdata" \
  && su postgres -c "pg_ctl -D /tmp/pgdata -o '-k /tmp' -l /tmp/pg.log start" \
  && su postgres -c "createdb -h /tmp buty" \
  && export DATABASE_URL="postgresql://postgres@localhost:5432/buty?schema=public" \
  && export DIRECT_URL="postgresql://postgres@localhost:5432/buty?schema=public" \
  && pnpm prisma migrate deploy \
  && pnpm db:seed \
  && pnpm build \
  && su postgres -c "pg_ctl -D /tmp/pgdata stop"

# --- prod: рантайм ---
FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@12.6.0 --activate
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml next.config.mjs ./
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
