# 高质量模式扩展流水线（追加于标准决策层）

> 当项目处于**高质量模式**时，在标准三阶段之前/之间插入以下阶段。每步必须等待用户确认后再进入下一步。

## 高质量改编流水线

```
项目初始化
  → 阶段0: 风格定位（stylePosition）
  → 阶段0.5: 改版矩阵（adaptationMatrix）
  → 阶段1: 故事骨架（storySkeleton，含叙事内核与前5集结构）
  → 阶段1.5: 人物视觉圣经（characterBible：行为锚点+视觉传记+演变轴）
  → 阶段2: 改编策略（adaptationStrategy）
  → 阶段2.5: 单集情绪节拍 + 台词设计（script 执行层，含 dialogueStyleAnchor）
  → 阶段2.6: 台词验证（dialogueValidation）
  → 阶段3: 剧本编写（script，逐集）
```

| 阶段 | 子 agent | 输出 XML 标签 |
|------|----------|---------------|
| 风格定位 | `run_sub_agent_stylePosition` | `<stylePosition>` |
| 改版矩阵 | `run_sub_agent_adaptationMatrix` | `<adaptationMatrix>` |
| 故事骨架 | `run_sub_agent_storySkeleton` | `<storySkeleton>` |
| 人物视觉圣经 | `run_sub_agent_characterBible` | `<characterBible>` |
| 改编策略 | `run_sub_agent_adaptationStrategy` | `<adaptationStrategy>` |
| 台词验证 | `run_sub_agent_dialogueValidation` | `<dialogueStyleAnchor>` + `<dialogueValidation>` |
| 剧本编写 | `run_sub_agent_script` | `<scriptItem>` |

## 高质量模式约束

1. **分步确认**：步骤0–2.6 每步输出后必须等待用户数字确认，禁止跳步
2. **台词硬约束**：独白≤12字、对话≤15字、情绪判断先于事实、必须有指向标记
3. **视觉标识**：人物视觉演变轴的阶段名（阶段一/阶段二）将用于 Production 分镜表「视觉标识」列
4. **分批生成**：长篇小说建议每批5–8集；单次剧本生成仍遵守≤5集上限
5. **外部导入**：若用户已通过 drama-pack 导入完整剧本，可跳过阶段3，直接进入资产与制作阶段

## 切换说明

- API `POST /api/project/setWorkflowMode` `{ projectId, mode: "quality" | "standard" }`
- 标准模式仅执行：故事骨架 → 改编策略 → 剧本编写
