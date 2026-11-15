const test = require('node:test');
const assert = require('node:assert/strict');
const inventory = require('../lib/inventory');
const orders = require('../lib/orders');

// Synthetic pending order, using the ticket's ID; not a copy of stored data.
function fixture(status = 'pending') {
  return {
    products: [
      { id: 1, name: 'Test product A', stock: 8, reserved: 2 },
      { id: 2, name: 'Test product B', stock: 4, reserved: 1 }
    ],
    orders: [{
      id: 1007,
      status,
      paymentMode: 'cash',
      items: [{ id: 1, qty: 2 }, { id: 2, qty: 1 }]
    }]
  };
}

test('cancelling a pending order calls the real inventory.release with its products and items', (t) => {
  const db = fixture();
  // A call-through spy: retain the real release behaviour; restore after this test.
  const release = t.mock.method(inventory, 'release');
  const order = db.orders[0];
  const result = orders.cancel(db, '1007', 'Ticket #2 characterization');

  assert.equal(release.mock.calls.length, 1);
  assert.equal(release.mock.calls[0].arguments[0], db.products);
  assert.equal(release.mock.calls[0].arguments[1], order.items);
  assert.equal(result.ok, true);
  assert.equal(result.order, order);
  assert.equal(order.status, 'cancelled');
  assert.equal(order.cancelReason, 'Ticket #2 characterization');
  assert.match(order.cancelledAt, /^\d{2}\/\d{2}\/\d{4}$/);
});

test('cancelling pending order #1007 restores physical stock and preserves reservations', () => {
  const db = fixture();
  const beforeProducts = structuredClone(db.products);
  const beforeItems = structuredClone(db.orders[0].items);

  const result = orders.cancel(db, 1007);

  assert.equal(result.ok, true);
  assert.equal(db.orders[0].status, 'cancelled');
  assert.equal(db.orders[0].cancelReason, 'Cancelled by operator');
  assert.deepEqual(db.products, beforeProducts.map(product => ({
    ...product,
    stock: product.stock + beforeItems
      .filter(item => item.id === product.id)
      .reduce((quantity, item) => quantity + item.qty, 0)
  })));
  assert.deepEqual(db.orders[0].items, beforeItems);
});

test('cancelling a missing order does not call inventory.release or mutate the fixture', (t) => {
  const db = fixture();
  const before = structuredClone(db);
  const release = t.mock.method(inventory, 'release');

  assert.deepEqual(orders.cancel(db, 9999), { ok: false, error: 'Order not found' });
  assert.equal(release.mock.calls.length, 0);
  assert.deepEqual(db, before);
});

test('cancelling an already cancelled order does not call inventory.release or mutate the fixture', (t) => {
  const db = fixture('cancelled');
  const before = structuredClone(db);
  const release = t.mock.method(inventory, 'release');

  assert.deepEqual(orders.cancel(db, 1007), {
    ok: false,
    error: 'Order #1007 is already cancelled'
  });
  assert.equal(release.mock.calls.length, 0);
  assert.deepEqual(db, before);
});

test('a repeated cancellation calls inventory.release only on the first attempt', (t) => {
  const db = fixture();
  const release = t.mock.method(inventory, 'release');

  assert.equal(orders.cancel(db, 1007).ok, true);
  const afterFirstCancellation = structuredClone(db.products);
  assert.equal(db.products[0].stock, 10);
  assert.equal(db.products[1].stock, 5);
  assert.deepEqual(orders.cancel(db, 1007), {
    ok: false,
    error: 'Order #1007 is already cancelled'
  });
  assert.equal(release.mock.calls.length, 1);
  assert.deepEqual(db.products, afterFirstCancellation);
});
