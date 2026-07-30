/**
 * failDims / DEX → reverse trigger router (single source with doctrine + BLOCK_TO_TRIGGER).
 */
import { BLOCK_TO_TRIGGER_FOR_TEST } from "../compilers/burnGateEnvelope";
import { loadSvqDoctrine } from "./loadSvqDoctrine";
import { buildChatRepairDeeplinks, type ChatRepairDeeplink } from "../design/chatRepairDeeplink";
import { guardReverseLoop } from "../design/designSplitLifecycle";

export function triggerForFailDim(dimId: string): string {
  const doc = loadSvqDoctrine();
  return doc.failDimTriggers[dimId] ?? "chat_repair";
}

export function triggerForRuleId(ruleId: string): string {
  const doc = loadSvqDoctrine();
  const fromDex = doc.dex[ruleId]?.trigger;
  if (fromDex) return fromDex;
  return BLOCK_TO_TRIGGER_FOR_TEST[ruleId] ?? triggerForFailDim(ruleId);
}

export function routeFailDims(input: {
  failDims?: Array<{ id: string }>;
  blockIds?: string[];
  projectKey?: string;
}): {
  triggers: string[];
  deeplinks: ChatRepairDeeplink[];
  loopGuards: Array<{ trigger: string; allow: boolean; escalateHuman: boolean; count: number }>;
  primaryTrigger?: string;
} {
  const ids = [
    ...(input.failDims ?? []).map((d) => d.id),
    ...(input.blockIds ?? []),
  ];
  const triggers: string[] = [];
  for (const id of ids) {
    const t = triggerForRuleId(id);
    if (t === "chat_repair" && (id === "QC-SVQ" || id.startsWith("QC-"))) continue;
    if (!triggers.includes(t)) triggers.push(t);
  }
  // Contact-event: prefer still_prop_missing / svq_motion / vid_contact_beats over emotion misroute
  const CONTACT_PREF = [
    "still_prop_missing",
    "still_video_contact_handoff",
    "vid_contact_beats",
    "svq_motion_fail",
    "lit_detail_contact",
    "lit_detail_contact_xor",
  ];
  const demote = new Set(["expr_speak_missing", "emotion_structure"]);
  const preferred = CONTACT_PREF.find((t) => triggers.includes(t));
  if (preferred) {
    const rest = triggers.filter((t) => t !== preferred && !demote.has(t));
    const demoted = triggers.filter((t) => demote.has(t));
    triggers.length = 0;
    triggers.push(preferred, ...rest, ...demoted);
  }
  // Deeplinks from resolved triggers + original fail/DEX ids (fail dims resolve via doctrine.failDimTriggers)
  const deeplinkSeeds = [
    ...(input.failDims ?? []).map((d) => d.id),
    ...triggers.filter((t) => t !== "chat_repair"),
  ];
  const deeplinks = buildChatRepairDeeplinks(deeplinkSeeds.length ? deeplinkSeeds : triggers);
  const projectKey = input.projectKey ?? "default";
  const loopGuards = triggers.map((trigger) => {
    const g = guardReverseLoop(trigger, projectKey);
    return { trigger, allow: g.allow, escalateHuman: g.escalateHuman, count: g.count };
  });
  return {
    triggers,
    deeplinks,
    loopGuards,
    primaryTrigger: triggers[0],
  };
}
