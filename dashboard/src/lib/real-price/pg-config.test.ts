import { describe, expect, it } from 'vitest';
import { pgConfig } from './pg-config';

const MANAGED = 'postgresql://doadmin:secret@gaff-db-do-user-1.f.db.ondigitalocean.com:25060/defaultdb?sslmode=require';

describe('pgConfig', () => {
  it('takes sslmode out of the URL so it cannot override the TLS setting', () => {
    const config = pgConfig(MANAGED, {});
    expect(config.connectionString).not.toContain('sslmode');
    expect(config.connectionString).toContain('gaff-db-do-user-1.f.db.ondigitalocean.com:25060/defaultdb');
  });

  it('checks the certificate when the provider CA is given', () => {
    const config = pgConfig(MANAGED, { DATABASE_CA_CERT: '-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----\n' });
    expect(config.ssl).toEqual({ ca: '-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----', rejectUnauthorized: true });
  });

  it('still uses TLS without a CA, unchecked', () => {
    expect(pgConfig(MANAGED, {}).ssl).toEqual({ rejectUnauthorized: false });
  });

  it('uses no TLS for the local database or when disabled', () => {
    expect(pgConfig('postgres://gaff:gaff@localhost:55432/gaff', {}).ssl).toBe(false);
    expect(pgConfig(MANAGED, { DATABASE_SSL: 'disable' }).ssl).toBe(false);
  });
});
