FROM node:22-bookworm-slim AS base
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json ./
COPY prisma ./prisma
RUN npm install --ignore-scripts

FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate && npm run build

FROM base AS runtime
ENV NODE_ENV=production
COPY package.json ./
COPY prisma ./prisma
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 4001
CMD ["sh", "-c", "npx prisma db push && npm run db:seed && node dist/index.js"]
