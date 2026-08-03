import { i as instance } from './axios-DoLZCC01.js';
import './index-Dj17DntQ.js';
import './markdown-CDQfeHxT.js';
import './vue-vendor-Byo5TD6r.js';
import './dayjs-CuToSpIM.js';
import './tdesign-CfL1pweZ.js';
import './i18n-C05S5xzz.js';

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
async function getEpisodePackage(projectId, scriptId) {
  return postData("/ruleEngine/getEpisodePackage", { projectId, scriptId });
}
async function syncEpisodePackage(body) {
  return postData("/ruleEngine/saveEpisodePackage", body);
}
async function saveEpisodePackageRaw(body) {
  return postData("/ruleEngine/saveEpisodePackage", body);
}
async function getRuleReport(projectId, scriptId, script) {
  return postData("/ruleEngine/getReport", {
    projectId,
    scriptId,
    script
  });
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
async function inspectBundle(body) {
  return postData("/ruleEngine/inspectBundle", body);
}
async function exportGate(body) {
  return postData("/ruleEngine/exportGate", body);
}
async function selfHeal(body) {
  return postData("/ruleEngine/selfHeal", body);
}
async function precheckLoop(body) {
  return postData("/ruleEngine/precheckLoop", body);
}
async function importHeal(body) {
  return postData("/ruleEngine/importHeal", body);
}

export { compileDryRun, dryRunImport, enterProduction, exportGate, getAdaptationSteps, getEpisodePackage, getRuleReport, importHeal, importScriptBundle, inspectBundle, precheckLoop, preflightProduction, preflightTouch, saveEpisodePackageRaw, selfHeal, syncEpisodePackage, validateEpisode };
