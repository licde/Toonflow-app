/**
 * Still visual literary fidelity loop — Critic → ImageEdit (M-way) → Verifier.
 * Edit rounds use fixHint focus; do not stack strengthen text on already-saturated prompts.
 */
import { readFixtureJson } from "../utils/fixturesPath";
import {
  canRegenRetry,
  consumeRegenRetry,
  createHealBudget,
  type HealBudgetState,
} from "../heal/healBudgetLedger";
import { emitHealObs } from "../heal/obsHealBridge";
import {
  collectFixHintsFromVlm,
  compactFidelityItems,
  mergeStrengthenMonotonic,
  missingSignature,
  strengthenFromMissing,
  type StillFidelityItem,
} from "../compilers/literaryFidelityChecklist";
import {
  failedItemsFromVlm,
  isAllVlmInfraFailure,
  stillLiteraryVlmJudge,
  type VlmItemResult,
  type VlmJudgeFn,
} from "./stillLiteraryVlmJudge";
import {
  loadStillImageEditConfig,
  resolveParallelM,
  type StillEditStrategy,
} from "./stillImageEdit";
import { routeStillRepair } from "./stillRepairRoute";

export interface StillVisualFidelityLoopConfig {
  version?: string;
  enabled?: boolean;
  maxVisualRounds?: number;
  vlmModelKey?: string;
  vlmFallbackModels?: string[];
  hqRequiresVisualPass?: boolean;
  skipVlmOnDraft?: boolean;
  stopOnRepeatedMissing?: boolean;
  preferEditOnRepeatedMissing?: boolean;
  l0MaxInjectRounds?: number;
  failClosedOnVlmError?: boolean;
  unknownDoesNotConverge?: boolean;
  /**
   * After VLM infra fail: optional one thin anti-collage retry.
   * Default OFF — Edit-on-failed-collage + 四视图 cref systematically makes 拼版 worse (2× spend).
   * Prefer return first frame as weak + human/key fix.
   */
  vlmInfraEditBypassOnce?: boolean;
}

const FALLBACK: StillVisualFidelityLoopConfig = {
  version: "1.3.0",
  enabled: true,
  maxVisualRounds: 2,
  vlmModelKey: "Doubao-Seed-1.6-Vision",
  vlmFallbackModels: ["Doubao-1.5-Vision-Pro-32K"],
  hqRequiresVisualPass: true,
  skipVlmOnDraft: true,
  stopOnRepeatedMissing: true,
  preferEditOnRepeatedMissing: true,
  l0MaxInjectRounds: 2,
  failClosedOnVlmError: true,
  unknownDoesNotConverge: true,
  vlmInfraEditBypassOnce: false,
};

export function loadStillVisualFidelityLoopConfig(): StillVisualFidelityLoopConfig {
  return {
    ...FALLBACK,
    ...readFixtureJson<StillVisualFidelityLoopConfig>("still_visual_fidelity_loop.json", FALLBACK),
  };
}

export function shouldRunVisualFidelityLoop(input: {
  qualityMode?: string | null;
  storyboardId?: number | null;
  config?: StillVisualFidelityLoopConfig;
}): boolean {
  const cfg = input.config ?? loadStillVisualFidelityLoopConfig();
  if (!cfg.enabled) return false;
  if (cfg.skipVlmOnDraft && input.qualityMode === "draft") return false;
  // HQ literary intent: run critic on workflow canvas too (no storyboardId escape)
  return input.qualityMode === "hq_update" || (!input.qualityMode && Boolean(input.storyboardId));
}

export function stillHqRequiresVisualPass(config?: StillVisualFidelityLoopConfig): boolean {
  return (config ?? loadStillVisualFidelityLoopConfig()).hqRequiresVisualPass !== false;
}

/** Historical hq_ok without visualPassAt → treat as weak for burn when required.
 * G0: Key absence must NOT skip degrade — only humanOverride / true measured pass keep hq_ok.
 */
export function degradeHqWithoutVisualPass(meta: {
  stillQuality?: string | null;
  visualPassAt?: string | null;
  visualPass?: boolean | null;
  pendingHumanRejudge?: boolean | null;
  infraEditBypassUsed?: boolean | null;
  fidelityStopReason?: string | null;
  vlmError?: string | null;
  humanOverride?: boolean | string | null;
} | null): "hq_ok" | "weak" | "missing" | null {
  if (!meta) return null;
  if (meta.stillQuality === "missing") return "missing";
  if (meta.stillQuality !== "hq_ok") return (meta.stillQuality as "weak") ?? "weak";
  if (!stillHqRequiresVisualPass()) return "hq_ok";
  // Human override stamp may keep hq path; Key-absent alone never skips degrade (G0)
  if (meta.humanOverride && (meta.visualPass === true || meta.visualPassAt)) return "hq_ok";
  if (meta.visualPass === true || meta.visualPassAt) return "hq_ok";
  return "weak";
}

export interface StillVisualGenerateOnceResult {
  url: string;
  savePath: string;
  promptUsed: string;
  imageBase64: string;
  allowHqOkL0: boolean;
  fidelityMissing: string[];
  strategy?: StillEditStrategy | "generate";
  layoutTemplateId?: string;
  layoutSkipped?: string;
  bgPolicy?: string;
  sceneRefsDropped?: number;
  stageCost?: number;
}

export interface StillVisualGenerateRoundArgs {
  round: number;
  strengthen: Record<string, string>;
  /** generate = full compose; edit = ImageEdit with fixHints + failed still */
  mode: "generate" | "edit";
  fixHints?: string[];
  failedImageBase64?: string;
  candidateIndex?: number;
  /** Smart repair: preserve composition via layout_preserve Edit */
  layoutPreserve?: boolean;
  /** When true, refuse layout_preserve (sheet / cast overcrowd) */
  forbidLayoutPreserve?: boolean;
  /** Smart repair: swap to alternate layout template on Stage A */
  swapLayoutTemplate?: boolean;
  excludeLayoutTemplateId?: string;
}

export interface StillVisualFidelityLoopResult {
  url: string;
  savePath: string;
  promptUsed: string;
  visualPass: boolean;
  stillQuality: "hq_ok" | "weak";
  itemResults: VlmItemResult[];
  rounds: number;
  autoHealed: string[];
  healBudget: HealBudgetState;
  strengthen: Record<string, string>;
  stopReason?:
    | "pass"
    | "converged"
    | "budget"
    | "skipped_draft"
    | "disabled"
    | "vlm_error"
    | "l0_block";
  fidelityItems: Array<{ id: string; pass: boolean; evidence?: string; fixHint?: string }>;
  visualPassAt?: string;
  bestPassCount?: number;
  editStrategy?: string;
  fixHintsUsed?: string[];
  parallelM?: number;
  vlmError?: string;
  /** VLM infra failed — FE should offer human rejudge; never treat as hq_ok */
  pendingHumanRejudge?: boolean;
  infraEditBypassUsed?: boolean;
  repairRoute?: string;
  layoutTemplateId?: string;
  bgPolicy?: string;
  sceneRefsDropped?: number;
  stageCost?: number;
  settingsDeepLink?: string;
  /** VLM single_frame / collage fail — persist for burn gate */
  sheetLeak?: boolean;
  /** When lit debt stops the loop — FE LitDetailDebtBar */
  repairCtaLabel?: string;
  repairMissingSlots?: string[];
  repairIrdPrimaryAction?: string;
}

export { detectSheetLeakFromVlmItems } from "../compilers/stillFirstFrameLiterarySsot";
import { detectSheetLeakFromVlmItems } from "../compilers/stillFirstFrameLiterarySsot";

function passCount(items: VlmItemResult[]): number {
  return items.filter((i) => i.pass && !i.unknown).length;
}

function healInjectHints(checklist: StillFidelityItem[], max = 8): string[] {
  try {
    const { sortHealInjects } =
      require("../compilers/stillLiteraryIntentSsot") as typeof import("../compilers/stillLiteraryIntentSsot");
    return sortHealInjects(checklist, max);
  } catch {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const c of checklist) {
      const h = String(c.healInject ?? "").trim();
      if (!h || seen.has(h)) continue;
      seen.add(h);
      out.push(h.slice(0, 80));
      if (out.length >= max) break;
    }
    return out;
  }
}

/**
 * On VLM infra failure: return first frame as weak by default.
 * Optional cfg.vlmInfraEditBypassOnce → one fresh generate (never i2i on failed collage).
 */
async function finishOnVlmInfra(input: {
  hitOnce: StillVisualGenerateOnceResult;
  judgedItems: VlmItemResult[];
  vlmError?: string;
  round: number;
  candCount: number;
  autoHealed: string[];
  budget: HealBudgetState;
  strengthen: Record<string, string>;
  checklist: StillFidelityItem[];
  cfg: StillVisualFidelityLoopConfig;
  generateOnce: (round: StillVisualGenerateRoundArgs) => Promise<StillVisualGenerateOnceResult>;
  bypassAlreadyUsed: boolean;
}): Promise<StillVisualFidelityLoopResult> {
  let { hitOnce, autoHealed, budget, strengthen } = input;
  let infraEditBypassUsed = false;
  let fixHintsUsed: string[] = [];
  // Explicit opt-in only — default OFF (Edit-on-collage makes 六宫格 worse)
  const allowBypass =
    input.cfg.vlmInfraEditBypassOnce === true &&
    !input.bypassAlreadyUsed &&
    canRegenRetry(budget);

  const settingsDeepLink = "/settings/vendor?focus=volcengine&field=apiKey";

  if (allowBypass) {
    let singleLock = "单镜头成片，禁四视图/拼版。";
    let sheetLock = "四视图仅借身份，禁复刻多格拼版。";
    let bgLock = "禁灰棚：浅景深保留室内可辨（木作/烛光）";
    let geomLock = "";
    try {
      const {
        STILL_SINGLE_FRAME_LOCK_EDIT_ZH,
        STILL_SHEET_AS_IDENTITY_ONLY_EDIT_ZH,
        STILL_CONTACT_GEOM_HEAL_TEMPLATE,
      } = require("../compilers/stillFirstFrameLiterarySsot") as typeof import("../compilers/stillFirstFrameLiterarySsot");
      singleLock = STILL_SINGLE_FRAME_LOCK_EDIT_ZH;
      sheetLock = STILL_SHEET_AS_IDENTITY_ONLY_EDIT_ZH;
      const { extractDeclaredContactLoci } =
        require("../compilers/stillLiteraryDetailQuality") as typeof import("../compilers/stillLiteraryDetailQuality");
      const locus = extractDeclaredContactLoci(input.hitOnce.promptUsed)[0];
      if (locus) geomLock = STILL_CONTACT_GEOM_HEAL_TEMPLATE.replace(/\{LOCUS\}/g, locus);
    } catch {
      /* keep short */
    }
    const basePrompt = String(hitOnce.promptUsed ?? "");
    const hints: string[] = [];
    if (geomLock) hints.push(geomLock);
    if (/背景弱化|禁止灰棚|灰棚/.test(basePrompt)) hints.push(bgLock);
    if (!/单镜头成片|禁四视图/.test(basePrompt)) hints.push(singleLock);
    if (!/四视图仅借身份|仅借脸型/.test(basePrompt)) hints.push(sheetLock);
    fixHintsUsed = [...new Set(hints.filter(Boolean))].slice(0, 4);
    if (!fixHintsUsed.length) fixHintsUsed = [singleLock, bgLock];
    emitHealObs("still_fidelity_vlm_infra_fresh_regen", {
      round: input.round,
      fixHints: fixHintsUsed.length,
      thin: true,
      noFailedBase: true,
    });
    try {
      const regenerated = await input.generateOnce({
        round: input.round + 1,
        strengthen: {},
        mode: "generate",
        fixHints: fixHintsUsed,
        // Never pass failed collage as i2i base — locks in 多宫格
        failedImageBase64: undefined,
        candidateIndex: 0,
        forbidLayoutPreserve: true,
      });
      hitOnce = regenerated;
      budget = consumeRegenRetry(budget);
      autoHealed = [...autoHealed, "vlm_infra_fresh_regen"];
      infraEditBypassUsed = true;
    } catch (e) {
      emitHealObs("still_fidelity_vlm_infra_fresh_regen_fail", {
        error: e instanceof Error ? e.message : String(e),
      });
      autoHealed = [...autoHealed, "vlm_infra_fresh_regen_fail"];
    }
  } else {
    autoHealed = [...autoHealed, "vlm_infra_no_burn"];
  }

  return {
    url: hitOnce.url,
    savePath: hitOnce.savePath,
    promptUsed: hitOnce.promptUsed,
    visualPass: false,
    stillQuality: "weak",
    itemResults: input.judgedItems,
    rounds: input.round + 1 + (infraEditBypassUsed ? 1 : 0),
    autoHealed,
    healBudget: budget,
    strengthen,
    stopReason: "vlm_error",
    fidelityItems: compactFidelityItems(input.judgedItems),
    parallelM: input.candCount,
    vlmError: input.vlmError,
    pendingHumanRejudge: true,
    infraEditBypassUsed,
    fixHintsUsed: fixHintsUsed.length ? fixHintsUsed : undefined,
    editStrategy: infraEditBypassUsed ? hitOnce.strategy : undefined,
    settingsDeepLink,
    // G0: keep collage truth from prompt heuristic; never force-clear for Key-absent
    sheetLeak: (() => {
      try {
        const { promptImpliesSheetCollageLeak } =
          require("../compilers/stillFirstFrameLiterarySsot") as typeof import("../compilers/stillFirstFrameLiterarySsot");
        return promptImpliesSheetCollageLeak(hitOnce.promptUsed);
      } catch {
        return false;
      }
    })(),
  };
}

function forbiddenFailCount(items: VlmItemResult[], checklist: StillFidelityItem[]): number {
  const forbid = new Set(checklist.filter((c) => c.forbidden).map((c) => c.id));
  return items.filter((i) => forbid.has(i.id) && (!i.pass || i.unknown)).length;
}

function allUnknown(items: VlmItemResult[]): boolean {
  return items.length > 0 && items.every((i) => i.unknown);
}

function pickBestCandidate(
  cands: Array<{
    once: StillVisualGenerateOnceResult;
    items: VlmItemResult[];
  }>,
  checklist: StillFidelityItem[],
): { once: StillVisualGenerateOnceResult; items: VlmItemResult[]; passCount: number } {
  let best = cands[0]!;
  let bestPc = passCount(best.items);
  let bestFf = forbiddenFailCount(best.items, checklist);
  for (let i = 1; i < cands.length; i++) {
    const c = cands[i]!;
    const pc = passCount(c.items);
    const ff = forbiddenFailCount(c.items, checklist);
    if (pc > bestPc || (pc === bestPc && ff < bestFf)) {
      best = c;
      bestPc = pc;
      bestFf = ff;
    }
  }
  return { once: best.once, items: best.items, passCount: bestPc };
}

/**
 * Run visual fidelity loop around vendor generateOnce / edit.
 */
export async function runStillVisualFidelityLoop(input: {
  qualityMode?: "hq_update" | "draft";
  storyboardId?: number;
  description: string;
  checklist: StillFidelityItem[];
  healBudget?: HealBudgetState;
  strengthen?: Record<string, string>;
  generateOnce: (round: StillVisualGenerateRoundArgs) => Promise<StillVisualGenerateOnceResult>;
  judgeFn?: VlmJudgeFn;
  forceSkipVlm?: boolean;
  db?: import("knex").Knex;
  bgPolicy?: "drop" | "demote" | "keep" | null;
  shotSize?: string | null;
  castNames?: string[] | null;
}): Promise<StillVisualFidelityLoopResult> {
  const cfg = loadStillVisualFidelityLoopConfig();
  const editCfg = loadStillImageEditConfig();
  let budget = input.healBudget ?? createHealBudget();
  let strengthen = { ...(input.strengthen ?? {}) };
  const autoHealed: string[] = [];
  const maxRounds = Math.max(1, cfg.maxVisualRounds ?? 2);
  const M = resolveParallelM({ qualityMode: input.qualityMode, config: editCfg });
  const disableStack = editCfg.disableStrengthenStackOnEdit !== false;

  if (
    !shouldRunVisualFidelityLoop({
      qualityMode: input.qualityMode,
      storyboardId: input.storyboardId,
      config: cfg,
    }) ||
    input.forceSkipVlm
  ) {
    const once = await input.generateOnce({ round: 0, strengthen, mode: "generate" });
    return {
      url: once.url,
      savePath: once.savePath,
      promptUsed: once.promptUsed,
      visualPass: once.allowHqOkL0 && (input.forceSkipVlm || !cfg.hqRequiresVisualPass),
      stillQuality:
        once.allowHqOkL0 && (input.forceSkipVlm || !cfg.hqRequiresVisualPass) ? "hq_ok" : "weak",
      itemResults: input.checklist.map((c) => ({
        id: c.id,
        pass: !once.fidelityMissing.includes(c.id),
      })),
      rounds: 1,
      autoHealed,
      healBudget: budget,
      strengthen,
      stopReason: input.forceSkipVlm || input.qualityMode === "draft" ? "skipped_draft" : "disabled",
      fidelityItems: compactFidelityItems(
        input.checklist.map((c) => ({ id: c.id, pass: !once.fidelityMissing.includes(c.id) })),
      ),
      parallelM: 1,
      sheetLeak: false,
    };
  }

  let lastSig = "";
  let last: StillVisualGenerateOnceResult | null = null;
  let lastItems: VlmItemResult[] = [];
  let bestEver: {
    once: StillVisualGenerateOnceResult;
    items: VlmItemResult[];
    passCount: number;
  } | null = null;
  let usedEdit = false;
  let lastFixHints: string[] = [];
  let editAttemptedOnSig = false;
  let nextLayoutPreserve = false;
  let nextSwapLayout = false;
  let excludeLayoutId: string | undefined;
  let lastRepairRoute: string | undefined;
  let lastSettingsDeepLink: string | undefined;

  for (let round = 0; round < maxRounds; round++) {
    const isEditRound = round > 0 && (usedEdit || nextLayoutPreserve);
    const mode: "generate" | "edit" = isEditRound ? "edit" : round === 0 ? "generate" : nextSwapLayout ? "generate" : "edit";
    if (round > 0 && mode === "edit") usedEdit = true;

    emitHealObs("still_fidelity_round", {
      round,
      mode,
      strengthenKeys: Object.keys(strengthen),
      M: round === 0 ? 1 : M,
      layoutPreserve: nextLayoutPreserve,
      swapLayout: nextSwapLayout,
    });

    const candCount = round === 0 ? 1 : M;
    const genArgsBase: Omit<StillVisualGenerateRoundArgs, "candidateIndex"> = {
      round,
      strengthen: mode === "edit" && disableStack ? {} : strengthen,
      mode,
      fixHints: lastFixHints,
      failedImageBase64: last?.imageBase64,
      layoutPreserve: nextLayoutPreserve || mode === "edit",
      swapLayoutTemplate: nextSwapLayout,
      excludeLayoutTemplateId: excludeLayoutId,
    };
    nextLayoutPreserve = false;
    nextSwapLayout = false;

    const onceList = await Promise.all(
      Array.from({ length: candCount }, (_, candidateIndex) =>
        input.generateOnce({ ...genArgsBase, candidateIndex }),
      ),
    );

    // L0 block on first candidate
    if (!onceList[0]!.allowHqOkL0 && round === 0) {
      const once = onceList[0]!;
      return {
        url: once.url,
        savePath: once.savePath,
        promptUsed: once.promptUsed,
        visualPass: false,
        stillQuality: "weak",
        itemResults: input.checklist.map((c) => ({
          id: c.id,
          pass: !once.fidelityMissing.includes(c.id),
        })),
        rounds: round + 1,
        autoHealed,
        healBudget: budget,
        strengthen,
        stopReason: "l0_block",
        fidelityItems: compactFidelityItems(
          input.checklist.map((c) => ({ id: c.id, pass: !once.fidelityMissing.includes(c.id) })),
        ),
        parallelM: candCount,
        sheetLeak: false,
      };
    }

    const judgedList = await Promise.all(
      onceList.map(async (once) => {
        const judged = await stillLiteraryVlmJudge({
          imageBase64: once.imageBase64,
          description: input.description,
          items: input.checklist,
          modelKey: cfg.vlmModelKey,
          judgeFn: input.judgeFn,
          db: input.db,
        });
        return { once, judged };
      }),
    );

    if (judgedList.some((j) => j.judged.error) && cfg.failClosedOnVlmError) {
      const hit = judgedList.find((j) => j.judged.error)!;
      emitHealObs("still_fidelity_vlm_error", { round, error: hit.judged.error });
      return finishOnVlmInfra({
        hitOnce: hit.once,
        judgedItems: hit.judged.items,
        vlmError: hit.judged.vlmError ?? hit.judged.error,
        round,
        candCount,
        autoHealed,
        budget,
        strengthen,
        checklist: input.checklist,
        cfg,
        generateOnce: input.generateOnce,
        bypassAlreadyUsed: autoHealed.includes("vlm_infra_edit_bypass"),
      });
    }

    const picked = pickBestCandidate(
      judgedList.map((j) => ({ once: j.once, items: j.judged.items })),
      input.checklist,
    );
    last = picked.once;
    lastItems = picked.items;
    if (!bestEver || picked.passCount > bestEver.passCount) {
      bestEver = { once: picked.once, items: picked.items, passCount: picked.passCount };
    }

    // Infra failure on picked: optional 1× literary Edit bypass, never hq_ok
    const infraHit = judgedList.find((j) => j.once === picked.once || j.judged.infraFailure);
    if (
      (infraHit?.judged.infraFailure || isAllVlmInfraFailure(picked.items)) &&
      cfg.failClosedOnVlmError !== false
    ) {
      emitHealObs("still_fidelity_vlm_error", {
        round,
        error: infraHit?.judged.error ?? "vlm_infra",
      });
      return finishOnVlmInfra({
        hitOnce: picked.once,
        judgedItems: picked.items,
        vlmError: infraHit?.judged.vlmError ?? infraHit?.judged.error,
        round,
        candCount,
        autoHealed,
        budget,
        strengthen,
        checklist: input.checklist,
        cfg,
        generateOnce: input.generateOnce,
        bypassAlreadyUsed: autoHealed.includes("vlm_infra_edit_bypass"),
      });
    }

    if (picked.items.every((i) => i.pass && !i.unknown)) {
      emitHealObs("still_fidelity_pass", { round, M: candCount });
      const at = new Date().toISOString();
      return {
        url: picked.once.url,
        savePath: picked.once.savePath,
        promptUsed: picked.once.promptUsed,
        visualPass: true,
        stillQuality: "hq_ok",
        itemResults: picked.items,
        rounds: round + 1,
        autoHealed,
        healBudget: budget,
        strengthen,
        stopReason: "pass",
        fidelityItems: compactFidelityItems(picked.items),
        visualPassAt: at,
        bestPassCount: picked.passCount,
        editStrategy: picked.once.strategy,
        fixHintsUsed: lastFixHints,
        parallelM: candCount,
        sheetLeak: false,
      };
    }

    const failed = failedItemsFromVlm(input.checklist, picked.items);
    const sig = missingSignature(failed);
    const unknownsOnly = cfg.unknownDoesNotConverge !== false && allUnknown(picked.items);

    lastFixHints = collectFixHintsFromVlm(picked.items, input.checklist, editCfg.maxFixHints ?? 6);

    // Smart repair route: layout swap vs layout_preserve Edit
    try {
      const { routeStillRepair } = await import("./stillRepairRoute");
      const sheetLeak = detectSheetLeakFromVlmItems(picked.items);
      const decision = routeStillRepair({
        itemResults: picked.items,
        checklist: input.checklist,
        bgPolicy: input.bgPolicy,
        sheetLeak,
        literaryPrompt: input.description,
        visualDescription: input.description,
        shotSize: input.shotSize,
        castNames: input.castNames,
      });
      lastRepairRoute = decision.route;
      lastSettingsDeepLink = decision.settingsDeepLink;
      // Design debt: stop heal loop — FE must split / hand-edit / regen prop still (never silent Edit wash)
      const stopPropDebt =
        (decision.missingSlots ?? []).some((s) => /propInFrame|contactGeom/i.test(String(s))) ||
        /重出带道具|propInFrame/i.test(String(decision.ctaLabel ?? ""));
      if (
        decision.nextStep === "split_shot" ||
        stopPropDebt ||
        (decision.nextStep === "chat_repair" &&
          (decision.irdPrimaryAction === "hand_edit_vd" ||
            decision.irdPrimaryAction === "confirm_enhance" ||
            decision.irdPrimaryAction === "confirm_split"))
      ) {
        emitHealObs("still_fidelity_stop_lit_debt", {
          round,
          missingSlots: decision.missingSlots,
          nextStep: decision.nextStep,
          stopPropDebt,
        });
        const keep = bestEver ?? { once: picked.once, items: picked.items, passCount: picked.passCount };
        return {
          url: keep.once.url,
          savePath: keep.once.savePath,
          promptUsed: keep.once.promptUsed,
          visualPass: false,
          stillQuality: "weak",
          itemResults: keep.items,
          rounds: round + 1,
          autoHealed: [
            ...autoHealed,
            decision.nextStep === "split_shot"
              ? "stop_split_shot"
              : stopPropDebt
                ? "stop_contact_prop"
                : "stop_lit_debt",
          ],
          healBudget: budget,
          strengthen,
          stopReason: "converged",
          fidelityItems: compactFidelityItems(keep.items),
          bestPassCount: keep.passCount,
          fixHintsUsed: lastFixHints,
          parallelM: candCount,
          sheetLeak: detectSheetLeakFromVlmItems(keep.items),
          repairCtaLabel: decision.ctaLabel,
          repairMissingSlots: decision.missingSlots,
          repairIrdPrimaryAction:
            decision.irdPrimaryAction ??
            (decision.nextStep === "split_shot" ? "confirm_split" : undefined),
        };
      }
      if (decision.route === "config") {
        emitHealObs("still_fidelity_stop_vlm_config", { round });
        const keep = bestEver ?? { once: picked.once, items: picked.items, passCount: picked.passCount };
        return {
          url: keep.once.url,
          savePath: keep.once.savePath,
          promptUsed: keep.once.promptUsed,
          visualPass: false,
          stillQuality: "weak",
          itemResults: keep.items,
          rounds: round + 1,
          autoHealed: [...autoHealed, "stop_vlm_key"],
          healBudget: budget,
          strengthen,
          stopReason: "vlm_error",
          fidelityItems: compactFidelityItems(keep.items),
          bestPassCount: keep.passCount,
          fixHintsUsed: lastFixHints,
          parallelM: candCount,
          sheetLeak: false,
          vlmError: decision.userMessage,
          repairCtaLabel: decision.ctaLabel,
          settingsDeepLink: decision.settingsDeepLink,
        };
      }
      if (decision.swapLayoutTemplate || sheetLeak) {
        nextSwapLayout = true;
        excludeLayoutId = picked.once.layoutTemplateId;
        usedEdit = false;
        nextLayoutPreserve = false;
        autoHealed.push(sheetLeak ? "repair_swap_layout_sheet_leak" : "repair_swap_layout");
      } else if (decision.layoutPreserveEdit) {
        const { shouldForbidLayoutPreserve } = await import("@/ruleEngine/compilers/stillRefSlotContract");
        const forbid =
          sheetLeak ||
          shouldForbidLayoutPreserve({
            failedItemIds: picked.items.filter((i) => !i.pass).map((i) => i.id),
            fixHints: lastFixHints,
          });
        if (forbid) {
          nextSwapLayout = true;
          excludeLayoutId = picked.once.layoutTemplateId;
          usedEdit = false;
          nextLayoutPreserve = false;
          autoHealed.push("repair_swap_layout_cast_overcrowd");
        } else {
          nextLayoutPreserve = true;
          usedEdit = true;
          autoHealed.push("repair_layout_preserve_edit");
        }
      }
      emitHealObs("still_fidelity_repair_route", {
        round,
        route: decision.route,
        nextStep: decision.nextStep,
      });
    } catch {
      /* route optional */
    }

    // Repeated missing: prefer one Edit pass with fixHint before converge
    if (cfg.stopOnRepeatedMissing && sig && sig === lastSig && !unknownsOnly) {
      if (cfg.preferEditOnRepeatedMissing && !editAttemptedOnSig && canRegenRetry(budget)) {
        editAttemptedOnSig = true;
        usedEdit = true;
        emitHealObs("still_fidelity_edit_on_repeat", { round, sig, fixHints: lastFixHints.length });
        // fall through to consume budget and continue as edit
      } else {
        emitHealObs("still_fidelity_stop_converged", { round, sig });
        const keep = bestEver ?? { once: picked.once, items: picked.items, passCount: picked.passCount };
        return {
          url: keep.once.url,
          savePath: keep.once.savePath,
          promptUsed: keep.once.promptUsed,
          visualPass: false,
          stillQuality: "weak",
          itemResults: keep.items,
          rounds: round + 1,
          autoHealed: [...autoHealed, "stop_converged"],
          healBudget: budget,
          strengthen,
          stopReason: "converged",
          fidelityItems: compactFidelityItems(keep.items),
          bestPassCount: keep.passCount,
          fixHintsUsed: lastFixHints,
          parallelM: candCount,
          sheetLeak: detectSheetLeakFromVlmItems(keep.items),
        };
      }
    }
    if (unknownsOnly) {
      emitHealObs("still_fidelity_unknown_no_converge", { round });
      // do not treat as same-sig converge
    }
    lastSig = sig;
    editAttemptedOnSig = false;

    if (round + 1 >= maxRounds || !canRegenRetry(budget)) {
      const keep = bestEver ?? { once: picked.once, items: picked.items, passCount: picked.passCount };
      return {
        url: keep.once.url,
        savePath: keep.once.savePath,
        promptUsed: keep.once.promptUsed,
        visualPass: false,
        stillQuality: "weak",
        itemResults: keep.items,
        rounds: round + 1,
        autoHealed,
        healBudget: budget,
        strengthen,
        stopReason: "budget",
        fidelityItems: compactFidelityItems(keep.items),
        bestPassCount: keep.passCount,
        fixHintsUsed: lastFixHints,
        parallelM: candCount,
        sheetLeak: detectSheetLeakFromVlmItems(keep.items),
      };
    }

    // Edit path: do not stack strengthen; generate path may still use strengthen once
    if (!disableStack || mode === "generate") {
      const patch = strengthenFromMissing(failed);
      strengthen = mergeStrengthenMonotonic(strengthen, patch);
    }
    usedEdit = true;
    budget = consumeRegenRetry(budget);
    autoHealed.push(`vlm_edit:${sig.slice(0, 40)}`);
  }

  const keep = bestEver ?? {
    once: last!,
    items: lastItems,
    passCount: passCount(lastItems),
  };
  return {
    url: keep.once.url,
    savePath: keep.once.savePath,
    promptUsed: keep.once.promptUsed,
    visualPass: false,
    stillQuality: "weak",
    itemResults: keep.items,
    rounds: maxRounds,
    autoHealed,
    healBudget: budget,
    strengthen,
    stopReason: "budget",
    fidelityItems: compactFidelityItems(keep.items),
    bestPassCount: keep.passCount,
    fixHintsUsed: lastFixHints,
    parallelM: M,
    repairRoute: lastRepairRoute,
    layoutTemplateId: keep.once.layoutTemplateId,
    bgPolicy: keep.once.bgPolicy ?? input.bgPolicy ?? undefined,
    sceneRefsDropped: keep.once.sceneRefsDropped,
    stageCost: keep.once.stageCost,
    settingsDeepLink: lastSettingsDeepLink,
    sheetLeak: detectSheetLeakFromVlmItems(keep.items),
  };
}
