import { readFixtureJson } from "../utils/fixturesPath";

export type DetectionStage = "import" | "preflight" | "pre-generate" | "post-generate" | "ui-display";
export type DetectionModality = "IMG" | "VID" | "AUD" | "FX";

export interface DetectionRegistryEntry {
  id: string;
  level: "DC" | "PC" | "GC" | "IC" | "GAP" | "PR";
  domain: string;
  chainId: string;
  description: string;
  fieldPaths: string[];
  tier: ("T1" | "T2" | "T3")[];
  stage: DetectionStage[];
  severity: "BLOCK" | "WARN" | "INFO";
  modality?: DetectionModality | null;
  handler: string;
  runtimeHooks: string[];
  implemented: boolean;
  repairHintId?: string;
}

export interface DetectionRegistry {
  version: string;
  description: string;
  generatedAt?: string;
  entries: DetectionRegistryEntry[];
}

export interface DetectionResult {
  id: string;
  level: DetectionRegistryEntry["level"];
  domain: string;
  chainId: string;
  description: string;
  severity: "BLOCK" | "WARN" | "INFO";
  passed: boolean;
  message: string;
  shotIndex?: number;
  fieldPaths?: string[];
  repairHintId?: string;
}

export function loadDetectionRegistry(): DetectionRegistry {
  return readFixtureJson<DetectionRegistry>("closure_detection_registry.json", {
    version: "2.0.1",
    description: "",
    entries: [],
  });
}

export function filterRegistryEntries(
  registry: DetectionRegistry,
  opts: { stage: DetectionStage; tier?: "T1" | "T2" | "T3"; modality?: DetectionModality },
): DetectionRegistryEntry[] {
  const tier = opts.tier ?? "T3";
  return registry.entries.filter((e) => {
    if (!e.stage.includes(opts.stage)) return false;
    if (!e.tier.includes(tier)) return false;
    if (opts.modality && e.modality && e.modality !== opts.modality) return false;
    return true;
  });
}
