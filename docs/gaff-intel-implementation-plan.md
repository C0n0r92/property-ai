# Gaff Intel Implementation Plan

**Version:** 1.0
**Date:** 2026-03-23
**Author:** Property AI Team

---

## 1. Current State Assessment

### What Exists in the Codebase

#### Usable Infrastructure (Keep)
| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| Next.js 16 App Router | `dashboard/` | Production | Solid foundation |
| Supabase SSR auth | `lib/supabase/` | Working | Needs profiles table additions |
| Stripe checkout | `api/checkout/route.ts` | Working | Pro €9, Agency €49 defined |
| Property types | `types/property.ts` | Complete | Property, Listing, Rental, etc. |
| Data loading | `lib/data.ts` | Working | JSON + Supabase fallback |
| Mapbox integration | `components/MapComponent.tsx` | Working | Full map implementation |
| Auth utilities | `lib/auth-utils.ts` | Working | getCurrentUser, requireAuth |
| Planning API | `api/planning/route.ts` | Working | ArcGIS integration |
| Amenities API | `api/amenities/route.ts` | Working | OSM/Overpass integration |
| PostHog analytics | `components/PostHogProvider.tsx` | Working | Event tracking ready |

#### Partially Usable (Adapt)
| Component | Path | Status | Needed Work |
|-----------|------|--------|-------------|
| PropertyCard | `components/PropertyCard.tsx` | Works for consumer | Adapt for agent view (more data) |
| Area analysis | `app/areas/` | Works | Add agent-specific filters |
| Blog charts | `components/BlogCharts.tsx` | Works | Reuse for area trend charts |
| Comparison table | `components/PropertyComparisonTable.tsx` | Works | Enhance for comparable grid |

#### Consumer-Only (Don't Port)
| Component | Notes |
|-----------|-------|
| Alerts system | Consumer-focused; agents need different alerts |
| Mortgage calculator | Not relevant for agent workflow |
| Blog infrastructure | Consumer content; keep separate |
| Newsletter signup | Different audience |

### What Was Built in Previous Agent App (Reverted)

Based on the context, these features were attempted but killed due to broken auth:

- `/dashboard` — Market Pulse
- `/dashboard/valuation` — Comparable lookup
- `/dashboard/areas` — Area analysis
- `/dashboard/properties` — Saved properties
- `/dashboard/reports` — Report generation
- `/dashboard/team` — Team management

**Salvageable concepts (not code):**
- Component naming: ValuationSummary, ComparableGrid, DealAssessment, YieldAnalysisCard
- Page structure: Dashboard → Feature pages
- UI patterns: Cards for insights

**Not salvageable:**
- Actual code (reverted, not in repo)
- Auth implementation (was broken)
- API routes (used wrong Supabase client)

---

## 2. What Needs to Be Rebuilt

### Critical Path Items

#### 2.1 Auth Flow (Must Fix First)
**Previous issue:** Used browser Supabase client in server context

**Correct implementation:**
```typescript
// CORRECT: Use server client in route handlers
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // ...
}
```

**Tasks:**
1. Email confirmation callback route (`/auth/callback`)
2. Server-side route protection middleware
3. Session refresh in middleware
4. Profile creation on signup (trigger or webhook)

**Estimate:** 1 day

#### 2.2 Stripe Webhook Handler
**Previous issue:** Webhook didn't update user tier

**Correct implementation:**
```typescript
// api/webhook/route.ts
export async function POST(request: NextRequest) {
  const event = stripe.webhooks.constructEvent(body, signature, secret);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.user_id;
    const plan = session.metadata?.plan;

    // Update profiles table
    await supabase
      .from('profiles')
      .update({ tier: plan, stripe_customer_id: session.customer })
      .eq('id', userId);
  }

  if (event.type === 'customer.subscription.deleted') {
    // Downgrade to free
  }
}
```

**Tasks:**
1. Webhook signature verification
2. Profile tier update on payment
3. Subscription cancellation handling
4. Stripe customer portal redirect

**Estimate:** 0.5 day

#### 2.3 Database Schema Updates
**Current `profiles` table needs:**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  tier VARCHAR DEFAULT 'free',
  stripe_customer_id VARCHAR,
  stripe_subscription_id VARCHAR,
  trial_ends_at TIMESTAMP,
  saved_properties_count INT DEFAULT 0,
  lookup_count_today INT DEFAULT 0,
  lookup_count_reset_at DATE;
```

**New tables:**
```sql
-- Saved properties for agents
CREATE TABLE saved_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  property_address VARCHAR NOT NULL,
  property_data JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Search history for agents
CREATE TABLE search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  search_address VARCHAR NOT NULL,
  search_params JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking
CREATE TABLE usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action VARCHAR NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Estimate:** 0.5 day

---

## 3. What's Missing Entirely

### Core Features to Build

| Feature | Effort | Dependency | Priority |
|---------|--------|------------|----------|
| Comparable search algorithm | 2 days | None | P0 |
| Comparable results UI | 2 days | Search algorithm | P0 |
| Valuation summary card | 1 day | Comparable results | P0 |
| Agent dashboard home | 1 day | Auth | P0 |
| Saved properties CRUD | 1 day | DB schema | P0 |
| Usage limits enforcement | 0.5 day | DB schema | P0 |
| PDF export | 2 days | Comparable results | P1 |
| Yield calculator | 1 day | None | P1 |
| Area trends charts | 1 day | None | P1 |
| Team management | 2 days | Auth | P2 |

### Data Integrations to Build

| Integration | Effort | Value | Priority |
|-------------|--------|-------|----------|
| BER database import | 2 days | High | P1 |
| Eircode lookup API | 1 day | High | P1 |
| CSO API connector | 1 day | Medium | P2 |

---

## 4. Phased Build Plan

### Phase 0: Fix Foundations (3 days)

**Goal:** Bulletproof auth and billing before writing any features

**Day 1: Auth**
- [ ] Create `/app/auth/callback/route.ts` for email confirmation
- [ ] Test email signup → confirmation → redirect flow
- [ ] Add server-side auth check middleware for `/agent/*` routes
- [ ] Verify session refresh works in middleware

**Day 2: Database + Profiles**
- [ ] Run schema migrations (profiles columns, new tables)
- [ ] Create profile automatically on signup (DB trigger)
- [ ] Test profile creation flow end-to-end
- [ ] Add RLS policies for saved_properties, search_history

**Day 3: Billing**
- [ ] Implement webhook handler with signature verification
- [ ] Test checkout → webhook → tier update flow
- [ ] Add Stripe customer portal link
- [ ] Test subscription cancellation → tier downgrade

**Exit criteria:** New user can sign up → verify email → subscribe → see "Pro" badge

---

### Phase 1: MVP for First Demo (10 days)

**Goal:** Working comparable lookup that closes a sale

**Week 1: Core Search**

**Days 4-5: Comparable Search Algorithm**
```typescript
// lib/comparable-search.ts
interface ComparableSearchParams {
  address: string;
  lat: number;
  lng: number;
  propertyType?: string;
  beds?: number;
  maxDistanceKm?: number;
  dateRangeMonths?: number;
}

interface ComparableResult {
  property: Property;
  distance: number;
  relevanceScore: number;
  matchReasons: string[];
}

function searchComparables(params: ComparableSearchParams): ComparableResult[] {
  // 1. Filter by distance (haversine)
  // 2. Filter by property type (exact or similar)
  // 3. Filter by beds (±1)
  // 4. Filter by date (default 24 months)
  // 5. Score by recency, distance, similarity
  // 6. Return top 20 sorted by score
}
```

- [ ] Implement haversine distance calculation
- [ ] Implement relevance scoring algorithm
- [ ] Create `/api/agent/comparables/route.ts`
- [ ] Add address geocoding (LocationIQ or existing)
- [ ] Unit tests for search algorithm

**Days 6-7: Comparable Results UI**
- [ ] Create `components/agent/ComparableGrid.tsx`
- [ ] Create `components/agent/ComparableCard.tsx`
- [ ] Implement filter sidebar (distance, beds, date)
- [ ] Add sort controls (date, price, distance)
- [ ] Wire up to API

**Week 2: Dashboard + Polish**

**Day 8: Valuation Summary**
- [ ] Create `components/agent/ValuationSummary.tsx`
- [ ] Algorithm: Weighted median of top 10 comps
- [ ] Confidence indicator based on data density
- [ ] Copy-to-clipboard for suggested range

**Day 9: Agent Dashboard Home**
- [ ] Create `/app/agent/page.tsx` (dashboard)
- [ ] Market pulse stats (from existing stats API)
- [ ] Quick search bar
- [ ] Recent searches (from search_history)
- [ ] Saved properties preview

**Day 10: Saved Properties + Polish**
- [ ] Create `/app/agent/saved/page.tsx`
- [ ] CRUD API for saved_properties
- [ ] Add notes field
- [ ] Usage limit enforcement (5 lookups/day free, unlimited Pro)
- [ ] Overall polish, bug fixes

**Exit criteria:** Demo to agent: "Enter address → See comparables → Suggested price → Save property"

---

### Phase 2: Full Product (3-4 weeks post-MVP)

**Week 3-4: Export + Yield**

**PDF Export**
- [ ] Evaluate: react-pdf vs puppeteer vs external API
- [ ] Design PDF template (one page)
- [ ] Implement generation endpoint
- [ ] Add PNG export option
- [ ] Watermark for free tier

**Yield Calculator**
- [ ] UI: Input property, see yield
- [ ] Algorithm: Match to rental data, calculate gross yield
- [ ] Confidence based on rental data points
- [ ] Area average comparison

**Week 5-6: Trends + Polish**

**Area Trends**
- [ ] Reuse BlogCharts components
- [ ] Price trend chart (monthly median)
- [ ] Volume chart (sales/month)
- [ ] Over/under asking trend
- [ ] Area selector

**Polish**
- [ ] Error states and loading states
- [ ] Mobile responsiveness
- [ ] Help tooltips
- [ ] Onboarding tour (first login)

---

### Phase 3: Moat Features (2-3 months post-launch)

**BER Integration**
- [ ] Download SEAI BER CSV
- [ ] Parse and import to Supabase
- [ ] Match by address/Eircode
- [ ] Display on property cards
- [ ] "BER uplift analysis" feature

**Team Management (Agency Tier)**
- [ ] Invite flow (email invite)
- [ ] Seat management
- [ ] Admin view of team activity
- [ ] Shared saved properties option

**Automated Reports**
- [ ] Weekly email digest setup
- [ ] Area selection preferences
- [ ] PDF attachment generation
- [ ] Unsubscribe handling

---

## 5. Data Ingestion Tasks

### Immediate (Before MVP)
None required — existing 47k properties sufficient

### Post-MVP

**BER Database (P1)**
```bash
# Download from SEAI (updated quarterly)
curl -o ber_data.csv https://ndber.seai.ie/...

# Parse and upload
node scripts/import-ber.js
```

Schema:
```sql
CREATE TABLE ber_ratings (
  id UUID PRIMARY KEY,
  address VARCHAR NOT NULL,
  eircode VARCHAR,
  ber_rating VARCHAR(3), -- A1, A2, B1, etc.
  ber_number VARCHAR,
  floor_area DECIMAL,
  year_built INT,
  created_at TIMESTAMP
);
```

**Eircode Enhancement (P1)**
- Use Eircode Finder API (free tier: 1000/month)
- Backfill missing Eircodes on properties
- Improve address matching

**CSO Data (P2)**
- Monthly scrape of key datasets
- Store aggregated stats, not raw data
- Used for "market context" cards

---

## 6. Technical Decisions

### Monorepo vs Separate Repo
**Decision: Keep in monorepo**

Reasons:
- Shared types (`property.ts`)
- Shared data loading (`data.ts`)
- Shared Supabase client
- Simpler deployment

Structure:
```
property-ai/
├── dashboard/           # Consumer app (existing)
│   └── src/app/
│       ├── agent/       # NEW: Agent app pages
│       │   ├── page.tsx
│       │   ├── search/
│       │   ├── saved/
│       │   └── reports/
│       └── ...          # Consumer pages unchanged
├── scraper/             # Data pipeline (existing)
└── docs/                # This file
```

### Subdomain Strategy
**Decision: Subdomain for launch, migrate to separate domain later**

Phase 1: `agent.irishpropertydata.com`
- Easier to set up (same Vercel project, subdomain routing)
- Shared auth infrastructure
- Quick to market

Phase 2: `gaffintel.ie` (if product succeeds)
- Separate branding
- B2B positioning
- May need DNS/Vercel config change

### Hosting: DO vs Vercel
**Decision: Keep on Vercel**

Reasons:
- Already deployed there
- Automatic preview deployments
- Edge functions for API routes
- Simpler than managing DO infrastructure
- Cost is comparable at this scale

### PDF Generation
**Decision: Puppeteer via Vercel serverless**

Options evaluated:
- `react-pdf` — Good for simple, limited styling
- Puppeteer — Full HTML/CSS support, heavier
- External API (PDF.co, etc.) — Adds dependency

Recommendation: Start with react-pdf for MVP, migrate to Puppeteer if templates get complex.

---

## 7. Definition of Done for MVP

### Functional Requirements
- [ ] User can sign up with email
- [ ] User receives email verification
- [ ] User can complete verification and log in
- [ ] User can search for comparable sales by address
- [ ] Search returns 20 most relevant comparables
- [ ] User can filter by distance, beds, date range
- [ ] User can sort results by date, price, distance
- [ ] User sees suggested valuation range
- [ ] User can save properties (with notes)
- [ ] User can view saved properties
- [ ] Free user sees 5 lookup/day limit
- [ ] User can subscribe to Pro via Stripe
- [ ] Payment updates user tier to Pro
- [ ] Pro user has unlimited lookups

### Non-Functional Requirements
- [ ] Search returns results in <3 seconds
- [ ] No authentication errors in server logs
- [ ] Works on mobile (responsive)
- [ ] WCAG AA color contrast
- [ ] No console errors in production

### Quality Gates
- [ ] Tested with 3 real agents (feedback incorporated)
- [ ] Monitored for 48 hours with no critical bugs
- [ ] Load tested with 100 concurrent searches

---

## 8. Risk Mitigation Tasks

### R1: Data Accuracy
- [ ] Create test suite with 20 known properties
- [ ] Verify comparable results against manual research
- [ ] Add "feedback" button: "Were these results helpful?"
- [ ] Monitor feedback, iterate on algorithm

### R2: Auth Stability
- [ ] End-to-end test: Signup → Verify → Login → Logout → Login
- [ ] Test expired session handling
- [ ] Test parallel sessions (mobile + desktop)
- [ ] Implement session refresh

### R3: Billing Reliability
- [ ] Test with Stripe test mode exhaustively
- [ ] Test webhook with Stripe CLI forwarding
- [ ] Handle edge cases: Disputed payments, failed renewals
- [ ] Implement manual tier override for support

---

## 9. Development Workflow

### Branch Strategy
```
main              # Production
├── develop       # Integration branch
└── feature/*     # Feature branches
```

### PR Checklist
- [ ] Tests pass
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Loading states handled
- [ ] Error states handled
- [ ] Commit messages follow conventional commits

### Deployment
- Merge to `develop` → Preview deployment
- Merge to `main` → Production deployment
- No manual deployments

---

## 10. Timeline Summary

| Phase | Duration | End State |
|-------|----------|-----------|
| Phase 0: Foundations | 3 days | Auth + billing bulletproof |
| Phase 1: MVP | 10 days | Demoable comparable lookup |
| Phase 1.5: Feedback | 1 week | Iterate on agent feedback |
| Phase 2: Full Product | 3-4 weeks | Export, yield, trends |
| Phase 3: Moat | Ongoing | BER, teams, automation |

**Target: MVP demo to first agent in 2 weeks**
**Target: First paying customer in 4 weeks**
**Target: 20 paying customers in 8 weeks**

---

## Appendix: File Structure for Agent App

```
dashboard/src/
├── app/
│   └── agent/                      # Agent app (B2B)
│       ├── page.tsx                # Dashboard home
│       ├── layout.tsx              # Agent layout (sidebar, nav)
│       ├── search/
│       │   └── page.tsx            # Comparable search
│       ├── saved/
│       │   └── page.tsx            # Saved properties
│       ├── reports/
│       │   └── page.tsx            # Report generation
│       ├── settings/
│       │   └── page.tsx            # Account settings
│       └── team/                   # Agency tier only
│           └── page.tsx
├── components/
│   └── agent/                      # Agent-specific components
│       ├── ComparableGrid.tsx
│       ├── ComparableCard.tsx
│       ├── ValuationSummary.tsx
│       ├── AgentSidebar.tsx
│       ├── SavePropertyButton.tsx
│       └── UsageMeter.tsx
├── lib/
│   ├── comparable-search.ts        # Search algorithm
│   └── agent-utils.ts              # Agent-specific helpers
└── types/
    └── agent.ts                    # Agent-specific types
```

---

## Appendix: API Routes for Agent App

```
/api/agent/
├── comparables/route.ts            # POST: Search comparables
├── saved/route.ts                  # GET/POST: Saved properties
├── saved/[id]/route.ts             # PUT/DELETE: Single saved
├── reports/route.ts                # POST: Generate report
├── reports/[id]/route.ts           # GET: Download report
├── usage/route.ts                  # GET: Usage stats
└── team/route.ts                   # GET/POST: Team management
```

---

*Ready to build. Start with Phase 0, Day 1: Auth callback route.*
