# Web app image. Build from the repository root:
#   docker build -t gaff-web .
FROM node:22-alpine AS build
WORKDIR /app
COPY scripts/check-security.js scripts/check-security.js
COPY dashboard/package.json dashboard/package-lock.json dashboard/
RUN cd dashboard && npm ci
COPY dashboard dashboard
# Public (browser-visible) settings are baked in at build time
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID
ENV NEXT_TELEMETRY_DISABLED=1
RUN cd dashboard && npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/dashboard/.next/standalone ./
COPY --from=build /app/dashboard/.next/static ./.next/static
COPY --from=build /app/dashboard/public ./public
USER node
EXPOSE 8080
CMD ["node", "server.js"]
