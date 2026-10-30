import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button, Index, money, moneyExact, Plate, WarningStrip, buttonClass } from "@/components/lux/ui";
import { BUILD_STEPS, explainDifficulty, generateBOM, summarizeCost } from "@/lib/lux/bom";
import { activeSystem, useLux } from "@/lib/lux/store";
import { BOM_CATEGORIES } from "@/lib/lux/types";

const FUTURE = [
  "Component suppliers",
  "PCB manufacturers",
  "Panel manufacturers",
  "Fulfillment",
  "Payment processing",
  "Shipping",
  "Inventory",
];

export const Route = createFileRoute("/build")({ component: BuildPage });

function BuildPage() {
  const system = useLux((state) => activeSystem(state));
  const markBuilt = useLux((state) => state.markBuilt);
  const [commerce, setCommerce] = useState(false);
  const [logged, setLogged] = useState(false);
  const modules = system?.rows.flat() ?? [];
  const bom = generateBOM(modules);
  const summary = summarizeCost(bom);
  const difficulty = explainDifficulty(modules);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Index n="BUILD" label="BUILD THIS MACHINE" />
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">The parts, the cost, the sequence.</h1>
      <p className="mt-3 max-w-2xl text-muted">
        {system ? system.name : "No system"}. This sheet is a prototype. It is not a purchase order and not a validated assembly manual.
      </p>

      {!modules.length ? (
        <Plate className="mt-8 p-8">
          <p className="font-mono text-xs tracking-widest text-accent">NOTHING TO BUILD</p>
          <p className="mt-2">Generate a module and add it to the rack first.</p>
          <Link to="/lab" className={buttonClass("primary", "mt-4")}>
            DESIGN A MODULE
          </Link>
        </Plate>
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          <WarningStrip>ESTIMATED / DEMO DATA / UNVERIFIED. Do not treat these parts or prices as safe to manufacture.</WarningStrip>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((mod) => (
              <Plate key={mod.instanceId} className="p-4">
                <p className="font-mono text-xs text-accent">{mod.tier}</p>
                <h2 className="text-xl font-semibold">{mod.name}</h2>
                <p className="text-sm text-muted">
                  {mod.hp}HP · {mod.functionLabel} · {money(mod.cost)}
                </p>
              </Plate>
            ))}
          </section>

          <section>
            <Index n="BOM" label="BILL OF MATERIALS" />
            <div className="mt-4 flex flex-col gap-6">
              {BOM_CATEGORIES.map((category) => {
                const rows = bom.filter((item) => item.category === category);
                if (!rows.length) return null;
                return (
                  <div key={category}>
                    <h2 className="font-mono text-xs tracking-widest text-muted">{category}</h2>
                    <ul className="mt-2 divide-y divide-line border-y border-line">
                      {rows.map((item) => (
                        <li key={item.id} className="grid gap-1 py-3 sm:grid-cols-[1.4fr_0.4fr_0.5fr_0.5fr_0.6fr]">
                          <div>
                            <p>{item.part}</p>
                            <p className="text-sm text-muted">Alternative: {item.alternative}</p>
                            <p className="text-xs text-muted">{item.moduleName}</p>
                          </div>
                          <p className="font-mono text-sm tabular-nums">Qty {item.quantity}</p>
                          <p className="font-mono text-sm tabular-nums">{moneyExact(item.unitCost)}</p>
                          <p className="font-mono text-sm tabular-nums">{moneyExact(item.total)}</p>
                          <p className="font-mono text-xs text-muted">{item.confidence}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Plate className="p-4">
              <Index n="COST" label="BREAKDOWN" />
              <dl className="mt-4 space-y-2 font-mono text-sm">
                <Cost k="Components" v={summary.components} />
                <Cost k="PCB" v={summary.pcb} />
                <Cost k="Panel" v={summary.panel} />
                <Cost k="Hardware" v={summary.hardware} />
                <Cost k="Build cost" v={summary.buildCost} />
                <Cost k="Shipping allowance" v={summary.shipping} />
                <Cost k="Estimated landed" v={summary.landed} />
              </dl>
              <p className="mt-4 text-sm">
                Assembly allowance {money(summary.assembly)}. {summary.assemblyNote}
              </p>
              <p className="mt-4 font-mono text-lg text-accent tabular-nums">
                {money(summary.low)}–{money(summary.high)} estimated landed cost
              </p>
              <p className="mt-1 text-xs text-muted">ESTIMATED LANDED COST. The range is uncertainty, not a supplier quote.</p>
            </Plate>
            <Plate className="p-4">
              <Index n="SKILL" label="BUILD DIFFICULTY" />
              <p className="mt-3 text-3xl font-semibold">{difficulty.level ?? "—"}</p>
              <ul className="mt-3 list-disc space-y-2 pl-4 text-sm leading-relaxed">
                {difficulty.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </Plate>
          </section>

          <section>
            <Index n="SEQUENCE" label="BUILD CHECKLIST" />
            <p className="mt-2 text-sm text-muted">Prototype steps. Not a verified procedure.</p>
            <ol className="mt-4 grid gap-3 md:grid-cols-2">
              {BUILD_STEPS.map((step) => (
                <li key={step.n} className="border border-line bg-surface p-4">
                  <p className="font-mono text-xs text-accent">{step.n}</p>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="primary" onClick={() => setCommerce(true)}>
              PROCEED TO BUILD
            </Button>
            <Button
              onClick={() => {
                markBuilt();
                setLogged(true);
              }}
            >
              {logged ? "LOGGED LOCALLY" : "LOG THIS BUILD"}
            </Button>
          </div>
          {commerce ? (
            <Plate className="p-4">
              <p className="font-mono text-xs tracking-widest text-accent">COMMERCE NOT YET CONNECTED</p>
              <p className="mt-2 text-lg">Nothing will be ordered, charged, manufactured, or shipped.</p>
              <p className="mt-2 text-sm text-muted">The sheet is ready for a later connection to:</p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {FUTURE.map((item) => (
                  <li key={item} className="border border-line px-3 py-2 text-sm">
                    {item} — NOT CONNECTED
                  </li>
                ))}
              </ul>
            </Plate>
          ) : null}
        </div>
      )}
    </main>
  );
}

function Cost({ k, v }: { k: string; v: number }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line pb-1">
      <dt className="text-muted">{k}</dt>
      <dd className="tabular-nums">{moneyExact(v)}</dd>
    </div>
  );
}
