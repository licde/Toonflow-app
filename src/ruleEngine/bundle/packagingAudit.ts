import type { ScriptBundle } from "./types";
import type { BundleGap } from "./auditTypes";

export function auditPackagingGaps(bundle: ScriptBundle): BundleGap[] {
  const gaps: BundleGap[] = [];
  const plan = bundle.planData as Record<string, unknown> | undefined;
  const viral = plan?.viralAdaptation as { retentionPlan?: { ep1?: { opening3to10s?: { profileId?: string } } } } | undefined;
  const ep1 = viral?.retentionPlan?.ep1;
  const epIndex = bundle.meta?.episodeIndex ?? 1;

  if (epIndex === 1 && !ep1?.opening3to10s?.profileId) {
    gaps.push({
      id: "PKG-01",
      severity: "WARN",
      message: "ep1 缺 opening3to10s.profileId",
      chainId: "packaging",
      trigger: "packaging_debut_missing",
      field: "retentionPlan.ep1.opening3to10s",
    });
  }

  const profileId = ep1?.opening3to10s?.profileId;
  const debut = bundle.debutIntroPack as { items?: unknown[] } | undefined;
  if (profileId === "O5_debut_intro_merged" && !debut?.items?.length) {
    gaps.push({
      id: "PKG-02",
      severity: "WARN",
      message: "O5 方案但缺 debutIntroPack.items",
      chainId: "packaging",
      trigger: "packaging_debut_missing",
      field: "debutIntroPack",
    });
  }

  const items = (debut?.items ?? []) as {
    entityType?: string;
    copyHint?: string;
    establishingPattern?: string;
    subOptional?: { enabled?: boolean; text?: string };
    fxLevel?: string;
  }[];
  for (const item of items.filter((i) => i.entityType === "character")) {
    if (!item.copyHint || !item.establishingPattern) {
      gaps.push({
        id: "PKG-03",
        severity: "WARN",
        message: "角色 debut 缺 copyHint 或 establishingPattern",
        chainId: "packaging",
        trigger: "packaging_debut_missing",
        field: "debutIntroPack.items",
      });
    }
    if (item.subOptional?.enabled && !item.subOptional.text?.trim()) {
      gaps.push({
        id: "PKG-04",
        severity: "WARN",
        message: "subOptional 启用但 text 为空",
        chainId: "packaging",
        trigger: "packaging_debut_missing",
        field: "debutIntroPack.items.subOptional",
      });
    }
    const fx = item.fxLevel ?? "F0";
    if (["F3", "F4", "F5"].includes(fx)) {
      gaps.push({
        id: "PKG-05",
        severity: "WARN",
        message: `开场 fxLevel ${fx} 过高，须降级到 F2`,
        chainId: "packaging",
        trigger: "packaging_debut_missing",
        field: "debutIntroPack.items.fxLevel",
      });
    }
  }

  const endCard = (plan?.endCardPack ?? {}) as { preview?: { enabled?: boolean; overlayText?: string } };
  if (!endCard.preview?.enabled || !endCard.preview.overlayText?.trim()) {
    gaps.push({
      id: "PKG-06",
      severity: "WARN",
      message: "集末缺 endCardPack.preview 或 overlayText",
      chainId: "packaging",
      trigger: "packaging_end_preview",
      field: "endCardPack.preview",
    });
  }

  if (epIndex > 1 && !endCard.preview && !bundle.continuity?.recapHint) {
    gaps.push({
      id: "PKG-07",
      severity: "WARN",
      message: "ep2+ 无 recap 且 continuity.recapHint 为空",
      chainId: "packaging",
      trigger: "packaging_end_preview",
      field: "continuity.recapHint",
    });
  }

  return gaps;
}
