---
name: appendix_H_visual_lock
description: 附录 H · 图锚点 visualLockTable
rulePackVersion: "2.0.1"
---

# 附录 H · 图锚点三层

T2 BP 产出 `visualLockTable`，EN/MD 编译时保护锚点 token。

## 三层

| 层 | 内容 | 字段 |
|----|------|------|
| L0 身份 | gender/age/服色 | characterAssets.L0 |
| L1 构图 | 景别偏好/站位 | BP.spatialDefaults |
| L2 风格 | prefix/suffix | art_skills prefix |

## cref / sref

- `--cref CHAR-CODE` 绑定角色
- `--sref SCENE-CODE` 绑定场景
- H5-4：polish 后 hash 锚点段，漂移则回退 compiled

## visualLockTable schema

```json
{
  "visualLockTable": {
    "characters": [{ "code": "CHAR-X", "cref": "...", "lockTokens": ["black hair"] }],
    "scenes": [{ "code": "SCENE-Y", "colorTemp": 4500 }],
    "anchorProps": [{ "code": "PROP-Z", "state": "closed" }]
  }
}
```

import → o_projectBlueprint（合流 P1）。
