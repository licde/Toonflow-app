/**
 * M12 Literary beat reassembly — children under split parent must cover parent anchors.
 * Alias-aware (纸角↔休书/纸张/纸缘) — homologous with prompt-fidelity heal.
 */
import { extractDescPredicates } from "../compilers/extractDescPredicates";
import { bodyCoversToken, expandAnchorAliases } from "./healPromptFidelityAnchors";
import type { ChainEgressFinding } from "../quality/shotChainContract";

export function auditLiteraryBeatCoverage(
  shots: Record<string, unknown>[],
  opts?: { knownNames?: string[] },
): ChainEgressFinding[] {
  const findings: ChainEgressFinding[] = [];
  const byParent = new Map<string, Record<string, unknown>[]>();
  for (const s of shots) {
    const key = String(s._stillBeatSplitId ?? s._visualSplitId ?? "").trim();
    if (!key) continue;
    let group = byParent.get(key);
    if (!group) {
      group = [];
      byParent.set(key, group);
    }
    group.push(s);
  }
  for (const [parentKey, children] of byParent) {
    const parentVd = String(
      children.find((c) => c._parentVisualDescription)?._parentVisualDescription ?? "",
    ).trim();
    if (!parentVd) continue;
    const parentPack = extractDescPredicates({
      description: parentVd,
      characterNames: opts?.knownNames ?? [],
    });
    const must = parentPack.mustAppear.filter((t) => t.length >= 2).slice(0, 8);
    if (!must.length) continue;
    const childBlob = children.map((c) => String(c.visualDescription ?? "")).join("\n");
    // Prefer parent-surface forms: if parent never wrote canonical token, accept aliases in children
    const missing = must.filter((t) => {
      if (bodyCoversToken(childBlob, t)) return false;
      // Parent itself only had alias (e.g. 纸张边缘) → do not require canonical 纸角 on children
      if (!parentVd.includes(t) && expandAnchorAliases(t).some((a) => a !== t && parentVd.includes(a))) {
        return !expandAnchorAliases(t).some((a) => childBlob.includes(a));
      }
      return true;
    });
    if (missing.length > must.length / 2) {
      findings.push({
        id: "CHAIN-BEAT",
        severity: "BLOCK",
        message: `拆镜子镜未覆盖父文学锚点（缺 ${missing.slice(0, 3).join("、")}）；parent=${parentKey}`,
        breakAt: "literary",
      });
    }
  }
  return findings;
}

/** Graft missing parent anchors onto under-covered split children (untilClear). */
export function healLiteraryBeatCoverage(shots: Record<string, unknown>[]): {
  shots: Record<string, unknown>[];
  grafted: number;
  remaining: number;
} {
  const next = shots.map((s) => ({ ...s }));
  let grafted = 0;
  const byParent = new Map<string, number[]>();
  for (let i = 0; i < next.length; i++) {
    const key = String(next[i]!._stillBeatSplitId ?? next[i]!._visualSplitId ?? "").trim();
    if (!key) continue;
    const arr = byParent.get(key) ?? [];
    arr.push(i);
    byParent.set(key, arr);
  }
  for (const [, idxs] of byParent) {
    const parentVd = String(
      idxs.map((i) => next[i]!._parentVisualDescription).find((v) => String(v ?? "").trim()) ?? "",
    ).trim();
    if (!parentVd) continue;
    const pack = extractDescPredicates({ description: parentVd });
    const must = pack.mustAppear.filter((t) => t.length >= 2).slice(0, 8);
    const childBlob = idxs.map((i) => String(next[i]!.visualDescription ?? "")).join("\n");
    const missing = must.filter((t) => !bodyCoversToken(childBlob, t));
    if (!missing.length) continue;
    // Prefer grafting onto prop/action child, else first child
    const targetIdx =
      idxs.find((i) => {
        const role = String(next[i]!.visualSplitRole ?? next[i]!.beatRole ?? "");
        return /prop|action|speak|insert/i.test(role);
      }) ?? idxs[0]!;
    const s = next[targetIdx]!;
    let vd = String(s.visualDescription ?? "");
    const toGraft: string[] = [];
    for (const tok of missing) {
      if (bodyCoversToken(vd, tok)) continue;
      // Use parent clause that carries an alias of tok — never invent dual-contact soup
      const aliases = expandAnchorAliases(tok);
      const clause =
        parentVd
          .split(/[。；;\n]+/)
          .map((c) => c.trim())
          .find((c) => aliases.some((a) => c.includes(a)) && c.length >= 4) ||
        (parentVd.includes(tok) ? tok : aliases.find((a) => parentVd.includes(a)) || tok);
      if (clause && !bodyCoversToken(vd, tok)) {
        toGraft.push(clause.length <= 24 ? clause : tok);
      }
    }
    if (toGraft.length) {
      const graft = [...new Set(toGraft)].join("，");
      vd = `${vd}${vd && !/[。；;\s]$/.test(vd) ? "。" : ""}${graft}。`.replace(/。+/g, "。");
      next[targetIdx] = { ...s, visualDescription: vd, promptState: "stale" };
      grafted += 1;
    }
  }
  const remaining = auditLiteraryBeatCoverage(next).filter((f) => f.id === "CHAIN-BEAT").length;
  return { shots: next, grafted, remaining };
}
