/**
 * A home's name for headings: the house and street, keeping a flat's
 * building ("Apartment 26, The Hardwicke" rather than "Apartment 26").
 */
export function homeTitle(address: string): string {
  const parts = address
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length > 1 && /^(?:apartment|apt|unit|flat|no\.?)\s*\d+[a-z]?$/i.test(parts[0])) return `${parts[0]}, ${parts[1]}`;
  return parts[0] ?? address;
}
