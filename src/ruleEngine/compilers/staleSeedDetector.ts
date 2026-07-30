/**
 * Detect when track/FE seed prompt contradicts package design — must force spine rebuild.
 */
import type { ShotCompileContext } from "./hydrateShotCompileContext";
import { isNonLiteraryDialogueKey } from "../design/dialogueCoverage";

function sectionBody(prompt: string, section: string): string {
  const re = new RegExp(
    `\\[${section}\\]([\\s\\S]*?)(?=\\[(?:Visual|Motion|Camera|Audio|Narrative|References|Instruction)\\]|$)`,
    "i",
  );
  return (prompt.match(re)?.[1] ?? "").trim();
}

/** Track seed stale vs hydrated design ctx → burn must re-author from package. */
export function seedContradictsDesign(seed: string, ctx: ShotCompileContext): boolean {
  const t = String(seed ?? "").trim();
  if (!t) return false;

  const intentInSeed = /intent:(\w+)/i.exec(t)?.[1]?.toLowerCase();
  const intentDesign = String(ctx.videoIntent?.intentClass ?? "").toLowerCase();
  if (intentInSeed && intentDesign && intentInSeed !== intentDesign) return true;

  const audio = sectionBody(t, "Audio");
  if (audio) {
    const hasOrphanLip = /口型同步开启|lip-sync\s*active/i.test(audio);
    const hasPseudo = audio
      .split(/\n/)
      .some((line) => {
        const x = line.replace(/^["「]|["」]$/g, "").trim();
        return x && isNonLiteraryDialogueKey(x);
      });
    const hasLiterary = (ctx.dialogueLines ?? []).some((l) => l.trim() && !isNonLiteraryDialogueKey(l));
    if ((hasOrphanLip || hasPseudo) && !hasLiterary) return true;
  }

  const cam = sectionBody(t, "Camera");
  const m = /时长\s*(\d+(?:\.\d+)?)\s*s/i.exec(cam);
  if (m && ctx.durationSec > 0) {
    const camDur = Number(m[1]);
    if (Number.isFinite(camDur) && Math.abs(camDur - ctx.durationSec) > 1) return true;
  }

  if (/特效可见：\s*F0\b/i.test(t) && intentDesign === "react_silent") return true;
  if (/事件拍点：\s*F0\b/i.test(t)) return true;

  return false;
}
