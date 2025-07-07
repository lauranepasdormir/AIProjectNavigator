# ─────────── Stage 1: install & build ────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# 1) Copy root manifest and install server+shared deps
COPY package*.json ./
COPY package-lock.json ./
RUN npm ci

# 2) Copy client manifest and install client deps
COPY package*.json ./client/
COPY package-lock.json ./client/
RUN npm ci --prefix client

# 3) Copy everything else in
COPY . .

# 4) Run your build script (should invoke both Vite for client and esbuild for server)
RUN npm run build

# ─────────── Stage 2: runtime image ─────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Pull in only what we need to run
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/client/node_modules ./client/node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/public ./dist/public

# Set production env
ENV NODE_ENV=production
ENV PORT=5001

EXPOSE 5001

# Start the server
CMD ["node", "dist/index.js"]