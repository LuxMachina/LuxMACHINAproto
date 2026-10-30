# Lux Machina

Turn ideas into machines.

Lux Machina is an engineering, design, and commerce interface for people who build electronic instruments — Eurorack modules, DIY synthesizers, and experimental hardware. A person describes a machine in ordinary language. The product turns that into a structured specification, three implementation tiers, a virtual Eurorack system, and a bill of materials.

It is not a chatbot with a Eurorack theme. The long-term workflow is:

idea → specification → architecture → components → BOM → PCB → panel → manufacturing → assembly → purchase → build → community → remix → new design.

## What this MVP does

A visitor can, without an account:

1. Describe a module in Module Lab.
2. See a structured interpretation with confidence labels.
3. Compare Economy, Standard, and Luxury.
4. Cut cost with named tradeoffs (Make It Cheaper).
5. Add the module to a virtual rack.
6. See HP, power, and budget update, with warnings when a limit breaks.
7. Reorder, duplicate, move, and remove modules.
8. Generate a system from a budget and a musical brief.
9. Optimize that system and read what changed.
10. Open a BOM, a landed-cost range, a difficulty rating, and a prototype build sequence.
11. Clone a sample system, keep a local profile, and export or import project JSON.

The seeded example is an 8HP filthy analog oscillator for industrial music, under $100.

## What this MVP does not do

Nothing here is electrically validated. Prices are estimates. The component list is a small demo database, not distributor stock. Commerce is not connected: **Proceed to Build does not order, charge, or manufacture anything.** Community posts are editorial samples, not live user activity. There are no fake reviews and no fake inventory.

Every technical claim in the interface is marked, in substance, as one of: estimated, calculated, demo data, unverified, user-supplied, or verified. Generated circuits are planning models.

## Stack

TanStack Start, React, Tailwind CSS, Zustand. Projects persist in `localStorage` under `lux-machina-v1`. There is no account and no application database yet. That is deliberate: a first-time visitor should be able to finish the loop.

## Architecture

| Area | Where |
| --- | --- |
| UI | `src/routes`, `src/components/lux` |
| State | `src/lib/lux/store.ts` |
| Demo catalog | `src/lib/lux/catalog.ts` |
| Design logic | `src/lib/lux/engine.ts` |
| BOM and cost | `src/lib/lux/bom.ts` |
| Types | `src/lib/lux/types.ts` |

The AI boundary is a set of plain functions, not prompts buried in components:

- `interpretPrompt()`
- `generateModuleDesign()`
- `generateTierOptions()`
- `optimizeCost` via `leversFor()`, `suggestLevers()`, `priceWithLevers()`
- `generateSystem()`
- `generateBOM()`
- `optimizeSystem()`

The current engine is deterministic. It matches language to functions, features, HP, budget, and character, then prices a tier from seeded rules. Swap the bodies of those functions for a model call later. Keep the return types. Do not move that logic back into the pages.

## Data model

The TypeScript types are the contract a later Postgres/Supabase schema should follow. Demo rows are unowned and local. A real backend should add accounts before any of this is shared between people.

Planned entities:

- Users, Profiles
- Projects, Systems, System Rows, System Modules
- Modules, Module Versions, Module Specs
- Components, Component Alternatives
- Suppliers, Supplier Products, Supplier Prices
- BOMs, BOM Items
- PCBs, Panels
- Build Guides, Build Steps
- Orders, Order Items
- Creators, Creator Products
- Community Posts, Comments, Likes, Saved Projects

`SystemProject`, `RackModule`, `ModuleDesign`, `BomItem`, and the catalog types are the MVP slice of that model. `localStorage` can be replaced by mapping those objects to tables. Keep writes scoped to the signed-in user once accounts exist.

## Replacing the demo engine with a model

1. Keep `interpretPrompt` and its neighbors as the only callers.
2. Send the raw prompt plus the catalog (functions, HP limits, known parts) to the model.
3. Validate the JSON against the existing types. Reject anything that does not name a function, an HP, a power estimate, three tiers, and an explicit unverified flag.
4. Never let the model emit a price without a `confidence` of `ESTIMATED` unless a supplier API returned it.
5. Keep Make It Cheaper as a diff of parts, not a single lower number.

## Connecting a database

Add tables for the entities above. Store systems and designs per user. Leave the demo catalog in version control until a real parts database exists, and keep serving it as clearly labeled demo data. Do not point the UI at unverified rows and call them stock.

## Commerce, later

Lux Machina should make money when something physical changes hands, not by charging people to think. Intended sources, none of which are implemented:

- Component, kit, PCB, and panel margin
- Complete modules
- Manufacturing and assembly fees
- Marketplace commission and creator revenue share
- Affiliate supply
- Fulfillment and premium or custom builds
- Enterprise tools

`PROCEED TO BUILD` is the seam. It currently stops and lists the integrations that are not connected: suppliers, PCB houses, panel houses, payment, shipping, inventory, fulfillment. Wire those behind that action. Do not fake a checkout in front of them.

A creator marketplace can later accept a schematic, PCB, gerbers, panel, BOM, firmware, and a build guide; then validate, cost, price, list, manufacture, fulfill, and split revenue. That is a platform. This repository does not do it yet.

## Cost optimization

Make It Cheaper is the part worth defending. Every dollar removed has to name a part and a tradeoff: noise, tolerance, feel, serviceability, or a deleted function. The floor is the honest cost of the remaining object. A target below that floor is a different machine, and the UI should say so.

## Roadmap

1. Real model behind the same service functions, with the unverified rule intact.
2. Accounts and a database for projects.
3. Supplier price feeds, still labeled when they are cached or missing.
4. PCB and panel handoff.
5. Creator submissions and a real marketplace.
6. Orders, only after payment and manufacturing are actually connected.

## Running

No API keys, accounts, or database are required.

```bash
npm install
npm run dev
```

Open [http://localhost:8080](http://localhost:8080). Start in Module Lab, or use the seeded prompt on the home page: a filthy 8HP analog oscillator for industrial music, with FM, hard sync, a sub oscillator, and wavefolding, under $100.

Projects stay in the browser under the `localStorage` key `lux-machina-v1`. Export and import JSON from the profile page if you want a copy outside the browser.

```bash
npm test
npm run typecheck
npm run build
```

## Secrets

This repository does not contain `.env` files, API keys, passwords, or tokens. `.env.example` lists optional variable names only. If you add credentials later, keep them in an untracked `.env`.
