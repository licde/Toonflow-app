/**
 * CI gate: FE must live under data/web only.
 * Optionally invokable to run sibling Toonflow-web yarn build:integrate when TF_WEB_ROOT is set.
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const root = process.cwd();
const webIndex = path.join(root, "data", "web", "index.html");
const appTs = path.join(root, "src", "app.ts");
const mainTs = path.join(root, "scripts", "main.ts");

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  } else {
    console.log("OK:", msg);
  }
}

assert(fs.existsSync(webIndex), "data/web/index.html exists");
const appSrc = fs.readFileSync(appTs, "utf8");
assert(!/webFallback|web_new/.test(appSrc) || /禁止静默回退 web_new/.test(appSrc), "app.ts does not silent-fallback web_new");
assert(!appSrc.includes('u.getPath("web_new")'), "app.ts does not resolve web_new");
const mainSrc = fs.readFileSync(mainTs, "utf8");
assert(mainSrc.includes(path.join("data", "web").replace(/\\/g, "\\\\")) || mainSrc.includes("data\", \"web\"") || mainSrc.includes("data/web"), "electron main serves data/web");

const scriptsWeb = path.join(root, "scripts", "web");
if (fs.existsSync(scriptsWeb)) {
  console.warn("WARN: scripts/web still present — treat as retired fork; do not serve it");
}

const tfWeb = process.env.TF_WEB_ROOT || path.join(root, "..", "..", "Toonflow-web");
const alt = path.join(root, "..", "..", "Toonflow-web".replace(/new\//, ""));
const webRoot = fs.existsSync(path.join(process.env.TF_WEB_ROOT || "I:/toonflow/Toonflow-web", "package.json"))
  ? process.env.TF_WEB_ROOT || "I:/toonflow/Toonflow-web"
  : null;

if (process.env.RUN_WEB_INTEGRATE === "1" && webRoot) {
  const r = spawnSync("yarn", ["build:integrate"], { cwd: webRoot, shell: true, stdio: "inherit" });
  assert(r.status === 0, "Toonflow-web yarn build:integrate");
} else {
  console.log("SKIP: set RUN_WEB_INTEGRATE=1 to build FE into data/web");
}

if (failed) process.exit(1);
console.log("=== build:integrate gate OK ===");
