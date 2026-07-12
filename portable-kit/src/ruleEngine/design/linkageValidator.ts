import type { ScriptBundle } from "../bundle/types";
import { dialogueLineCountMismatch } from "./forwardTrace";
import { readFixtureJson } from "../utils/fixturesPath";

export interface LinkageChainResult {
  chainId: string;
  broken: boolean;
  message: string;
}

interface LinkageChainDef {
  id: string;
  nodes?: string[];
}

function loadLinkageChains(): LinkageChainDef[] {
  return readFixtureJson<{ chains?: LinkageChainDef[] }>("linkage_chains.json", { chains: [] }).chains ?? [];
}

function validateChainById(bundle: ScriptBundle, chainId: string): LinkageChainResult {
  const brief = bundle.designBrief as Record<string, unknown> | undefined;
  const shots = bundle.preDesignPack?.shots ?? [];

  switch (chainId) {
    case "dialogue":
      return {
        chainId,
        broken: dialogueLineCountMismatch(bundle),
        message: dialogueLineCountMismatch(bundle) ? "台词镜数不足" : "dialogue OK",
      };
    case "scene": {
      const scenes = (brief as { assetHints?: { scenes?: string[] }; B6?: { scenes?: string[] } })?.assetHints?.scenes
        ?? (brief as { B6?: { scenes?: string[] } })?.B6?.scenes
        ?? [];
      const sbScenes = new Set(
        shots.map((s) => (s as { sceneName?: string; narrative?: { sceneName?: string } }).sceneName
          ?? (s as { narrative?: { sceneName?: string } }).narrative?.sceneName).filter(Boolean),
      );
      const sceneBroken = scenes.length > 0 && shots.length > 0 && sbScenes.size === 0;
      return { chainId, broken: sceneBroken, message: sceneBroken ? "B6 场景未映射 SB" : "scene OK" };
    }
    case "asset": {
      const scriptChars = bundle.characters ?? [];
      const shotChars = new Set(shots.flatMap((s) => (s as { charCodes?: string[] }).charCodes ?? []));
      const broken = scriptChars.length > 0 && shots.length > 0 && shotChars.size === 0;
      return { chainId, broken, message: broken ? "charCodes 缺失" : "asset OK" };
    }
    case "story": {
      const b5 = (brief as { infoLinkageChain?: unknown[]; B5?: unknown[] })?.infoLinkageChain
        ?? (brief as { B5?: unknown[] })?.B5
        ?? [];
      const hasMarkers = shots.some((s) => ((s as { markers?: unknown[] }).markers?.length ?? (s as { narrative?: { markers?: unknown[] } }).narrative?.markers?.length ?? 0) > 0);
      const broken = b5.length > 0 && !hasMarkers;
      return { chainId, broken, message: broken ? "B5 无 SB.markers" : "story OK" };
    }
    case "av": {
      const b4 = (brief as { emotionCurveOutline?: number[]; B4?: number[] })?.emotionCurveOutline
        ?? (brief as { B4?: number[] })?.B4;
      const emotions = shots.map((s) => Number((s as { emotion?: number; narrative?: { emotionIntensity?: number } }).emotion
        ?? (s as { narrative?: { emotionIntensity?: number } }).narrative?.emotionIntensity ?? 0)).filter((n) => n > 0);
      const avDrift = b4?.length && emotions.length
        ? Math.max(...emotions.map((e) => Math.min(...b4.map((b) => Math.abs(e - b)))))
        : 0;
      const broken = Boolean(b4?.length && avDrift > 2);
      return { chainId, broken, message: broken ? `B4 偏差 ${avDrift}` : "av OK" };
    }
    case "continuity": {
      const cont = bundle.continuity;
      const broken = !cont?.prevEpisodeSummary && !cont?.characterState;
      return { chainId, broken: false, message: broken ? "continuity optional missing" : "continuity OK" };
    }
    default:
      return { chainId, broken: false, message: `${chainId} walk OK` };
  }
}

export function validateLinkageChains(bundle: ScriptBundle): LinkageChainResult[] {
  const chainDefs = loadLinkageChains();
  const results = chainDefs.map((c) => validateChainById(bundle, c.id));

  const la = bundle.linkageAudit as { chains?: { chain?: string; broken?: boolean }[] } | undefined;
  for (const c of la?.chains ?? []) {
    if (c.broken) {
      const existing = results.find((r) => r.chainId === c.chain);
      if (existing) {
        existing.broken = true;
        existing.message = `${c.chain} broken`;
      } else {
        results.push({ chainId: c.chain ?? "unknown", broken: true, message: `${c.chain} broken` });
      }
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
