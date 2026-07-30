/**
 * Intelligent dialogue placement — lineId → beatRole / prop_cu forbid / OS-VO off lip.
 * DC-01 presence alone is not enough; misbound lines are pressure for smart split.
 */
import { asDialogueLineObjects } from "./dialogueCoverage";
import { detectLipSplitPressure } from "./lipSplit";
import { classifyVideoIntent } from "../compilers/videoIntentPolicy";
import { isOffscreenLine } from "./onCameraDialogue";
import { loadLipSplitDoctrine } from "./lipSplit";
import { readFixtureJson } from "../utils/fixturesPath";

export type PlacementIssue = {
  shotIndex?: number;
  clientId?: string;
  lineId?: string;
  reason: "prop_cu_multi_lip" | "os_on_lip_shot" | "empty_text_stub" | "cross_cluster_dump";
  severity: "must_rebinding" | "must_split" | "strip";
};

export type PlacementReport = {
  ok: boolean;
  issues: PlacementIssue[];
  pressureShotIndexes: number[];
};

function isPropCuShot(shot: Record<string, unknown>): boolean {
  const vd = String(shot.visualDescription ?? "").trim();
  const intent = classifyVideoIntent({
    visualDescription: vd,
    shotSize: String(shot.shotSize ?? ""),
    dialogueLines: [],
    stillIntentClass: String((shot as { stillIntentClass?: string }).stillIntentClass ?? ""),
  });
  if (intent.intentClass === "prop_cu") return true;
  return /扳指|手部|道具特写|只出手|禁止同帧出人像头面部|摩挲/.test(vd) && /特写|CU|ecu/i.test(String(shot.shotSize ?? vd));
}

function speakLineCount(shot: Record<string, unknown>): number {
  const lines = asDialogueLineObjects(
    (shot.narrative as { dialogue?: { lines?: unknown } } | undefined)?.dialogue?.lines,
  );
  return lines.filter((l) => {
    const t = String(l.text ?? "").trim();
    if (!t) return false;
    if (/^[（(].*[）)]$/.test(t)) return false; // stage direction
    if (isOffscreenLine(l as never)) return false;
    return true;
  }).length;
}

/** Diagnose placement / misbind pressure on shots. */
export function diagnoseDialoguePlacement(shots: Record<string, unknown>[]): PlacementReport {
  const issues: PlacementIssue[] = [];
  const pressureShotIndexes: number[] = [];

  shots.forEach((s, i) => {
    const idx = Number(s.shotIndex ?? i);
    const lines = asDialogueLineObjects(
      (s.narrative as { dialogue?: { lines?: unknown } } | undefined)?.dialogue?.lines,
    );
    const propCu = isPropCuShot(s);
    const speakN = speakLineCount(s);
    const lip = detectLipSplitPressure(s);

    if (propCu && speakN >= 2) {
      issues.push({
        shotIndex: idx,
        clientId: String(s.clientId ?? ""),
        reason: "prop_cu_multi_lip",
        severity: "must_rebinding",
      });
      pressureShotIndexes.push(i);
    }

    for (const l of lines) {
      const t = String(l.text ?? "").trim();
      if (!t && l.lineId) {
        issues.push({
          shotIndex: idx,
          clientId: String(s.clientId ?? ""),
          lineId: String(l.lineId),
          reason: "empty_text_stub",
          severity: "strip",
        });
      }
      if (t && isOffscreenLine(l as never) && speakN >= 1 && !propCu) {
        /* OS on speak shot is ok as cue; flag only when lip pressure also high */
        if (lip.needsSplit) {
          issues.push({
            shotIndex: idx,
            clientId: String(s.clientId ?? ""),
            lineId: l.lineId ? String(l.lineId) : undefined,
            reason: "os_on_lip_shot",
            severity: "must_rebinding",
          });
        }
      }
    }

    if (lip.mustConfirm && !pressureShotIndexes.includes(i)) {
      pressureShotIndexes.push(i);
    }
  });

  return { ok: issues.filter((x) => x.severity !== "strip").length === 0 && pressureShotIndexes.length === 0, issues, pressureShotIndexes };
}

/**
 * Strip empty stubs + peel OS/stage lines off prop_cu multi-lip shots into audioCue.
 * Returns mutated shots (new array) + count of stripped lines.
 */
export function healMisboundDialoguePlacement(shots: Record<string, unknown>[]): {
  shots: Record<string, unknown>[];
  stripped: number;
  peeledToAudio: number;
  remainingPressure: number;
} {
  let stripped = 0;
  let peeledToAudio = 0;
  const next = shots.map((s) => {
    const propCu = isPropCuShot(s);
    const n = { ...((s.narrative as object) ?? {}) } as {
      dialogue?: { lines?: unknown[] };
      audioCue?: string;
    };
    const lines = asDialogueLineObjects(n.dialogue?.lines);
    if (!lines.length) return s;

    const kept: typeof lines = [];
    const peeled: string[] = [];
    for (const l of lines) {
      const t = String(l.text ?? "").trim();
      if (!t) {
        stripped++;
        continue;
      }
      if (propCu && (speakLineCount(s) >= 2 || lines.filter((x) => String(x.text ?? "").trim()).length >= 2)) {
        // prop_cu should not carry multi on-cam lip — peel all speak text to audioCue / leave one max
        if (kept.length >= 1 || isOffscreenLine(l as never) || /^[（(]/.test(t)) {
          peeled.push(t);
          peeledToAudio++;
          continue;
        }
      }
      kept.push(l);
    }
    if (peeled.length) {
      const cue = [n.audioCue, ...peeled.map((t) => `OS/旁白：${t}`)].filter(Boolean).join("；");
      n.audioCue = cue.slice(0, 400);
    }
    n.dialogue = { lines: kept };
    return { ...s, narrative: n };
  });

  const report = diagnoseDialoguePlacement(next);
  return {
    shots: next,
    stripped,
    peeledToAudio,
    remainingPressure: report.pressureShotIndexes.length,
  };
}

export function loadPlacementAutoMin(): number {
  try {
    const d = readFixtureJson<{ confidence?: { autoMin?: number } }>("lip_split_doctrine.json", {});
    return Number(d.confidence?.autoMin ?? 0.7);
  } catch {
    return 0.7;
  }
}

export type LineRouteHint = {
  lineId: string;
  preferredBeatRole?: "speak" | "reaction" | "os" | "vo";
  forbidOn: Array<"prop_cu" | "hand_only" | "reaction_silent">;
  onCam: boolean;
  speaker?: string;
};

/** Score line → shot placement (M8). Higher = better bind. */
export function scoreLineToShot(
  line: { lineId?: string; text?: string; speaker?: string; type?: string },
  shot: Record<string, unknown>,
): number {
  let score = 0;
  const vd = String(shot.visualDescription ?? "");
  const beat = String(shot.beatRole ?? shot.visualSplitRole ?? "").toLowerCase();
  const speaker = String(line.speaker ?? "").trim();
  const off = isOffscreenLine(line as never) || /os|vo|画外|旁白/i.test(String(line.type ?? line.speaker ?? ""));
  if (off) {
    if (isPropCuShot(shot) || /reaction|listen/.test(beat)) score += 40;
    else score -= 20;
    return score;
  }
  if (isPropCuShot(shot)) score -= 50;
  if (/speak|dialogue|对白/.test(beat) || speakLineCount(shot) >= 0) score += 10;
  if (speaker && vd.includes(speaker.slice(0, 2))) score += 25;
  const codes = (shot.charCodes as string[] | undefined) ?? [];
  if (speaker && codes.some((c) => c.toUpperCase().includes(speaker.slice(0, 1).toUpperCase()))) score += 15;
  const sceneRef = String((shot as { sceneRef?: string; sceneName?: string }).sceneRef ?? shot.sceneName ?? "");
  if (sceneRef && String((line as { sceneRef?: string }).sceneRef ?? "") === sceneRef) score += 20;
  return score;
}

/**
 * Route unbound / misbound plan lines to best speak shots; never dump onto prop_cu.
 * Returns proposals for Confirm when no good host.
 */
export function matchDialogueLinesToShots(input: {
  planLines: Array<{ lineId?: string; text?: string; speaker?: string; type?: string; sceneRef?: string }>;
  shots: Record<string, unknown>[];
}): {
  routes: Array<{ lineId: string; shotIndex?: number; clientId?: string; score: number; confirm?: boolean }>;
  confirmCount: number;
} {
  const present = new Set<string>();
  for (const s of input.shots) {
    for (const l of asDialogueLineObjects(
      (s.narrative as { dialogue?: { lines?: unknown } } | undefined)?.dialogue?.lines,
    )) {
      if (l.lineId) present.add(String(l.lineId));
    }
  }
  const routes: Array<{ lineId: string; shotIndex?: number; clientId?: string; score: number; confirm?: boolean }> = [];
  let confirmCount = 0;
  for (const line of input.planLines) {
    const id = String(line.lineId ?? "").trim();
    if (!id || present.has(id)) continue;
    let best = { score: -999, i: -1 };
    input.shots.forEach((s, i) => {
      const sc = scoreLineToShot(line, s);
      if (sc > best.score) best = { score: sc, i };
    });
    if (best.i < 0 || best.score < 0) {
      routes.push({ lineId: id, score: best.score, confirm: true });
      confirmCount++;
      continue;
    }
    const host = input.shots[best.i]!;
    routes.push({
      lineId: id,
      shotIndex: Number(host.shotIndex ?? best.i + 1),
      clientId: String(host.clientId ?? ""),
      score: best.score,
      confirm: best.score < 10,
    });
    if (best.score < 10) confirmCount++;
  }
  return { routes, confirmCount };
}

void loadLipSplitDoctrine;
