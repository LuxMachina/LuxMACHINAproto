import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateBOM, summarizeCost } from "./bom.ts";
import { DEMO_PROMPT } from "./types.ts";
import { defaultRequest, designQuote, generateModuleDesign, generateSystem, leversFor, rackModuleFromDesign, suggestLevers } from "./engine.ts";

describe("lux engine", () => {
  it("structures the industrial oscillator brief", () => {
    const design = generateModuleDesign(DEMO_PROMPT);
    assert.equal(design.spec.functionKind, "VCO");
    assert.equal(design.spec.hp, 8);
    assert.equal(design.name, "FILTH CORE");
    assert.ok(design.spec.inputs.includes("FM"));
    assert.ok(design.spec.inputs.includes("SYNC"));
    assert.ok(design.spec.outputs.includes("SUB"));
    assert.ok(design.spec.controls.includes("WAVEFOLD"));
    assert.equal(design.spec.budget, 100);
    assert.equal(design.spec.confidence.architecture, "UNVERIFIED");
    assert.equal(design.spec.confidence.power, "ESTIMATED");
    assert.equal(design.tiers.length, 3);
    const standard = design.tiers.find((tier) => tier.id === "standard");
    assert.ok(standard);
    assert.ok(standard.estimatedCost <= 100);
    assert.ok(design.tiers[0]!.estimatedCost < standard.estimatedCost);
    assert.ok(design.tiers[2]!.estimatedCost > standard.estimatedCost);
  });

  it("makes a design cheaper only by named cuts", () => {
    const design = generateModuleDesign(DEMO_PROMPT);
    const levers = leversFor(design, "standard");
    assert.ok(levers.length >= 4);
    const baseline = design.tiers[1]!.estimatedCost;
    const suggestion = suggestLevers(baseline, levers, 75);
    const quote = designQuote({ ...design, leverIds: suggestion.selected, selectedTier: "standard" });
    assert.ok(quote.newCost < baseline);
    assert.equal(quote.savings, suggestion.selected.reduce((sum, id) => sum + (levers.find((lever) => lever.id === id)?.save ?? 0), 0));
    assert.match(levers[0]!.tradeoff, /\w/);
  });

  it("fits a five-hundred-dollar industrial system inside the case", () => {
    const proposal = generateSystem(defaultRequest({ budget: 500, style: "industrial", hp: 84, rows: 1 }));
    assert.ok(proposal.modules.length >= 5);
    assert.ok(proposal.cost <= 500);
    assert.ok(proposal.hp <= 84);
    assert.ok(proposal.whatYouGet.length);
    assert.ok(proposal.sacrifice.some((line) => /case/i.test(line)));
    assert.ok(proposal.modules.some((mod) => mod.functionKind === "VCO"));
    assert.ok(proposal.modules.some((mod) => mod.functionKind === "OUTPUT"));
  });

  it("builds a bom that lands near the module cost", () => {
    const design = generateModuleDesign(DEMO_PROMPT);
    const mod = rackModuleFromDesign(design);
    const bom = generateBOM([mod]);
    const summary = summarizeCost(bom);
    assert.ok(Math.abs(summary.buildCost - mod.cost) < 1);
    assert.ok(summary.low < summary.landed);
    assert.ok(summary.high > summary.landed);
  });
});
