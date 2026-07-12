import fs from "fs";
import path from "path";

/** Unified fixture root for portable-kit (set FIXTURES_ROOT env). */
export function getFixturesRoot(): string {
  const env = process.env.FIXTURES_ROOT;
  if (env && fs.existsSync(env)) return path.resolve(env);
  return path.join(process.cwd(), "data", "fixtures");
}

export function fixturePath(name: string): string {
  return path.join(getFixturesRoot(), name);
}

export function readFixtureJson<T = unknown>(name: string, fallback: T): T {
  const p = fixturePath(name);
  if (!fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
}
