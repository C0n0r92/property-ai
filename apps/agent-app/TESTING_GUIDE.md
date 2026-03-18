# Testing Guide - Gaff Intel B2B Agent App

## Current Issue: Signup Fails with "Failed to fetch"

### Root Cause Analysis

The error "Failed to fetch" when signing up typically means:

1. **Supabase project misconfigured** (most likely)
2. **Email confirmation not enabled**
3. **Supabase service temporarily down**
4. **Network/CORS issue**

### Debugging Steps

#### Step 1: Check Supabase Project Configuration

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select the project: `gwmxpycigfsmkxvrgbnx`
3. Check **Settings** → **Email Templates** → Verify email confirmation is enabled
4. Check **Settings** → **Auth** → Verify email provider is configured (Supabase Auth or external)

#### Step 2: Check Auth Settings

In Supabase dashboard:
1. **Authentication** → **Providers**
   - Email/Password should be ENABLED
   - Verify email confirmation is ENABLED
2. **Authentication** → **Email Templates**
   - Confirm email template exists
3. **Authentication** → **URL Configuration**
   - Add your app URL to Site URL: `http://localhost:3000` (for local testing)
   - Add redirect URL: `http://localhost:3000/auth/callback`

#### Step 3: Check Supabase Connection

Test the connection from browser console:

```javascript
// Open browser dev tools (F12), go to Console tab
// Paste this:
fetch('https://gwmxpycigfsmkxvrgbnx.supabase.co/rest/v1/health', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // your anon key
  }
})
.then(r => r.json())
.then(d => console.log(d))
.catch(e => console.error('Connection error:', e))
```

#### Step 4: Test Signup Manually

In browser console:

```javascript
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(
  'https://gwmxpycigfsmkxvrgbnx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // anon key
);

const { error, data } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'Test123!@#',
  options: {
    emailRedirectTo: 'http://localhost:3000/auth/callback',
    data: {
      agency_name: 'Test Agency',
      user_type: 'agent'
    }
  }
});

console.log('Error:', error);
console.log('Data:', data);
```

### Common Issues & Fixes

| Issue | Symptom | Fix |
|-------|---------|-----|
| Email not configured | "Failed to fetch" | Enable email provider in Auth settings |
| Redirect URL missing | Signup works but callback fails | Add `http://localhost:3000/auth/callback` to URL config |
| CORS blocked | "Failed to fetch" in Network tab | Check CORS headers (should work automatically) |
| Project paused | All auth fails | Check project status in dashboard |

### Testing the Complete Flow

Once signup works:

1. **Sign up** with test email (e.g., `test1@example.com`)
   - Should see: "Check your email to confirm your account"

2. **Check email** (you should receive confirmation email)
   - Click the confirmation link
   - Should redirect to `/auth/callback` → `/dashboard`

3. **Login with test account**
   - Go to `/login`
   - Enter email and password
   - Should redirect to `/dashboard`

4. **Test valuation search**
   - Go to `/dashboard/valuation`
   - Search for "Grafton Street" or another Dublin address
   - Should see comparables and market stats

5. **Test API directly** (with auth token from login)
   ```bash
   # After login, get session from browser localStorage
   # localStorage.getItem('sb-gwmxpycigfsmkxvrgbnx-auth-token')

   curl -X GET "http://localhost:3000/api/search?q=Grafton%20Street" \
     -H "Authorization: Bearer YOUR_SESSION_TOKEN"
   ```

### Key Files for Debugging

- `/src/lib/supabase.ts` - Browser Supabase client config
- `/src/lib/supabase-server.ts` - Server-side client for API routes
- `/src/app/login/page.tsx` - Login/signup form
- `/src/app/api/search/route.ts` - Search API with auth check
- `/src/app/auth/callback/route.ts` - Email confirmation callback

### Next Steps if Signup Still Fails

1. Check Supabase dashboard for any error logs
2. Verify project is not paused (check billing)
3. Try creating user directly in Supabase dashboard Auth section
4. Check network tab in browser dev tools for actual error response
5. Contact Supabase support if project issues

---

## Full Testing Checklist

- [ ] Supabase email provider enabled
- [ ] Redirect URL configured
- [ ] Signup form works
- [ ] Email received
- [ ] Email confirmation link works
- [ ] Logged in user can see dashboard
- [ ] Search API returns 401 for unauthenticated requests
- [ ] Search API returns results for authenticated requests
- [ ] Billing plan correctly assigned (should be "free")
- [ ] Comparable properties display correctly
- [ ] Deal assessment shows correct verdict
