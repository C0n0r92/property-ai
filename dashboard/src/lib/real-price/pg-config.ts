import type { PoolConfig } from 'pg';

/**
 * node-postgres settings for a database URL.
 *
 * Managed databases hand out URLs ending in `sslmode=require`. node-postgres
 * reads that as "verify the certificate against the public authorities" and
 * lets it override any `ssl` setting given in code, so connections to a
 * database with its own certificate authority (DigitalOcean's) fail. The TLS
 * options are therefore taken out of the URL and set here instead:
 *
 * - DATABASE_SSL=disable, or a database on this machine: no TLS.
 * - DATABASE_CA_CERT set (the provider's CA certificate, PEM): TLS, and the
 *   server's certificate is checked against it.
 * - Otherwise: TLS without checking the certificate.
 */
export function pgConfig(url: string, env: Record<string, string | undefined> = process.env): PoolConfig {
  const parsed = new URL(url);
  const sslmode = parsed.searchParams.get('sslmode');
  for (const key of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'uselibpqcompat']) {
    parsed.searchParams.delete(key);
  }
  const local = /^(localhost|127\.0\.0\.1|db)$/.test(parsed.hostname);
  const ca = env.DATABASE_CA_CERT?.trim();

  let ssl: PoolConfig['ssl'];
  if (env.DATABASE_SSL === 'disable' || sslmode === 'disable' || (local && !ca)) ssl = false;
  else if (ca) ssl = { ca, rejectUnauthorized: true };
  else ssl = { rejectUnauthorized: false };

  return { connectionString: parsed.toString(), ssl };
}
