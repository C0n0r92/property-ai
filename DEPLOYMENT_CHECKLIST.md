# Deployment Setup Checklist

## Phase 1: Local Setup (30 minutes)

- [ ] Move dashboard to `apps/consumer-dashboard`
  ```bash
  mkdir -p apps
  mv dashboard apps/consumer-dashboard
  ```

- [ ] Create Dockerfile in `apps/consumer-dashboard` (if not exists)
  - Copy from DEPLOYMENT_SETUP.md

- [ ] Create `.dockerignore` in `apps/consumer-dashboard` (if not exists)
  - Copy from DEPLOYMENT_SETUP.md

- [ ] Verify agent-app structure
  ```bash
  ls -la apps/agent-app/
  # Should show: src/, package.json, next.config.ts, Dockerfile, etc.
  ```

- [ ] Create `.env.local` in `apps/agent-app`
  ```bash
  cp apps/agent-app/.env.example apps/agent-app/.env.local
  # Add your Supabase credentials
  ```

- [ ] Verify all config files exist
  ```bash
  ls -la app.yaml           # ✅ Should exist
  ls -la nginx/nginx.conf   # ✅ Should exist
  ls -la DEPLOYMENT_SETUP.md # ✅ Should exist
  ```

## Phase 2: Git & GitHub (5 minutes)

- [ ] Commit all changes
  ```bash
  git add .
  git commit -m "Monorepo setup: consumer + agent apps for DigitalOcean"
  git push origin main
  ```

- [ ] Verify on GitHub
  - Check `apps/consumer-dashboard/` exists
  - Check `apps/agent-app/` exists
  - Check `app.yaml` exists at root

## Phase 3: DigitalOcean Setup (20 minutes)

- [ ] Go to DigitalOcean: https://cloud.digitalocean.com

- [ ] Delete or archive old app (if it exists)
  - Apps → Select old app → Settings → Delete

- [ ] Create new app
  - Click "Apps"
  - Click "Create App"
  - Connect GitHub to `property-ml` repo
  - Select branch: `main`

- [ ] Upload app.yaml
  - In creation wizard, click "Edit Configuration"
  - Paste entire contents of `app.yaml` from your repo
  - Click "Save"

- [ ] Set environment variables
  - In wizard, go to "Environment Variables" tab
  - Add all variables:
    ```
    SUPABASE_URL
    SUPABASE_ANON_KEY
    SUPABASE_SERVICE_KEY
    MAPBOX_TOKEN
    STRIPE_PUBLISHABLE_KEY
    STRIPE_SECRET_KEY
    STRIPE_WEBHOOK_SECRET
    LOCATIONIQ_API_KEY
    POSTHOG_API_KEY (if applicable)
    ```

- [ ] Configure domains
  - Go to "Domains" section
  - Add: `irishpropertydata.com` → `consumer-dashboard`
  - Add: `agents.irishpropertydata.com` → `agent-app`

- [ ] Review and create
  - Review all settings
  - Click "Create App"
  - Wait for build to complete (5-10 minutes)

## Phase 4: DNS Configuration (10 minutes)

- [ ] Get DNS records from DigitalOcean
  - In App Platform, go to "Domains"
  - Copy the CNAME or A record values

- [ ] Go to domain registrar (GoDaddy, Route53, etc.)
  - For `irishpropertydata.com`: Add A record pointing to DO IP
  - For `agents.irishpropertydata.com`: Add CNAME pointing to DigitalOcean

- [ ] Wait for DNS propagation (5-15 minutes)

## Phase 5: Verification (5 minutes)

- [ ] Test consumer app
  ```bash
  curl -I https://irishpropertydata.com
  # Should return 200 OK
  ```

- [ ] Test agent app
  ```bash
  curl -I https://agents.irishpropertydata.com
  # Should return 200 OK
  ```

- [ ] View in browser
  - Visit https://irishpropertydata.com → Should see consumer dashboard
  - Visit https://agents.irishpropertydata.com → Should see agent landing page

- [ ] Check logs
  - Go to App Platform → Deployments
  - Both services should show ✓ Running
  - No errors in logs

## Phase 6: Post-Deployment (Ongoing)

- [ ] Monitor deployments
  - Any git push to main auto-deploys both services
  - Check "Deployments" tab if anything fails

- [ ] Set up alerts
  - App Platform → Settings → Alerts
  - Enable notifications for deployment failures

- [ ] Test agent app locally before pushing
  ```bash
  cd apps/agent-app
  npm install
  npm run dev
  # Visit http://localhost:3000
  ```

---

## Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Build fails on agent-app | Check app.yaml build command: `cd apps/agent-app && npm run build` |
| Domain not resolving | Wait 10 minutes for DNS, verify CNAME records in registrar |
| 502 Bad Gateway | Check if both services are running in App Platform → Deployments |
| Environment variables not loading | Verify they're set at App level, not service level |
| consumer-dashboard not found | Verify you moved dashboard to `apps/consumer-dashboard`, not copied |

---

## Environment Variables Reference

Get these values from:
- **SUPABASE_*** → Supabase project settings
- **MAPBOX_*** → Mapbox account
- **STRIPE_*** → Stripe dashboard
- **LOCATIONIQ_*** → LocationIQ account
- **POSTHOG_*** → PostHog project (optional)

All should be added in DigitalOcean App Platform's "Environment Variables" section.

---

## Timeline

| Phase | Time | Status |
|-------|------|--------|
| Local setup | 30 min | `[ ]` |
| Git & push | 5 min | `[ ]` |
| DigitalOcean setup | 20 min | `[ ]` |
| DNS configuration | 10 min | `[ ]` |
| Verification | 5 min | `[ ]` |
| **Total** | **70 min** | `[ ]` |

---

## Done!

Once all checkboxes are complete:
- ✅ Consumer app running at https://irishpropertydata.com
- ✅ Agent app running at https://agents.irishpropertydata.com
- ✅ Both share Supabase database and data.json
- ✅ Auto-deploys on git push
- ✅ Ready to build agent features
