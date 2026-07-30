/**
 * Extends series continuity: writeback seed + ep≥2 audit + hydrate.
 * yarn test:series-continuity
 */
import fs from "fs";
import path from "path";
import { inspectBundle } from "@/ruleEngine/portable/inspectBundle";
import { scriptBundleSchema, stripCommentFields } from "@/ruleEngine/bundle/schema";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";
import {
  buildSeriesContinuitySeed,
  hydrateSeriesContinuityFromSeed,
  writeContinuityFromEpisode,
} from "@/ruleEngine/bundle/continuityWriteback";
import { auditSeriesContinuity } from "@/ruleEngine/bundle/auditSeriesContinuity";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function main() {
  const p = path.join(process.cwd(), "data/fixtures/script-bundle-template-v2.json");
  const base = scriptBundleSchema.parse(stripCommentFields(JSON.parse(fs.readFileSync(p, "utf-8")))) as ScriptBundle;

  const ep1Empty: ScriptBundle = { ...base, continuity: undefined };
  const withPrev: ScriptBundle = {
    ...base,
    continuity: { prevEpisodeSummary: "上集：主角发现线索", characterState: { hero: "警觉" } },
  };

  const rEmpty = inspectBundle(ep1Empty, { tier: "T1" });
  const rRecap = inspectBundle(base, { tier: "T1" });
  const rPrev = inspectBundle(withPrev, { tier: "T1" });

  const emptyTrace = (rEmpty.forwardTrace as { traces?: { chainId: string }[] })?.traces?.some((t) => t.chainId === "continuity");
  const recapTrace = (rRecap.forwardTrace as { traces?: { chainId: string }[] })?.traces?.some((t) => t.chainId === "continuity");
  const prevTrace = (rPrev.forwardTrace as { traces?: { chainId: string }[] })?.traces?.some((t) => t.chainId === "continuity");

  ok("ep1 empty continuity no trace", !emptyTrace);
  ok("ep1 recapHint has continuity trace", Boolean(recapTrace));
  ok("ep2 prevEpisodeSummary has continuity trace", Boolean(prevTrace));

  // Writeback seed
  const ep1 = {
    ...base,
    meta: { ...(base.meta as object), episodeIndex: 1 },
    continuity: { recapHint: "上集钩：休书未启", prevEpisodeSummary: "上集钩：休书未启" },
    planData: {
      ...(base.planData as object),
      narrativeBrief: {
        retentionBeats: { endHook: "休书未启" },
        seriesContinuity: { carryInfoIds: ["INF-HOOK-01"] },
      },
      informationLedger: [{ infoId: "INF-HOOK-01" }],
    },
  } as ScriptBundle;

  const seed = buildSeriesContinuitySeed(ep1);
  ok("seed has prev summary", Boolean(seed.prevEpisodeSummary));
  ok("seed carry includes INF", seed.carryInfoIds.some((id) => /INF/i.test(id)), seed.carryInfoIds.join(","));

  const wb = await writeContinuityFromEpisode({} as never, 1, ep1);
  ok("writeback written", wb.written);
  ok("writeback has seriesContinuitySeed", Boolean(wb.seriesContinuitySeed?.carryInfoIds?.length));

  // ep2 audit before hydrate → BLOCK carry
  const ep2AuditEmpty = auditSeriesContinuity({ episodeIndex: 2, seriesContinuity: {} });
  ok("ep2 empty carry BLOCK", ep2AuditEmpty.findings.some((f) => f.id === "SERIES-CONT-CARRY" && f.severity === "BLOCK"));

  const ep2Plan: Record<string, unknown> = { planData: { narrativeBrief: {} }, meta: { episodeIndex: 2 } };
  ok("hydrate from seed", hydrateSeriesContinuityFromSeed(ep2Plan, wb.seriesContinuitySeed));
  const sc = (ep2Plan.planData as { narrativeBrief?: { seriesContinuity?: Record<string, unknown> } })
    ?.narrativeBrief?.seriesContinuity;
  const ep2AuditHydrated = auditSeriesContinuity({ episodeIndex: 2, seriesContinuity: sc });
  ok("ep2 hydrated no BLOCK", ep2AuditHydrated.ok, ep2AuditHydrated.findings.map((f) => f.id).join(","));

  // ep1 audit always ok
  ok("ep1 audit ok", auditSeriesContinuity({ episodeIndex: 1, seriesContinuity: {} }).ok);

  if (failed) {
    console.error(`\n${failed} test:series-continuity FAILED`);
    process.exit(1);
  }
  console.log("\n=== series continuity OK ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
