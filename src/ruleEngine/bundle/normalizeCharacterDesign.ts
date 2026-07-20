import type { ShapeSalvageLog } from "./shapeSalvageTypes";

export type StateVariantItem = { name?: string; visual?: string };

const L_ALIAS: Record<string, string> = {
  L0_identity: "L0",
  L1_faceLock: "L1",
  L1_face: "L1",
  L2_bodyLock: "L2",
  L2_body: "L2",
  L3_costume: "L3",
  L4_expression: "L4",
  L5_voice: "L5",
};

/** SH-L6-VARIANTS: record `{ 态名: visual }` or array → `[{ name, visual }]`. */
export function normalizeStateVariants(raw: unknown): StateVariantItem[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter((v) => v && typeof v === "object" && !Array.isArray(v))
      .map((v) => {
        const item = v as Record<string, unknown>;
        return {
          name: typeof item.name === "string" ? item.name : undefined,
          visual: typeof item.visual === "string" ? item.visual : item.visual != null ? String(item.visual) : undefined,
        };
      });
  }
  if (typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>).map(([name, visual]) => ({
      name,
      visual: typeof visual === "string" ? visual : visual != null ? String(visual) : undefined,
    }));
  }
  return [];
}

/** SH-CD-LKEYS: L0_identity→L0 … L6_arcVisual→L6.arcVisual (+ phase→stateVariants). */
function normalizeCdLKeys(asset: Record<string, unknown>, assetPath: string, log: ShapeSalvageLog): void {
  for (const [from, to] of Object.entries(L_ALIAS)) {
    if (asset[from] == null) continue;
    if (asset[to] == null) {
      asset[to] = asset[from];
      log.push("SH-CD-LKEYS", `${assetPath}.${from}`, `→${to}`);
    }
  }

  const arcRaw = asset.L6_arcVisual;
  if (arcRaw != null) {
    let l6 =
      asset.L6 && typeof asset.L6 === "object" && !Array.isArray(asset.L6)
        ? (asset.L6 as Record<string, unknown>)
        : null;
    if (!l6) {
      l6 = {};
      asset.L6 = l6;
    }
    if (typeof arcRaw === "string") {
      if (l6.arcVisual == null) {
        l6.arcVisual = arcRaw;
        log.push("SH-CD-LKEYS", `${assetPath}.L6_arcVisual`, "string→L6.arcVisual");
      }
    } else if (typeof arcRaw === "object" && !Array.isArray(arcRaw)) {
      const arcObj = arcRaw as Record<string, unknown>;
      if (l6.arcVisual == null) {
        // prefer joined phase summary
        const parts = Object.entries(arcObj)
          .map(([k, v]) => (typeof v === "string" ? `${k}:${v}` : null))
          .filter(Boolean);
        if (parts.length) {
          l6.arcVisual = parts.join(" → ");
          log.push("SH-CD-LKEYS", `${assetPath}.L6_arcVisual`, "object→L6.arcVisual summary");
        }
      }
      if (l6.stateVariants == null) {
        const variants = normalizeStateVariants(arcObj);
        if (variants.length) {
          l6.stateVariants = variants;
          log.push("SH-CD-LKEYS", `${assetPath}.L6_arcVisual`, `phases→L6.stateVariants(${variants.length})`);
        }
      }
    }
  }
}

export function normalizeCharacterDesignInBundle(bundle: Record<string, unknown>, log: ShapeSalvageLog): void {
  const cd = bundle.characterDesign;
  if (!cd || typeof cd !== "object" || Array.isArray(cd)) return;
  const assets = (cd as Record<string, unknown>).assets;
  if (!Array.isArray(assets)) return;

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    if (!asset || typeof asset !== "object" || Array.isArray(asset)) continue;
    const a = asset as Record<string, unknown>;
    const path = `characterDesign.assets[${i}]`;
    normalizeCdLKeys(a, path, log);

    const l6 = a.L6;
    if (!l6 || typeof l6 !== "object" || Array.isArray(l6)) continue;
    const l6o = l6 as Record<string, unknown>;
    const sv = l6o.stateVariants;
    if (sv == null) continue;
    if (Array.isArray(sv)) continue;
    if (typeof sv === "object") {
      const normalized = normalizeStateVariants(sv);
      l6o.stateVariants = normalized;
      log.push("SH-L6-VARIANTS", `${path}.L6.stateVariants`, `record→array(${normalized.length})`);
    }
  }
}
