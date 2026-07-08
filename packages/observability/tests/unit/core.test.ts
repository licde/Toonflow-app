import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeFingerprint } from "../../src/core/fingerprint";
import { diagnosePlaybook } from "../../src/analyze/playbooks";
import { SwitchManager } from "../../src/core/switchManager";

describe("fingerprint", () => {
  it("stable for same vendor error", () => {
    const a = computeFingerprint("openai", "auth", "Invalid API key");
    const b = computeFingerprint("openai", "auth", "Invalid API key");
    assert.equal(a, b);
  });
});

describe("playbooks", () => {
  it("rate_limit playbook", () => {
    const r = diagnosePlaybook({ errorCategory: "rate_limit" });
    assert.equal(r.playbookId, "pb_rate_limit");
  });
});

describe("switchManager", () => {
  it("applies secure profile", () => {
    const sm = new SwitchManager({
      enabled: true,
      level: "info",
      transports: { stdout: true, file: true, sqlite: true },
      categories: {},
      modules: {},
      vendors: {},
      features: {
        trace: true,
        sampler: true,
        redact: true,
        promptDebug: false,
        recommend: true,
        fingerprint: true,
        playbook: true,
      },
      retentionDays: 30,
    });
    sm.setProfile("secure");
    assert.equal(sm.get().level, "warn");
  });
});
