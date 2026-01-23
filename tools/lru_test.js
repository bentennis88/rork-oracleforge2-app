// Simple LRUCache unit test to validate eviction behavior
class LRUCache {
  constructor(size = 3) {
    this.size = size;
    this.map = new Map();
  }
  get(key) {
    const v = this.map.get(key);
    if (v === undefined) return undefined;
    this.map.delete(key);
    this.map.set(key, v);
    return v;
  }
  set(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.size) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
  }
}

function assert(cond, msg) {
  if (!cond) {
    console.error('Assertion failed:', msg);
    process.exit(2);
  }
}

const c = new LRUCache(3);
c.set('a', 1);
c.set('b', 2);
c.set('c', 3);
assert(c.get('a') === 1, 'a should be present');
// access b to make it recently used
assert(c.get('b') === 2, 'b should be present');
// add d, should evict c (oldest not recently used)
c.set('d', 4);
assert(c.get('c') === undefined, 'c should have been evicted');
assert(c.get('a') === 1, 'a should still be present');
assert(c.get('b') === 2, 'b should still be present');
assert(c.get('d') === 4, 'd should be present');

console.log('LRU test passed');
process.exit(0);
