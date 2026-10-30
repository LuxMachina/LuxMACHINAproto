import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ModuleFace } from "@/components/lux/ModuleFace";
import { Button, Field, Index, money, Plate, Select, TextArea, TextInput, WarningStrip } from "@/components/lux/ui";
import { STYLE_PRESETS } from "@/lib/lux/catalog";
import { defaultRequest, generateSystem } from "@/lib/lux/engine";
import { useLux } from "@/lib/lux/store";
import type { Experience, StyleId, SystemProposal, SystemRequest } from "@/lib/lux/types";

export function SystemDesigner({
  mode = "full",
  initial,
}: {
  mode?: "full" | "budget";
  initial?: Partial<SystemRequest>;
}) {
  const navigate = useNavigate();
  const loadProposal = useLux((state) => state.loadProposal);
  const [form, setForm] = useState<SystemRequest>(defaultRequest(initial));
  const [proposal, setProposal] = useState<SystemProposal | null>(null);
  const [working, setWorking] = useState(false);

  function patch(partial: Partial<SystemRequest>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  function run(next = form) {
    setWorking(true);
    window.setTimeout(() => {
      setProposal(generateSystem(next));
      setWorking(false);
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 600);
  }

  return (
    <div className="flex flex-col gap-6">
      {mode === "budget" ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Budget">
            <TextInput
              inputMode="numeric"
              aria-label="Budget"
              value={form.budget}
              onChange={(event) => patch({ budget: Number(event.target.value.replace(/[^\d]/g, "")) || 0 })}
            />
          </Field>
          <Field label="Style">
            <Select value={form.style} aria-label="Style" onChange={(event) => patch({ style: event.target.value as StyleId })}>
              {STYLE_PRESETS.filter((preset) =>
                ["industrial", "ambient", "techno", "experimental", "west", "east", "noise", "custom"].includes(preset.id),
              ).map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Goal">
            <TextInput value={form.purpose} aria-label="Goal" onChange={(event) => patch({ purpose: event.target.value })} />
          </Field>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {STYLE_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                variant={form.style === preset.id ? "primary" : "secondary"}
                onClick={() => {
                  const next = { ...form, style: preset.id, purpose: preset.purpose };
                  patch({ style: preset.id, purpose: preset.purpose });
                  setForm(next);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Budget" hint="Modules. A case is called out separately.">
              <TextInput inputMode="numeric" value={form.budget} onChange={(event) => patch({ budget: Number(event.target.value.replace(/[^\d]/g, "")) || 0 })} />
            </Field>
            <Field label="HP per row">
              <Select value={form.hp} onChange={(event) => patch({ hp: Number(event.target.value) })}>
                {[42, 60, 84, 104, 126].map((hp) => (
                  <option key={hp} value={hp}>
                    {hp}HP
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Rows">
              <Select value={form.rows} onChange={(event) => patch({ rows: Number(event.target.value) })}>
                {[1, 2, 3].map((rows) => (
                  <option key={rows} value={rows}>
                    {rows}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="+12V mA">
              <TextInput inputMode="numeric" value={form.powerP12} onChange={(event) => patch({ powerP12: Number(event.target.value) || 0 })} />
            </Field>
            <Field label="−12V mA">
              <TextInput inputMode="numeric" value={form.powerN12} onChange={(event) => patch({ powerN12: Number(event.target.value) || 0 })} />
            </Field>
            <Field label="+5V mA">
              <TextInput inputMode="numeric" value={form.powerP5} onChange={(event) => patch({ powerP5: Number(event.target.value) || 0 })} />
            </Field>
            <Field label="Experience">
              <Select value={form.experience} onChange={(event) => patch({ experience: event.target.value as Experience })}>
                {["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"].map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </Select>
            </Field>
            <Field label="Character">
              <TextInput value={form.character} onChange={(event) => patch({ character: event.target.value })} placeholder="Filthy, unstable, slow" />
            </Field>
            <Field label="Musical goal" hint="Plain language. This is not a form for its own sake.">
              <TextInput value={form.purpose} onChange={(event) => patch({ purpose: event.target.value })} />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Existing modules" hint="Recorded, not subtracted. This bench cannot see your case.">
              <TextArea value={form.existing} onChange={(event) => patch({ existing: event.target.value })} />
            </Field>
            <Field label="Modules to avoid">
              <TextArea value={form.exclude} onChange={(event) => patch({ exclude: event.target.value })} placeholder="No sequencer, no sampler" />
            </Field>
          </div>
        </>
      )}
      <Button
        variant="primary"
        onClick={() => run()}
        disabled={working}
      >
        {working ? "FITTING THE CASE" : mode === "budget" ? "SHOW ME THE SYSTEM" : "DESIGN MY SYSTEM"}
      </Button>
      {proposal ? <ProposalView proposal={proposal} onLoad={() => { loadProposal(proposal); void navigate({ to: "/system" }); }} /> : null}
    </div>
  );
}

export function ProposalView({ proposal, onLoad }: { proposal: SystemProposal; onLoad: () => void }) {
  return (
    <Plate className="rise-in p-4 sm:p-6">
      <Index n="SYSTEM" label={proposal.title} />
      <p className="mt-2 text-muted">{proposal.purpose}</p>
      <dl className="mt-4 grid gap-3 font-mono text-sm sm:grid-cols-4">
        <Stat k="ESTIMATED COST" v={money(proposal.cost)} />
        <Stat k="HP" v={`${proposal.hp}/${proposal.hpCapacity}`} />
        <Stat k="POWER" v={proposal.withinPower ? "WITHIN CAPACITY" : "OVER CAPACITY"} />
        <Stat k="DIFFICULTY" v={proposal.difficulty} />
      </dl>
      <div className="mt-4 overflow-x-auto border border-line bg-bg">
        <div className="flex w-max">
          {proposal.modules.map((mod) => (
            <ModuleFace key={mod.instanceId} mod={mod} unit={8} compact />
          ))}
        </div>
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Block title="WHAT YOU GET" items={proposal.whatYouGet} />
        <Block title="WHY THESE MODULES" items={proposal.why} />
        <Block title="WHAT YOU SACRIFICE" items={proposal.sacrifice} />
        <Block title="HOW TO UPGRADE" items={proposal.upgrade} />
      </div>
      {proposal.changes.length ? (
        <div className="mt-6">
          <p className="font-mono text-xs tracking-widest text-muted">WHAT CHANGED TO FIT</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
            {proposal.changes.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {!proposal.withinBudget || !proposal.withinHp || !proposal.withinPower ? (
        <div className="mt-4">
          <WarningStrip>The fit is imperfect. The rack will show HP, power, or budget warnings after you load it.</WarningStrip>
        </div>
      ) : null}
      <Button className="mt-6" variant="primary" onClick={onLoad}>
        LOAD INTO SYSTEM LAB
      </Button>
      <p className="mt-3 text-xs text-muted">DEMO DATA. Module choices are a seeded catalog, not a measured instrument.</p>
    </Plate>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="border border-line p-3">
      <dt className="text-xs text-muted">{k}</dt>
      <dd className="mt-1 tabular-nums text-fg">{v}</dd>
    </div>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="font-mono text-xs tracking-widest text-accent">{title}</h3>
      <ul className="mt-2 space-y-2 text-sm leading-relaxed">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
