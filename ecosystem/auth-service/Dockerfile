FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json ./
COPY prisma ./prisma
RUN npm install --ignore-scripts

FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY package.json ./
COPY prisma ./prisma
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 4001
CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
