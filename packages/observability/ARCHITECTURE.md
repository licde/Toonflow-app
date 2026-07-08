# 架构总览

`@toonflow/observability` 是 Toonflow 独立可观测性子架构，零业务依赖，通过宿主 `src/observability/bootstrap.ts` 注入 DB 与路径。

五层：采集 → 处理（redact/fingerprint/sampler）→ 存储（JSONL/SQLite）→ 分析（Playbook/Recommender）→ 暴露（API/UI/ingest）。

详见 `docs/architecture/overview.md` 与根计划 v8 第二十三章。
