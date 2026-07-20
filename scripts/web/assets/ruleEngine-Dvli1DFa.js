import { i as instance } from './axios-mQi6SvTz.js';

async function postData(url, body) {
  const envelope = await instance.post(url, body);
  return envelope.data;
}
async function validateEpisode(body) {
  return postData("/ruleEngine/validate", body);
}
async function compileDryRun(body) {
  return postData("/ruleEngine/compileDryRun", body);
}
async function preflightTouch(body) {
  return postData("/ruleEngine/preflightTouch", body);
}
async function syncEpisodePackage(body) {
  return postData("/ruleEngine/saveEpisodePackage", body);
}
async function saveEpisodePackageRaw(body) {
  return postData("/ruleEngine/saveEpisodePackage", body);
}
async function importScriptBundle(body) {
  return postData("/ruleEngine/importScript", body);
}
async function dryRunImport(body) {
  return postData("/ruleEngine/dryRunImport", body);
}
async function getAdaptationSteps(projectId) {
  return postData("/scriptAgent/getAdaptationSteps", { projectId });
}
async function enterProduction(body) {
  return postData("/scriptAgent/enterProduction", body);
}
async function preflightProduction(body) {
  return postData("/ruleEngine/preflightProduction", body);
}
async function selfHeal(body) {
  return postData("/ruleEngine/selfHeal", body);
}
async function importHeal(body) {
  return postData("/ruleEngine/importHeal", body);
}

export { syncEpisodePackage as a, importScriptBundle as b, compileDryRun as c, dryRunImport as d, enterProduction as e, selfHeal as f, getAdaptationSteps as g, preflightTouch as h, importHeal as i, preflightProduction as p, saveEpisodePackageRaw as s, validateEpisode as v };
