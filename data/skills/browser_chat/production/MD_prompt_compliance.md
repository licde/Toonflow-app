---
name: MD_prompt_compliance
description: modalityPromptAudit prompt 合规审计
stageId: MD-C
outputTag: modalityPromptAudit
rulePackVersion: "2.0.1"
---

# MD Prompt 合规审计（modalityPromptAudit）

T3 出口闸门：检查四模态 prompt 完整性、合规性与锚点一致性。对应用户话术「prompt 不齐/不合规」（QP-modality）。

**Slot SSOT**：必填槽位定义以 `data/fixtures/modality_prompt_slots.json` 为准；本技能与 `corridor_EN` / `promptIR` 须与其一致。

## 审计维度

| 维度 | 检查 | ruleId |
|------|------|--------|
| 完整性 | 每模态必填槽位非空 | M1 |
| 锚点 | CHAR/SCENE/PROP-CODE 在 prompt 中可解析 | V4-V6 |
| 合规 | 无违禁词、无 vendor 密钥 | M2 |
| 一致 | IMG/VID 同一角色描述一致 | identityAudit |
| 表达式 | emotionIntensity≤5 用微表情词表 | QF-EXPR-01 |
| 长度 | 各 vendor 上限内 | M3 |

## modalityPromptAudit 结构

```json
{
  "modalityPromptAudit": {
    "rulePackVersion": "2.0.1",
    "items": [
      {
        "shotId": "shot-2",
        "modality": "VID",
        "ruleId": "QF-EXPR-01",
        "severity": "BLOCK",
        "issue": "emotionIntensity=4 却使用「怒吼」",
        "fix": "改为「眉头紧蹙、唇线绷紧」"
      }
    ],
    "passRate": 92,
    "blockGenerate": false
  }
}
```

## 执行步骤

1. 读取 MD 四模态 prompt 全文
2. 逐镜逐模态跑合规规则
3. BLOCK 项写入 items
4. 计算 passRate = 通过项 / 总项
5. passRate < 90 → blockGenerate = true

## QF-EXPR-01 细则

- emotionIntensity ≤5：仅微表情词表（蹙眉/抿唇/目光闪躲）
- 6–7：生理反应词（泪/颤/汗），禁「怒吼/狰狞/扭曲」
- ≥8：允许强烈表演词，须与 GB 情绪一致

## BLOCK 闸门

- blockGenerate = false
- passRate ≥ 90%
- 无未修复 BLOCK 项
- identityAudit 交叉通过

## 修复路由

| 问题 | 反推 |
|------|------|
| 锚点缺失 | BP → EN 重 compile |
| 表情过激 | EN performance 重映射 |
| 模态缺失 | MD_modality_overview 补槽 |

## 合流

importBundle → validate（INT 权威）→ Touch L0 → 生成。
