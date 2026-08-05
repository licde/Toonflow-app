/** Agnes vendor gates preflight — motion whitelist + duration + singleImage refs */
import { readFixtureJson } from "../utils/fixturesPath";
import {
  loadCameraMotionWhitelist,
  promptHasForbiddenMotion,
  promptMotionWhitelistViolation,
} from "../qualityGate/cameraWhitelist";

export interface VendorGateResult {
  id: string;
  passed: boolean;
  severity: "BLOCK" | "WARN";
  message: string;
  rePushTarget?: string;
}

interface AgnesVendorGates {
  gates?: { id: string; rule: string; severity: "BLOCK" | "WARN"; rePushTarget?: string }[];
  motionWhitelist?: string[];
  motionForbidden?: string[];
}

export function preflightVendorGates(input: {
  mode?: string;
  prompt?: string;
  duration?: number;
  hasReferenceImage?: boolean;
}): VendorGateResult[] {
  const cfg = readFixtureJson<AgnesVendorGates>("agnes_vendor_gates.json", {});
  const wl = loadCameraMotionWhitelist();
  const results: VendorGateResult[] = [];
  const prompt = input.prompt ?? "";

  if (input.mode === "singleImage" && !input.hasReferenceImage) {
    results.push({
      id: "AG-GATE-01",
      passed: false,
      severity: "BLOCK",
      message: "singleImage 须 referenceImage 或分镜图",
      rePushTarget: "MD",
    });
  } else {
    results.push({ id: "AG-GATE-01", passed: true, severity: "BLOCK", message: "AG-GATE-01 OK" });
  }

  const forbiddenHit =
    promptHasForbiddenMotion(prompt, wl) ??
    (cfg.motionForbidden ?? []).find((m) => prompt.toLowerCase().includes(m.toLowerCase()));
  const whitelistHit = promptMotionWhitelistViolation(prompt, wl);
  if (forbiddenHit || whitelistHit) {
    results.push({
      id: "AG-GATE-02",
      passed: false,
      severity: "BLOCK",
      message: `motion 禁止或不在白名单: ${forbiddenHit ?? whitelistHit}`,
      rePushTarget: "EN",
    });
  } else {
    results.push({ id: "AG-GATE-02", passed: true, severity: "BLOCK", message: "AG-GATE-02 OK" });
  }

  const duration = input.duration ?? 0;
  if (duration > 0 && (duration < 1 || duration > 30)) {
    results.push({
      id: "AG-GATE-03",
      passed: false,
      severity: "BLOCK",
      message: `duration ${duration}s 超出 1-30s`,
      rePushTarget: "SB",
    });
  } else {
    results.push({ id: "AG-GATE-03", passed: true, severity: "BLOCK", message: "AG-GATE-03 OK" });
  }

  if (/@图\d|negative\s*:/i.test(prompt)) {
    // 图N-first: multi-ref @图N is legal; only flag bare negative: channel as WARN
    if (/negative\s*:/i.test(prompt)) {
      results.push({
        id: "AG-GATE-04",
        passed: false,
        severity: "WARN",
        message: "提示词含 negative: 通道，生成前应剥离；@图N 在多参模式合法保留",
        rePushTarget: "MD",
      });
    } else {
      results.push({
        id: "AG-GATE-04",
        passed: true,
        severity: "WARN",
        message: "AG-GATE-04 OK（@图N 多参合法）",
      });
    }
  } else {
    results.push({ id: "AG-GATE-04", passed: true, severity: "WARN", message: "AG-GATE-04 OK" });
  }

  return results;
}

export function vendorGatesBlocked(results: VendorGateResult[]): boolean {
  return results.some((r) => !r.passed && r.severity === "BLOCK");
}
