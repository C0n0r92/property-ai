# DigitalOcean App Platform Deployment Setup

This document describes how the monorepo is structured for deployment on DigitalOcean App Platform with two separate services (consumer dashboard + agent app) running under one application.

## Architecture Overview

```
GitHub (property-ml)
    ↓
DigitalOcean App Platform
    ├── Static Site: nginx-router (routes subdomains)
    ├── Service: consumer-dashboard (irishpropertydata.com)
    └── Service: agent-app (agents.irishpropertydata.com)

All services share:
- Supabase database (authentication, user data)
- data.json (property data, served from public)
```

## Directory Structure

```
property-ml/
├── apps/
│   ├── consumer-dashboard/        (Next.js, existing)
│   │   ├── src/
│   │   ├── public/
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   └── Dockerfile
│   │
│   └── agent-app/                 (Next.js, new B2B)
│       ├── src/
│       ├── public/
│       ├── package.json
│       ├── next.config.ts
│       ├── Dockerfile
│       └── .env.example
│
├── nginx/
│   └── nginx.conf                 (Routing configuration)
│
├── scraper/                       (Unchanged)
├── scripts/                       (Unchanged)
├── app.yaml                       (DigitalOcean App Platform config)
└── DEPLOYMENT_SETUP.md            (This file)
```

## Deployment Steps

### 1. Move Existing Dashboard to Monorepo Structure

```bash
cd /Users/conor.mcloughlin/code/property-ml

# Create apps directory
mkdir -p apps

# Move existing dashboard
mv dashboard apps/consumer-dashboard

# Verify
ls -la apps/
# Should show: consumer-dashboard/ agent-app/
```

### 2. Add Consumer Dashboard Dockerfile

If your consumer-dashboard doesn't have a Dockerfile, create one:

```bash
cat > apps/consumer-dashboard/Dockerfile << 'EOF'
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init

COPY package.json package-lock.json* ./
RUN npm ci --only=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "server.js"]
EOF
```

### 3. Create .dockerignore for Consumer Dashboard

```bash
cat > apps/consumer-dashboard/.dockerignore << 'EOF'
/.next/
/node_modules
/.git
/.gitignore
/README.md
/.env
/.env.local
/npm-debug.log
EOF
```

### 4. Push Changes to GitHub

```bash
cd property-ml

git add apps/
git add nginx/
git add app.yaml
git add DEPLOYMENT_SETUP.md

git commit -m "Monorepo setup: consumer dashboard + agent app for DigitalOcean"

git push origin main
```

### 5. Create New App in DigitalOcean

1. Go to DigitalOcean dashboard: https://cloud.digitalocean.com
2. Click "Apps" in the sidebar
3. Click "Create App"
4. Connect GitHub and select `property-ml` repo
5. Select branch: `main`
6. Click "Next"

### 6. Configure the App

DigitalOcean may auto-detect services. If not, manually add them:

**Option A: Upload app.yaml (Recommended)**
1. In the app creation wizard, select "Edit Configuration"
2. Paste the contents of `app.yaml` from your repo
3. Click "Save"
4. Review and click "Create"

**Option B: Manual Configuration**

If uploading app.yaml, skip to step 7.

If configuring manually:

1. **Static Site (nginx-router)**
   - Name: `nginx-router`
   - Source: GitHub (`property-ml` repo, branch `main`)
   - Source directory: `nginx`
   - Routes: `/`

2. **Service 1 (consumer-dashboard)**
   - Name: `consumer-dashboard`
   - Source: GitHub (`property-ml` repo, branch `main`)
   - Source directory: `apps/consumer-dashboard`
   - Build command: `npm run build`
   - Run command: `npm start`
   - HTTP port: `3000`

3. **Service 2 (agent-app)**
   - Name: `agent-app`
   - Source: GitHub (`property-ml` repo, branch `main`)
   - Source directory: `apps/agent-app`
   - Build command: `npm run build`
   - Run command: `npm start`
   - HTTP port: `3000`

### 7. Set Environment Variables

In the DigitalOcean App Platform console, go to "Settings" → "Environment Variables".

Add these variables (shared across services):

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here
MAPBOX_TOKEN=your_mapbox_token
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
LOCATIONIQ_API_KEY=your_locationiq_key
POSTHOG_API_KEY=your_posthog_key (if using)
```

### 8. Configure Custom Domains

1. Go to "Settings" → "Domains"
2. For consumer-dashboard:
   - Domain: `irishpropertydata.com`
   - Component: `consumer-dashboard`
3. For agent-app:
   - Domain: `agents.irishpropertydata.com`
   - Component: `agent-app`

Note: You may need to add DNS records. DigitalOcean will provide CNAME instructions.

### 9. Update DNS Records

In your domain registrar (GoDaddy, Route53, etc.):

```
For irishpropertydata.com:
Type: A or CNAME
Value: [DigitalOcean-provided IP/CNAME]

For agents.irishpropertydata.com:
Type: CNAME
Value: [DigitalOcean app domain].ondigitalocean.app
```

### 10. Deploy

Once configured:
1. Click "Create App"
2. DigitalOcean will build and deploy both services
3. This takes 5-10 minutes

View logs:
1. Go to your app
2. Click "Deployments"
3. Click the latest deployment to see logs
4. Both services should show "✓ Running"

### 11. Verify Deployment

After 10-15 minutes:

```bash
# Consumer dashboard (main domain)
curl -I https://irishpropertydata.com
# Should return 200

# Agent app (subdomain)
curl -I https://agents.irishpropertydata.com
# Should return 200
```

## Development Workflow

### Making Changes

```bash
# Develop locally
cd apps/consumer-dashboard
npm run dev

# In another terminal
cd apps/agent-app
npm run dev

# Both run on localhost:3000 (or different ports if configured)
```

### Deploying Updates

```bash
# Make changes in consumer-dashboard or agent-app
git add .
git commit -m "Feature: description"
git push origin main

# DigitalOcean automatically deploys both services
# View progress in App Platform console under "Deployments"
```

### Rolling Back

If a deployment fails:
1. Go to App Platform → "Deployments"
2. Click the previous successful deployment
3. Click "Rollback"
4. Confirm

## Troubleshooting

### "Build failed" on agent-app

Check:
1. Do the build commands in app.yaml match your directory structure?
2. Are all dependencies listed in `apps/agent-app/package.json`?
3. Check logs in "Deployments" tab

### "Port already in use"

Both services run on port 3000 internally. Nginx routes externally. If port error:
1. Make sure both services have `http_port: 3000` in app.yaml
2. Make sure nginx is configured as a static site (not service)

### Domain not resolving

1. Wait 5-10 minutes for DNS propagation
2. Verify CNAME records in domain registrar
3. In DigitalOcean App Platform, verify "Domains" section shows both domains

### Services not sharing data

Make sure environment variables are set at the App level (not service level):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`

Both services should inherit these.

## Monitoring

View logs and performance:
1. App Platform → Your app
2. "Runtime logs" shows real-time logs
3. "Metrics" shows CPU, memory, bandwidth
4. "Alerts" set up notifications for failures

## Scaling

### Increase Instance Size

1. App Platform → Your app → "Settings"
2. Under each service, change "Instance Size"
3. Options: basic-xs (default), basic-s, basic-m, etc.

### Increase Instance Count

In app.yaml, for each service:
```yaml
instance_count: 2  # Increase from 1
```

This creates redundancy and load balancing.

## Next Steps

1. ✅ Push monorepo structure to GitHub
2. ✅ Create App in DigitalOcean
3. ✅ Set environment variables
4. ✅ Configure custom domains
5. ✅ Deploy and verify
6. Build out agent-app features (valuation tool, etc.)
7. Set up email alerts (SendGrid or Resend)
8. Add database migrations for agent-specific tables
