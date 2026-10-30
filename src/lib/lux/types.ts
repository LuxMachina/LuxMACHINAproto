export type Confidence =
  | "HIGH"
  | "MEDIUM"
  | "ESTIMATED"
  | "CALCULATED"
  | "DEMO DATA"
  | "UNVERIFIED"
  | "USER-SUPPLIED"
  | "VERIFIED";

export type FunctionKind =
  | "VCO"
  | "VCF"
  | "VCA"
  | "LFO"
  | "EG"
  | "MIXER"
  | "SEQUENCER"
  | "RANDOM"
  | "DISTORTION"
  | "SAMPLER"
  | "DELAY"
  | "UTILITY"
  | "DRUM"
  | "OUTPUT"
  | "NOISE"
  | "WAVESHAPER";

export type Difficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";

export type TierId = "economy" | "standard" | "luxury";

export type PanelTone = "graphite" | "soot" | "bone";

export interface PowerDraw {
  p12: number;
  n12: number;
  p5: number;
}

export interface InterpretedSpec {
  prompt: string;
  name: string;
  functionLabel: string;
  functionKind: FunctionKind;
  hp: number;
  inputs: string[];
  outputs: string[];
  controls: string[];
  power: PowerDraw;
  character: string[];
  budget: number | null;
  synthesis: string;
  features: string[];
  difficulty: Difficulty;
  confidence: {
    function: Confidence;
    hp: Confidence;
    inputs: Confidence;
    outputs: Confidence;
    controls: Confidence;
    power: Confidence;
    character: Confidence;
    budget: Confidence;
    componentCost: Confidence;
    architecture: Confidence;
  };
  notes: string[];
}

export interface DesignTier {
  id: TierId;
  name: string;
  tagline: string;
  estimatedCost: number;
  hp: number;
  power: PowerDraw;
  componentCount: number;
  difficulty: Difficulty;
  buildTime: string;
  architecture: string;
  advantages: string[];
  compromises: string[];
  performance: string[];
  upgradeability: string[];
}

export interface CostLever {
  id: string;
  change: string;
  save: number;
  tradeoff: string;
  severity: number;
}

export interface ModuleDesign {
  id: string;
  name: string;
  prompt: string;
  spec: InterpretedSpec;
  tiers: DesignTier[];
  selectedTier: TierId;
  leverIds: string[];
  costTarget: number | null;
  createdAt: string;
}

export interface TierPackage {
  cost: number;
  power: PowerDraw;
  architecture: string;
  difficulty: Difficulty;
  hours: string;
  parts: number;
  hp: number;
}

export interface RackModule {
  instanceId: string;
  sourceId: string;
  name: string;
  hp: number;
  power: PowerDraw;
  cost: number;
  tier: TierId;
  functionKind: FunctionKind;
  functionLabel: string;
  architecture: string;
  difficulty: Difficulty;
  character: string[];
  inputs: string[];
  outputs: string[];
  controls: string[];
  features: string[];
  buildTime: string;
  parts: number;
  tone: PanelTone;
  tierBook: Record<TierId, TierPackage>;
  adjustments: string[];
}

export interface Allowance {
  label: string;
  cost: number;
  note: string;
}

export interface CaseSettings {
  rows: number;
  hpPerRow: number;
  powerP12: number;
  powerN12: number;
  powerP5: number;
  budget: number;
  name: string;
}

export interface SystemProject {
  id: string;
  name: string;
  case: CaseSettings;
  rows: RackModule[][];
  allowances: Allowance[];
  createdAt: string;
  updatedAt: string;
  builtAt: string | null;
}

export const BOM_CATEGORIES = [
  "INTEGRATED CIRCUITS",
  "RESISTORS",
  "CAPACITORS",
  "DIODES",
  "TRANSISTORS",
  "POTENTIOMETERS",
  "JACKS",
  "CONNECTORS",
  "PCB",
  "PANEL",
  "HARDWARE",
  "WIRING",
  "OTHER",
] as const;

export type BomCategory = (typeof BOM_CATEGORIES)[number];

export interface BomItem {
  id: string;
  category: BomCategory;
  part: string;
  quantity: number;
  unitCost: number;
  total: number;
  confidence: "ESTIMATED" | "DEMO DATA";
  alternative: string;
  moduleName: string;
}

export interface CostBreakdown {
  components: number;
  pcb: number;
  panel: number;
  hardware: number;
  assembly: number;
  assemblyNote: string;
  shipping: number;
  buildCost: number;
  landed: number;
  low: number;
  high: number;
}

export type OptimizeMode =
  | "LOWEST COST"
  | "MAXIMUM FUNCTIONALITY"
  | "LOWEST HP"
  | "LOWEST POWER"
  | "BEST BEGINNER SYSTEM"
  | "BEST PERFORMANCE"
  | "BEST INDUSTRIAL SYSTEM"
  | "BEST EXPERIMENTAL SYSTEM";

export interface OptimizeChange {
  title: string;
  detail: string;
}

export type StyleId =
  | "industrial"
  | "ambient"
  | "techno"
  | "experimental"
  | "west"
  | "east"
  | "noise"
  | "drone"
  | "live"
  | "studio"
  | "moog"
  | "custom";

export type Experience = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";

export interface SystemRequest {
  budget: number;
  hp: number;
  rows: number;
  powerP12: number;
  powerN12: number;
  powerP5: number;
  purpose: string;
  experience: Experience;
  style: StyleId;
  character: string;
  existing: string;
  exclude: string;
}

export interface SystemProposal {
  title: string;
  style: StyleId;
  items: { moduleId: string; tier: TierId }[];
  modules: RackModule[];
  rows: RackModule[][];
  cost: number;
  hp: number;
  hpCapacity: number;
  power: PowerDraw;
  powerCapacity: PowerDraw;
  difficulty: Difficulty;
  withinPower: boolean;
  withinHp: boolean;
  withinBudget: boolean;
  allowances: Allowance[];
  whatYouGet: string[];
  why: string[];
  sacrifice: string[];
  upgrade: string[];
  changes: string[];
  purpose: string;
  caseName: string;
}

export interface LocalComment {
  id: string;
  postId: string;
  text: string;
  at: string;
}

export const DEMO_PROMPT =
  "Design me an 8HP analog oscillator for industrial music. I want FM, hard sync, a sub oscillator, wavefolding and a filthy unstable character. Keep it under $100.";

export const DIFFICULTY_RANK: Record<Difficulty, number> = {
  BEGINNER: 0,
  INTERMEDIATE: 1,
  ADVANCED: 2,
  EXPERT: 3,
};
