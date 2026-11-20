import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { INTERNATIONAL_AIRPORTS } from './airports';

describe('INTERNATIONAL_AIRPORTS', () => {
  it('keys are lowercase and accent-free, so lookups after normalizing always hit', () => {
    for (const key of Object.keys(INTERNATIONAL_AIRPORTS)) {
      assert.equal(key, key.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase());
    }
  });

  it('only has 3-letter IATA codes', () => {
    for (const codes of Object.values(INTERNATIONAL_AIRPORTS)) {
      assert.ok(codes.length > 0 && codes.every((c) => /^[A-Z]{3}$/.test(c)));
    }
  });

  it('resolves the namesake cities to the right continent', () => {
    assert.deepEqual(INTERNATIONAL_AIRPORTS['venice'], ['VCE']);
    assert.deepEqual(INTERNATIONAL_AIRPORTS['athens'], ['ATH']);
    assert.deepEqual(INTERNATIONAL_AIRPORTS['naples'], ['NAP']);
    assert.deepEqual(INTERNATIONAL_AIRPORTS['florence'], ['FLR']);
  });

  it('covers every city the form suggests for a country', () => {
    // popular-cities.ts lives in the frontend; keep the names we suggest by default resolvable.
    for (const city of ['rome', 'florence', 'venice', 'milan', 'madrid', 'barcelona', 'paris', 'lisbon', 'tokyo', 'kyoto']) {
      assert.ok(INTERNATIONAL_AIRPORTS[city], city);
    }
  });
});
