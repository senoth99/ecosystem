FROM node:22-alpine AS base
RUN sed -i 's|https://|http://|g' /etc/apk/repositories \
    && apk update \
    && apk add --no-cache openssl
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
CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
