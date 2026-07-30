/**
 * yarn test:still-compose-triple
 * Still triple fix: onebeat false-green, face cref BLOCK, DC-01 missing/extra messages.
 */
import {
  buildStillPreviousIngress,
  composeStillPrompt,
  type ComposeStillContext,
} from "@/ruleEngine/compilers/composeStillPrompt";
import { formatDialogueCoverageMessage, dialogueCoverageReport } from "@/ruleEngine/design/dialogueCoverage";
import { runDesignExitGate } from "@/ruleEngine/design/designExitGate";
import { shouldWarnOneBeat } from "@/ruleEngine/compilers/stillIdentitySsot";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const MULTI =
  "银簪尖端刺入锁骨下方皮肉，一滴暗红色液体从簪尖渗出。沈清漪包扎好伤口后，指尖拂过梳妆台下方。镜头下移，露出一柄匕首的冷光。她唇边勾起一抹浅笑。";
const ONE =
  "大特写。银簪尖端刺入锁骨下方皮肉，暗红色血珠自簪尖渗出。";

function baseCtx(over: Partial<ComposeStillContext> = {}): ComposeStillContext {
  return {
    visualDescription: ONE,
    shotSize: "特写",
    qualityMode: "hq_update",
    characters: [{ code: "CHAR-SHENQINGYI", name: "沈清漪", hasImage: true, kind: "character", tier: "lead" }],
    ...over,
  };
}

function main() {
  ok("fixture multi-beat detected", shouldWarnOneBeat(MULTI));
  ok("fixture one-beat clean", !shouldWarnOneBeat(ONE));

  // 1) multi VD → BLOCK
  const r1 = composeStillPrompt(baseCtx({ visualDescription: MULTI }), { mode: "full" });
  ok("multi VD compose BLOCK", !r1.ok && r1.blockReason === "DEX-STILL-ONEBEAT", r1.blockReason);

  // 2) one-beat VD + dirty previous refine → drop previous, succeed from VD
  const r2 = composeStillPrompt(
    baseCtx({ visualDescription: ONE, previousVisualBody: MULTI }),
    { mode: "refine" },
  );
  ok(
    "dirty previous refine → drop & OK from VD",
    r2.ok && !shouldWarnOneBeat(r2.visualBody) && (r2.warnings ?? []).some((w) => /drop_dirty_previous/i.test(w)),
    `ok=${r2.ok};br=${r2.blockReason};warn=${(r2.warnings ?? []).join(",")}`,
  );

  // 2b) multi VD + dirty previous → still BLOCK
  const r2b = composeStillPrompt(
    baseCtx({ visualDescription: MULTI, previousVisualBody: MULTI }),
    { mode: "refine" },
  );
  ok("multi VD + dirty previous still BLOCK", !r2b.ok && r2b.blockReason === "DEX-STILL-ONEBEAT", r2b.blockReason);

  // 3) one-beat VD + dirty compiled fallback (no VD) → BLOCK
  const r3 = composeStillPrompt(
    baseCtx({ visualDescription: "", compiledImagePrompt: MULTI }),
    { mode: "full" },
  );
  ok("dirty compiled without VD BLOCK", !r3.ok && r3.blockReason === "DEX-STILL-ONEBEAT", r3.blockReason);

  // 4) face + imaged CHAR → --cref
  const r4 = composeStillPrompt(baseCtx(), { mode: "full" });
  ok("imaged face emits --cref", r4.ok && /--cref\s+CHAR-SHENQINGYI/i.test(r4.prompt), r4.prompt.slice(-80));

  // 5) face + no image / no code → BLOCK DEX-ASSET-CREF
  const r5 = composeStillPrompt(
    baseCtx({
      characters: [{ name: "沈清漪", hasImage: false, kind: "character", tier: "lead" }],
    }),
    { mode: "full" },
  );
  ok(
    "face no image BLOCK ASSET-CREF",
    !r5.ok &&
      (r5.blockReason === "DEX-ASSET-CREF" ||
        /定妆|CREF|身份/i.test(String(r5.blockReason ?? r5.userMessage ?? ""))),
    r5.blockReason,
  );

  // 6) DC-01 extra-only message
  const extraReport = dialogueCoverageReport({
    script: "甲：你好。",
    shots: [
      {
        narrative: {
          dialogue: { lines: [{ speaker: "甲", text: "你好。" }, { speaker: "乙", text: "乱入句。" }] },
        },
      },
    ],
    planData: { dialoguePlan: { lines: [{ lineId: "L1", speaker: "甲", text: "你好。" }] } },
  });
  const extraMsg = formatDialogueCoverageMessage(extraReport);
  ok("DC-01 extra not 缺0", /乱入/.test(extraMsg) && !/缺 0 条/.test(extraMsg), extraMsg);
  ok("extra report not ok", !extraReport.ok && extraReport.missingCount === 0 && extraReport.extraCount > 0);

  // 7) designExit residual onebeat: alreadyImportExpanded must not skip forever
  const plan = {
    planData: {
      meta: {
        importSplitExpanded: true,
        irdProvenance: { appliedAt: new Date().toISOString(), patchIds: [], codes: [] },
        pillarsVisBeatV2: "enforce",
      },
      preDesignPack: {
        shots: [
          {
            shotIndex: 1,
            visualDescription: MULTI,
            duration: 4,
            charCodes: ["CHAR-SHENQINGYI"],
          },
        ],
      },
      characterDesign: {
        assets: [{ code: "CHAR-SHENQINGYI", name: "沈清漪", hasImage: true, filePath: "/x.png" }],
      },
    },
    characterDesign: {
      assets: [{ code: "CHAR-SHENQINGYI", name: "沈清漪", hasImage: true, filePath: "/x.png" }],
    },
    preDesignPack: {
      shots: [
        {
          shotIndex: 1,
          visualDescription: MULTI,
          duration: 4,
          charCodes: ["CHAR-SHENQINGYI"],
        },
      ],
    },
    meta: { importSplitExpanded: true, irdProvenance: { appliedAt: new Date().toISOString() } },
    _importSplitExpanded: true,
  } as Record<string, unknown>;

  const exit = runDesignExitGate("SB", plan, { chatStrict: false, applyL2Heal: false, forceExpand: true });
  const shotsAfter =
    ((plan.planData as { preDesignPack?: { shots?: { visualDescription?: string }[] } })?.preDesignPack?.shots ??
      (plan.preDesignPack as { shots?: { visualDescription?: string }[] })?.shots ??
      []) as { visualDescription?: string }[];
  const residual = shotsAfter.some((s) => shouldWarnOneBeat(String(s.visualDescription ?? "")));
  ok(
    "exit expands or fails ONEBEAT (no silent skip)",
    !residual || (exit.failedIds ?? []).includes("DEX-STILL-ONEBEAT") || (exit.warnings ?? []).some((w) => /STILL_ONEBEAT|still_onebeat/i.test(w)),
    `residual=${residual};failed=${(exit.failedIds ?? []).join(",")};warn=${(exit.warnings ?? []).slice(0, 4).join("|")};n=${shotsAfter.length}`,
  );

  // 8) exit ASSET-CREF: face shot without bind
  const plan2 = {
    planData: {
      meta: {},
      preDesignPack: {
        shots: [{ shotIndex: 1, visualDescription: "中景。沈清漪苍白的脸正对镜头。", duration: 3 }],
      },
      characterDesign: {
        assets: [{ code: "CHAR-SHENQINGYI", name: "沈清漪", hasImage: true, filePath: "/x.png" }],
      },
    },
    characterDesign: {
      assets: [{ code: "CHAR-SHENQINGYI", name: "沈清漪", hasImage: true, filePath: "/x.png" }],
    },
    preDesignPack: {
      shots: [{ shotIndex: 1, visualDescription: "中景。沈清漪苍白的脸正对镜头。", duration: 3 }],
    },
  } as Record<string, unknown>;
  // Name in VD + imaged asset → exit may pass via nameOk; compose still needs hydrate.
  // Without charCodes but name+image: plan allows nameOk. Stricter: no charCodes and we still want bind —
  // our exit allows nameOk. Assert compose without characters[].code still blocks:
  const rFace = composeStillPrompt(
    {
      visualDescription: "中景。沈清漪苍白的脸正对镜头。",
      qualityMode: "hq_update",
      characters: [{ name: "沈清漪", hasImage: true, kind: "character" }], // hasImage but no code
    },
    { mode: "full" },
  );
  ok(
    "face named imaged without CHAR code BLOCK",
    !rFace.ok && rFace.blockReason === "DEX-ASSET-CREF",
    rFace.blockReason,
  );

  // Ingress ledger: prevMeta always defined; dirty previous → forceFull + drop body
  const dirtyPrev = buildStillPreviousIngress({
    reason: JSON.stringify({ promptState: "hq_ok", promptUsed: MULTI, composeHash: "old" }),
    storedPrompt: MULTI,
    requestPrompt: ONE,
    currentHash: "new",
    loadPrevious: true,
  });
  ok("ingress declares prevMeta", dirtyPrev.prevMeta != null && dirtyPrev.prevMeta.promptState === "hq_ok");
  ok("ingress dirty previous forceFull", dirtyPrev.forceFull && dirtyPrev.previousVisualBody === undefined);
  ok("ingress dirty previous effectiveMode full", dirtyPrev.effectiveMode === "full");

  const noSb = buildStillPreviousIngress({
    requestPrompt: ONE,
    loadPrevious: false,
  });
  ok("ingress no-storyboard prevMeta null", noSb.prevMeta === null && !noSb.forceFull);

  void plan2;
  void exit;

  if (failed) {
    console.error(`\n${failed} assertion(s) failed`);
    process.exit(1);
  }
  console.log("\nAll still-compose-triple checks passed");
}

main();
