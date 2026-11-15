# ShopLedger

## Stack

- Node.js with CommonJS modules; Express `^4.17.1` and body-parser `^1.19.0` are declared in `package.json`.
- Plain HTML, CSS and browser JavaScript using XMLHttpRequest.
- Data is stored in `data/db.json`. `lib/store.js` synchronously reads and overwrites the whole file.
- No Node.js version is declared in `package.json`.

## Module map

- `server.js`: Express setup, static assets, API router mounting and printable invoice endpoint.
- `public/`: HTML interface, styles and browser-side cart/API logic.
- `routes/products.js`: product catalog and active coupon endpoints.
- `routes/orders.js`: order creation, listing, lookup and cancellation.
- `routes/customers.js`: customer balances and settlement recording.
- `routes/reports.js`: dashboard, GST reconciliation, pricing preview and admin export.
- `lib/pricing.js`, `lib/tax.js`, `lib/coupons.js`: checkout totals, tax rates and coupon rules.
- `lib/orders.js`, `lib/inventory.js`: order records and stock operations.
- `lib/ledger.js`: customer credit limits, billed totals, settlements and balances.
- `lib/invoice.js`: separate invoice calculations and printable HTML.
- `lib/reports.js`: dashboard summaries and invoice/order reconciliation.
- `lib/dates.js`: date formatting, filtering keys and fiscal-year labels.
- `lib/store.js`: JSON persistence, structure defaults and audit entries.
- `config.js`: port, shop details, admin key, tax, inventory and coupon settings.
- `data/db.json`: products, customers, orders, settlements, audit log and next IDs.
- `docs/architecture.svg`: architecture diagram and order-placement flow.

## Commands

Run commands from the repository root.

- `npm start` or `node server.js`: starts the app on `PORT`, defaulting to 3000.
- `npm test`: currently prints "Error: no test specified" and exits with status 1.
- `node --test`: runs the inventory and order-cancellation tests using Node.js's built-in test runner and fresh in-memory fixtures.
- No build or lint script is defined.

## Rules

- Write characterization tests before changing behaviour. Capture the existing behaviour before modifying it.
- Change only the module the ticket is about. Keep implementation changes and characterization tests scoped to that module.
- Tests must never read, write, reset or otherwise touch `data/db.json`. Use isolated in-memory fixtures or temporary test files instead; do not invoke the real store against that path.
- Add no dependencies, including development dependencies.
- Do not commit `package-lock.json`.
