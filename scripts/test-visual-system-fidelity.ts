/**
 * System visual+audio fidelity golden suite.
 * yarn test:visual-system-fidelity
 */
import {
  prepareStillImageEdit,
  mergeEditReferenceList,
  resolveEditStrategy,
  resolveParallelM,
  buildEditFocusPrompt,
} from "../src/ruleEngine/qc/stillImageEdit";
import {
  normalizeStillEgressPrompt,
  hasDualCommaCref,
} from "../src/ruleEngine/compilers/stillEgressNormalize";
import {
  collectFixHintsFromVlm,
  formatVlmJudgePrompt,
} from "../src/ruleEngine/compilers/literaryFidelityChecklist";
import { runStillVisualFidelityLoop } from "../src/ruleEngine/qc/stillVisualFidelityLoop";
import {
  buildAudioLiteraryFidelityChecklist,
  assertAudioLiteraryFidelity,
  applyAudioStrengthenToPrompt,
  syncDualAudioSsot,
} from "../src/ruleEngine/compilers/audioLiteraryFidelityChecklist";
import { runAudioLiteraryL1 } from "../src/ruleEngine/qc/audioLiteraryL1";
import { runPostBurnRuntime, unifyHealBudget } from "../src/ruleEngine/qc/postBurnRuntime";
import { assertStillMouthVideoHandoff } from "../src/ruleEngine/qc/stillMouthVideoHandoff";
import { assertFlfEndFrameFidelity } from "../src/ruleEngine/qc/flfEndFrameFidelity";
import {
  buildCrossShotContinuityInject,
  sortStoryboardsForContinuity,
} from "../src/ruleEngine/qc/crossShotContinuity";
import { markHqOk, markKeepStill, inferStillQuality } from "../src/ruleEngine/compilers/stillQuality";
import { createHealBudget } from "../src/ruleEngine/heal/healBudgetLedger";
import {
  writeJudgeCorpusEntry,
  findJudgeDisagreements,
  exportJudgePreferencePairs,
  ensureJudgeCorpusDir,
} from "../src/ruleEngine/qc/judgeSelfImprove";
import { sanitizeVideoPrompt } from "../src/ruleEngine/compilers/sanitizeVideoPrompt";
import fs from "fs";
import path from "path";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function main() {
  // --- Edit three strategies ---
  {
    const agnes = prepareStillImageEdit({
      failedImageBase64: "data:image/png;base64,AAA",
      fixHints: ["沈母须端坐"],
      literaryPrompt: "沈母端坐高位",
      crefOrderedRefs: [{ type: "image", base64: "CREF1", role: "cref" }],
      model: "agnes:x",
      vendorHint: "agnes",
    });
    ok("agnes strategy", agnes.strategy === "agnes_i2i");
    ok("agnes failed last", agnes.referenceList.at(-1)?.role === "failed_still");
    ok("agnes cref first", agnes.referenceList[0]?.role === "cref");
    ok("agnes focus in prompt", /Edit焦点|沈母/.test(agnes.promptUsed));

    const atlas = prepareStillImageEdit({
      failedImageBase64: "data:image/png;base64,BBB",
      fixHints: ["补道具"],
      literaryPrompt: "文学",
      crefOrderedRefs: [{ type: "image", base64: "C", role: "cref" }],
      model: "google/nano-banana-2/text-to-image",
      vendorHint: "atlascloud",
    });
    ok("atlas strategy", atlas.strategy === "atlas_native");
    ok("atlas model mapped", /\/edit$/.test(atlas.modelUsed));

    const focus = prepareStillImageEdit({
      failedImageBase64: "data:image/png;base64,CCC",
      fixHints: ["焦点"],
      literaryPrompt: "文学",
      crefOrderedRefs: [{ type: "image", base64: "C", role: "cref" }],
      model: "other:x",
      strategy: "focus_regen",
    });
    ok("focus_regen no failed still", !focus.referenceList.some((r) => r.role === "failed_still"));
    ok("resolveEditStrategy atlas", resolveEditStrategy({ vendorHint: "atlas" }) === "atlas_native");
  }

  ok("M hq default 2", resolveParallelM({ qualityMode: "hq_update" }) === 2);
  ok("M draft 1", resolveParallelM({ qualityMode: "draft" }) === 1);

  {
    const dirty = "沈清瓷跪必须端正 --cref CHAR-A, --cref CHAR-B micro-expression subtle smile";
    const n = normalizeStillEgressPrompt(dirty);
    ok("egress notes", n.notes.length >= 1);
    ok("no dual comma cref", !hasDualCommaCref(n.prompt));
    ok("strip en micro or who glue", n.changed);
  }

  {
    const hints = collectFixHintsFromVlm(
      [
        { id: "a", pass: false, fixHint: "改成端坐" },
        { id: "b", pass: true },
      ],
      [
        {
          id: "a",
          kind: "seating",
          mustTokens: [],
          vlmQuestion: "",
          healInject: "heal",
          strengthenKey: "x",
          strengthenValue: "y",
        },
      ],
    );
    ok("fixHint collected", hints[0] === "改成端坐");
    ok("judge prompt asks fixHint", /fixHint/.test(formatVlmJudgePrompt([], "描写")));
  }

  {
    const out = await runStillVisualFidelityLoop({
      qualityMode: "hq_update",
      storyboardId: 1,
      description: "沈母端坐",
      checklist: [
        {
          id: "seat",
          kind: "seating",
          mustTokens: ["端坐"],
          vlmQuestion: "端坐?",
          healInject: "端坐",
          strengthenKey: "roleLock",
          strengthenValue: "sit",
        },
      ],
      healBudget: createHealBudget({ maxRegenRetries: 2 }),
      judgeFn: async ({ imageBase64 }) => {
        const pass = imageBase64.includes("GOOD");
        return {
          ok: pass,
          items: [
            {
              id: "seat",
              pass,
              fixHint: pass ? undefined : "改成端坐太师椅",
              evidence: pass ? "ok" : "站着",
            },
          ],
        };
      },
      generateOnce: async ({ mode, candidateIndex, fixHints }) => {
        const good = mode === "edit" && candidateIndex === 1;
        return {
          url: good ? "/good" : "/bad",
          savePath: good ? "/good.jpg" : "/bad.jpg",
          promptUsed: fixHints?.length ? `focus:${fixHints.join(",")}` : "gen",
          imageBase64: good ? "GOOD" : "BAD",
          allowHqOkL0: true,
          fidelityMissing: [],
          strategy: mode === "edit" ? "agnes_i2i" : "generate",
        };
      },
    });
    ok("loop eventually pass via M", out.visualPass === true, String(out.stopReason));
    ok("best url good", out.url === "/good");
  }

  {
    const forged = markHqOk({ qualityMode: "hq_update" });
    ok("markHqOk without visualPass → weak", forged.stillQuality === "weak");
    const keep = markKeepStill({ qualityMode: "hq_update" });
    ok("keep weak", keep.stillQuality === "weak" && keep.visualPass === false);
    const real = markHqOk({ visualPass: true, visualPassAt: new Date().toISOString() });
    ok("markHqOk with pass → hq", real.stillQuality === "hq_ok");
    ok(
      "infer degrades",
      inferStillQuality({ meta: { stillQuality: "hq_ok" }, requireVisualPass: true }) === "weak",
    );
  }

  {
    const lines = ["今日何人敢来"];
    const items = buildAudioLiteraryFidelityChecklist({
      dialogueLines: lines,
      audioPrompt: "No spoken dialogue. ambient only.",
      videoPrompt: "[Audio]\nNo spoken dialogue.\n",
      emotionTarget: "冷厉",
    });
    const bad = assertAudioLiteraryFidelity({
      items,
      audioPrompt: "No spoken dialogue. ambient only.",
      videoPrompt: "[Audio]\nNo spoken dialogue.\n",
    });
    ok("audio xor catches silence", !bad.ok);
    const synced = syncDualAudioSsot({
      audioPrompt: "",
      videoPrompt: "[Audio]\nambient only\n",
      dialogueLines: lines,
    });
    ok("sync helps dialogue", synced.synced);
    const patched = applyAudioStrengthenToPrompt("No spoken dialogue. ambient only.", {
      audioXor: "fix",
    });
    ok(
      "strengthen audioXor consumes",
      !/No spoken dialogue/i.test(patched) || /spoken dialogue required/i.test(patched),
    );
    const san = sanitizeVideoPrompt({
      prompt: "[Audio]\nNo spoken dialogue.\n",
      dialogueLines: lines,
      strengthen: { audioXor: "fix", lipSyncPolicy: "natural_emphasized" },
    });
    ok(
      "sanitize consumes strengthen",
      san.changes.includes("strengthen_audio_consume") || /lip-sync/i.test(san.prompt),
    );
  }

  {
    const l1 = runAudioLiteraryL1({
      hasDialogue: true,
      vendorReportedAudio: false,
    });
    ok("silence finding", l1.findings.some((f) => f.id === "QC-SILENCE") && !l1.audioPass);
    const post = runPostBurnRuntime({
      hasDialogue: true,
      visualPass: true,
      audioL1: { vendorReportedAudio: false },
    });
    ok("postBurn seeds strengthen", Object.keys(post.seedStrengthen).length > 0);
    ok("videoPass false on silence", !post.videoPass);
    const unified = unifyHealBudget([createHealBudget({ regenRetriesUsed: 1 }), post.healBudget]);
    ok("unify budget", unified.regenRetriesUsed >= 1);
  }

  {
    const h = assertStillMouthVideoHandoff({
      stillPrompt: "mouth closed neutral_closed",
      videoPrompt: "lip-sync natural mouth movement for dialogue",
    });
    ok("mouth handoff warns", !h.ok && Boolean(h.strengthen?.lipSyncPolicy));
  }

  {
    const flf = assertFlfEndFrameFidelity({
      modeId: "firstLastFrame",
      endBeatDescription: "",
      nextContinuityFrom: "接上镜",
    });
    ok("flf missing end", !flf.ok);
    const orphan = assertFlfEndFrameFidelity({
      modeId: "startEndRequired",
      endBeatDescription: "沈母仍端坐",
      endFramePrompt: "沈母仍端坐太师椅",
      endFramePath: "",
      nextContinuityFrom: "仍在厅中",
      characterNames: ["沈母"],
    });
    ok("flf orphan when no path", orphan.orphan || !orphan.ok);
  }

  {
    const inj = buildCrossShotContinuityInject({
      continuityFrom: "上一镜沈母起身",
      neighborStillPresent: true,
    });
    ok("cross soft ref", inj.softRefRequired && /continuity/.test(inj.promptFragment));
    const sorted = sortStoryboardsForContinuity([
      { id: 2, track: "A", index: 2 },
      { id: 1, track: "A", index: 1 },
    ]);
    ok("sort by index", sorted[0]!.id === 1);
  }

  {
    ensureJudgeCorpusDir();
    const id = `golden-test-${Date.now()}`;
    writeJudgeCorpusEntry({
      id,
      createdAt: new Date().toISOString(),
      description: "测试",
      items: [{ id: "x", pass: true }],
      expected: [{ id: "x", pass: false }],
      source: "golden",
    });
    const disag = findJudgeDisagreements().filter((d) => d.id === id);
    ok("disagreement detected", disag.length === 1);
    const pairs = exportJudgePreferencePairs().filter((p) => p.corpusId === id);
    ok("preference pair", pairs.length === 1);
    try {
      fs.unlinkSync(path.join(process.cwd(), "data/fixtures/golden/still_judge_corpus", `${id}.json`));
    } catch {
      /* ignore */
    }
  }

  {
    const refs = mergeEditReferenceList({
      crefOrderedRefs: [
        { type: "image", base64: "A", role: "cref" },
        { type: "image", base64: "B", role: "cref" },
      ],
      failedImageBase64: "FAIL",
    });
    ok("cref before failed", refs[0]!.base64 === "A" && refs.at(-1)!.base64 === "FAIL");
  }

  {
    const p = buildEditFocusPrompt({ literaryPrompt: "文学正文", fixHints: ["端坐", "扳指"] });
    ok("edit focus", /Edit焦点/.test(p) && /端坐/.test(p));
  }

  // --- VLM infra: stop without burning Edit/M ---
  {
    let editCalls = 0;
    const out = await runStillVisualFidelityLoop({
      qualityMode: "hq_update",
      storyboardId: 99,
      description: "沈母端坐",
      checklist: [
        {
          id: "seat",
          kind: "seating",
          mustTokens: ["端坐"],
          vlmQuestion: "端坐?",
          healInject: "端坐",
          strengthenKey: "roleLock",
          strengthenValue: "sit",
        },
      ],
      healBudget: createHealBudget({ maxRegenRetries: 2 }),
      judgeFn: async () => {
        throw new Error("vlm_transport_timeout");
      },
      generateOnce: async ({ mode }) => {
        if (mode === "edit") editCalls++;
        return {
          url: "/once",
          savePath: "/once.jpg",
          promptUsed: "gen",
          imageBase64: "IMG",
          allowHqOkL0: true,
          fidelityMissing: [],
          strategy: mode === "edit" ? "agnes_i2i" : "generate",
        };
      },
    });
    ok("vlm throw → stopReason vlm_error", out.stopReason === "vlm_error", String(out.stopReason));
    ok("vlm throw uses at most 1 infra Edit bypass", editCalls === 1, `editCalls=${editCalls}`);
    ok("vlm throw still not hq", out.visualPass === false && out.stillQuality === "weak");
    ok("vlmError surfaced", Boolean(out.vlmError), String(out.vlmError));
    ok("vlm throw pending human rejudge", out.pendingHumanRejudge === true);
  }

  // --- who+verb glue must not enter egress/predicates ---
  {
    const { stripWhoVerbGlue, extractDescPredicates } = await import(
      "../src/ruleEngine/compilers/extractDescPredicates"
    );
    ok("strip who+跪", stripWhoVerbGlue("沈清瓷跪") === "沈清瓷");
    ok("strip who+端坐", stripWhoVerbGlue("沈母端坐") === "沈母");
    const pack = extractDescPredicates({
      description: "沈清瓷跪在厅中",
      characterNames: ["沈清瓷"],
    });
    ok(
      "predicate who not glued",
      pack.predicates.every((p) => p.who !== "沈清瓷跪" && !(p.who && /跪$/.test(p.who))),
      JSON.stringify(pack.predicates.map((p) => p.who)),
    );
    const dirtyWho = "沈清瓷跪必须端正，沈母端坐太师椅";
    const n = normalizeStillEgressPrompt(dirtyWho);
    ok("egress strips who glue or notes", n.changed || !/沈清瓷跪必须/.test(n.prompt), n.prompt.slice(0, 80));
  }

  // --- literary edit prompt: no contract English noise ---
  {
    const { buildLiteraryEditPrompt } = await import("../src/ruleEngine/compilers/stillEditLiteraryPrompt");
    const lit = buildLiteraryEditPrompt({
      description: "沈母端坐高位",
      fullPrompt:
        "沈母端坐高位 vertical 9:16 first frame, subtle on the locked character face QF-EXPR-01, keep face identity",
      fixHints: ["改成端坐"],
    });
    ok("edit literary body zh", /沈母端坐/.test(lit));
    ok("edit no vertical9 contract", !/vertical\s*9:16/i.test(lit));
    ok("edit has fixHint focus", /改成端坐/.test(lit));
  }

  // --- DC-01 human envelope: never raw dialogue_hash_mismatch→SB alone ---
  {
    const { buildDc01HumanEnvelope } = await import("../src/ruleEngine/heal/dc01Envelope");
    const { buildBurnGateEnvelope } = await import("../src/ruleEngine/compilers/burnGateEnvelope");
    const env = buildDc01HumanEnvelope({
      evidence: { missingCount: 2, missingSamples: ["再见"], repairReasons: ["unique_missing_line"] },
    });
    ok("dc01 human msg", /台词|剧本/.test(env.userMessage));
    ok("dc01 no raw arrow SB", !/dialogue_hash_mismatch\s*→\s*SB/.test(env.userMessage));
    const burn = buildBurnGateEnvelope([
      { id: "DC-01", message: "缺台词", reverseTrigger: "dialogue_hash_mismatch" },
    ]);
    ok("burn uses human copy", /台词|剧本/.test(burn.userMessage));
    ok("burn soft_patch CTA", burn.primaryNextStep === "soft_patch");
  }

  // --- golden-dc01-video500: persist-shaped soft_patch + source video guards ---
  {
    const { dc01Adapter } = await import("../src/ruleEngine/precheckLoop/adapters/dc01");
    const { createInMemoryPatchApplier } = await import("../src/ruleEngine/precheckLoop/ports");
    const { dialogueCoverageReport } = await import("../src/ruleEngine/design/dialogueCoverage");
    const { buildDc01HumanEnvelope } = await import("../src/ruleEngine/heal/dc01Envelope");

    const persistShape = {
      bundleVersion: "browser-chat-optimized",
      rulePackVersion: "2.0.1",
      bundleType: "script",
      script: "场1\n沈母：春日宴上？\n沈清瓷：女儿在场。",
      planData: {
        dialoguePlan: {
          lines: [
            { speaker: "沈母", text: "春日宴上？", lineId: "L-01" },
            { speaker: "沈清瓷", text: "女儿在场。", lineId: "L-02" },
          ],
        },
      },
      preDesignPack: {
        scriptPlan: "#",
        shots: [
          {
            shotIndex: 1,
            storyboardId: 1,
            duration: 4,
            narrative: {
              dialogue: { lines: [{ speaker: "沈母", text: "春日宴上？", lineId: "L-01" }] },
            },
          },
        ],
      },
    } as never;

    const finding = dc01Adapter.diagnose({ bundle: persistShape, scope: { mode: "full" } });
    const patches = dc01Adapter.suggestRepair?.(finding, { bundle: persistShape, scope: { mode: "full" } }) ?? [];
    const applied = createInMemoryPatchApplier().apply(persistShape, patches);
    const after = dialogueCoverageReport({
      script: (persistShape as { script: string }).script,
      shots: applied.bundle.preDesignPack?.shots ?? [],
      planData: (persistShape as { planData: unknown }).planData as never,
    });
    ok("dc01 persist-shape coverage ok", after.ok === true, JSON.stringify(after.missingKeys));
    const env = buildDc01HumanEnvelope({ evidence: { missingCount: 0 } });
    ok("dc01 persist UI never raw →SB", !/dialogue_hash_mismatch\s*→\s*SB/.test(env.userMessage));

    const genSrc = fs.readFileSync(
      path.join(process.cwd(), "src/routes/production/workbench/generateVideo.ts"),
      "utf-8",
    );
    const batchSrc = fs.readFileSync(
      path.join(process.cwd(), "src/routes/production/workbench/batchGenerateVideo.ts"),
      "utf-8",
    );
    ok("audio L0 catch → 400 not bare throw", /AUD-LIT-L0/.test(genSrc) && /catch \(e\)/.test(genSrc));
    ok("generateVideo outer GENERATE_VIDEO 500", /GENERATE_VIDEO/.test(genSrc));
    ok("batch filePath?.type", /filePath\?\.type/.test(batchSrc));
    ok("batch MEDIA_PATH_MISSING per-track", /MEDIA_PATH_MISSING/.test(batchSrc));
    ok("batch no bare filePath.type", !/sources:\s*filePath\.type\b/.test(batchSrc));
    ok("batch BATCH_GENERATE_VIDEO catch", /BATCH_GENERATE_VIDEO/.test(batchSrc));
    ok("batch audioGateDeferred", /audioGateDeferred/.test(batchSrc));
  }

  // --- still quality dual-fail plan: VLM SSOT + egress + infra bypass + 97a9 acceptance ---
  {
    const { resolveVlmInvokeKeys, resolveVlmCatalogEntry } = await import(
      "../src/ruleEngine/qc/vlmModelResolve"
    );
    const alias = resolveVlmCatalogEntry("Doubao-Seed-1.6");
    ok("alias Doubao-Seed-1.6 → Vision", alias?.name === "Doubao-Seed-1.6-Vision");
    const keys = resolveVlmInvokeKeys({
      primary: "Doubao-Seed-1.6-Vision",
      fallbacks: ["Doubao-Seed-1.6", "Doubao-1.5-Vision-Pro-32K"],
    });
    ok("fallback alias resolves to API id", keys.keys.some((k) => /vision-250815/.test(k.apiModelName)));
    ok("no bare Doubao-Seed-1.6 invoke", !keys.keys.some((k) => k.display === "Doubao-Seed-1.6"));
    const fake = resolveVlmInvokeKeys({ primary: "Totally-Fake-Model-XYZ" });
    ok("fake model missing", fake.keys.length === 0 && fake.missing.includes("Totally-Fake-Model-XYZ"));

    const dirty =
      "沈母端坐. subtle on the locked character face (do not identity); keep face identity, no exaggerated expression rewrite (QF-EXPR-06), no subtitle, no watermark, no Logo，沈清瓷与沈母周氏与沈母周氏不同脸";
    const n = normalizeStillEgressPrompt(dirty);
    ok("egress strips subtle contract", !/subtle on the locked/i.test(n.prompt));
    ok("egress strips QF-EXPR", !/QF-EXPR/i.test(n.prompt));
    ok("egress strips no subtitle tail", !/no subtitle/i.test(n.prompt));
    ok("egress dedupes multiface", !/沈母周氏与沈母周氏/.test(n.prompt), n.prompt.slice(0, 120));

    const loopCfg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "data/fixtures/still_visual_fidelity_loop.json"), "utf-8"),
    ) as { vlmFallbackModels?: string[]; _acceptance?: { localStillPath?: string }; vlmInfraEditBypassOnce?: boolean };
    ok(
      "fixture fallback not bare Doubao-Seed-1.6",
      !(loopCfg.vlmFallbackModels ?? []).includes("Doubao-Seed-1.6"),
    );
    ok(
      "acceptance local 97a9 path",
      /97a9b7c0-0c37-4f21-905b-1f4b98bcba05\.jpg/.test(String(loopCfg._acceptance?.localStillPath ?? "")),
    );
    ok("infra edit bypass enabled", loopCfg.vlmInfraEditBypassOnce !== false);

    let editCalls = 0;
    const bypassOut = await runStillVisualFidelityLoop({
      qualityMode: "hq_update",
      storyboardId: 97,
      description: "沈母端坐太师椅，沈清瓷跪蒲团",
      checklist: [
        {
          id: "forbidden:香案站立",
          kind: "forbidden",
          mustTokens: [],
          vlmQuestion: "香案?",
          healInject: "禁止香案站立仪式",
          strengthenKey: "negativeBan",
          strengthenValue: "no_altar_standing_ritual",
          forbidden: true,
        },
        {
          id: "role:沈母:端坐:太师椅",
          kind: "seating",
          mustTokens: ["端坐"],
          vlmQuestion: "端坐?",
          healInject: "沈母必须端坐太师椅",
          strengthenKey: "roleLock",
          strengthenValue: "sit",
        },
      ],
      healBudget: createHealBudget({ maxRegenRetries: 2 }),
      judgeFn: async () => {
        throw new Error("未找到模型 Doubao-Seed-1.6 id=volcengine");
      },
      generateOnce: async ({ mode, fixHints }) => {
        if (mode === "edit") editCalls++;
        return {
          url: mode === "edit" ? "/edited" : "/gen",
          savePath: mode === "edit" ? "/edited.jpg" : "/gen.jpg",
          promptUsed: fixHints?.length ? `edit:${fixHints.join(",")}` : "gen",
          imageBase64: "IMG",
          allowHqOkL0: true,
          fidelityMissing: [],
          strategy: mode === "edit" ? "agnes_i2i" : "generate",
        };
      },
    });
    ok("infra bypass stopReason vlm_error", bypassOut.stopReason === "vlm_error");
    ok("infra bypass not hq", bypassOut.stillQuality === "weak" && bypassOut.visualPass === false);
    ok("infra bypass ran 1 edit", editCalls === 1, `editCalls=${editCalls}`);
    ok("infra bypass pending human rejudge", bypassOut.pendingHumanRejudge === true);
    ok("infra bypass flag", bypassOut.infraEditBypassUsed === true);

    const { composeStillPrompt } = await import("../src/ruleEngine/compilers/composeStillPrompt");
    const seat = composeStillPrompt({
      visualDescription: "沈母端坐太师椅摩挲扳指，沈清瓷跪低位蒲团抄书",
      characters: [
        { code: "CHAR-A", name: "沈清瓷", kind: "character", hasImage: true },
        { code: "CHAR-B", name: "沈母周氏", kind: "character", hasImage: true },
      ],
      referenceUrlCount: 3,
      qualityMode: "hq_update",
    });
    ok(
      "scene sref seat lock source",
      seat.sources.includes("refs.sceneSrefSeatLock") || /座次锁|不得替换太师椅/.test(seat.prompt),
      seat.sources.join(","),
    );
    ok("seat lock bans altar as main", /香案|供桌|座次锁/.test(seat.prompt));
  }

  if (failed) {
    console.error(`\n${failed} failed`);
    process.exit(1);
  }
  console.log("\nvisual-system-fidelity: all passed");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
