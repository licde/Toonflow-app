# Adapter Guide (HostHooks)

For scenarios C/D when integrating outside Toonflow.

## Minimal HostHooks

```typescript
import { inspectBundle, type HostHooks } from "@/ruleEngine/portable";

const hooks: HostHooks = {
  saveShots: async (shots) => { /* persist storyboard panels */ },
  onGenerationError: async (error) => {
    const r = inspectBundle({}, { genError: error });
    return { rePushPlan: r.rePushPlan };
  },
};

const result = inspectBundle(bundleJson, { tier: "T2", hooks });
```

## Toonflow wrapper

```typescript
import { createToonflowHostHooks } from "@/ruleEngine/portable/ToonflowHostHooks";
const host = createToonflowHostHooks(knexDb);
await host.dryRunImport(bundle, { projectId: 1, validateOnly: true });
```

Only implement hooks you need. Headless dryRun (scenario A/B) requires zero hooks.
