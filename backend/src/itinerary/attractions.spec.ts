import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { selectAttractions } from './attractions';
import type { Place } from './google-maps.client';

const place = (name: string, lat: number, lng: number, extra: Partial<Place> = {}): Place => ({
  id: name,
  name,
  address: '',
  types: ['tourist_attraction'],
  lat,
  lng,
  rating: 4.6,
  ratingCount: 1000,
  ...extra,
});

describe('selectAttractions', () => {
  it('drops agencies and stations', () => {
    const result = selectAttractions(
      [
        place('Museum', 0, 0),
        place('City Tours', 1, 1, { types: ['tour_agency', 'tourist_attraction'] }),
        place('Central Station', 2, 2, { types: ['transit_station'] }),
      ],
      5,
    );
    assert.deepEqual(result.map((p) => p.name), ['Museum']);
  });

  it('drops the same spot listed twice, even with different names', () => {
    const result = selectAttractions(
      [place('Cartel Ushuaia', -54.8, -68.3), place('End of the World Sign', -54.8001, -68.3001)],
      5,
    );
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'Cartel Ushuaia');
  });

  it('drops a nearby place that shares a name word, but keeps distinct neighbours', () => {
    const result = selectAttractions(
      [
        place('Parque Independencia', 0, 0),
        place('Parque de la Independencia Entrada', 0, 0.001), // ~110 m, shares "independencia"
        place('Fountain', 0, 0.001),
      ],
      5,
    );
    assert.deepEqual(result.map((p) => p.name), ['Parque Independencia', 'Fountain']);
  });

  it('prefers well rated places and keeps Google order', () => {
    const result = selectAttractions(
      [
        place('Meh', 0, 0, { rating: 3.2 }),
        place('Great', 0, 1),
        place('Unreviewed', 0, 2, { ratingCount: 3 }),
        place('Good', 0, 3),
      ],
      2,
    );
    assert.deepEqual(result.map((p) => p.name), ['Great', 'Good']);
  });

  it('fills up with weaker places rather than returning too few', () => {
    const result = selectAttractions([place('A', 0, 0), place('B', 0, 1, { rating: 3.5 })], 2);
    assert.deepEqual(result.map((p) => p.name), ['A', 'B']);
  });

  it('respects the count', () => {
    const many = Array.from({ length: 10 }, (_, i) => place(`P${i}`, 0, i));
    assert.equal(selectAttractions(many, 4).length, 4);
  });
});
