/**
 * Expand viral weapons (e.g. five_cut_reveal) into physical shot skeletons.
 * Does not rewrite dialogue text — attaches dialogue only on speakIndex beat.
 */
import { readFixtureJson } from "../utils/fixturesPath";
import { flattenDialogueText, asDialogueLineObjects } from "../design/dialogueCoverage";

type WeaponBeat = {
  role: string;
  shotSize: string;
  motion: string;
  durationSec: number;
  tag?: string;
  hasDialogue?: boolean;
};

type WeaponDef = {
  id: string;
  label?: string;
  shotCount: number;
  beats: WeaponBeat[];
  speakIndex?: number;
  source?: string;
};

export function expandWeaponToShots(
  weaponId: string,
  parentShot: Record<string, unknown>,
): { shots: Record<string, unknown>[]; expanded: boolean; weaponId: string } {
  const lib = readFixtureJson<Record<string, WeaponDef>>("weapon_expanders.json", {});
  const def = lib[weaponId];
  if (!def?.beats?.length) {
    return { shots: [parentShot], expanded: false, weaponId };
  }
  // idempotent: already expanded
  if (parentShot.weaponExpandedId === weaponId || parentShot.weaponBeatRole) {
    return { shots: [parentShot], expanded: false, weaponId };
  }

  const dlg = (parentShot.narrative as { dialogue?: { lines?: unknown } } | undefined)?.dialogue;
  const lines = asDialogueLineObjects(dlg?.lines);
  const speakIdx = def.speakIndex ?? def.beats.findIndex((b) => b.hasDialogue) ?? 0;
  const text = flattenDialogueText(dlg?.lines);

  const shots = def.beats.map((beat, i) => {
    const isSpeak = i === speakIdx || beat.hasDialogue;
    return {
      ...parentShot,
      clientId: `${String(parentShot.clientId ?? parentShot.shotIndex ?? "w")}-${weaponId}-${i}`,
      shotIndex: undefined,
      weaponExpandedId: weaponId,
      weaponBeatRole: beat.role,
      beatRole: isSpeak ? "speak" : beat.role === "reaction" ? "reaction" : "emphasize",
      duration: beat.durationSec,
      motion: isSpeak ? "static" : beat.motion.replace(/_/g, " "),
      videoDesc: `${beat.shotSize} ${isSpeak ? "static" : beat.motion}, ${beat.durationSec}s`,
      packagingRole: beat.tag,
      narrative: {
        ...((parentShot.narrative as object) ?? {}),
        shotSize: beat.shotSize,
        dialogue: isSpeak
          ? { lines: lines.length ? lines : text ? [{ text }] : [] }
          : { lines: [] },
        emotionIntensity: (parentShot.narrative as { emotionIntensity?: number })?.emotionIntensity,
      },
    };
  });

  return { shots, expanded: true, weaponId };
}

/** Preview feasibility at design time without mutating package. */
export function previewWeaponFeasibility(weaponId: string): {
  ok: boolean;
  shotCount: number;
  needsDialogueMaterial: boolean;
  label?: string;
} {
  const lib = readFixtureJson<Record<string, WeaponDef>>("weapon_expanders.json", {});
  const def = lib[weaponId];
  if (!def) return { ok: false, shotCount: 0, needsDialogueMaterial: false };
  return {
    ok: true,
    shotCount: def.shotCount ?? def.beats.length,
    needsDialogueMaterial: (def.speakIndex ?? 0) >= 0,
    label: def.label,
  };
}
