FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx nx run knowledge-graph:build --prod

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist/apps/intelligence/knowledge-graph ./dist
COPY --from=builder /app/dist/apps/intelligence/knowledge-graph/package.json ./package.json
RUN npm ci --only=production
EXPOSE 3001
CMD ["node", "dist/main.js"]
