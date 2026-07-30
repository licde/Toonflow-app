/**
 * M12 Literary beat reassembly — children under split parent must cover parent anchors.
 */
import { extractDescPredicates } from "../compilers/extractDescPredicates";
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
    const missing = must.filter((t) => !childBlob.includes(t));
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
