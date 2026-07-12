---
name: appendix_C_audits
description: 附录 C · ruleAudit / smartDetection / modalityAudit
rulePackVersion: "2.0.1"
---

# 附录 C · 审计字段

## ruleAudit

```json
{
  "ruleAudit": {
    "rulePackVersion": "2.0.1",
    "stages": {
      "W3": { "passed": true, "blockCount": 0, "checkedRuleIds": ["R2","W12"], "warnings": [] }
    }
  }
}
```

## smartDetection

见 `stages/smart_detection.md`。

## modalityAudit（T3）

```json
{
  "modalityAudit": {
    "perShot": [{ "shotIndex": 1, "IMG": "PASS", "VID": "PASS", "AUD": "PASS", "FX": "WARN" }]
  }
}
```

## modalityPromptAudit

对照 `modality_prompt_slots.json` 逐 slot 检测。
