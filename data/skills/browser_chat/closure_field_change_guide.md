# DeepSeek 闭环收口说明（改字段只动这些）

> 闭环文档包 → [`docs/closure-selfheal/`](../../../docs/closure-selfheal/)

1. **正推字段**：`data/fixtures/design_field_registry.json` 加行 → `contentFieldCompiler` compile → 金样 must  
2. **导入保真**：`normalizePreDesignPack` / `hydratePackageFromPreDesign`（勿把富字段只写 markdown）  
3. **厂商可控参数**：`shotVendorBridge.ts` capability 白名单；无槽位标 `bridging:text_only`  
4. **无图禁假绿**：`identityAssetGate.ts`；对照台 `getShotSpecDiff` + FE `ShotSpecDrawer`  
5. **勿新增**第三个 inject 函数  
