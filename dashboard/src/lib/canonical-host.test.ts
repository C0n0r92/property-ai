import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '../../middleware';

const visit = (url: string, headers: Record<string, string>) =>
  middleware(new NextRequest(url, { headers }));

describe('canonical address middleware', () => {
  it('sends www to the bare domain over https, keeping path and query', () => {
    const res = visit('http://0.0.0.0:8080/blog?x=1', { host: 'www.irishpropertydata.com', 'x-forwarded-proto': 'https' });
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('https://irishpropertydata.com/blog?x=1');
  });

  it('upgrades plain http using the visitor-facing host, not the server address', () => {
    const res = visit('http://0.0.0.0:8080/', { host: 'irishpropertydata.com', 'x-forwarded-proto': 'http' });
    expect(res.headers.get('location')).toBe('https://irishpropertydata.com/');
  });

  it('lets https on the bare domain through', () => {
    const res = visit('http://0.0.0.0:8080/blog', { host: 'irishpropertydata.com', 'x-forwarded-proto': 'https' });
    expect(res.headers.get('location')).toBeNull();
  });

  it('leaves local development alone', () => {
    const res = visit('http://localhost:3457/', { host: 'localhost:3457' });
    expect(res.headers.get('location')).toBeNull();
  });

  it('lets the platform health check reach the server directly over http', () => {
    const res = visit('http://10.244.22.113:8080/api/health', { host: '10.244.22.113:8080' });
    expect(res.headers.get('location')).toBeNull();
  });

  it('does not redirect requests that did not come through the proxy', () => {
    const res = visit('http://10.244.22.113:8080/', { host: '10.244.22.113:8080' });
    expect(res.headers.get('location')).toBeNull();
  });
});
