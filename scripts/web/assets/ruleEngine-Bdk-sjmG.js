import { i as instance } from './axios-PPMfXuH1.js';

async function validateEpisode(body) {
  const { data } = await instance.post("/ruleEngine/validate", body);
  return data.data;
}
async function preflightTouch(body) {
  const { data } = await instance.post("/ruleEngine/preflightTouch", body);
  return data.data;
}

export { preflightTouch as p, validateEpisode as v };
