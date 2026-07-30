/**
 * Post-burn soft deliver — vendor file exists; QC/design debt ≠ hide playback.
 * Homology: weak still shows file with badge; unknown SVQ dims → human_review weak, not 生成失败.
 */
export type QcSoftDeliverInput = {
  videoPass?: boolean;
  primaryNextStep?: string | null;
  failDims?: Array<{ id?: string }> | null;
};

export function isQcSoftDeliver(input: QcSoftDeliverInput): boolean {
  if (input.videoPass) return false;
  const step = String(input.primaryNextStep ?? "").trim();
  if (step === "human_review") return true;
  if (step === "chat_repair" || step === "retry_shot") {
    const fails = input.failDims ?? [];
    return !fails.some((d) => /^(vendor_|runtime_|corrupt)/i.test(String(d.id ?? "")));
  }
  return false;
}

export function parseVideoErrorReason(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  const t = String(raw).trim();
  if (!t.startsWith("{")) return null;
  try {
    return JSON.parse(t) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Legacy contact false-green: videoPass=true while motion_fidelity/lit skipped.
 * Read-path reconcile → qcWeak + human_review (homology postBurnRuntime contactUnmeasured).
 */
export function reconcileLegacyContactQc(
  parsed: Record<string, unknown> | null,
  opts?: { visualDescription?: string | null },
): Record<string, unknown> | null {
  if (!parsed) return null;
  const vd = String(opts?.visualDescription ?? parsed.visualDescription ?? "");
  const blob = `${vd} ${parsed.userMessage ?? ""} ${parsed.ctaLabel ?? ""} ${JSON.stringify(parsed.findings ?? [])}`;
  let contact =
    /纸未入口|仅颊触|非口含|划过面颊|颊触|休书|婚书|纸角/.test(blob) ||
    /接触|propInFrame|still_prop|CONTACT-HANDOFF/i.test(blob);
  try {
    const { isContactEventVd } =
      require("../compilers/contactEventPolicy") as typeof import("../compilers/contactEventPolicy");
    if (vd && isContactEventVd(vd)) contact = true;
  } catch {
    /* optional */
  }
  if (!contact) return parsed;

  const skipped = Array.isArray(parsed.skippedDims)
    ? (parsed.skippedDims as string[]).map(String)
    : [];
  const unknown = Array.isArray(parsed.unknownDims)
    ? (parsed.unknownDims as string[]).map(String)
    : [];
  const critical = ["motion_fidelity", "lit_detail", "lit_contact_xor"];
  const unmeasured = critical.filter((id) => skipped.includes(id) || unknown.includes(id));
  if (!unmeasured.length) return parsed;
  if (parsed.videoPass !== true) return parsed;

  return {
    ...parsed,
    videoPass: false,
    qcWeak: true,
    primaryNextStep: "human_review",
    reverseTrigger: unmeasured.includes("lit_detail") ? "still_prop_missing" : "svq_motion_fail",
    ctaLabel: String(parsed.ctaLabel || "接触未测 · 重出带道具静照"),
    userMessage: String(
      parsed.userMessage ||
        `接触镜未测维须人审（skip≠pass）：${unmeasured.join(",")}；历史假绿已纠偏`,
    ),
    legacyContactFalseGreen: true,
    skippedDims: skipped,
    unknownDims: [...new Set([...unknown, ...unmeasured])],
  };
}

function softDeliverFromParsed(parsed: Record<string, unknown> | null): boolean {
  if (!parsed) return false;
  if (parsed.qcWeak === true) return true;
  const pb = parsed.postBurn as Record<string, unknown> | undefined;
  if (pb?.videoPass === false || parsed.videoPass === false) {
    return isQcSoftDeliver({
      videoPass: false,
      primaryNextStep: String(parsed.primaryNextStep ?? pb?.primaryNextStep ?? ""),
      failDims: (parsed.failDims ?? pb?.failDims) as Array<{ id?: string }> | undefined,
    });
  }
  if (parsed.primaryNextStep || pb?.primaryNextStep) {
    return isQcSoftDeliver({
      videoPass: false,
      primaryNextStep: String(parsed.primaryNextStep ?? pb?.primaryNextStep ?? ""),
      failDims: (parsed.failDims ?? pb?.failDims) as Array<{ id?: string }> | undefined,
    });
  }
  return false;
}

/** Row has OSS file + soft QC debt → FE should show playable weak, not 生成失败. */
export function isSoftDeliveredVideoRow(row: {
  state?: string | null;
  filePath?: string | null;
  errorReason?: string | null;
  visualDescription?: string | null;
}): boolean {
  if (!String(row.filePath ?? "").trim()) return false;
  const parsed = reconcileLegacyContactQc(parseVideoErrorReason(row.errorReason), {
    visualDescription: row.visualDescription,
  });
  if (row.state === "生成成功" || row.state === "已完成") {
    return softDeliverFromParsed(parsed);
  }
  if (row.state === "质检未过") {
    return softDeliverFromParsed(parsed);
  }
  return false;
}

export type FeVideoTimelineState = "已完成" | "生成中" | "生成失败" | "未生成";

export function mapVideoStateForFe(row: {
  state?: string | null;
  filePath?: string | null;
  errorReason?: string | null;
  visualDescription?: string | null;
}): FeVideoTimelineState {
  if (row.state === "生成中") return "生成中";
  if (isSoftDeliveredVideoRow(row)) return "已完成";
  if (row.state === "生成成功" || row.state === "已完成") return "已完成";
  if (row.state === "生成失败" || row.state === "质检未过") return "生成失败";
  return "未生成";
}

export function flattenQcDebtForFe(
  parsed: Record<string, unknown> | null | undefined,
  opts?: { visualDescription?: string | null },
) {
  const reconciled = reconcileLegacyContactQc(parsed ?? null, opts);
  if (!reconciled) return {};
  const pb = reconciled.postBurn as Record<string, unknown> | undefined;
  return {
    qcWeak: true,
    videoPass: pb?.videoPass ?? reconciled.videoPass,
    primaryNextStep: reconciled.primaryNextStep ?? pb?.primaryNextStep,
    userMessage: reconciled.userMessage ?? pb?.userMessage,
    ctaLabel: reconciled.ctaLabel,
    code: reconciled.code,
    reverseTrigger: reconciled.reverseTrigger,
    findings: reconciled.findings ?? pb?.findings,
    unknownDims: reconciled.unknownDims ?? pb?.unknownDims,
    failDims: reconciled.failDims ?? pb?.failDims,
    skippedDims: reconciled.skippedDims ?? pb?.skippedDims,
    scorecard: reconciled.scorecard ?? pb?.scorecard,
    designIntentFidelity: reconciled.designIntentFidelity,
    legacyContactFalseGreen: reconciled.legacyContactFalseGreen,
  };
}
