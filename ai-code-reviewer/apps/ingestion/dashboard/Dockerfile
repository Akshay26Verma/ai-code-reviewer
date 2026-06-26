FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx nx run dashboard:build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/ingestion/dashboard/.next/standalone ./
COPY --from=builder /app/apps/ingestion/dashboard/.next/static ./.next/static
COPY --from=builder /app/apps/ingestion/dashboard/public ./public
EXPOSE 3004
ENV PORT=3004
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
