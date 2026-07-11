import type { Knex } from "knex";
import type { EpisodePackage } from "../types";
import { getRulePackVersion } from "../ruleRegistry";

export async function loadEpisodePackage(db: Knex, projectId: number, scriptId: number): Promise<EpisodePackage | null> {
  const row = await db("o_episodePackage").where({ projectId, scriptId }).first();
  if (!row?.package) return null;
  try {
    return JSON.parse(row.package as string) as EpisodePackage;
  } catch {
    return null;
  }
}

export async function saveEpisodePackage(db: Knex, pkg: EpisodePackage): Promise<void> {
  pkg.updatedAt = Date.now();
  pkg.rulePackVersion = getRulePackVersion();
  const existing = await db("o_episodePackage").where({ projectId: pkg.projectId, scriptId: pkg.scriptId }).first();
  const data = { projectId: pkg.projectId, scriptId: pkg.scriptId, package: JSON.stringify(pkg), version: pkg.version, updateTime: pkg.updatedAt };
  if (existing) {
    await db("o_episodePackage").where({ projectId: pkg.projectId, scriptId: pkg.scriptId }).update(data);
  } else {
    const maxRow = await db("o_episodePackage").max("id as maxId").first();
    const nextId = ((maxRow as { maxId?: number })?.maxId ?? 0) + 1;
    await db("o_episodePackage").insert({ id: nextId, ...data, createTime: pkg.updatedAt });
  }
}

export async function loadProjectBlueprint(db: Knex, projectId: number): Promise<Record<string, unknown> | null> {
  const row = await db("o_projectBlueprint").where({ projectId }).first();
  if (!row?.blueprint) return null;
  try {
    return JSON.parse(row.blueprint as string);
  } catch {
    return null;
  }
}

export async function saveProjectBlueprint(db: Knex, projectId: number, blueprint: Record<string, unknown>): Promise<void> {
  const now = Date.now();
  const existing = await db("o_projectBlueprint").where({ projectId }).first();
  const data = { projectId, blueprint: JSON.stringify(blueprint), updateTime: now };
  if (existing) await db("o_projectBlueprint").where({ projectId }).update(data);
  else {
    const maxRow = await db("o_projectBlueprint").max("id as maxId").first();
    const nextId = ((maxRow as { maxId?: number })?.maxId ?? 0) + 1;
    await db("o_projectBlueprint").insert({ id: nextId, ...data, createTime: now });
  }
}
