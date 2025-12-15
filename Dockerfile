FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json .npmrc ./
RUN npm ci --include=optional

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY package*.json .npmrc ./
RUN npm ci --only=production --include=optional

COPY --from=builder /app/dist ./dist

EXPOSE 8000

CMD ["node", "dist/main.js"]

