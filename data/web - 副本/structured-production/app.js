/**
 * 结构化生产面板 — 与主 web 共用同源 + localStorage token
 * 主应用登录后：localStorage.token = "Bearer xxx"
 * 集成到 Vue 工作台时：复用 axios 实例即可，不必单独页面
 */
const API_PREFIX = "/api/structured";

function readToken() {
  const fromUrl = new URLSearchParams(location.search).get("token");
  if (fromUrl) return fromUrl.startsWith("Bearer ") ? fromUrl : `Bearer ${fromUrl}`;
  const stored = localStorage.getItem("token");
  if (stored) return stored.startsWith("Bearer ") ? stored : `Bearer ${stored}`;
  return "";
}

function saveToken(token) {
  if (!token) return;
  localStorage.setItem("token", token.startsWith("Bearer ") ? token : `Bearer ${token}`);
}

function applyUrlContext() {
  const q = new URLSearchParams(location.search);
  if (q.get("projectId")) document.getElementById("projectId").value = q.get("projectId");
  if (q.get("scriptId")) document.getElementById("scriptId").value = q.get("scriptId");
}

function updateAuthBanner() {
  const el = document.getElementById("authStatus");
  if (!el) return;
  const token = readToken();
  if (token) {
    el.textContent = "已读取登录 token（与主应用共享）";
    el.className = "sp-auth ok";
  } else {
    el.textContent = "未登录：请先在主站 / 登录，或下方粘贴 token";
    el.className = "sp-auth warn";
  }
}

async function api(path, body) {
  const token = readToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = token;

  const res = await fetch(`${API_PREFIX}/${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error(`HTTP ${res.status} 非 JSON 响应`);
  }

  if (res.status === 401) {
    throw new Error(json.message || "未提供 token，请先登录主应用");
  }
  if (json.code !== 200 && json.code !== 0) {
    throw new Error(json.message || "请求失败");
  }
  return json.data;
}

let cachedJson = null;
let storyboardIds = [];

function log(obj) {
  document.getElementById("previewOut").textContent =
    typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
}

async function readJsonFile() {
  const f = document.getElementById("jsonFile").files[0];
  if (!f) throw new Error("请选择 JSON 文件");
  cachedJson = JSON.parse(await f.text());
  return cachedJson;
}

function pid() {
  return Number(document.getElementById("projectId").value);
}
function sid() {
  const v = document.getElementById("scriptId").value;
  return v ? Number(v) : null;
}

async function loadGrid() {
  const scriptId = sid();
  if (!scriptId) return;
  const data = await api("getStructuredGrid", { projectId: pid(), scriptId });
  storyboardIds = data.shots.map((s) => s.id);
  document.getElementById("gridMeta").textContent = `(${data.shots.length} 镜)`;
  const grid = document.getElementById("shotGrid");
  grid.innerHTML = data.shots
    .map((s) => {
      const cls = s.state === "dirty" ? "dirty" : s.state === "已完成" ? "done" : "";
      const img = s.imageSrc
        ? `<img src="${s.imageSrc}" alt="" />`
        : `<div style="aspect-ratio:9/16;background:#222;border-radius:4px"></div>`;
      const versions = (s.videoVersions || []).length;
      return `<div class="sp-card ${cls}" data-id="${s.id}">
        ${img}
        <div class="no">镜 ${s.镜号 ?? "-"}</div>
        <div class="st">${s.state} · ${s.duration}s · v${versions || 0}</div>
        <div class="sp-card-actions">
          <button type="button" data-act="img" data-id="${s.id}">重出图</button>
          <button type="button" data-act="vid" data-id="${s.id}">重出视频</button>
        </div>
      </div>`;
    })
    .join("");
}

document.getElementById("btnSaveToken")?.addEventListener("click", () => {
  const raw = document.getElementById("tokenInput")?.value?.trim();
  if (!raw) return log("请粘贴 token");
  saveToken(raw);
  updateAuthBanner();
  log("token 已保存");
});

applyUrlContext();
updateAuthBanner();

document.getElementById("btnPreview").onclick = async () => {
  try {
    const json = await readJsonFile();
    const data = await api("previewStructured", { json, episodeIndex: 0 });
    log(data);
  } catch (e) {
    log(String(e.message || e));
  }
};

document.getElementById("btnImport").onclick = async () => {
  try {
    const json = await readJsonFile();
    const data = await api("importStructured", { projectId: pid(), json, episodeIndex: 0 });
    document.getElementById("scriptId").value = data.scriptId;
    storyboardIds = data.storyboardIds;
    log(data);
    await loadGrid();
  } catch (e) {
    log(String(e.message || e));
  }
};

document.getElementById("btnSync").onclick = async () => {
  try {
    const json = await readJsonFile();
    const scriptId = sid();
    if (!scriptId) throw new Error("填写 scriptId");
    const data = await api("syncStructured", { projectId: pid(), scriptId, json });
    log(data);
    await loadGrid();
  } catch (e) {
    log(String(e.message || e));
  }
};

document.getElementById("btnGenImages").onclick = async () => {
  try {
    if (!storyboardIds.length) await loadGrid();
    const data = await api("generateShotImage", {
      projectId: pid(),
      storyboardIds,
      tier: "2K",
    });
    log(data);
    await loadGrid();
  } catch (e) {
    log(String(e.message || e));
  }
};

document.getElementById("btnGenVideos").onclick = async () => {
  try {
    if (!storyboardIds.length) await loadGrid();
    const audio = document.getElementById("audioOn").checked;
    const data = await api("generateShotVideo", { projectId: pid(), storyboardIds, audio });
    log(data);
    await loadGrid();
  } catch (e) {
    log(String(e.message || e));
  }
};

document.getElementById("btnBatch").onclick = async () => {
  try {
    const scriptId = sid();
    if (!scriptId) throw new Error("填写 scriptId");
    await api("batchGenerateFromStructured", {
      projectId: pid(),
      scriptId,
      audio: document.getElementById("audioOn").checked,
      phases: ["variants", "images", "videos"],
    });
    log("批量生成已在后台启动，请稍后刷新状态");
  } catch (e) {
    log(String(e.message || e));
  }
};

document.getElementById("btnAssemble").onclick = async () => {
  try {
    const scriptId = sid();
    if (!scriptId) throw new Error("填写 scriptId");
    const data = await api("assembleEpisode", { projectId: pid(), scriptId, skipConcat: false });
    log(data);
  } catch (e) {
    log(String(e.message || e));
  }
};

document.getElementById("btnPoll").onclick = async () => {
  try {
    if (!storyboardIds.length) await loadGrid();
    const data = await api("pollStructured", { storyboardIds });
    log(data);
    await loadGrid();
  } catch (e) {
    log(String(e.message || e));
  }
};

document.getElementById("shotGrid").addEventListener("click", async (ev) => {
  const btn = ev.target.closest("button[data-act]");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const audio = document.getElementById("audioOn").checked;
  try {
    if (btn.dataset.act === "img") {
      await api("regenerateShot", { projectId: pid(), storyboardId: id, targets: ["image"], tier: "2K" });
    } else {
      await api("regenerateShot", { projectId: pid(), storyboardId: id, targets: ["video"], audio });
    }
    await loadGrid();
  } catch (e) {
    log(String(e.message || e));
  }
});

/** 供 Vue 工作台嵌入时调用 */
window.StructuredProduction = { api, readToken, loadGrid };
