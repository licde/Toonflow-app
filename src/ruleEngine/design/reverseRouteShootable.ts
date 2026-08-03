/**
 * Reverse-route shootable semantics — map legacy forbidRegenWithoutDescFix
 * to requireFixBeforeBurn (never blocks generate / first try).
 */
import { readFixtureJson } from "../utils/fixturesPath";

export type ReverseRouteShootableFlags = {
  trigger: string;
  /** Legacy JSON flag — means burn/HQ must align design first */
  forbidRegenWithoutDescFix?: boolean;
  /** Canonical: block burn until design fix; generate stays allowed */
  requireFixBeforeBurn: boolean;
  /** Generate always allowed unless truly unshootable */
  blocksGenerate: false;
};

type RouteRow = {
  trigger?: string;
  forbidRegenWithoutDescFix?: boolean;
  requireFixBeforeBurn?: boolean;
};

let cache: RouteRow[] | null = null;

function loadRows(): RouteRow[] {
  if (cache) return cache;
  cache =
    readFixtureJson<{ routes?: RouteRow[] }>("reverse_route_table.json", { routes: [] }).routes ?? [];
  return cache;
}

/** Resolve shootable flags for a reverse trigger. */
export function resolveReverseRouteShootable(trigger: string): ReverseRouteShootableFlags {
  const t = String(trigger ?? "").trim();
  const row = loadRows().find((r) => String(r.trigger ?? "") === t);
  const legacy = Boolean(row?.forbidRegenWithoutDescFix);
  const requireFix =
    row?.requireFixBeforeBurn === true || legacy;
  return {
    trigger: t || "unknown",
    forbidRegenWithoutDescFix: legacy,
    requireFixBeforeBurn: requireFix,
    blocksGenerate: false,
  };
}

/** True when burn/HQ must wait for design alignment — never use to gray Generate. */
export function routeRequiresFixBeforeBurn(trigger: string): boolean {
  return resolveReverseRouteShootable(trigger).requireFixBeforeBurn;
}
