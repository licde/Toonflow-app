/**
 * stillPromptLint — strip conflicting / duplicate / flow-only clauses before vendor prompt egress.
 * Keeps literary body and identity tokens, but removes decision text that should stay in repair CTA.
 */

export type PromptConflict = {
  id: string;
  severity: "warn" | "drop";
  message: string;
};

export type PromptLintResult = {
  prompt: string;
  conflicts: PromptConflict[];
  removed: string[];
};

const FLOW_ONLY_PATTERNS: Array<{ id: string; re: RegExp }> = [
  { id: "split_strategy", re: /不可读则拆[^。；]*镜[^。；]*/g },
  { id: "repair_strategy", re: /失败后[^。；]*/g },
  { id: "cta_strategy", re: /请(?:手改|确认|重编译)[^。；]*/g },
];

/** Engineering / repair-cluster tokens must never reach the image vendor. */
const ENG_ONLY_PATTERNS: Array<{ id: string; re: RegExp }> = [
  { id: "force_compose", re: /force_compose[_\w]*/gi },
  { id: "delta_hash", re: /delta_hash[_\w]*/gi },
  { id: "hash_or_refs", re: /hash_or_refs/gi },
  { id: "cluster_key", re: /clusterKey\s*[:=]\S+/gi },
  { id: "auto_repair_eng", re: /autoRepair(?:Stage|Round|BudgetLeft)\s*[:=]\S+/gi },
  { id: "prop_soft_plate_eng", re: /\bpropSoftPlate\b/gi },
  { id: "isomorphic_regen", re: /\bisomorphic_regen\b/gi },
  { id: "keep_soft_env_hint", re: /keep_soft_env_ref\+sref\+studio_ban/gi },
  { id: "inject_cross_class_hint", re: /inject_cross_class_anti_sub[+\w]*/gi },
  { id: "compose_regen_hint", re: /compose_regen_contact_geom/gi },
  { id: "regen_with_structure", re: /regen_with_structure/gi },
  { id: "prop_soft_plus_hint", re: /prop_soft_plate\+[+\w]*/gi },
  { id: "inject_prop_glyph_hint", re: /inject_prop_glyph[+\w]*/gi },
  { id: "strip_secondary_hint", re: /strip_secondary_full[+\w]*/gi },
];

function dedupeSentences(text: string): { text: string; removed: string[] } {
  const removed: string[] = [];
  const parts = String(text)
    .split(/[。！？；]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const p of parts) {
    const norm = p.replace(/\s+/g, "").replace(/[，,]/g, "");
    if (seen.has(norm)) {
      removed.push(`dup:${p.slice(0, 24)}`);
      continue;
    }
    seen.add(norm);
    kept.push(p);
  }
  return { text: kept.join("。"), removed };
}

export function lintStillPromptBody(input: {
  prompt?: string | null;
  visualDescription?: string | null;
}): PromptLintResult {
  let prompt = String(input.prompt ?? "").trim();
  const vd = String(input.visualDescription ?? "").trim();
  const conflicts: PromptConflict[] = [];
  const removed: string[] = [];

  // Conflict: side face vs front face.
  if (/侧脸/.test(prompt) && /正脸朝向镜头|正脸朝向/.test(prompt)) {
    prompt = prompt.replace(/[^。；]*正脸朝向镜头[^。；]*[。；]?/g, "").trim();
    conflicts.push({
      id: "face_orientation_conflict",
      severity: "drop",
      message: "侧脸与正脸朝向镜头互斥，已移除正脸朝向约束",
    });
    removed.push("face_orientation_conflict");
  }

  // Drop flow-only sentences from final vendor prompt.
  for (const p of FLOW_ONLY_PATTERNS) {
    p.re.lastIndex = 0;
    const next = prompt.replace(p.re, " ").replace(/\s{2,}/g, " ").trim();
    if (next === prompt) continue;
    prompt = next;
    conflicts.push({
      id: p.id,
      severity: "drop",
      message: "流程/修复语句不应进入当前帧 vendor prompt",
    });
    removed.push(p.id);
  }

  // Drop engineering / cluster hints (never for the image model).
  for (const p of ENG_ONLY_PATTERNS) {
    p.re.lastIndex = 0;
    const next = prompt.replace(p.re, " ").replace(/\s{2,}/g, " ").trim();
    if (next === prompt) continue;
    prompt = next;
    conflicts.push({
      id: p.id,
      severity: "drop",
      message: "工程/修复簇标记不应进入 vendor prompt",
    });
    removed.push(p.id);
  }

  // Agnes tag-stack + orphan CU crumbs (MS/bend must not keep 特写 soup)
  {
    const before = prompt;
    prompt = prompt.replace(/,?\s*tag-stack-zh\b/gi, " ").replace(/\s{2,}/g, " ").trim();
    if (/中景|弯腰|捡起|捡拾|俯身|\bMS\b/i.test(`${prompt} ${vd}`)) {
      prompt = prompt
        .replace(/(?:^|[。；，,\s])特写。/g, (m) => m.replace(/特写。/, ""))
        .replace(/^特写[，,。\s]+/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();
    }
    if (prompt !== before) {
      conflicts.push({
        id: "agnes_tag_stack_cu_soup",
        severity: "drop",
        message: "剥除 tag-stack-zh / 孤立特写残渣",
      });
      removed.push("agnes_tag_stack_cu_soup");
    }
  }

  // Too many repeated mouth bans / identity locks dilute main action.
  const mouthBanHits = (prompt.match(/禁口含|禁纸入口|仅(?:面颊|颊)触非口含/g) ?? []).length;
  if (mouthBanHits > 3) {
    let seenMouth = false;
    prompt = prompt.replace(/(禁口含；?禁纸入口；?仅(?:面颊|颊)触非口含)/g, (m) => {
      if (seenMouth) {
        removed.push("duplicate_mouth_ban");
        return "";
      }
      seenMouth = true;
      return m;
    });
    conflicts.push({
      id: "duplicate_mouth_ban",
      severity: "warn",
      message: "口含禁令重复，已压缩",
    });
  }

  const deduped = dedupeSentences(prompt);
  prompt = deduped.text;
  removed.push(...deduped.removed);

  // Keep literary VD lead if scrub made prompt too empty.
  if (prompt.replace(/\s+/g, "").length < 24 && vd) {
    prompt = `${vd}。${prompt}`.replace(/。{2,}/g, "。").trim();
    conflicts.push({
      id: "restore_vd_lead",
      severity: "warn",
      message: "压缩后正文过短，恢复 visualDescription 作为 lead",
    });
  }

  const linted = prompt.replace(/\s{2,}/g, " ").trim();
  try {
    const { guardStillPromptFoundations } =
      require("./stillPromptFoundationGuard") as typeof import("./stillPromptFoundationGuard");
    const guarded = guardStillPromptFoundations({
      prompt: linted,
      // Use already-linted body so foundation restore cannot reintroduce FLOW_ONLY / face conflicts
      originalPrompt: linted,
      visualDescription: vd,
    });
    let out = guarded.prompt;
    // Re-strip flow-only + ENG_ONLY after foundation (belt-and-suspenders)
    for (const p of [...FLOW_ONLY_PATTERNS, ...ENG_ONLY_PATTERNS]) {
      p.re.lastIndex = 0;
      const next = out.replace(p.re, " ").replace(/\s{2,}/g, " ").trim();
      if (next !== out) {
        out = next;
        if (!removed.includes(p.id)) {
          conflicts.push({
            id: p.id,
            severity: "drop",
            message: "流程/工程标记不应进入当前帧 vendor prompt",
          });
          removed.push(p.id);
        }
      }
    }
    if (/侧脸/.test(out) && /正脸朝向镜头|正脸朝向/.test(out)) {
      out = out.replace(/[^。；]*正脸朝向镜头[^。；]*[。；]?/g, "").trim();
    }
    if (guarded.restored.length) {
      conflicts.push({
        id: "foundation_restore",
        severity: "warn",
        message: `压缩后回补基础契约：${guarded.restored.join(",")}`,
      });
    }
    return { prompt: out.replace(/\s{2,}/g, " ").trim(), conflicts, removed: [...new Set(removed)] };
  } catch {
    return { prompt: linted, conflicts, removed: [...new Set(removed)] };
  }
}
