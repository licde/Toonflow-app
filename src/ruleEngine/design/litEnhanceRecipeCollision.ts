/**
 * Face/wound enhance × recipe collision — load lit_enhance_recipe_collision.json.
 * contact_prop_vs_face_identity: keep prop positive constraint; never silent-drop for face lock.
 */
import { readFixtureJson } from "../utils/fixturesPath";

export type LitEnhanceCollisionRow = {
  id: string;
  when: string[];
  resolve: string;
  forbid: string[];
  severity: "WARN" | "BLOCK";
};

type CollisionFixture = {
  version?: string;
  collisions?: LitEnhanceCollisionRow[];
  namingIsolation?: Record<string, string>;
};

let cached: CollisionFixture | null = null;

export function loadLitEnhanceRecipeCollisions(): CollisionFixture {
  if (cached) return cached;
  cached = readFixtureJson<CollisionFixture>("lit_enhance_recipe_collision.json", {
    collisions: [],
  });
  return cached;
}

export function resetLitEnhanceRecipeCollisionCache(): void {
  cached = null;
}

/** Active flags for when[] matching. */
export type RecipeCollisionFlags = {
  contactPropInFrame?: boolean;
  recipeFaceOrScene?: boolean;
  identityFaceLock?: boolean;
  intentVisualWound?: boolean;
  recipeHandCu?: boolean;
  dirtyHandEye?: boolean;
  litContactXor?: boolean;
  handLip?: boolean;
};

function whenMatched(when: string[], flags: RecipeCollisionFlags): boolean {
  return when.every((w) => {
    switch (w) {
      case "contactEvent.propInFrame":
        return Boolean(flags.contactPropInFrame);
      case "recipe.face_or_scene":
        return Boolean(flags.recipeFaceOrScene);
      case "identity.faceLock":
        return Boolean(flags.identityFaceLock);
      case "intentVisualWound.derive":
        return Boolean(flags.intentVisualWound);
      case "recipe.hand_cu":
        return Boolean(flags.recipeHandCu);
      case "dirtyHandEye":
        return Boolean(flags.dirtyHandEye);
      case "DEX-LIT-CONTACT-XOR":
        return Boolean(flags.litContactXor);
      case "DEX-HAND-LIP":
        return Boolean(flags.handLip);
      default:
        return false;
    }
  });
}

export function auditRecipeCollisions(flags: RecipeCollisionFlags): LitEnhanceCollisionRow[] {
  const rows = loadLitEnhanceRecipeCollisions().collisions ?? [];
  return rows.filter((r) => whenMatched(r.when ?? [], flags));
}

/**
 * Ensure contact prop positive line survives face_or_scene + identity face-lock.
 * Returns append line if missing; never allows silent_drop_prop_for_face_lock.
 */
export function resolveContactPropVsFaceIdentity(input: {
  visualDescription?: string | null;
  recipeMode?: string | null;
  sources?: string[] | null;
  descJoined?: string | null;
}): {
  hit: boolean;
  severity?: "WARN" | "BLOCK";
  keepProp: boolean;
  appendPropLine?: string;
  sourceTag?: string;
} {
  let contact = false;
  let prop = "道具";
  let locus = "面颊";
  try {
    const { isContactEventVd, matchContactEventVd } =
      require("../compilers/contactEventPolicy") as typeof import("../compilers/contactEventPolicy");
    const vd = String(input.visualDescription ?? "");
    if (isContactEventVd(vd)) {
      contact = true;
      const m = matchContactEventVd(vd);
      prop = m.propCanonical || m.propAlias || prop;
      locus = m.locus || locus;
    }
  } catch {
    return { hit: false, keepProp: true };
  }
  if (!contact) return { hit: false, keepProp: true };

  const recipeFace = String(input.recipeMode ?? "") === "face_or_scene";
  const src = input.sources ?? [];
  const faceLock = src.some((s) => /identityLock|identity\.face|refs\.identity/i.test(s));
  const hits = auditRecipeCollisions({
    contactPropInFrame: true,
    recipeFaceOrScene: recipeFace,
    identityFaceLock: faceLock || recipeFace,
  });
  const row = hits.find((h) => h.id === "contact_prop_vs_face_identity");
  if (!row) return { hit: false, keepProp: true };

  const joined = String(input.descJoined ?? "");
  let aliasHit = joined.includes(prop);
  try {
    const { textHasPropInFrame } =
      require("../compilers/contactEventPolicy") as typeof import("../compilers/contactEventPolicy");
    aliasHit = aliasHit || textHasPropInFrame(joined);
  } catch {
    /* optional */
  }
  const hasPropLine = /道具入画|须清晰可见/.test(joined) && aliasHit;
  const append = hasPropLine
    ? undefined
    : `道具入画：须清晰可见${prop}与${locus}真实贴合/划过接触，禁止悬空，禁止仅浅痕无${prop}`;

  return {
    hit: true,
    severity: row.severity,
    keepProp: true,
    appendPropLine: append,
    sourceTag: "collision.contact_prop_vs_face_identity",
  };
}
