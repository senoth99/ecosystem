FROM node:22-alpine AS base
RUN sed -i 's|https://dl-cdn.alpinelinux.org/alpine|https://mirrors.edge.kernel.org/alpine|g' /etc/apk/repositories \
    && apk update \
    && apk add --no-cache openssl
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci 2>/dev/null || npm install

FROM deps AS build
COPY . .
ARG NEXT_PUBLIC_BASE_PATH=
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:./dev.db
RUN npx prisma generate && npm run build

FROM build AS public-files
RUN mkdir -p /out/public && \
    if [ -d public ]; then cp -a public/. /out/public/; fi

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=public-files /out/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

RUN mkdir -p /data/app && chown nextjs:nodejs /data/app
VOLUME ["/data/app"]

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["sh", "-c", "npx prisma db push --skip-generate 2>/dev/null || true; node server.js"]
