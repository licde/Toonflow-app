import type { ScriptBundle } from "../bundle/types";
import { dialogueLineCountMismatch } from "./forwardTrace";

export interface LinkageChainResult {
  chainId: string;
  broken: boolean;
  message: string;
}

export function validateLinkageChains(bundle: ScriptBundle): LinkageChainResult[] {
  const results: LinkageChainResult[] = [];
  const brief = bundle.designBrief as Record<string, unknown> | undefined;
  const shots = bundle.preDesignPack?.shots ?? [];

  results.push({
    chainId: "dialogue",
    broken: dialogueLineCountMismatch(bundle),
    message: dialogueLineCountMismatch(bundle) ? "台词镜数不足" : "dialogue OK",
  });

  const scenes = (brief as { assetHints?: { scenes?: string[] }; B6?: { scenes?: string[] } })?.assetHints?.scenes
    ?? (brief as { B6?: { scenes?: string[] } })?.B6?.scenes
    ?? [];
  const sbScenes = new Set(
    shots.map((s) => (s as { sceneName?: string; narrative?: { sceneName?: string } }).sceneName
      ?? (s as { narrative?: { sceneName?: string } }).narrative?.sceneName).filter(Boolean),
  );
  const sceneBroken = scenes.length > 0 && shots.length > 0 && sbScenes.size === 0;
  results.push({ chainId: "scene", broken: sceneBroken, message: sceneBroken ? "B6 场景未映射 SB" : "scene OK" });

  const la = bundle.linkageAudit as { chains?: { chain?: string; broken?: boolean }[] } | undefined;
  for (const c of la?.chains ?? []) {
    if (c.broken) {
      results.push({ chainId: c.chain ?? "unknown", broken: true, message: `${c.chain} broken` });
    }
  }

  return results;
}

export function buildLinkageAudit(bundle: ScriptBundle): { chains: { chain: string; broken: boolean }[] } {
  const validated = validateLinkageChains(bundle);
  const chains = validated.map((v) => ({ chain: v.chainId, broken: v.broken }));
  const existing = (bundle.linkageAudit as { chains?: { chain: string; broken: boolean }[] })?.chains ?? [];
  const merged = new Map<string, boolean>();
  for (const c of [...existing, ...chains]) merged.set(c.chain, c.broken);
  return { chains: [...merged.entries()].map(([chain, broken]) => ({ chain, broken })) };
}
