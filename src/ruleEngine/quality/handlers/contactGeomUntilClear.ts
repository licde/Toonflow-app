/**
 * CONTACT_GEOM untilClear handler — L0 contact_geom inject + L1 pixel geom.
 */
import { matchContactEventVd } from "../../compilers/contactEventPolicy";
import type { UntilClearFinding, UntilClearHealPatch, UntilClearHandlerCtx } from "../untilClearRuntime";

export const CLASS_ID = "CONTACT_GEOM";

export function detect(ctx: UntilClearHandlerCtx): UntilClearFinding[] {
  const out: UntilClearFinding[] = [];
  const vd = String(ctx.visualDescription ?? "");
  const m = matchContactEventVd(vd);
  if (!m.isContactEvent) return out;

  const items = ctx.fidelityItems ?? [];
  const geomFail = items.find((i) => !i.pass && /contact_geom|contactGeom/i.test(i.id));
  if (geomFail) {
    out.push({
      classId: CLASS_ID,
      layer: "L1_pixel",
      code: geomFail.id,
      message: geomFail.fixHint ?? "接触几何未过",
      debtKind: "pixel",
    });
  }
  const missing = ctx.descCoverageMissing ?? [];
  const locus = m.locus || "面颊";
  const prop = m.propCanonical || m.propAlias || "道具";
  if (missing.some((x) => /contact_geom|禁纸入口|禁口含/.test(x))) {
    out.push({
      classId: CLASS_ID,
      layer: "L0_prompt",
      code: "contact_l0_missing",
      message: `L0 接触约束未覆盖：${locus}/${prop}`,
      debtKind: "coverage",
    });
  }
  return out;
}

export function heal(_ctx: UntilClearHandlerCtx, findings: UntilClearFinding[]): UntilClearHealPatch {
  const patch: UntilClearHealPatch = { actuators: [], injectLines: [] };
  for (const f of findings) {
    if (f.layer === "L0_prompt") patch.actuators.push("prompt_inject");
    if (f.layer === "L1_pixel") {
      // GAP-PIXEL-GEOM: Edit → regen untilClear then soft CTA (needs Key)
      patch.actuators.push("fidelity_edit");
      patch.actuators.push("regen_storyboard_hq");
      try {
        const { planRepairFromFailureCluster } =
          require("../../design/repairAsDesign") as typeof import("../../design/repairAsDesign");
        const plan = planRepairFromFailureCluster({
          kind: "contact_miss",
          visualDescription: _ctx.visualDescription,
          hint: f.message,
        });
        for (const w of plan.writes) {
          if (w.slot === "visualDescription" || w.slot === "propPose") {
            patch.injectLines!.push(w.value);
          }
        }
      } catch {
        /* optional */
      }
    }
  }
  return patch;
}

export function reassert(ctx: UntilClearHandlerCtx): boolean {
  return detect(ctx).length === 0;
}
