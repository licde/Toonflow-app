/**
 * Chat repair deeplink — FE jumps to reverseTarget stage from block ids.
 */
import { buildRePushPlan } from "./reverseRouteEngine";
import { BLOCK_TO_TRIGGER_FOR_TEST } from "../compilers/burnGateEnvelope";
import { loadDesignGateMountMatrix } from "./gateDiagnose";
import { readFixtureJson } from "../utils/fixturesPath";

export type ChatRepairDeeplink = {
  blockId: string;
  trigger: string;
  reverseTarget: string;
  forwardStages: string[];
  deeplink: string;
  authoritativeFields?: string[];
};

type RouteRow = {
  trigger: string;
  reverseTarget?: string;
  forwardStages?: string[];
  ruleIds?: string[];
  authoritativeFields?: string[];
};

export function resolveTriggerForBlockId(blockId: string): string {
  return (
    BLOCK_TO_TRIGGER_FOR_TEST[blockId] ??
    loadDesignGateMountMatrix().rows.find((r) => r.ruleId === blockId)?.reverseTrigger ??
    "chat_repair"
  );
}

export function buildChatRepairDeeplinks(blockIds: string[]): ChatRepairDeeplink[] {
  const routes = readFixtureJson<{ routes?: RouteRow[] }>("reverse_route_table.json", { routes: [] }).routes ?? [];
  const out: ChatRepairDeeplink[] = [];
  const seen = new Set<string>();
  for (const id of blockIds) {
    const trigger = resolveTriggerForBlockId(id);
    if (seen.has(`${id}:${trigger}`)) continue;
    seen.add(`${id}:${trigger}`);
    const row = routes.find((r) => r.trigger === trigger || (r.ruleIds ?? []).includes(id));
    const plan = buildRePushPlan([trigger])[0];
    const reverseTarget = String(plan?.reverseTarget ?? row?.reverseTarget ?? "SB");
    const forwardStages = plan?.forwardRerun ?? row?.forwardStages ?? [reverseTarget];
    out.push({
      blockId: id,
      trigger,
      reverseTarget,
      forwardStages,
      deeplink: `toonflow://stage/${encodeURIComponent(reverseTarget)}?trigger=${encodeURIComponent(trigger)}&rule=${encodeURIComponent(id)}`,
      authoritativeFields: row?.authoritativeFields,
    });
  }
  return out;
}

export function formatDeeplinkSection(links: ChatRepairDeeplink[]): string {
  if (!links.length) return "";
  const lines = ["【深链·反推舞台】"];
  for (const l of links.slice(0, 12)) {
    const camNote =
      l.trigger === "cam_fit" || l.blockId === "DEX-CAM-FIT"
        ? " — auto→服务端智能拆；Confirm 仅 IRD-CONFIRM；勿手改镜号"
        : "";
    lines.push(`- ${l.blockId} → ${l.reverseTarget} (${l.trigger}) ${l.deeplink}${camNote}`);
  }
  return lines.join("\n");
}
