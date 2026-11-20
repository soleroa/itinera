import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Accommodation } from '../tools/accommodation.tool';
import type { Flight } from '../tools/flights.tool';
import { allCombinations, buildChoices, CHOICES_SHOWN, pickOptions, quality } from './combinations';

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
    const nonstop = quality(flight(100, 0), [hotel(100, 4, '3-star hotel')]);
    const oneStop = quality(flight(100, 1), [hotel(100, 4, '3-star hotel')]);
    assert.equal(nonstop - oneStop, 0.5);
    assert.ok(
      quality(flight(100), [hotel(100, 4.5, '5-star hotel')]) >
        quality(flight(100), [hotel(100, 4.5, '2-star hotel')]),
    );
  });

  it('falls back to a neutral rating and zero stars when missing', () => {
    assert.equal(quality(flight(100), [hotel(100)]), 3.5);
  });
});

describe('allCombinations', () => {
  it('builds every pair, sums the totals and sorts cheapest first', () => {
    const pairs = allCombinations(flights, [hotels]);
    assert.equal(pairs.length, 6);
    assert.equal(pairs[0].total, 500); // 300 + 200
    assert.equal(pairs[pairs.length - 1].total, 1000); // 500 + 500
    assert.deepEqual(
      pairs.map((p) => p.total),
      [...pairs.map((p) => p.total)].sort((a, b) => a - b),
    );
  });

  it('returns nothing when either side is empty', () => {
    assert.deepEqual(allCombinations([], [hotels]), []);
    assert.deepEqual(allCombinations(flights, [[]]), []);
  });
});

describe('pickOptions', () => {
  const candidates = allCombinations(flights, [hotels]);

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
    const [only, second] = allCombinations([flight(100)], [[
      hotel(100, 4),
      hotel(150, 5),
    ]]);
    const options = pickOptions([only, second], null);
    assert.equal(options.length, 2);
    assert.notEqual(options[0].accommodations[0], options[1].accommodations[0]);
  });

  it('handles a single candidate', () => {
    const options = pickOptions(allCombinations([flight(100)], [[hotel(100)]]), null);
    assert.equal(options.length, 1);
    assert.equal(options[0].level, 'cheapest');
  });
});

describe('buildChoices', () => {
  const flights = Array.from({ length: 12 }, (_, i) => flight(500 + i * 50, i % 3));
  const hotels = Array.from({ length: 12 }, (_, i) => hotel(400 + i * 100, 3 + (i % 3) * 0.6, `${3 + (i % 3)}-star hotel`));

  it('offers a capped list with exactly one recommended flight and stay', () => {
    const c = buildChoices(flights, [hotels], 3000)!;
    assert.equal(c.flights.length, CHOICES_SHOWN);
    assert.equal(c.stays[0].length, CHOICES_SHOWN);
    assert.equal(c.flights.filter((f) => f.recommended).length, 1);
    assert.equal(c.stays[0].filter((s) => s.recommended).length, 1);
    assert.match(c.recommendationReason, /within your budget/);
  });

  it('recommends a pair that fits the budget', () => {
    const c = buildChoices(flights, [hotels], 1500)!;
    const f = c.flights.find((x) => x.recommended)!;
    const s = c.stays[0].find((x) => x.recommended)!;
    assert.ok(f.totalPrice + s.totalPrice <= 1500);
  });

  it('recommends the cheapest pair when nothing fits', () => {
    const c = buildChoices(flights, [hotels], 100)!;
    assert.equal(c.flights.find((x) => x.recommended)!.totalPrice, 500);
    assert.equal(c.stays[0].find((x) => x.recommended)!.totalPrice, 400);
    assert.match(c.recommendationReason, /over your budget/);
  });

  it('keeps the recommendation in the list even when it is not among the cheapest', () => {
    const c = buildChoices(flights, [hotels], null)!;
    assert.ok(c.flights.some((x) => x.recommended));
    assert.ok(c.stays[0].some((x) => x.recommended));
  });

  it('returns null with nothing to combine', () => {
    assert.equal(buildChoices([], [hotels], 1000), null);
  });
});

describe('multi-city combinations', () => {
  const romeStays = [hotel(300, 4, '3-star hotel'), hotel(600, 4.8, '5-star hotel')];
  const veniceStays = [hotel(200, 3.9, '3-star hotel'), hotel(450, 4.7, '4-star hotel')];

  it('picks one stay per city and sums everything', () => {
    const pairs = allCombinations([flight(400)], [romeStays, veniceStays]);
    assert.equal(pairs.length, 4);
    assert.ok(pairs.every((p) => p.accommodations.length === 2));
    assert.equal(pairs[0].total, 400 + 300 + 200);
    assert.equal(pairs[3].total, 400 + 600 + 450);
  });

  it('returns nothing when one city has no stays', () => {
    assert.deepEqual(allCombinations([flight(400)], [romeStays, []]), []);
  });

  it('offers a list and one recommendation per city', () => {
    const c = buildChoices([flight(400), flight(500)], [romeStays, veniceStays], 1500)!;
    assert.equal(c.stays.length, 2);
    for (const list of c.stays) assert.equal(list.filter((s) => s.recommended).length, 1);
    const total =
      c.flights.find((f) => f.recommended)!.totalPrice +
      c.stays.reduce((sum, list) => sum + list.find((s) => s.recommended)!.totalPrice, 0);
    assert.ok(total <= 1500);
  });

  it('keeps the number of combinations bounded for long trips', () => {
    const many = Array.from({ length: 15 }, (_, i) => hotel(100 + i * 10, 4));
    const pairs = allCombinations(Array.from({ length: 15 }, (_, i) => flight(300 + i)), [many, many, many, many]);
    assert.ok(pairs.length <= 15 * 4 ** 4);
  });
});
