import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { clusterIntoDays, haversineKm, nearestNeighborOrder } from './geo';

const at = (name: string, lat: number, lng: number) => ({ name, lat, lng });

describe('haversineKm', () => {
  it('is zero for the same point and ~111 km per degree of latitude', () => {
    assert.equal(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 0 }), 0);
    const km = haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    assert.ok(Math.abs(km - 111.19) < 0.5);
  });
});

describe('clusterIntoDays', () => {
  const north = [at('n1', 10, 0), at('n2', 10.01, 0.01), at('n3', 10.02, 0)];
  const south = [at('s1', -10, 0), at('s2', -10.01, 0.01), at('s3', -10.02, 0)];

  it('groups nearby places on the same day', () => {
    const days = clusterIntoDays([...north, ...south], 2);
    assert.equal(days.length, 2);
    const names = days.map((d) => d.map((p) => p.name[0]).join(''));
    assert.ok(names.includes('nnn'));
    assert.ok(names.includes('sss'));
  });

  it('keeps every place exactly once', () => {
    const all = [...north, ...south];
    const days = clusterIntoDays(all, 3);
    assert.deepEqual(
      days.flat().map((p) => p.name).sort(),
      all.map((p) => p.name).sort(),
    );
  });

  it('never puts more places on a day than the even split allows', () => {
    const all = [...north, ...south, at('x', 0, 0), at('y', 0.01, 0)];
    const days = clusterIntoDays(all, 3);
    assert.ok(days.every((d) => d.length <= Math.ceil(all.length / 3)));
  });

  it('uses fewer days when there are fewer places', () => {
    assert.equal(clusterIntoDays([at('a', 1, 1)], 5).length, 1);
    assert.deepEqual(clusterIntoDays([], 3), []);
  });

  it('is deterministic', () => {
    const all = [...north, ...south];
    assert.deepEqual(clusterIntoDays(all, 2), clusterIntoDays(all, 2));
  });
});

describe('nearestNeighborOrder', () => {
  it('visits the closest place first and follows the chain', () => {
    const start = { lat: 0, lng: 0 };
    const items = [at('far', 0, 3), at('near', 0, 1), at('mid', 0, 2)];
    assert.deepEqual(
      nearestNeighborOrder(start, items).map((p) => p.name),
      ['near', 'mid', 'far'],
    );
  });

  it('does not mutate its input', () => {
    const items = [at('b', 0, 2), at('a', 0, 1)];
    nearestNeighborOrder({ lat: 0, lng: 0 }, items);
    assert.deepEqual(items.map((p) => p.name), ['b', 'a']);
  });
});
