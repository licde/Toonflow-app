/**
 * M18 Design loss detect + strong supplement from formal sources only.
 * Never invent literary prose; unsalvageable → DESIGN-LOSS.
 */
import type { ScriptBundle } from "../bundle/types";
import { qp02MinChars } from "../bundle/visualQualityAudit";
import {
  buildShotChainContract,
  markChainStale,
  type ChainEgressFinding,
} from "./shotChainContract";

export type DesignLossResult = {
  supplemented: number;
  unsalvageable: ChainEgressFinding[];
  warnings: string[];
};

function knownNamesFromBundle(bundle: ScriptBundle): string[] {
  const assets = (bundle.characterDesign as { assets?: { name?: string }[] } | undefined)?.assets ?? [];
  return assets.map((a) => String(a.name ?? "").replace(/（OS）|\(OS\)/g, "").trim()).filter((n) => n.length >= 2);
}

function planPictureCrumb(bundle: ScriptBundle, shotIndex?: number): string {
  const plan = bundle.planData as {
    dialoguePlan?: { lines?: { text?: string }[] };
    narrativeBrief?: { scenes?: { picture?: string }[] };
  } | undefined;
  const pics = plan?.narrativeBrief?.scenes?.map((s) => String(s.picture ?? "").trim()).filter(Boolean) ?? [];
  if (shotIndex && pics[shotIndex - 1]) return pics[shotIndex - 1];
  return pics[0] ?? "";
}

/** Parent VD stash from sibling children sharing split key — longest non-empty parent-like text on pack. */
function parentVdFromSplit(
  shots: Record<string, unknown>[],
  shot: Record<string, unknown>,
): string {
  const key = String(shot._stillBeatSplitId ?? shot._visualSplitId ?? "").trim();
  if (!key) return "";
  // Prefer explicit stash
  const stash = String(shot._parentVisualDescription ?? "").trim();
  if (stash) return stash;
  for (const s of shots) {
    const p = String(s._parentVisualDescription ?? "").trim();
    if (p && String(s.clientId ?? "") === key) return p;
    if (p && String(s._stillBeatSplitId ?? s._visualSplitId ?? "") === key && p.length > 20) return p;
  }
  return "";
}

/**
 * Detect design loss and supplement from whitelist sources.
 * Mutates shots in place when ingestHeal.
 */
export function applyDesignLossSupplement(
  bundle: ScriptBundle,
  opts?: { proposeOnly?: boolean },
): DesignLossResult {
  const shots = (bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[];
  const known = knownNamesFromBundle(bundle);
  const min = qp02MinChars();
  const unsalvageable: ChainEgressFinding[] = [];
  const warnings: string[] = [];
  let supplemented = 0;
  const proposeOnly = Boolean(opts?.proposeOnly);

  for (const shot of shots) {
    const idx = Number(shot.shotIndex) || undefined;
    let vd = String(shot.visualDescription ?? "").trim();
    const len = vd.replace(/\s/g, "").length;

    if (len < min) {
      const fromParent = parentVdFromSplit(shots, shot);
      const fromPlan = planPictureCrumb(bundle, idx);
      const candidate = [fromParent, fromPlan].sort((a, b) => b.length - a.length)[0] ?? "";
      const dualXor =
        /划过|贴颊|颊触|纸角|贴合/.test(candidate) && /咬|渗血|血珠|紧咬/.test(candidate);
      // Never salvage dual-contact parent into XOR children
      if (dualXor && shot.xorSplit) {
        warnings.push(`design_loss_skip_xor_parent:${idx ?? "?"}`);
        if (len === 0) {
          unsalvageable.push({
            id: "DESIGN-LOSS",
            severity: "BLOCK",
            message: `镜 ${idx ?? "?"} XOR 子镜 VD 遗失且禁父双接触回灌`,
            breakAt: "design_loss",
          });
        }
      } else if (candidate.replace(/\s/g, "").length >= min) {
        if (!proposeOnly) {
          // Prefer keeping role-sized slice: if child has short vd, prepend parent crumb only when empty
          shot.visualDescription = vd ? vd : candidate.slice(0, 400);
          if (!vd) shot.visualDescription = candidate.slice(0, 400);
          markChainStale(shot, { still: true, video: true });
        }
        supplemented += 1;
        warnings.push(`design_loss_vd_salvage:${idx ?? "?"}`);
        vd = String(shot.visualDescription ?? "").trim();
      } else if (len === 0) {
        unsalvageable.push({
          id: "DESIGN-LOSS",
          severity: "BLOCK",
          message: `镜 ${idx ?? "?"} visualDescription 遗失且无正式源可补`,
          breakAt: "design_loss",
        });
      }
    }

    // Duration missing / untrusted → do not invent 1; flag
    const contract = buildShotChainContract(shot, { knownNames: known });
    if (!contract.durationTrusted) {
      warnings.push(`design_loss_duration_untrusted:${idx ?? "?"}`);
      // Leave for M9 raise paths; surface as finding at burn
    }
  }

  return { supplemented, unsalvageable, warnings };
}

export function auditDesignLoss(bundle: ScriptBundle): ChainEgressFinding[] {
  const r = applyDesignLossSupplement(bundle, { proposeOnly: true });
  return r.unsalvageable;
}
