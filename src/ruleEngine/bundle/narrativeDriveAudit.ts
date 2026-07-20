import { readFixtureJson } from "../utils/fixturesPath";
import type { ScriptBundle } from "./types";
import type { BundleGap } from "./auditTypes";

const EXPLAIN_RE = /因为|其实|当年|背景是|众所周知/;

export function auditNarrativeDriveGaps(bundle: ScriptBundle): BundleGap[] {
  const gaps: BundleGap[] = [];
  const plan = bundle.planData as Record<string, unknown> | undefined;
  const spec = readFixtureJson<{ forbiddenSuspense?: string[] }>("narrative_drive_spec.json", {});
  const forbidden = new Set(spec.forbiddenSuspense ?? ["opaque_mystery", "exposition_dump", "self_reveal_dialogue"]);

  const ledger = (plan?.informationLedger ?? []) as {
    infoId?: string;
    audienceKnows?: boolean;
    characterKnows?: Record<string, boolean>;
    emotionTarget?: string;
    forbiddenDelivery?: string;
  }[];
  if (!ledger.length) {
    gaps.push({
      id: "NAR-01",
      severity: "WARN",
      message: "缺少 informationLedger",
      chainId: "narrative_drive",
      trigger: "narrative_info_gap",
      field: "planData.informationLedger",
    });
  } else {
    for (const item of ledger) {
      if (item.audienceKnows === undefined || !item.characterKnows || !item.emotionTarget) {
        gaps.push({
          id: "NAR-02",
          severity: "WARN",
          message: `info ${item.infoId ?? "?"} 缺 audienceKnows/characterKnows/emotionTarget`,
          chainId: "narrative_drive",
          trigger: "narrative_info_gap",
          field: "informationLedger",
        });
      }
      if (item.forbiddenDelivery && forbidden.has("exposition_dump")) {
        gaps.push({
          id: "NAR-03",
          severity: "WARN",
          message: `info ${item.infoId} 使用禁止交付模式`,
          chainId: "narrative_drive",
          trigger: "narrative_info_gap",
          field: "informationLedger",
        });
      }
    }
  }

  const dialoguePlan = plan?.dialoguePlan as { lines?: { lineId?: string; functions?: string[]; causedByActionId?: string; text?: string }[] } | undefined;
  const planLines = dialoguePlan?.lines ?? [];
  if (!planLines.length) {
    gaps.push({
      id: "NAR-04",
      severity: "WARN",
      message: "缺少 dialoguePlan.lines",
      chainId: "narrative_drive",
      trigger: "narrative_dialogue_function",
      field: "planData.dialoguePlan",
    });
  } else {
    for (const line of planLines) {
      if (!line.functions?.length) {
        gaps.push({
          id: "NAR-04",
          severity: "WARN",
          message: `台词 ${line.lineId ?? "?"} 缺 functions`,
          chainId: "narrative_drive",
          trigger: "narrative_dialogue_function",
          field: "dialoguePlan.lines",
        });
      }
      if (!line.causedByActionId) {
        gaps.push({
          id: "NAR-05",
          severity: "WARN",
          message: `台词 ${line.lineId ?? "?"} 缺 causedByActionId`,
          chainId: "narrative_drive",
          trigger: "narrative_dialogue_function",
          field: "dialoguePlan.lines",
        });
      }
      if (String(line.text ?? "").trim().length > 20 && !(line as { splitHint?: string }).splitHint) {
        gaps.push({
          id: "NAR-14",
          severity: "BLOCK",
          message: `长台词 ${line.lineId ?? "?"} 缺 splitHint（须拆镜或标注 reaction_shot）`,
          chainId: "narrative_drive",
          trigger: "narrative_split_hint",
          field: "dialoguePlan.lines",
        });
      }
      if (line.functions?.includes("emotion_hit") && !(line as { reactionAction?: string }).reactionAction) {
        gaps.push({
          id: "NAR-15",
          severity: "BLOCK",
          message: `高情绪台词 ${line.lineId ?? "?"} 缺 reactionAction`,
          chainId: "narrative_drive",
          trigger: "narrative_split_hint",
          field: "dialoguePlan.lines",
        });
      }
    }
  }

  let explainCount = 0;
  const shots = bundle.preDesignPack?.shots ?? [];
  for (const s of shots.slice(0, 5)) {
    const tier = (s as { retentionTier?: string }).retentionTier ?? "";
    if (!tier.includes("30") && !tier.includes("5")) continue;
    for (const line of s.narrative?.dialogue?.lines ?? []) {
      if (line.text && EXPLAIN_RE.test(line.text)) explainCount++;
      if (!line.causedByActionId && line.text) {
        gaps.push({
          id: "NAR-05",
          severity: "WARN",
          message: `SB 台词镜缺 causedByActionId: ${line.lineId ?? line.text?.slice(0, 12)}`,
          chainId: "narrative_drive",
          trigger: "narrative_dialogue_function",
          field: "narrative.dialogue.lines",
          shotIndex: s.shotIndex,
        });
      }
    }
  }
  if (explainCount > 2) {
    gaps.push({
      id: "NAR-06",
      severity: "WARN",
      message: `ep1 前段解释性台词过多 (${explainCount})`,
      chainId: "narrative_drive",
      trigger: "narrative_dialogue_function",
      field: "script",
    });
  }

  const graph = bundle.narrativeCausalityGraph as { broken?: unknown[]; nodes?: unknown[] } | undefined;
  if (graph?.broken?.length) {
    gaps.push({
      id: "NAR-07",
      severity: "WARN",
      message: "narrativeCausalityGraph.broken 非空",
      chainId: "narrative_drive",
      trigger: "narrative_info_gap",
      field: "narrativeCausalityGraph.broken",
    });
  }

  const b20 = (bundle.designBrief as { B20?: unknown[] })?.B20;
  if (ledger.length && !b20?.length) {
    gaps.push({
      id: "NAR-08",
      severity: "WARN",
      message: "informationLedger 未镜像到 designBrief.B20",
      chainId: "narrative_drive",
      trigger: "design_spec_upstream",
      field: "designBrief.B20",
    });
  }

  const planLineIds = new Set(planLines.map((l) => l.lineId).filter(Boolean));
  for (const s of shots) {
    for (const line of s.narrative?.dialogue?.lines ?? []) {
      if (line.lineId && planLineIds.size && !planLineIds.has(line.lineId)) {
        gaps.push({
          id: "NAR-09",
          severity: "WARN",
          message: `SB lineId ${line.lineId} 与 dialoguePlan 不一致`,
          chainId: "narrative_drive",
          trigger: "narrative_dialogue_function",
          field: "narrative.dialogue.lines",
          shotIndex: s.shotIndex,
        });
      }
    }
  }

  const viral = plan?.viralAdaptation as { retentionPlan?: { ep1?: { first30s?: { infoGap?: string } } } } | undefined;
  const gapType = ledger[0] ? (ledger[0].audienceKnows ? "audience_knows" : "character_knows") : undefined;
  const retGap = viral?.retentionPlan?.ep1?.first30s?.infoGap;
  if (gapType && retGap && !retGap.includes(gapType.split("_")[0])) {
    gaps.push({
      id: "NAR-10",
      severity: "WARN",
      message: "信息差类型与 retentionPlan.first30s.infoGap 可能冲突",
      chainId: "narrative_drive",
      trigger: "narrative_info_gap",
      field: "retentionPlan.ep1.first30s.infoGap",
    });
  }

  return gaps;
}
