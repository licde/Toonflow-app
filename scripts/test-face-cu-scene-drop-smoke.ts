/** Smoke: face CU drops scene; literary first; single cast card */
import { resolveStillBgPolicy } from "../src/ruleEngine/compilers/stillBgPolicy";
import { composeStillPrompt } from "../src/ruleEngine/compilers/composeStillPrompt";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

{
  const p = resolveStillBgPolicy({
    description: "特写。沈清漪侧脸，休书纸角划过面颊。纸未入口；仅颊触非口含。",
    shotSize: "特写",
    characterNames: ["沈清漪"],
  });
  ok("face CU excludeScene", p.excludeScene && p.policy === "drop", JSON.stringify(p));
  ok("face CU reason", p.reason === "faceCuDropScene");
}

{
  const r = composeStillPrompt({
    visualDescription: "特写。沈清漪侧脸，休书纸角划过面颊。纸未入口；仅颊触非口含。",
    shotSize: "特写",
    characters: [
      { code: "CHAR-A", name: "沈清瓷", hasImage: true, kind: "role" },
      { code: "CHAR-C", name: "沈清漪", hasImage: true, kind: "role" },
    ],
    qualityMode: "hq_update",
  });
  ok("compose ok", r.ok, r.blockReason);
  ok("literary first", /^特写/.test(String(r.prompt ?? "")), String(r.prompt).slice(0, 40));
  ok("excludeScene", r.excludeScene === true, String(r.excludeScene));
  ok("single cast card", /出镜人数：仅1人（沈清漪）/.test(String(r.prompt ?? "")), String(r.prompt).slice(-120));
  ok("no long sheet soup lead", !/角色参考若为四视图|严禁复刻多格/.test(String(r.prompt ?? "").slice(0, 80)));
}

console.log("OK face-cu-scene-drop-smoke");
