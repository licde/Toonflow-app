# Toonflow-web RulePanel 集成包

从 Toonflow-app 复制到 **Toonflow-web** 仓库使用。

## 文件清单

| 文件 | 用途 |
|------|------|
| `types/closure.ts` | API 响应 TypeScript 类型 |
| `api/inspectBundle.ts` | HTTP 客户端 |
| `components/RulePanel.vue` | 闭环展示组件 |

## 集成步骤

1. 复制上述三个文件到 Toonflow-web 对应目录（如 `src/views/production/`）。
2. 在 import / dryRun 成功后挂载 RulePanel：

```vue
<script setup lang="ts">
import { ref } from "vue";
import RulePanel from "@/components/RulePanel.vue";
import { dryRunImport } from "@/api/inspectBundle";
import type { InspectBundleResult } from "@/types/closure";

const closure = ref<InspectBundleResult | null>(null);

async function onDryRun(bundle: object) {
  const res = await dryRunImport(bundle, { projectId: 1, validateOnly: true });
  closure.value = res.preImport ?? res;
}
</script>

<template>
  <RulePanel
    :result="closure"
    @copy-chat="(t) => navigator.clipboard.writeText(t)"
    @re-push="(p) => router.push({ query: { stage: p.reverseTarget } })"
  />
</template>
```

3. 确保后端已部署 `POST /api/ruleEngine/inspectBundle`（Toonflow-app v2.0.1+）。

## 字段契约

见 [FE_REPUSH_RULE_PANEL.md](../FE_REPUSH_RULE_PANEL.md) 与 [MULTI_END_CLOSURE_API.md](../MULTI_END_CLOSURE_API.md)。
