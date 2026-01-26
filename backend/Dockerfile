# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Stage 2: Production Runner
FROM node:20-alpine

WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/db ./db

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Run the application
CMD ["node", "src/server.js"]
