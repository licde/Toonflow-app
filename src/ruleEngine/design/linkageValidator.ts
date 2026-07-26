import type { ScriptBundle } from "../bundle/types";
import { dialogueCoverageReport, formatDialogueCoverageMessage } from "./dialogueCoverage";
import { readFixtureJson } from "../utils/fixturesPath";
import type { PrecheckScope } from "../precheckLoop/types";

export interface LinkageChainResult {
  chainId: string;
  broken: boolean;
  message: string;
  /** True when mismatch exists but policy suppresses BLOCK (e.g. filtered touch). */
  softBroken?: boolean;
  detail?: Record<string, unknown>;
}

interface LinkageChainDef {
  id: string;
  nodes?: string[];
}

function loadLinkageChains(): LinkageChainDef[] {
  return readFixtureJson<{ chains?: LinkageChainDef[] }>("linkage_chains.json", { chains: [] }).chains ?? [];
}

function isFilteredScope(scope?: PrecheckScope): boolean {
  return scope?.mode === "filtered" || scope?.storyboardIds != null;
}

function validateChainById(
  bundle: ScriptBundle,
  chainId: string,
  scope?: PrecheckScope,
): LinkageChainResult {
  const brief = bundle.designBrief as Record<string, unknown> | undefined;
  const shots = bundle.preDesignPack?.shots ?? [];
  const filtered = isFilteredScope(scope);

  switch (chainId) {
    case "dialogue": {
      const report = dialogueCoverageReport({
        script: bundle.script ?? "",
        shots,
        planData: bundle.planData,
      });
      if (!report.ok && filtered) {
        return {
          chainId,
          broken: false,
          softBroken: true,
          message: formatDialogueCoverageMessage(report, { filtered: true }),
          detail: {
            shotScope: "filtered",
            missingCount: report.missingCount,
            missingKeys: report.missingKeys.slice(0, 10),
            extraCount: report.extraCount,
            extraKeys: report.extraKeys.slice(0, 10),
          },
        };
      }
      return {
        chainId,
        broken: !report.ok,
        message: report.ok ? "dialogue OK" : formatDialogueCoverageMessage(report),
        detail: report.ok
          ? undefined
          : {
              shotScope: "full",
              missingCount: report.missingCount,
              missingKeys: report.missingKeys.slice(0, 10),
              extraCount: report.extraCount,
              extraKeys: report.extraKeys.slice(0, 10),
            },
      };
    }
    case "scene": {
      const scenes =
        (brief as { assetHints?: { scenes?: string[] }; B6?: { scenes?: string[] } })?.assetHints?.scenes ??
        (brief as { B6?: { scenes?: string[] } })?.B6?.scenes ??
        [];
      const sbScenes = new Set(
        shots
          .map(
            (s) =>
              (s as { sceneName?: string; narrative?: { sceneName?: string } }).sceneName ??
              (s as { narrative?: { sceneName?: string } }).narrative?.sceneName,
          )
          .filter(Boolean),
      );
      const sceneBroken = scenes.length > 0 && shots.length > 0 && sbScenes.size === 0;
      // Filtered single shot without sceneName vs full brief — still real if that shot lacks scene
      if (sceneBroken && filtered) {
        return {
          chainId,
          broken: false,
          softBroken: true,
          message: "B6 场景未映射（局部触达 WARN）",
          detail: { shotScope: "filtered", expectedScenes: scenes.slice(0, 5) },
        };
      }
      return {
        chainId,
        broken: sceneBroken,
        message: sceneBroken ? "B6 场景未映射 SB" : "scene OK",
      };
    }
    case "asset": {
      const scriptChars = bundle.characters ?? [];
      const shotChars = new Set(shots.flatMap((s) => (s as { charCodes?: string[] }).charCodes ?? []));
      const broken = scriptChars.length > 0 && shots.length > 0 && shotChars.size === 0;
      if (broken && filtered) {
        return {
          chainId,
          broken: false,
          softBroken: true,
          message: "charCodes 缺失（局部触达 WARN）",
          detail: { shotScope: "filtered", charactersCount: scriptChars.length },
        };
      }
      return { chainId, broken, message: broken ? "charCodes 缺失" : "asset OK" };
    }
    case "story": {
      const b5 =
        (brief as { infoLinkageChain?: unknown[]; B5?: unknown[] })?.infoLinkageChain ??
        (brief as { B5?: unknown[] })?.B5 ??
        [];
      const hasMarkers = shots.some(
        (s) =>
          ((s as { markers?: unknown[] }).markers?.length ??
            (s as { narrative?: { markers?: unknown[] } }).narrative?.markers?.length ??
            0) > 0,
      );
      const broken = b5.length > 0 && !hasMarkers;
      if (broken && filtered) {
        return {
          chainId,
          broken: false,
          softBroken: true,
          message: "B5 无 SB.markers（局部触达 WARN）",
          detail: { shotScope: "filtered" },
        };
      }
      return { chainId, broken, message: broken ? "B5 无 SB.markers" : "story OK" };
    }
    case "av": {
      const b4 =
        (brief as { emotionCurveOutline?: number[]; B4?: number[] })?.emotionCurveOutline ??
        (brief as { B4?: number[] })?.B4;
      const emotions = shots
        .map((s) =>
          Number(
            (s as { emotion?: number; narrative?: { emotionIntensity?: number } }).emotion ??
              (s as { narrative?: { emotionIntensity?: number } }).narrative?.emotionIntensity ??
              0,
          ),
        )
        .filter((n) => n > 0);
      const avDrift =
        b4?.length && emotions.length
          ? Math.max(...emotions.map((e) => Math.min(...b4.map((b) => Math.abs(e - b)))))
          : 0;
      const broken = Boolean(b4?.length && avDrift > 2);
      return { chainId, broken, message: broken ? `B4 偏差 ${avDrift}` : "av OK" };
    }
    case "continuity": {
      const cont = bundle.continuity;
      const missing = !cont?.prevEpisodeSummary && !cont?.characterState;
      return { chainId, broken: false, message: missing ? "continuity optional missing" : "continuity OK" };
    }
    default:
      return { chainId, broken: false, message: `${chainId} walk OK` };
  }
}

export function validateLinkageChains(
  bundle: ScriptBundle,
  scope?: PrecheckScope,
): LinkageChainResult[] {
  const chainDefs = loadLinkageChains();
  const results = chainDefs.map((c) => validateChainById(bundle, c.id, scope));

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
