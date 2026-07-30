/**
 * Lit enhance collision + XOR golden + pillars rollout — yarn test:lit-enhance-collision
 */
import assert from "node:assert/strict";
import { readFixtureJson } from "../src/ruleEngine/utils/fixturesPath";
import {
  auditLiteraryDetailQuality,
  resetLiteraryDetailCache,
} from "../src/ruleEngine/compilers/stillLiteraryDetailQuality";
import { resolveLitEnhanceMode, isLitEnhanceDesignHardBlock } from "../src/ruleEngine/design/litEnhancePolicy";
import { buildMustSurvive } from "../src/ruleEngine/compilers/stillLiteraryIntentSsot";
import { routeStillRepair } from "../src/ruleEngine/qc/stillRepairRoute";

resetLiteraryDetailCache();

function ok(name: string, cond: boolean, detail = "") {
  assert.ok(cond, `${name} ${detail}`);
  console.log("ok", name);
}

{
  const golden = readFixtureJson<{
    denseVisualDescription?: string;
    denseXorOkVisualDescription?: string;
    expect?: { dense?: { litContactXorBlock?: boolean }; denseXorOk?: { noLitContactXorBlock?: boolean } };
  }>("golden/still-cheek-contact-geom.json", {});
  const dense = String(golden.denseVisualDescription ?? "");
  const xorOk = String(golden.denseXorOkVisualDescription ?? "");
  const a = auditLiteraryDetailQuality({ visualDescription: dense, shotSize: "特写" });
  ok(
    "golden dense XOR block",
    a.findings.some((f) => f.id === "DEX-LIT-CONTACT-XOR" && f.severity === "BLOCK"),
    JSON.stringify(a.findings),
  );
  const b = auditLiteraryDetailQuality({ visualDescription: xorOk, shotSize: "特写" });
  ok(
    "golden xorOk pass",
    !b.findings.some((f) => f.id === "DEX-LIT-CONTACT-XOR" && f.severity === "BLOCK"),
  );
}

{
  const collision = readFixtureJson<{
    collisions?: { id: string }[];
    namingIsolation?: { contact_role_xor?: string; audio_xor?: string };
  }>("lit_enhance_recipe_collision.json", {});
  ok("collision rows", (collision.collisions?.length ?? 0) >= 2);
  ok("naming isolation", collision.namingIsolation?.contact_role_xor === "lit_detail_contact_xor");
  ok("audio_xor isolated", Boolean(collision.namingIsolation?.audio_xor));
  ok(
    "contact_prop_vs_face_identity row",
    Boolean(collision.collisions?.some((c) => c.id === "contact_prop_vs_face_identity")),
  );
}

{
  const { resolveContactPropVsFaceIdentity, auditRecipeCollisions } =
    require("../src/ruleEngine/design/litEnhanceRecipeCollision") as typeof import("../src/ruleEngine/design/litEnhanceRecipeCollision");
  const hits = auditRecipeCollisions({
    contactPropInFrame: true,
    recipeFaceOrScene: true,
    identityFaceLock: true,
  });
  ok("runtime collision hit", hits.some((h) => h.id === "contact_prop_vs_face_identity"));
  const r = resolveContactPropVsFaceIdentity({
    visualDescription: "特写。休书纸角划过面颊。",
    recipeMode: "face_or_scene",
    sources: ["refs.identityLock"],
    descJoined: "侧脸浅痕",
  });
  ok("keep prop append", Boolean(r.hit && r.appendPropLine && /休书|纸/.test(r.appendPropLine!)));
}

{
  ok("rollout default enforce", resolveLitEnhanceMode({}) === "enforce");
  ok("rollout off", resolveLitEnhanceMode({ pillarsLitEnhanceV1: "off" }) === "off");
  ok("rollout enforce hard", isLitEnhanceDesignHardBlock({ pillarsLitEnhanceV1: "enforce" }));
  ok("shadow not hard", !isLitEnhanceDesignHardBlock({ pillarsLitEnhanceV1: "shadow" }));
}

{
  const redesign = readFixtureJson<{ redesignPassIds?: { W3?: string[] } }>("redesign_contract.json", {});
  ok("redesign pass XOR", Boolean(redesign.redesignPassIds?.W3?.includes("DEX-LIT-CONTACT-XOR")));
}

{
  const surv = buildMustSurvive({
    visualDescription: "特写。沈清漪侧脸，休书纸角划过面颊，她紧咬下唇渗出血珠。",
    shotSize: "特写",
    characterNames: ["沈清漪"],
  });
  ok(
    "mustSurvive XOR item",
    surv.items.some((i) => i.id === "lit:contact_role_xor" || i.id.startsWith("contact")),
    surv.items.map((i) => i.id).join(","),
  );
}

{
  const r = routeStillRepair({
    itemResults: [{ id: "identity:foo", pass: false }],
    visualDescription: "特写。沈清漪侧脸，休书。",
    shotSize: "特写",
  });
  ok(
    "repair prefers enhance or hand_edit",
    r.irdPrimaryAction === "confirm_enhance" ||
      r.irdPrimaryAction === "hand_edit_vd" ||
      r.irdPrimaryAction === "confirm_split",
    r.irdPrimaryAction,
  );
  ok("repair cta enhance-aware", /手改VD|批准增强|确认拆镜|自动增强/.test(r.ctaLabel), r.ctaLabel);
}

console.log("OK lit-enhance-collision");
