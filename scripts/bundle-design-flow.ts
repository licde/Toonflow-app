/**
 * 生成 design_flow.bundle.md（从源 skill 合并，维护用）
 * yarn bundle:design-flow
 */
import fs from "fs";
import path from "path";

const skillsDir = path.join(process.cwd(), "data", "skills");
const outPath = path.join(skillsDir, "design_flow.bundle.md");

const header = `---
name: design_flow_bundle
description: >-
  外部浏览器 Chat 专用 · 单文件 · 无 API（由 yarn bundle:design-flow 生成）
version: "1.1.0"
mode: external
generated: true
---

`;

const parts = [
  "design_flow.bundle.md",
].map((f) => {
  const p = path.join(skillsDir, f);
  if (!fs.existsSync(p)) throw new Error(`缺少 ${f}`);
  let body = fs.readFileSync(p, "utf-8");
  body = body.replace(/^---[\s\S]*?---\n/, "");
  return body.trim();
});

const merged = header + parts.join("\n\n---\n\n") + "\n";
fs.writeFileSync(outPath, merged, "utf-8");
console.log("已写入:", outPath);
