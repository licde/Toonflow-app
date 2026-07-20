import { i as instance } from './axios-CST2I6_d.js';
import { bD as defineStore, r as ref } from './vue-vendor-Byo5TD6r.js';

function makeUrlKey(id, sources) {
  return `${id ?? ""}:${sources ?? ""}`;
}
function extractPath(url) {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  try {
    const u = new URL(url);
    return u.pathname + u.search + u.hash;
  } catch {
    return url;
  }
}
function toCachedItems(items) {
  return items.map((item) => ({
    ...JSON.parse(JSON.stringify(item)),
    src: extractPath(item.src)
  }));
}
const imageListCacheStore = defineStore(
  "imageListCache",
  () => {
    const cacheData = ref({});
    const urlMap = ref({});
    async function resolveUrls(items) {
      if (!items.length) return {};
      const needResolve = items.filter((item) => {
        if (item.id == null) return false;
        makeUrlKey(item.id, item.sources);
        return true;
      });
      if (needResolve.length) {
        try {
          const { data } = await instance.post("/production/workbench/getFileUrl", {
            items: needResolve.map((item) => ({ id: item.id, sources: item.sources }))
          });
          const rawData = data.data;
          const resolved = {};
          if (Array.isArray(rawData)) {
            rawData.forEach((item) => {
              if (item.id != null && item.url) {
                const key = makeUrlKey(item.id, item.sources);
                resolved[key] = item.url;
              }
            });
          } else if (rawData && typeof rawData === "object" && !Array.isArray(rawData)) {
            Object.entries(rawData).forEach(([key, url]) => {
              resolved[key] = url;
            });
          }
          urlMap.value = { ...urlMap.value, ...resolved };
        } catch (e) {
          console.warn("[imageListCache] resolveUrls 请求失败，降级使用路径", e);
        }
      }
      const result = {};
      items.forEach((item) => {
        const key = makeUrlKey(item.id, item.sources);
        result[key] = urlMap.value[key] || item.id?.toString() || "";
      });
      return result;
    }
    function resolveUrlSync(id, sources, fallbackPath) {
      if (id != null) {
        const key = makeUrlKey(id, sources);
        if (urlMap.value[key]) return urlMap.value[key];
      }
      return fallbackPath || "";
    }
    function toFullItems(items) {
      return items.map((item) => ({
        ...item,
        src: resolveUrlSync(item.id, item.sources, item.src)
      }));
    }
    function getCache(projectId, scriptId, trackId) {
      const cached = cacheData.value[projectId]?.[scriptId]?.[trackId];
      if (!cached) return void 0;
      return toFullItems(cached);
    }
    async function getCacheWithResolve(projectId, scriptId, trackId) {
      const cached = cacheData.value[projectId]?.[scriptId]?.[trackId];
      if (!cached) return void 0;
      const resolveItems = cached.filter((item) => item.id != null).map((item) => ({ id: item.id, sources: item.sources }));
      await resolveUrls(resolveItems);
      return toFullItems(cached);
    }
    function getRawCache(projectId, scriptId, trackId) {
      return cacheData.value[projectId]?.[scriptId]?.[trackId];
    }
    function setCache(projectId, scriptId, trackId, imageList) {
      if (!cacheData.value[projectId]) {
        cacheData.value[projectId] = {};
      }
      if (!cacheData.value[projectId][scriptId]) {
        cacheData.value[projectId][scriptId] = {};
      }
      let urlMapDirty = false;
      imageList.forEach((item) => {
        if (!item.src || item.id == null) return;
        const key = makeUrlKey(item.id, item.sources);
        if (!urlMap.value[key]) {
          urlMap.value[key] = item.src;
          urlMapDirty = true;
        }
      });
      if (urlMapDirty) {
        urlMap.value = { ...urlMap.value };
      }
      cacheData.value[projectId][scriptId][trackId] = toCachedItems(imageList);
    }
    function removeCache(projectId, scriptId, trackId) {
      if (cacheData.value[projectId]?.[scriptId]) {
        delete cacheData.value[projectId][scriptId][trackId];
      }
    }
    function removeImageById(projectId, scriptId, imageId) {
      const scriptCache = cacheData.value[projectId]?.[scriptId];
      if (!scriptCache) return;
      Object.keys(scriptCache).forEach((trackId) => {
        scriptCache[trackId] = scriptCache[trackId].filter((item) => item.id !== imageId);
      });
    }
    function clearScriptCache(projectId, scriptId) {
      if (cacheData.value[projectId]) {
        delete cacheData.value[projectId][scriptId];
      }
    }
    function clearProjectCache(projectId) {
      if (cacheData.value && cacheData.value?.[projectId]) {
        delete cacheData.value[projectId];
      }
    }
    function initCacheFromTrackList(projectId, scriptId, trackList) {
      trackList.forEach((track) => {
        if (track.id == null) return;
        if (cacheData.value[projectId]?.[scriptId]?.[track.id]) return;
        if (!cacheData.value[projectId]) cacheData.value[projectId] = {};
        if (!cacheData.value[projectId][scriptId]) cacheData.value[projectId][scriptId] = {};
        cacheData.value[projectId][scriptId][track.id] = toCachedItems(track.medias);
      });
    }
    function forceInitCacheFromTrackList(projectId, scriptId, trackList) {
      if (cacheData.value[projectId]) {
        delete cacheData.value[projectId][scriptId];
      }
      if (!cacheData.value[projectId]) cacheData.value[projectId] = {};
      cacheData.value[projectId][scriptId] = {};
      trackList.forEach((track) => {
        if (track.id == null) return;
        cacheData.value[projectId][scriptId][track.id] = toCachedItems(track.medias);
      });
    }
    async function warmUpUrls(projectId, scriptId) {
      const scriptCache = cacheData.value[projectId]?.[scriptId];
      if (!scriptCache) return;
      const allItems = [];
      const seen = /* @__PURE__ */ new Set();
      Object.values(scriptCache).forEach((items) => {
        items.forEach((item) => {
          if (item.id == null) return;
          const key = makeUrlKey(item.id, item.sources);
          if (!seen.has(key)) {
            seen.add(key);
            allItems.push({ id: item.id, sources: item.sources });
          }
        });
      });
      await resolveUrls(allItems);
    }
    function clearUrlMap() {
      urlMap.value = {};
    }
    return {
      cacheData,
      urlMap,
      getCache,
      getCacheWithResolve,
      getRawCache,
      setCache,
      removeCache,
      removeImageById,
      clearScriptCache,
      initCacheFromTrackList,
      forceInitCacheFromTrackList,
      resolveUrls,
      resolveUrlSync,
      warmUpUrls,
      clearUrlMap,
      clearProjectCache
    };
  },
  { persist: { pick: ["cacheData"] } }
);

export { imageListCacheStore as i };
