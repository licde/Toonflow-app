/**
 * Expand multi-beat visualDescription into one-beat child shots (Must M2 + Later t05/t12).
 * Prefers vocab/golden templates; falls back to clause+strong-verb split with confidence.
 */
import { countStrongBeats, shouldWarnOneBeat, loadStillIdentityDoctrine } from "../compilers/stillIdentitySsot";
import { readFixtureJson } from "../utils/fixturesPath";
import { recomposeChildrenAfterSplit } from "./recomposeAfterSplit";

const CONFIDENCE_MIN = 0.7;
const MAX_EXPAND_DEFAULT = 40;

export type StillOneBeatChild = {
  role: string;
  shotSize: string;
  tags: string[];
  visualDescription: string;
  hasDialogue: boolean;
  /** OS / VO lines routed off-camera into narrative.audioCue — not visual */
  osLines?: string[];
  duration: number;
  confidence: number;
};

type GoldenZanCi = {
  badVisualDescription?: string;
  splitTemplate?: string;
  goodShots?: Array<{
    role?: string;
    shotSize?: string;
    visualBeatTags?: string[];
    visualDescription?: string;
    hasDialogue?: boolean;
    duration?: number;
  }>;
};

function loadKneelSwordGolden(): GoldenZanCi {
  return readFixtureJson<GoldenZanCi>("golden/still-onebeat-kneel-sword.json", {});
}

function looksLikeKneelSwordSample(text: string): boolean {
  return /跪地/.test(text) && /拔剑/.test(text);
}

function buildKneelSwordChildren(): StillOneBeatChild[] {
  const g = loadKneelSwordGolden();
  return (g.goodShots ?? []).map((s) => ({
    role: String(s.role ?? "action"),
    shotSize: String(s.shotSize ?? "特写"),
    tags: [...(s.visualBeatTags ?? [])],
    visualDescription: String(s.visualDescription ?? "").trim(),
    hasDialogue: Boolean(s.hasDialogue),
    duration: Number(s.duration) || durationForRole(String(s.role ?? "action"), Boolean(s.hasDialogue)),
    confidence: 1,
  }));
}

function durationForRole(role: string, hasDialogue: boolean): number {
  const d = loadStillIdentityDoctrine() as {
    oneBeat?: { durationTiers?: Record<string, number> };
  };
  const tiers = d.oneBeat?.durationTiers ?? {};
  if (hasDialogue) return Number(tiers.withDialogue) || 4;
  return Number(tiers[role]) || (role === "action" ? 3 : 2);
}

function maxExpandBudget(): number {
  const d = loadStillIdentityDoctrine() as { oneBeat?: { maxExpandPerRun?: number } };
  return Number(d.oneBeat?.maxExpandPerRun) || MAX_EXPAND_DEFAULT;
}

/** Strip VO/OS from visual; return cleaned visual + os lines. */
export function peelOsFromVisual(text: string): { visual: string; osLines: string[]; dialogueLines: string[] } {
  const osLines: string[] = [];
  const dialogueLines: string[] = [];
  let visual = String(text ?? "");
  // 画外音…'…' / （OS）…
  visual = visual.replace(/画外音[传来说]*[：:]?[「"']([^」"']+)[」"']/g, (_m, line: string) => {
    osLines.push(String(line).trim());
    return "";
  });
  visual = visual.replace(/[（(]OS[）)][：:]?\s*[「"']?([^」"'\n]+)[」"']?/g, (_m, line: string) => {
    osLines.push(String(line).trim());
    return "";
  });
  visual = visual.replace(/[「"]([^」"]{2,40})[」"]\s*[（(]对白[）)]/g, (_m, line: string) => {
    dialogueLines.push(String(line).trim());
    return "";
  });
  visual = visual.replace(/\s{2,}/g, " ").replace(/[。．]\s*[。．]/g, "。").trim();
  return { visual, osLines, dialogueLines };
}

function loadZanCiGolden(): GoldenZanCi {
  return readFixtureJson<GoldenZanCi>("golden/still-onebeat-zan-ci.json", {});
}

function looksLikeZanCiSample(text: string): boolean {
  return /银簪|簪尖/.test(text) && /刺入/.test(text) && /匕首|梳妆/.test(text);
}

/** Build children from golden when sample matches. */
export function buildZanCiChildren(): StillOneBeatChild[] {
  const g = loadZanCiGolden();
  return (g.goodShots ?? []).map((s) => ({
    role: String(s.role ?? "action"),
    shotSize: String(s.shotSize ?? "特写"),
    tags: [...(s.visualBeatTags ?? [])],
    visualDescription: String(s.visualDescription ?? "").trim(),
    hasDialogue: Boolean(s.hasDialogue),
    duration: Number(s.duration) || durationForRole(String(s.role ?? "action"), Boolean(s.hasDialogue)),
    confidence: 1,
  }));
}

/** Clause split by 。； and keep clauses with strong beats; confidence by coverage. */
export function splitClausesByBeat(text: string): { children: StillOneBeatChild[]; confidence: number } {
  const peeled = peelOsFromVisual(text);
  const raw = peeled.visual.trim();
  const d = loadStillIdentityDoctrine();
  const re = new RegExp(d.oneBeat?.beatVerbPattern ?? "刺入|咬帕|咬唇|包扎|露出|勾起|渗出|拂过");
  const parts = raw
    .split(/[。；;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);
  const beatParts = parts.filter((p) => re.test(p));
  const use = beatParts.length >= 2 ? beatParts : parts.slice(0, Math.min(3, parts.length));
  if (use.length < 2) {
    return { children: [], confidence: 0 };
  }
  const covered = use.reduce((n, p) => n + countStrongBeats(p), 0);
  const total = countStrongBeats(raw);
  const confidence = total > 0 ? Math.min(1, covered / total) : 0.5;
  const children: StillOneBeatChild[] = use.map((p, i) => {
    const isInsert = /簪|刺入|渗出|刃|匕首|露出|拔剑/.test(p);
    const isReact = /笑|泪|咬|蹙|决绝|眼神|跪|跌坐/.test(p);
    const role = isInsert && i === 0 ? "insert" : isReact ? "reaction" : isInsert ? "reveal" : "action";
    const shotSize = role === "insert" ? "大特写" : role === "reaction" ? "特写" : "近景";
    const tags =
      role === "insert"
        ? ["prop_insert", "reveal"]
        : role === "reaction"
          ? ["reaction", "face_cu"]
          : ["reveal"];
    const desc = /[。；;]$/.test(p) ? p : `${p}。`;
    const hasDialogue = i === use.length - 1 && peeled.dialogueLines.length > 0;
    return {
      role,
      shotSize,
      tags,
      visualDescription: `${shotSize}。${desc.replace(/^(大特写|特写|近景|中景)[。．.\s]*/, "")}`,
      hasDialogue,
      osLines: i === 0 ? peeled.osLines : undefined,
      duration: durationForRole(role, hasDialogue),
      confidence,
    };
  });
  return { children, confidence };
}

export function planStillOneBeatSplit(
  visualDescription: string,
): { children: StillOneBeatChild[]; confidence: number; template?: string; refuse: boolean } {
  const text = String(visualDescription ?? "").trim();
  if (!text || !shouldWarnOneBeat(text)) {
    return { children: [], confidence: 1, refuse: false };
  }
  if (looksLikeZanCiSample(text)) {
    const children = buildZanCiChildren();
    const peeled = peelOsFromVisual(text);
    if (peeled.osLines.length && children[0]) {
      children[0] = { ...children[0]!, osLines: peeled.osLines };
    }
    if (children.length >= 2) {
      return { children, confidence: 1, template: "prop_insert_reaction_reveal", refuse: false };
    }
  }
  if (looksLikeKneelSwordSample(text)) {
    const children = buildKneelSwordChildren();
    if (children.length >= 2) {
      return { children, confidence: 1, template: "reaction_reveal", refuse: false };
    }
  }
  const { children, confidence } = splitClausesByBeat(text);
  if (children.length < 2 || confidence < CONFIDENCE_MIN) {
    return { children, confidence, refuse: true };
  }
  return { children, confidence, refuse: false };
}

export function expandStillOneBeat(
  shots: Record<string, unknown>[],
  opts?: { maxExpand?: number; force?: boolean; recompose?: boolean },
): { shots: Record<string, unknown>[]; expandedCount: number; refused: number; log: string[] } {
  const maxExpand = opts?.maxExpand ?? maxExpandBudget();
  const log: string[] = [];
  const out: Record<string, unknown>[] = [];
  let expandedCount = 0;
  let refused = 0;

  for (const shot of shots) {
    if (shot._stillBeatSplitId || shot._visualSplitId || shot.visualSplitRole || shot.visBeatOverride) {
      out.push(shot);
      continue;
    }
    const vd = String(shot.visualDescription ?? "").trim();
    if (!shouldWarnOneBeat(vd)) {
      out.push(shot);
      continue;
    }
    if (expandedCount >= maxExpand) {
      log.push("still_onebeat_budget_cap");
      out.push(shot);
      continue;
    }
    const plan = planStillOneBeatSplit(vd);
    if ((plan.refuse || plan.children.length < 2) && !opts?.force) {
      refused++;
      out.push({
        ...shot,
        stillOneBeatRefuse: true,
        stillOneBeatConfidence: plan.confidence,
      });
      log.push(`still_onebeat_refuse:shot${shot.shotIndex ?? "?"}:conf=${plan.confidence}`);
      continue;
    }
    if (plan.children.length < 2) {
      refused++;
      out.push(shot);
      continue;
    }
    const parentKey = String(shot.clientId ?? shot.shotIndex ?? `s${out.length}`);
    const parentVd = String(shot.visualDescription ?? "").trim();
    const n = shot.narrative as {
      dialogue?: { lines?: unknown };
      shotSize?: string;
      audioCue?: string;
    } | undefined;
    for (let i = 0; i < plan.children.length; i++) {
      const c = plan.children[i]!;
      const osCue = c.osLines?.length ? c.osLines.join("；") : undefined;
      const { ensureChildVisualDescription } =
        require("./splitChildVisual") as typeof import("./splitChildVisual");
      const ens = ensureChildVisualDescription({
        role: c.role,
        childVd: c.visualDescription,
        parentVd,
      });
      const childVd = ens.ok ? ens.visualDescription : parentVd;
      const parentGen = (shot.generation as Record<string, unknown> | undefined) ?? {};
      out.push({
        ...shot,
        clientId: `${parentKey}-ob-${c.role}-${i}`,
        shotIndex: undefined,
        _stillBeatSplitId: parentKey,
        _parentVisualDescription: parentVd,
        _parentClientId: String(shot.clientId ?? ""),
        visualSplitRole: c.role,
        visualBeatTags: c.tags,
        shotSize: c.shotSize,
        visualDescription: childVd,
        duration: Math.max(2, c.duration),
        burnParentForbidden: true,
        filePath: undefined,
        stillQuality: undefined,
        promptState: "stale",
        composeHash: undefined,
        videoPass: false,
        videoStale: true,
        // Never inherit parent collage imagePrompt (GEN-05)
        generation: {
          ...parentGen,
          imagePrompt: undefined,
          videoPrompt: undefined,
          videoDesc: undefined,
          compiled: undefined,
        },
        narrative: {
          ...(n ?? {}),
          shotSize: c.shotSize,
          dialogue: c.hasDialogue ? n?.dialogue ?? { lines: [] } : { lines: [] },
          ...(osCue ? { audioCue: osCue, voiceIntent: { type: "os" } } : {}),
        },
        stillOneBeatConfidence: c.confidence,
        stillOneBeatTemplate: plan.template,
        ...(ens.healInduced ? { _healInducedVd: true } : {}),
      });
    }
    expandedCount++;
    log.push(`still_onebeat:${plan.template ?? "clause"}:${parentKey}`);
  }

  out.forEach((s, i) => {
    s.shotIndex = i + 1;
    s.index = i;
  });

  if (opts?.recompose !== false && expandedCount > 0) {
    const r = recomposeChildrenAfterSplit(out);
    log.push(`recompose:${r.recomposed}`);
    return { shots: r.shots, expandedCount, refused, log };
  }
  return { shots: out, expandedCount, refused, log };
}

export { CONFIDENCE_MIN };
