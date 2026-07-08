const API = "/api/structured";

async function api(path, body) {
  const res = await fetch(`${API}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (json.code !== 200 && json.code !== 0) throw new Error(json.message || "请求失败");
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
