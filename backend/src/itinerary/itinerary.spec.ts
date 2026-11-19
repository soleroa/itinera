import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import type { GoogleMapsClient, Place, Route, TravelMode } from './google-maps.client';
import { ItineraryService, MAX_LEG_MINUTES } from './itinerary.service';
import { pickBestMatch } from './google-maps.client';
import { parseNames } from './place-suggester.service';

const place = (name: string, lat: number, lng: number): Place => ({
  id: name,
  name,
  address: '',
  lat,
  lng,
});

const route = (mode: TravelMode, minutes: number): Route => ({
  mode,
  seconds: minutes * 60,
  meters: minutes * 80,
  steps: [],
});

/** A fake Google client: known places by name, routes decided by `routes`. */
function fakeMaps(
  places: Record<string, Place>,
  routes: (mode: TravelMode, to: string) => Route | null,
): GoogleMapsClient {
  return {
    findPlace: async (query: string) =>
      Object.entries(places).find(([name]) => query.startsWith(name))?.[1] ??
      null,
    route: async (_from: unknown, to: { lat: number; lng: number }, mode: TravelMode) => {
      const target = Object.values(places).find((p) => p.lat === to.lat && p.lng === to.lng);
      return routes(mode, target!.name);
    },
  } as unknown as GoogleMapsClient;
}

const places = {
  Hotel: place('Hotel', 0, 0),
  Museum: place('Museum', 0, 0.01),
  Park: place('Park', 0, 0.02),
  Lake: place('Lake', 5, 5),
};

describe('ItineraryService.validate', () => {
  const service = new ItineraryService(fakeMaps(places, () => null));

  it('accepts a valid request and trims the input', () => {
    const req = service.validate({
      destination: ' Bariloche ',
      hotel: ' Hotel ',
      days: 2,
      places: [' Museum ', ''],
    });
    assert.deepEqual(req, {
      destination: 'Bariloche',
      hotel: 'Hotel',
      days: 2,
      places: ['Museum'],
    });
  });

  it('rejects missing fields, bad days and empty place lists', () => {
    assert.throws(() => service.validate({ hotel: 'H', days: 1, places: ['a'] }), BadRequestException);
    assert.throws(() => service.validate({ destination: 'D', hotel: 'H', days: 0, places: ['a'] }), BadRequestException);
    assert.throws(() => service.validate({ destination: 'D', hotel: 'H', days: 1, places: [] }), BadRequestException);
  });
});

describe('ItineraryService.build', () => {
  it('prefers public transport and reports no warning for short legs', async () => {
    const service = new ItineraryService(fakeMaps(places, (mode) => route(mode, 10)));
    const result = await service.build({
      destination: 'City',
      hotel: 'Hotel',
      days: 1,
      places: ['Museum', 'Park'],
    });
    const [day] = result.days;
    assert.deepEqual(day.stops.map((s) => s.place.name), ['Museum', 'Park']);
    assert.ok(day.stops.every((s) => s.leg?.mode === 'TRANSIT' && s.leg.transitAvailable));
    assert.equal(day.totalTravelMinutes, 20);
    assert.deepEqual(day.warnings, []);
  });

  it('falls back to walking, then driving, when there is no transit data', async () => {
    const walkOnly = new ItineraryService(
      fakeMaps(places, (mode) => (mode === 'TRANSIT' ? null : route(mode, 10))),
    );
    const a = await walkOnly.build({ destination: 'City', hotel: 'Hotel', days: 1, places: ['Museum'] });
    assert.equal(a.days[0].stops[0].leg?.mode, 'WALK');
    assert.equal(a.days[0].stops[0].leg?.transitAvailable, false);

    const driveOnly = new ItineraryService(
      fakeMaps(places, (mode) => (mode === 'DRIVE' ? route(mode, 10) : null)),
    );
    const b = await driveOnly.build({ destination: 'City', hotel: 'Hotel', days: 1, places: ['Museum'] });
    assert.equal(b.days[0].stops[0].leg?.mode, 'DRIVE');
  });

  it('leaves the leg null instead of inventing one when no route exists', async () => {
    const service = new ItineraryService(fakeMaps(places, () => null));
    const result = await service.build({ destination: 'City', hotel: 'Hotel', days: 1, places: ['Museum'] });
    assert.equal(result.days[0].stops[0].leg, null);
  });

  it('warns about a far place but still includes it', async () => {
    const service = new ItineraryService(
      fakeMaps(places, (mode, to) => route(mode, to === 'Lake' ? MAX_LEG_MINUTES + 20 : 5)),
    );
    const result = await service.build({ destination: 'City', hotel: 'Hotel', days: 1, places: ['Museum', 'Lake'] });
    const names = result.days.flatMap((d) => d.stops.map((s) => s.place.name));
    assert.ok(names.includes('Lake'));
    const warnings = result.days.flatMap((d) => d.warnings);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /Lake/);
  });

  it('reports places Google could not find', async () => {
    const service = new ItineraryService(fakeMaps(places, (mode) => route(mode, 5)));
    const result = await service.build({ destination: 'City', hotel: 'Hotel', days: 1, places: ['Museum', 'Atlantis'] });
    assert.deepEqual(result.unresolved, ['Atlantis']);
  });

  it('fails clearly when the hotel or every place is unknown', async () => {
    const service = new ItineraryService(fakeMaps(places, () => null));
    await assert.rejects(
      service.build({ destination: 'City', hotel: 'Nowhere', days: 1, places: ['Museum'] }),
      BadRequestException,
    );
    await assert.rejects(
      service.build({ destination: 'City', hotel: 'Hotel', days: 1, places: ['Atlantis'] }),
      BadRequestException,
    );
  });

  it('splits distant places across days', async () => {
    const service = new ItineraryService(fakeMaps(places, (mode) => route(mode, 5)));
    const result = await service.build({
      destination: 'City',
      hotel: 'Hotel',
      days: 2,
      places: ['Museum', 'Park', 'Lake'],
    });
    assert.equal(result.days.length, 2);
    const withLake = result.days.find((d) => d.stops.some((s) => s.place.name === 'Lake'))!;
    assert.deepEqual(withLake.stops.map((s) => s.place.name), ['Lake']);
  });
});

describe('parseNames', () => {
  it('extracts a JSON array even with surrounding text', () => {
    assert.deepEqual(parseNames('Sure! ["A", "B"] enjoy'), ['A', 'B']);
  });

  it('returns an empty list for anything that is not an array of strings', () => {
    assert.deepEqual(parseNames('no json here'), []);
    assert.deepEqual(parseNames('[1, 2]'), []);
    assert.deepEqual(parseNames('[broken'), []);
  });
});

describe('pickBestMatch', () => {
  const name = (n: string) => n;

  it('prefers the exact name over Google\'s top result', () => {
    assert.equal(
      pickBestMatch('Cerro Catedral', ['Cerro Leon', 'Cerro Catedral'], name),
      'Cerro Catedral',
    );
  });

  it('ignores case and accents', () => {
    assert.equal(
      pickBestMatch('centro civico', ['Plaza X', 'Centro Cívico'], name),
      'Centro Cívico',
    );
  });

  it('accepts a name that contains the query', () => {
    assert.equal(
      pickBestMatch('Llao Llao', ['Cerro Leon', 'Llao Llao Hotel'], name),
      'Llao Llao Hotel',
    );
  });

  it('falls back to the first result when nothing matches', () => {
    assert.equal(pickBestMatch('Atlantis', ['A', 'B'], name), 'A');
    assert.equal(pickBestMatch('Atlantis', [], name), undefined);
  });
});
