import type { BomCategory, BomItem, CostBreakdown, Difficulty, RackModule, TierId } from "./types.ts";
import { BOM_CATEGORIES, DIFFICULTY_RANK } from "./types.ts";

interface TemplateLine {
  category: BomCategory;
  part: string;
  alternative: string;
  quantity: number;
  weight: number;
}

function dollars(value: number) {
  return Math.round(value * 100) / 100;
}

function icName(mod: RackModule, tier: TierId) {
  const map: Record<string, Record<TierId, string>> = {
    VCO: {
      economy: "Discrete transistor oscillator core",
      standard: "AS3340-class VCO core, demo equivalent",
      luxury: "Precision VCO core plus local regulators",
    },
    VCF: {
      economy: "Common OTA or diode-cell filter",
      standard: "OTA filter IC, demo equivalent",
      luxury: "Matched ladder transistors or premium OTA",
    },
    SAMPLER: {
      economy: "Small microcontroller footprint — no firmware",
      standard: "Microcontroller and codec footprint — no firmware",
      luxury: "Microcontroller, better codec, service header — no firmware",
    },
    SEQUENCER: {
      economy: "Small microcontroller",
      standard: "Microcontroller with a cleaner regulator",
      luxury: "Microcontroller, display driver, local regulation",
    },
  };
  return (
    map[mod.functionKind]?.[tier] ??
    (tier === "luxury" ? "Premium audio op-amp and support ICs" : tier === "economy" ? "TL072-class dual op-amp" : "TL072 / NE5532-class op-amps")
  );
}

function template(mod: RackModule): TemplateLine[] {
  const tier = mod.tier;
  const jacks = Math.max(2, mod.inputs.length + mod.outputs.length);
  const pots = Math.max(1, mod.controls.length);
  return [
    {
      category: "INTEGRATED CIRCUITS",
      part: icName(mod, tier),
      alternative: tier === "luxury" ? "Standard TL072-class op-amp" : "OPA2134-class op-amp",
      quantity: tier === "luxury" ? 3 : 2,
      weight: 0.18,
    },
    {
      category: "RESISTORS",
      part: tier === "luxury" ? "1% metal film set, including pitch-critical values" : "Carbon film and 1% metal film mix",
      alternative: "All 1% metal film",
      quantity: 24,
      weight: 0.05,
    },
    {
      category: "CAPACITORS",
      part: tier === "economy" ? "Ceramic and electrolytic mix" : "Film decoupling plus electrolytic bulk",
      alternative: "Film coupling throughout",
      quantity: 14,
      weight: 0.07,
    },
    {
      category: "DIODES",
      part: mod.features.includes("WAVEFOLD") ? "1N4148 plus Schottky folder diodes" : "1N4148 signal diodes and a power diode",
      alternative: "BAT85 where the clip matters",
      quantity: 6,
      weight: 0.03,
    },
    {
      category: "TRANSISTORS",
      part: tier === "luxury" ? "Matched pair plus general small-signal" : "2N3904-class small-signal set",
      alternative: "BC547, check pinout",
      quantity: 6,
      weight: 0.04,
    },
    {
      category: "POTENTIOMETERS",
      part: tier === "luxury" ? "Conductive-plastic 9 mm pots" : tier === "economy" ? "Generic carbon 9 mm pots" : "Alpha-class 9 mm pots",
      alternative: tier === "luxury" ? "Alpha-class pots" : "Conductive-plastic pots",
      quantity: pots,
      weight: 0.12,
    },
    {
      category: "JACKS",
      part: tier === "economy" ? "PJ301M-class jacks" : "Thonkiconn-class switched jacks",
      alternative: tier === "economy" ? "Thonkiconn-class jacks" : "PJ301M-class jacks",
      quantity: jacks,
      weight: 0.11,
    },
    {
      category: "CONNECTORS",
      part: "Keyed 10-pin power header",
      alternative: "Unkeyed shroud — easier to plug in backwards",
      quantity: 1,
      weight: 0.04,
    },
    {
      category: "PCB",
      part: tier === "luxury" ? `4-layer PCB, about ${mod.hp}HP` : `2-layer PCB, about ${mod.hp}HP`,
      alternative: tier === "luxury" ? "2-layer PCB" : "4-layer PCB",
      quantity: 1,
      weight: 0.14,
    },
    {
      category: "PANEL",
      part: tier === "luxury" ? `Anodized aluminum panel, ${mod.hp}HP` : `Aluminum panel, ${mod.hp}HP`,
      alternative: tier === "luxury" ? "Raw aluminum panel" : "Anodized panel",
      quantity: 1,
      weight: 0.12,
    },
    {
      category: "HARDWARE",
      part: tier === "economy" ? "M3 screws, fewer dress nuts" : "M3 screws, dress nuts, standoffs",
      alternative: "Nylon standoffs",
      quantity: 1,
      weight: 0.05,
    },
    {
      category: "WIRING",
      part: "Hookup wire and a 10-pin ribbon",
      alternative: "Pre-crimped power cable",
      quantity: 1,
      weight: 0.03,
    },
    {
      category: "OTHER",
      part: mod.features.includes("SUB") ? "Divider support parts for the sub oscillator" : "Knobs and a power LED",
      alternative: "Skip the LED",
      quantity: 1,
      weight: 0.02,
    },
  ];
}

export function generateBOM(modules: RackModule[]): BomItem[] {
  const items: BomItem[] = [];
  for (const mod of modules) {
    const lines = template(mod);
    const weights = lines.reduce((sum, line) => sum + line.weight, 0);
    let allocated = 0;
    lines.forEach((line, index) => {
      const isLast = index === lines.length - 1;
      const share = isLast ? dollars(mod.cost - allocated) : dollars((mod.cost * line.weight) / weights);
      allocated = dollars(allocated + share);
      const total = Math.max(0.05, share);
      items.push({
        id: `${mod.instanceId}-${line.category}`,
        category: line.category,
        part: line.part,
        quantity: line.quantity,
        unitCost: dollars(total / line.quantity),
        total,
        confidence: "ESTIMATED",
        alternative: line.alternative,
        moduleName: mod.name,
      });
    });
  }
  return mergeBom(items);
}

function mergeBom(items: BomItem[]): BomItem[] {
  const map = new Map<string, BomItem>();
  for (const item of items) {
    const key = `${item.category}|${item.part}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...item });
      continue;
    }
    const quantity = existing.quantity + item.quantity;
    const total = dollars(existing.total + item.total);
    map.set(key, {
      ...existing,
      quantity,
      total,
      unitCost: dollars(total / quantity),
      moduleName: existing.moduleName === item.moduleName ? existing.moduleName : "Several modules",
    });
  }
  return [...map.values()].sort((a, b) => BOM_CATEGORIES.indexOf(a.category) - BOM_CATEGORIES.indexOf(b.category));
}

export function summarizeCost(items: BomItem[]): CostBreakdown {
  const sum = (categories: BomCategory[]) =>
    dollars(items.filter((item) => categories.includes(item.category)).reduce((total, item) => total + item.total, 0));
  const components = sum([
    "INTEGRATED CIRCUITS",
    "RESISTORS",
    "CAPACITORS",
    "DIODES",
    "TRANSISTORS",
    "POTENTIOMETERS",
    "JACKS",
    "CONNECTORS",
    "OTHER",
  ]);
  const pcb = sum(["PCB"]);
  const panel = sum(["PANEL"]);
  const hardware = sum(["HARDWARE", "WIRING"]);
  const buildCost = dollars(components + pcb + panel + hardware);
  const assembly = dollars(Math.max(25, buildCost * 0.35));
  const shipping = dollars(Math.max(8, buildCost * 0.08));
  const landed = dollars(buildCost + shipping);
  return {
    components,
    pcb,
    panel,
    hardware,
    assembly,
    assemblyNote: "DIY assembly is assumed at $0 in the landed total. The figure shown is a demo contract-assembly allowance, not a quote.",
    shipping,
    buildCost,
    landed,
    low: dollars(landed * 0.88),
    high: dollars(landed * 1.16),
  };
}

export function explainDifficulty(modules: RackModule[]) {
  if (!modules.length) {
    return { level: null as Difficulty | null, reasons: ["Nothing is in the rack yet."] };
  }
  const level = modules.reduce<Difficulty>(
    (current, mod) => (DIFFICULTY_RANK[mod.difficulty] > DIFFICULTY_RANK[current] ? mod.difficulty : current),
    "BEGINNER",
  );
  const reasons = [
    `The hardest module sets the rating. That is currently ${level}.`,
    ...modules
      .filter((mod) => mod.difficulty === level)
      .slice(0, 3)
      .map((mod) => `${mod.name} is ${mod.difficulty.toLowerCase()} because of its part count, panel density, and the unverified circuit idea.`),
  ];
  if (modules.some((mod) => mod.functionKind === "SAMPLER" || mod.functionKind === "SEQUENCER")) {
    reasons.push("Anything with a microcontroller also implies firmware that this demo does not provide.");
  }
  if (level === "BEGINNER") reasons.push("Still use a current-limited supply for the first power-up. Beginner does not mean unpowered.");
  return { level, reasons };
}

export const BUILD_STEPS = [
  { n: "01", title: "Order PCB", body: "No board house is connected. Treat the PCB line as a specification, not an order." },
  { n: "02", title: "Order components", body: "Use the BOM as a shopping list. Confirm footprints and prices before you buy. These numbers are estimates." },
  { n: "03", title: "Sort components", body: "Bag parts by designator group. Do not start soldering from an open pile." },
  { n: "04", title: "Populate PCB", body: "Short parts first. ICs last, and in sockets if the BOM calls for them." },
  { n: "05", title: "Solder", body: "Temperature-controlled iron, flux, and patience. This is a prototype sequence, not a certified procedure." },
  { n: "06", title: "Inspect joints", body: "Look for bridges, cold joints, and reversed diodes, electrolytics, and ICs." },
  { n: "07", title: "Install panel hardware", body: "Jacks and pots mounted square. The panel is cosmetic until the nuts are tight." },
  { n: "08", title: "Connect jacks", body: "Point-to-point only where the board does not already carry the signal." },
  { n: "09", title: "Power test", body: "Current-limited bench supply first. Confirm +12, −12, and +5 if used. Stop if it draws more than the estimate by a wide margin." },
  { n: "10", title: "Functional test", body: "One jack at a time. Nothing here has been electrically validated in advance." },
];
