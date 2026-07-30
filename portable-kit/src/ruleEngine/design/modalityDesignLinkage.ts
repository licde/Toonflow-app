import type { ScriptBundle } from "../bundle/types";

const DESIGN_FIELDS: Record<string, string[]> = {
  IMG: ["sceneName", "charCodes", "visualDescription"],
  VID: ["shotSize", "transitionType", "duration", "emotion"],
  AUD: ["narrative.dialogue.lines", "emotion"],
  FX: ["visualEffect", "markers"],
};

export function validateModalityDesignLinkage(bundle: ScriptBundle): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  const shots = bundle.preDesignPack?.shots ?? [];
  const audit = bundle.modalityPromptAudit as { items?: { modality?: string; severity?: string }[] } | undefined;

  const hasLines = shots.some((s) => {
    const lines = (s as { narrative?: { dialogue?: { lines?: unknown[] } } }).narrative?.dialogue?.lines;
    return (lines?.length ?? 0) > 0;
  });
  const hasAud = (audit?.items ?? []).some((i) => i.modality === "AUD");
  if (hasLines && audit?.items?.length && !hasAud) {
    issues.push("SB.lines 存在但 MD-AUD 缺失 (G97/PC-10)");
  }

  for (const [mod, fields] of Object.entries(DESIGN_FIELDS)) {
    const hasDesign = shots.some((s) =>
      fields.some((f) => {
        const parts = f.split(".");
        let cur: unknown = s;
        for (const p of parts) cur = (cur as Record<string, unknown>)?.[p];
        return cur != null && cur !== "";
      }),
    );
    const hasSlot = (audit?.items ?? []).some((i) => i.modality === mod);
    if (hasDesign && audit?.items?.length && !hasSlot && mod !== "FX") {
      issues.push(`设计字段存在但 MD-${mod} slot 缺失`);
    }
  }

  return { passed: issues.length === 0, issues };
}

export function modalityLinkageBlocked(bundle: ScriptBundle): boolean {
  return !validateModalityDesignLinkage(bundle).passed && !!bundle.modalityPromptAudit;
}
