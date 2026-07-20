/**
 * Runtime gap IDs for Full Runtime Matrix.
 * New gaps must be registered here before fixes land.
 */
export const RUNTIME_GAP_REGISTRY = [
  { id: "FT-MISS", description: "Forward trace missing required chain" },
  { id: "RV-MISS", description: "Reverse route / bidirectional coverage gap" },
  { id: "HYD-ROLE", description: "characterDesign roles not seeded" },
  { id: "HYD-SCENE", description: "sceneColorLock scenes not seeded" },
  { id: "HYD-PROP", description: "anchorProps tools not seeded" },
  { id: "HYD-SCRIPT-LINK", description: "o_scriptAssets missing seeded assets" },
  { id: "HYD-PANEL-LINK", description: "storyboard asset links incomplete" },
  { id: "HYD-FLOW", description: "scriptPlan/storyboard flowData incomplete" },
  { id: "PROMPT-IMG-EMPTY", description: "image prompt empty after compile" },
  { id: "PROMPT-VID-EMPTY", description: "video prompt empty after compile" },
  { id: "PROMPT-CREF", description: "CHAR-SCENE missing resolvable cref" },
  { id: "PROMPT-COMPILE-NULL", description: "getCompiledPrompt returned null" },
  { id: "PROMPT-VENDOR-STRIP", description: "vendor tokens not stripped" },
  { id: "PROMPT-MULTI-CREF", description: "space-separated multi-cref parse fail" },
  { id: "PROMPT-VID-FIRSTFRAME", description: "first-frame failure reverse target wrong" },
  { id: "PROMPT-AUD", description: "audio slot missing without exemption" },
  { id: "PROMPT-FX", description: "fx slot missing without exemption" },
  { id: "DRV-SHAPE", description: "stateVariants not array after normalize" },
  { id: "DRV-ORPHAN", description: "derivative missing parent assetsId" },
  { id: "DRV-PARENT", description: "derivative parent mismatch" },
  { id: "DRV-PROMPT", description: "derivative prompt empty" },
  { id: "DRV-CODE", description: "derivative remark missing deriveOf" },
  { id: "DRV-UI-LIST", description: "derivative not visible via parent derive" },
  { id: "API-PROMPT-TYPE", description: "generateFlowImage prompt not string" },
  { id: "FE-PROMPT-EVENT", description: "click Event passed as prompt" },
  { id: "FE-CREF-FALSE", description: "false positive missing cref warning" },
  { id: "GEN-REF-PORT", description: "uploadReferenceAsset missing from VM sandbox" },
  { id: "GEN-REF-UPLOAD", description: "ossURL missing or localhost override / public upload fail" },
  { id: "GEN-DERIVE-E2E", description: "derivative generateFlowImage path fail" },
  { id: "GEN-SB-E2E", description: "storyboard generateFlowImage path fail" },
  { id: "GEN-OSSURL", description: "getFileUrl ignores ossURL under dev/Electron" },
  { id: "MODE-TEMPLATE", description: "mode→templatePath adaptive mismatch" },
  { id: "MODE-MEDIA", description: "mode mediaContract min/max mismatch" },
  { id: "MODE-PREFLIGHT", description: "mode media preflight should block" },
  { id: "PROMPT-SB-ITEM-THIN", description: "storyboardItem XML missing required attrs" },
  { id: "FE-BUNDLE-PROMPT", description: "deployed web bundle missing resolveGeneratePrompt" },
  { id: "GEN-QUEUE-LOCAL", description: "local queue incorrectly throws queue full" },
  { id: "GEN-QUEUE-CLASSIFY", description: "queue full not vendor_passthrough" },
  { id: "RV-VENDOR-PASS", description: "vendor_passthrough reverse should be INFRA" },
  { id: "RV-MODE", description: "mode-related reverse trigger target wrong" },
  { id: "GEN-PARENT-REF", description: "derive without parent ref not blocked" },
] as const;

export type RuntimeGapId = (typeof RUNTIME_GAP_REGISTRY)[number]["id"];

export interface RuntimeGap {
  id: string;
  message: string;
  dimension: "A" | "B" | "C" | "D" | "E" | "F" | "M" | "Q" | "R";
}

export class RuntimeGapCollector {
  gaps: RuntimeGap[] = [];

  push(dimension: RuntimeGap["dimension"], id: string, message: string) {
    this.gaps.push({ dimension, id, message });
  }

  byDimension(dim: RuntimeGap["dimension"]): RuntimeGap[] {
    return this.gaps.filter((g) => g.dimension === dim);
  }

  get failed(): boolean {
    return this.gaps.length > 0;
  }
}
