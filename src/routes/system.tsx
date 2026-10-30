import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { RackView } from "@/components/lux/RackView";
import { SystemDesigner } from "@/components/lux/SystemDesigner";
import { Button, Field, Index, Plate, Select, TextInput, buttonClass } from "@/components/lux/ui";
import { COMMUNITY_POSTS } from "@/lib/lux/catalog";
import { OPTIMIZE_MODES } from "@/lib/lux/engine";
import { activeSystem, useLux } from "@/lib/lux/store";
import type { OptimizeChange } from "@/lib/lux/types";

export const Route = createFileRoute("/system")({
  validateSearch: (search: Record<string, unknown>): { mode?: "design" } =>
    search.mode === "design" ? { mode: "design" } : {},
  component: SystemPage,
});

function SystemPage() {
  const search = Route.useSearch();
  const system = useLux((state) => activeSystem(state));
  const updateCase = useLux((state) => state.updateCase);
  const renameSystem = useLux((state) => state.renameSystem);
  const newSystem = useLux((state) => state.newSystem);
  const applyOptimization = useLux((state) => state.applyOptimization);
  const loadPost = useLux((state) => state.loadPost);
  const [tab, setTab] = useState<"rack" | "design">(search.mode === "design" ? "design" : "rack");
  const [changes, setChanges] = useState<OptimizeChange[] | null>(null);
  const [saved, setSaved] = useState(false);

  if (!system) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16">
        <p>No system on the bench.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Index n="SYSTEM LAB" label="THE CASE" />
      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">A rack you can argue with.</h1>
          <p className="mt-2 max-w-xl text-muted">HP, power, and budget update when a module lands. Panels are drawings, not working circuits.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={tab === "rack" ? "primary" : "secondary"} onClick={() => setTab("rack")}>
            RACK
          </Button>
          <Button variant={tab === "design" ? "primary" : "secondary"} onClick={() => setTab("design")}>
            DESIGN A SYSTEM
          </Button>
        </div>
      </div>

      {tab === "design" ? (
        <div className="mt-8">
          <SystemDesigner mode="full" />
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          <Plate className="grid gap-4 p-4 md:grid-cols-4">
            <Field label="System name">
              <TextInput value={system.name} onChange={(event) => renameSystem(event.target.value)} />
            </Field>
            <Field label="Rows">
              <Select value={system.case.rows} onChange={(event) => updateCase({ rows: Number(event.target.value) })}>
                {[1, 2, 3].map((rows) => (
                  <option key={rows} value={rows}>
                    {rows}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="HP per row">
              <Select value={system.case.hpPerRow} onChange={(event) => updateCase({ hpPerRow: Number(event.target.value) })}>
                {[42, 60, 84, 104, 126].map((hp) => (
                  <option key={hp} value={hp}>
                    {hp}HP
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Budget">
              <TextInput
                inputMode="numeric"
                value={system.case.budget}
                onChange={(event) => updateCase({ budget: Number(event.target.value.replace(/[^\d]/g, "")) || 0 })}
              />
            </Field>
            <Field label="+12V mA">
              <TextInput
                inputMode="numeric"
                value={system.case.powerP12}
                onChange={(event) => updateCase({ powerP12: Number(event.target.value) || 0 })}
              />
            </Field>
            <Field label="−12V mA">
              <TextInput
                inputMode="numeric"
                value={system.case.powerN12}
                onChange={(event) => updateCase({ powerN12: Number(event.target.value) || 0 })}
              />
            </Field>
            <Field label="+5V mA">
              <TextInput
                inputMode="numeric"
                value={system.case.powerP5}
                onChange={(event) => updateCase({ powerP5: Number(event.target.value) || 0 })}
              />
            </Field>
            <div className="flex items-end">
              <Button
                className="w-full"
                onClick={() => {
                  setSaved(true);
                }}
              >
                {saved ? "SAVED LOCALLY" : "SAVE SYSTEM"}
              </Button>
            </div>
          </Plate>

          <RackView system={system} />

          <div className="flex flex-wrap gap-2">
            <Link to="/lab" className={buttonClass("primary")}>
              ADD MODULE
            </Link>
            <Link to="/build" className={buttonClass()}>
              BUILD THIS
            </Link>
            <Button onClick={newSystem}>NEW SYSTEM</Button>
            <Button
              onClick={() => {
                const sample = COMMUNITY_POSTS[0];
                if (sample) loadPost(sample);
              }}
            >
              LOAD SAMPLE RACK
            </Button>
          </div>

          <section id="optimize">
            <Index n="OPTIMIZE" label="CHANGE THE SYSTEM ON PURPOSE" />
            <div className="mt-4 flex flex-wrap gap-2">
              {OPTIMIZE_MODES.map((mode) => (
                <Button key={mode} onClick={() => setChanges(applyOptimization(mode))}>
                  {mode}
                </Button>
              ))}
            </div>
            {changes ? (
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {changes.map((change) => (
                  <li key={`${change.title}-${change.detail}`} className="py-3">
                    <p className="font-medium">{change.title}</p>
                    <p className="text-sm text-muted">{change.detail}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">Each pass explains what moved and what you gave up.</p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
