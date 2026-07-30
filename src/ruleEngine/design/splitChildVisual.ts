/**
 * Split-child visualDescription SSOT — never land short placeholders; inherit parent anchors.
 */
import { qp02MinChars } from "../bundle/visualQualityAudit";
import { extractDescPredicates } from "../compilers/extractDescPredicates";

const FORBIDDEN_PLACEHOLDERS = /听者反应特写|反应特写|听者反应/;

export function isForbiddenSplitPlaceholder(text: string): boolean {
  return FORBIDDEN_PLACEHOLDERS.test(String(text ?? "").trim());
}

function compactLen(text: string): number {
  return String(text ?? "").replace(/\s/g, "").length;
}

/** Ensure child VD ≥ minChars using parent literary tokens — no invented prose. */
export function ensureChildVisualDescription(input: {
  role: string;
  childVd: string;
  parentVd: string;
  picture?: string;
  composition?: string;
  knownNames?: string[];
  minChars?: number;
}): { visualDescription: string; ok: boolean; healInduced?: boolean } {
  const min = input.minChars ?? qp02MinChars();
  const parent = String(input.parentVd ?? "").trim();
  let child = String(input.childVd ?? "").trim();
  if (isForbiddenSplitPlaceholder(child)) child = "";

  const pic = String(input.picture ?? "").trim();
  const comp = String(input.composition ?? "").trim();

  if (compactLen(child) >= min && !isForbiddenSplitPlaceholder(child)) {
    return { visualDescription: child, ok: true };
  }

  // Prefer remaining parent clauses for reaction
  if (!child || compactLen(child) < min) {
    const parts = parent.split(/[。；;\n]+/).map((s) => s.trim()).filter((s) => s.length >= 3);
    if (/reaction|listen|听|insert/i.test(input.role) && parts.length >= 2) {
      child = parts.slice(1).join("。");
      if (!/[。；;]$/.test(child)) child = `${child}。`;
    } else if (parts[0] && compactLen(child) < min) {
      child = parts[0]!;
      if (!/[。；;]$/.test(child)) child = `${child}。`;
    }
  }

  if (compactLen(child) < min && pic && compactLen(pic) >= min) {
    child = pic;
  }
  if (compactLen(child) < min && comp && compactLen(comp) >= min) {
    child = comp;
  }

  // Graft missing parent anchors into child (CHAIN-BEAT homology — even when already ≥ minChars)
  if (parent) {
    const pack = extractDescPredicates({
      description: parent,
      characterNames: input.knownNames ?? [],
    });
    const anchors = pack.mustAppear.filter((t) => t.length >= 2).slice(0, 6);
    const missing = anchors.filter((t) => !child.includes(t));
    if (missing.length) {
      const isPerfShell = /^对白表演[：:]/.test(child);
      if (isPerfShell) {
        // Keep literary frame before dialogue-performance shell (禁冲掉端坐等父锚)
        const head =
          parent
            .split(/[。；;\n]+/)
            .map((s) => s.trim())
            .find((s) => s.length >= 3 && missing.some((m) => s.includes(m))) ||
          parent
            .split(/[。；;\n]+/)
            .map((s) => s.trim())
            .find((s) => s.length >= 3) ||
          parent.slice(0, 36);
        const headNorm = /[。；;]$/.test(head) ? head : `${head}。`;
        child = `${headNorm}${child}`;
        return {
          visualDescription: child,
          ok: compactLen(child) >= min,
          healInduced: true,
        };
      }
      if (compactLen(child) < min || missing.length > anchors.length / 2) {
        const graft = missing.join("");
        child = `${child}${child && !/[。；;\s]$/.test(child) ? "。" : ""}${graft}。`.replace(/。+/g, "。");
        return {
          visualDescription: child,
          ok: compactLen(child) >= min,
          healInduced: true,
        };
      }
    } else if (compactLen(child) < min && compactLen(parent) >= min) {
      // Last resort: use full parent (coverage OK for CHAIN-BEAT; not a short invent)
      return { visualDescription: parent, ok: true, healInduced: true };
    }
  }

  return {
    visualDescription: child,
    ok: compactLen(child) >= min && !isForbiddenSplitPlaceholder(child),
    healInduced: Boolean(child),
  };
}

/** Strip reactionAction / reaction splitHint from speak-child dialogue lines. */
export function stripReactionFieldsFromLines(lines: unknown[]): unknown[] {
  return (lines ?? []).map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
    const l = { ...(raw as Record<string, unknown>) };
    delete l.reactionAction;
    const hint = String(l.splitHint ?? "");
    if (/reaction|听者|拆/i.test(hint)) delete l.splitHint;
    return l;
  });
}

/** True when shot is a post-split speak child that should not re-trigger mustSplit. */
export function isClearedSpeakSplitChild(shot: Record<string, unknown>): boolean {
  if (!shot._stillBeatSplitId && !shot._visualSplitId) return false;
  const role = String(shot.visualSplitRole ?? shot.beatRole ?? "").toLowerCase();
  if (!/speak|说/.test(role)) return false;
  const lines = ((shot.narrative as { dialogue?: { lines?: unknown[] } } | undefined)?.dialogue?.lines ??
    []) as Array<{ reactionAction?: string; splitHint?: string }>;
  const hasRa = lines.some((l) => String(l?.reactionAction ?? "").trim());
  const hasRh = lines.some((l) => /reaction|听者|拆/i.test(String(l?.splitHint ?? "")));
  return !hasRa && !hasRh;
}

const LIP_SHOT_SIZES = ["近景", "特写", "中景", "中近景"] as const;

/**
 * Confirm 语义子镜：景别/picture 相对父镜可区分；禁止裸 clone 父 VD。
 * Used by lip Confirm + dialogue cluster react children.
 */
export function differentiateSemanticChild(input: {
  parentVd: string;
  role: string;
  lineText?: string;
  lineIndex?: number;
  lineCount?: number;
  picture?: string;
  composition?: string;
  knownNames?: string[];
}): {
  visualDescription: string;
  shotSize: string;
  picture: string;
  motion: string;
  ok: boolean;
  refuse?: boolean;
} {
  const { normalizeVdKey } = require("./dirtyStillPromptGate") as typeof import("./dirtyStillPromptGate");
  const parent = String(input.parentVd ?? "").trim();
  const idx = Math.max(0, Number(input.lineIndex ?? 0));
  const shotSize = LIP_SHOT_SIZES[idx % LIP_SHOT_SIZES.length]!;
  const motion = /reaction|listen|听|insert/i.test(input.role)
    ? "static listen"
    : idx === 0
      ? "static"
      : "subtle push-in";
  const parts = parent.split(/[。；;\n]+/).map((s) => s.trim()).filter((s) => s.length >= 2);
  let seed =
    parts.length > 1
      ? parts[Math.min(idx, parts.length - 1)]!
      : parent;
  const lineCue = String(input.lineText ?? "").replace(/\s+/g, "").slice(0, 12);
  const picHint =
    String(input.picture ?? "").trim() ||
    `${shotSize}·${input.role}${lineCue ? `·${lineCue}` : ""}`;

  const ens = ensureChildVisualDescription({
    role: input.role,
    childVd: seed,
    parentVd: parent,
    picture: picHint,
    composition: input.composition ?? shotSize,
    knownNames: input.knownNames,
  });
  let vd = ens.visualDescription;
  // Force framing cue when still identical to parent (same-VD clone ban)
  if (parent && normalizeVdKey(vd) === normalizeVdKey(parent)) {
    vd = `${shotSize}，${parent}${lineCue ? `，口型节拍「${lineCue}」` : ""}`.replace(/，+/g, "，");
  }
  const sameAsParent = Boolean(parent) && normalizeVdKey(vd) === normalizeVdKey(parent);
  const ok = ens.ok && Boolean(vd) && !sameAsParent;
  return {
    visualDescription: vd,
    shotSize,
    picture: picHint,
    motion,
    ok,
    // M6: same-VD clone is refuse for all roles (incl. speak) — caller treats as heal failure
    refuse: sameAsParent || !ok,
  };
}

/** Build speak + reaction child VDs for IRD cam-fit / speak-react. */
export function planSpeakReactChildren(
  parentVd: string,
  opts?: {
    picture?: string;
    composition?: string;
    knownNames?: string[];
    minChars?: number;
  },
): {
  children: { role: string; visualDescription: string; hasDialogue?: boolean }[];
  refuse: boolean;
  confidence: number;
} {
  const vd = String(parentVd ?? "").trim();
  let parts = vd.split(/[。；;\n]+/).map((s) => s.trim()).filter(Boolean);
  // Single clause with 开口…反应 → split on comma / 反应 cue
  if (parts.length < 2 && /(说|开口|道).{0,40}(愣|怔|反应|听|侧目)/.test(vd)) {
    const m = vd.split(/[，,]|(?=听者|愣住|反应|侧目)/).map((s) => s.trim()).filter((s) => s.length >= 2);
    if (m.length >= 2) parts = m;
  }
  const speakRaw = parts[0]?.trim() || vd.slice(0, 80);
  const reactRaw = parts.slice(1).join("。").trim();

  const speak = ensureChildVisualDescription({
    role: "speak",
    childVd: speakRaw,
    parentVd: vd,
    picture: opts?.picture,
    composition: opts?.composition,
    knownNames: opts?.knownNames,
    minChars: opts?.minChars,
  });
  // Speak must NOT keep full parent when it still contains react cues
  let speakVd = speak.visualDescription;
  if (/(愣|怔|反应|听者|侧目)/.test(speakVd) && parts[0]) {
    speakVd = /[。；;]$/.test(parts[0]!) ? parts[0]! : `${parts[0]}。`;
  }

  const react = ensureChildVisualDescription({
    role: "reaction",
    childVd: reactRaw,
    parentVd: vd,
    picture: opts?.picture,
    composition: opts?.composition,
    knownNames: opts?.knownNames,
    minChars: opts?.minChars,
  });

  const speakOk = speak.ok && !/(说|开口|道).{0,24}(愣|怔|反应|听者)/.test(speakVd);
  const refuse = !speakOk || !react.ok;
  return {
    children: [
      { role: "speak", visualDescription: speakVd, hasDialogue: true },
      { role: "reaction", visualDescription: react.visualDescription, hasDialogue: false },
    ],
    refuse,
    confidence: refuse ? 0.55 : 0.85,
  };
}
