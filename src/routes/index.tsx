import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { DesignResult } from "@/components/lux/DesignResult";
import { SystemDesigner } from "@/components/lux/SystemDesigner";
import { Button, buttonClass, Index, Plate, Trace } from "@/components/lux/ui";
import { generateModuleDesign } from "@/lib/lux/engine";
import { DEMO_PROMPT, type ModuleDesign } from "@/lib/lux/types";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <p className="font-mono text-xs tracking-widest text-accent">LUX MACHINA / DESIGN BENCH</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-tight text-balance sm:text-7xl">
          TURN IDEAS INTO MACHINES.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-muted">
          Describe the hardware you imagine. Lux Machina turns it into buildable concepts, optimized systems, and structured bills of materials.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to="/lab" className={buttonClass("primary")}>
            DESIGN A MODULE
          </Link>
          <Link to="/system" search={{ mode: "design" }} className={buttonClass()}>
            DESIGN MY SYSTEM
          </Link>
        </div>
        <div className="mt-10 border border-line bg-bg">
          <Trace />
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 md:grid-cols-3">
        {[
          ["01 — DESCRIBE", "Tell Lux Machina what you want."],
          ["02 — OPTIMIZE", "Compare Economy, Standard, and Luxury implementations."],
          ["03 — BUILD", "Generate the system, BOM, and build plan."],
        ].map(([title, body]) => (
          <Plate key={title} className="p-5">
            <h2 className="font-mono text-sm tracking-widest text-accent">{title}</h2>
            <p className="mt-3 text-lg leading-snug">{body}</p>
          </Plate>
        ))}
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-4">
        <Index n="DEMO" label="A MACHINE FROM A SENTENCE" />
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance">Try the loop without an account.</h2>
        <HomeDemo />
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-4">
        <Index n="500" label="WHAT CAN I BUILD WITH $500?" />
        <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-balance">A whole instrument, not the cheapest modules.</h2>
        <p className="mt-3 max-w-2xl text-muted">
          The budget is reasoned as a playable system: source, shape, dynamics, and a way out. A powered case is called out when it does not fit.
        </p>
        <div className="mt-6">
          <SystemDesigner mode="budget" initial={{ budget: 500, style: "industrial", purpose: "Give me a complete playable system." }} />
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-4 pb-8">
        <Index n="SYSTEM" label="DESIGN MY SYSTEM" />
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Start from a tradition. Leave with a rack.</h2>
        <p className="mt-3 max-w-2xl text-sm text-muted">
          Presets are inspired by modular traditions. They are not reproductions of proprietary instruments.
        </p>
        <div className="mt-6">
          <SystemDesigner mode="full" />
        </div>
      </section>
    </main>
  );
}

function HomeDemo() {
  const [phase, setPhase] = useState<"idle" | "working" | "ready">("idle");
  const [design, setDesign] = useState<ModuleDesign | null>(null);

  function run() {
    setPhase("working");
    window.setTimeout(() => {
      setDesign(generateModuleDesign(DEMO_PROMPT));
      setPhase("ready");
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 700);
  }

  return (
    <div className="mt-6">
      <blockquote className="border border-line bg-surface p-4 text-lg leading-relaxed text-pretty">
        “{DEMO_PROMPT}”
      </blockquote>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Button variant="primary" onClick={run} disabled={phase === "working"}>
          {phase === "working" ? "STRUCTURING" : "GENERATE THIS DESIGN"}
        </Button>
        <Link to="/lab" search={{ prompt: DEMO_PROMPT, run: "1" }} className={buttonClass()}>
          OPEN IN MODULE LAB
        </Link>
      </div>
      {phase === "working" ? (
        <p className="mt-4 font-mono text-xs tracking-widest text-accent" role="status">
          ACQUIRING SIGNAL
        </p>
      ) : null}
      {design && phase === "ready" ? (
        <div className="mt-6">
          <p className="mb-4 text-sm text-muted">
            This result is running on the same demo engine as Module Lab. It is not a validated circuit. Open the lab to select a tier, cut the cost, and put it in a rack.
          </p>
          <DesignResult design={design} />
        </div>
      ) : null}
    </div>
  );
}
