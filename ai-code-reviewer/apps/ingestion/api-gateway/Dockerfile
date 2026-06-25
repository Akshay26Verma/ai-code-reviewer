FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx nx run api-gateway:build --prod

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist/apps/ingestion/api-gateway ./dist
COPY --from=builder /app/dist/apps/ingestion/api-gateway/package.json ./package.json
RUN npm ci --only=production
EXPOSE 3003
CMD ["node", "dist/main.js"]
