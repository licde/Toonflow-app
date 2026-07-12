---
name: production_identity_audit
description: identityAudit 跨模态 IMG/VID/AUD 一致性 BLOCK
stageId: PI
outputTag: identityAudit
rulePackVersion: "2.0.1"
---

# 制作身份审计（identityAudit）

解决「设计男/图视音女」等多端不一致。跨 IMG/VID/AUD 三模态 BLOCK 校验，失败触发 rePush EN/BP。

## 触发时机

- T2 EN compile 完成后
- T3 MD prompt 生成前
- GenerationFeedback 报告角色漂移

## 审计维度

| 模态 | 检查字段 | 对照源 |
|------|----------|--------|
| IMG | refs.CHAR-CODE, L0-L6 外貌 | visualLockTable |
| VID | subject 描述, 性别/发型/服装 | BP + G1 |
| AUD | voice.speed, timbre, gender | BP voiceLock |
| 跨模态 | 同一角色三模态 gender/age/发型 | identityMatrix |

## identityAudit 结构

```json
{
  "identityAudit": {
    "rulePackVersion": "2.0.1",
    "episodeKey": "ep-01",
    "characters": [
      {
        "charCode": "CHAR-001",
        "name": "女主",
        "modalities": {
          "IMG": { "gender": "女", "hair": "黑长直", "pass": true },
          "VID": { "gender": "女", "hair": "黑长直", "pass": true },
          "AUD": { "gender": "女", "timbre": "清冷", "pass": false }
        },
        "overallPass": false,
        "driftDetail": "AUD timbre 与 G1 voiceStyle 不符"
      }
    ],
    "blockGenerate": true,
    "rePushTarget": "BP"
  }
}
```

## 执行步骤

1. 从 visualLockTable 读取 L0 identity + voice
2. 逐角色提取 IMG/VID/AUD 描述
3. 比对 gender/age/发型/服装/音色五元组
4. 标记 driftDetail + overallPass
5. 任一角色 fail → blockGenerate=true

## BLOCK 闸门

- 所有主角 + 当集出场角色 overallPass=true
- CHAR-CODE 三模态均有记录
- fail 时须附 rePushTarget（BP 或 EN）

## 修复路由

| 漂移类型 | rePush |
|----------|--------|
| 外貌 | BP → CD L0-L6 |
| 视频主体 | EN subject 重 compile |
| 音色 | BP voiceLock → AUD |
