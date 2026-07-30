/**
 * Still egress normalize — strip who-glue noise, dual --cref commas, English contract junk.
 */
const EN_MICRO_NOISE =
  /\b(micro[- ]?expression|subtle smile|slight smirk|gaze slightly|eyes slightly|lips slightly|barely perceptible)\b/gi;

const CONTRACT_EN_RE =
  /subtle on the locked character face[\s\S]{0,120}?|vertical\s*9:16[\s\S]{0,160}?first frame|power blocking[\s\S]{0,80}?|high detail composition[\s\S]{0,80}?/gi;
const QF_EXPR_RE = /keep face identity[\s\S]{0,100}?QF-EXPR[^\n,]*/gi;
const NO_SUBTITLE_TAIL_RE = /,?\s*no subtitle\s*,?\s*no watermark\s*,?\s*no Logo/gi;

/** Collapse duplicate `--cref A, --cref B` → single `--cref A B` and drop comma between cref blocks. */
export function normalizeCrefEgress(prompt: string): string {
  let text = String(prompt ?? "");
  for (let i = 0; i < 4; i++) {
    const next = text.replace(
      /--cref\s+([A-Z0-9-]+)\s*,\s*--cref\s+([A-Z0-9-]+)/gi,
      "--cref $1 $2",
    );
    if (next === text) break;
    text = next;
  }
  text = text.replace(/--cref\s+([A-Z0-9-]+)\s*,\s*([A-Z0-9-]+)/gi, "--cref $1 $2");
  text = text.replace(/--sref\s+([^\s,，。；;]+)[,，。；;]*/gi, (_, c: string) => {
    const clean = String(c).replace(/[,，。；;]+$/g, "");
    return `--sref ${clean} `;
  });
  text = text.replace(/--cref\s+([A-Z0-9-]+)\s*[,，]/gi, "--cref $1 ");
  return text.replace(/[ \t]{2,}/g, " ").trim();
}

/**
 * Soften who-glue like `沈清瓷跪必须…` when who already has action nearby.
 */
export function normalizeWhoGlue(prompt: string): string {
  let text = String(prompt ?? "");
  text = text.replace(/([\u4e00-\u9fff]{2,6})跪跪/g, "$1跪");
  text = text.replace(/([\u4e00-\u9fff]{2,6})跪(=|必须|于)/g, (_, name: string, tail: string) => {
    const clean = name.replace(/跪$/, "");
    return `${clean}跪${tail === "=" ? "=" : tail}`;
  });
  text = text.replace(/([\u4e00-\u9fff]{2,8})跪=(高位|低位)/g, "$1=$2");
  text = text.replace(/([\u4e00-\u9fff]{1,6})(跪|端坐|坐|立)必须/g, "$1$2");
  text = text.replace(/必须必须/g, "必须");
  return text;
}

export function stripEnglishMicroExpressionNoise(prompt: string): string {
  return String(prompt ?? "")
    .replace(EN_MICRO_NOISE, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.;])/g, "$1")
    .trim();
}

/** Strip T2I contract English / QF-EXPR / no-subtitle tails (parity with Edit literary-only). */
export function stripContractEnglishNoise(prompt: string): string {
  return String(prompt ?? "")
    .replace(CONTRACT_EN_RE, " ")
    .replace(QF_EXPR_RE, " ")
    .replace(NO_SUBTITLE_TAIL_RE, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;])/g, "$1")
    .trim();
}

/** Deduplicate repeated 「与X与X」 multiFace name stacks. */
export function dedupeMultiFaceNames(prompt: string): string {
  return String(prompt ?? "").replace(
    /([\u4e00-\u9fff]{2,8})与([\u4e00-\u9fff]{2,8})与\2/g,
    "$1与$2",
  );
}

/** Collapse long sheet-lock soup → short Edit locks at end (never leave 严禁复刻 residual leading). */
export function demoteSheetLockSoup(prompt: string): { prompt: string; changed: boolean } {
  const before = String(prompt ?? "");
  let next = before
    .replace(/角色参考若为四视图[\s\S]{0,200}?单一电影场面[。．]?/g, " ")
    .replace(/严禁复刻多格拼版[\s\S]{0,120}?character sheet[\s\S]{0,80}?场面[。．]?/gi, " ")
    .replace(/单镜头成片画幅[^。；;\n]*/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[。；，\s]+/, "")
    .trim();
  const removedLong = next !== before.replace(/\s{2,}/g, " ").trim();
  if (removedLong) {
    try {
      const { STILL_SHEET_AS_IDENTITY_ONLY_EDIT_ZH, STILL_SINGLE_FRAME_LOCK_EDIT_ZH } =
        require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
      if (!/四视图仅借身份/.test(next)) next = `${next}。${STILL_SHEET_AS_IDENTITY_ONLY_EDIT_ZH}`;
      if (!/单镜头成片/.test(next.slice(-60))) next = `${next}${STILL_SINGLE_FRAME_LOCK_EDIT_ZH}`;
    } catch {
      /* optional */
    }
  }
  next = next.replace(/。。+/g, "。").trim();
  return { prompt: next, changed: next !== before };
}

export function normalizeStillEgressPrompt(prompt: string): {
  prompt: string;
  changed: boolean;
  notes: string[];
} {
  const notes: string[] = [];
  let next = String(prompt ?? "");
  const before = next;
  const demoted = demoteSheetLockSoup(next);
  if (demoted.changed) {
    notes.push("demote_sheet_lock_soup");
    next = demoted.prompt;
  }
  const afterCref = normalizeCrefEgress(next);
  if (afterCref !== next) {
    notes.push("normalize_cref");
    next = afterCref;
  }
  const afterWho = normalizeWhoGlue(next);
  if (afterWho !== next) {
    notes.push("normalize_who_glue");
    next = afterWho;
  }
  const afterContract = stripContractEnglishNoise(next);
  if (afterContract !== next) {
    notes.push("strip_contract_en");
    next = afterContract;
  }
  const afterEn = stripEnglishMicroExpressionNoise(next);
  if (afterEn !== next) {
    notes.push("strip_en_micro");
    next = afterEn;
  }
  const afterFace = dedupeMultiFaceNames(next);
  if (afterFace !== next) {
    notes.push("dedupe_multiface");
    next = afterFace;
  }
  return { prompt: next, changed: next !== before, notes };
}

/** True if egress still has forbidden dual-comma cref pattern. */
export function hasDualCommaCref(prompt: string): boolean {
  return /--cref\s+[A-Z0-9-]+\s*,\s*--cref/i.test(String(prompt ?? ""));
}
