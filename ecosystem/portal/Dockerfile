FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json ./
RUN npm install

FROM deps AS build
COPY . .
ARG NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=
ARG NEXT_PUBLIC_TELEGRAM_AUTH_DEV=false
# Rewrites в next.config вшиваются при build — runtime ENV не подхватывается.
ARG AUTH_SERVICE_URL=http://auth-service:4001
ENV AUTH_SERVICE_URL=$AUTH_SERVICE_URL
ENV ECOSYSTEM_PROXY_APPS=false
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3100
ENV PORT=3100
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
