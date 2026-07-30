/**
 * M0 ShotChainContract — one-shot SSOT for design→still→video egress.
 * Primary strong design; heal/supplement hang off this contract.
 */
import { createHash } from "crypto";
import { extractDescPredicates } from "../compilers/extractDescPredicates";
import { shouldWarnOneBeat } from "../compilers/stillIdentitySsot";
import { asDialogueLineObjects, flattenDialogueText } from "../design/dialogueCoverage";
import { hasOnCameraDialogue } from "../design/onCameraDialogue";
import { isCharOrphCode } from "./matchDescNamesToCasting";

export type ChainBreakAt =
  | "literary"
  | "split"
  | "import"
  | "still"
  | "video"
  | "audio"
  | "design"
  | "design_loss"
  | "cam_heal"
  | "cam_split"
  | "ok";

export type ChainEgressStage = "exit" | "import" | "compose" | "finalize" | "burn";

export type ShotChainContract = {
  clientId: string;
  shotIndex?: number;
  splitParentKey?: string;
  visualSplitRole?: string;
  literaryBeatRef?: string;
  visualDescription: string;
  anchorTokens: string[];
  dialogueFingerprint: string;
  hasOnCameraDialogue: boolean;
  durationSec: number;
  durationTrusted: boolean;
  shotSize?: string;
  camera?: string;
  charCodes: string[];
  designContentHash: string;
  multiBeat: boolean;
  stale: { still: boolean; video: boolean; burn: boolean };
};

export type ChainEgressFinding = {
  id: string;
  severity: "BLOCK" | "WARN";
  message: string;
  breakAt: ChainBreakAt;
  /** Literary/prop structure slots still missing (declare-only; never invent) */
  missingSlots?: string[];
};

export type ChainEgressResult = {
  ok: boolean;
  breakAt: ChainBreakAt;
  codes: string[];
  findings: ChainEgressFinding[];
  contract: ShotChainContract;
};

/** Dialogue-only fingerprint (M7 stale: dialogue drift ≠ literaryDescHash). */
export function computeDialogueFingerprint(shot: Record<string, unknown>): string {
  const narr = shot.narrative as { dialogue?: { lines?: unknown } } | undefined;
  const flat = flattenDialogueText(narr?.dialogue?.lines ?? []);
  return createHash("sha1").update(flat).digest("hex").slice(0, 12);
}

export function resolveShotDurationSec(shot: Record<string, unknown>): {
  durationSec: number;
  trusted: boolean;
  source: string;
} {
  const narr = shot.narrative as { duration?: number } | undefined;
  const sd = shot.shotDesign as { durationSec?: number } | undefined;
  const raw = Number(shot.duration ?? narr?.duration ?? sd?.durationSec ?? 0);
  if (Number.isFinite(raw) && raw > 0) {
    // Treat bare 1 with no other signal as untrusted default (design loss)
    const onlyOne = raw === 1 && shot.duration == null && narr?.duration == null;
    const d = Math.max(1, Math.min(30, Math.ceil(raw)));
    return { durationSec: d, trusted: !onlyOne, source: shot.duration != null ? "shot.duration" : "narrative" };
  }
  return { durationSec: 0, trusted: false, source: "missing" };
}

export function buildShotChainContract(
  shot: Record<string, unknown>,
  opts?: { knownNames?: string[] },
): ShotChainContract {
  const vd = String(shot.visualDescription ?? "").trim();
  const known = opts?.knownNames ?? [];
  const pack = extractDescPredicates({ description: vd, characterNames: known });
  const dur = resolveShotDurationSec(shot);
  const narr = shot.narrative as { shotSize?: string; dialogue?: { lines?: unknown }; camera?: string } | undefined;
  const lines = asDialogueLineObjects(narr?.dialogue?.lines);
  const charCodes = (Array.isArray(shot.charCodes) ? shot.charCodes : [])
    .map((c) => String(c ?? "").trim())
    .filter((c) => c && !isCharOrphCode(c));
  const clientId = String(shot.clientId ?? shot.shotIndex ?? "");
  const splitParentKey = String(shot._stillBeatSplitId ?? shot._visualSplitId ?? "").trim() || undefined;
  const literaryBeatRef = String(
    shot.peakId ?? shot.hookId ?? shot.literaryBeatRef ?? shot.beatId ?? "",
  ).trim() || undefined;

  const payload = {
    vd,
    anchors: pack.mustAppear.slice(0, 24),
    dlg: computeDialogueFingerprint(shot),
    dur: dur.durationSec,
    size: String(shot.shotSize ?? narr?.shotSize ?? ""),
    cam: String(shot.camera ?? narr?.camera ?? ""),
    codes: charCodes,
    split: splitParentKey ?? "",
    beat: literaryBeatRef ?? "",
  };
  const designContentHash = createHash("sha1").update(JSON.stringify(payload)).digest("hex").slice(0, 16);

  const reason =
    typeof shot.reason === "object" && shot.reason
      ? (shot.reason as { chainStale?: { still?: boolean; video?: boolean; burn?: boolean } })
      : {};
  const chainStale = reason.chainStale ?? {};

  return {
    clientId,
    shotIndex: Number(shot.shotIndex) || undefined,
    splitParentKey,
    visualSplitRole: String(shot.visualSplitRole ?? "").trim() || undefined,
    literaryBeatRef,
    visualDescription: vd,
    anchorTokens: pack.mustAppear,
    dialogueFingerprint: payload.dlg,
    hasOnCameraDialogue: hasOnCameraDialogue(lines),
    durationSec: dur.durationSec,
    durationTrusted: dur.trusted,
    shotSize: payload.size || undefined,
    camera: payload.cam || undefined,
    charCodes,
    designContentHash,
    multiBeat: shouldWarnOneBeat(vd),
    stale: {
      still: Boolean(chainStale.still || shot.promptState === "stale"),
      video: Boolean(chainStale.video || shot.videoStale),
      burn: Boolean(chainStale.burn),
    },
  };
}

export function assertChainEgress(
  stage: ChainEgressStage,
  contract: ShotChainContract,
  artifact?: {
    imagePrompt?: string;
    videoPrompt?: string;
    burnDuration?: number;
    /** hq compose: PROMPT-FIDELITY is BLOCK */
    fidelityHard?: boolean;
    /** Hash stamped when videoPrompt was compiled — mismatch ⇒ must recompile */
    designContentHashAtCompile?: string | null;
  },
): ChainEgressResult {
  const findings: ChainEgressFinding[] = [];
  const push = (f: ChainEgressFinding) => findings.push(f);

  if (!contract.visualDescription.trim()) {
    push({
      id: "DESIGN-LOSS",
      severity: "BLOCK",
      message: `镜 ${contract.shotIndex ?? contract.clientId} visualDescription 遗失`,
      breakAt: "design_loss",
    });
  } else if (contract.multiBeat && (stage === "exit" || stage === "compose" || stage === "burn")) {
    push({
      id: "DEX-STILL-ONEBEAT",
      severity: "BLOCK",
      message: `镜 ${contract.shotIndex ?? contract.clientId} 多拍描写须拆镜，禁 trim 出站`,
      breakAt: "split",
    });
  }

  if (!contract.durationTrusted || contract.durationSec <= 0) {
    if (stage === "exit" || stage === "burn" || stage === "finalize") {
      push({
        id: "DESIGN-LOSS-DURATION",
        severity: stage === "burn" ? "BLOCK" : "WARN",
        message: `镜 ${contract.shotIndex ?? contract.clientId} 时长未可信设定（禁默成 1s 当设计）`,
        breakAt: "design_loss",
      });
    }
  }

  if (artifact?.burnDuration != null && contract.durationTrusted && contract.durationSec > 0) {
    if (artifact.burnDuration < contract.durationSec) {
      push({
        id: "DUR-DESYNC",
        severity: "BLOCK",
        message: `时长降档 ${contract.durationSec}s→${artifact.burnDuration}s 禁止`,
        breakAt: "video",
      });
    }
  }

  if (stage === "compose" || stage === "finalize" || stage === "burn") {
    const body = `${artifact?.imagePrompt ?? ""}\n${artifact?.videoPrompt ?? ""}`;
    if (contract.anchorTokens.length && body.trim()) {
      const hit = contract.anchorTokens.filter((t) => t.length >= 2 && body.includes(t));
      const need = Math.min(2, contract.anchorTokens.length);
      if (hit.length < need) {
        const hard =
          stage === "finalize" ||
          stage === "burn" ||
          (stage === "compose" && (artifact?.fidelityHard !== false));
        push({
          id: "PROMPT-FIDELITY",
          severity: hard ? "BLOCK" : "WARN",
          message: `提示词未覆盖设计锚点（命中 ${hit.length}/${need}）`,
          breakAt: stage === "compose" ? "still" : "video",
        });
      }
    }
  }

  if (contract.stale.still && stage === "burn") {
    push({
      id: "STILL-FIRSTFRAME-STALE",
      severity: "BLOCK",
      message: "静帧 stale，须重出后再烧",
      breakAt: "still",
    });
  }

  // M7: VD/dialogue drift vs compile-time stamp, or explicit videoStale flag
  if (stage === "burn" || stage === "finalize") {
    const atCompile = String(artifact?.designContentHashAtCompile ?? "").trim();
    const hashDrift = Boolean(atCompile) && atCompile !== contract.designContentHash;
    if (hashDrift || (stage === "burn" && contract.stale.video)) {
      push({
        id: "VIDEO-PROMPT-STALE",
        severity: "BLOCK",
        message: "设计/对白已变或视频提示词 stale，须重编译后再烧",
        breakAt: "video",
      });
    }
  }

  const blocks = findings.filter((f) => f.severity === "BLOCK");
  const breakAt: ChainBreakAt = blocks[0]?.breakAt ?? (findings[0]?.breakAt ?? "ok");
  return {
    ok: blocks.length === 0,
    breakAt,
    codes: [...new Set(findings.map((f) => f.id))],
    findings,
    contract,
  };
}

/** Mark chain stale on shot.reason after design change / supplement. */
export function markChainStale(
  shot: Record<string, unknown>,
  flags: Partial<ShotChainContract["stale"]>,
): void {
  let reason: Record<string, unknown> = {};
  try {
    reason =
      typeof shot.reason === "string"
        ? JSON.parse(String(shot.reason || "{}"))
        : { ...((shot.reason as Record<string, unknown>) ?? {}) };
  } catch {
    reason = {};
  }
  const prev = (reason.chainStale as Record<string, boolean>) ?? {};
  reason.chainStale = { ...prev, ...flags };
  if (flags.still) {
    shot.promptState = "stale";
    shot.composeHash = undefined;
  }
  if (flags.video || flags.burn) {
    shot.videoStale = true;
    shot.videoPass = false;
  }
  shot.reason = reason;
}

export function chainContractEnabled(meta?: Record<string, unknown> | null): boolean {
  // Kill-switch only when explicitly false — contact / lit hard paths ignore soft disable
  if (!meta) return true;
  if (meta.pillarsChainContractV1 === false && !meta.chatStrict && !meta.forceChainContract) {
    return false;
  }
  return true;
}
