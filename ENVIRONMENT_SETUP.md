# Environment Setup Guide

## Development Environment Security

### 1. Environment Variables
Create `.env.local` in the `dashboard/` directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Build & Runtime Settings
NODE_ENV=development
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Security: Disable external monitoring in development
DISABLE_EXTERNAL_MONITORING=true

# Optional: Analytics
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
```

### 2. Production Build Settings
For production builds, ensure these are set to prevent localhost API calls:

```bash
NODE_ENV=production
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

### 2. Security Checks
Run security checks before commits:

```bash
# Check for security issues
npm run security-check

# Run before building
npm run build  # Includes security check automatically
```

### 3. Asset Management
- **Never commit binary images** (PNG, JPG, etc.)
- **Use CDN URLs** for production assets
- **Validate asset URLs** before deployment

### 4. Development Tools
- **Disable browser extensions** that monitor asset loading
- **Use browser dev tools** instead of curl commands
- **Avoid automated testing tools** that use child_process
