# Multi-stage build for Next.js + Prisma (SQLite)
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Build app
COPY . .
RUN npm run prisma:generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy runtime artifacts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/public ./public

# Default DB path for SQLite (override via env)
ENV DATABASE_URL=file:/app/data/prod.db
ENV PORT=3001
EXPOSE 3001

# Apply schema and start server
CMD sh -c "npx prisma db push && next start -p $PORT"
