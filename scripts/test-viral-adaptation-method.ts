/**
 * Viral adaptation method goldens — peaks/hooks, briefs, design-time gates, packs.
 */
import assert from "node:assert/strict";
import {
  compileAdaptationConstraintBlock,
  getGenreTemplateFromPlan,
  loadGenreTemplatePack,
  setGenreTemplateOnPlan,
  syncPackIdAliases,
  appendViralDerivation,
  getViralDerivations,
  catalogForPicker,
  clearGenrePackCache,
} from "../src/ruleEngine/genre/loadGenreTemplatePack";
import {
  compileStageWritingBrief,
  compileViralWritingContext,
  buildViralAgentInjectBlock,
  scoreTemplateFill,
} from "../src/ruleEngine/genre/compileWritingBrief";
import { stageIdFromAgentKey } from "../src/ruleEngine/genre/viralAgentInject";
import { expandWeaponToShots, previewWeaponFeasibility } from "../src/ruleEngine/genre/expandWeaponToShots";
import { runDesignExitGate } from "../src/ruleEngine/design/designExitGate";
import { scoreAdaptationDesign } from "../src/ruleEngine/design/adaptScorecard";
import { smartMatchViralFormula } from "../src/ruleEngine/design/smartMatch";
import { getEmotionNormFromPlan } from "../src/ruleEngine/emotion/emotionNorm";
import { flattenDialogueText } from "../src/ruleEngine/design/dialogueCoverage";
import { literaryHintIsFallbackOnly } from "../src/ruleEngine/design/designExitGate";
import {
  extractPeakLedgerFromText,
  validateHookPlan,
  validatePeakLedger,
} from "../src/ruleEngine/design/extractPeakLedger";
import { validateShotDesignIntents } from "../src/ruleEngine/design/shotDesignIntent";
import {
  loadViralRhythmContract,
  setLiteraryLocked,
  isLiteraryLocked,
  setViralPrefs,
  clearViralRhythmContractCache,
} from "../src/ruleEngine/design/viralDoctrine";
import { healViralDesignRouter } from "../src/ruleEngine/design/healViralDesignRouter";
import {
  reconstructStoryFromSignals,
  confirmPendingStoryRecon,
} from "../src/ruleEngine/design/reconstructStoryFromSignals";
import { redesignCharacterDialogue } from "../src/ruleEngine/design/redesignCharacterDialogue";
import { bindViralSidecarForCompile } from "../src/ruleEngine/design/bindViralSidecarForCompile";

function ok(name: string, cond: boolean) {
  if (!cond) throw new Error(`FAIL: ${name}`);
  console.log(`✓ ${name}`);
}

clearGenrePackCache();

const war = loadGenreTemplatePack("war_god");
const sweet = loadGenreTemplatePack("sweet");
ok("packs load", war.packId === "war_god" && sweet.packId === "sweet");
ok("war designThinking", Boolean(war.designThinking));
ok("sweet stage templates", Boolean(sweet.stageOutputTemplates?.W3?.mustEmit?.length));
ok("constraint blocks differ", compileAdaptationConstraintBlock("war_god") !== compileAdaptationConstraintBlock("sweet"));
ok("constraint has true peaks", compileAdaptationConstraintBlock("war_god").includes("真视听爆点"));
ok("catalog has >=4", catalogForPicker().length >= 4);

const match = smartMatchViralFormula("赘婿逆袭打脸首富身份揭穿");
ok("smart match war_god", match.recommendedPackId === "war_god");
ok("picker reasons", match.reasons.length > 0);

const five = previewWeaponFeasibility("five_cut_reveal");
ok("five cut preview 5", five.ok && five.shotCount === 5);
const parent = {
  clientId: "s1",
  narrative: { dialogue: { lines: [{ speaker: "男主", text: "跪下。" }] }, emotionIntensity: 9 },
  videoDesc: "近景 gentle push, 2s",
};
const expanded = expandWeaponToShots("five_cut_reveal", parent);
ok("five cut expands to 5", expanded.expanded && expanded.shots.length === 5);
const dlg = flattenDialogueText(
  (expanded.shots.find((s) => (s as { beatRole?: string }).beatRole === "speak") as { narrative?: { dialogue?: { lines?: unknown } } })
    ?.narrative?.dialogue?.lines,
);
ok("dialogue preserved on speak", dlg.includes("跪下"));
const again = expandWeaponToShots("five_cut_reveal", expanded.shots[0] as Record<string, unknown>);
ok("weapon expand idempotent on child", !again.expanded);

const plan: Record<string, unknown> = { planData: {} };
setGenreTemplateOnPlan(plan, { packId: "sweet", provisional: true, markStale: false });
ok("alias emotionNorm", getEmotionNormFromPlan(plan).activeProfileId === "sweet");
ok("genreTemplate set", getGenreTemplateFromPlan(plan).packId === "sweet");
syncPackIdAliases(plan);
ok("sync aliases stable", getGenreTemplateFromPlan(plan).packId === getEmotionNormFromPlan(plan).activeProfileId);

appendViralDerivation(plan, "本剧加系统面板打脸", "P0");
ok("derivation stored", getViralDerivations(plan).length === 1);
const block = compileAdaptationConstraintBlock("sweet", { derivations: getViralDerivations(plan) });
ok("derivation in constraint block", block.includes("系统面板"));

// --- peak / hook extract ---
const slapText =
  "宴会厅里，岳母狠狠扇了她一巴掌。赘婿冷笑：跪下。众人惊呼他就是战神，真实身份掉马，齐声跪地。";
const extracted = extractPeakLedgerFromText(slapText, { packId: "war_god" });
ok("extract peaks non-empty", extracted.peakLedger.length >= 1);
ok("peaks have avPayload", validatePeakLedger(extracted.peakLedger).ok);
ok("hook plan opening", validateHookPlan(extracted.hookPlan).ok);
ok("opening has duration", (extracted.hookPlan.opening?.suggestedDurationSec ?? 0) > 0);

const villa = extractPeakLedgerFromText("别墅很大，豪华装修，阳光明媚，走过长廊。", { packId: "war_god" });
ok("false peak villa rejected or empty peaks", villa.peakLedger.length === 0 || villa.rejectedFalsePeaks.length > 0);

const sweetExtract = extractPeakLedgerFromText("他轻轻说我爱你，又为她上药包扎。", { packId: "sweet" });
ok("sweet confession/care peaks", sweetExtract.peakLedger.length >= 1);

const warBrief = compileStageWritingBrief("war_god", "W3", {
  peakLedger: extracted.peakLedger,
  hookPlan: extracted.hookPlan,
});
const sweetBrief = compileStageWritingBrief("sweet", "W3", {
  peakLedger: sweetExtract.peakLedger,
  hookPlan: sweetExtract.hookPlan,
});
ok("briefs differ by genre", warBrief !== sweetBrief);
ok("brief has duration norms", warBrief.includes("时长"));
ok("brief has opening hook", warBrief.includes("hookPlan") || warBrief.includes("开场"));
ok("war brief 原→改", warBrief.includes("原：") || warBrief.includes("原→改"));
ok("sweet brief 原→改 differs", !sweetBrief.includes("参见少主") || sweetBrief.includes("上药") || sweetBrief.includes("棉签"));
ok("stageIdFromAgentKey P06", stageIdFromAgentKey("scriptAgent:storySkeletonAgent:assistant:execution:storyCore") === "P06");
ok("stageIdFromAgentKey W1", stageIdFromAgentKey("assistant:execution:storySkeleton") === "W1");
ok(
  "inject block builder",
  buildViralAgentInjectBlock(
    compileViralWritingContext(
      { planData: { genreTemplate: { packId: "war_god" }, peakLedger: extracted.peakLedger, hookPlan: extracted.hookPlan } },
      "P06",
    ),
  ).includes("先展示"),
);

// Exit gate: missing av tags should fail viral W3
const failPlan: Record<string, unknown> = {
  planData: {
    genreTemplate: { packId: "war_god", adaptationDepth: "viral" },
    emotionNorm: { activeProfileId: "war_god", normVersion: "1.0.0" },
    narrativeSelfcheck: { passed: true },
    dialoguePlan: {
      lines: [{ text: "这房子从来就不是你的你给我听好了！", functions: ["emotion_hit"] }],
    },
    implementationPlan: [],
    sceneMeta: [],
  },
};
const gate = runDesignExitGate("W3", failPlan);
ok("W3 exit fails without materials", !gate.ok);
ok("CTA optimize not production", gate.nextAction === "optimize_here" || gate.nextAction === "rollback");
ok("false green caught or lip fail", gate.failedIds.length > 0);

const fakeHookPlan: Record<string, unknown> = {
  planData: {
    genreTemplate: { packId: "war_god", adaptationDepth: "viral" },
    hookPlan: { opening: { hookId: "h1", slot: "opening", hookType: "crisis", visualBeat: "", audioBeat: "", targetEmotion: "爽", suggestedDurationSec: 0 } },
    peakLedger: [],
  },
};
const fakeHookGate = runDesignExitGate("P0", fakeHookPlan);
ok("fake hook fails P0", !fakeHookGate.ok && fakeHookGate.failedIds.some((id) => /HOOK|PEAK|FORMULA/i.test(id)));

const passPlan: Record<string, unknown> = {
  script: "<scriptItem>EP01</scriptItem>",
  planData: {
    genreTemplate: { packId: "war_god", adaptationDepth: "viral" },
    sceneAvTags: [{ sceneRef: 1, tags: ["war_god", "硬光"] }],
    sceneMeta: [{ sceneRef: 1, avCausality: { visualPeak: "仰拍", audioBeat: "bass" }, avTags: ["war_god"] }],
    narrativeBrief: {
      implementationPlan: [{ sceneRef: 1, fxIntent: { level: "F0" } }],
    },
    implementationPlan: [{ sceneRef: 1, fxIntent: { level: "F0" } }],
    retentionPlan: { opening5sHook: "打脸" },
    peakLedger: extracted.peakLedger,
    hookPlan: extracted.hookPlan,
    changeLog: "假宴会铺陈 → 真巴掌打脸+身份掉马可拍钩",
    reconstructionTrace: [{ from: "别墅开会", to: "宴会巴掌+跪下", why: "真视听峰" }],
    shotDesignIntent: [
      {
        intentId: "i1",
        purpose: "钩子",
        emotionGoal: "爽",
        picture: "巴掌落点",
        shotSizeIntent: "特写",
        cutIntent: "声画先导",
        audioIntent: "巴掌声",
        durationSec: 1.2,
        peakId: extracted.peakLedger[0]?.peakId,
        hookId: "hook-opening",
      },
    ],
    dialoguePlan: {
      lines: [
        {
          text: "这房子从来就不是你的你给我听好了！",
          splitHint: "reaction_shot",
          reactionAction: "女主僵住",
          functions: ["emotion_hit"],
          causedByActionId: "slap_beat",
        },
      ],
    },
    narrativeSelfcheck: { passed: true },
    adaptationMatrixStructured: { userConfirmed: true, matrix: [], deepAdaptation: { nameMap: [] } },
    script: "<scriptItem>EP01</scriptItem>",
  },
};
ok("shot intents valid", validateShotDesignIntents((passPlan.planData as { shotDesignIntent: unknown[] }).shotDesignIntent as never).ok);
const fill = scoreTemplateFill(passPlan, "W3");
ok("template fill mostly ok", fill.ratio >= 0.7);
const gate2 = runDesignExitGate("W3", passPlan);
ok(
  "W3 can pass with co-produced fields",
  gate2.ok || gate2.failedIds.every((id) => id === "DEX-DC-ALIGN" || id === "DEX-VOICE-AV" || id === "DEX-CAM-TAGS"),
);

const ctx = compileViralWritingContext(passPlan, "W3");
ok("viralWritingContext has brief", ctx.stageBrief.includes("战神") || ctx.stageBrief.includes("爆款"));
ok("context duration lines", ctx.durationNormLines.length > 0);
ok("brief has 原→改", ctx.stageBrief.includes("原→改") || ctx.stageBrief.includes("改编重构示范"));
ok("brief has paypoint", ctx.stageBrief.includes("付费卡"));
ok("agent inject has 原→改 instruction", ctx.agentInjectBlock.includes("原→改"));
ok("recon examples on pack", (war.reconstructionExamples?.length ?? 0) >= 2);
ok("sweet recon differs", (sweet.reconstructionExamples?.[0]?.to ?? "") !== (war.reconstructionExamples?.[0]?.to ?? ""));
ok("extract has paypoint", Boolean(extracted.hookPlan.paypointIntent?.cutBeforeBeat));
ok("weapon on recon example", war.reconstructionExamples?.[0]?.weaponId === "five_cut_reveal");

const p06Gate = runDesignExitGate("P06", {
  planData: {
    genreTemplate: { packId: "war_god", adaptationDepth: "viral" },
    peakLedger: extracted.peakLedger,
    hookPlan: extracted.hookPlan,
    changeLog: "原平铺→真视听钩",
    reconstructionTrace: [{ from: "开会", to: "跪下打脸", why: "爆点可拍" }],
  },
});
ok("P06 passes with peak+hook+paypoint+recon applied", p06Gate.ok || p06Gate.failedIds.length === 0);

const sbPlan: Record<string, unknown> = {
  planData: {
    genreTemplate: { packId: "war_god", adaptationDepth: "viral" },
    shotDesignIntent: [
      {
        intentId: "i1",
        purpose: "钩子",
        emotionGoal: "爽",
        picture: "巴掌",
        shotSizeIntent: "特写",
        cutIntent: "五刀",
        audioIntent: "巴掌声",
        durationSec: 1.2,
        peakId: extracted.peakLedger[0]?.peakId,
        hookId: "hook-opening",
        weaponId: "five_cut_reveal",
        sfxIntent: ["巴掌声", "bass"],
      },
    ],
    dialoguePlan: {
      lines: [{ text: "短", splitHint: "x", reactionAction: "y", functions: ["emotion_hit"] }],
    },
  },
};
const sbGate = runDesignExitGate("SB", sbPlan);
ok(
  "SB bridge wants shot+sfx",
  sbGate.ok || !sbGate.failedIds.includes("DEX-SFX-BRIDGE") || sbGate.failedIds.every((id) => /ESTABLISHING|LIP/i.test(id)),
);

const score = scoreAdaptationDesign({
  sceneAvTags: [{ sceneRef: 1 }],
  sceneMeta: [{ sceneRef: 1 }],
  dialoguePlanLines: [{ text: "短句", functions: [] }],
  hasOpeningHook: true,
  hasPeakLedger: true,
  hasShotIntent: true,
  narrativeSelfcheckPassed: true,
});
ok("adapt score numeric", score.score >= 50);

ok("literary hint fallback flag", literaryHintIsFallbackOnly() === true);

// mid switch stale
setGenreTemplateOnPlan(plan, { packId: "war_god", markStale: true, literaryStale: true });
ok("switch marks stale", getGenreTemplateFromPlan(plan).structureStale === true);
const rebrief = compileViralWritingContext(plan, "W3");
ok("rebrief after switch", rebrief.packId === "war_god" && rebrief.literaryStale === true);

// --- doctrine / heal / reverse / lock ---
clearViralRhythmContractCache();
const contract = loadViralRhythmContract();
ok("rhythm contract ep1 scope", contract.hardNorms?.episodeScope === "ep1");
ok("doctrine brief lines", (contract.briefLines?.length ?? 0) >= 3);
ok("constraint allows design-time rewrite", compileAdaptationConstraintBlock("war_god").includes("设计期"));

const healPlan: Record<string, unknown> = {
  planData: {
    genreTemplate: { packId: "war_god", adaptationDepth: "viral" },
    dialoguePlan: { lines: [{ text: "观众感到很爽", speaker: "男主" }] },
    storyCore: "",
  },
};
const heal = healViralDesignRouter(healPlan, "W3", { maxRounds: 2, autoConfirmReverse: false });
ok("heal produces changeDiff notes", heal.changeDiff.notes.length > 0);
ok("heal strips or flags audience meta path", Boolean(heal.changeDiff.redesign?.length || heal.changeDiff.notes.some((n) => /D:|B:|C:|E:|reverse/i.test(n))));

const reconPlan: Record<string, unknown> = {
  planData: {
    genreTemplate: { packId: "war_god", adaptationDepth: "viral" },
    peakLedger: extracted.peakLedger,
    storyCore: "",
  },
  _stepStatus: JSON.stringify({ W3: { status: "done" }, W1: { status: "done" } }),
};
const draft = reconstructStoryFromSignals(reconPlan, { forceKernel: true, confirm: false });
ok("reverse needs confirm", draft.needsUserConfirm === true && Boolean(draft.draft?.storyCore));
const confirmed = confirmPendingStoryRecon(reconPlan);
ok("confirm recon commits", confirmed.committed === true);
ok("cascade invalidated W3", (confirmed.cascade?.invalidatedSteps ?? []).includes("W3"));
ok("literary stale after recon", getGenreTemplateFromPlan(reconPlan).literaryStale === true);

const lockPlan: Record<string, unknown> = { planData: { dialoguePlan: { lines: [{ text: "旧" }] } } };
setLiteraryLocked(lockPlan, true);
ok("literary locked", isLiteraryLocked(lockPlan));
const blocked = redesignCharacterDialogue(lockPlan, {});
ok("lock blocks redesign", blocked.ok === false);

setViralPrefs(passPlan, { audienceTaste: "爽感", storyStyle: "直白快节奏", platformProfileId: "miniprogram_paywall" });
ok("brief has doctrine", compileViralWritingContext(passPlan, "W3").stageBrief.includes("主推"));

const bind = bindViralSidecarForCompile(passPlan);
ok("sidecar bind has prompt lines", bind.promptLines.length > 0);
ok("sfx list from intents", bind.sfxIntentList.length > 0);

const staleGate = runDesignExitGate("W3", reconPlan);
ok("stale blocks W3 exit", !staleGate.ok && staleGate.failedIds.includes("DEX-LITERARY-STALE"));

console.log("\nviral-adaptation-method OK");
