FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY src ./src
COPY public ./public
COPY next.config.ts tsconfig.json ./
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
RUN groupadd -r nodegroup && useradd -r -g nodegroup -d /app nodeuser
RUN chown -R nodeuser:nodegroup /app
USER nodeuser
EXPOSE 3000
CMD ["node", "server.js"]