# Security Guidelines

## Development Environment Security

### 1. Environment Variables
- Use `.env.local` for development (never commit)
- Set `NODE_ENV=development` explicitly
- Disable external monitoring in dev: `DISABLE_EXTERNAL_MONITORING=true`

### 2. Asset Management
- Never commit binary assets (images, screenshots)
- Use CDN URLs for production assets
- Validate all asset URLs before deployment

### 3. Build Process
- Run builds in isolated environments
- Use `--no-verify` flag for testing builds
- Implement build-time asset validation

## Monitoring & Alerts

### 4. Development Monitoring
- Disable automated asset checking in development
- Use browser dev tools instead of curl commands
- Implement proper health checks without external calls

### 5. Security Scanning
- Run security audits: `npm audit`
- Check for suspicious child_process usage
- Monitor for unauthorized network requests

## Code Review Checklist

### 6. Pre-commit Checks
- [ ] No `child_process.execSync()` with curl
- [ ] No hardcoded localhost URLs in production
- [ ] No binary assets committed
- [ ] Environment variables properly configured

## Incident Response

### 7. If Security Alerts Occur:
1. Check git log for recent asset additions
2. Review browser extensions and dev tools
3. Audit environment variables
4. Run security scan: `npm audit`
5. Check for unauthorized monitoring tools
