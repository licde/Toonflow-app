/** Smoke: sheet-lock soup must not lead refine/egress */
import {
  stripStaleBindingFromPrevious,
  previousBodyIsSheetLockSoup,
  composeStillPrompt,
} from "../src/ruleEngine/compilers/composeStillPrompt";
import { demoteSheetLockSoup } from "../src/ruleEngine/compilers/stillEgressNormalize";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

const poisoned =
  "角色参考若为四视图/定妆拼版，仅借脸型、发型、服饰身份；严禁复刻多格拼版、分栏头像墙或 character sheet 布局，必须输出描写中的单一电影场面。特写。沈清漪侧脸，休书纸角划过面颊。";

const stripped = stripStaleBindingFromPrevious(poisoned);
ok("strip removes long sheet lock", !/角色参考若为四视图|严禁复刻多格/.test(stripped), stripped.slice(0, 80));
ok("strip keeps literary", /休书|侧脸/.test(stripped), stripped);

const residual = "严禁复刻多格拼版、分栏头像墙或 character sheet 布局，必须输出描写中的单一电影场面。";
ok("detect residual soup", previousBodyIsSheetLockSoup(residual));

const r = composeStillPrompt(
  {
    visualDescription: "特写。沈清漪侧脸，休书纸角划过面颊。纸未入口；仅颊触非口含。",
    shotSize: "特写",
    characters: [{ name: "沈清漪", code: "CHAR-C", hasImage: true, kind: "role" }],
    qualityMode: "hq_update",
    previousVisualBody: poisoned,
  },
  { mode: "refine" },
);
ok(
  "refine drops sheet soup previous",
  (r.sources ?? []).some((s) => s.includes("dropped_sheet_lock_soup") || s.includes("sheet_lock")),
  JSON.stringify(r.sources),
);
ok("compose literary first", /^特写/.test(String(r.prompt ?? "")), String(r.prompt).slice(0, 60));
ok("compose no long sheet ZH", !/角色参考若为四视图|character sheet 布局/.test(String(r.prompt ?? "")));

const d = demoteSheetLockSoup(poisoned);
ok("demote literary first", /^特写/.test(d.prompt), d.prompt.slice(0, 50));
ok("demote short lock at end", /四视图仅借身份/.test(d.prompt.slice(-80)));

console.log("OK sheet-lock-soup-smoke");
