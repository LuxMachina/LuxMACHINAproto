import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button, ConfidenceMark, Index, money, Pill, Plate, WarningStrip, buttonClass } from "@/components/lux/ui";
import { designQuote, leversFor, priceWithLevers, suggestLevers } from "@/lib/lux/engine";
import { useLux } from "@/lib/lux/store";
import type { ModuleDesign } from "@/lib/lux/types";
import { cn } from "@/lib/cn";

export function DesignResult({ design }: { design: ModuleDesign }) {
  const stored = useLux((state) => state.draft);
  const setDraft = useLux((state) => state.setDraft);
  const addDraftToSystem = useLux((state) => state.addDraftToSystem);
  const live = stored?.id === design.id ? stored : design;
  const [added, setAdded] = useState<"idle" | "fit" | "overflow">("idle");
  const [target, setTarget] = useState(live.costTarget ?? Math.round((live.tiers.find((tier) => tier.id === live.selectedTier)?.estimatedCost ?? 80) * 0.7));
  const quote = designQuote(live);
  const suggestion = useMemo(
    () => suggestLevers(quote.tier.estimatedCost, quote.levers, target),
    [quote.tier.estimatedCost, quote.levers, target],
  );

  function applySuggestion() {
    setDraft({ ...live, leverIds: suggestion.selected, costTarget: target });
  }

  function toggle(id: string) {
    const next = live.leverIds.includes(id) ? live.leverIds.filter((item) => item !== id) : [...live.leverIds, id];
    setDraft({ ...live, leverIds: next, costTarget: target });
  }

  return (
    <div className="rise-in flex flex-col gap-8">
      <WarningStrip>
        UNVERIFIED CIRCUIT — DEMO ENGINE. This is a structured concept, not a schematic, not a safe build, and not a quote.
      </WarningStrip>

      <Plate className="p-4 sm:p-6">
        <Index n="SPEC" label={live.name} />
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">{live.spec.functionLabel}</h2>
        <p className="mt-2 max-w-2xl text-muted">{live.prompt}</p>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <Spec label="FUNCTION" value={live.spec.functionLabel} confidence={live.spec.confidence.function} />
          <Spec label="HP" value={`${live.spec.hp}HP`} confidence={live.spec.confidence.hp} />
          <Spec label="INPUTS" value={live.spec.inputs.join(" · ") || "—"} confidence={live.spec.confidence.inputs} />
          <Spec label="OUTPUTS" value={live.spec.outputs.join(" · ") || "—"} confidence={live.spec.confidence.outputs} />
          <Spec label="CONTROLS" value={live.spec.controls.join(" · ") || "—"} confidence={live.spec.confidence.controls} />
          <Spec
            label="POWER"
            value={`+12V ${live.spec.power.p12}mA · −12V ${live.spec.power.n12}mA · +5V ${live.spec.power.p5}mA`}
            confidence={live.spec.confidence.power}
          />
          <Spec label="CHARACTER" value={live.spec.character.join(" · ")} confidence={live.spec.confidence.character} />
          <Spec
            label="BUDGET"
            value={live.spec.budget != null ? money(live.spec.budget) : "Not stated"}
            confidence={live.spec.confidence.budget}
          />
          <Spec label="COMPONENT COST" value="See tiers" confidence={live.spec.confidence.componentCost} />
          <Spec label="CIRCUIT ARCHITECTURE" value="Planning model only" confidence={live.spec.confidence.architecture} />
        </dl>
        <ul className="mt-4 space-y-1 text-sm text-muted">
          {live.spec.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </Plate>

      <div>
        <Index n="03" label="THREE BUILDS" />
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {live.tiers.map((tier) => {
            const selected = live.selectedTier === tier.id;
            const adjusted = selected ? quote.newCost : tier.estimatedCost;
            return (
              <article
                key={tier.id}
                className={cn(
                  "flex flex-col border bg-surface p-4",
                  tier.id === "standard" ? "border-accent lg:-mt-3 lg:mb-3" : "border-line",
                  selected && "outline outline-2 outline-accent",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-mono text-sm tracking-widest">{tier.name}</h3>
                  {tier.id === "standard" ? <Pill tone="accent">RECOMMENDED</Pill> : null}
                </div>
                <p className="mt-2 text-lg">{tier.tagline}</p>
                <p className="mt-4 font-mono text-3xl tabular-nums text-accent">{money(adjusted)}</p>
                {selected && quote.savings > 0 ? (
                  <p className="text-xs text-muted">Was {money(tier.estimatedCost)} before cuts. ESTIMATED.</p>
                ) : (
                  <p className="text-xs text-muted">Estimated parts, PCB, and panel. Shipping extra.</p>
                )}
                <dl className="mt-4 space-y-2 text-sm">
                  <Row k="HP" v={`${tier.hp}HP`} />
                  <Row k="POWER" v={`+${tier.power.p12} / −${tier.power.n12} / +5 ${tier.power.p5} mA`} />
                  <Row k="PARTS" v={String(tier.componentCount)} />
                  <Row k="DIFFICULTY" v={tier.difficulty} />
                  <Row k="TIME" v={tier.buildTime} />
                </dl>
                <p className="mt-4 text-sm leading-relaxed">{tier.architecture}</p>
                <List title={tier.id === "economy" ? "COMPROMISES" : tier.id === "luxury" ? "PERFORMANCE" : "ADVANTAGES"} items={tier.id === "economy" ? tier.compromises : tier.id === "luxury" ? tier.performance : tier.advantages} />
                {tier.id !== "economy" ? <List title="COMPROMISES" items={tier.compromises} /> : null}
                {tier.id === "luxury" ? <List title="UPGRADEABILITY" items={tier.upgradeability} /> : null}
                {live.spec.budget != null && tier.estimatedCost > live.spec.budget ? (
                  <p className="mt-3 text-sm text-accent">Above the stated {money(live.spec.budget)} budget.</p>
                ) : null}
                <Button className="mt-4 w-full" variant={selected ? "primary" : "secondary"} onClick={() => setDraft({ ...live, selectedTier: tier.id })}>
                  {selected ? "SELECTED" : `SELECT ${tier.name}`}
                </Button>
              </article>
            );
          })}
        </div>
      </div>

      <Plate className="p-4 sm:p-6" id="cheaper">
        <Index n="COST" label="MAKE IT CHEAPER" />
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Cheaper is not magic. Every cut names the part that changed and what you give up. Cuts apply to the selected tier, {quote.tier.name}.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-[12rem_1fr] sm:items-end">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-mono text-xs tracking-widest text-muted uppercase">Target</span>
            <span className="flex min-h-11 items-center border border-line bg-bg px-3">
              $
              <input
                className="w-full bg-transparent tabular-nums outline-none"
                inputMode="numeric"
                aria-label="Target cost"
                value={target}
                onChange={(event) => setTarget(Number(event.target.value.replace(/[^\d]/g, "")) || 0)}
              />
            </span>
          </label>
          <Button onClick={applySuggestion}>SUGGEST CUTS</Button>
        </div>
        <p className="mt-4 font-mono text-sm tabular-nums">
          Current estimated cost {money(quote.tier.estimatedCost)} · New estimated cost {money(quote.newCost)} · Saved {money(quote.savings)}
        </p>
        {!suggestion.reached ? (
          <p className="mt-2 text-sm text-muted">
            A honest floor for this tier is about {money(suggestion.floor)}. The target may sit below parts, PCB, and panel.
          </p>
        ) : null}
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {leversFor(design, live.selectedTier).map((lever) => {
            const on = live.leverIds.includes(lever.id);
            const preview = priceWithLevers(
              quote.tier.estimatedCost,
              quote.levers,
              on ? live.leverIds.filter((item) => item !== lever.id) : [...live.leverIds, lever.id],
            );
            return (
              <li key={lever.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium">{lever.change}</p>
                  <p className="text-sm text-muted">{lever.tradeoff}</p>
                  <p className="mt-1 font-mono text-xs text-accent">Save {money(lever.save)} · would land at {money(preview.newCost)}</p>
                </div>
                <Button variant={on ? "primary" : "secondary"} aria-pressed={on} onClick={() => toggle(lever.id)}>
                  {on ? "APPLIED" : "APPLY"}
                </Button>
              </li>
            );
          })}
        </ul>
      </Plate>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="primary"
          onClick={() => {
            setDraft(live);
            const result = addDraftToSystem();
            setAdded(result?.overflow ? "overflow" : "fit");
          }}
        >
          ADD TO SYSTEM
        </Button>
        <Link to="/build" className={buttonClass()}>
          BUILD THIS
        </Link>
      </div>
      {added !== "idle" ? (
        <WarningStrip>
          MODULE ADDED. {live.name} is in the rack
          {added === "overflow" ? ", and the row does not have enough HP. The system lab will flag it." : "."}{" "}
          <Link to="/system" className="underline">
            VIEW SYSTEM
          </Link>
        </WarningStrip>
      ) : null}
    </div>
  );
}

function Spec({ label, value, confidence }: { label: string; value: string; confidence: ModuleDesign["spec"]["confidence"]["function"] }) {
  return (
    <div className="border-t border-line pt-3">
      <dt className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs tracking-widest text-muted">{label}</span>
        <ConfidenceMark value={confidence} />
      </dt>
      <dd className="mt-1 text-sm leading-relaxed">{value}</dd>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line pb-1 font-mono text-xs">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right tabular-nums">{v}</dd>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-4">
      <p className="font-mono text-xs tracking-widest text-muted">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-relaxed">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
