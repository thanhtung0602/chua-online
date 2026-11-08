# Stage 1: Build & Dependencies
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package config
COPY package*.json ./

# Cài đặt toàn bộ dependencies (bao gồm devDependencies để build Vite + TypeScript)
RUN npm ci

# Copy mã nguồn
COPY . .

# Build Client dist
RUN npm run build

# Stage 2: Production Runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy built assets & node_modules từ stage build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

# Healthcheck định kỳ đảm bảo web sống khỏe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

EXPOSE 3001

CMD ["npm", "start"]
