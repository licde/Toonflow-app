/**
 * yarn test:design-export-gate
 *
 * Golden adversarial test: 43ce74 raw must FAIL export gate (false-green penetration);
 * programmatically healed bundle must clear classic false-green gates
 * (DG-LINKAGE / DG-MODALITY / DG-FALSE-GREEN-FX / DG-NAR-SELFCHECK claim).
 * F9: structural heal ≠ designExitPass — residual DEX/NAR/IRD debt may keep exportAllowed=false.
 */
import fs from "fs";
import path from "path";
import { runExportGate, buildAggregatedChatRepairText } from "@/ruleEngine/exportGate";
import { speakersMissingFromCd, serverNarrativeSelfcheckFails } from "@/ruleEngine/bundle/designExportHelpers";
import { measureDialogue } from "@/ruleEngine/dialogueMetrics";
import { flattenDialogueText } from "@/ruleEngine/design/dialogueCoverage";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function healDialogueLine(line: {
  text?: string;
  splitHint?: string;
  reactionAction?: string;
  functions?: string[];
}) {
  const text = String(line.text ?? "").trim();
  if (text.length > 20 && !line.splitHint) line.splitHint = "reaction_shot";
  if ((line.functions ?? []).includes("emotion_hit") && !line.reactionAction) line.reactionAction = "听者微怔";
  return line;
}

function cloneShotWithLines(
  template: Record<string, unknown>,
  lines: { text?: string; splitHint?: string; reactionAction?: string; functions?: string[] }[],
  maxSec: number,
): Record<string, unknown> {
  const shot = JSON.parse(JSON.stringify(template)) as {
    duration?: number;
    generation?: { videoPrompt?: string };
    narrative?: { dialogue?: { lines?: unknown[] } };
  };
  const healedLines = lines.map((l) => healDialogueLine({ ...l }));
  shot.narrative = shot.narrative ?? {};
  shot.narrative.dialogue = { lines: healedLines };
  const text = flattenDialogueText(healedLines);
  const metrics = measureDialogue({ text, speechSpeed: 4 });
  shot.duration = Math.min(maxSec, Math.max(3, metrics.minDurationSec));
  const vp = shot.generation?.videoPrompt ?? "";
  if (vp && !/口型|lip|speaking|嘴型/i.test(vp)) {
    shot.generation = { ...shot.generation, videoPrompt: `${vp}, speaking lip-sync` };
  }
  return shot;
}

/** Split shots whose combined dialogue exceeds maxSec lip budget (simulates Chat splitHint fix). */
function splitOverloadedDialogueShots(bundle: ScriptBundle, maxSec = 30) {
  const shots = (bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[];
  const out: Record<string, unknown>[] = [];

  for (const shot of shots) {
    const lines = [
      ...(((shot.narrative as { dialogue?: { lines?: { text?: string }[] } })?.dialogue?.lines ?? []) as {
        text?: string;
      }[]),
    ];
    if (!lines.length) {
      out.push(shot);
      continue;
    }

    let batch: typeof lines = [];
    for (const line of lines) {
      const candidate = [...batch, line];
      const text = flattenDialogueText(candidate);
      const metrics = measureDialogue({ text, speechSpeed: 4 });
      if (metrics.minDurationSec > maxSec && batch.length > 0) {
        out.push(cloneShotWithLines(shot, batch, maxSec));
        batch = [line];
      } else {
        batch = candidate;
      }
    }
    if (batch.length) out.push(cloneShotWithLines(shot, batch, maxSec));
  }

  out.forEach((s, i) => {
    s.shotIndex = i + 1;
  });
  if (bundle.preDesignPack) (bundle.preDesignPack as { shots: Record<string, unknown>[] }).shots = out;
}

function heal43ce74(raw: ScriptBundle): ScriptBundle {
  const bundle = JSON.parse(JSON.stringify(raw)) as ScriptBundle;
  bundle.narrativeSelfcheck = {
    passed: false,
    failedIds: ["NAR-14", "NAR-15"],
    checkedAt: new Date().toISOString(),
  };

  const miss = speakersMissingFromCd(bundle);
  const cd = (bundle.characterDesign ?? { assets: [] }) as {
    assets: { code?: string; name?: string; L0?: { identity?: string; gender?: string }; L6?: { arcVisual?: string } }[];
  };
  cd.assets = cd.assets ?? [];
  let extraIdx = 0;
  for (const name of miss) {
    // Codes must be ASCII (DG-CODE-FORBIDDEN bans CHAR-中文)
    const ascii = name.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8);
    const slug =
      ascii ||
      (/^(OS|VO|旁白|画外)$/i.test(name.trim()) ? "OS" : `EXTRA${++extraIdx}`);
    cd.assets.push({
      code: `CHAR-${slug}`,
      name,
      L0: { identity: `${name}（剧情配角）`, gender: "未知" },
      L6: { arcVisual: name },
    });
  }
  // Ensure existing CD assets used as speakers have identity
  for (const a of cd.assets) {
    if (!a.L0?.identity?.trim()) {
      a.L0 = { ...a.L0, identity: `${a.name ?? a.code}（角色）` };
    }
  }
  bundle.characterDesign = cd;

  const vlt = (bundle.visualLockTable ?? {}) as { characterAssets?: Record<string, string> };
  vlt.characterAssets = vlt.characterAssets ?? {};
  for (const a of cd.assets) {
    if (a.code && a.name) vlt.characterAssets[a.code] = a.name;
  }
  bundle.visualLockTable = vlt;

  splitOverloadedDialogueShots(bundle, 30);

  // NAR-14/15：dialoguePlan + 分镜台词 stub splitHint / reactionAction
  const planData = bundle.planData as {
    dialoguePlan?: {
      lines?: {
        text?: string;
        splitHint?: string;
        reactionAction?: string;
        functions?: string[];
      }[];
    };
  } | undefined;
  for (const l of planData?.dialoguePlan?.lines ?? []) healDialogueLine(l);

  // Shot-level NAR-14/15 metadata (no longer stubbed by ingestHeal)
  for (const shot of (bundle.preDesignPack?.shots ?? []) as {
    narrative?: { dialogue?: { lines?: { text?: string; splitHint?: string; reactionAction?: string; functions?: string[] }[] } };
  }[]) {
    for (const line of shot.narrative?.dialogue?.lines ?? []) healDialogueLine(line);
  }

  // FX 双轨：有 visualEffect/F1+ → 补散文；无材料 → 声明 F0，不写 fxPrompt
  const auditItems =
    (bundle as { fxFeasibilityAudit?: { items?: { shotIndex?: number; level?: string }[] } }).fxFeasibilityAudit
      ?.items ?? [];
  for (const shot of (bundle.preDesignPack?.shots ?? []) as {
    shotIndex?: number;
    fxFeasibility?: string;
    generation?: { fxPrompt?: string; fxFeasibility?: string };
    visualEffect?: string;
  }[]) {
    const ve = String(shot.visualEffect ?? "").trim();
    const existingFx = String(shot.generation?.fxPrompt ?? "").trim();
    const hasMaterial =
      (ve && !/^F0$/i.test(ve) && !/^F0\s*[:：]/i.test(ve)) ||
      (existingFx && !/^F[0-5]$/i.test(existingFx));
    const auditLv = auditItems.find((it) => it.shotIndex === shot.shotIndex)?.level;
    if (hasMaterial || /^F[1-5]$/i.test(String(auditLv ?? ""))) {
      const fx = existingFx || ve.replace(/^F[0-5]\s*[:：\-–—]\s*/i, "").trim();
      shot.generation = {
        ...shot.generation,
        fxPrompt: fx && !/^F[0-5]$/i.test(fx) ? fx : "subtle practical light flicker, no CGI particles",
        fxFeasibility: String(auditLv ?? shot.fxFeasibility ?? "F1").toUpperCase().replace(/^FX:/, "") || "F1",
      };
      shot.fxFeasibility = shot.generation.fxFeasibility;
    } else {
      shot.fxFeasibility = "F0";
      shot.generation = { ...shot.generation, fxFeasibility: "F0" };
      if (shot.generation.fxPrompt && /^F[0-5]$/i.test(String(shot.generation.fxPrompt))) {
        delete shot.generation.fxPrompt;
      }
      // ensure no invented prose on F0
      if (!hasMaterial) delete shot.generation.fxPrompt;
    }
  }
  if (!(bundle as { fxFeasibilityAudit?: { items?: unknown[] } }).fxFeasibilityAudit) {
    (bundle as { fxFeasibilityAudit: { items: unknown[] } }).fxFeasibilityAudit = { items: [] };
  }
  const items = (bundle as { fxFeasibilityAudit: { items: { shotIndex?: number; level?: string; feasible?: boolean; desc?: string }[] } })
    .fxFeasibilityAudit.items;
  for (const shot of bundle.preDesignPack?.shots ?? []) {
    const idx = shot.shotIndex;
    const level = String((shot as { fxFeasibility?: string }).fxFeasibility ?? "F0").toUpperCase();
    const existing = items.find((it) => it.shotIndex === idx);
    if (existing) existing.level = level;
    else items.push({ shotIndex: idx, level, feasible: true, desc: level === "F0" ? "无特效" : "healed" });
  }

  // Align implementationPlan fxIntent with scene materials (avoid MOD-02 on F0-only scenes)
  const shots = (bundle.preDesignPack?.shots ?? []) as {
    shotIndex?: number;
    sceneName?: string;
    fxFeasibility?: string;
    generation?: { fxPrompt?: string };
    visualEffect?: string;
  }[];
  const sceneOrder: string[] = [];
  for (const s of shots) {
    const n = String(s.sceneName ?? "").trim();
    if (n && !sceneOrder.includes(n)) sceneOrder.push(n);
  }
  const brief = bundle.planData as {
    narrativeBrief?: { implementationPlan?: { sceneRef?: number; fxIntent?: { level?: string } }[] };
  } | undefined;
  for (const item of brief?.narrativeBrief?.implementationPlan ?? []) {
    const ref = item.sceneRef ?? 0;
    const sceneName = sceneOrder[ref - 1];
    const sceneShots = sceneName ? shots.filter((s) => s.sceneName === sceneName) : [];
    const anyProse = sceneShots.some((s) => {
      const fx = String(s.generation?.fxPrompt ?? "").trim();
      return fx.length >= 4 && !/^F[0-5]$/i.test(fx);
    });
    if (!anyProse && item.fxIntent && item.fxIntent.level !== "F0" && item.fxIntent.level !== "NONE") {
      item.fxIntent = { ...item.fxIntent, level: "F0" };
    }
  }

  // 场镜基数：裁掉无映射镜的多余 plan/sceneMeta（模拟 Chat 结构修复，非导入 heal）
  if (brief?.narrativeBrief?.implementationPlan) {
    brief.narrativeBrief.implementationPlan = brief.narrativeBrief.implementationPlan.filter(
      (p) => Number(p.sceneRef) >= 1 && Number(p.sceneRef) <= sceneOrder.length,
    );
  }
  const planRoot = bundle.planData as { sceneMeta?: { sceneRef?: number }[] } | undefined;
  if (planRoot?.sceneMeta?.length) {
    planRoot.sceneMeta = planRoot.sceneMeta.filter(
      (p) => Number(p.sceneRef) >= 1 && Number(p.sceneRef) <= sceneOrder.length,
    );
  }

  // F9 honest: structural heal may stub splitHint, but export/prepare can residualize NAR —
  // never claim passed=true here (that re-creates DG-NAR-SELFCHECK false-green).
  const residualNar = serverNarrativeSelfcheckFails(bundle).map((f) => f.id);
  bundle.narrativeSelfcheck = {
    passed: false,
    failedIds: residualNar.length ? residualNar : ["NAR-14"],
    checkedAt: new Date().toISOString(),
  };

  bundle.modalityPromptAudit = { IMG: "pass", VID: "pass", AUD: "pass", FX: "partial" };
  const audit = bundle.linkageAudit as { chains?: { chainId?: string; status?: string }[] } | undefined;
  if (audit?.chains) {
    const asset = audit.chains.find((c) => c.chainId === "资产");
    if (asset && miss.length) asset.status = "warn";
  }
  return bundle;
}

async function main() {
  const goldenDir = path.join(process.cwd(), "data/fixtures/golden");
  const fixturePath = path.join(goldenDir, "deepseek-20260716-43ce74.json");
  const expectPath = path.join(goldenDir, "deepseek-20260716-43ce74.expect.json");
  const fixedExpectPath = path.join(goldenDir, "deepseek-20260716-43ce74.fixed.expect.json");

  ok("fixture exists", fs.existsSync(fixturePath));
  ok("expect exists", fs.existsSync(expectPath));
  ok("fixed expect exists", fs.existsSync(fixedExpectPath));

  const raw = JSON.parse(fs.readFileSync(fixturePath, "utf-8")) as ScriptBundle;
  const expect = JSON.parse(fs.readFileSync(expectPath, "utf-8"));
  const fixedExpect = JSON.parse(fs.readFileSync(fixedExpectPath, "utf-8"));

  const gate = runExportGate(raw);
  ok("raw tier T3", gate.tier === expect.tier, gate.tier);
  ok("raw exportAllowed=false", gate.exportAllowed === false, String(gate.exportAllowed));

  const blockIds = [...new Set(gate.blocks.map((b) => b.id))];
  for (const id of expect.mustBlockIds as string[]) {
    ok(`raw blocks include ${id}`, blockIds.includes(id), blockIds.join(","));
  }

  ok(
    "raw missingFieldReport populated",
    gate.missingFieldReport.length >= (expect.missingFieldMinCount ?? 1),
    String(gate.missingFieldReport.length),
  );

  const chatText = buildAggregatedChatRepairText(gate.repairHints, blockIds, gate.missingFieldSummary);
  for (const frag of expect.chatRepairTextMustInclude as string[]) {
    ok(`chatRepairText includes「${frag}」`, chatText.includes(frag));
  }

  const healed = heal43ce74(raw);
  const healedGate = runExportGate(healed);
  const healedBlocks = healedGate.blocks.map((b) => b.id).join(",");
  ok(
    `healed exportAllowed=${String(fixedExpect.exportAllowed)}`,
    healedGate.exportAllowed === Boolean(fixedExpect.exportAllowed),
    `blocks=${healedBlocks}`,
  );
  for (const id of fixedExpect.mustNotBlockIds as string[]) {
    ok(`healed no block ${id}`, !healedGate.blocks.some((b) => b.id === id), healedBlocks);
  }

  if (failed) {
    console.error(`\n${failed} test:design-export-gate FAILED`);
    process.exit(1);
  }
  console.log("\n=== test:design-export-gate OK ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
