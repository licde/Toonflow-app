/**
 * shotAtomsWriteback — diagnose_only → applied shotAtoms table (homologous subsplit).
 */
import { buildShotAtomsTable } from "../compilers/stillAtomContract";
import { deriveGenerationContract } from "../design/deriveGenerationContract";

export type ShotAtomRow = {
  atomId: string;
  role: string;
  visualHint: string;
};

export function applyShotAtomsOnConfirm(input: {
  shots: Record<string, unknown>[];
  shotIndex?: number;
  force?: boolean;
}): {
  shots: Record<string, unknown>[];
  applied: number[];
  expandProvenance: { mode: "applied" | "diagnose_only"; atomCount: number };
} {
  const applied: number[] = [];
  let atomCount = 0;
  const next = input.shots.map((s) => {
    const idx = Number(s.shotIndex ?? 0);
    if (input.shotIndex != null && idx !== input.shotIndex) return s;
    const vd = String(s.visualDescription ?? "");
    const contract = deriveGenerationContract({
      visualDescription: vd,
      shotSize: String(s.shotSize ?? ""),
      characterNames: ((s.charCodes as string[]) ?? []).map(String),
      sceneCode: String((s as { sceneCode?: string }).sceneCode ?? s.sceneName ?? ""),
      sceneName: String(s.sceneName ?? ""),
      episodeShot: s,
      foreground: String(
        ((s.shotDesign as { composition?: { foreground?: string } } | undefined)?.composition?.foreground ?? ""),
      ),
    });
    const atoms = buildShotAtomsTable({
      shotIndex: idx,
      contract,
      visualDescription: vd,
    });
    atomCount += atoms.length;
    if (!atoms.length && !input.force) return s;
    applied.push(idx);
    return {
      ...s,
      shotAtoms: atoms,
      expandProvenance: { mode: "applied", at: new Date().toISOString(), atomCount: atoms.length },
    };
  });
  // Prop / atom writeback → modality regen (同源)
  if (applied.length) {
    try {
      const { regenerateModalityPromptsAfterDesign } =
        require("./modalityPromptRegen") as typeof import("./modalityPromptRegen");
      regenerateModalityPromptsAfterDesign({ shots: next, forceAll: true });
    } catch {
      /* optional */
    }
  }
  return {
    shots: next,
    applied,
    expandProvenance: {
      mode: applied.length ? "applied" : "diagnose_only",
      atomCount,
    },
  };
}
