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
# Some older API routes create their Stripe and Supabase clients when the
# build inspects them. These stand-ins exist only in this build stage; the
# real values are supplied when the container runs.
ENV NEXT_TELEMETRY_DISABLED=1 \
    STRIPE_SECRET_KEY=sk_test_build_time_placeholder \
    STRIPE_WEBHOOK_SECRET=whsec_build_time_placeholder \
    SUPABASE_SERVICE_ROLE_KEY=build-time-placeholder
RUN cd dashboard && NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-https://placeholder.supabase.co} \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY:-build-time-placeholder} \
    npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app/dashboard/.next/standalone ./
COPY --from=build --chown=node:node /app/dashboard/.next/static ./.next/static
COPY --from=build --chown=node:node /app/dashboard/public ./public
USER node
EXPOSE 8080
CMD ["node", "server.js"]
