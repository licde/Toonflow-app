/**
 * Golden: L0 literary fidelity checklist + re-compose not collapsing to 沈清瓷.
 * yarn tsx scripts/test-still-literary-fidelity-loop.ts
 */
import {
  assertLiteraryFidelity,
  buildLiteraryFidelityChecklist,
  resolveLiteraryDescriptionSsot,
  strengthenFromMissing,
  mergeStrengthenMonotonic,
} from "../src/ruleEngine/compilers/literaryFidelityChecklist";
import {
  composeStillPrompt,
  resolveComposeMode,
  shouldDefaultFidelityCompose,
  stripStaleBindingFromPrevious,
  computeComposeHash,
} from "../src/ruleEngine/compilers/composeStillPrompt";
import { mergeCharacterHints } from "../src/ruleEngine/compilers/hydrateComposeStillContext";
import { runStillPromptPipeline } from "../src/ruleEngine/compilers/stillPromptPipeline";
import { resolveShotIdentityBinding } from "../src/ruleEngine/compilers/resolveShotIdentityBinding";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const DESC = "沈母端坐高位太师椅摩挲扳指，沈清瓷跪低位蒲团抄书，权力反差构图，烛火摇曳。";

// --- SSOT ---
{
  const a = resolveLiteraryDescriptionSsot({ visualDescription: DESC });
  ok("ssot visualDescription", a.ok && a.source === "shot.visualDescription");
  const b = resolveLiteraryDescriptionSsot({
    visualDescription: "",
    cleanPasteBody: "vertical 9:16 safe area power blocking",
  });
  ok("ssot rejects dirty paste", !b.ok);
}

// --- checklist who + seating ---
{
  const items = buildLiteraryFidelityChecklist({
    description: DESC,
    characterNames: ["沈母周氏", "沈清瓷"],
    requireDualIdentity: true,
  });
  ok("has seating items", items.some((i) => i.kind === "seating" || /端坐|跪/.test(i.id)));
  ok("has composition", items.some((i) => i.id.includes("权力反差") || i.kind === "composition"));
  ok("has atmosphere 烛火", items.some((i) => i.id.includes("烛火")));
  ok("has forbidden", items.some((i) => i.forbidden));
  const packPrompt = `${DESC} 场面硬约束：沈母必须端坐太师椅；沈清瓷必须跪于蒲团。禁止用双人站立香案仪式。出镜人数：仅2人（沈母周氏、沈清瓷）。站位绑定：沈母周氏=高位，沈清瓷=低位 --cref CHAR-SHENMU CHAR-SHENQINGCI`;
  const assert = assertLiteraryFidelity(packPrompt, items);
  ok("full prompt fidelity ok", assert.ok, assert.missing.map((m) => m.id).join(","));
}

// --- empty desc hard ---
{
  const empty = resolveLiteraryDescriptionSsot({});
  ok("empty ssot block", !empty.ok && empty.blockReason === "missing_visual_description");
}

// --- merge characters: 沈母 without asset still in list ---
{
  const merged = mergeCharacterHints(
    [{ code: "CHAR-SHENQINGCI", name: "沈清瓷", hasImage: true, kind: "character" }],
    { visualDescription: DESC, dialogueSpeakers: ["沈母"] },
  );
  ok(
    "merge includes 母",
    merged.some((c) => /母|周氏/.test(c.name ?? "")),
    merged.map((c) => c.name).join(","),
  );
  ok("merge keeps 清瓷 imaged", merged.some((c) => c.code === "CHAR-SHENQINGCI" && c.hasImage));
}

// --- strip stale binding ---
{
  const dirty = "沈母端坐。站位绑定：沈清瓷=高位，沈清瓷=低位 --cref CHAR-SHENQINGCI 权力位：沈清瓷";
  const stripped = stripStaleBindingFromPrevious(dirty);
  ok("strip 站位绑定", !/站位绑定/.test(stripped));
  ok("strip cref", !/--cref/.test(stripped));
  ok("keep literary", /端坐/.test(stripped));
}

// --- prefer fidelity dual seating ---
{
  ok(
    "shouldDefaultFidelityCompose",
    shouldDefaultFidelityCompose({
      visualDescription: DESC,
      characters: [
        { name: "沈母", code: "CHAR-SHENMU", hasImage: true },
        { name: "沈清瓷", code: "CHAR-SHENQINGCI", hasImage: true },
      ],
    }),
  );
  const mode = resolveComposeMode({
    promptState: "composed",
    existingPrompt: "已有长描写正文足够长度一二三四五六七八九十",
    preferFidelity: true,
  });
  ok("re-click → fidelity", mode === "fidelity", mode);
}

// --- hash includes assets ---
{
  const h1 = computeComposeHash({
    visualDescription: DESC,
    characters: [{ code: "CHAR-A", hasImage: true }],
  });
  const h2 = computeComposeHash({
    visualDescription: DESC,
    characters: [
      { code: "CHAR-A", hasImage: true },
      { code: "CHAR-B", hasImage: true },
    ],
  });
  ok("hash changes with assets", h1 !== h2);
}

// --- compose twice refine does not collapse cref to single 清瓷 ---
{
  const chars = [
    { code: "CHAR-SHENMU", name: "沈母周氏", hasImage: true, kind: "character" as const },
    { code: "CHAR-SHENQINGCI", name: "沈清瓷", hasImage: true, kind: "character" as const },
  ];
  const r1 = composeStillPrompt(
    { visualDescription: DESC, characters: chars, qualityMode: "hq_update" },
    { mode: "full" },
  );
  ok("compose1 ok", r1.ok);
  const bind1 = resolveShotIdentityBinding({ description: DESC, characters: chars });
  ok("bind1 dual", bind1.orderedCodes.length === 2, bind1.orderedCodes.join(","));
  ok("bind1 high 母", bind1.orderedCodes[0] === "CHAR-SHENMU", bind1.orderedCodes.join(","));

  const prev = stripStaleBindingFromPrevious(r1.visualBody);
  const r2 = composeStillPrompt(
    {
      visualDescription: DESC,
      characters: chars,
      qualityMode: "hq_update",
      previousVisualBody: prev + " 站位绑定：沈清瓷=高位，沈清瓷=低位",
    },
    { mode: "fidelity" },
  );
  ok("compose2 ok", r2.ok);
  ok("compose2 not same-person dual", !/沈清瓷=高位[^。]*沈清瓷=低位/.test(r2.prompt), r2.prompt.slice(0, 200));
  const bind2 = resolveShotIdentityBinding({ description: DESC, characters: chars });
  ok("bind2 still 母 first", bind2.orderedCodes[0] === "CHAR-SHENMU");
}

// --- pipeline inject missing ---
{
  const composed = composeStillPrompt(
    {
      visualDescription: DESC,
      characters: [
        { code: "CHAR-SHENMU", name: "沈母", hasImage: true },
        { code: "CHAR-SHENQINGCI", name: "沈清瓷", hasImage: true },
      ],
    },
    { mode: "full" },
  );
  const pipe = runStillPromptPipeline({
    composed,
    description: DESC,
    characterNames: ["沈母", "沈清瓷"],
    modality: "image",
  });
  ok("pipeline literary", pipe.literaryOk);
  ok("pipeline fidelity or injected", pipe.fidelityOk || pipe.autoHealed.some((a) => a.startsWith("inject:")), pipe.fidelityMissing.join(","));
}

// --- strengthen monotonic ---
{
  const items = buildLiteraryFidelityChecklist({
    description: DESC,
    characterNames: ["沈母", "沈清瓷"],
  });
  const miss = items.filter((i) => i.kind === "prop").slice(0, 1);
  const s1 = strengthenFromMissing(miss);
  const s2 = mergeStrengthenMonotonic(s1, { roleLock: "沈母端坐太师椅" });
  ok("strengthen keeps props", Boolean(s2.mustProps || s2.roleLock));
  ok("strengthen merges roleLock", /端坐|太师椅/.test(s2.roleLock ?? ""));
}

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\ntest-still-literary-fidelity-loop: OK");
