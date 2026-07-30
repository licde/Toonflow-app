import type { ScriptBundle } from "./types";
import { normalizeAssetCode, normalizeAssetCodes } from "../codes/assetCodeContract";
import { collectReferencedCodes } from "./assetClosureGate";

export interface RuleConsistencyGap {
  id: string;
  severity: "WARN" | "INFO" | "BLOCK";
  message: string;
  field?: string;
}

export function auditRuleConsistency(bundle: ScriptBundle, codeToId: Record<string, number> = {}): RuleConsistencyGap[] {
  const gaps: RuleConsistencyGap[] = [];
  const cd = bundle.characterDesign as { assets?: { code?: string; name?: string }[] } | undefined;
  const vlt = bundle.visualLockTable as {
    characterAssets?: Record<string, unknown>;
    sceneColorLock?: Record<string, unknown>;
    anchorProps?: Record<string, unknown>;
  } | undefined;
  const charAssets = vlt?.characterAssets ?? {};
  const scenes = vlt?.sceneColorLock ?? {};
  const props = vlt?.anchorProps ?? {};
  const seeded = Object.keys(codeToId).length > 0;

  const canonKeys = (rec: Record<string, unknown>) => {
    const s = new Set<string>();
    for (const k of Object.keys(rec)) {
      const n = normalizeAssetCode(k);
      if (n) s.add(n);
    }
    return s;
  };
  const charAssetCodes = canonKeys(charAssets);
  const cdCodes = new Set(
    (cd?.assets ?? []).map((a) => normalizeAssetCode(a.code ?? "") ?? "").filter(Boolean),
  );

  for (const asset of cd?.assets ?? []) {
    const code = normalizeAssetCode(asset.code ?? "") ?? asset.code;
    if (code && !charAssetCodes.has(code) && !charAssets[asset.code!]) {
      gaps.push({
        id: "RC-CHAR-01",
        severity: "WARN",
        message: `characterDesign ${code} 未出现在 visualLockTable.characterAssets`,
        field: "visualLockTable",
      });
    }
    if (code && seeded && !codeToId[code] && !codeToId[asset.code!]) {
      gaps.push({
        id: "RC-CHAR-02",
        severity: "INFO",
        message: `CHAR ${code}(${asset.name}) 未种子化到 o_assets`,
        field: "o_assets",
      });
    }
  }

  for (const code of Object.keys(scenes)) {
    const n = normalizeAssetCode(code) ?? code;
    if (seeded && !codeToId[n] && !codeToId[code]) {
      gaps.push({
        id: "RC-SCENE-01",
        severity: "WARN",
        message: `SCENE ${n} 未种子化到 o_assets`,
        field: "sceneColorLock",
      });
    }
  }

  for (const code of Object.keys(props)) {
    const n = normalizeAssetCode(code) ?? code;
    if (seeded && !codeToId[n] && !codeToId[code]) {
      gaps.push({
        id: "RC-PROP-01",
        severity: "WARN",
        message: `PROP ${n} 未种子化到 o_assets`,
        field: "anchorProps",
      });
    }
  }

  for (const code of collectReferencedCodes(bundle)) {
    if (code.startsWith("CHAR-") && !charAssetCodes.has(code) && !cdCodes.has(code)) {
      gaps.push({
        id: "RC-SB-01",
        severity: "WARN",
        message: `分镜引用 ${code} 但 CD/visualLock 无对应项（应已由 assetClosure 补壳）`,
        field: "charCodes",
      });
    }
    if (seeded && !codeToId[code]) {
      gaps.push({
        id: "RC-REF-01",
        severity: "BLOCK",
        message: `引用码 ${code} 未种子化到 o_assets`,
        field: "o_assets",
      });
    }
  }

  void normalizeAssetCodes;
  return gaps;
}
