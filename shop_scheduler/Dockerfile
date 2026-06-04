# docker build --build-arg NEXT_PUBLIC_BASE_PATH=/shop -t shop-scheduler .

FROM node:22-alpine AS base
RUN sed -i 's|https://|http://|g' /etc/apk/repositories \
    && apk update \
    && apk add --no-cache openssl
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --ignore-scripts

FROM deps AS build
COPY . .
ARG NEXT_PUBLIC_BUILD_REF=unknown
ARG NEXT_PUBLIC_BASE_PATH=
ENV NEXT_PUBLIC_BUILD_REF=$NEXT_PUBLIC_BUILD_REF
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

FROM base AS runtime
ENV NODE_ENV=production
ENV TZ=Europe/Moscow
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY next.config.ts ./
COPY scripts/docker-entrypoint.sh scripts/prisma-sqlite-migrate.sh ./scripts/
RUN chmod +x ./scripts/docker-entrypoint.sh ./scripts/prisma-sqlite-migrate.sh
EXPOSE 3000
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
