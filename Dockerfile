# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies without scripts (to skip husky) and with legacy peer deps
# Then run only the sharp install script to let it download prebuilt binaries
RUN npm ci --ignore-scripts || npm install --ignore-scripts && \
    cd node_modules/sharp && npm run install || true && \
    cd /app && \
    if [ -d "node_modules/@xenova/transformers/node_modules/sharp" ]; then \
      cd node_modules/@xenova/transformers/node_modules/sharp && npm run install || true; \
    fi

# Copy all source files
COPY . .

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy package files (needed for npm start)
COPY package*.json ./

# Copy node_modules from builder (includes all dependencies and sharp compiled for Linux)
COPY --from=builder /app/node_modules ./node_modules

# Copy built files from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/supabase ./supabase

# Run as non-root user
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start Next.js
CMD ["npm", "start"]
