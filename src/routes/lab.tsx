import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { DesignResult } from "@/components/lux/DesignResult";
import { Button, Index, TextArea, Trace } from "@/components/lux/ui";
import { generateModuleDesign } from "@/lib/lux/engine";
import { useLux } from "@/lib/lux/store";
import { DEMO_PROMPT } from "@/lib/lux/types";

const EXAMPLES = [
  DEMO_PROMPT,
  "A 4HP random voltage source",
  "A stereo distortion module with feedback",
  "A cheap granular sampler",
  "A drum module inspired by old industrial machines",
  "A weird experimental sequencer under $75",
];

export const Route = createFileRoute("/lab")({
  validateSearch: (search: Record<string, unknown>): { prompt?: string; run?: "1" } => ({
    ...(typeof search.prompt === "string" && search.prompt ? { prompt: search.prompt } : {}),
    ...(search.run === "1" ? { run: "1" as const } : {}),
  }),
  component: LabPage,
});

function LabPage() {
  const search = Route.useSearch();
  const draft = useLux((state) => state.draft);
  const setDraft = useLux((state) => state.setDraft);
  const [prompt, setPrompt] = useState(search.prompt || DEMO_PROMPT);
  const [phase, setPhase] = useState<"idle" | "working" | "ready" | "error">("idle");
  const [error, setError] = useState("");
  const started = useRef(false);

  function run(value = prompt) {
    const text = value.trim();
    if (text.length < 8) {
      setPhase("error");
      setError("Describe a machine. A function, a size, or a budget is enough.");
      return;
    }
    setError("");
    setPhase("working");
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 750;
    window.setTimeout(() => {
      setDraft(generateModuleDesign(text));
      setPhase("ready");
    }, delay);
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (search.prompt) setPrompt(search.prompt);
    if (search.run === "1" && search.prompt) run(search.prompt);
    else if (draft) setPhase("ready");
    // The first visit should run only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showing = phase === "ready" && draft;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Index n="MODULE LAB" label="DESCRIBE THE MACHINE" />
      <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">We'll structure the idea.</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Ordinary language first. The specification, the three builds, and the cost cuts come after. Nothing generated here is electrically validated.
      </p>
      <label className="mt-8 block" htmlFor="module-prompt">
        <span className="sr-only">Module description</span>
        <TextArea
          id="module-prompt"
          value={prompt}
          placeholder="Describe the module you want to build..."
          onChange={(event) => setPrompt(event.target.value)}
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            className="min-h-11 border border-line px-3 text-left text-sm text-muted hover:border-accent hover:text-fg"
            onClick={() => setPrompt(example)}
          >
            {example.length > 72 ? `${example.slice(0, 72)}…` : example}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <Button variant="primary" onClick={() => run()} disabled={phase === "working"}>
          {phase === "working" ? "ACQUIRING SIGNAL" : "GENERATE DESIGN"}
        </Button>
      </div>
      {phase === "working" ? (
        <div className="mt-6 border border-line bg-surface p-4" role="status">
          <p className="font-mono text-xs tracking-widest text-accent">STRUCTURING DESIGN</p>
          <Trace />
        </div>
      ) : null}
      {phase === "error" ? (
        <p className="mt-4 border border-accent px-4 py-3 text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {showing ? (
        <div className="mt-10">
          <DesignResult design={draft} />
        </div>
      ) : null}
    </main>
  );
}
