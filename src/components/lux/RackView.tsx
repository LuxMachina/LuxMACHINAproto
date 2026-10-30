import { useEffect, useState } from "react";
import { ModuleFace } from "@/components/lux/ModuleFace";
import { Button, money, WarningStrip } from "@/components/lux/ui";
import { systemStats } from "@/lib/lux/engine";
import { useLux } from "@/lib/lux/store";
import type { SystemProject } from "@/lib/lux/types";

export function RackView({ system }: { system: SystemProject }) {
  const removeModule = useLux((state) => state.removeModule);
  const duplicateModule = useLux((state) => state.duplicateModule);
  const moveModule = useLux((state) => state.moveModule);
  const moveModuleRow = useLux((state) => state.moveModuleRow);
  const reorderDrag = useLux((state) => state.reorderDrag);
  const renameModule = useLux((state) => state.renameModule);
  const [selected, setSelected] = useState<string | null>(null);
  const [unit, setUnit] = useState(10);
  const stats = systemStats(system);
  const current = stats.modules.find((mod) => mod.instanceId === selected) ?? null;

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const apply = () => setUnit(query.matches ? 12 : 9);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!selected) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) return;
      if (event.key === "ArrowLeft") moveModule(selected, -1);
      if (event.key === "ArrowRight") moveModule(selected, 1);
      if (event.key === "ArrowUp") moveModuleRow(selected, -1);
      if (event.key === "ArrowDown") moveModuleRow(selected, 1);
      if (event.key === "Delete" || event.key === "Backspace") removeModule(selected);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, moveModule, moveModuleRow, removeModule]);

  return (
    <div className="flex flex-col gap-4">
      {stats.warnings.map((warning) => (
        <WarningStrip key={warning}>{warning}</WarningStrip>
      ))}
      <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4 lg:grid-cols-7">
        <Metric k="TOTAL HP" v={String(stats.totalHp)} />
        <Metric k="USED HP" v={String(stats.usedHp)} />
        <Metric k="REMAINING" v={String(stats.remainingHp)} />
        <Metric k="+12V" v={`${stats.power.p12}/${system.case.powerP12}`} />
        <Metric k="−12V" v={`${stats.power.n12}/${system.case.powerN12}`} />
        <Metric k="COST" v={money(stats.cost)} />
        <Metric k="BUDGET" v={money(system.case.budget)} />
      </div>
      {!stats.modules.length ? (
        <div className="border border-dashed border-line px-4 py-16 text-center">
          <p className="font-mono text-xs tracking-widest text-accent">NO MODULES</p>
          <p className="mt-2 text-muted">The case is empty. Describe a module, or load a sample system.</p>
        </div>
      ) : null}
      <div className="border border-line bg-bg p-3 sm:p-4">
        <div className="mb-2 flex items-center justify-between font-mono text-xs text-muted">
          <span>RAIL</span>
          <span>+12 / −12 / +5 ESTIMATED</span>
        </div>
        <div className="flex flex-col gap-4">
          {system.rows.map((row, rowIndex) => {
            const used = stats.usedByRow[rowIndex] ?? 0;
            return (
              <div key={rowIndex}>
                <div className="mb-1 flex justify-between font-mono text-xs text-muted">
                  <span>ROW {rowIndex + 1}</span>
                  <span className="tabular-nums">
                    {used}/{system.case.hpPerRow} HP
                  </span>
                </div>
                <div className="overflow-x-auto border border-line bg-surface">
                  <div className="relative" style={{ width: system.case.hpPerRow * unit }}>
                    <div className="flex h-4 border-b border-line" aria-hidden>
                      {Array.from({ length: system.case.hpPerRow / 4 + 1 }, (_, mark) => (
                        <span
                          key={mark}
                          className="absolute top-0 border-l border-line pl-1 font-mono text-xs text-muted"
                          style={{ left: mark * 4 * unit }}
                        >
                          {mark * 4}
                        </span>
                      ))}
                    </div>
                    <div
                      className="flex min-h-72 md:min-h-96"
                      onDragOver={(event) => event.preventDefault()}
                    >
                      {row.map((mod) => (
                        <div
                          key={mod.instanceId}
                          draggable
                          onDragStart={(event) => event.dataTransfer.setData("text/plain", mod.instanceId)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            event.preventDefault();
                            const id = event.dataTransfer.getData("text/plain");
                            if (id) reorderDrag(id, mod.instanceId);
                          }}
                        >
                          <ModuleFace
                            mod={mod}
                            unit={unit}
                            selected={selected === mod.instanceId}
                            onSelect={() => setSelected(mod.instanceId)}
                          />
                        </div>
                      ))}
                      {!row.length ? <div className="h-72 w-full md:h-96" /> : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {current ? (
        <div className="border border-line bg-surface p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <label className="font-mono text-xs tracking-widest text-muted" htmlFor="mod-name">
                MODULE
              </label>
              <input
                id="mod-name"
                className="mt-1 w-full border border-line bg-bg px-3 py-2 text-lg font-semibold"
                value={current.name}
                onChange={(event) => renameModule(current.instanceId, event.target.value)}
              />
              <p className="mt-2 text-sm text-muted">
                {current.functionLabel} · {current.tier} · {money(current.cost)} · {current.difficulty} · {current.hp}HP
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button aria-label="Move left" onClick={() => moveModule(current.instanceId, -1)}>
                LEFT
              </Button>
              <Button aria-label="Move right" onClick={() => moveModule(current.instanceId, 1)}>
                RIGHT
              </Button>
              <Button aria-label="Move to previous row" onClick={() => moveModuleRow(current.instanceId, -1)}>
                ROW UP
              </Button>
              <Button aria-label="Move to next row" onClick={() => moveModuleRow(current.instanceId, 1)}>
                ROW DOWN
              </Button>
              <Button onClick={() => duplicateModule(current.instanceId)}>DUPLICATE</Button>
              <Button onClick={() => removeModule(current.instanceId)}>REMOVE</Button>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed">{current.architecture}</p>
          {current.adjustments.length ? (
            <ul className="mt-3 list-disc pl-4 text-sm text-muted">
              {current.adjustments.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          <p className="mt-3 font-mono text-xs text-muted">Arrow keys move the selected module. Backspace removes it.</p>
        </div>
      ) : stats.modules.length ? (
        <p className="text-sm text-muted">Select a module to inspect, rename, reorder, or remove it. Drag also reorders.</p>
      ) : null}
    </div>
  );
}

function Metric({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-surface px-3 py-3">
      <p className="font-mono text-xs tracking-widest text-muted">{k}</p>
      <p className="mt-1 font-mono text-sm tabular-nums">{v}</p>
    </div>
  );
}
