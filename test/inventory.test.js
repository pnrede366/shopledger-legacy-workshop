const test = require('node:test');
const assert = require('node:assert/strict');
const inventory = require('../lib/inventory');

// All fixtures are constructed here; no persisted application data is loaded.
function product(overrides = {}) {
  return { id: 1, name: 'Test product', stock: 10, reserved: 3, ...overrides };
}

for (const { name, fields, expected } of [
  { name: 'subtracts reserved units', fields: { stock: 10, reserved: 3 }, expected: 7 },
  { name: 'keeps all unreserved units sellable', fields: { stock: 1, reserved: 0 }, expected: 1 },
  { name: 'returns zero when all units are reserved', fields: { stock: 3, reserved: 3 }, expected: 0 },
  { name: 'clamps over-reservation to zero', fields: { stock: 2, reserved: 3 }, expected: 0 },
  { name: 'defaults missing stock and reservations to zero', fields: {}, expected: 0 },
  { name: 'defaults missing reservations to zero', fields: { stock: 4 }, expected: 4 },
  { name: 'converts numeric strings', fields: { stock: '4', reserved: '3' }, expected: 1 }
]) {
  test(`getSellableStock ${name}`, () => {
    const fixture = { ...fields };
    assert.equal(inventory.getSellableStock(fixture), expected);
    assert.deepEqual(fixture, fields);
  });
}

test('getSellableStock returns zero for a missing product', () => {
  assert.equal(inventory.getSellableStock(null), 0);
  assert.equal(inventory.getSellableStock(undefined), 0);
});

test('check accepts a quantity below sellable stock without changing inventory', () => {
  const products = [product()];
  const before = structuredClone(products);
  assert.deepEqual(inventory.check(products, [{ id: 1, qty: 6 }]), { ok: true });
  assert.deepEqual(products, before);
});

test('check accepts a quantity equal to sellable stock', () => {
  const products = [product()];
  assert.deepEqual(inventory.check(products, [{ id: 1, qty: 7 }]), { ok: true });
});

test('check rejects a quantity above sellable stock', () => {
  const products = [product()];
  assert.deepEqual(inventory.check(products, [{ id: 1, qty: 8 }]), {
    ok: false,
    msg: 'Test product is out of stock (7 sellable available)'
  });
});

for (const example of [
  { name: 'A2 Gir Cow Ghee', sku: 'DRY-001', stock: 1, reserved: 0 },
  { name: 'Byadgi Chilli Powder', sku: 'SPC-001', stock: 4, reserved: 3 }
]) {
  test(`${example.sku} can sell its last sellable unit`, () => {
    const products = [product({ ...example })];
    const before = structuredClone(products);
    assert.equal(inventory.getSellableStock(products[0]), 1);
    assert.deepEqual(inventory.check(products, [{ id: 1, qty: 1 }]), { ok: true });
    assert.deepEqual(products, before);
  });
}

test('check rejects positive quantities when sellable stock is zero', () => {
  const products = [product({ stock: 3, reserved: 3 })];
  assert.deepEqual(inventory.check(products, [{ id: 1, qty: 1 }]), {
    ok: false,
    msg: 'Test product is out of stock (0 sellable available)'
  });
});

test('check rejects an unknown product', () => {
  assert.deepEqual(inventory.check([product()], [{ id: 99, qty: 1 }]), {
    ok: false,
    msg: 'Unknown product 99'
  });
});

test('reserve deducts physical stock for each item, preserving reservations and unrelated products', () => {
  const products = [product(), product({ id: 2, stock: 8, reserved: 2 }), product({ id: 3 })];
  const items = [{ id: 1, qty: 2 }, { id: 2, qty: '3' }];
  const beforeItems = structuredClone(items);
  const unrelated = structuredClone(products[2]);
  inventory.reserve(products, items);
  assert.equal(products[0].stock, 8);
  assert.equal(products[0].reserved, 3);
  assert.equal(products[1].stock, 5);
  assert.equal(products[1].reserved, 2);
  assert.deepEqual(products[2], unrelated);
  assert.deepEqual(items, beforeItems);
});

test('reserve skips unknown products', () => {
  const products = [product()];
  const before = structuredClone(products);
  inventory.reserve(products, [{ id: 99, qty: 2 }]);
  assert.deepEqual(products, before);
});

test('release restores physical stock for order items identified by id without changing reservations', () => {
  const products = [product()];
  inventory.release(products, [{ id: 1, qty: 2 }]);
  assert.deepEqual(products, [product({ stock: 12 })]);
});

test('release ignores items with only productId and preserves wholesale reservations', () => {
  const products = [product()];
  const items = [{ productId: 1, qty: 2 }];
  inventory.release(products, items);
  assert.equal(products[0].stock, 10);
  assert.equal(products[0].reserved, 3);
  assert.deepEqual(items, [{ productId: 1, qty: 2 }]);
});

test('release preserves wholesale reservations even when the returned quantity exceeds them', () => {
  const products = [product({ reserved: 1 })];
  inventory.release(products, [{ id: 1, qty: 3 }]);
  assert.equal(products[0].reserved, 1);
  assert.equal(products[0].stock, 13);
});

test('release skips unknown id items', () => {
  const products = [product()];
  const before = structuredClone(products);
  inventory.release(products, [{ id: 99, qty: 2 }]);
  assert.deepEqual(products, before);
});

test('reserve followed by release restores order-item stock and preserves reservations', () => {
  const products = [product()];
  const items = [{ id: 1, qty: 2 }];
  inventory.reserve(products, items);
  inventory.release(products, items);
  assert.equal(products[0].stock, 10);
  assert.equal(products[0].reserved, 3);
});

test('release uses id rather than a conflicting productId and leaves unrelated products unchanged', () => {
  const products = [product(), product({ id: 2, stock: 8, reserved: 2 })];
  const items = [{ id: 1, productId: 2, qty: '2' }];
  inventory.release(products, items);
  assert.deepEqual(products, [product({ stock: 12 }), product({ id: 2, stock: 8, reserved: 2 })]);
  assert.deepEqual(items, [{ id: 1, productId: 2, qty: '2' }]);
});
