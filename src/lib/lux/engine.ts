import {
  BLUEPRINTS,
  getModule,
  STYLE_PRESETS,
  tierCost,
  type CatalogModule,
} from "./catalog.ts";
import type {
  Confidence,
  CostLever,
  DesignTier,
  Difficulty,
  FunctionKind,
  InterpretedSpec,
  ModuleDesign,
  OptimizeChange,
  OptimizeMode,
  PowerDraw,
  RackModule,
  SystemProject,
  SystemProposal,
  SystemRequest,
  TierId,
  TierPackage,
} from "./types.ts";
import { DIFFICULTY_RANK } from "./types.ts";

const UNVERIFIED =
  " This architecture is UNVERIFIED. It is a planning model, not a schematic, and it has not been simulated or built.";

const BASE_COST: Record<FunctionKind, number> = {
  VCO: 68,
  VCF: 64,
  VCA: 40,
  LFO: 32,
  EG: 36,
  MIXER: 44,
  SEQUENCER: 90,
  RANDOM: 34,
  DISTORTION: 42,
  SAMPLER: 150,
  DELAY: 78,
  UTILITY: 28,
  DRUM: 56,
  OUTPUT: 36,
  NOISE: 28,
  WAVESHAPER: 50,
};

const BASE_HP: Record<FunctionKind, number> = {
  VCO: 8,
  VCF: 8,
  VCA: 6,
  LFO: 4,
  EG: 8,
  MIXER: 8,
  SEQUENCER: 16,
  RANDOM: 4,
  DISTORTION: 6,
  SAMPLER: 16,
  DELAY: 10,
  UTILITY: 4,
  DRUM: 8,
  OUTPUT: 4,
  NOISE: 4,
  WAVESHAPER: 6,
};

const BASE_POWER: Record<FunctionKind, PowerDraw> = {
  VCO: { p12: 38, n12: 32, p5: 0 },
  VCF: { p12: 28, n12: 26, p5: 0 },
  VCA: { p12: 20, n12: 18, p5: 0 },
  LFO: { p12: 16, n12: 12, p5: 0 },
  EG: { p12: 20, n12: 14, p5: 0 },
  MIXER: { p12: 30, n12: 28, p5: 0 },
  SEQUENCER: { p12: 48, n12: 12, p5: 28 },
  RANDOM: { p12: 15, n12: 12, p5: 0 },
  DISTORTION: { p12: 18, n12: 16, p5: 0 },
  SAMPLER: { p12: 80, n12: 20, p5: 90 },
  DELAY: { p12: 55, n12: 28, p5: 36 },
  UTILITY: { p12: 12, n12: 12, p5: 0 },
  DRUM: { p12: 34, n12: 22, p5: 0 },
  OUTPUT: { p12: 28, n12: 28, p5: 0 },
  NOISE: { p12: 12, n12: 10, p5: 0 },
  WAVESHAPER: { p12: 24, n12: 22, p5: 0 },
};

const FUNCTIONS: { test: RegExp; kind: FunctionKind; label: string; synthesis: string }[] = [
  { test: /granular|\bgrain\b/i, kind: "SAMPLER", label: "Granular sampler", synthesis: "digital" },
  { test: /sampler|sample player/i, kind: "SAMPLER", label: "Sampler", synthesis: "digital" },
  { test: /sequenc/i, kind: "SEQUENCER", label: "Sequencer", synthesis: "control" },
  { test: /random|sample and hold|s\s*&\s*h|\bs&h\b/i, kind: "RANDOM", label: "Random voltage source", synthesis: "control" },
  { test: /distort|overdrive|\bfuzz\b|saturation/i, kind: "DISTORTION", label: "Distortion", synthesis: "effect" },
  { test: /oscill|vco|\bosc\b|tone generator/i, kind: "VCO", label: "Analog VCO", synthesis: "analog" },
  { test: /wavefold|waveshap|\bfolder\b/i, kind: "WAVESHAPER", label: "Wavefolder", synthesis: "analog" },
  { test: /low pass gate|\blpg\b/i, kind: "VCF", label: "Low pass gate", synthesis: "analog" },
  { test: /filter|\bvcf\b|low pass|high pass/i, kind: "VCF", label: "Filter", synthesis: "analog" },
  { test: /\bvca\b|amplifier/i, kind: "VCA", label: "VCA", synthesis: "analog" },
  { test: /\blfo\b|low frequency osc/i, kind: "LFO", label: "LFO", synthesis: "control" },
  { test: /envelope|\beg\b|\badsr\b/i, kind: "EG", label: "Envelope", synthesis: "control" },
  { test: /\bdrum\b|\bkick\b|\bsnare\b/i, kind: "DRUM", label: "Drum voice", synthesis: "analog" },
  { test: /delay|echo|reverb/i, kind: "DELAY", label: "Delay", synthesis: "effect" },
  { test: /mixer|\bmix\b/i, kind: "MIXER", label: "Mixer", synthesis: "utility" },
  { test: /headphone|line out|\boutput\b/i, kind: "OUTPUT", label: "Output", synthesis: "utility" },
  { test: /\bnoise\b/i, kind: "NOISE", label: "Noise source", synthesis: "analog" },
  { test: /multiple|\bmult\b|attenu|utility/i, kind: "UTILITY", label: "Utility", synthesis: "utility" },
];

const FEATURE_DEFS: { id: string; test: RegExp; label: string; cost: number }[] = [
  { id: "fm", test: /\bfm\b|frequency mod/i, label: "FM", cost: 7 },
  { id: "sync", test: /hard sync|\bsync\b/i, label: "SYNC", cost: 5 },
  { id: "sub", test: /\bsub\b|sub oscillator/i, label: "SUB", cost: 8 },
  { id: "fold", test: /wavefold|folder|folding/i, label: "WAVEFOLD", cost: 10 },
  { id: "pwm", test: /\bpwm\b/i, label: "PWM", cost: 5 },
  { id: "stereo", test: /stereo/i, label: "STEREO", cost: 16 },
  { id: "feedback", test: /feedback/i, label: "FEEDBACK", cost: 8 },
];

const CHARACTERS: [RegExp, string][] = [
  [/filth|dirty|grit|grimy/i, "Dirty"],
  [/unstable|drift|detune/i, "Unstable"],
  [/aggress|harsh|nasty/i, "Aggressive"],
  [/industrial/i, "Industrial"],
  [/\bwarm\b/i, "Warm"],
  [/clean|pristine|hi-?fi/i, "Clean"],
  [/ambient|soft|gentle/i, "Soft"],
  [/experiment|weird|strange/i, "Experimental"],
  [/noise/i, "Noisy"],
  [/dark/i, "Dark"],
  [/west coast/i, "West Coast"],
  [/techno/i, "Rhythmic"],
];

export function hashString(value: string) {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function money(prompt: string): number | null {
  const patterns = [
    /under\s*\$?\s*(\d+(?:\.\d+)?)/i,
    /budget[^\d$]{0,16}\$?\s*(\d+)/i,
    /keep[^.$\n]{0,48}\$\s*(\d+)/i,
    /\$\s*(\d+(?:\.\d+)?)/,
  ];
  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match) return Math.round(Number(match[1]));
  }
  return null;
}

function clampHp(value: number) {
  return Math.min(42, Math.max(2, Math.round(value)));
}

export function panelTone(kind: FunctionKind, salt = 0): RackModule["tone"] {
  if (kind === "UTILITY" || kind === "OUTPUT" || kind === "MIXER") return "bone";
  if (kind === "DISTORTION" || kind === "NOISE" || kind === "DRUM") return "soot";
  return salt % 2 === 0 ? "graphite" : "soot";
}

function designName(kind: FunctionKind, prompt: string) {
  if (kind === "VCO" && /filth|dirty/i.test(prompt)) return "FILTH CORE";
  if (kind === "VCO" && /industrial/i.test(prompt)) return "IRON CORE";
  if (kind === "RANDOM") return "STATIC";
  if (kind === "DISTORTION") return "GRIT";
  if (kind === "DRUM") return "KICK PLATE";
  if (kind === "WAVESHAPER") return "FOLD";
  const table: Record<FunctionKind, string[]> = {
    VCO: ["SLAG OSC", "CINDER VCO", "RUST TONE", "MILL OSC"],
    VCF: ["SLAG FILTER", "ASH FILTER", "MILL VCF"],
    VCA: ["GATE VCA", "IRON VCA"],
    LFO: ["DRIFT LFO", "SLOW RAIL"],
    EG: ["ASH ENVELOPE", "GATE CURVE"],
    MIXER: ["BUS MIX", "SUM RAIL"],
    SEQUENCER: ["STEP DRILL", "ROW CLOCK"],
    RANDOM: ["STATIC"],
    DISTORTION: ["GRIT"],
    SAMPLER: ["GRAIN BIN", "SCRAP BIN"],
    DELAY: ["DELAY WELL", "DARK REPEAT"],
    UTILITY: ["UTILITY STRIP", "OFFSET"],
    DRUM: ["KICK PLATE"],
    OUTPUT: ["LINE OUT"],
    NOISE: ["NOISE WALL"],
    WAVESHAPER: ["FOLD"],
  };
  const options = table[kind];
  return options[hashString(prompt) % options.length] ?? "MODULE";
}

function bump(level: Difficulty): Difficulty {
  if (level === "BEGINNER") return "INTERMEDIATE";
  if (level === "INTERMEDIATE") return "ADVANCED";
  if (level === "ADVANCED") return "EXPERT";
  return "EXPERT";
}

function baseDifficulty(kind: FunctionKind): Difficulty {
  if (kind === "SAMPLER") return "ADVANCED";
  if (kind === "SEQUENCER" || kind === "DELAY" || kind === "VCO" || kind === "VCF" || kind === "WAVESHAPER" || kind === "DRUM" || kind === "DISTORTION") {
    return "INTERMEDIATE";
  }
  return "BEGINNER";
}

export function architectureFor(kind: FunctionKind, tier: TierId, features: string[]) {
  const has = (id: string) => features.some((feature) => feature.toLowerCase().includes(id));
  const cores: Record<FunctionKind, Record<TierId, string>> = {
    VCO: {
      economy: "Saw core from a transistor pair and an integrator, with a cheap shaper for extra waveforms and one shared output buffer.",
      standard: "VCO-on-a-chip class core (AS3340-type or an equivalent — an unverified substitute) with buffered waveforms and a separate sub-octave divider when asked for.",
      luxury: "Precision core with a tempco on the exponential converter, local regulation, a matched pair, and an independent buffer per waveform.",
    },
    VCF: {
      economy: "One-pole or light two-pole filter using a common OTA or diode cell. Resonance is limited on purpose.",
      standard: "Two-pole low-pass with a resonance control and a CV summer. Tracking is estimated, not trimmed as a musical instrument yet.",
      luxury: "Four-pole ladder-style cell with matched transistors or a premium OTA, temperature compensation where it earns it, and a better output driver.",
    },
    VCA: {
      economy: "Single OTA or transistor VCA, DC-coupled enough for CV, audio-acceptable if you do not expect silence.",
      standard: "That same job with a better control law and a trim for bleed.",
      luxury: "Low-bleed VCA, local supply filtering, and a second channel that does not share the first channel's compromise.",
    },
    LFO: {
      economy: "Op-amp triangle and a comparator square. Rate drifts. That is sometimes the feature.",
      standard: "Same oscillator with a wider range and a sync input that actually resets.",
      luxury: "Stable wide-range LFO with a calibrated dial and a shape crossfade.",
    },
    EG: {
      economy: "One-shot AD or a simple ADSR from a common timer approach. Timing parts are ordinary.",
      standard: "ADSR with usable ranges and a gate LED. Retrigger is specified, not proven.",
      luxury: "Voltage-controlled stages, snappy attack, and a time range that does not fight the pots.",
    },
    MIXER: {
      economy: "Unity summing with one op-amp. No headroom to spare.",
      standard: "Four channels, a clip indicator, and an output that can drive a patch cable.",
      luxury: "More headroom, better resistors, and a cue or aux that is actually buffered.",
    },
    SEQUENCER: {
      economy: "Eight steps, one CV, one gate. A microcontroller because doing this in pure CMOS is a different project.",
      standard: "The same pattern machine with length, reset, and a clock that does not collapse when you patch it.",
      luxury: "More outputs, a sturdier UI, and a power section that does not put digital hash on the CV.",
    },
    RANDOM: {
      economy: "Transistor noise into a sample-and-hold. One output.",
      standard: "Clocked random plus a noise tap, with a level that is not stuck at the rail.",
      luxury: "Stored random, a smoother slew, and a distribution you can actually describe.",
    },
    DISTORTION: {
      economy: "Diode clipper and a tone pot. It will be loud and crude.",
      standard: "Drive, mix, and a tone stack so the dry signal can survive.",
      luxury: "A more controlled gain cell, better headroom into the clip, and a blend that stays quiet when parked.",
    },
    SAMPLER: {
      economy: "A small microcontroller and a codec footprint. Firmware is not written. This is a shell.",
      standard: "The same shell with a better codec assumption, more memory on the BOM, and panel room for the controls.",
      luxury: "Stereo converters, local regulators, and a service header. Still no firmware, still not a product.",
    },
    DELAY: {
      economy: "Short bucket-brigade or a very small digital delay. One knob does too much.",
      standard: "Time, feedback, and mix, with a clock or a BBD bias called out as a trim.",
      luxury: "Cleaner repeats, a filtered feedback path, and regulation so the clock does not sing.",
    },
    UTILITY: {
      economy: "Attenuator or a passive mult. Almost no active parts.",
      standard: "Buffered attenuverter and offset.",
      luxury: "Precision resistors, a quieter reference, and a second channel.",
    },
    DRUM: {
      economy: "Bridged-T kick or a simple decay into a VCA. One sound.",
      standard: "Pitch decay, drive, and a trigger conditioner.",
      luxury: "A more stable pitch core, an accent input, and an output that survives a mixer.",
    },
    OUTPUT: {
      economy: "One op-amp and a resistor to a jack. It will drive a mixer if you are kind.",
      standard: "Line level plus a headphone amp that is specified as a part, not a wish.",
      luxury: "More voltage swing, output protection, and a level you can trust.",
    },
    NOISE: {
      economy: "A reverse-biased transistor and a gain stage. Color is a single filter.",
      standard: "White and a crude pink, with a level pot.",
      luxury: "A more consistent noise source and filtering that does not also amplify hum.",
    },
    WAVESHAPER: {
      economy: "Passive diode folder. Level-dependent and proud of it.",
      standard: "Active folder with drive and an offset.",
      luxury: "Multi-stage folder, symmetry trim, and a dry/wet blend.",
    },
  };
  let text = cores[kind][tier];
  if (has("wavefold") || has("fold")) {
    text +=
      tier === "economy"
        ? " Wavefolding is a passive diode cell."
        : tier === "luxury"
          ? " Wavefolding is a multi-stage active folder with a symmetry trim."
          : " Wavefolding is an active cell with a drive control.";
  }
  if (has("sync")) text += " Hard sync is a pulse into the core reset, not a second oscillator.";
  if (has("sub")) text += " The sub is a divide-down square, not a second full VCO.";
  if (has("fm")) text += " FM is a linear-ish input with a depth pot. Index is not calibrated.";
  if (has("stereo")) text += " Stereo means two paths on the BOM, not a guaranteed image.";
  if (has("feedback")) text += " Feedback is a path you can turn down, because you will need to.";
  return text + UNVERIFIED;
}

function advantagesFor(kind: FunctionKind, tier: TierId, features: string[]) {
  if (tier === "economy") {
    return [
      "Fewer parts to buy and to get wrong.",
      "Enough of the function to hear whether the idea is worth a better build.",
    ];
  }
  if (tier === "luxury") {
    return [
      "Parts chosen where tolerance, noise, or feel actually show up in use.",
      "Easier to service: sockets, local regulation, and trims called out.",
      features.length ? `Room for ${features.join(", ")} without deleting another function.` : "Headroom to add a function later.",
    ];
  }
  return [
    "The function is complete enough to sit in a system.",
    kind === "VCO" ? "Simultaneous waveforms instead of a single switch." : "Controls match the job instead of sharing one knob.",
    "Cost stays in the range of a DIY module rather than a boutique run.",
  ];
}

function compromisesFor(tier: TierId, features: string[]) {
  if (tier === "economy") {
    const items = [
      "Shared buffers. You will not get every waveform at once without a drop in level.",
      "Ordinary pots and a thinner panel. It works. It does not feel expensive.",
      "Drift, noise, and tracking are accepted, not fought.",
    ];
    if (features.includes("WAVEFOLD")) items.push("The folder is passive. It depends on how hard you drive it.");
    return items;
  }
  if (tier === "luxury") {
    return [
      "You pay for tolerances the patch may never reveal.",
      "More parts means more chances to install one backwards.",
    ];
  }
  return [
    "Not the quietest build, and not the cheapest.",
    "Character comes from the brief. It is not a measured distortion spec.",
    features.includes("SUB") ? "Sub level is a simple divider, not a second voice." : "No spare panel space for a function you did not ask for.",
  ];
}

function performanceFor(tier: TierId) {
  if (tier === "luxury") {
    return [
      "Lower noise where a premium op-amp replaces a TL072-class part.",
      "Better expected tuning stability if a tempco is on the exponential converter.",
      "These are expectations, not measurements.",
    ];
  }
  if (tier === "standard") return ["Balanced noise and tracking for a DIY voice. Nothing here has been measured."];
  return ["Performance is 'good enough to evaluate the idea.' Do not expect lab numbers."];
}

function upgradeFor(tier: TierId) {
  if (tier === "luxury") return ["Header for a later waveshaper or firmware board.", "Sockets so the core IC can be swapped."];
  if (tier === "standard") return ["Footprints left for a better op-amp.", "Panel can be reprinted without a new circuit."];
  return ["You can rebuild the same panel with the standard BOM later.", "Little on this board is worth upgrading in place."];
}

function powerFor(base: PowerDraw, tier: TierId, featureCount: number): PowerDraw {
  const mul = tier === "economy" ? 0.82 : tier === "luxury" ? 1.16 : 1;
  const extra = featureCount * (tier === "luxury" ? 2 : 1);
  return {
    p12: Math.round(base.p12 * mul + extra),
    n12: Math.round(base.n12 * mul + Math.floor(extra / 2)),
    p5: Math.round(base.p5 * (tier === "luxury" ? 1.1 : 1)),
  };
}

function difficultyFor(kind: FunctionKind, tier: TierId, featureCount: number): Difficulty {
  let level = baseDifficulty(kind);
  if (tier === "luxury") level = bump(level);
  if (tier === "economy" && level === "ADVANCED") level = "INTERMEDIATE";
  if (featureCount >= 4 && tier === "luxury") level = bump(level);
  return level;
}

function hoursFor(tier: TierId, kind: FunctionKind) {
  if (kind === "SAMPLER" || kind === "SEQUENCER") {
    return tier === "economy" ? "8–14 h" : tier === "luxury" ? "20–35 h" : "12–20 h";
  }
  return tier === "economy" ? "5–8 h" : tier === "luxury" ? "14–22 h" : "8–12 h";
}

function partsFor(kind: FunctionKind, tier: TierId, featureCount: number) {
  const base = kind === "UTILITY" ? 18 : kind === "SEQUENCER" || kind === "SAMPLER" ? 70 : 48;
  const mul = tier === "economy" ? 0.7 : tier === "luxury" ? 1.35 : 1;
  return Math.max(8, Math.round(base * mul + featureCount * 4));
}

export function interpretPrompt(prompt: string): InterpretedSpec {
  const text = prompt.trim();
  const matched = FUNCTIONS.find((entry) => entry.test.test(text));
  const kind = matched?.kind ?? "UTILITY";
  const functionKnown = Boolean(matched);
  let label = matched?.label ?? "Unspecified function";
  let synthesis = matched?.synthesis ?? "unspecified";
  if (kind === "VCO" && /digital/i.test(text)) {
    synthesis = "digital";
    label = "Digital oscillator";
  }
  if (/\banalog\b/i.test(text) && kind === "VCO") {
    synthesis = "analog";
    label = "Analog VCO";
  }

  const hpMatch = text.match(/(\d+)\s*hp/i);
  let hp = hpMatch ? clampHp(Number(hpMatch[1])) : BASE_HP[kind];
  const features = FEATURE_DEFS.filter((feature) => feature.test.test(text)).map((feature) => feature.label);
  if (features.includes("STEREO") && !hpMatch) hp = clampHp(hp + 4);
  if (features.includes("WAVEFOLD") && kind === "VCO" && !hpMatch) hp = Math.max(hp, 8);

  const character = CHARACTERS.filter(([pattern]) => pattern.test(text)).map(([, name]) => name);
  if (/industrial/i.test(text) && !character.includes("Industrial")) character.push("Industrial");
  const budget = money(text);

  const inputs: string[] = [];
  const outputs: string[] = [];
  const controls: string[] = [];
  const push = (list: string[], value: string) => {
    if (!list.includes(value)) list.push(value);
  };

  if (kind === "VCO") {
    push(inputs, "1V/OCT");
    if (features.includes("FM")) push(inputs, "FM");
    if (features.includes("SYNC")) push(inputs, "SYNC");
    push(outputs, "SAW");
    if (synthesis === "analog") {
      push(outputs, "TRIANGLE");
      push(outputs, "SINE");
    }
    if (features.includes("SUB")) push(outputs, "SUB");
    if (features.includes("WAVEFOLD")) push(outputs, "FOLD");
    push(controls, "FREQUENCY");
    push(controls, "FINE");
    if (features.includes("FM")) push(controls, "FM AMOUNT");
    if (features.includes("WAVEFOLD")) push(controls, "WAVEFOLD");
    if (features.includes("SUB")) push(controls, "SUB LEVEL");
    if (features.includes("PWM")) push(controls, "PWM");
  } else if (kind === "VCF") {
    push(inputs, "IN");
    push(inputs, "CV");
    push(outputs, "OUT");
    push(controls, "CUTOFF");
    push(controls, "RESONANCE");
  } else if (kind === "VCA") {
    push(inputs, "IN");
    push(inputs, "CV");
    push(outputs, "OUT");
    push(controls, "LEVEL");
    push(controls, "RESPONSE");
  } else if (kind === "LFO") {
    push(inputs, "SYNC");
    push(outputs, "TRI");
    push(outputs, "SQR");
    push(controls, "RATE");
  } else if (kind === "EG") {
    push(inputs, "GATE");
    push(outputs, "ENV");
    ["ATTACK", "DECAY", "SUSTAIN", "RELEASE"].forEach((control) => push(controls, control));
  } else if (kind === "MIXER") {
    ["1", "2", "3", "4"].forEach((n) => push(inputs, n));
    push(outputs, "OUT");
    push(controls, "LEVEL");
  } else if (kind === "SEQUENCER") {
    push(inputs, "CLOCK");
    push(inputs, "RESET");
    push(outputs, "CV");
    push(outputs, "GATE");
    push(controls, "TEMPO");
    push(controls, "LENGTH");
  } else if (kind === "RANDOM") {
    push(inputs, "CLOCK");
    push(outputs, "RANDOM");
    push(outputs, "NOISE");
    push(controls, "RATE");
  } else if (kind === "DISTORTION") {
    push(inputs, "IN");
    if (features.includes("FEEDBACK")) push(inputs, "FB");
    push(outputs, features.includes("STEREO") ? "L" : "OUT");
    if (features.includes("STEREO")) push(outputs, "R");
    push(controls, "DRIVE");
    push(controls, "TONE");
    push(controls, "MIX");
  } else if (kind === "SAMPLER") {
    push(inputs, "IN");
    push(inputs, "FREEZE");
    push(outputs, "OUT");
    if (features.includes("STEREO")) push(outputs, "R");
    ["SIZE", "DENSITY", "PITCH"].forEach((control) => push(controls, control));
  } else if (kind === "DELAY") {
    push(inputs, "IN");
    push(outputs, "OUT");
    ["TIME", "FEEDBACK", "MIX"].forEach((control) => push(controls, control));
  } else if (kind === "DRUM") {
    push(inputs, "TRIG");
    push(outputs, "OUT");
    ["PITCH", "DECAY", "DRIVE"].forEach((control) => push(controls, control));
  } else if (kind === "OUTPUT") {
    push(inputs, "L");
    push(inputs, "R");
    push(outputs, "LINE");
    push(controls, "LEVEL");
  } else if (kind === "NOISE") {
    push(outputs, "WHITE");
    push(outputs, "PINK");
    push(controls, "LEVEL");
  } else if (kind === "WAVESHAPER") {
    push(inputs, "IN");
    push(inputs, "CV");
    push(outputs, "OUT");
    ["DRIVE", "OFFSET"].forEach((control) => push(controls, control));
  } else {
    push(inputs, "IN");
    push(outputs, "OUT");
    push(controls, "LEVEL");
  }

  const notes = [
    "Circuit architecture is a planning sketch. It is not electrically validated.",
    "Prices are demo estimates, not supplier quotes.",
  ];
  if (!functionKnown) {
    notes.unshift("No clear function was named. This is being treated as a utility until you say otherwise.");
  }
  if (!hpMatch) notes.push("HP was inferred from the function. Change it if the panel needs to be wider.");
  if (kind === "SAMPLER") notes.push("No firmware is generated. A sampler here is a mechanical and commercial shell.");

  const confidence: InterpretedSpec["confidence"] = {
    function: functionKnown ? "HIGH" : "MEDIUM",
    hp: hpMatch ? "HIGH" : "ESTIMATED",
    inputs: functionKnown ? "HIGH" : "MEDIUM",
    outputs: features.includes("SUB") || features.includes("WAVEFOLD") ? "HIGH" : "MEDIUM",
    controls: "MEDIUM",
    power: "ESTIMATED",
    character: character.length ? "HIGH" : "ESTIMATED",
    budget: budget != null ? "USER-SUPPLIED" : "ESTIMATED",
    componentCost: "ESTIMATED",
    architecture: "UNVERIFIED",
  };

  return {
    prompt: text,
    name: designName(kind, text),
    functionLabel: label,
    functionKind: kind,
    hp,
    inputs,
    outputs,
    controls,
    power: powerFor(BASE_POWER[kind], "standard", features.length),
    character: character.length ? character : ["Unspecified"],
    budget,
    synthesis,
    features,
    difficulty: difficultyFor(kind, "standard", features.length),
    confidence,
    notes,
  };
}

export function generateTierOptions(spec: InterpretedSpec): DesignTier[] {
  const featureCost = FEATURE_DEFS.filter((feature) => spec.features.includes(feature.label)).reduce(
    (sum, feature) => sum + feature.cost,
    0,
  );
  const hpDelta = Math.max(0, spec.hp - BASE_HP[spec.functionKind]) * 3;
  const standard = Math.round(BASE_COST[spec.functionKind] + featureCost + hpDelta);
  const costs: Record<TierId, number> = {
    economy: Math.max(24, Math.round(standard * 0.64)),
    standard,
    luxury: Math.round(standard * 1.72),
  };
  const meta: Record<TierId, { name: string; tagline: string }> = {
    economy: { name: "ECONOMY", tagline: "Get it working." },
    standard: { name: "STANDARD", tagline: "Best balance." },
    luxury: { name: "LUXURY", tagline: "Build without compromise." },
  };
  return (["economy", "standard", "luxury"] as TierId[]).map((id) => ({
    id,
    name: meta[id].name,
    tagline: meta[id].tagline,
    estimatedCost: costs[id],
    hp: spec.hp,
    power: powerFor(BASE_POWER[spec.functionKind], id, spec.features.length),
    componentCount: partsFor(spec.functionKind, id, spec.features.length),
    difficulty: difficultyFor(spec.functionKind, id, spec.features.length),
    buildTime: hoursFor(id, spec.functionKind),
    architecture: architectureFor(spec.functionKind, id, spec.features),
    advantages: advantagesFor(spec.functionKind, id, spec.features),
    compromises: compromisesFor(id, spec.features),
    performance: performanceFor(id),
    upgradeability: upgradeFor(id),
  }));
}

export function generateModuleDesign(prompt: string): ModuleDesign {
  const spec = interpretPrompt(prompt);
  const tiers = generateTierOptions(spec);
  const standard = tiers.find((tier) => tier.id === "standard");
  const economy = tiers.find((tier) => tier.id === "economy");
  if (spec.budget != null && standard && standard.estimatedCost > spec.budget) {
    spec.notes.push(`Standard is estimated at $${standard.estimatedCost}, above the stated $${spec.budget}.`);
  }
  if (spec.budget != null && economy && economy.estimatedCost > spec.budget) {
    spec.notes.push("Even the economy pass is above the stated budget. Use Make It Cheaper, or change the brief.");
  }
  return {
    id: `des_${hashString(prompt.trim().toLowerCase()).toString(16)}`,
    name: spec.name,
    prompt: prompt.trim(),
    spec,
    tiers,
    selectedTier: "standard",
    leverIds: [],
    costTarget: spec.budget,
    createdAt: new Date().toISOString(),
  };
}

export function leversFor(design: ModuleDesign, tierId: TierId = design.selectedTier): CostLever[] {
  const tier = design.tiers.find((item) => item.id === tierId) ?? design.tiers[1];
  if (!tier) return [];
  const cost = tier.estimatedCost;
  const has = (label: string) => design.spec.features.includes(label);
  const raw: { id: string; change: string; ratio: number; min: number; tradeoff: string; severity: number; when?: boolean }[] = [
    {
      id: "silk",
      change: "Minimal silkscreen",
      ratio: 0.02,
      min: 2,
      severity: 1,
      tradeoff: "The legend gets sparse. You build from the sheet, not the board.",
    },
    {
      id: "panel",
      change: "Reduce panel hardware",
      ratio: 0.045,
      min: 3,
      severity: 2,
      tradeoff: "Fewer dress nuts, no threaded standoffs, thinner panel. It still mounts. It feels less solid.",
    },
    {
      id: "pot",
      change: "Substitute potentiometer",
      ratio: 0.055,
      min: 4,
      severity: 3,
      tradeoff: "Generic carbon pots instead of sealed conductive plastic. Worse feel, shorter life, more scratch.",
    },
    {
      id: "resistors",
      change: "Carbon film in non-critical spots",
      ratio: 0.03,
      min: 2,
      severity: 4,
      tradeoff: "Worse tolerance where the ear will not care. Keep 1% parts on the pitch core.",
    },
    {
      id: "pcb",
      change: "2-layer PCB, no gold",
      ratio: 0.06,
      min: 4,
      severity: 5,
      tradeoff: "Harder routing, weaker ground, a bit more noise coupling.",
    },
    {
      id: "opamp",
      change: "Remove premium op-amp",
      ratio: 0.07,
      min: 5,
      severity: 6,
      tradeoff: "Higher noise and less drive into long patches. Fine for a dirty voice. Poor if you wanted a clean sine.",
    },
    {
      id: "sync",
      change: "Simplify hard sync",
      ratio: 0.04,
      min: 3,
      severity: 7,
      when: has("SYNC"),
      tradeoff: "Sync gets harsher and less predictable. For industrial use that may be acceptable.",
    },
    {
      id: "sub",
      change: "Fixed sub, no level trim",
      ratio: 0.05,
      min: 4,
      severity: 8,
      when: has("SUB"),
      tradeoff: "The sub is a square sitting under the oscillator. One less knob.",
    },
    {
      id: "output",
      change: "Simplify output stage",
      ratio: 0.09,
      min: 6,
      severity: 9,
      tradeoff: "One shared buffer instead of an output per waveform. You switch. Impedance goes up.",
    },
    {
      id: "fold",
      change: "Passive diode wavefolder",
      ratio: 0.08,
      min: 5,
      severity: 10,
      when: has("WAVEFOLD"),
      tradeoff: "Less range, more level dependence, no symmetry trim.",
    },
  ];
  return raw
    .filter((lever) => lever.when !== false)
    .map((lever) => ({
      id: lever.id,
      change: lever.change,
      save: Math.max(lever.min, Math.round(cost * lever.ratio)),
      tradeoff: lever.tradeoff,
      severity: lever.severity,
    }));
}

export function suggestLevers(baseline: number, levers: CostLever[], target: number) {
  const floor = Math.max(24, Math.round(baseline * 0.62));
  const ordered = [...levers].sort((a, b) => a.severity - b.severity);
  const selected: string[] = [];
  let cost = baseline;
  for (const lever of ordered) {
    if (cost <= target) break;
    if (cost - lever.save < floor) continue;
    selected.push(lever.id);
    cost -= lever.save;
  }
  return { selected, floor, reached: cost <= target };
}

export function priceWithLevers(baseline: number, levers: CostLever[], selected: string[]) {
  const chosen = levers.filter((lever) => selected.includes(lever.id));
  const savings = chosen.reduce((sum, lever) => sum + lever.save, 0);
  return {
    savings,
    newCost: Math.max(0, baseline - savings),
    chosen,
  };
}

export function designQuote(design: ModuleDesign) {
  const tier = design.tiers.find((item) => item.id === design.selectedTier) ?? design.tiers[1]!;
  const levers = leversFor(design, tier.id);
  const priced = priceWithLevers(tier.estimatedCost, levers, design.leverIds);
  return { tier, levers, ...priced };
}

function packageFromTier(tier: DesignTier): TierPackage {
  return {
    cost: tier.estimatedCost,
    power: tier.power,
    architecture: tier.architecture,
    difficulty: tier.difficulty,
    hours: tier.buildTime,
    parts: tier.componentCount,
    hp: tier.hp,
  };
}

export function rackModuleFromDesign(design: ModuleDesign): RackModule {
  const quote = designQuote(design);
  const tierBook = {
    economy: packageFromTier(design.tiers[0]!),
    standard: packageFromTier(design.tiers[1]!),
    luxury: packageFromTier(design.tiers[2]!),
  } satisfies Record<TierId, TierPackage>;
  const adjustments = quote.chosen.map((lever) => `${lever.change}: ${lever.tradeoff}`);
  return {
    instanceId: uid("mod"),
    sourceId: design.id,
    name: design.name,
    hp: quote.tier.hp,
    power: quote.tier.power,
    cost: quote.newCost,
    tier: quote.tier.id,
    functionKind: design.spec.functionKind,
    functionLabel: design.spec.functionLabel,
    architecture: adjustments.length
      ? `${quote.tier.architecture} Cost cuts applied: ${adjustments.join(" ")}`
      : quote.tier.architecture,
    difficulty: quote.tier.difficulty,
    character: design.spec.character,
    inputs: design.spec.inputs,
    outputs: design.spec.outputs,
    controls: design.spec.controls,
    features: design.spec.features,
    buildTime: quote.tier.buildTime,
    parts: quote.tier.componentCount,
    tone: panelTone(design.spec.functionKind, hashString(design.name)),
    tierBook,
    adjustments,
  };
}

function packageFromCatalog(mod: CatalogModule, tier: TierId): TierPackage {
  const cost = tierCost(mod.standardCost, tier);
  const mul = tier === "economy" ? 0.8 : tier === "luxury" ? 1.15 : 1;
  return {
    cost,
    power: {
      p12: Math.round(mod.power.p12 * mul),
      n12: Math.round(mod.power.n12 * mul),
      p5: Math.round(mod.power.p5 * (tier === "luxury" ? 1.1 : tier === "economy" ? 0.85 : 1)),
    },
    architecture: architectureFor(mod.kind, tier, mod.features),
    difficulty: tier === "luxury" ? bump(mod.difficulty) : tier === "economy" && mod.difficulty === "ADVANCED" ? "INTERMEDIATE" : mod.difficulty,
    hours: hoursFor(tier, mod.kind),
    parts: Math.max(6, Math.round(mod.baseParts * (tier === "economy" ? 0.75 : tier === "luxury" ? 1.25 : 1))),
    hp: mod.hp,
  };
}

export function moduleFromCatalog(id: string, tier: TierId): RackModule | null {
  const mod = getModule(id);
  if (!mod) return null;
  const book = {
    economy: packageFromCatalog(mod, "economy"),
    standard: packageFromCatalog(mod, "standard"),
    luxury: packageFromCatalog(mod, "luxury"),
  };
  const current = book[tier];
  return {
    instanceId: uid("mod"),
    sourceId: mod.id,
    name: mod.name,
    hp: current.hp,
    power: current.power,
    cost: current.cost,
    tier,
    functionKind: mod.kind,
    functionLabel: mod.label,
    architecture: current.architecture,
    difficulty: current.difficulty,
    character: mod.character,
    inputs: mod.inputs,
    outputs: mod.outputs,
    controls: mod.controls,
    features: mod.features,
    buildTime: current.hours,
    parts: current.parts,
    tone: panelTone(mod.kind, hashString(mod.id)),
    tierBook: book,
    adjustments: [],
  };
}

export function sumPower(modules: RackModule[]): PowerDraw {
  return modules.reduce(
    (total, mod) => ({
      p12: total.p12 + mod.power.p12,
      n12: total.n12 + mod.power.n12,
      p5: total.p5 + mod.power.p5,
    }),
    { p12: 0, n12: 0, p5: 0 },
  );
}

export function packRows(modules: RackModule[], rowCount: number, hpPerRow: number) {
  const rows: RackModule[][] = Array.from({ length: Math.max(1, rowCount) }, () => []);
  let index = 0;
  for (const mod of modules) {
    const used = rows[index]!.reduce((sum, item) => sum + item.hp, 0);
    if (used + mod.hp > hpPerRow && index < rows.length - 1) index += 1;
    rows[index]!.push(mod);
  }
  return rows;
}

function applyTier(mod: RackModule, tier: TierId): RackModule {
  const next = mod.tierBook[tier];
  return {
    ...mod,
    tier,
    cost: next.cost,
    power: next.power,
    architecture: next.architecture,
    difficulty: next.difficulty,
    buildTime: next.hours,
    parts: next.parts,
    hp: next.hp,
    adjustments: [],
  };
}

function maxDifficulty(levels: Difficulty[]): Difficulty {
  return levels.reduce<Difficulty>((current, level) => (DIFFICULTY_RANK[level] > DIFFICULTY_RANK[current] ? level : current), "BEGINNER");
}

const DROP_LAST = ["line-out", "iron-core", "gate-vca"];

export function generateSystem(request: SystemRequest): SystemProposal {
  const preset = STYLE_PRESETS.find((item) => item.id === request.style) ?? STYLE_PRESETS[0]!;
  const changes: string[] = [];
  let ids = [...(BLUEPRINTS[request.style] ?? BLUEPRINTS.custom)];
  if (request.experience === "BEGINNER") {
    if (ids.includes("grain-bin")) {
      ids = ids.filter((id) => id !== "grain-bin");
      if (!ids.includes("drift-lfo")) ids.splice(2, 0, "drift-lfo");
      changes.push("Removed the granular sampler. A beginner brief should not start with unwritten firmware.");
    }
  }
  const excluded = request.exclude.toLowerCase();
  if (excluded.trim()) {
    ids = ids.filter((id) => {
      const mod = getModule(id);
      if (!mod) return false;
      const blob = `${mod.name} ${mod.kind} ${mod.label}`.toLowerCase();
      const hit = excluded.split(/[,/]| and /).some((part) => part.trim().length > 2 && blob.includes(part.trim()));
      if (hit) changes.push(`Excluded ${mod.name} because the brief said to avoid it.`);
      return !hit;
    });
  }

  let slots = ids
    .map((id) => getModule(id))
    .filter((mod): mod is CatalogModule => Boolean(mod))
    .map((mod) => ({
      mod,
      tier: (request.experience === "BEGINNER" ? "economy" : "standard") as TierId,
    }));

  if (request.experience === "EXPERT" || request.experience === "ADVANCED") {
    const voice = slots.find((slot) => slot.mod.kind === "VCO");
    if (voice) {
      voice.tier = "luxury";
      changes.push(`${voice.mod.name} starts at luxury because the brief asked for a higher experience build.`);
    }
  }

  const costOf = () => slots.reduce((sum, slot) => sum + tierCost(slot.mod.standardCost, slot.tier), 0);
  const hpOf = () => slots.reduce((sum, slot) => sum + slot.mod.hp, 0);
  const powerOf = () =>
    slots.reduce(
      (total, slot) => {
        const mul = slot.tier === "economy" ? 0.8 : slot.tier === "luxury" ? 1.15 : 1;
        return {
          p12: total.p12 + Math.round(slot.mod.power.p12 * mul),
          n12: total.n12 + Math.round(slot.mod.power.n12 * mul),
          p5: total.p5 + Math.round(slot.mod.power.p5 * mul),
        };
      },
      { p12: 0, n12: 0, p5: 0 },
    );

  const protectedId = (id: string) => id === "line-out" || id === "iron-core";

  while (costOf() > request.budget) {
    const downgrade = [...slots].reverse().find((slot) => slot.tier !== "economy");
    if (downgrade) {
      const from = downgrade.tier;
      downgrade.tier = from === "luxury" ? "standard" : "economy";
      changes.push(`Moved ${downgrade.mod.name} from ${from} to ${downgrade.tier} to meet the budget.`);
      continue;
    }
    const drop = [...slots].reverse().find((slot) => !protectedId(slot.mod.id) && !DROP_LAST.includes(slot.mod.id));
    if (!drop) break;
    slots = slots.filter((slot) => slot !== drop);
    changes.push(`Removed ${drop.mod.name}. Keeping it would miss the budget, and the voice still stands without it.`);
  }

  while (hpOf() > request.hp * request.rows) {
    const wide = [...slots].reverse().find((slot) => slot.mod.compactHp && slot.mod.hp !== slot.mod.compactHp);
    if (wide?.mod.compactHp) {
      changes.push(`${wide.mod.name} is noted as a ${wide.mod.compactHp}HP compact face because the case is short on space.`);
      wide.mod = { ...wide.mod, hp: wide.mod.compactHp };
      continue;
    }
    const drop = [...slots].reverse().find((slot) => !protectedId(slot.mod.id));
    if (!drop) break;
    slots = slots.filter((slot) => slot !== drop);
    changes.push(`Removed ${drop.mod.name} to fit the stated HP.`);
  }

  let guard = 0;
  while (guard < 8) {
    const power = powerOf();
    if (power.p12 <= request.powerP12 && power.n12 <= request.powerN12 && power.p5 <= request.powerP5) break;
    const hungry = [...slots].reverse().find((slot) => !protectedId(slot.mod.id) && (slot.mod.power.p12 > 40 || slot.mod.power.p5 > 0));
    if (!hungry) break;
    if (hungry.tier !== "economy") {
      hungry.tier = "economy";
      changes.push(`${hungry.mod.name} dropped to economy to pull power down.`);
    } else {
      slots = slots.filter((slot) => slot !== hungry);
      changes.push(`Removed ${hungry.mod.name} because the rails do not have room for it.`);
    }
    guard += 1;
  }

  while (request.budget - costOf() >= 70) {
    const upgrade = slots.find((slot) => slot.tier !== "luxury" && (slot.mod.kind === "VCO" || slot.mod.kind === "VCF" || slot.mod.kind === "OUTPUT"));
    if (!upgrade) break;
    const from = upgrade.tier;
    upgrade.tier = from === "economy" ? "standard" : "luxury";
    if (costOf() > request.budget) {
      upgrade.tier = from;
      break;
    }
    changes.push(`Upgraded ${upgrade.mod.name} from ${from} to ${upgrade.tier}. The budget had room and this is the part you hear.`);
  }

  const modules = slots
    .map((slot) => moduleFromCatalog(slot.mod.id, slot.tier))
    .filter((mod): mod is RackModule => Boolean(mod))
    .map((mod, index) => {
      const source = slots[index];
      if (source && source.mod.hp !== getModule(source.mod.id)?.hp) {
        return { ...mod, hp: source.mod.hp };
      }
      return mod;
    });

  const moduleCost = modules.reduce((sum, mod) => sum + mod.cost, 0);
  const allowances = [];
  const room = request.budget - moduleCost;
  if (room >= 22) {
    const cable = Math.min(28, room);
    allowances.push({
      label: "Patch cables",
      cost: cable,
      note: "A small demo allowance for cables. Not a specific brand.",
    });
  }

  const power = sumPower(modules);
  const hp = modules.reduce((sum, mod) => sum + mod.hp, 0);
  const spent = moduleCost + allowances.reduce((sum, item) => sum + item.cost, 0);
  const difficulty = maxDifficulty(modules.map((mod) => mod.difficulty));
  const sacrifice = [
    room >= 22 ? "A powered case is not in this total." : "Patch cables and a powered case are not in this total.",
    "A modest powered 84HP skiff is roughly $160–$220 in this demo catalog, and it would consume the module budget.",
  ];
  if (!modules.some((mod) => mod.functionKind === "SEQUENCER")) {
    sacrifice.push("No sequencer. You play it, or you clock it from something you already own.");
  }
  if (!modules.some((mod) => mod.functionKind === "DELAY" || mod.functionKind === "DISTORTION")) {
    sacrifice.push("No effect. The voice is dry.");
  }
  if (request.existing.trim()) {
    sacrifice.push(`You listed existing gear (“${request.existing.trim()}”). It was not subtracted, because this bench cannot see your case.`);
  }

  const why = [
    `${preset.note}`,
    "A playable system needs a source, something to shape it, something to open and close it, and a way to leave the case.",
    modules.some((mod) => mod.functionKind === "SEQUENCER")
      ? "A sequencer is included so the rack makes a pattern without a computer."
      : "Modulation is included so the sound moves without a sequencer.",
  ];

  const upgrade = [
    "Move the oscillator or filter up a tier before adding a second voice.",
    "Add a sequencer only after the voice is one you want to repeat.",
    "Buy the case when the module list stops changing.",
  ];

  return {
    title: `$${request.budget} ${preset.label}`,
    style: request.style,
    items: slots.map((slot) => ({ moduleId: slot.mod.id, tier: slot.tier })),
    modules,
    rows: packRows(modules, request.rows, request.hp),
    cost: spent,
    hp,
    hpCapacity: request.hp * request.rows,
    power,
    powerCapacity: { p12: request.powerP12, n12: request.powerN12, p5: request.powerP5 },
    difficulty,
    withinPower: power.p12 <= request.powerP12 && power.n12 <= request.powerN12 && power.p5 <= request.powerP5,
    withinHp: hp <= request.hp * request.rows,
    withinBudget: spent <= request.budget,
    allowances,
    whatYouGet: modules.map((mod) => `${mod.name} — ${mod.functionLabel} — ${mod.hp}HP — $${mod.cost} ${mod.tier}`),
    why,
    sacrifice,
    upgrade,
    changes,
    purpose: request.purpose || preset.purpose,
    caseName: "PROPOSED SYSTEM",
  };
}

function flatten(rows: RackModule[][]) {
  return rows.flat();
}

export function optimizeSystem(system: SystemProject, mode: OptimizeMode): {
  rows: RackModule[][];
  allowances: SystemProject["allowances"];
  changes: OptimizeChange[];
} {
  let modules = flatten(system.rows).map((mod) => ({ ...mod, tierBook: mod.tierBook, adjustments: [...mod.adjustments] }));
  const changes: OptimizeChange[] = [];
  const budget = system.case.budget;

  const setTier = (mod: RackModule, tier: TierId, why: string) => {
    if (mod.tier === tier && mod.cost === mod.tierBook[tier].cost) return mod;
    changes.push({
      title: `${mod.name} → ${tier}`,
      detail: why,
    });
    return applyTier(mod, tier);
  };

  if (mode === "LOWEST COST") {
    modules = modules.map((mod) =>
      setTier(mod, "economy", `Economy parts. Saved about $${Math.max(0, mod.cost - mod.tierBook.economy.cost)}. You give up the better buffers, panel, and tolerances.`),
    );
  }

  if (mode === "MAXIMUM FUNCTIONALITY" || mode === "BEST PERFORMANCE") {
    let running = 0;
    modules = modules.map((mod) => {
      const want = mode === "BEST PERFORMANCE" && !["VCO", "VCF", "VCA", "OUTPUT", "DISTORTION", "DRUM"].includes(mod.functionKind)
        ? "standard"
        : "luxury";
      const nextCost = mod.tierBook[want].cost;
      if (running + nextCost > budget && want === "luxury") {
        running += mod.tierBook.standard.cost;
        return setTier(mod, "standard", "Luxury would break the system budget, so this stays at standard.");
      }
      running += nextCost;
      return setTier(mod, want, mode === "BEST PERFORMANCE" ? "Performance budget went to the parts you hear." : "Full function and the better parts, while the budget holds.");
    });
  }

  if (mode === "LOWEST HP") {
    modules = modules.map((mod) => {
      const catalog = getModule(mod.sourceId);
      const compact = catalog?.compactHp;
      if (compact && compact < mod.hp) {
        changes.push({
          title: `${mod.name} narrowed to ${compact}HP`,
          detail: "Compact panel. Fewer jacks fit, and the knobs get cramped. The circuit idea does not get smaller for free.",
        });
        return { ...mod, hp: compact };
      }
      if (mod.hp > 4) {
        const hp = Math.max(4, mod.hp - 2);
        changes.push({
          title: `${mod.name} narrowed to ${hp}HP`,
          detail: "Two HP given back by crowding the panel. Wiring and service get worse.",
        });
        return { ...mod, hp };
      }
      return mod;
    });
  }

  if (mode === "LOWEST POWER") {
    const ranked = [...modules].sort((a, b) => b.power.p12 + b.power.p5 - (a.power.p12 + a.power.p5));
    const victim = ranked.find((mod) => mod.functionKind !== "VCO" && mod.functionKind !== "OUTPUT" && mod.functionKind !== "VCA");
    modules = modules.map((mod) => setTier(mod, "economy", "Economy power figures assume fewer buffers and no local regulators."));
    if (victim && modules.length > 3) {
      modules = modules.filter((mod) => mod.instanceId !== victim.instanceId);
      changes.push({
        title: `Removed ${victim.name}`,
        detail: "It was one of the heavier draws and the voice still exists without it.",
      });
    }
  }

  if (mode === "BEST BEGINNER SYSTEM") {
    modules = modules
      .filter((mod) => {
        if (DIFFICULTY_RANK[mod.tierBook.economy.difficulty] >= DIFFICULTY_RANK.ADVANCED) {
          changes.push({ title: `Removed ${mod.name}`, detail: "Too much build risk for a first system." });
          return false;
        }
        return true;
      })
      .map((mod) => setTier(mod, "economy", "Beginner pass uses the smaller BOM and the clearer build."));
  }

  if (mode === "BEST INDUSTRIAL SYSTEM") {
    modules = modules.map((mod) => {
      if (mod.functionKind === "VCO" || mod.functionKind === "DISTORTION" || mod.functionKind === "NOISE") {
        return setTier(mod, "standard", "Industrial weight sits on the source and the dirt, not on a luxury sine.");
      }
      return mod;
    });
    if (!modules.some((mod) => mod.functionKind === "DISTORTION")) {
      const grit = moduleFromCatalog("grit", "standard");
      if (grit) {
        modules.push(grit);
        changes.push({ title: "Added GRIT", detail: "An industrial system without a distortion stage is just a subtractive voice." });
      }
    }
    if (!modules.some((mod) => mod.functionKind === "NOISE")) {
      const noise = moduleFromCatalog("noise-wall", "economy");
      if (noise) {
        modules.push(noise);
        changes.push({ title: "Added NOISE WALL", detail: "A noise source gives the filter something ugly to chew on." });
      }
    }
  }

  if (mode === "BEST EXPERIMENTAL SYSTEM") {
    if (!modules.some((mod) => mod.functionKind === "RANDOM")) {
      const random = moduleFromCatalog("static-4", "standard");
      if (random) {
        modules.push(random);
        changes.push({ title: "Added STATIC", detail: "Experimental systems need a voltage that is not a metronome." });
      }
    }
    if (!modules.some((mod) => mod.functionKind === "WAVESHAPER")) {
      const fold = moduleFromCatalog("fold-6", "standard");
      if (fold) {
        modules.push(fold);
        changes.push({ title: "Added FOLD", detail: "A folder is the cheapest way to make a simple oscillator misbehave." });
      }
    }
  }

  if (!changes.length) {
    changes.push({ title: "No change", detail: "The rack already matches this pass, or there was nothing safe to move." });
  }

  return {
    rows: packRows(modules, system.case.rows, system.case.hpPerRow),
    allowances: system.allowances,
    changes,
  };
}

export function systemStats(system: SystemProject) {
  const rows = system.rows;
  const modules = flatten(rows);
  const usedByRow = rows.map((row) => row.reduce((sum, mod) => sum + mod.hp, 0));
  const usedHp = usedByRow.reduce((sum, value) => sum + value, 0);
  const totalHp = system.case.rows * system.case.hpPerRow;
  const power = sumPower(modules);
  const moduleCost = modules.reduce((sum, mod) => sum + mod.cost, 0);
  const allowanceCost = system.allowances.reduce((sum, item) => sum + item.cost, 0);
  const warnings: string[] = [];
  usedByRow.forEach((used, index) => {
    if (used > system.case.hpPerRow) warnings.push(`ROW ${index + 1}: INSUFFICIENT HP (${used}/${system.case.hpPerRow})`);
  });
  if (power.p12 > system.case.powerP12 || power.n12 > system.case.powerN12 || power.p5 > system.case.powerP5) {
    warnings.push("POWER CAPACITY EXCEEDED");
  }
  if (moduleCost + allowanceCost > system.case.budget) warnings.push("BUDGET EXCEEDED");
  return {
    modules,
    usedByRow,
    usedHp,
    totalHp,
    remainingHp: totalHp - usedHp,
    power,
    moduleCost,
    allowanceCost,
    cost: moduleCost + allowanceCost,
    warnings,
    difficulty: modules.length ? maxDifficulty(modules.map((mod) => mod.difficulty)) : null,
  };
}

export function emptyCase(name = "BENCH 01"): SystemProject["case"] {
  return {
    rows: 2,
    hpPerRow: 84,
    powerP12: 2000,
    powerN12: 2000,
    powerP5: 500,
    budget: 1000,
    name,
  };
}

export const OPTIMIZE_MODES: OptimizeMode[] = [
  "LOWEST COST",
  "MAXIMUM FUNCTIONALITY",
  "LOWEST HP",
  "LOWEST POWER",
  "BEST BEGINNER SYSTEM",
  "BEST PERFORMANCE",
  "BEST INDUSTRIAL SYSTEM",
  "BEST EXPERIMENTAL SYSTEM",
];

export function defaultRequest(partial: Partial<SystemRequest> = {}): SystemRequest {
  return {
    budget: 500,
    hp: 84,
    rows: 1,
    powerP12: 2000,
    powerN12: 2000,
    powerP5: 500,
    purpose: "Give me a complete playable system.",
    experience: "INTERMEDIATE",
    style: "industrial",
    character: "",
    existing: "",
    exclude: "",
    ...partial,
  };
}

export function confidenceLabel(value: Confidence) {
  return value;
}
