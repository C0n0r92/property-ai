import { describe, expect, it } from 'vitest';
import { clientKey, createLimiter, siteUrl } from './guard';

describe('createLimiter', () => {
  it('allows up to the limit inside the window, then refuses', () => {
    const allow = createLimiter(3, 60_000);
    expect(allow('a', 0)).toBe(true);
    expect(allow('a', 1)).toBe(true);
    expect(allow('a', 2)).toBe(true);
    expect(allow('a', 3)).toBe(false);
  });

  it('counts each caller separately', () => {
    const allow = createLimiter(1, 60_000);
    expect(allow('a', 0)).toBe(true);
    expect(allow('b', 0)).toBe(true);
    expect(allow('a', 1)).toBe(false);
  });

  it('allows again once the window has passed', () => {
    const allow = createLimiter(1, 60_000);
    expect(allow('a', 0)).toBe(true);
    expect(allow('a', 59_999)).toBe(false);
    expect(allow('a', 60_000)).toBe(true);
  });
});

describe('clientKey', () => {
  it('uses the first forwarded address', () => {
    expect(clientKey(new Headers({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }))).toBe('203.0.113.9');
  });

  it('falls back to one shared key when there is none', () => {
    expect(clientKey(new Headers())).toBe('unknown');
  });
});

describe('siteUrl', () => {
  it('prefers the configured address over the request origin', () => {
    expect(siteUrl('http://localhost:3000', { NEXT_PUBLIC_SITE_URL: 'https://a.ie/' })).toBe('https://a.ie');
    expect(siteUrl('http://localhost:3000', { NEXT_PUBLIC_BASE_URL: 'https://b.ie' })).toBe('https://b.ie');
  });

  it('uses the request origin when nothing is configured', () => {
    expect(siteUrl('http://localhost:3457', {})).toBe('http://localhost:3457');
  });
});
