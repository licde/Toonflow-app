/**
 * Wave-4 — no-Key composition soft check (headroom / looking-room).
 * Text/prompt heuristics only; never invents visualPass or measured pixel dims.
 */
import { softGrammarHints } from "../compilers/cinematicShotGrammar";

export type CompositionSoftFinding = {
  id: "headroom_undeclared" | "looking_room_undeclared" | "axis180_undeclared";
  severity: "soft";
  message: string;
  hint: string;
};

export function assessCompositionSoftNoKey(input: {
  visualDescription?: string | null;
  promptUsed?: string | null;
  shotSize?: string | null;
  spatialRelation?: string | null;
  /** face / CU / 近景 → stronger headroom expectation */
  faceBudget?: string | null;
}): { findings: CompositionSoftFinding[]; pixelDimStatus: "unmeasured" } {
  const vd = String(input.visualDescription ?? "");
  const prompt = String(input.promptUsed ?? "");
  const blob = `${vd}\n${prompt}\n${String(input.spatialRelation ?? "")}`;
  const size = String(input.shotSize ?? "");
  const faceish =
    /近景|特写|大特写|face|CU|ecu/i.test(size) ||
    /must/i.test(String(input.faceBudget ?? "")) ||
    /面容|抬视线|口型/.test(vd);

  const findings: CompositionSoftFinding[] = [];
  const headroom = softGrammarHints(["headroom"])[0] ?? "保留头上空间";
  const looking = softGrammarHints(["lookingRoom"])[0] ?? "视线前方留白";
  const axis180 = softGrammarHints(["axis180"])[0] ?? "保持180度轴线，过肩对切不越轴";

  if (faceish && !/头上空间|头顶留白|headroom|留头/i.test(blob)) {
    findings.push({
      id: "headroom_undeclared",
      severity: "soft",
      message: "近景/面容镜未声明头上留白（无 Key，仅构图债）",
      hint: headroom,
    });
  }
  if (
    faceish &&
    /看向|视线|对视|望向/.test(vd) &&
    !/视线前方|looking.?room|前方留白|视线留白/i.test(blob)
  ) {
    findings.push({
      id: "looking_room_undeclared",
      severity: "soft",
      message: "有视线方向但未声明前方留白（无 Key，仅构图债）",
      hint: looking,
    });
  }
  if (/过肩|OTS|对切|正反打/.test(vd) && !/180|轴线|不越轴/.test(blob)) {
    findings.push({
      id: "axis180_undeclared",
      severity: "soft",
      message: "过肩/对切未声明轴线约束（无 Key，仅构图债）",
      hint: axis180,
    });
  }

  return { findings, pixelDimStatus: "unmeasured" };
}

/** Apply soft composition hints into still prompt parts (non-destructive). */
export function injectCompositionSoftHints(
  parts: string[],
  findings: CompositionSoftFinding[],
): string[] {
  const out = [...parts];
  for (const f of findings) {
    if (f.hint && !out.some((p) => p.includes(f.hint.slice(0, 4)))) {
      out.push(f.hint);
    }
  }
  return out;
}
