# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Gaff Intel for Agents** is a B2B estate agent analytics platform built with Next.js 16 (App Router). It provides Irish property professionals with instant valuations, comparable property analysis, and market statistics powered by the main app's property data.

The app targets agents as paying users with tiered plans (Free, Professional, Team). Key features include:
- **Valuation Tool**: Search any Dublin property and get comparable sales, price analysis, and deal assessment
- **PDF Report Export**: Download professional reports to send to clients/vendors
- **Market Analytics**: Median prices, trends, price/sqm analysis based on 47K+ sold properties
- **Authentication**: Uses shared Supabase backend with main consumer app
- **Billing**: Usage-based plan limits (searches per month) tracked in database

## Common Commands

### Development
```bash
npm run dev              # Start dev server (localhost:3000)
npm run build           # Production build with TypeScript check
npm run start           # Start production server
npm run lint            # ESLint on codebase
```

### Troubleshooting
```bash
# Port conflict - dev server uses 3000 by default, falls back to 3001
# Lock file issues - remove .next/dev/lock if dev server hangs
rm -f .next/dev/lock && npm run dev

# Build TypeScript errors - always run build before committing
npm run build
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 16 (Turbopack bundler, App Router)
- **Language**: TypeScript 5 (strict mode, unused locals/params errors)
- **Styling**: Tailwind CSS 3.3 + custom CSS variables (dark theme system)
- **Auth**: Supabase Auth (shared with main app at irishpropertydata.com)
- **Charts**: Recharts 2.10 (for price trends, currently placeholder)
- **PDF**: html2pdf.js 0.10 (client-side generation)
- **Icons**: Lucide React 0.294
- **Payments**: Stripe 14.0 (integrated, not yet active)

### Directory Structure
```
src/
  app/
    page.tsx                          # Landing page (hero, features, pricing)
    login/page.tsx                    # Sign up / Sign in form
    layout.tsx                        # Root layout with AuthProvider
    globals.css                       # Design system: colors, typography, components
    middleware.ts                     # Auth middleware (redirect to login if needed)
    dashboard/
      page.tsx                        # Hub: stats, recent searches, quick access
      valuation/page.tsx              # Main tool: search → results → PDF download
      team/page.tsx                   # Placeholder (coming soon)
      reports/page.tsx                # Placeholder (coming soon)
      monitoring/page.tsx             # Placeholder (coming soon)
    api/
      search/route.ts                 # Property search API endpoint
      auth/callback/route.ts          # Supabase auth redirect handler

  components/
    ProtectedRoute.tsx                # Wrapper for authenticated pages

  contexts/
    AuthContext.tsx                   # Auth state: session, user, loading, signOut

  lib/
    supabase.ts                       # Client-side Supabase instance
    supabase-server.ts                # Server-side Supabase (for API routes)
    supabase/middleware.ts            # Session refresh in middleware
    data.ts                           # Data loading utilities (future)
    billing.ts                        # Plan enforcement: canPerformSearch, incrementSearchCount

  types/
    html2pdf.d.ts                     # Type definitions for html2pdf.js library
```

### Data Flow

**Authentication:**
1. User signs up/logs in on `/login`
2. Supabase.auth.signUp() or signInWithPassword()
3. Session stored in Supabase cookie
4. Middleware.ts refreshes session on each request
5. AuthContext provides session/user to app

**Search → Valuation:**
1. User searches address on `/dashboard/valuation`
2. Calls `/api/search?q=address` with JWT in Authorization header
3. API route:
   - Verifies JWT token (decodes payload to get user ID)
   - Checks billing: `canPerformSearch(userId)` against plan limits in DB
   - Loads cached data.json (1-hour TTL) from NEXT_PUBLIC_DATA_URL
   - Finds property by fuzzy matching
   - Calculates comparables (within 2km, same type, similar bedrooms)
   - Returns property, comparables, market stats (median, avg, trends)
4. Frontend displays results in styled cards
5. User clicks "Download PDF Report" → html2pdf captures #report template

**Billing:**
- Free plan: 5 searches/month
- Professional: 25 searches/month
- Team: 250 searches/month
- Limits stored in supabase.profiles table, incremented per search
- 401 response if limit exceeded

### Design System (globals.css)

**Color Variables** (dark theme):
```css
--background: #0C0C0F          /* Page background */
--surface: #1A1A21             /* Cards, surfaces */
--border: #2A2A35              /* Dividers */
--accent: #3B82F6              /* Primary blue */
--positive: #22C55E            /* Green: good deals, savings */
--negative: #EF4444            /* Red: premium prices */
--warning: #F59E0B             /* Orange: caution */
--gradient-primary: blue→purple /* Buttons, accents */
```

**Component Classes:**
- `.card` - Surface with border, hover glow effect
- `.stat-card` - Large text values with gradient background
- `.btn-primary` - Gradient blue→purple button
- `.btn-secondary` - Surface button with border
- `.insight-card` - Left-bordered card for insights

**Typography:**
- Inter 400-700 weight (headings 600, body 400)
- JetBrains Mono for prices/numbers

### Key Implementation Patterns

**Protected Routes:**
```tsx
export default function Page() {
  return (
    <ProtectedRoute>
      <PageContent />
    </ProtectedRoute>
  );
}
```

**API Routes with Auth:**
- Extract JWT from `Authorization: Bearer <token>` header
- Decode JWT payload to get `user_id` (the `sub` claim)
- Check billing limits in Supabase
- Return 401 if unauthorized, 429 if quota exceeded

**PDF Export:**
```tsx
// Dynamic import to avoid TypeScript errors
const html2pdf = (await import('html2pdf.js')).default;
html2pdf()
  .set({ margin: 10, filename: 'report.pdf', ... })
  .from(reportElement)
  .save();
```
Wrap report content in `ref={reportRef}`, add `className="no-print"` to hide buttons.

**CSS Variables in JSX:**
```tsx
style={{ background: 'var(--accent)', color: 'var(--foreground)' }}
```
Preferred over Tailwind for consistency with design system tokens.

## Environment Variables

Create `.env.local` with (see `.env.example`):

```
# Supabase (shared backend with main app)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...

# Data source
NEXT_PUBLIC_DATA_URL=https://irishpropertydata.com/data.json

# App URL (for redirects, PDF generation)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe (future payment integration)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_SECRET_KEY=...
```

## Common Development Tasks

### Adding a New Page
1. Create `src/app/[route]/page.tsx`
2. Import `ProtectedRoute` if authenticated-only
3. Use CSS variables (`var(--background)`) for colors
4. Navigation updates automatically (file-based routing)

### Styling Components
- Prefer `className` (Tailwind) + inline `style={{ color: 'var(--accent)' }}` for dynamic colors
- For print/PDF: add `className="no-print"` to hide UI elements
- Responsive: use Tailwind breakpoints (sm:, md:, lg:)

### Testing Search API
```bash
curl -H "Authorization: Bearer <jwt>" \
  "http://localhost:3000/api/search?q=Grafton%20Street"
```

### Building for Production
```bash
npm run build   # Includes TypeScript check, ESLint
npm start       # Run built app locally
```
Build uses Turbopack (fast) and outputs to `.next/` directory. Vercel deployment recommended (auto-builds from main).

## Known Issues & Limitations

1. **Dev Server Lock**: If previous instance crashed, delete `.next/dev/lock` before restarting
2. **Turbopack Warnings**: Multiple lockfiles warning is harmless (monorepo structure)
3. **TypeScript Strict Mode**: `noUnusedLocals` and `noUnusedParameters` are enabled—unused imports must be removed before build
4. **Middleware Deprecation**: "middleware file convention is deprecated" warning is expected; upgrade to `proxy` if needed
5. **PDF Generation**: Client-side via html2pdf.js; charts (Recharts) may require `html2canvas` fallback for rendering
6. **Mobile Responsive**: Tested on common viewports, but full QA needed before launch
7. **Auth Session**: Middleware refreshes Supabase session; old tokens may cause 401s—users can sign out/in to fix

## Testing Guidance

After implementing changes:
1. **Visual test**: Open http://localhost:3000 in browser, check colors/fonts/layout
2. **Build test**: Run `npm run build` (catches TypeScript errors)
3. **Functionality test**:
   - Sign up on `/login` (must work with Supabase backend)
   - Search property on `/dashboard/valuation` (calls `/api/search`)
   - Click "Download PDF" (triggers html2pdf)
   - Test on mobile viewport (responsive design)

## MANDATORY: Test Both Frontend AND Backend Before Committing

**This is a strict requirement.** Before saying "I've finished my changes" and committing code, you MUST test both the frontend and backend:

### Frontend Testing (Required)
```bash
npm run dev
```
Then open http://localhost:3000 and manually verify:
- [ ] All pages load without errors (check browser console)
- [ ] Navigation between pages works (home → login → dashboard → valuation)
- [ ] Forms accept input (sign up, search property)
- [ ] Buttons are clickable and trigger actions
- [ ] Styling looks correct (colors, fonts, spacing, responsive on mobile)
- [ ] No TypeScript errors appear in dev tools

### Backend Testing (Required)
Test the API endpoints that your changes affect:

**Search API:**
```bash
# Get a valid JWT token from auth, then test:
curl -H "Authorization: Bearer <your_jwt_token>" \
  "http://localhost:3000/api/search?q=Grafton%20Street"
```
Verify:
- [ ] Returns 200 status code
- [ ] Response includes property, comparables, stats
- [ ] Unauthorized requests (no token) return 401
- [ ] Over-quota requests return 429
- [ ] Database billing check works (incrementSearchCount)

**Auth Flow:**
- [ ] Sign up creates new account in Supabase
- [ ] Login returns valid session
- [ ] Session persists across page reloads
- [ ] Sign out clears session
- [ ] Protected routes redirect to /login when not authenticated

### Build Test (Required)
```bash
npm run build
```
MUST complete successfully with no errors before committing:
- [ ] TypeScript compilation passes
- [ ] ESLint passes
- [ ] No warnings about unused imports/variables
- [ ] Production build artifacts created in `.next/`

**Do not commit or say you're "finished" if build fails.** Fix TypeScript errors immediately.

### Checklist Before Every Commit

- ✅ `npm run build` completes without errors
- ✅ Dev server runs without console errors
- ✅ Tested all affected pages in browser
- ✅ Tested all affected API endpoints with curl
- ✅ Responsive design checked on mobile
- ✅ Auth flow works if you touched auth code
- ✅ No unused imports (TypeScript will error)

**If you skip testing and code breaks in production, it reflects poorly on the work. Test thoroughly, every time.**

## Future Phases

- **Phase 2**: PDF Report refining (optimize A4 layout, page breaks)
- **Phase 3**: PDF email delivery (send to vendor)
- **Phase 4**: Team management, saved searches, alerts
- **Phase 5**: Market reports, monitoring, API access
