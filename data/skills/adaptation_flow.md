---
name: adaptation_flow
description: 已 supersede → browser_full_flow.bundle.md v2.0.1 改编路径
version: "2.0.1"
redirect: browser_full_flow.bundle.md
orchestration: browser_flow_orchestration.md
---

# 改编流程已迁移

请使用 **Browser Chat v2.0.1**：

- 单文件：`data/skills/browser_full_flow.bundle.md`
- 编排：`data/skills/browser_flow_orchestration.md`
- 改编路径：P0→P03→P06→P08→P09→G→W1→W2→W3

运行 `yarn bundle:browser-full-flow` 重新生成 bundle。
- **script 原创**：可跳过 P 阶段，直写 W3；记录跳过原因

## G 层锚点

项目级 `globalAnchors`（G1-G5）存于 `o_projectBlueprint`，W3 与进制作时注入 continuity。

## 进制作

W3 某集剧本完成后：写入 `o_script` → 跳转 `#/production?scriptId=&autoDesign=1` → 内部 `importScript` + autoDesign。

## 外部导出

用户可 `exportScriptBundle` 导出 JSON 给外部 Chat 改稿后再 `importScript` 回来。
