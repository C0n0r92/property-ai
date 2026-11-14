import { describe, expect, it } from 'vitest';
import { homeTitle } from './home-title';

describe('homeTitle', () => {
  it('keeps a flat’s building', () => {
    expect(homeTitle('Apartment 26, The Hardwicke, Smithfield, Dublin 7')).toBe('Apartment 26, The Hardwicke');
    expect(homeTitle('Apt 4, Rath Gael, Dublin 6')).toBe('Apt 4, Rath Gael');
  });
  it('a house is its house and street', () => {
    expect(homeTitle('1 Annesley Park, Rathmines, Dublin 6')).toBe('1 Annesley Park');
    expect(homeTitle('Apt 26b - Emmet Lodge, St Vincents Street West, Dublin 8')).toBe('Apt 26b - Emmet Lodge');
  });
});
