# Next Steps: Deploy to DigitalOcean

You now have a complete monorepo setup ready for DigitalOcean App Platform. Here's exactly what to do:

## Step 1: Prepare Your Local Repository (5 minutes)

```bash
cd /Users/conor.mcloughlin/code/property-ml

# Verify structure (you should see both apps)
ls -la apps/
# Output should show:
# consumer-dashboard/
# agent-app/

# Verify key files exist
test -f app.yaml && echo "✅ app.yaml exists"
test -f nginx/nginx.conf && echo "✅ nginx/nginx.conf exists"
test -f apps/consumer-dashboard/Dockerfile && echo "✅ consumer-dashboard Dockerfile exists"
test -f apps/agent-app/Dockerfile && echo "✅ agent-app Dockerfile exists"
```

## Step 2: Commit and Push (2 minutes)

```bash
cd /Users/conor.mcloughlin/code/property-ml

# Stage all changes
git add .

# Commit
git commit -m "Monorepo: Add agent-app, nginx routing, DigitalOcean config

- Move consumer dashboard to apps/consumer-dashboard
- Create new agent-app at apps/agent-app (B2B for estate agents)
- Add nginx routing for subdomain (agents.irishpropertydata.com)
- Add DigitalOcean App Platform configuration (app.yaml)
- Add deployment documentation"

# Push
git push origin main

# Verify on GitHub
echo "✅ Check GitHub: https://github.com/your-username/property-ml"
echo "   Should show apps/ directory with consumer-dashboard and agent-app"
```

## Step 3: Update DigitalOcean App Platform (20 minutes)

### 3a: Delete Old App (if it exists)

1. Go to DigitalOcean: https://cloud.digitalocean.com
2. Click "Apps" in sidebar
3. If you have an old "property-ml" or "dashboard" app, click it
4. Go to "Settings" → Scroll to "Danger Zone"
5. Click "Delete App"
6. Confirm deletion

### 3b: Create New App with Monorepo Config

1. Go to DigitalOcean: https://cloud.digitalocean.com
2. Click "Apps" → "Create App"
3. Connect your GitHub account (if not already connected)
4. Select repo: `your-github/property-ml`
5. Select branch: `main`
6. Click "Next"

### 3c: Upload app.yaml Configuration

1. You should see an "Edit Configuration" button
2. Click it
3. Copy the entire contents of `/Users/conor.mcloughlin/code/property-ml/app.yaml`
4. Paste it into the configuration editor
5. Click "Save"

### 3d: Set Environment Variables

DigitalOcean will show an "Environment Variables" section. Add these variables:

```
Key: SUPABASE_URL
Value: https://your-project.supabase.co

Key: SUPABASE_ANON_KEY
Value: your_anon_key

Key: SUPABASE_SERVICE_KEY
Value: your_service_key

Key: MAPBOX_TOKEN
Value: your_mapbox_token

Key: STRIPE_PUBLISHABLE_KEY
Value: pk_test_...

Key: STRIPE_SECRET_KEY
Value: sk_test_...

Key: STRIPE_WEBHOOK_SECRET
Value: whsec_...

Key: LOCATIONIQ_API_KEY
Value: your_locationiq_key

Key: POSTHOG_API_KEY
Value: your_posthog_key (if using analytics)
```

**Get these values from:**
- Supabase: https://app.supabase.com → Project Settings → API
- Mapbox: https://account.mapbox.com/tokens/
- Stripe: https://dashboard.stripe.com/apikeys
- LocationIQ: https://locationiq.com/dashboard/
- PostHog: https://app.posthog.com/ (if using)

### 3e: Configure Domains

In the app wizard, there should be a "Domains" section:

1. For consumer-dashboard service:
   - Domain: `irishpropertydata.com`
   - Component: `consumer-dashboard`

2. For agent-app service:
   - Domain: `agents.irishpropertydata.com`
   - Component: `agent-app`

### 3f: Review and Create

1. Review all settings (build commands, environment variables, domains)
2. Click "Create App"
3. DigitalOcean will begin building (5-10 minutes)
4. Watch the "Deployments" tab for progress

## Step 4: Configure DNS (10 minutes)

When the app is created, DigitalOcean will provide DNS records:

1. In DigitalOcean App Platform, go to your app → "Domains"
2. Note the CNAME or A record values

3. Go to your domain registrar (GoDaddy, Route53, Name.com, etc.)
4. Add these DNS records:

For `irishpropertydata.com`:
```
Type: A Record (or CNAME, depending on DigitalOcean)
Name: @ (or blank)
Value: [DigitalOcean IP address or CNAME]
TTL: 3600
```

For `agents.irishpropertydata.com`:
```
Type: CNAME
Name: agents
Value: [your-app].ondigitalocean.app
TTL: 3600
```

5. Save the DNS records
6. Wait 5-15 minutes for DNS to propagate

## Step 5: Verify Deployment (5 minutes)

After 10-15 minutes total:

```bash
# Check consumer app
curl -I https://irishpropertydata.com
# Should return: HTTP/1.1 200 OK

# Check agent app
curl -I https://agents.irishpropertydata.com
# Should return: HTTP/1.1 200 OK
```

Or visit in your browser:
- https://irishpropertydata.com → Should show consumer dashboard
- https://agents.irishpropertydata.com → Should show "Coming Soon" agent page

## Step 6: Monitor Deployment

1. Go to DigitalOcean App Platform
2. Click your app
3. Go to "Deployments" tab
4. Both services should show ✅ Running:
   - consumer-dashboard: Running
   - agent-app: Running

If either shows ❌ Failed:
1. Click on it
2. Check the build logs
3. Common issues:
   - Build command is wrong (check app.yaml)
   - Environment variables missing
   - Dependencies not installed

---

## What's Running Now

After successful deployment:

```
irishpropertydata.com
└─ Consumer Dashboard (existing)
   ├── Map view
   ├── Property details
   ├── Blog, areas, insights
   └── Login/auth

agents.irishpropertydata.com
└─ Agent App (new B2B)
   └─ Coming Soon landing page
      (You'll build features here next)

Shared:
├─ Supabase database (auth, data)
└─ data.json (property data)
```

---

## From Here

Once deployment is successful:

1. **Local Development**
   ```bash
   cd apps/agent-app
   npm install
   npm run dev
   # Visit http://localhost:3000 to develop locally
   ```

2. **Build Agent Features**
   - Valuation tool (search property → show comparables)
   - Competitor monitoring
   - PDF report generation
   - Agent authentication

3. **Each Push Auto-Deploys**
   ```bash
   # Make changes locally
   git add .
   git commit -m "Feature description"
   git push origin main

   # DigitalOcean automatically redeploys both services
   # Check progress in App Platform → Deployments
   ```

---

## Detailed Guides

See these files for more information:
- `DEPLOYMENT_SETUP.md` - Full technical setup guide
- `DEPLOYMENT_CHECKLIST.md` - Step-by-step checklist
- `apps/agent-app/.env.example` - Environment variable template

---

## Questions?

If anything fails:
1. Check DigitalOcean "Deployments" logs
2. Verify environment variables are set
3. Verify DNS records are correct
4. Check that app.yaml build commands match your directory structure

Good luck! Let me know when you hit any roadblocks.
