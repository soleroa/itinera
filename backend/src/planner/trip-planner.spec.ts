import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { stopDates, TripPlannerService } from './trip-planner.service';

const planner = new TripPlannerService(null as never, null as never);
const base = {
  origin: 'Buenos Aires',
  departure: '2027-05-10',
  returnDate: '2027-05-20',
  travelers: 2,
  maxBudget: 5000,
};

describe('TripPlannerService.validate', () => {
  it('turns a plain destination into a single stop with every night', () => {
    const req = planner.validate({ ...base, destination: 'Rome' });
    assert.deepEqual(req.stops, [{ city: 'Rome', nights: 10 }]);
    assert.equal(req.destination, 'Rome');
  });

  it('accepts several cities whose nights add up to the trip', () => {
    const req = planner.validate({
      ...base,
      stops: [
        { city: ' Rome ', nights: 4 },
        { city: 'Florence', nights: 3 },
        { city: 'Venice', nights: 3 },
      ],
    });
    assert.equal(req.destination, 'Rome');
    assert.deepEqual(req.stops.map((s) => s.city), ['Rome', 'Florence', 'Venice']);
  });

  it('rejects nights that do not add up to the trip length', () => {
    assert.throws(
      () =>
        planner.validate({
          ...base,
          stops: [{ city: 'Rome', nights: 4 }, { city: 'Venice', nights: 3 }],
        }),
      BadRequestException,
    );
  });

  it('rejects empty cities, zero nights and too many cities', () => {
    const bad = (stops: Array<{ city: string; nights: number }>) =>
      assert.throws(() => planner.validate({ ...base, stops }), BadRequestException);
    bad([{ city: '', nights: 10 }]);
    bad([{ city: 'Rome', nights: 0 }, { city: 'Venice', nights: 10 }]);
    bad(Array.from({ length: 5 }, (_, i) => ({ city: `City ${i}`, nights: 2 })));
  });
});

describe('TripPlannerService.validate: scope', () => {
  it('defaults to the full trip', () => {
    assert.equal(planner.validate({ ...base, destination: 'Rome' }).scope, 'full');
  });

  it('stays only needs no origin', () => {
    const req = planner.validate({ ...base, origin: undefined, destination: 'Rome', scope: 'stays' });
    assert.equal(req.scope, 'stays');
    assert.equal(req.origin, '');
  });

  it('flights and the full trip still need an origin', () => {
    for (const scope of ['flights', 'full'] as const) {
      assert.throws(
        () => planner.validate({ ...base, origin: '', destination: 'Rome', scope }),
        BadRequestException,
      );
    }
  });

  it('rejects an unknown scope', () => {
    assert.throws(
      () => planner.validate({ ...base, destination: 'Rome', scope: 'hotels' as never }),
      BadRequestException,
    );
  });
});

describe('stopDates', () => {
  it('chains check-in and check-out across the cities', () => {
    const dates = stopDates({
      departure: '2027-05-10',
      stops: [{ city: 'Rome', nights: 4 }, { city: 'Venice', nights: 6 }],
    });
    assert.deepEqual(dates, [
      { city: 'Rome', checkIn: '2027-05-10', checkOut: '2027-05-14' },
      { city: 'Venice', checkIn: '2027-05-14', checkOut: '2027-05-20' },
    ]);
  });
});
