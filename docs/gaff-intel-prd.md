# Gaff Intel PRD: B2B SaaS for Irish Estate Agents

**Version:** 1.0
**Date:** 2026-03-23
**Author:** Property AI Team

---

## 1. Problem Statement

### The Pain
Irish estate agents spend 20-30 minutes per property valuation manually querying the Property Price Register — a raw CSV dump from the government with no search, no filtering, and no visualisation. Every valuation requires:

1. Downloading the latest PPR CSV (often outdated)
2. Opening in Excel, filtering by county/area
3. Manually searching for comparable addresses
4. Cross-referencing with Daft for original asking prices (which PPR doesn't include)
5. Repeating this process for every vendor meeting

For investor clients, agents have **no tool** to calculate yields. They either guess or tell the client to do their own research. This loses deals.

For vendor pitches, agents have **no charts or market data**. They show up with nothing but their gut feeling, competing against agents who have prepared materials.

### The Market Gap
- **UK has:** Rightmove Plus (£225/mo), PropTrack, Zoopla Pro, OnTheMarket Insights
- **Ireland has:** Nothing. Zero. The PPR website. That's it.

With 1,200+ licensed estate agents in Ireland, most operating independently, there's a clear gap for a dedicated professional tool.

### Why Now
1. **irishpropertydata.com** already has the hard part solved — 47k+ geocoded transactions with asking prices, sold prices, and calculated over/under percentages
2. The SEO overhaul has driven organic traffic; agents are already finding the site
3. Stripe integration is live; billing infrastructure exists
4. The Dublin market is competitive enough that agents need differentiation

---

## 2. Product Vision

### 12-Month Vision
**Gaff Intel is the essential daily tool for Irish estate agents** — the first tab they open each morning to check market activity, the tool they use in vendor meetings to justify valuations, and the platform they rely on to serve investor clients.

By March 2027, Gaff Intel will be:
- Used by 100+ paying agents (€50k ARR target)
- The de facto source of Irish property market intelligence
- Integrated with 5+ external data sources (CSO, BER, planning, etc.)
- Referenced in at least 3 national media property stories

### Core Philosophy
- **Speed over completeness:** A 10-second comparable lookup beats a 20-minute Excel session
- **Visual over tabular:** Charts and maps win vendor meetings; spreadsheets don't
- **Actionable over comprehensive:** Show agents what they need to make decisions, not everything available

---

## 3. Target Users

### Persona 1: Independent Estate Agent (Primary)
**Name:** Sarah, 38
**Role:** Owner-operator of a 2-person agency in South Dublin
**Annual transactions:** 30-40 sales
**Pain points:**
- Spends 2-3 hours/week on valuation research
- Loses pitches to larger agencies with better data
- Can't serve investor clients effectively
- No admin staff to do research for her

**Quote:** "I know my area, but when a vendor asks 'how did you get that number?' I need proof."

**Willingness to pay:** €49/mo is less than 1 hour of her time — instant ROI if it saves 1 hour/month

### Persona 2: Senior Negotiator (Secondary)
**Name:** Brian, 29
**Role:** Senior negotiator at mid-size Dublin agency
**Annual transactions:** 50-60 sales
**Pain points:**
- Wants to impress vendors with professional presentations
- Boss asks for area reports and he has to compile manually
- Competing with colleagues for listings

**Quote:** "I want to walk into a pitch with better data than the other two agents they're meeting."

**Willingness to pay:** Agency will pay if he demonstrates value

### Persona 3: Agency Owner (Enterprise)
**Name:** Michael, 52
**Role:** Owner of 8-person regional agency
**Annual transactions:** 150+ sales
**Pain points:**
- Needs consistent quality across team
- Wants to track market trends for strategic decisions
- PR/marketing needs local market reports

**Quote:** "My junior negotiators need guardrails. They can't just make up numbers."

**Willingness to pay:** €149/mo for team access + branded reports

---

## 4. Core Value Propositions

### VP1: 10-Second Comparable Lookup
**The promise:** Enter an address, get 20 comparable sales in 10 seconds — properly filtered by distance, property type, beds, and recency.

**Why it matters:** This single feature replaces 20-30 minutes of Excel work. If it works reliably, agents will pay for this alone.

### VP2: Vendor Pitch Materials
**The promise:** One-click PDF/PNG export of market charts, comparable sales grid, and area trends — branded with agent's logo.

**Why it matters:** Agents compete for listings. The one with professional materials wins. Currently, only large agencies have marketing departments producing these.

### VP3: Investor Deal Finder
**The promise:** Instant yield calculations for any property using actual rental data, not estimates.

**Why it matters:** Investor clients are high-value (often repeat buyers). Agents who can serve them well win more business. Currently, no agent can answer "what yield will I get?" with data.

### VP4: Market Intelligence
**The promise:** Weekly market pulse — what's selling, what's sitting, where prices are moving.

**Why it matters:** Keeps agents informed without effort. Creates habit/stickiness. Enables them to advise clients proactively.

### VP5: Local Expertise Proof
**The promise:** Area deep-dives with planning activity, development pipeline, school catchments, transport — everything a vendor might ask about.

**Why it matters:** Vendors choose agents who "know the area". This data proves it.

---

## 5. Feature Set

### MVP (Phase 1) — 4-6 weeks

#### F1.1: Comparable Sales Lookup (Core)
**User story:** As an agent, I want to enter an address and instantly see relevant comparable sales so I can justify my valuation.

**Specification:**
- Input: Address search with autocomplete (Eircode or text)
- Default filters: Within 0.5km, same property type, ±1 bed, last 24 months
- Output: Grid of 20 most relevant comparables
- Each comparable shows: Address, sold date, sold price, asking price, % over/under, beds/baths, size, distance from target
- Sort options: Date (default), price, distance, relevance score
- Expandable filters: Distance (0.25/0.5/1/2km), bedrooms, date range, price range

**Data sources:** Property Price Register + Daft scraped data (already have)

**Why MVP:** This is the killer feature. Everything else is enhancement.

#### F1.2: Valuation Summary Card
**User story:** As an agent, I want a suggested valuation range based on comparables so I have a starting point for discussions.

**Specification:**
- Algorithm: Median of top 10 comparables adjusted for size/beds
- Output: "Suggested range: €485,000 - €520,000"
- Confidence indicator: High (10+ close comps), Medium (5-10), Low (<5)
- Breakdown: Shows how range was calculated
- Export: One-click copy to clipboard, PDF download

**Why MVP:** Transforms data into actionable recommendation.

#### F1.3: Basic Authentication + Billing
**User story:** As an agent, I want to sign up, pay, and access premium features.

**Specification:**
- Supabase Auth (email/password, Google OAuth)
- Email verification flow
- Stripe Checkout for €49/mo subscription
- Profiles table with `tier` field (free/pro/agency)
- Webhook to update tier on successful payment
- Billing portal link for subscription management

**Why MVP:** Can't charge without this.

#### F1.4: Dashboard Home
**User story:** As an agent, I want to see market overview and quick actions when I log in.

**Specification:**
- Market pulse: Total sales this month vs last, median price change, % over asking
- Quick search bar (same as comparable lookup)
- Recent searches (last 5)
- Saved properties (if any)

**Why MVP:** First impression; establishes value immediately.

#### F1.5: Saved Properties
**User story:** As an agent, I want to save properties I'm working on for quick access.

**Specification:**
- Save any property from search results
- List view of saved properties
- Notes field per property
- Delete saved properties
- Max 50 saved (upgrade prompt beyond)

**Why MVP:** Creates stickiness; agents build a portfolio of active properties.

---

### Phase 2 — First Paying Customer to Product-Market Fit (4-8 weeks after MVP)

#### F2.1: Export/Report Generation
**User story:** As an agent, I want to generate PDF reports to bring to vendor meetings.

**Specification:**
- Template: Single-page valuation summary
- Contents: Property details, comparable sales table (top 10), area chart, suggested range
- Branding: Agent can upload logo
- Formats: PDF, PNG (for email/WhatsApp)
- Watermark on free tier, clean on paid

**Data sources:** All existing

**Why Phase 2:** Not needed to validate; needed to close sales.

#### F2.2: Yield Calculator
**User story:** As an agent, I want to show investor clients the expected rental yield for a property.

**Specification:**
- Input: Property address or selection from search
- Output:
  - Estimated monthly rent (from rental data)
  - Gross yield = (Annual rent / Purchase price) × 100
  - Net yield estimate (after typical costs: 25% expense ratio)
- Confidence level: Based on rental data points available
- Comparison: "This is higher/lower than Dublin average of X%"

**Data sources:** Daft rental scrape (already have)

#### F2.3: Area Trends Charts
**User story:** As an agent, I want to show vendors how their area's prices have changed.

**Specification:**
- Price trend: Median price over last 3 years, monthly
- Volume trend: Number of sales per month
- Over/under asking trend: % selling over asking over time
- Days on market trend (requires listing data enhancement)

**Data sources:** Existing sold data, aggregated by area

#### F2.4: Deal Assessment (Over/Under Analysis)
**User story:** As an agent, I want to quickly see if comparable properties typically sell over or under asking.

**Specification:**
- Visual: Distribution chart of over/under percentages in area
- Stats: Average % over/under, median, range
- Insight: "8 of last 10 sales in this area went over asking by an average of €32,000"
- Time filter: Last 6 months, last 12 months, last 24 months

**Data sources:** Existing sold data with asking prices

#### F2.5: Team Seats (Agency Tier)
**User story:** As an agency owner, I want to add team members to share access.

**Specification:**
- Agency tier: €149/mo for up to 5 seats
- Invite by email
- Shared saved properties (optional)
- Admin can see team activity

---

### Phase 3 — Moat Features (3-6 months post-launch)

#### F3.1: Planning Permissions Integration
**User story:** As an agent, I want to see nearby planning activity that could affect property value.

**Specification:**
- Pull from ArcGIS API (already have route in codebase)
- Show on map: Granted, pending, refused
- Filter by type: Residential, commercial, extensions
- Alert: "5 new residential units approved within 500m in last 6 months"
- Value angle: "This extension could add €X based on similar area properties"

**Data sources:** ArcGIS planning API (already integrated)

#### F3.2: BER (Building Energy Rating) Integration
**User story:** As an agent, I want to see BER ratings for properties to advise on upgrade value.

**Specification:**
- SEAI publishes full BER database (500k+ properties)
- Match by address/Eircode
- Show: Current rating, estimated upgrade cost, potential value uplift
- Insight: "A1 properties in this area sell for €42k more on average"

**Data sources:** SEAI BER database (free CSV download)

#### F3.3: CSO Market Data Integration
**User story:** As an agent, I want to see official economic indicators for context.

**Specification:**
- Mortgage drawdown trends by county
- Construction completions by area
- Population growth trends
- Integration with CSO API (data.cso.ie)

**Data sources:** CSO Open Data API

#### F3.4: Automated Market Reports
**User story:** As an agent, I want a weekly email with market activity in my areas.

**Specification:**
- User selects areas of interest (up to 5)
- Weekly digest: New sales, price changes, notable transactions
- PDF attachment: One-page market summary per area
- Branded with agent logo

#### F3.5: Branded Client Reports
**User story:** As an agent, I want to send professional reports to clients with my branding.

**Specification:**
- Templates: Vendor appraisal, buyer guide, investor analysis
- White-label: Agent's logo, colors, contact details
- PDF generation with custom cover page
- Shareable link option (hosted on gaffintel.ie/reports/[id])

#### F3.6: Price Prediction (AI)
**User story:** As an agent, I want an AI-assisted price prediction for unusual properties.

**Specification:**
- When comparable data is sparse, use ML model
- Inputs: Property characteristics, location, market trends
- Output: Price range with confidence interval
- Disclaimer: "AI-assisted estimate. Consult local expertise."

**Data sources:** All existing data as training set

---

## 6. Data Strategy

### Current Data Assets
| Source | Status | Records | Refresh |
|--------|--------|---------|---------|
| Property Price Register (via Daft) | Live | 47k+ Dublin | Daily |
| Daft rental listings | Live | ~3k | Daily |
| Daft for-sale listings | Live | ~4k | Daily |
| Planning permissions (ArcGIS) | API integrated | On-demand | Real-time |
| OSM amenities | API integrated | On-demand | Real-time |

### Phase 1 Data Integrations
| Source | Effort | Value | Priority |
|--------|--------|-------|----------|
| BER database (SEAI) | Low (CSV download) | High — energy ratings are increasingly important | P1 |
| Eircode lookup | Low (free API) | High — improves address matching | P1 |

### Phase 2 Data Integrations
| Source | Effort | Value | Priority |
|--------|--------|-------|----------|
| CSO mortgage data | Low (API) | Medium — macro context | P2 |
| BPFI drawdown data | Low (spreadsheet) | Medium — lending trends | P2 |
| Dublin City planning | Medium (scrape) | Medium — detailed local planning | P2 |

### Phase 3 Data Integrations
| Source | Effort | Value | Priority |
|--------|--------|-------|----------|
| GeoDirectory | High (paid ~€500/yr) | High — authoritative address data | P3 |
| Land Registry/Tailte | Medium (limited public) | Medium — title info | P3 |
| School catchments | Medium (compile) | Medium — families care a lot | P3 |

### Data Moat
Over time, Gaff Intel accumulates:
1. **Asking price history** — PPR doesn't have this; we do
2. **Days on market** — From listing tracking
3. **Price reduction patterns** — From listing tracking
4. **Agent-specific insights** — From user behavior (anonymised)

These create competitive barriers that are hard to replicate.

---

## 7. Monetisation

### Pricing Tiers

| Tier | Price | Features |
|------|-------|----------|
| Free | €0 | 5 comparable lookups/month, watermarked exports, no saved properties |
| Pro | €49/mo | Unlimited lookups, clean exports, 50 saved properties, yield calculator, area trends |
| Agency | €149/mo | Everything in Pro + 5 team seats, branded reports, priority support, API access |

### Why €49/mo for Pro
- Equivalent to ~1 hour of agent time at billable rates
- If it saves 1 hour/month (which comparable lookup alone does), ROI is immediate
- Low enough for independent agents to expense
- High enough to signal professional quality
- UK equivalents are £150-225/mo; we're undercutting significantly

### Trial Strategy
- 14-day free trial of Pro tier
- No credit card required to start
- Daily usage email: "You've done 3 lookups today. Pro users average 8."
- Day 10 email: "Your trial ends in 4 days. Here's what you'll lose access to."
- Conversion target: 15% trial-to-paid

### Expansion Revenue
- Agency tier upsell for teams
- Branded report add-on (€29/mo) for Pro users who want white-labelling
- API access for integration with agent's CRM (€99/mo add-on)

---

## 8. Go-to-Market

### Target: First 20 Paying Customers

#### Channel 1: Direct Outreach (Primary)
**Action:** Cold email 200 independent agents in Dublin

**Email template:**
```
Subject: Quick question about your PPR workflow

Hi [Name],

I noticed you recently sold [Address] — congrats on that one.

Quick question: how long does it usually take you to pull comparables
from the Property Price Register for a valuation?

We've built a tool that does it in 10 seconds. Would you be open to
a 15-minute demo this week?

No obligation — I just want to show you what we've built and get your feedback.

[Name]
```

**Sourcing contacts:** PSRA register is public, cross-reference with LinkedIn

#### Channel 2: IPAV/SCSI Partnership
**Action:** Approach IPAV (Institute of Professional Auctioneers and Valuers) about member benefits

**Pitch:** "Exclusive member discount on Ireland's first property analytics platform"

**Target:** Speaking slot at IPAV annual conference, featured in member newsletter

#### Channel 3: Lead Magnet
**Action:** Monthly Dublin Market Report — free, high-quality PDF

**Contents:**
- Top 10 sales of the month
- Area price movements
- Market temperature gauge
- One insightful chart

**Distribution:** LinkedIn organic, email capture, Daft/property forums

**Conversion:** Footer CTA: "Get instant access to all this data with Gaff Intel Pro"

#### Channel 4: Property Journalist Seeding
**Action:** Provide exclusive data insights to property journalists

**Targets:** Irish Times property section, Irish Independent, TheJournal

**Angle:** Be the source for "X% of Dublin homes sold over asking last month" stats

**Benefit:** Brand awareness, credibility, SEO backlinks

### Launch Timeline
| Week | Action |
|------|--------|
| W1 | Soft launch to 5 friendly agents (feedback) |
| W2 | Iterate on feedback, fix critical bugs |
| W3 | Cold outreach begins (50 emails/day) |
| W4 | IPAV initial conversation |
| W5 | First market report published |
| W6 | Press outreach with data story |

---

## 9. Success Metrics

### North Star Metric
**Monthly Active Users (MAU) who run 5+ comparable lookups**

This measures:
- Product utility (they're using the core feature)
- Retention (they're coming back)
- Potential conversion (heavy users convert)

### Funnel Metrics
| Stage | Metric | Target (Month 3) |
|-------|--------|------------------|
| Awareness | Site visits to /agent | 1,000/mo |
| Signup | Free account created | 200/mo |
| Activation | First comparable lookup | 150/mo |
| Engagement | 5+ lookups in week 1 | 75/mo |
| Conversion | Pro subscription | 30 total |
| Retention | Month 2 renewal | 85% |

### Revenue Metrics
| Metric | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|----------|
| Paying customers | 30 | 75 | 150 |
| ARR | €18k | €45k | €90k |
| Churn | <10% | <8% | <5% |

### Product Metrics
| Metric | Target |
|--------|--------|
| Time to first result | <3 seconds |
| Comparable lookup accuracy | >90% relevance (user survey) |
| NPS | >40 |
| Support tickets/user/month | <0.5 |

---

## 10. Risks

### R1: Data Accuracy (High Impact, Medium Probability)
**Risk:** Comparable results are inaccurate, agents lose trust

**Mitigation:**
- Extensive testing against known valuations
- User feedback mechanism: "Was this helpful?"
- Quality score visible to users
- Manual review of edge cases initially

### R2: Legal/Data Sourcing (High Impact, Low Probability)
**Risk:** Daft or PPR objects to data usage

**Mitigation:**
- PPR data is public domain
- Daft ToS review (avoid direct scraping claims)
- Consider official Daft partnership later
- No redistribution of raw data; only aggregated insights

### R3: Slow Adoption (High Impact, Medium Probability)
**Risk:** Agents stick to their Excel workflows

**Mitigation:**
- Demo video showing time savings
- Free trial with no friction
- Case studies from early adopters
- "Works the way you already think" — not a paradigm shift

### R4: Competition (Medium Impact, Low Probability)
**Risk:** Daft/MyHome launches competing product

**Mitigation:**
- First-mover advantage with agent relationships
- Data moat from asking price tracking
- Focus on agent workflow, not consumer features
- Potential acquisition target (exit option)

### R5: Technical Scalability (Low Impact, Low Probability)
**Risk:** System can't handle load

**Mitigation:**
- Current architecture handles 47k properties easily
- Supabase scales automatically
- Pre-compute common aggregations
- CDN for static reports

### R6: Key Person Risk (Medium Impact, Medium Probability)
**Risk:** Solo founder burnout/distraction

**Mitigation:**
- Automation of scraping/data pipeline
- Clear prioritisation (this PRD)
- Early customer relationships for motivation
- Potential co-founder for sales/support

---

## Appendix A: Competitive Analysis

| Feature | Gaff Intel | PPR (Gov) | Daft | REA UK |
|---------|------------|-----------|------|--------|
| Comparable lookup | 10 sec | 30 min | N/A | Yes |
| Asking vs sold | Yes | No | No | Yes |
| Yield calculator | Yes | No | No | Yes |
| Export reports | Yes | CSV only | No | Yes |
| Planning data | Yes | No | No | Yes |
| Price | €49/mo | Free | Free | £225/mo |
| Irish-specific | Yes | Yes | Yes | No |

---

## Appendix B: User Interview Questions

For validation calls with agents:

1. Walk me through your last property valuation. How did you research comparables?
2. How much time do you spend per valuation on research?
3. What tools do you currently use? (Excel, PPR website, memory?)
4. When was the last time you lost a pitch? What did the winning agent do differently?
5. Do you work with investor clients? How do you handle yield questions?
6. What would you pay for a tool that cut your research time in half?
7. What's the one thing that would make you try a new tool?
8. How do you stay informed about market trends?
9. Do you use any PropTech tools currently?
10. If I showed you [demo], would this be useful?

---

## Appendix C: Technical Requirements Summary

- **Auth:** Supabase SSR with profiles table, tier management
- **Payments:** Stripe subscriptions with webhook updates
- **Database:** Supabase PostgreSQL (existing)
- **Frontend:** Next.js App Router (existing)
- **Maps:** Mapbox (existing)
- **Export:** PDF generation (react-pdf or puppeteer)
- **Email:** Resend or similar for transactional
- **Analytics:** PostHog (existing)
- **Hosting:** Digital Ocean or Vercel

---

*Document end. Ready for Implementation Plan.*
