import { i as instance } from './axios-CST2I6_d.js';

async function validateEpisode(body) {
  const { data } = await instance.post("/ruleEngine/validate", body);
  return data.data;
}
async function compileDryRun(body) {
  const { data } = await instance.post("/ruleEngine/compileDryRun", body);
  return data.data;
}
async function preflightTouch(body) {
  const { data } = await instance.post("/ruleEngine/preflightTouch", body);
  return data.data;
}
async function syncEpisodePackage(body) {
  const { data } = await instance.post("/ruleEngine/saveEpisodePackage", body);
  return data.data;
}
async function saveEpisodePackageRaw(body) {
  const { data } = await instance.post("/ruleEngine/saveEpisodePackage", body);
  return data.data;
}
async function importScriptBundle(body) {
  const { data } = await instance.post("/ruleEngine/importScript", body);
  return data.data;
}
async function dryRunImport(body) {
  const { data } = await instance.post("/ruleEngine/dryRunImport", body);
  return data.data;
}
async function getAdaptationSteps(projectId) {
  const { data } = await instance.post("/scriptAgent/getAdaptationSteps", { projectId });
  return data.data;
}
async function enterProduction(body) {
  const { data } = await instance.post("/scriptAgent/enterProduction", body);
  return data.data;
}
async function preflightProduction(body) {
  const { data } = await instance.post("/ruleEngine/preflightProduction", body);
  return data.data;
}

export { syncEpisodePackage as a, preflightTouch as b, compileDryRun as c, dryRunImport as d, enterProduction as e, getAdaptationSteps as g, importScriptBundle as i, preflightProduction as p, saveEpisodePackageRaw as s, validateEpisode as v };
