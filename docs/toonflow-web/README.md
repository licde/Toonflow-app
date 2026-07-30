# Toonflow-web RulePanel 集成包

从 Toonflow-app 复制到 **Toonflow-web** 仓库使用（本仓 `data/web*` 为 hashed 产物，不在此改源码）。

## 文件清单

| 文件 | 用途 |
|------|------|
| `types/closure.ts` | API 响应 TypeScript 类型（含 `exportGate.chatRepairText`） |
| `types/emotionNorm.ts` | 情绪规范 profile API / UX 文案契约 |
| `api/inspectBundle.ts` | HTTP 客户端（dryRun 暴露 exportGate） |
| `components/RulePanel.vue` | 闭环展示 + 复制清单 + 情绪结构 CTA + **W93 smartProposal Confirm/Apply** + presentationFork |

情绪规范切换说明见仓库根 [`docs/FE_EMOTION_NORM_SWITCH.md`](../FE_EMOTION_NORM_SWITCH.md)。

## 集成步骤

1. 复制上述三个文件到 Toonflow-web 对应目录（如 `src/views/production/`）。
2. 在 import / dryRun 后挂载 RulePanel，**必须**接线 `exportGate`：

```vue
<script setup lang="ts">
import { ref } from "vue";
import RulePanel from "@/components/RulePanel.vue";
import { dryRunImport } from "@/api/inspectBundle";
import type { DryRunImportResponse, InspectBundleResult } from "@/types/closure";
import { ApiError } from "@/types/closure";

const closure = ref<InspectBundleResult | null>(null);
const exportAllowed = ref<boolean | null>(null);
const chatRepairText = ref("");

async function onDryRun(bundle: object) {
  try {
    const res: DryRunImportResponse = await dryRunImport(bundle, { projectId: 1 });
    closure.value = res.preImport ?? (res as InspectBundleResult);
    exportAllowed.value = res.exportGate?.exportAllowed ?? null;
    chatRepairText.value = res.exportGate?.chatRepairText ?? res.chatRepairText ?? "";
  } catch (e) {
    if (e instanceof ApiError && e.chatRepairText) {
      exportAllowed.value = false;
      chatRepairText.value = e.chatRepairText;
    }
    throw e;
  }
}
</script>

<template>
  <RulePanel
    :result="closure"
    :export-allowed="exportAllowed"
    :chat-repair-text="chatRepairText"
    :smart-design-proposals="closure?.smartDesignProposals"
    @copy-chat="(t) => navigator.clipboard.writeText(t)"
    @re-push="(p) => router.push({ query: { stage: p.reverseTarget } })"
    @confirm-smart-proposal="(p) => smartOps('confirm', p)"
    @reject-smart-proposal="(p) => smartOps('reject', p)"
    @apply-smart-proposals="() => smartOps('apply')"
    @presentation-fork="(p) => smartOps('confirm', p)"
  />
</template>
```

`smartOps` → `POST /api/scriptAgent/smartProposalOps`（`list|build|confirm|reject|apply`）。Confirm 后须 `apply` 才写镜字段 / cascade stale。

3. 确保后端已部署 `POST /api/ruleEngine/dryRunImport`（返回 `exportGate.chatRepairText`）。

## 字段契约

- `exportGate.exportAllowed === false` → 阻断主 banner（不要只信 WARN 条数）
- `exportGate.chatRepairText` → 一键复制整段闭环修复清单（含 BLOCK 明细 + 缺失字段 + RH）
- 回推按钮 = **仅跳转**，不改 JSON

见 [FE_REPUSH_RULE_PANEL.md](../FE_REPUSH_RULE_PANEL.md) 与 [MULTI_END_CLOSURE_API.md](../MULTI_END_CLOSURE_API.md)。
