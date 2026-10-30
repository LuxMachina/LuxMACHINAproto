import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button, Index, moneyExact, Plate, WarningStrip } from "@/components/lux/ui";
import { COMPARISONS, COMPONENTS, LISTINGS, MARKET_CATEGORIES, getModule } from "@/lib/lux/catalog";
import { useLux } from "@/lib/lux/store";

export const Route = createFileRoute("/market")({ component: MarketPage });

function MarketPage() {
  const [category, setCategory] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const wishlist = useLux((state) => state.wishlist);
  const toggleWish = useLux((state) => state.toggleWish);
  const favorites = useLux((state) => state.favorites);
  const toggleFavorite = useLux((state) => state.toggleFavorite);
  const [open, setOpen] = useState<string | null>(null);

  const listings = useMemo(() => {
    return LISTINGS.filter((item) => (category === "ALL" ? true : item.category === category)).filter((item) =>
      `${item.name} ${item.blurb}`.toLowerCase().includes(query.trim().toLowerCase()),
    );
  }, [category, query]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Index n="MARKET" label="WHERE A BUILD COULD BE BOUGHT" />
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Demo shelves. Nothing is for sale.</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Listings are seeded so the shape of a marketplace is visible. Prices are not live. Stock is not real. Checkout does not exist.
      </p>
      <WarningStrip>DEMO DATA — commerce not connected. Do not treat these as products you can order.</WarningStrip>
      <div className="mt-6 flex flex-col gap-3">
        <label className="block">
          <span className="sr-only">Search listings</span>
          <input
            className="min-h-11 w-full border border-line bg-bg px-3"
            placeholder="Search the demo catalog"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Button variant={category === "ALL" ? "primary" : "secondary"} onClick={() => setCategory("ALL")}>
            ALL
          </Button>
          {MARKET_CATEGORIES.map((item) => (
            <Button key={item} variant={category === item ? "primary" : "secondary"} onClick={() => setCategory(item)}>
              {item}
            </Button>
          ))}
        </div>
      </div>
      {!listings.length ? (
        <p className="mt-8 border border-dashed border-line px-4 py-10 text-center text-muted">No demo listings match that search.</p>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {listings.map((item) => {
            const module = item.moduleId ? getModule(item.moduleId) : null;
            return (
              <li key={item.id}>
                <Plate className="flex h-full flex-col p-4">
                  <p className="font-mono text-xs tracking-widest text-accent">{item.category} · DEMO LISTING</p>
                  <h2 className="mt-2 text-xl font-semibold">{item.name}</h2>
                  <p className="mt-1 font-mono text-lg tabular-nums">{item.price === 0 ? "NO PRICE" : moneyExact(item.price)} estimated</p>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{item.blurb}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
                    <div>Designer: {item.designer}</div>
                    <div>Difficulty: {item.difficulty ?? "—"}</div>
                    <div>HP: {item.hp ?? "—"}</div>
                    <div>Power: {item.power ?? "—"}</div>
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={() => setOpen(open === item.id ? null : item.id)}>{open === item.id ? "HIDE" : "DETAILS"}</Button>
                    <Button variant={wishlist.includes(item.id) ? "primary" : "secondary"} onClick={() => toggleWish(item.id)}>
                      {wishlist.includes(item.id) ? "ON WISHLIST" : "WISHLIST"}
                    </Button>
                    {module ? (
                      <Button variant={favorites.includes(module.id) ? "primary" : "secondary"} onClick={() => toggleFavorite(module.id)}>
                        {favorites.includes(module.id) ? "FAVORITED" : "FAVORITE"}
                      </Button>
                    ) : null}
                  </div>
                  {open === item.id ? (
                    <dl className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
                      <div>Documentation: {item.docs}</div>
                      <div>PCB: {item.pcb}</div>
                      <div>Panel: {item.panel}</div>
                      <div>Kit: {item.kit}</div>
                      <div>Built module: {item.built}</div>
                      <div className="pt-2 text-accent">NOT PURCHASABLE</div>
                    </dl>
                  ) : null}
                </Plate>
              </li>
            );
          })}
        </ul>
      )}

      <section className="mt-12">
        <Index n="BENCH" label="SEEDED COMPONENTS" />
        <p className="mt-2 max-w-2xl text-sm text-muted">
          A small demonstration database. Not comprehensive. Not distributor stock. Equivalent parts are compared so a later optimizer has somewhere to land.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {COMPONENTS.map((part) => (
            <li key={part.id} className="border border-line bg-surface p-3">
              <p className="font-mono text-xs text-muted">{part.category} · DEMO DATA</p>
              <p className="font-medium">{part.name}</p>
              <p className="font-mono tabular-nums">{moneyExact(part.unitCost)}</p>
              <p className="text-sm text-muted">{part.note}</p>
            </li>
          ))}
        </ul>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {COMPARISONS.map((pair) => {
            const a = COMPONENTS.find((part) => part.id === pair.a);
            const b = COMPONENTS.find((part) => part.id === pair.b);
            if (!a || !b) return null;
            return (
              <Plate key={pair.id} className="p-4">
                <p className="font-mono text-xs tracking-widest text-accent">{pair.role}</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted">COMPONENT A</p>
                    <p>{a.name}</p>
                    <p className="font-mono tabular-nums">{moneyExact(a.unitCost)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">COMPONENT B</p>
                    <p>{b.name}</p>
                    <p className="font-mono tabular-nums">{moneyExact(b.unitCost)}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm">Difference {pair.difference}</p>
                <p className="mt-1 text-sm text-muted">Tradeoffs: {pair.tradeoffs.join(" · ")}</p>
              </Plate>
            );
          })}
        </div>
      </section>
    </main>
  );
}
