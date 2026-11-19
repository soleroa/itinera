import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Accommodation } from '../tools/accommodation.tool';
import type { Flight } from '../tools/flights.tool';
import { allCombinations, pickOptions, quality } from './combinations';

const flight = (totalPrice: number, stops = 0): Flight => ({
  airline: 'Test Air',
  totalPrice,
  currency: 'USD',
  stops,
  outboundDeparture: '2026-12-15T08:00:00-03:00',
  outboundArrival: '2026-12-15T10:00:00-03:00',
  link: 'https://example.com/flight',
});

const hotel = (
  totalPrice: number,
  rating?: number,
  category?: string,
): Accommodation => ({
  name: `Hotel ${totalPrice}`,
  type: 'hotel',
  category,
  rating,
  totalPrice,
  pricePerNight: totalPrice / 7,
  currency: 'USD',
  link: 'https://example.com/hotel',
});

const flights = [flight(300, 1), flight(500, 0)];
const hotels = [
  hotel(200, 3.8, '2-star hotel'),
  hotel(500, 4.6, '5-star hotel'),
  hotel(350, 4.2, '4-star hotel'),
];

describe('quality', () => {
  it('rewards rating and stars and penalizes stops', () => {
    const nonstop = quality(flight(100, 0), hotel(100, 4, '3-star hotel'));
    const oneStop = quality(flight(100, 1), hotel(100, 4, '3-star hotel'));
    assert.equal(nonstop - oneStop, 0.5);
    assert.ok(
      quality(flight(100), hotel(100, 4.5, '5-star hotel')) >
        quality(flight(100), hotel(100, 4.5, '2-star hotel')),
    );
  });

  it('falls back to a neutral rating and zero stars when missing', () => {
    assert.equal(quality(flight(100), hotel(100)), 3.5);
  });
});

describe('allCombinations', () => {
  it('builds every pair, sums the totals and sorts cheapest first', () => {
    const pairs = allCombinations(flights, hotels);
    assert.equal(pairs.length, 6);
    assert.equal(pairs[0].total, 500); // 300 + 200
    assert.equal(pairs[pairs.length - 1].total, 1000); // 500 + 500
    assert.deepEqual(
      pairs.map((p) => p.total),
      [...pairs.map((p) => p.total)].sort((a, b) => a - b),
    );
  });

  it('returns nothing when either side is empty', () => {
    assert.deepEqual(allCombinations([], hotels), []);
    assert.deepEqual(allCombinations(flights, []), []);
  });
});

describe('pickOptions', () => {
  const candidates = allCombinations(flights, hotels);

  it('returns cheapest, balanced and best when there is no cap', () => {
    const options = pickOptions(candidates, null);
    assert.deepEqual(
      options.map((o) => [o.level, o.total]),
      [
        ['cheapest', 500],
        ['balanced', 650],
        ['best', 1000],
      ],
    );
  });

  it('never exceeds the budget', () => {
    const options = pickOptions(candidates, 900);
    assert.ok(options.length > 0);
    assert.ok(options.every((o) => o.total <= 900));
    assert.deepEqual(
      options.map((o) => o.level),
      ['cheapest', 'balanced', 'best'],
    );
  });

  it('includes a combination priced exactly at the budget', () => {
    const options = pickOptions(candidates, 500);
    assert.deepEqual(
      options.map((o) => o.total),
      [500],
    );
  });

  it('returns an empty list when nothing fits', () => {
    assert.deepEqual(pickOptions(candidates, 400), []);
  });

  it('returns distinct combinations, even with few candidates', () => {
    const [only, second] = allCombinations([flight(100)], [
      hotel(100, 4),
      hotel(150, 5),
    ]);
    const options = pickOptions([only, second], null);
    assert.equal(options.length, 2);
    assert.notEqual(options[0].accommodation, options[1].accommodation);
  });

  it('handles a single candidate', () => {
    const options = pickOptions(allCombinations([flight(100)], [hotel(100)]), null);
    assert.equal(options.length, 1);
    assert.equal(options[0].level, 'cheapest');
  });
});
