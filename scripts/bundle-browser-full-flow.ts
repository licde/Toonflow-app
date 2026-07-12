/**
 * 生成 browser_full_flow.bundle.md v2.0.1
 * yarn bundle:browser-full-flow [--tier T1|T3]
 */
import fs from "fs";
import path from "path";

const skillsDir = path.join(process.cwd(), "data", "skills");
const genDir = path.join(skillsDir, "_generated");
const chatDir = path.join(skillsDir, "browser_chat");
const fixturesDir = path.join(process.cwd(), "data", "fixtures");
const rulePacksDir = path.join(process.cwd(), "data", "rule-packs");
const outPath = path.join(skillsDir, "browser_full_flow.bundle.md");

const tierArg = process.argv.includes("--tier") ? process.argv[process.argv.indexOf("--tier") + 1] ?? "T3" : "T3";
const bundleManifest = JSON.parse(fs.readFileSync(path.join(rulePacksDir, "manifest.json"), "utf-8"));
const sectionManifest = JSON.parse(fs.readFileSync(path.join(rulePacksDir, "bundle_sections.json"), "utf-8"));

function readRel(rel: string): string {
  const p = path.join(skillsDir, rel);
  if (!fs.existsSync(p)) return `<!-- missing: ${rel} -->\n`;
  let body = fs.readFileSync(p, "utf-8");
  body = body.replace(/^---[\s\S]*?---\n/, "");
  return body.trim();
}

function readChat(rel: string): string {
  const p = path.join(chatDir, rel);
  if (!fs.existsSync(p)) return `<!-- missing: browser_chat/${rel} -->\n`;
  let body = fs.readFileSync(p, "utf-8");
  body = body.replace(/^---[\s\S]*?---\n/, "");
  return body.trim();
}

function readGen(name: string): string {
  const p = path.join(genDir, name);
  if (!fs.existsSync(p)) return `<!-- run yarn extract:rule-checklists -->\n`;
  return fs.readFileSync(p, "utf-8").trim();
}

function readFixture(name: string): string {
  const p = path.join(fixturesDir, name);
  if (!fs.existsSync(p)) return "{}";
  return fs.readFileSync(p, "utf-8").trim();
}

const header = `---
name: browser_full_flow_bundle
description: Browser Chat v2.0.1 全流程单文件 bundle（yarn bundle:browser-full-flow 生成）
version: "2.0.1"
rulePackVersion: "2.0.1"
mode: external
generated: true
supersedes: design_flow.bundle.md v1.1
---

# Browser Chat 全流程 · 优化版 v2.0.1

> 生成时间：${new Date().toISOString()} · rulePack ${bundleManifest.rulePackVersion} · tier ${tierArg} · 勿手改，改源 skill 后重跑 \`yarn bundle:browser-full-flow\`

`;

const allSections: [string, string][] = [
  ["§0 用法·红线", readRel("browser_flow_orchestration.md")],
  ["§1 输入契约", readChat("00_index.md") + "\n\n" + readChat("appendix/O_production_closure.md")],
  ["§2 改编路径 P", readChat("stages/P0_precheck.md") + "\n\n" + readChat("stages/P03_matrix.md")],
  ["§3 G 层锚点", readChat("stages/G_anchors.md")],
  ["§4 W 阶段", readChat("stages/W1_skeleton.md") + "\n\n" + readChat("stages/W2_strategy.md") + "\n\n" + readChat("stages/W3_script.md") + "\n\n" + readChat("corridor/corridor_W3.md")],
  ["§5.0 质量走廊", readChat("corridor/corridor_GB.md") + "\n\n" + readChat("corridor/corridor_SB.md") + "\n\n" + readChat("corridor/corridor_EN.md")],
  ["§5.1 台词链", readChat("stages/linkage_continuity.md")],
  ["§5.5 设计联动 designBrief", readChat("stages/design_brief.md")],
  ["§6 规则自检 P+G+W", readGen("rule_checklists_pgw.md")],
  ["§7 T1 ScriptBundle schema", readFixture("script-bundle-template-v2.json")],
  ["§8 多集 continuity", readChat("stages/linkage_continuity.md")],
  ["§9 导入 Toonflow", readRel("browser_flow_orchestration.md")],
  ["§10 智能检测 SD", readChat("stages/smart_detection.md") + "\n\n" + readChat("supervision_review.md")],
  ["§11 正推反推", readChat("corridor/corridor_repush.md")],
  ["§12 质量问题 QP", readFixture("qp_catalog.json")],
  ["§13 统一闭环", readFixture("rule_flow_unified.json")],
  ["§14 制作实现闭环", readChat("stages/production_identity_audit.md") + "\n\n" + readChat("stages/production_fx_feasibility.md") + "\n\n" + readChat("stages/production_debut_intro.md") + "\n\n" + readChat("stages/production_reasonableness_PR.md")],
  ["§15 四模态触达走廊", readChat("appendix/P_modality_touch_four.md") + "\n\n" + readChat("production/MD_modality_IMG.md") + "\n\n" + readChat("production/MD_modality_VID.md") + "\n\n" + readChat("production/MD_modality_AUD.md") + "\n\n" + readChat("production/MD_modality_FX.md") + "\n\n" + readChat("stages/smart_detection_modality.md")],
  ["§16 设计七维闭环", readChat("stages/design_dialogue.md") + "\n\n" + readChat("stages/design_scene.md") + "\n\n" + readChat("stages/design_story_push.md") + "\n\n" + readChat("stages/design_camera_transition.md") + "\n\n" + readChat("stages/design_av.md")],
  ["§17 统一闭环总纲", readChat("appendix/T_unified_closure.md") + "\n\n" + readFixture("unified_closure_matrix.json") + "\n\n" + readFixture("design_closure_checklist.json") + "\n\n" + readFixture("generation_closure_checklist.json") + "\n\n" + readFixture("intelligent_closure_checklist.json")],
  ["附录 A T2", readChat("production/CD_character_design.md") + "\n\n" + readChat("production/AS_asset_pipeline.md") + "\n\n" + readChat("production/BP_blueprint.md")],
  ["附录 B T3 MD", readChat("production/MD_modality_overview.md") + "\n\n" + readChat("production/MD_prompt_compliance.md") + "\n\n" + readRel("production_execution_modality_image.md") + "\n\n" + readRel("production_execution_modality_video.md") + "\n\n" + readRel("production_execution_modality_audio.md") + "\n\n" + readRel("production_execution_modality_effects.md") + "\n\n" + readFixture("episode-bundle-template-v2.json")],
  ["附录 C 审计", readChat("appendix/C_rule_audits.md")],
  ["附录 D 回滚", readChat("appendix/D_rollback_layers.md")],
  ["附录 E 规则应用", readChat("appendix/E_rule_application.md") + "\n\n" + readFixture("rule_application_matrix.json")],
  ["附录 F fixPlan", readGen("fix_templates.json")],
  ["附录 G W93-W100", readChat("appendix/G_smart_design_W93.md")],
  ["附录 H 图锚点", readChat("appendix/H_visual_lock_table.md")],
  ["附录 I 六链", readFixture("linkage_chains.json") + "\n\n" + readFixture("linkage_repair_plan.schema.json")],
  ["附录 J 出口闸门", readChat("T1_quality_gate.md") + "\n\n" + readChat("T3_quality_gate.md")],
  ["附录 K 走廊", readGen("rule_checklists_linkage.md")],
  ["附录 L rePush", readFixture("reverse_route_table.json")],
  ["附录 M QP+模态", readFixture("modality_prompt_slots.json")],
  ["附录 N 统一闭环", readChat("appendix/N_unified_closure.md")],
  ["附录 O 制作闭环 dryRun", readChat("appendix/O_production_closure.md") + "\n\n" + readFixture("production_closure_checklist.json")],
  ["附录 P 四模态触达", readFixture("modality_touch_matrix.json") + "\n\n" + readFixture("video_audio_policy.json") + "\n\n" + readFixture("agnes_vendor_gates.json")],
  ["附录 Q 四模态反推", readFixture("reverse_route_table.json")],
  ["附录 T 十链矩阵", readFixture("linkage_chains.json") + "\n\n" + readFixture("design_dimension_matrix.json") + "\n\n" + readFixture("forward_trace.schema.json")],
  ["附录 U 统一反推决策", readFixture("unified_closure_matrix.json") + "\n\n" + readFixture("bidirectional_trace.schema.json")],
  ["附录 V 智能修复", readChat("appendix/V_intelligent_repair.md") + "\n\n" + readFixture("repair_hint_catalog.json")],
  ["附录 W 多端闭环", readChat("appendix/W_multiterm_closure.md") + "\n\n" + readFixture("multi_end_closure_matrix.json")],
];

const t1Cfg = sectionManifest.tiers?.T1 ?? {};
const sections = tierArg === "T3"
  ? allSections
  : allSections.filter(([title]) => {
      if (t1Cfg.excludePrefixes?.some((p: string) => title.startsWith(p))) return false;
      return true;
    });

const body = sections.map(([title, content]) => `## ${title}\n\n${content}`).join("\n\n---\n\n");
const merged = header + body + "\n";
fs.writeFileSync(outPath, merged, "utf-8");
console.log("已写入:", outPath, `(${(merged.length / 1024).toFixed(1)} KB)`);

// redirect note in design_flow.bundle
const redirect = `---
name: design_flow_bundle
description: 已 supersede → 请使用 browser_full_flow.bundle.md v2.0.1
version: "2.0.1"
redirect: browser_full_flow.bundle.md
---

# 已迁移

请使用 \`data/skills/browser_full_flow.bundle.md\`（Browser Chat v2.0.1）。

运行 \`yarn bundle:browser-full-flow\` 重新生成。
`;
fs.writeFileSync(path.join(skillsDir, "design_flow.bundle.md"), redirect, "utf-8");
console.log("已更新 design_flow.bundle.md redirect");
