---
name: appendix_E_rule_application
description: 附录 E · 规则应用五维追溯
rulePackVersion: "2.0.1"
---

# 附录 E · 规则应用矩阵

由 `yarn audit:rule-application` 生成 `data/fixtures/rule_application_matrix.json`。

## 五维

| 维 | 含义 |
|----|------|
| spec | 规范是否挂载 |
| link | 联动链是否追溯 |
| sd | 是否 SD 检测 |
| sf | 是否 SF 可修 |
| trace | ruleAudit 是否记录 |

## ruleApplicationReport（T3 可选）

```json
{
  "ruleApplicationReport": {
    "coverage": 0.85,
    "uncheckedBlockRules": ["V7"],
    "stageSummary": { "W3": { "checked": 12, "passed": 12 } }
  }
}
```

ScriptBundle 出口可附摘要；import 写入 episode meta 日志。
