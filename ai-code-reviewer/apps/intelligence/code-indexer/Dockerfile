FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx nx run code-indexer:build --prod

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist/apps/intelligence/code-indexer ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
RUN npm ci --omit=dev
COPY --from=builder /app/node_modules/tree-sitter-wasms ./node_modules/tree-sitter-wasms
COPY --from=builder /app/node_modules/web-tree-sitter ./node_modules/web-tree-sitter
EXPOSE 3000
CMD ["node", "dist/main.js"]
