FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install ALL dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files
COPY --from=builder /app/dist ./dist

EXPOSE 8080

CMD ["node", "dist/main.js"]