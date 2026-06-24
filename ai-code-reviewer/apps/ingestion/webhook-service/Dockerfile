FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx nx run webhook-service:build --prod

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist/apps/ingestion/webhook-service ./dist
COPY --from=builder /app/dist/apps/ingestion/webhook-service/package.json ./package.json
RUN npm ci --only=production
EXPOSE 3002
CMD ["node", "dist/main.js"]
