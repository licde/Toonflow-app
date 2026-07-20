/**
 * Picker URL contract — TouchKernel resolveMediaUrl matches FE id:sources keying.
 * yarn test:picker-url
 */
import fs from "fs";
import path from "path";
import { resolveMediaUrl, resolveMediaUrls } from "@/ruleEngine/kernels/touchKernel";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function main() {
  console.log("# picker-url tests\n");

  // Same keying as imageListCache makeUrlKey
  const urlMap = {
    "101:storyboard": "https://oss.example/sb/101.jpg?size=20",
    "55:assets": "https://oss.example/asset/55.png",
  };
  ok(
    "storyboard picker uses urlMap",
    resolveMediaUrl({ id: 101, sources: "storyboard", fallbackPath: "/relative/stale" }, urlMap).startsWith("https://"),
  );
  ok(
    "fallback when map miss",
    resolveMediaUrl({ id: 9, sources: "storyboard", fallbackPath: "/oss/only" }, urlMap) === "/oss/only",
  );
  ok("empty when no map no fallback", resolveMediaUrl({ id: 9, sources: "storyboard" }, urlMap) === "");

  const batch = resolveMediaUrls(
    [
      { id: 101, sources: "storyboard", fallbackPath: "" },
      { id: 55, sources: "assets", fallbackPath: "" },
    ],
    urlMap,
  );
  ok("batch storyboard+assets", Boolean(batch["101:storyboard"] && batch["55:assets"]));

  // FE must wire resolveUrls for storyboardList (string contract after integrate)
  const assetsDir = path.join(process.cwd(), "data", "web", "assets");
  let fe = "";
  if (fs.existsSync(assetsDir)) {
    for (const name of fs.readdirSync(assetsDir)) {
      if (!name.endsWith(".js") || name.includes("worker")) continue;
      const p = path.join(assetsDir, name);
      if (fs.statSync(p).size > 5_000_000) continue;
      fe += fs.readFileSync(p, "utf-8");
    }
  }
  ok("FE bundle has resolveUrls", /resolveUrls/.test(fe));
  ok("FE mentions storyboard with resolve", /storyboard/.test(fe) && /resolveUrl/.test(fe));

  if (failed) {
    console.error(`\n${failed} picker-url check(s) failed`);
    process.exit(1);
  }
  console.log("\n=== test:picker-url OK ===");
}

main();
