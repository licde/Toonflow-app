import { bD as defineStore, r as ref, c as computed, l as defineComponent, w as watch, o as onMounted, b as onUnmounted, aK as openBlock, aL as createElementBlock, aN as renderSlot, aS as createBlock, bE as createSlots, aP as renderList, aM as withCtx, bF as normalizeProps, bG as guardReactiveProps, aT as createCommentVNode, j as createVNode, aO as createBaseVNode, b0 as toDisplayString, F as Fragment, aU as normalizeClass, bH as withModifiers, aQ as normalizeStyle, T as Teleport, a as inject, a_ as resolveDynamicComponent, a$ as createTextVNode, E as withDirectives, bI as vModelSelect, bJ as vModelText, n as nextTick, bK as withKeys, a1 as unref, p as provide } from './vue-vendor-Byo5TD6r.js';

var ur = Object.defineProperty;
var hn = (c) => {
  throw TypeError(c);
};
var hr = (c, s, l) => s in c ? ur(c, s, { enumerable: true, configurable: true, writable: true, value: l }) : c[s] = l;
var Kt = (c, s, l) => hr(c, typeof s != "symbol" ? s + "" : s, l), Hi = (c, s, l) => s.has(c) || hn("Cannot " + l);
var w = (c, s, l) => (Hi(c, s, "read from private field"), l ? l.call(c) : s.get(c)), dt = (c, s, l) => s.has(c) ? hn("Cannot add the same private member more than once") : s instanceof WeakSet ? s.add(c) : s.set(c, l), ot = (c, s, l, o) => (Hi(c, s, "write to private field"), s.set(c, l), l), fn = (c, s, l) => (Hi(c, s, "access private method"), l);
function _r(c = "") {
  return `${c}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function mr() {
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}
function ct(c) {
  return Math.round(c * 1e3) / 1e3;
}
const Ht = defineStore("tracks", () => {
  const c = ref([]), s = ref(/* @__PURE__ */ new Set()), l = ref({
    clips: [],
    operation: null
  }), o = computed(() => c.value.find((D) => D.isMain)), u = computed(() => [...c.value].sort((D, M) => {
    const G = (X) => X.isMain ? 100 : {
      effect: 10,
      filter: 20,
      sticker: 30,
      subtitle: 40,
      video: 50,
      audio: 200
      // 音频轨道放在最下面
    }[X.type] || 0, J = G(D), E = G(M);
    return J !== E ? J - E : D.order - M.order;
  })), h = computed(() => {
    let D = 0;
    return c.value.forEach((M) => {
      M.clips.forEach((G) => {
        G.endTime > D && (D = G.endTime);
      });
    }), D;
  }), p = computed(() => {
    const D = [];
    return c.value.forEach((M) => {
      M.clips.forEach((G) => {
        s.value.has(G.id) && D.push(G);
      });
    }), D;
  });
  function r(D) {
    if ((D.type === "video" || D.type === "audio") && "playbackRate" in D) {
      const M = D, G = M.playbackRate || 1;
      if (typeof M.trimStart == "number" && typeof M.trimEnd == "number") {
        const J = M.trimEnd - M.trimStart, E = ct(J / G);
        return {
          ...M,
          endTime: ct(M.startTime + E)
        };
      }
    }
    return D;
  }
  function S(D) {
    return D.map((M) => ({
      ...M,
      clips: M.clips ? M.clips.map(r) : []
    }));
  }
  function x(D) {
    c.value = S(D);
  }
  function b(D) {
    D.clips && D.clips.length > 0 && (D.clips = D.clips.map(r)), c.value.push(D);
  }
  function I(D) {
    const M = c.value.findIndex((G) => G.id === D);
    M !== -1 && c.value.splice(M, 1);
  }
  function y(D, M) {
    const G = c.value.find((J) => J.id === D);
    G && Object.assign(G, M);
  }
  function A(D, M) {
    const G = c.value.findIndex((E) => E.id === D);
    if (G === -1) return null;
    const J = {
      id: `track-${Date.now()}`,
      type: M,
      name: `${M} ${e(M) + 1}`,
      visible: true,
      locked: false,
      clips: [],
      order: G
    };
    return c.value.forEach((E) => {
      E.order >= G && E.order++;
    }), c.value.splice(G, 0, J), J;
  }
  function t(D, M) {
    const G = c.value.findIndex((E) => E.id === D);
    if (G === -1) return null;
    const J = {
      id: `track-${Date.now()}`,
      type: M,
      name: `${M} ${e(M) + 1}`,
      visible: true,
      locked: false,
      clips: [],
      order: G + 1
    };
    return c.value.forEach((E) => {
      E.order > G && E.order++;
    }), c.value.splice(G + 1, 0, J), J;
  }
  function e(D) {
    return c.value.filter((M) => M.type === D).length;
  }
  function n(D, M) {
    const G = c.value.find((J) => J.id === D);
    if (G) {
      const J = r(M);
      G.clips.push(J);
    }
  }
  function a(D) {
    c.value.forEach((M) => {
      const G = M.clips.findIndex((J) => J.id === D);
      if (G !== -1) {
        const J = M.clips[G];
        if (J.type === "video") {
          M.clips.filter((Z) => {
            if (Z.type !== "transition") return false;
            const nt = Z, K = (nt.startTime + nt.endTime) / 2, N = Math.abs(K - J.startTime) < nt.transitionDuration, it = Math.abs(K - J.endTime) < nt.transitionDuration;
            return N || it;
          }).forEach((Z) => {
            const nt = M.clips.findIndex((K) => K.id === Z.id);
            nt !== -1 && (M.clips.splice(nt, 1), s.value.delete(Z.id));
          });
          const X = M.clips.findIndex((Z) => Z.id === D);
          X !== -1 && M.clips.splice(X, 1);
        } else
          M.clips.splice(G, 1);
      }
    }), s.value.delete(D);
  }
  function d(D) {
    D.forEach((M) => a(M));
  }
  function f(D, M) {
    const G = { ...D };
    for (const J in M)
      if (Object.prototype.hasOwnProperty.call(M, J)) {
        const E = M[J], X = D[J];
        E == null ? G[J] = E : typeof E == "object" && !Array.isArray(E) && typeof X == "object" && X !== null && !Array.isArray(X) ? G[J] = f(X, E) : G[J] = E;
      }
    return G;
  }
  function _(D, M) {
    c.value.forEach((G) => {
      const J = G.clips.findIndex((E) => E.id === D);
      if (J !== -1) {
        const E = G.clips[J];
        G.clips[J] = f(E, M);
      }
    });
  }
  function v(D, M) {
    let G = null;
    for (const J of c.value) {
      const E = J.clips.findIndex((X) => X.id === D);
      if (E !== -1) {
        G = J.clips.splice(E, 1)[0], J.id;
        break;
      }
    }
    if (G) {
      const J = c.value.find((E) => E.id === M);
      J && (G.trackId = M, J.clips.push(G));
    }
  }
  function m(D) {
    for (const M of c.value) {
      const G = M.clips.find((J) => J.id === D);
      if (G)
        return G;
    }
  }
  function T(D, M = false) {
    M || s.value.clear(), s.value.add(D);
  }
  function U(D) {
    s.value.has(D) ? s.value.delete(D) : s.value.add(D);
  }
  function $(D) {
    s.value.delete(D);
  }
  function V() {
    s.value.clear();
  }
  function F(D, M, G, J) {
    const E = c.value.find((X) => X.id === D);
    return E ? E.clips.some((X) => J && X.id === J ? false : X.startTime < G && X.endTime > M) : false;
  }
  function Y() {
    c.value = [], s.value.clear();
  }
  function W() {
    const D = [];
    c.value.forEach((M) => {
      if (M.isMain) return;
      M.clips.some(
        (J) => J.type !== "transition"
      ) || D.push(M.id);
    }), D.forEach((M) => {
      I(M);
    });
  }
  function ut(D) {
    const M = D || Array.from(s.value);
    if (M.length === 0) return false;
    const G = [];
    return M.forEach((J) => {
      const E = m(J);
      E && G.push(JSON.parse(JSON.stringify(E)));
    }), G.length > 0 ? (l.value = {
      clips: G,
      operation: "copy"
    }, true) : false;
  }
  function _t(D) {
    const M = D || Array.from(s.value);
    if (M.length === 0) return false;
    const G = [];
    return M.forEach((J) => {
      const E = m(J);
      E && G.push(JSON.parse(JSON.stringify(E)));
    }), G.length > 0 ? (l.value = {
      clips: G,
      operation: "cut"
    }, true) : false;
  }
  function rt(D, M, G, J = []) {
    const E = c.value.find((K) => K.id === D);
    if (!E) return M;
    const X = E.clips.filter((K) => !J.includes(K.id)).sort((K, N) => K.startTime - N.startTime);
    if (X.length === 0) return M;
    let Z = M, nt = M + G;
    for (const K of X)
      Z < K.endTime && nt > K.startTime && (Z = K.endTime, nt = Z + G);
    return Math.max(0, Z);
  }
  function R(D, M) {
    if (l.value.clips.length === 0) return null;
    const G = c.value.find((N) => N.id === D);
    if (!G) return null;
    const J = [], E = () => `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, X = Math.min(...l.value.clips.map((N) => N.startTime)), Z = Math.max(...l.value.clips.map((N) => N.endTime - X)), nt = l.value.operation === "cut" ? l.value.clips.map((N) => N.id) : [], K = rt(
      D,
      M,
      Z,
      nt
    );
    return l.value.clips.forEach((N) => {
      const it = N.endTime - N.startTime, lt = N.startTime - X, st = {
        ...N,
        id: E(),
        trackId: D,
        // 使用调整后的位置，保持相对位置
        startTime: K + lt,
        endTime: K + lt + it,
        selected: false
      };
      G.clips.push(st), J.push(st);
    }), l.value.operation === "cut" && (l.value.clips.forEach((N) => {
      a(N.id);
    }), l.value = { clips: [], operation: null }), J.length > 0 ? J : null;
  }
  function P() {
    return l.value.clips.length > 0;
  }
  function k() {
    return l.value;
  }
  function L() {
    l.value = { clips: [], operation: null };
  }
  function j(D, M) {
    let G = null, J = null, E = -1;
    for (const K of c.value) {
      const N = K.clips.findIndex((it) => it.id === D);
      if (N !== -1) {
        G = K.clips[N], J = K, E = N;
        break;
      }
    }
    if (!G || !J || E === -1 || M <= G.startTime || M >= G.endTime)
      return null;
    const X = () => `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, Z = {
      ...JSON.parse(JSON.stringify(G)),
      endTime: M
    }, nt = {
      ...JSON.parse(JSON.stringify(G)),
      id: X(),
      startTime: M,
      selected: false
    };
    if ("trimStart" in G && "trimEnd" in G && "originalDuration" in G) {
      const K = G, N = K.endTime - K.startTime, lt = (K.trimEnd - K.trimStart) / N, st = (M - K.startTime) * lt, pt = K.trimStart + st;
      Z.trimEnd = pt, nt.trimStart = pt;
    }
    return J.clips.splice(E, 1, Z, nt), s.value.has(D) && (s.value.delete(D), s.value.add(Z.id)), { leftClip: Z, rightClip: nt };
  }
  function C(D, M, G) {
    const {
      allowShrink: J = true,
      allowExpand: E = true,
      handleCollision: X = true,
      keepStartTime: Z = true
    } = G || {};
    if (M < 0.25 || M > 4)
      return { success: false, message: "播放倍速必须在 0.25 到 4 之间" };
    let nt = null, K = null;
    for (const xt of c.value) {
      const wt = xt.clips.find((Ft) => Ft.id === D);
      if (wt) {
        nt = wt, K = xt;
        break;
      }
    }
    if (!nt || !K)
      return { success: false, message: "未找到指定的 Clip" };
    if (nt.type !== "video" && nt.type !== "audio")
      return { success: false, message: "只有视频或音频类型的 Clip 可以调整倍速" };
    const N = nt, it = N.playbackRate || 1;
    if (Math.abs(it - M) < 1e-3)
      return { success: true };
    const lt = N.trimEnd - N.trimStart, st = N.endTime - N.startTime, pt = ct(lt / M), St = pt > st, Tt = pt < st;
    if (St && !E)
      return { success: false, message: "不允许扩展时长" };
    if (Tt && !J)
      return { success: false, message: "不允许收缩时长" };
    let Ct, Xt;
    Z ? (Ct = N.startTime, Xt = ct(N.startTime + pt)) : (Xt = N.endTime, Ct = ct(N.endTime - pt), Ct < 0 && (Ct = 0, Xt = ct(pt)));
    const ii = [], ni = [], Oi = K.clips.filter((xt) => {
      if (xt.type !== "transition") return false;
      const wt = xt, Ft = (wt.startTime + wt.endTime) / 2, Lt = Math.abs(Ft - N.startTime) < wt.transitionDuration, he = Math.abs(Ft - N.endTime) < wt.transitionDuration;
      return Lt || he;
    }), xi = K.clips.filter(
      (xt) => xt.id !== D && xt.type !== "transition"
    ).sort((xt, wt) => xt.startTime - wt.startTime), wi = xi.filter(
      (xt) => Ct < xt.endTime && Xt > xt.startTime
    );
    if (wi.length > 0) {
      if (!X)
        return { success: false, message: "会与其他 Clip 产生碰撞" };
      const xt = wi.filter((Ft) => Ft.startTime >= N.startTime), wt = Xt - Math.min(...xt.map((Ft) => Ft.startTime));
      if (wt > 0) {
        const Ft = xi.filter((Lt) => Lt.startTime >= N.endTime);
        for (const Lt of Ft) {
          const he = ct(Lt.startTime + wt), Ge = ct(Lt.endTime + wt);
          _(Lt.id, {
            startTime: he,
            endTime: Ge
          }), ni.push({
            id: Lt.id,
            startTime: he,
            endTime: Ge
          });
        }
      }
    }
    _(D, {
      playbackRate: M,
      startTime: Ct,
      endTime: Xt
    });
    for (const xt of Oi) {
      const wt = xt, Ft = (wt.startTime + wt.endTime) / 2, Lt = K.clips.filter((Zt) => Zt.type !== "transition");
      ({ ...N });
      const he = Math.abs(Ft - N.startTime) < wt.transitionDuration, Ge = Math.abs(Ft - N.endTime) < wt.transitionDuration;
      let ve = false;
      if (Ge) {
        const Zt = Lt.find(
          (Mt) => Mt.id !== D && Math.abs(Mt.startTime - Xt) < 0.01
        );
        if (ve = !!Zt, ve && Zt) {
          const Mt = (Xt + Zt.startTime) / 2, Ce = wt.transitionDuration / 2;
          _(xt.id, {
            startTime: ct(Mt - Ce),
            endTime: ct(Mt + Ce)
          });
        }
      } else if (he && !Z) {
        const Zt = Lt.find(
          (Mt) => Mt.id !== D && Math.abs(Mt.endTime - Ct) < 0.01
        );
        if (ve = !!Zt, ve && Zt) {
          const Mt = (Zt.endTime + Ct) / 2, Ce = wt.transitionDuration / 2;
          _(xt.id, {
            startTime: ct(Mt - Ce),
            endTime: ct(Mt + Ce)
          });
        }
      } else he && Z && (ve = true);
      ve || (a(xt.id), ii.push(xt.id));
    }
    return {
      success: true,
      removedTransitions: ii.length > 0 ? ii : void 0,
      adjustedClips: ni.length > 0 ? ni : void 0
    };
  }
  function z(D, M) {
    const G = m(D);
    if (!G || G.type !== "video" && G.type !== "audio")
      return null;
    const J = G, E = J.trimEnd - J.trimStart;
    return ct(E / M);
  }
  function O(D, M, G = true) {
    const J = m(D);
    if (!J || J.type !== "video" && J.type !== "audio")
      return { willCollide: false };
    const E = J, X = E.trimEnd - E.trimStart, Z = ct(X / M);
    let nt, K;
    G ? (nt = E.startTime, K = ct(E.startTime + Z)) : (K = E.endTime, nt = ct(Math.max(0, E.endTime - Z)));
    let N = null;
    for (const lt of c.value)
      if (lt.clips.some((st) => st.id === D)) {
        N = lt;
        break;
      }
    if (!N)
      return { willCollide: false, newDuration: Z };
    const it = N.clips.filter(
      (lt) => lt.id !== D && lt.type !== "transition" && nt < lt.endTime && K > lt.startTime
    );
    return {
      willCollide: it.length > 0,
      collidingClipIds: it.map((lt) => lt.id),
      newDuration: Z
    };
  }
  function ft(D, M, G = 1) {
    const J = M - D;
    return ct(J / G);
  }
  return {
    // 状态
    tracks: c,
    selectedClipIds: s,
    clipboard: l,
    // 计算属性
    mainTrack: o,
    sortedTracks: u,
    totalDuration: h,
    selectedClips: p,
    // 方法
    addTrack: b,
    addTrackAbove: A,
    addTrackBelow: t,
    removeTrack: I,
    updateTrack: y,
    getTrackCountByType: e,
    setTracks: x,
    normalizeTracks: S,
    normalizeClipDuration: r,
    addClip: n,
    removeClip: a,
    removeClips: d,
    updateClip: _,
    moveClipToTrack: v,
    getClip: m,
    selectClip: T,
    toggleClipSelection: U,
    deselectClip: $,
    clearSelection: V,
    hasOverlap: F,
    reset: Y,
    cleanupEmptyTracks: W,
    // 剪贴板操作
    copyClips: ut,
    cutClips: _t,
    pasteClips: R,
    hasClipboardContent: P,
    getClipboardContent: k,
    clearClipboard: L,
    splitClip: j,
    // 倍速控制
    setClipPlaybackRate: C,
    getClipDurationAtRate: z,
    checkPlaybackRateCollision: O,
    calculateTrackDuration: ft
  };
}), Ne = defineStore("playback", () => {
  const c = ref(false), s = ref(0), l = ref(1), o = ref(0);
  let u = null, h = 0;
  const p = computed(() => {
    const m = Ht().totalDuration;
    return Math.max(m, o.value);
  }), r = computed(() => x(s.value)), S = computed(() => x(p.value));
  function x(v, m = 30) {
    const T = Math.floor(v * m), U = Math.floor(T / (m * 3600)), $ = Math.floor(T % (m * 3600) / (m * 60)), V = Math.floor(T % (m * 60) / m), F = T % m;
    return `${String(U).padStart(2, "0")}:${String($).padStart(2, "0")}:${String(V).padStart(2, "0")}:${String(F).padStart(2, "0")}`;
  }
  function b(v) {
    if (c.value) {
      if (h > 0) {
        const m = (v - h) / 1e3, T = s.value + m * l.value, U = p.value;
        if (T >= U) {
          s.value = U, t();
          return;
        }
        s.value = T;
      }
      h = v, u = requestAnimationFrame(b);
    }
  }
  function I() {
    h = 0, u = requestAnimationFrame(b);
  }
  function y() {
    u !== null && (cancelAnimationFrame(u), u = null), h = 0;
  }
  function A() {
    c.value || (c.value = true, I());
  }
  function t() {
    c.value && (c.value = false, y());
  }
  function e() {
    c.value ? t() : A();
  }
  function n(v) {
    const m = p.value > 0 ? p.value : 1 / 0;
    s.value = Math.max(0, Math.min(v, m));
  }
  function a(v) {
    l.value = v;
  }
  function d(v) {
    o.value = v;
  }
  function f(v) {
    const m = p.value;
    s.value = Math.max(0, Math.min(s.value + v, m));
  }
  function _() {
    t(), s.value = 0, l.value = 1, o.value = 0;
  }
  return {
    // 状态
    isPlaying: c,
    currentTime: s,
    playbackRate: l,
    duration: o,
    effectiveDuration: p,
    // 计算属性
    formattedCurrentTime: r,
    formattedDuration: S,
    // 方法
    formatTime: x,
    play: A,
    pause: t,
    togglePlay: e,
    seekTo: n,
    setPlaybackRate: a,
    setDuration: d,
    adjustTime: f,
    reset: _
  };
}), ti = defineStore("history", () => {
  const c = ref([]), s = ref(-1), l = ref(50), o = computed(() => s.value > 0), u = computed(() => s.value < c.value.length - 1);
  function h(A) {
    const t = Ht();
    return {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      snapshot: JSON.stringify({
        tracks: t.tracks,
        selectedClipIds: Array.from(t.selectedClipIds)
      }),
      description: A
    };
  }
  function p(A) {
    const t = h(A);
    s.value < c.value.length - 1 && (c.value = c.value.slice(0, s.value + 1)), c.value.push(t), c.value.length > l.value ? c.value.shift() : s.value++;
  }
  function r(A) {
    const t = Ht(), e = JSON.parse(A.snapshot);
    t.tracks = e.tracks, t.selectedClipIds.clear(), e.selectedClipIds.forEach((n) => {
      t.selectedClipIds.add(n);
    });
  }
  function S() {
    if (!o.value) return;
    s.value--;
    const A = c.value[s.value];
    r(A);
  }
  function x() {
    if (!u.value) return;
    s.value++;
    const A = c.value[s.value];
    r(A);
  }
  function b() {
    c.value = [], s.value = -1, p("初始状态");
  }
  function I() {
    c.value = [], s.value = -1;
  }
  function y() {
    I();
  }
  return {
    // 状态
    historyStack: c,
    currentIndex: s,
    maxHistorySize: l,
    // 计算属性
    canUndo: o,
    canRedo: u,
    // 方法
    createSnapshot: h,
    pushSnapshot: p,
    restoreSnapshot: r,
    undo: S,
    redo: x,
    initialize: b,
    clear: I,
    reset: y
  };
}), sn = "video-track-scale-settings";
function vr() {
  try {
    const c = localStorage.getItem(sn);
    if (c)
      return JSON.parse(c);
  } catch (c) {
    console.warn("Failed to load scale settings from localStorage:", c);
  }
  return null;
}
function gr(c) {
  try {
    localStorage.setItem(sn, JSON.stringify(c));
  } catch (s) {
    console.warn("Failed to save scale settings to localStorage:", s);
  }
}
const Yt = defineStore("scale", () => {
  const c = vr(), s = ref((c == null ? void 0 : c.scale) ?? 1), l = ref(0.1), o = ref(10), u = ref(100), h = ref((c == null ? void 0 : c.snapEnabled) ?? true), p = ref(10);
  watch([s, h], ([v, m]) => {
    gr({ scale: v, snapEnabled: m });
  }, { immediate: false });
  const r = computed(() => u.value * s.value), S = computed(() => {
    const v = s.value;
    return v >= 5 ? {
      majorInterval: 1,
      // 1秒主刻度
      minorInterval: 1 / 30,
      // 每帧（假设30fps）
      majorHeight: 20,
      minorHeight: 8
    } : v >= 2 ? {
      majorInterval: 1,
      // 1秒主刻度
      minorInterval: 0.1,
      // 0.1秒子刻度
      majorHeight: 20,
      minorHeight: 10
    } : v >= 1 ? {
      majorInterval: 1,
      // 1秒主刻度
      minorInterval: 0.2,
      // 0.2秒子刻度
      majorHeight: 20,
      minorHeight: 10
    } : v >= 0.5 ? {
      majorInterval: 2,
      // 2秒主刻度
      minorInterval: 0.5,
      // 0.5秒子刻度
      majorHeight: 20,
      minorHeight: 10
    } : v >= 0.2 ? {
      majorInterval: 5,
      // 5秒主刻度
      minorInterval: 1,
      // 1秒子刻度
      majorHeight: 20,
      minorHeight: 10
    } : {
      majorInterval: 10,
      // 10秒主刻度
      minorInterval: 2,
      // 2秒子刻度
      majorHeight: 20,
      minorHeight: 10
    };
  });
  function x(v) {
    s.value = Math.max(l.value, Math.min(v, o.value));
  }
  function b(v = 0.1) {
    x(s.value + v);
  }
  function I(v = 0.1) {
    x(s.value - v);
  }
  function y() {
    h.value = !h.value;
  }
  function A(v) {
    h.value = v;
  }
  function t(v) {
    return v * r.value;
  }
  function e(v) {
    return v / r.value;
  }
  function n(v, m) {
    if (!h.value || m.length === 0)
      return v;
    let T = v, U = p.value;
    for (const $ of m) {
      const V = Math.abs(v - $);
      V < U && (U = V, T = $);
    }
    return T;
  }
  function a() {
    s.value = 1, h.value = true;
    try {
      localStorage.removeItem(sn);
    } catch (v) {
      console.warn("Failed to remove scale settings from localStorage:", v);
    }
  }
  function d() {
    return c !== null;
  }
  function f(v) {
    d() || x(v);
  }
  function _(v) {
    d() || A(v);
  }
  return {
    // 状态
    scale: s,
    minScale: l,
    maxScale: o,
    pixelsPerSecond: u,
    snapEnabled: h,
    snapThreshold: p,
    // 计算属性
    actualPixelsPerSecond: r,
    rulerConfig: S,
    // 方法
    setScale: x,
    zoomIn: b,
    zoomOut: I,
    toggleSnap: y,
    setSnapEnabled: A,
    timeToPixels: t,
    pixelsToTime: e,
    snapToPosition: n,
    reset: a,
    hasSavedSettings: d,
    initScale: f,
    initSnapEnabled: _
  };
}), ei = defineStore("drag", () => {
  const c = Ht(), s = Yt(), l = ti(), o = ref(false), u = ref([]), h = ref(0), p = ref(0), r = ref(""), S = ref(/* @__PURE__ */ new Map()), x = ref(0), b = ref(0), I = ref({ shift: false }), y = ref(true), A = ref({ x: 0, y: 0 }), t = ref({
    enabled: true,
    edgeThreshold: 80,
    // 距离边缘 80px 时开始滚动
    scrollSpeed: 8,
    // 基础滚动速度
    maxScrollSpeed: 25
    // 最大滚动速度
  }), e = ref(null), n = ref(null), a = ref(null), d = ref(null), f = ref(0), _ = ref({
    trackId: "",
    startTime: 0,
    endTime: 0,
    needNewTrack: false,
    visible: false,
    clipType: ""
  }), v = ref("");
  let m = document;
  const T = computed(
    () => new Set(u.value.map((E) => E.id))
  ), U = computed(() => !o.value || !_.value.visible ? 0 : _.value.endTime);
  function $(E) {
    E.enableCrossTrackDrag !== void 0 && (y.value = E.enableCrossTrackDrag), E.edgeScroll && Object.assign(t.value, E.edgeScroll);
  }
  function V(E, X, Z) {
    e.value = E, n.value = X, d.value = Z || null;
  }
  function F(E) {
    if (!n.value) return;
    const X = Math.max(0, n.value.scrollLeft + E);
    n.value.scrollLeft = X, d.value && d.value(X);
  }
  function Y() {
    if (!o.value || !t.value.enabled) {
      _t();
      return;
    }
    const E = e.value, X = n.value;
    if (!E || !X) return;
    const Z = E.getBoundingClientRect(), { edgeThreshold: nt, scrollSpeed: K, maxScrollSpeed: N } = t.value, it = x.value - Z.left;
    let lt = 0;
    if (it < nt && X.scrollLeft > 0) {
      const pt = Math.max(0, nt - it) / nt;
      lt = -Math.min(
        K + pt * (N - K),
        N
      );
    } else if (it > Z.width - nt) {
      const St = X.scrollWidth - X.clientWidth + 500;
      if (X.scrollLeft < St) {
        const Ct = Math.max(
          0,
          it - (Z.width - nt)
        ) / nt;
        lt = Math.min(
          K + Ct * (N - K),
          N
        );
      }
    }
    lt !== 0 && (F(lt), W(lt)), a.value = requestAnimationFrame(
      Y
    );
  }
  function W(E) {
    if (!o.value || u.value.length === 0) return;
    f.value += E;
    const X = x.value - h.value, Z = b.value - p.value, K = (X + f.value) / s.actualPixelsPerSecond, N = u.value[0], it = S.value.get(N.id);
    if (!it) return;
    const lt = Math.abs(Z) > 40;
    let st = r.value;
    if (y.value && lt) {
      const Ct = G(b.value);
      Ct && (st = Ct);
    }
    v.value = st;
    let pt = ct(it.startTime + K);
    s.snapEnabled && !I.value.shift && (pt = M(
      pt,
      N,
      st
    )), pt = Math.max(0, pt);
    const St = it.endTime - it.startTime, Tt = pt + St;
    P(
      st,
      pt,
      Tt,
      N.type
    );
  }
  function ut() {
    a.value === null && (a.value = requestAnimationFrame(
      Y
    ));
  }
  function _t() {
    a.value !== null && (cancelAnimationFrame(a.value), a.value = null);
  }
  function rt(E, X, Z) {
    var nt;
    E.type !== "transition" && (m = Z || ((nt = X.target) == null ? void 0 : nt.ownerDocument) || document, c.selectClip(E.id), u.value = [E], o.value = true, h.value = X.clientX, p.value = X.clientY, x.value = X.clientX, b.value = X.clientY, r.value = E.trackId, v.value = E.trackId, S.value.clear(), S.value.set(E.id, {
      startTime: E.startTime,
      endTime: E.endTime,
      trackId: E.trackId
    }), A.value = { x: 0, y: 0 }, f.value = 0, _.value = {
      trackId: E.trackId,
      startTime: E.startTime,
      endTime: E.endTime,
      needNewTrack: false,
      visible: false,
      clipType: E.type
    }, m.addEventListener("mousemove", R), m.addEventListener("mouseup", j), ut());
  }
  function R(E) {
    if (!o.value || u.value.length === 0) return;
    I.value.shift = E.shiftKey, x.value = E.clientX, b.value = E.clientY;
    const X = E.clientX - h.value, Z = E.clientY - p.value;
    A.value = { x: X, y: Z };
    const K = (X + f.value) / s.actualPixelsPerSecond, N = u.value[0], it = S.value.get(N.id);
    if (!it) return;
    const lt = Math.abs(Z) > 40;
    let st = r.value;
    if (y.value && lt) {
      const Ct = G(b.value);
      Ct && (st = Ct);
    }
    v.value = st;
    let pt = ct(it.startTime + K);
    s.snapEnabled && !I.value.shift && (pt = M(
      pt,
      N,
      st
    )), pt = Math.max(0, pt);
    const St = it.endTime - it.startTime, Tt = pt + St;
    P(
      st,
      pt,
      Tt,
      N.type
    );
  }
  function P(E, X, Z, nt) {
    const K = c.tracks.find((Tt) => Tt.id === E), N = r.value, it = E !== N, lt = Z - X;
    let st = X, pt = Z, St = false;
    if (it)
      if (!K)
        St = true;
      else {
        const Tt = nt;
        K.type === Tt ? L(
          E,
          X,
          Z
        ) && (St = true) : St = true;
      }
    else {
      const Tt = k(
        E,
        X,
        lt
      );
      st = Tt.startTime, pt = Tt.endTime;
    }
    _.value = {
      trackId: E,
      startTime: st,
      endTime: pt,
      needNewTrack: St,
      visible: true,
      clipType: nt
    };
  }
  function k(E, X, Z) {
    const nt = c.tracks.find((st) => st.id === E);
    if (!nt)
      return {
        startTime: X,
        endTime: X + Z
      };
    const K = new Set(u.value.map((st) => st.id)), N = nt.clips.filter((st) => !K.has(st.id) && st.type !== "transition").sort((st, pt) => st.startTime - pt.startTime);
    let it = X, lt = X + Z;
    for (const st of N)
      if (it < st.endTime && lt > st.startTime) {
        const St = (it + lt) / 2, Tt = (st.startTime + st.endTime) / 2;
        (St < Tt ? "before" : "after") === "before" ? (it = ct(st.startTime - Z), it < 0 && (it = 0, it + Z > st.startTime && (it = ct(st.endTime)))) : it = ct(st.endTime), lt = it + Z;
        break;
      }
    return { startTime: it, endTime: lt };
  }
  function L(E, X, Z) {
    const nt = c.tracks.find((N) => N.id === E);
    if (!nt) return false;
    const K = new Set(u.value.map((N) => N.id));
    return nt.clips.some((N) => K.has(N.id) || N.type === "transition" ? false : N.startTime < Z && N.endTime > X);
  }
  function j() {
    if (!o.value || u.value.length === 0) {
      ft();
      return;
    }
    const E = v.value !== r.value;
    if (!y.value && E) {
      ft();
      return;
    }
    E ? O() : C(), J(), c.cleanupEmptyTracks(), l.pushSnapshot("移动片段"), ft();
  }
  function C() {
    const E = _.value, X = u.value[0], Z = S.value.get(X.id);
    if (!Z) return;
    const nt = E.startTime - Z.startTime, K = /* @__PURE__ */ new Map();
    u.value.forEach((N) => {
      const it = S.value.get(N.id);
      if (it) {
        const lt = it.endTime - it.startTime, st = ct(
          Math.max(0, it.startTime + nt)
        ), pt = ct(st + lt);
        c.updateClip(N.id, {
          startTime: st,
          endTime: pt
        }), K.set(N.id, {
          startTime: st,
          endTime: pt
        });
      }
    }), z(E.trackId, K);
  }
  function z(E, X) {
    const Z = c.tracks.find((N) => N.id === E);
    if (!Z)
      return;
    const nt = [...Z.clips].filter((N) => N.type !== "transition").map((N) => {
      const it = X.get(N.id);
      return {
        id: N.id,
        startTime: it ? it.startTime : N.startTime,
        endTime: it ? it.endTime : N.endTime
      };
    }).sort((N, it) => N.startTime - it.startTime);
    if (nt.length < 2)
      return;
    const K = [];
    for (let N = 0; N < nt.length - 1; N++) {
      const it = nt[N], lt = nt[N + 1];
      if (it.endTime > lt.startTime) {
        const st = lt.endTime - lt.startTime, pt = ct(it.endTime), St = ct(pt + st);
        lt.startTime = pt, lt.endTime = St, K.push({
          id: lt.id,
          startTime: pt,
          endTime: St
        });
      }
    }
    K.forEach((N) => {
      c.updateClip(N.id, {
        startTime: N.startTime,
        endTime: N.endTime
      });
    });
  }
  function O() {
    const E = _.value, X = u.value[0], Z = S.value.get(X.id);
    if (!Z) return;
    const nt = X.type;
    let K = null;
    if (E.needNewTrack) {
      const lt = D(nt);
      c.addTrack(lt), K = lt;
    } else
      K = c.tracks.find((lt) => lt.id === E.trackId) || null;
    if (!K) return;
    const N = E.startTime - Z.startTime, it = /* @__PURE__ */ new Map();
    u.value.forEach((lt) => {
      const st = S.value.get(lt.id);
      if (st) {
        const pt = st.endTime - st.startTime, St = ct(
          Math.max(0, st.startTime + N)
        ), Tt = ct(St + pt);
        lt.trackId !== K.id && c.moveClipToTrack(lt.id, K.id), c.updateClip(lt.id, {
          startTime: St,
          endTime: Tt
        }), it.set(lt.id, {
          startTime: St,
          endTime: Tt
        });
      }
    }), z(K.id, it);
  }
  function ft() {
    _t(), o.value = false, u.value = [], S.value.clear(), A.value = { x: 0, y: 0 }, f.value = 0, _.value = {
      trackId: "",
      startTime: 0,
      endTime: 0,
      needNewTrack: false,
      visible: false,
      clipType: ""
    }, v.value = "", m.removeEventListener("mousemove", R), m.removeEventListener("mouseup", j);
  }
  function D(E) {
    const X = c.getTrackCountByType(E), Z = {
      video: "视频",
      audio: "音频",
      subtitle: "字幕",
      sticker: "贴纸",
      filter: "滤镜",
      effect: "特效"
    };
    return {
      id: _r("track-"),
      type: E,
      name: `${Z[E] || E}${X + 1}`,
      visible: true,
      locked: false,
      clips: [],
      order: c.tracks.length
    };
  }
  function M(E, X, Z) {
    if (I.value.shift || !s.snapEnabled)
      return E;
    const nt = c.tracks.find((st) => st.id === Z);
    if (!nt) return E;
    const K = [], N = new Set(c.selectedClipIds);
    if (nt.clips.forEach((st) => {
      st.id !== X.id && !N.has(st.id) && st.type !== "transition" && (K.push(st.startTime), K.push(st.endTime));
    }), K.length === 0)
      return E;
    const it = s.timeToPixels(E), lt = s.snapToPosition(
      it,
      K.map((st) => s.timeToPixels(st))
    );
    return ct(s.pixelsToTime(lt));
  }
  function G(E) {
    const X = document.querySelectorAll(".tracks__track");
    for (const Z of X) {
      const nt = Z.getBoundingClientRect();
      if (E >= nt.top && E <= nt.bottom)
        return Z.dataset.trackId || null;
    }
    return null;
  }
  function J() {
    c.tracks.forEach((E) => {
      const X = [];
      E.clips.forEach((Z) => {
        if (Z.type !== "transition") return;
        const nt = (Z.startTime + Z.endTime) / 2, K = E.clips.find(
          (it) => it.type !== "transition" && Math.abs(it.endTime - nt) < 0.1
        ), N = E.clips.find(
          (it) => it.type !== "transition" && it !== K && Math.abs(it.startTime - nt) < 0.1
        );
        (!K || !N || Math.abs(K.endTime - N.startTime) > 0.1) && X.push(Z.id);
      }), X.forEach((Z) => {
        c.removeClip(Z);
      });
    });
  }
  return {
    // 状态
    isDragging: o,
    draggedClips: u,
    draggedClipIds: T,
    dragOffset: A,
    previewPosition: _,
    previewEndTime: U,
    currentTargetTrackId: v,
    dragStartTrackId: r,
    edgeScrollConfig: t,
    // 方法
    setConfig: $,
    setScrollContainers: V,
    startDrag: rt,
    handleDragMove: R,
    handleDragEnd: j,
    resetDragState: ft,
    startEdgeScroll: ut,
    stopEdgeScroll: _t
  };
});
function yr(c = {}) {
  const s = Ht(), l = Ne(), o = ti(), u = Yt(), h = c.callbacks || {}, p = ref(false);
  function r() {
    var T;
    if (!((T = c.containerRef) != null && T.value)) return true;
    const m = document.activeElement;
    return m ? c.containerRef.value.contains(m) : false;
  }
  function S() {
    var m;
    return (m = c.containerRef) != null && m.value ? p.value : true;
  }
  function x(m) {
    return !m || !(m instanceof HTMLElement) ? false : !!(m instanceof HTMLInputElement || m instanceof HTMLTextAreaElement || m instanceof HTMLSelectElement || m.isContentEditable || m.getAttribute("contenteditable") === "true");
  }
  function b(m) {
    var $, V;
    const U = mr() ? m.metaKey : m.ctrlKey;
    if (m.code === "Space") {
      if (x(m.target))
        return;
      m.preventDefault(), l.isPlaying ? (l.pause(), ($ = h.onPause) == null || $.call(h)) : (l.play(), (V = h.onPlay) == null || V.call(h));
      return;
    }
    if (S() && !I(m)) {
      if (U && m.code === "KeyZ" && !m.shiftKey) {
        m.preventDefault(), o.undo();
        return;
      }
      if (U && m.code === "KeyY" || U && m.shiftKey && m.code === "KeyZ") {
        m.preventDefault(), o.redo();
        return;
      }
      if (U && m.code === "KeyC") {
        m.preventDefault(), y();
        return;
      }
      if (U && m.code === "KeyX") {
        m.preventDefault(), A();
        return;
      }
      if (U && m.code === "KeyV") {
        m.preventDefault(), t();
        return;
      }
      if (m.code === "Delete" || m.code === "Backspace") {
        m.preventDefault(), e();
        return;
      }
      if (U && (m.code === "Equal" || m.code === "NumpadAdd")) {
        m.preventDefault(), u.zoomIn(0.1);
        return;
      }
      if (U && (m.code === "Minus" || m.code === "NumpadSubtract")) {
        m.preventDefault(), u.zoomOut(0.1);
        return;
      }
      if (m.code === "ArrowRight") {
        m.preventDefault(), l.adjustTime(0.1);
        return;
      }
      if (m.code === "ArrowLeft") {
        m.preventDefault(), l.adjustTime(-0.1);
        return;
      }
      if (m.code === "Escape") {
        m.preventDefault(), s.clearSelection();
        return;
      }
    }
  }
  function I(m) {
    var U;
    const T = m.target;
    return T instanceof HTMLInputElement || T instanceof HTMLTextAreaElement || T.isContentEditable ? ((U = c.containerRef) != null && U.value && !c.containerRef.value.contains(T), true) : false;
  }
  function y() {
    var T;
    const m = Array.from(s.selectedClipIds);
    m.length !== 0 && (s.copyClips(m), (T = h.onCopy) == null || T.call(h, m));
  }
  function A() {
    var T;
    const m = Array.from(s.selectedClipIds);
    m.length !== 0 && (s.cutClips(m), (T = h.onCut) == null || T.call(h, m));
  }
  function t() {
    var V;
    if (!s.hasClipboardContent()) return;
    const m = s.selectedClips;
    let T;
    if (m.length > 0 ? T = m[0].trackId : s.mainTrack && (T = s.mainTrack.id), !T) return;
    const U = l.currentTime, $ = s.pasteClips(T, U);
    $ && (o.pushSnapshot("粘贴片段"), (V = h.onPaste) == null || V.call(h, $, T, U));
  }
  function e() {
    var T;
    const m = Array.from(s.selectedClipIds);
    m.length !== 0 && (s.removeClips(m), o.pushSnapshot("删除片段"), (T = h.onDelete) == null || T.call(h, m));
  }
  function n() {
    p.value = true;
  }
  function a() {
    r() || (p.value = false);
  }
  function d() {
    p.value = true;
  }
  function f(m) {
    var U;
    const T = m.relatedTarget;
    (U = c.containerRef) != null && U.value && T && (c.containerRef.value.contains(T) || (p.value = false));
  }
  function _() {
    var T;
    const m = (T = c.containerRef) == null ? void 0 : T.value;
    m && (m.addEventListener("mouseenter", n), m.addEventListener("mouseleave", a), m.addEventListener("focusin", d), m.addEventListener("focusout", f));
  }
  function v() {
    var T;
    const m = (T = c.containerRef) == null ? void 0 : T.value;
    m && (m.removeEventListener("mouseenter", n), m.removeEventListener("mouseleave", a), m.removeEventListener("focusin", d), m.removeEventListener("focusout", f));
  }
  return onMounted(() => {
    document.addEventListener("keydown", b), _();
  }), onUnmounted(() => {
    document.removeEventListener("keydown", b), v();
  }), {
    handleKeyDown: b,
    isActive: p
  };
}
function br({ scrollLeft: c, tracksWidth: s, setScrollLeft: l }) {
  const o = Ne(), u = Yt();
  watch(
    () => o.currentTime,
    (h) => {
      if (!o.isPlaying) return;
      const p = u.actualPixelsPerSecond, r = h * p, x = c.value + s.value * 0.9;
      if (r > x) {
        const b = s.value * 0.8, I = c.value + b;
        l(I);
      }
    }
  );
}
const At = (c, s) => {
  const l = c.__vccOpts || c;
  for (const [o, u] of s)
    l[o] = u;
  return l;
}, Sr = {}, xr = {
  width: "1em",
  height: "1em",
  viewBox: "0 0 24 24",
  preserveAspectRatio: "xMidYMid meet",
  fill: "none",
  role: "presentation",
  xmlns: "http://www.w3.org/2000/svg",
  class: "snap-icon"
};
function wr(c, s) {
  return openBlock(), createElementBlock("svg", xr, [...s[0] || (s[0] = [
    createBaseVNode("g", null, [
      createBaseVNode("path", {
        d: "M11 22h2v-3h-2v3ZM6.106 4.416l1.415-1.414 2.121 2.122-1.414 1.414-2.122-2.122ZM16.48 3.002l1.414 1.414-2.122 2.122-1.414-1.414 2.122-2.122ZM11 2h2v3h-2V2Zm6.894 17.584-1.414 1.414-2.122-2.122 1.414-1.414 2.122 2.122ZM7.52 20.998l-1.414-1.414 2.122-2.122 1.414 1.415-2.121 2.12Z",
        fill: "currentColor"
      }),
      createBaseVNode("path", {
        d: "M4 16h16a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2Zm16-6h-7v4h7v-4ZM4 10h7v4H4v-4Z",
        "clip-rule": "evenodd",
        "fill-rule": "evenodd",
        fill: "currentColor"
      })
    ], -1)
  ])]);
}
const Tr = /* @__PURE__ */ At(Sr, [["render", wr], ["__scopeId", "data-v-dca9589a"]]), Cr = { class: "tools-bar" }, kr = { class: "tools-bar__section tools-bar__operations" }, Ur = ["disabled", "onClick"], Er = { class: "tools-bar__icon" }, Ir = { class: "tools-bar__label" }, Ar = ["disabled", "title", "onClick"], zr = { class: "tools-bar__icon" }, Fr = { class: "tools-bar__label" }, Br = { class: "tools-bar__section tools-bar__playback" }, Pr = { class: "tools-bar__time" }, Dr = { class: "tools-bar__time-current" }, Lr = { class: "tools-bar__time-duration" }, Mr = ["value"], Rr = { class: "tools-bar__section tools-bar__scale" }, Or = { class: "tools-bar__scale-config" }, Nr = ["title"], Gr = ["title", "disabled", "onClick"], Hr = { class: "tools-bar__scale-control" }, Yr = ["disabled"], $r = { class: "tools-bar__scale-slider" }, Vr = ["min", "max"], Wr = { class: "tools-bar__scale-value" }, jr = ["disabled"], Xr = /* @__PURE__ */ defineComponent({
  __name: "index",
  props: {
    operationButtons: { default: () => ["reset", "undo", "redo", "split", "delete"] },
    scaleConfigButtons: { default: () => ["snap"] },
    locale: { default: () => ({}) }
  },
  emits: ["operation", "playback:play", "playback:pause"],
  setup(c, { emit: s }) {
    const l = c, o = s, u = Ne(), h = Yt(), p = ti(), r = Ht(), S = inject("config", {}), x = computed(() => u.isPlaying), b = computed(() => u.formattedCurrentTime), I = computed(() => u.formattedDuration), y = computed(() => h.snapEnabled), A = computed(() => h.minScale), t = computed(() => h.maxScale), e = ref(u.playbackRate), n = computed(() => S.playbackRates || [0.5, 1, 2, 4]), a = ref(h.scale), d = computed(() => {
      var C;
      return ((C = l.locale) == null ? void 0 : C.snapOn) || "关闭自动吸附";
    }), f = computed(() => {
      var C;
      return ((C = l.locale) == null ? void 0 : C.snapOff) || "开启自动吸附";
    });
    function _(C) {
      return typeof C == "object" && "type" in C && C.type === "custom";
    }
    function v(C) {
      return typeof C == "object" && !("type" in C) && "key" in C;
    }
    function m(C) {
      return typeof C == "object" && !("type" in C) && "key" in C;
    }
    function T(C) {
      return typeof C == "object" || typeof C == "function";
    }
    function U(C) {
      const z = C.disabled;
      return typeof z == "function" ? z() : z ?? false;
    }
    function $(C) {
      const z = C.active;
      return typeof z == "function" ? z() : z ?? false;
    }
    function V(C) {
      C.onClick ? C.onClick() : C.key && o("operation", C.key);
    }
    function F(C) {
      C.onClick && C.onClick();
    }
    function Y(C) {
      return {
        reset: "↺",
        undo: "↶",
        redo: "↷",
        split: "✂",
        delete: "🗑"
      }[C] || "";
    }
    function W(C) {
      const z = l.locale || {}, O = {
        reset: "重置",
        undo: "撤销",
        redo: "重做",
        split: "分割",
        delete: "删除"
      };
      return z[C] || O[C] || C;
    }
    function ut(C) {
      switch (C) {
        case "undo":
          return !p.canUndo;
        case "redo":
          return !p.canRedo;
        case "split":
          return r.selectedClipIds.size === 0;
        default:
          return false;
      }
    }
    function _t(C) {
      o("operation", C);
    }
    function rt() {
      u.isPlaying ? (u.pause(), o("playback:pause")) : (u.play(), o("playback:play"));
    }
    function R() {
      u.setPlaybackRate(e.value);
    }
    function P() {
      h.toggleSnap();
    }
    function k() {
      h.zoomIn(0.1), a.value = h.scale;
    }
    function L() {
      h.zoomOut(0.1), a.value = h.scale;
    }
    function j() {
      h.setScale(a.value);
    }
    return (C, z) => (openBlock(), createElementBlock("div", Cr, [
      createBaseVNode("div", kr, [
        renderSlot(C.$slots, "operations-prepend", {}, void 0, true),
        (openBlock(true), createElementBlock(Fragment, null, renderList(c.operationButtons, (O, ft) => (openBlock(), createElementBlock(Fragment, { key: ft }, [
          typeof O == "string" ? (openBlock(), createElementBlock("button", {
            key: 0,
            class: normalizeClass(["tools-bar__btn", { "tools-bar__btn--disabled": ut(O) }]),
            disabled: ut(O),
            onClick: (D) => _t(O)
          }, [
            createBaseVNode("span", Er, toDisplayString(Y(O)), 1),
            createBaseVNode("span", Ir, toDisplayString(W(O)), 1)
          ], 10, Ur)) : _(O) ? renderSlot(C.$slots, `custom-operation-${O.key}`, { key: 1 }, void 0, true) : v(O) ? (openBlock(), createElementBlock("button", {
            key: 2,
            class: normalizeClass(["tools-bar__btn", [
              { "tools-bar__btn--disabled": U(O) },
              O.className
            ]]),
            disabled: U(O),
            title: O.title,
            onClick: (D) => V(O)
          }, [
            createBaseVNode("span", zr, [
              T(O.icon) ? (openBlock(), createBlock(resolveDynamicComponent(O.icon), { key: 0 })) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                createTextVNode(toDisplayString(O.icon || ""), 1)
              ], 64))
            ]),
            createBaseVNode("span", Fr, toDisplayString(O.label || ""), 1)
          ], 10, Ar)) : createCommentVNode("", true)
        ], 64))), 128)),
        renderSlot(C.$slots, "operations-append", {}, void 0, true)
      ]),
      createBaseVNode("div", Br, [
        renderSlot(C.$slots, "playback-prepend", {}, void 0, true),
        createBaseVNode("button", {
          class: "tools-bar__btn tools-bar__btn--play",
          onClick: rt
        }, [
          createBaseVNode("span", {
            class: "tools-bar__icon",
            style: normalizeStyle({ marginLeft: x.value ? "0" : "2px" })
          }, toDisplayString(x.value ? "⏸" : "▶"), 5)
        ]),
        createBaseVNode("div", Pr, [
          createBaseVNode("span", Dr, toDisplayString(b.value), 1),
          z[2] || (z[2] = createBaseVNode("span", { class: "tools-bar__time-separator" }, "/", -1)),
          createBaseVNode("span", Lr, toDisplayString(I.value), 1)
        ]),
        withDirectives(createBaseVNode("select", {
          "onUpdate:modelValue": z[0] || (z[0] = (O) => e.value = O),
          class: "tools-bar__select",
          onChange: R
        }, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(n.value, (O) => (openBlock(), createElementBlock("option", {
            key: O,
            value: O
          }, toDisplayString(O) + "x ", 9, Mr))), 128))
        ], 544), [
          [vModelSelect, e.value]
        ]),
        renderSlot(C.$slots, "playback-append", {}, void 0, true)
      ]),
      createBaseVNode("div", Rr, [
        renderSlot(C.$slots, "scale-prepend", {}, void 0, true),
        createBaseVNode("div", Or, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(c.scaleConfigButtons, (O, ft) => (openBlock(), createElementBlock(Fragment, { key: ft }, [
            typeof O == "string" && O === "snap" ? (openBlock(), createElementBlock("button", {
              key: 0,
              class: normalizeClass(["tools-bar__btn tools-bar__btn--toggle tools-bar__btn--snap", { "tools-bar__btn--active": y.value }]),
              title: y.value ? d.value : f.value,
              onClick: P
            }, [
              createVNode(Tr, { class: "tools-bar__snap-icon" })
            ], 10, Nr)) : _(O) ? renderSlot(C.$slots, `custom-scale-config-${O.key}`, { key: 1 }, void 0, true) : m(O) ? (openBlock(), createElementBlock("button", {
              key: 2,
              class: normalizeClass(["tools-bar__btn tools-bar__btn--toggle", [
                { "tools-bar__btn--active": $(O) },
                { "tools-bar__btn--disabled": U(O) },
                O.className
              ]]),
              title: O.title,
              disabled: U(O),
              onClick: (D) => F(O)
            }, [
              T(O.icon) ? (openBlock(), createBlock(resolveDynamicComponent(O.icon), { key: 0 })) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                createTextVNode(toDisplayString(O.icon || ""), 1)
              ], 64))
            ], 10, Gr)) : createCommentVNode("", true)
          ], 64))), 128))
        ]),
        createBaseVNode("div", Hr, [
          createBaseVNode("button", {
            class: "tools-bar__btn tools-bar__btn--icon",
            disabled: a.value <= A.value,
            onClick: L
          }, " − ", 8, Yr),
          createBaseVNode("div", $r, [
            withDirectives(createBaseVNode("input", {
              type: "range",
              min: A.value,
              max: t.value,
              step: 0.1,
              "onUpdate:modelValue": z[1] || (z[1] = (O) => a.value = O),
              onInput: j
            }, null, 40, Vr), [
              [
                vModelText,
                a.value,
                void 0,
                { number: true }
              ]
            ]),
            createBaseVNode("span", Wr, toDisplayString(a.value.toFixed(1)) + "x", 1)
          ]),
          createBaseVNode("button", {
            class: "tools-bar__btn tools-bar__btn--icon",
            disabled: a.value >= t.value,
            onClick: k
          }, " + ", 8, jr)
        ]),
        renderSlot(C.$slots, "scale-append", {}, void 0, true)
      ])
    ]));
  }
}), Zr = /* @__PURE__ */ At(Xr, [["__scopeId", "data-v-c36de3a3"]]), Kr = {
  key: 0,
  class: "ruler__mark-label"
}, Jr = /* @__PURE__ */ defineComponent({
  __name: "index",
  props: {
    width: { default: 0 },
    scrollLeft: { default: 0 },
    trackControlWidth: { default: 200 }
  },
  emits: ["scroll", "seek"],
  setup(c, { expose: s, emit: l }) {
    const o = c, u = l, h = Ne(), p = Yt(), r = Ht(), S = ei(), x = ref(), b = ref(), I = ref(false), y = ref(0);
    let A = null;
    s({
      isDraggingCursor: I
    });
    const t = computed(() => p.rulerConfig), e = computed(() => p.actualPixelsPerSecond), n = computed(() => {
      const F = Math.max(
        r.totalDuration,
        h.duration,
        S.previewEndTime,
        // 拖拽预览的结束时间
        60
        // 最少显示 60 秒
      );
      return Math.ceil(F * e.value);
    }), a = computed(() => {
      const F = [], Y = t.value, W = n.value / e.value, ut = Y.minorInterval, _t = Y.majorInterval, rt = Math.ceil(W / ut) + 1;
      for (let R = 0; R < rt; R++) {
        const P = R * ut;
        if (P > W) break;
        const k = Math.abs(Math.round(P / _t) * _t - P) < 1e-3;
        F.push({
          time: P,
          position: P * e.value,
          isMajor: k,
          height: k ? Y.majorHeight : Y.minorHeight
        });
      }
      return F;
    }), d = computed(() => h.currentTime * e.value), f = computed(() => o.trackControlWidth + d.value - (o.scrollLeft || 0)), _ = computed(() => f.value >= o.trackControlWidth);
    function v(F) {
      const Y = Math.floor(F / 60), W = Math.floor(F % 60);
      return `${String(Y).padStart(2, "0")}:${String(W).padStart(2, "0")}`;
    }
    function m(F) {
      var rt;
      if (I.value) return;
      const Y = (rt = x.value) == null ? void 0 : rt.getBoundingClientRect();
      if (!Y) return;
      const ut = (F.clientX - Y.left - o.trackControlWidth + (o.scrollLeft || 0)) / e.value, _t = Math.max(0, ut);
      h.seekTo(_t), u("seek", _t);
    }
    function T() {
      I.value = true, h.pause(), document.body.style.userSelect = "none";
      let F = null, Y = 0, W = 0;
      const ut = () => {
        I.value && (W !== 0 && b.value && (b.value.scrollLeft += W, u("scroll", b.value.scrollLeft), _t()), F = requestAnimationFrame(ut));
      }, _t = () => {
        var j;
        const P = (j = x.value) == null ? void 0 : j.getBoundingClientRect();
        if (!P || !b.value) return;
        let L = (Y - P.left - o.trackControlWidth + b.value.scrollLeft) / e.value;
        L = Math.max(0, L), h.seekTo(L);
      }, rt = (P) => {
        var L;
        Y = P.clientX;
        const k = (L = b.value) == null ? void 0 : L.getBoundingClientRect();
        if (k)
          if (P.clientX < k.left + 50) {
            const z = 1 - (P.clientX - k.left) / 50;
            W = -15 * Math.max(0, z);
          } else if (P.clientX > k.right - 50) {
            const z = 1 - (k.right - P.clientX) / 50;
            W = 15 * Math.max(0, z);
          } else
            W = 0;
        W === 0 && _t();
      }, R = () => {
        I.value = false, document.body.style.userSelect = "", F && (cancelAnimationFrame(F), F = null), document.removeEventListener("mousemove", rt), document.removeEventListener("mouseup", R), u("seek", h.currentTime);
      };
      document.addEventListener("mousemove", rt), document.addEventListener("mouseup", R), F = requestAnimationFrame(ut);
    }
    function U() {
      b.value && u("scroll", b.value.scrollLeft);
    }
    function $() {
      return x.value ? x.value.closest(".video-track") : null;
    }
    function V() {
      if (!x.value) return;
      const F = x.value.getBoundingClientRect(), Y = $(), W = Y ? Y.getBoundingClientRect().bottom : window.innerHeight, ut = F.top - 5;
      y.value = Math.max(W - ut, 0);
    }
    return onMounted(() => {
      nextTick(() => {
        V(), A = new ResizeObserver(() => {
          V();
        }), x.value && A.observe(x.value);
        const F = $();
        F && A.observe(F);
      }), window.addEventListener("resize", V);
    }), onUnmounted(() => {
      window.removeEventListener("resize", V), A && (A.disconnect(), A = null);
    }), watch(() => o.scrollLeft, (F) => {
      b.value && b.value.scrollLeft !== F && (b.value.scrollLeft = F);
    }), watch(d, (F) => {
      if (I.value || !b.value) return;
      const Y = b.value.clientWidth, W = b.value.scrollLeft;
      F < W ? b.value.scrollLeft = F : F > W + Y && (b.value.scrollLeft = F - Y + 50);
    }), (F, Y) => (openBlock(), createElementBlock("div", {
      class: "ruler",
      ref_key: "rulerRef",
      ref: x
    }, [
      createBaseVNode("div", {
        class: "ruler__placeholder",
        style: normalizeStyle({ width: c.trackControlWidth + "px" })
      }, null, 4),
      createBaseVNode("div", {
        class: "ruler__wrapper",
        ref_key: "rulerWrapperRef",
        ref: b,
        onScroll: U
      }, [
        createBaseVNode("div", {
          class: "ruler__content",
          style: normalizeStyle({ width: n.value + "px" }),
          onMousedown: m
        }, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(a.value, (W) => (openBlock(), createElementBlock("div", {
            key: W.time,
            class: normalizeClass(["ruler__mark", {
              "ruler__mark--major": W.isMajor
            }]),
            style: normalizeStyle({
              left: W.position + "px",
              height: W.height + "px"
            })
          }, [
            W.isMajor ? (openBlock(), createElementBlock("span", Kr, toDisplayString(v(W.time)), 1)) : createCommentVNode("", true)
          ], 6))), 128))
        ], 36)
      ], 544),
      _.value ? (openBlock(), createElementBlock("div", {
        key: 0,
        class: normalizeClass(["ruler__cursor-handle", { "ruler__cursor-handle--dragging": I.value }]),
        style: normalizeStyle({ left: f.value + "px" }),
        onMousedown: withModifiers(T, ["stop"])
      }, [
        createBaseVNode("div", {
          class: "ruler__cursor-line",
          style: normalizeStyle({ height: `${y.value}px` }),
          onMousedown: withModifiers(T, ["stop"])
        }, null, 36)
      ], 38)) : createCommentVNode("", true)
    ], 512));
  }
}), qr = /* @__PURE__ */ At(Jr, [["__scopeId", "data-v-f5735210"]]), Qr = { class: "track-control" }, ts = { class: "track-control__name" }, es = {
  key: 2,
  class: "track-control__badge"
}, is = { class: "track-control__actions" }, ns = ["title"], rs = ["title"], ss = ["title"], as = /* @__PURE__ */ defineComponent({
  __name: "TrackControl",
  props: {
    track: {},
    locale: {}
  },
  emits: ["update", "delete"],
  setup(c, { emit: s }) {
    const l = c, o = s, u = ref(false), h = ref(""), p = ref();
    function r() {
      u.value = true, h.value = l.track.name, nextTick(() => {
        var A, t;
        (A = p.value) == null || A.focus(), (t = p.value) == null || t.select();
      });
    }
    function S() {
      h.value.trim() && h.value !== l.track.name && o("update", l.track.id, { name: h.value.trim() }), u.value = false;
    }
    function x() {
      u.value = false, h.value = "";
    }
    function b() {
      o("update", l.track.id, { visible: !l.track.visible });
    }
    function I() {
      o("update", l.track.id, { locked: !l.track.locked });
    }
    function y() {
      var t;
      const A = (((t = l.locale) == null ? void 0 : t.confirmDeleteTrack) || '确定要删除轨道"{name}"吗？').replace("{name}", l.track.name);
      confirm(A) && o("delete", l.track.id);
    }
    return (A, t) => {
      var e, n, a, d, f, _;
      return openBlock(), createElementBlock("div", Qr, [
        createBaseVNode("div", ts, [
          u.value ? withDirectives((openBlock(), createElementBlock("input", {
            key: 0,
            "onUpdate:modelValue": t[0] || (t[0] = (v) => h.value = v),
            class: "track-control__name-input",
            onBlur: S,
            onKeyup: [
              withKeys(S, ["enter"]),
              withKeys(x, ["esc"])
            ],
            ref_key: "nameInputRef",
            ref: p
          }, null, 544)), [
            [vModelText, h.value]
          ]) : (openBlock(), createElementBlock("span", {
            key: 1,
            class: "track-control__name-text",
            onDblclick: r
          }, toDisplayString(c.track.name), 33)),
          c.track.isMain ? (openBlock(), createElementBlock("span", es, toDisplayString(((e = c.locale) == null ? void 0 : e.mainBadge) || "主"), 1)) : createCommentVNode("", true)
        ]),
        createBaseVNode("div", is, [
          createBaseVNode("button", {
            class: normalizeClass(["track-control__btn", { "track-control__btn--active": c.track.visible }]),
            onClick: b,
            title: c.track.visible ? ((n = c.locale) == null ? void 0 : n.hide) || "隐藏" : ((a = c.locale) == null ? void 0 : a.show) || "显示"
          }, toDisplayString(c.track.visible ? "👁" : "👁‍🗨"), 11, ns),
          createBaseVNode("button", {
            class: normalizeClass(["track-control__btn", { "track-control__btn--active": c.track.locked }]),
            onClick: I,
            title: c.track.locked ? ((d = c.locale) == null ? void 0 : d.unlock) || "解锁" : ((f = c.locale) == null ? void 0 : f.lock) || "锁定"
          }, toDisplayString(c.track.locked ? "🔒" : "🔓"), 11, rs),
          c.track.isMain ? createCommentVNode("", true) : (openBlock(), createElementBlock("button", {
            key: 0,
            class: "track-control__btn track-control__btn--danger",
            onClick: y,
            title: ((_ = c.locale) == null ? void 0 : _.delete) || "删除"
          }, " 🗑 ", 8, ss))
        ])
      ]);
    };
  }
}), os = /* @__PURE__ */ At(as, [["__scopeId", "data-v-34ea43ab"]]);
function ls() {
  const c = Ht(), s = Yt(), l = ti(), o = ref(false), u = ref(null), h = ref("left"), p = ref(0), r = ref(0), S = ref(0), x = ref(0), b = ref(0);
  let I = document;
  const y = ref([]), A = ref([]);
  function t(R, P, k) {
    var L;
    if (R.type === "transition") {
      v(R, P, k);
      return;
    }
    if (I = ((L = k.target) == null ? void 0 : L.ownerDocument) || document, o.value = true, u.value = R, h.value = P, p.value = k.clientX, r.value = R.startTime, S.value = R.endTime, R.type === "video" || R.type === "audio") {
      const j = R;
      x.value = j.trimStart, b.value = j.trimEnd;
    }
    e(R, P), I.addEventListener("mousemove", V), I.addEventListener("mouseup", _t);
  }
  function e(R, P) {
    y.value = [], A.value = [];
    const k = c.tracks.find((L) => L.id === R.trackId);
    if (k)
      if (P === "right") {
        const L = /* @__PURE__ */ new Set([R.id]);
        n(k.clips, R.endTime, L);
      } else {
        const L = /* @__PURE__ */ new Set([R.id]);
        a(k.clips, R.startTime, L);
      }
  }
  function n(R, P, k) {
    const L = R.find((C) => {
      if (C.type !== "transition") return false;
      const z = C, O = (z.startTime + z.endTime) / 2;
      return Math.abs(O - P) < z.transitionDuration && z.startTime >= P - z.transitionDuration;
    });
    if (!L) return;
    y.value.push({
      id: L.id,
      type: "transition",
      originalStartTime: L.startTime,
      originalEndTime: L.endTime,
      duration: L.transitionDuration
    });
    const j = R.find(
      (C) => C.type !== "transition" && !k.has(C.id) && // clip 的开始时间应该接近当前结束时间
      Math.abs(C.startTime - P) < L.transitionDuration + 0.5
    );
    j && (y.value.push({
      id: j.id,
      type: "clip",
      originalStartTime: j.startTime,
      originalEndTime: j.endTime,
      duration: j.endTime - j.startTime
    }), k.add(j.id), n(R, j.endTime, k));
  }
  function a(R, P, k) {
    const L = R.find((C) => {
      if (C.type !== "transition") return false;
      const z = C, O = (z.startTime + z.endTime) / 2;
      return Math.abs(O - P) < z.transitionDuration && z.endTime <= P + z.transitionDuration;
    });
    if (!L) return;
    A.value.push({
      id: L.id,
      type: "transition",
      originalStartTime: L.startTime,
      originalEndTime: L.endTime,
      duration: L.transitionDuration
    });
    const j = R.find(
      (C) => C.type !== "transition" && !k.has(C.id) && Math.abs(C.endTime - P) < L.transitionDuration + 0.5
    );
    j && A.value.push({
      id: j.id,
      type: "clip",
      originalStartTime: j.startTime,
      originalEndTime: j.endTime,
      duration: j.endTime - j.startTime
    });
  }
  const d = ref(null), f = ref("left"), _ = ref(0);
  function v(R, P, k) {
    var L;
    I = ((L = k.target) == null ? void 0 : L.ownerDocument) || document, o.value = true, d.value = R, f.value = P, p.value = k.clientX, _.value = R.transitionDuration, I.addEventListener("mousemove", m), I.addEventListener("mouseup", T);
  }
  function m(R) {
    if (!o.value || !d.value) return;
    $.value.shift = R.shiftKey;
    const P = R.clientX - p.value, k = s.pixelsToTime(P), L = f.value === "left" ? -k * 2 : k * 2;
    let j = _.value + L;
    j = Math.max(0.1, Math.min(5, j)), U(d.value, j);
  }
  function T() {
    o.value && l.pushSnapshot("调整转场时长"), o.value = false, d.value = null, I.removeEventListener("mousemove", m), I.removeEventListener("mouseup", T);
  }
  function U(R, P) {
    const k = c.tracks.find((z) => z.id === R.trackId);
    if (!k) return;
    const L = (R.startTime + R.endTime) / 2, j = k.clips.find(
      (z) => z.type !== "transition" && Math.abs(z.endTime - L) < 0.5
    ), C = k.clips.find(
      (z) => z.type !== "transition" && z !== j && Math.abs(z.startTime - L) < 0.5
    );
    if (j && C) {
      const z = ct(L - P / 2), O = ct(L + P / 2), ft = ct(L), D = ct(P);
      c.updateClip(R.id, {
        startTime: z,
        endTime: O,
        transitionDuration: D
      }), c.updateClip(j.id, {
        endTime: ft
      }), c.updateClip(C.id, {
        startTime: ft
      });
    }
  }
  const $ = ref({ shift: false });
  function V(R) {
    if (!o.value || !u.value) return;
    $.value.shift = R.shiftKey;
    const P = R.clientX - p.value, k = s.pixelsToTime(P);
    h.value === "left" ? F(k) : W(k);
  }
  function F(R) {
    if (!u.value) return;
    let P = ct(r.value + R);
    const k = 0.1, L = S.value - k;
    if (P = Math.max(0, Math.min(P, L)), !(A.value.length > 0 && A.value[0].type === "transition")) {
      const z = c.tracks.find(
        (O) => O.id === u.value.trackId
      );
      if (z) {
        const O = z.clips.filter((ft) => ft.type !== "transition" && ft.id !== u.value.id).find((ft) => ft.endTime <= r.value + 0.01 && ft.endTime > P);
        O && (P = Math.max(P, O.endTime));
      }
    }
    let C = 0;
    if (u.value.type === "video" || u.value.type === "audio") {
      u.value;
      const z = P - r.value;
      C = ct(x.value + z), C < 0 && (P = ct(r.value - x.value), C = 0);
      const O = b.value;
      C > O - k && (C = O - k, P = ct(r.value + (C - x.value)));
    }
    if (s.snapEnabled) {
      const z = rt(P);
      if (z !== P && (u.value.type === "video" || u.value.type === "audio")) {
        const O = z - P;
        C = ct(C + O), C < 0 && (C = 0);
      }
      P = z;
    }
    u.value.type === "video" || u.value.type === "audio" ? c.updateClip(u.value.id, {
      startTime: P,
      trimStart: Math.max(0, C)
    }) : c.updateClip(u.value.id, {
      startTime: P
    }), Y(P);
  }
  function Y(R) {
    if (A.value.length === 0) return;
    const P = S.value - R;
    let k = R;
    for (let L = 0; L < A.value.length; L++) {
      const j = A.value[L];
      if (j.type === "transition") {
        let C = j.duration;
        const z = C / 2, O = A.value[L + 1];
        let ft = O ? O.duration : 1 / 0;
        P < z && (C = Math.max(0.1, P * 2)), O && (ft = k - O.originalStartTime, ft < C / 2 && (C = Math.max(0.1, ft * 2)));
        const D = k;
        c.updateClip(j.id, {
          startTime: ct(D - C / 2),
          endTime: ct(D + C / 2),
          transitionDuration: ct(C)
        }), j.duration = C;
      } else
        c.updateClip(j.id, {
          endTime: ct(k)
        });
    }
  }
  function W(R) {
    if (!u.value) return;
    let P = ct(S.value + R);
    const k = 0.1, L = r.value + k;
    if (P = Math.max(L, P), !(y.value.length > 0 && y.value[0].type === "transition")) {
      const z = c.tracks.find(
        (O) => O.id === u.value.trackId
      );
      if (z) {
        const O = z.clips.filter((ft) => ft.type !== "transition" && ft.id !== u.value.id).find((ft) => ft.startTime >= S.value - 0.01 && ft.startTime < P);
        O && (P = Math.min(P, O.startTime));
      }
    }
    let C = 0;
    if (u.value.type === "video" || u.value.type === "audio") {
      const z = u.value, O = P - S.value;
      C = ct(b.value + O), C > z.originalDuration && (C = z.originalDuration, P = ct(S.value + (C - b.value)));
      const ft = x.value;
      C < ft + k && (C = ft + k, P = ct(S.value + (C - b.value)));
    }
    if (s.snapEnabled) {
      const z = rt(P);
      if (z !== P && (u.value.type === "video" || u.value.type === "audio")) {
        const O = u.value, ft = z - P;
        C = ct(C + ft), C > O.originalDuration && (C = O.originalDuration);
      }
      P = z;
    }
    if (u.value.type === "video" || u.value.type === "audio") {
      const z = u.value;
      c.updateClip(u.value.id, {
        endTime: P,
        trimEnd: Math.min(C, z.originalDuration)
      });
    } else
      c.updateClip(u.value.id, {
        endTime: P
      });
    ut(P);
  }
  function ut(R) {
    if (y.value.length === 0) return;
    const P = R - r.value;
    let k = R, L = P;
    for (let j = 0; j < y.value.length; j++) {
      const C = y.value[j];
      if (C.type === "transition") {
        let z = C.duration;
        const O = z / 2, ft = y.value[j + 1], D = ft ? ft.duration : 1 / 0;
        L < O && (z = Math.max(0.1, L * 2)), D < z / 2 && (z = Math.max(0.1, D * 2));
        const M = k;
        c.updateClip(C.id, {
          startTime: ct(M - z / 2),
          endTime: ct(M + z / 2),
          transitionDuration: ct(z)
        }), C.duration = z;
      } else {
        const z = k, O = z + C.duration;
        c.updateClip(C.id, {
          startTime: ct(z),
          endTime: ct(O)
        }), k = O, L = C.duration;
      }
    }
  }
  function _t() {
    o.value && l.pushSnapshot("调整片段时长"), o.value = false, u.value = null, y.value = [], A.value = [], I.removeEventListener("mousemove", V), I.removeEventListener("mouseup", _t);
  }
  function rt(R) {
    if ($.value.shift || !s.snapEnabled)
      return R;
    const P = c.tracks.find((O) => O.id === u.value.trackId);
    if (!P) return R;
    const k = /* @__PURE__ */ new Set();
    y.value.forEach((O) => k.add(O.id)), A.value.forEach((O) => k.add(O.id));
    const L = [], j = new Set(c.selectedClipIds);
    if (P.clips.forEach((O) => {
      O.id !== u.value.id && !j.has(O.id) && !k.has(O.id) && O.type !== "transition" && (L.push(O.startTime), L.push(O.endTime));
    }), L.length === 0)
      return R;
    const C = s.timeToPixels(R), z = s.snapToPosition(
      C,
      L.map((O) => s.timeToPixels(O))
    );
    return ct(s.pixelsToTime(z));
  }
  return {
    isResizing: o,
    resizingClip: u,
    resizingEdge: h,
    startResize: t,
    handleResizeMove: V,
    handleResizeEnd: _t
  };
}
function cs(c) {
  return c && c.__esModule && Object.prototype.hasOwnProperty.call(c, "default") ? c.default : c;
}
var zn = {};
(function(c) {
  var s = /* @__PURE__ */ function() {
    var t = /* @__PURE__ */ new Date(), e = 4, n = 3, a = 2, d = 1, f = e, _ = {
      setLogLevel: function(v) {
        v == this.debug ? f = d : v == this.info ? f = a : v == this.warn ? f = n : (v == this.error, f = e);
      },
      debug: function(v, m) {
        console.debug === void 0 && (console.debug = console.log), d >= f && console.debug("[" + s.getDurationString(/* @__PURE__ */ new Date() - t, 1e3) + "]", "[" + v + "]", m);
      },
      log: function(v, m) {
        this.debug(v.msg);
      },
      info: function(v, m) {
        a >= f && console.info("[" + s.getDurationString(/* @__PURE__ */ new Date() - t, 1e3) + "]", "[" + v + "]", m);
      },
      warn: function(v, m) {
        n >= f && console.warn("[" + s.getDurationString(/* @__PURE__ */ new Date() - t, 1e3) + "]", "[" + v + "]", m);
      },
      error: function(v, m) {
        e >= f && console.error("[" + s.getDurationString(/* @__PURE__ */ new Date() - t, 1e3) + "]", "[" + v + "]", m);
      }
    };
    return _;
  }();
  s.getDurationString = function(t, e) {
    var n;
    function a(T, U) {
      for (var $ = "" + T, V = $.split("."); V[0].length < U; )
        V[0] = "0" + V[0];
      return V.join(".");
    }
    t < 0 ? (n = true, t = -t) : n = false;
    var d = e || 1, f = t / d, _ = Math.floor(f / 3600);
    f -= _ * 3600;
    var v = Math.floor(f / 60);
    f -= v * 60;
    var m = f * 1e3;
    return f = Math.floor(f), m -= f * 1e3, m = Math.floor(m), (n ? "-" : "") + _ + ":" + a(v, 2) + ":" + a(f, 2) + "." + a(m, 3);
  }, s.printRanges = function(t) {
    var e = t.length;
    if (e > 0) {
      for (var n = "", a = 0; a < e; a++)
        a > 0 && (n += ","), n += "[" + s.getDurationString(t.start(a)) + "," + s.getDurationString(t.end(a)) + "]";
      return n;
    } else
      return "(empty)";
  }, c.Log = s;
  var l = function(t) {
    if (t instanceof ArrayBuffer)
      this.buffer = t, this.dataview = new DataView(t);
    else
      throw "Needs an array buffer";
    this.position = 0;
  };
  l.prototype.getPosition = function() {
    return this.position;
  }, l.prototype.getEndPosition = function() {
    return this.buffer.byteLength;
  }, l.prototype.getLength = function() {
    return this.buffer.byteLength;
  }, l.prototype.seek = function(t) {
    var e = Math.max(0, Math.min(this.buffer.byteLength, t));
    return this.position = isNaN(e) || !isFinite(e) ? 0 : e, true;
  }, l.prototype.isEos = function() {
    return this.getPosition() >= this.getEndPosition();
  }, l.prototype.readAnyInt = function(t, e) {
    var n = 0;
    if (this.position + t <= this.buffer.byteLength) {
      switch (t) {
        case 1:
          e ? n = this.dataview.getInt8(this.position) : n = this.dataview.getUint8(this.position);
          break;
        case 2:
          e ? n = this.dataview.getInt16(this.position) : n = this.dataview.getUint16(this.position);
          break;
        case 3:
          if (e)
            throw "No method for reading signed 24 bits values";
          n = this.dataview.getUint8(this.position) << 16, n |= this.dataview.getUint8(this.position + 1) << 8, n |= this.dataview.getUint8(this.position + 2);
          break;
        case 4:
          e ? n = this.dataview.getInt32(this.position) : n = this.dataview.getUint32(this.position);
          break;
        case 8:
          if (e)
            throw "No method for reading signed 64 bits values";
          n = this.dataview.getUint32(this.position) << 32, n |= this.dataview.getUint32(this.position + 4);
          break;
        default:
          throw "readInt method not implemented for size: " + t;
      }
      return this.position += t, n;
    } else
      throw "Not enough bytes in buffer";
  }, l.prototype.readUint8 = function() {
    return this.readAnyInt(1, false);
  }, l.prototype.readUint16 = function() {
    return this.readAnyInt(2, false);
  }, l.prototype.readUint24 = function() {
    return this.readAnyInt(3, false);
  }, l.prototype.readUint32 = function() {
    return this.readAnyInt(4, false);
  }, l.prototype.readUint64 = function() {
    return this.readAnyInt(8, false);
  }, l.prototype.readString = function(t) {
    if (this.position + t <= this.buffer.byteLength) {
      for (var e = "", n = 0; n < t; n++)
        e += String.fromCharCode(this.readUint8());
      return e;
    } else
      throw "Not enough bytes in buffer";
  }, l.prototype.readCString = function() {
    for (var t = []; ; ) {
      var e = this.readUint8();
      if (e !== 0)
        t.push(e);
      else
        break;
    }
    return String.fromCharCode.apply(null, t);
  }, l.prototype.readInt8 = function() {
    return this.readAnyInt(1, true);
  }, l.prototype.readInt16 = function() {
    return this.readAnyInt(2, true);
  }, l.prototype.readInt32 = function() {
    return this.readAnyInt(4, true);
  }, l.prototype.readInt64 = function() {
    return this.readAnyInt(8, false);
  }, l.prototype.readUint8Array = function(t) {
    for (var e = new Uint8Array(t), n = 0; n < t; n++)
      e[n] = this.readUint8();
    return e;
  }, l.prototype.readInt16Array = function(t) {
    for (var e = new Int16Array(t), n = 0; n < t; n++)
      e[n] = this.readInt16();
    return e;
  }, l.prototype.readUint16Array = function(t) {
    for (var e = new Int16Array(t), n = 0; n < t; n++)
      e[n] = this.readUint16();
    return e;
  }, l.prototype.readUint32Array = function(t) {
    for (var e = new Uint32Array(t), n = 0; n < t; n++)
      e[n] = this.readUint32();
    return e;
  }, l.prototype.readInt32Array = function(t) {
    for (var e = new Int32Array(t), n = 0; n < t; n++)
      e[n] = this.readInt32();
    return e;
  }, c.MP4BoxStream = l;
  var o = function(t, e, n) {
    this._byteOffset = e || 0, t instanceof ArrayBuffer ? this.buffer = t : typeof t == "object" ? (this.dataView = t, e && (this._byteOffset += e)) : this.buffer = new ArrayBuffer(t || 0), this.position = 0, this.endianness = n ?? o.LITTLE_ENDIAN;
  };
  o.prototype = {}, o.prototype.getPosition = function() {
    return this.position;
  }, o.prototype._realloc = function(t) {
    if (this._dynamicSize) {
      var e = this._byteOffset + this.position + t, n = this._buffer.byteLength;
      if (e <= n) {
        e > this._byteLength && (this._byteLength = e);
        return;
      }
      for (n < 1 && (n = 1); e > n; )
        n *= 2;
      var a = new ArrayBuffer(n), d = new Uint8Array(this._buffer), f = new Uint8Array(a, 0, d.length);
      f.set(d), this.buffer = a, this._byteLength = e;
    }
  }, o.prototype._trimAlloc = function() {
    if (this._byteLength != this._buffer.byteLength) {
      var t = new ArrayBuffer(this._byteLength), e = new Uint8Array(t), n = new Uint8Array(this._buffer, 0, e.length);
      e.set(n), this.buffer = t;
    }
  }, o.BIG_ENDIAN = false, o.LITTLE_ENDIAN = true, o.prototype._byteLength = 0, Object.defineProperty(
    o.prototype,
    "byteLength",
    { get: function() {
      return this._byteLength - this._byteOffset;
    } }
  ), Object.defineProperty(
    o.prototype,
    "buffer",
    {
      get: function() {
        return this._trimAlloc(), this._buffer;
      },
      set: function(t) {
        this._buffer = t, this._dataView = new DataView(this._buffer, this._byteOffset), this._byteLength = this._buffer.byteLength;
      }
    }
  ), Object.defineProperty(
    o.prototype,
    "byteOffset",
    {
      get: function() {
        return this._byteOffset;
      },
      set: function(t) {
        this._byteOffset = t, this._dataView = new DataView(this._buffer, this._byteOffset), this._byteLength = this._buffer.byteLength;
      }
    }
  ), Object.defineProperty(
    o.prototype,
    "dataView",
    {
      get: function() {
        return this._dataView;
      },
      set: function(t) {
        this._byteOffset = t.byteOffset, this._buffer = t.buffer, this._dataView = new DataView(this._buffer, this._byteOffset), this._byteLength = this._byteOffset + t.byteLength;
      }
    }
  ), o.prototype.seek = function(t) {
    var e = Math.max(0, Math.min(this.byteLength, t));
    this.position = isNaN(e) || !isFinite(e) ? 0 : e;
  }, o.prototype.isEof = function() {
    return this.position >= this._byteLength;
  }, o.prototype.mapUint8Array = function(t) {
    this._realloc(t * 1);
    var e = new Uint8Array(this._buffer, this.byteOffset + this.position, t);
    return this.position += t * 1, e;
  }, o.prototype.readInt32Array = function(t, e) {
    t = t ?? this.byteLength - this.position / 4;
    var n = new Int32Array(t);
    return o.memcpy(
      n.buffer,
      0,
      this.buffer,
      this.byteOffset + this.position,
      t * n.BYTES_PER_ELEMENT
    ), o.arrayToNative(n, e ?? this.endianness), this.position += n.byteLength, n;
  }, o.prototype.readInt16Array = function(t, e) {
    t = t ?? this.byteLength - this.position / 2;
    var n = new Int16Array(t);
    return o.memcpy(
      n.buffer,
      0,
      this.buffer,
      this.byteOffset + this.position,
      t * n.BYTES_PER_ELEMENT
    ), o.arrayToNative(n, e ?? this.endianness), this.position += n.byteLength, n;
  }, o.prototype.readInt8Array = function(t) {
    t = t ?? this.byteLength - this.position;
    var e = new Int8Array(t);
    return o.memcpy(
      e.buffer,
      0,
      this.buffer,
      this.byteOffset + this.position,
      t * e.BYTES_PER_ELEMENT
    ), this.position += e.byteLength, e;
  }, o.prototype.readUint32Array = function(t, e) {
    t = t ?? this.byteLength - this.position / 4;
    var n = new Uint32Array(t);
    return o.memcpy(
      n.buffer,
      0,
      this.buffer,
      this.byteOffset + this.position,
      t * n.BYTES_PER_ELEMENT
    ), o.arrayToNative(n, e ?? this.endianness), this.position += n.byteLength, n;
  }, o.prototype.readUint16Array = function(t, e) {
    t = t ?? this.byteLength - this.position / 2;
    var n = new Uint16Array(t);
    return o.memcpy(
      n.buffer,
      0,
      this.buffer,
      this.byteOffset + this.position,
      t * n.BYTES_PER_ELEMENT
    ), o.arrayToNative(n, e ?? this.endianness), this.position += n.byteLength, n;
  }, o.prototype.readUint8Array = function(t) {
    t = t ?? this.byteLength - this.position;
    var e = new Uint8Array(t);
    return o.memcpy(
      e.buffer,
      0,
      this.buffer,
      this.byteOffset + this.position,
      t * e.BYTES_PER_ELEMENT
    ), this.position += e.byteLength, e;
  }, o.prototype.readFloat64Array = function(t, e) {
    t = t ?? this.byteLength - this.position / 8;
    var n = new Float64Array(t);
    return o.memcpy(
      n.buffer,
      0,
      this.buffer,
      this.byteOffset + this.position,
      t * n.BYTES_PER_ELEMENT
    ), o.arrayToNative(n, e ?? this.endianness), this.position += n.byteLength, n;
  }, o.prototype.readFloat32Array = function(t, e) {
    t = t ?? this.byteLength - this.position / 4;
    var n = new Float32Array(t);
    return o.memcpy(
      n.buffer,
      0,
      this.buffer,
      this.byteOffset + this.position,
      t * n.BYTES_PER_ELEMENT
    ), o.arrayToNative(n, e ?? this.endianness), this.position += n.byteLength, n;
  }, o.prototype.readInt32 = function(t) {
    var e = this._dataView.getInt32(this.position, t ?? this.endianness);
    return this.position += 4, e;
  }, o.prototype.readInt16 = function(t) {
    var e = this._dataView.getInt16(this.position, t ?? this.endianness);
    return this.position += 2, e;
  }, o.prototype.readInt8 = function() {
    var t = this._dataView.getInt8(this.position);
    return this.position += 1, t;
  }, o.prototype.readUint32 = function(t) {
    var e = this._dataView.getUint32(this.position, t ?? this.endianness);
    return this.position += 4, e;
  }, o.prototype.readUint16 = function(t) {
    var e = this._dataView.getUint16(this.position, t ?? this.endianness);
    return this.position += 2, e;
  }, o.prototype.readUint8 = function() {
    var t = this._dataView.getUint8(this.position);
    return this.position += 1, t;
  }, o.prototype.readFloat32 = function(t) {
    var e = this._dataView.getFloat32(this.position, t ?? this.endianness);
    return this.position += 4, e;
  }, o.prototype.readFloat64 = function(t) {
    var e = this._dataView.getFloat64(this.position, t ?? this.endianness);
    return this.position += 8, e;
  }, o.endianness = new Int8Array(new Int16Array([1]).buffer)[0] > 0, o.memcpy = function(t, e, n, a, d) {
    var f = new Uint8Array(t, e, d), _ = new Uint8Array(n, a, d);
    f.set(_);
  }, o.arrayToNative = function(t, e) {
    return e == this.endianness ? t : this.flipArrayEndianness(t);
  }, o.nativeToEndian = function(t, e) {
    return this.endianness == e ? t : this.flipArrayEndianness(t);
  }, o.flipArrayEndianness = function(t) {
    for (var e = new Uint8Array(t.buffer, t.byteOffset, t.byteLength), n = 0; n < t.byteLength; n += t.BYTES_PER_ELEMENT)
      for (var a = n + t.BYTES_PER_ELEMENT - 1, d = n; a > d; a--, d++) {
        var f = e[d];
        e[d] = e[a], e[a] = f;
      }
    return t;
  }, o.prototype.failurePosition = 0, String.fromCharCodeUint8 = function(t) {
    for (var e = [], n = 0; n < t.length; n++)
      e[n] = t[n];
    return String.fromCharCode.apply(null, e);
  }, o.prototype.readString = function(t, e) {
    return e == null || e == "ASCII" ? String.fromCharCodeUint8.apply(null, [this.mapUint8Array(t ?? this.byteLength - this.position)]) : new TextDecoder(e).decode(this.mapUint8Array(t));
  }, o.prototype.readCString = function(t) {
    var e = this.byteLength - this.position, n = new Uint8Array(this._buffer, this._byteOffset + this.position), a = e;
    t != null && (a = Math.min(t, e));
    for (var d = 0; d < a && n[d] !== 0; d++) ;
    var f = String.fromCharCodeUint8.apply(null, [this.mapUint8Array(d)]);
    return t != null ? this.position += a - d : d != e && (this.position += 1), f;
  };
  var u = Math.pow(2, 32);
  o.prototype.readInt64 = function() {
    return this.readInt32() * u + this.readUint32();
  }, o.prototype.readUint64 = function() {
    return this.readUint32() * u + this.readUint32();
  }, o.prototype.readInt64 = function() {
    return this.readUint32() * u + this.readUint32();
  }, o.prototype.readUint24 = function() {
    return (this.readUint8() << 16) + (this.readUint8() << 8) + this.readUint8();
  }, c.DataStream = o, o.prototype.save = function(t) {
    var e = new Blob([this.buffer]);
    if (window.URL && URL.createObjectURL) {
      var n = window.URL.createObjectURL(e), a = document.createElement("a");
      document.body.appendChild(a), a.setAttribute("href", n), a.setAttribute("download", t), a.setAttribute("target", "_self"), a.click(), window.URL.revokeObjectURL(n);
    } else
      throw "DataStream.save: Can't create object URL.";
  }, o.prototype._dynamicSize = true, Object.defineProperty(
    o.prototype,
    "dynamicSize",
    {
      get: function() {
        return this._dynamicSize;
      },
      set: function(t) {
        t || this._trimAlloc(), this._dynamicSize = t;
      }
    }
  ), o.prototype.shift = function(t) {
    var e = new ArrayBuffer(this._byteLength - t), n = new Uint8Array(e), a = new Uint8Array(this._buffer, t, n.length);
    n.set(a), this.buffer = e, this.position -= t;
  }, o.prototype.writeInt32Array = function(t, e) {
    if (this._realloc(t.length * 4), t instanceof Int32Array && this.byteOffset + this.position % t.BYTES_PER_ELEMENT === 0)
      o.memcpy(
        this._buffer,
        this.byteOffset + this.position,
        t.buffer,
        0,
        t.byteLength
      ), this.mapInt32Array(t.length, e);
    else
      for (var n = 0; n < t.length; n++)
        this.writeInt32(t[n], e);
  }, o.prototype.writeInt16Array = function(t, e) {
    if (this._realloc(t.length * 2), t instanceof Int16Array && this.byteOffset + this.position % t.BYTES_PER_ELEMENT === 0)
      o.memcpy(
        this._buffer,
        this.byteOffset + this.position,
        t.buffer,
        0,
        t.byteLength
      ), this.mapInt16Array(t.length, e);
    else
      for (var n = 0; n < t.length; n++)
        this.writeInt16(t[n], e);
  }, o.prototype.writeInt8Array = function(t) {
    if (this._realloc(t.length * 1), t instanceof Int8Array && this.byteOffset + this.position % t.BYTES_PER_ELEMENT === 0)
      o.memcpy(
        this._buffer,
        this.byteOffset + this.position,
        t.buffer,
        0,
        t.byteLength
      ), this.mapInt8Array(t.length);
    else
      for (var e = 0; e < t.length; e++)
        this.writeInt8(t[e]);
  }, o.prototype.writeUint32Array = function(t, e) {
    if (this._realloc(t.length * 4), t instanceof Uint32Array && this.byteOffset + this.position % t.BYTES_PER_ELEMENT === 0)
      o.memcpy(
        this._buffer,
        this.byteOffset + this.position,
        t.buffer,
        0,
        t.byteLength
      ), this.mapUint32Array(t.length, e);
    else
      for (var n = 0; n < t.length; n++)
        this.writeUint32(t[n], e);
  }, o.prototype.writeUint16Array = function(t, e) {
    if (this._realloc(t.length * 2), t instanceof Uint16Array && this.byteOffset + this.position % t.BYTES_PER_ELEMENT === 0)
      o.memcpy(
        this._buffer,
        this.byteOffset + this.position,
        t.buffer,
        0,
        t.byteLength
      ), this.mapUint16Array(t.length, e);
    else
      for (var n = 0; n < t.length; n++)
        this.writeUint16(t[n], e);
  }, o.prototype.writeUint8Array = function(t) {
    if (this._realloc(t.length * 1), t instanceof Uint8Array && this.byteOffset + this.position % t.BYTES_PER_ELEMENT === 0)
      o.memcpy(
        this._buffer,
        this.byteOffset + this.position,
        t.buffer,
        0,
        t.byteLength
      ), this.mapUint8Array(t.length);
    else
      for (var e = 0; e < t.length; e++)
        this.writeUint8(t[e]);
  }, o.prototype.writeFloat64Array = function(t, e) {
    if (this._realloc(t.length * 8), t instanceof Float64Array && this.byteOffset + this.position % t.BYTES_PER_ELEMENT === 0)
      o.memcpy(
        this._buffer,
        this.byteOffset + this.position,
        t.buffer,
        0,
        t.byteLength
      ), this.mapFloat64Array(t.length, e);
    else
      for (var n = 0; n < t.length; n++)
        this.writeFloat64(t[n], e);
  }, o.prototype.writeFloat32Array = function(t, e) {
    if (this._realloc(t.length * 4), t instanceof Float32Array && this.byteOffset + this.position % t.BYTES_PER_ELEMENT === 0)
      o.memcpy(
        this._buffer,
        this.byteOffset + this.position,
        t.buffer,
        0,
        t.byteLength
      ), this.mapFloat32Array(t.length, e);
    else
      for (var n = 0; n < t.length; n++)
        this.writeFloat32(t[n], e);
  }, o.prototype.writeInt32 = function(t, e) {
    this._realloc(4), this._dataView.setInt32(this.position, t, e ?? this.endianness), this.position += 4;
  }, o.prototype.writeInt16 = function(t, e) {
    this._realloc(2), this._dataView.setInt16(this.position, t, e ?? this.endianness), this.position += 2;
  }, o.prototype.writeInt8 = function(t) {
    this._realloc(1), this._dataView.setInt8(this.position, t), this.position += 1;
  }, o.prototype.writeUint32 = function(t, e) {
    this._realloc(4), this._dataView.setUint32(this.position, t, e ?? this.endianness), this.position += 4;
  }, o.prototype.writeUint16 = function(t, e) {
    this._realloc(2), this._dataView.setUint16(this.position, t, e ?? this.endianness), this.position += 2;
  }, o.prototype.writeUint8 = function(t) {
    this._realloc(1), this._dataView.setUint8(this.position, t), this.position += 1;
  }, o.prototype.writeFloat32 = function(t, e) {
    this._realloc(4), this._dataView.setFloat32(this.position, t, e ?? this.endianness), this.position += 4;
  }, o.prototype.writeFloat64 = function(t, e) {
    this._realloc(8), this._dataView.setFloat64(this.position, t, e ?? this.endianness), this.position += 8;
  }, o.prototype.writeUCS2String = function(t, e, n) {
    n == null && (n = t.length);
    for (var a = 0; a < t.length && a < n; a++)
      this.writeUint16(t.charCodeAt(a), e);
    for (; a < n; a++)
      this.writeUint16(0);
  }, o.prototype.writeString = function(t, e, n) {
    var a = 0;
    if (e == null || e == "ASCII")
      if (n != null) {
        var d = Math.min(t.length, n);
        for (a = 0; a < d; a++)
          this.writeUint8(t.charCodeAt(a));
        for (; a < n; a++)
          this.writeUint8(0);
      } else
        for (a = 0; a < t.length; a++)
          this.writeUint8(t.charCodeAt(a));
    else
      this.writeUint8Array(new TextEncoder(e).encode(t.substring(0, n)));
  }, o.prototype.writeCString = function(t, e) {
    var n = 0;
    if (e != null) {
      var a = Math.min(t.length, e);
      for (n = 0; n < a; n++)
        this.writeUint8(t.charCodeAt(n));
      for (; n < e; n++)
        this.writeUint8(0);
    } else {
      for (n = 0; n < t.length; n++)
        this.writeUint8(t.charCodeAt(n));
      this.writeUint8(0);
    }
  }, o.prototype.writeStruct = function(t, e) {
    for (var n = 0; n < t.length; n += 2) {
      var a = t[n + 1];
      this.writeType(a, e[t[n]], e);
    }
  }, o.prototype.writeType = function(t, e, n) {
    var a;
    if (typeof t == "function")
      return t(this, e);
    if (typeof t == "object" && !(t instanceof Array))
      return t.set(this, e, n);
    var d = null, f = "ASCII", _ = this.position;
    switch (typeof t == "string" && /:/.test(t) && (a = t.split(":"), t = a[0], d = parseInt(a[1])), typeof t == "string" && /,/.test(t) && (a = t.split(","), t = a[0], f = parseInt(a[1])), t) {
      case "uint8":
        this.writeUint8(e);
        break;
      case "int8":
        this.writeInt8(e);
        break;
      case "uint16":
        this.writeUint16(e, this.endianness);
        break;
      case "int16":
        this.writeInt16(e, this.endianness);
        break;
      case "uint32":
        this.writeUint32(e, this.endianness);
        break;
      case "int32":
        this.writeInt32(e, this.endianness);
        break;
      case "float32":
        this.writeFloat32(e, this.endianness);
        break;
      case "float64":
        this.writeFloat64(e, this.endianness);
        break;
      case "uint16be":
        this.writeUint16(e, o.BIG_ENDIAN);
        break;
      case "int16be":
        this.writeInt16(e, o.BIG_ENDIAN);
        break;
      case "uint32be":
        this.writeUint32(e, o.BIG_ENDIAN);
        break;
      case "int32be":
        this.writeInt32(e, o.BIG_ENDIAN);
        break;
      case "float32be":
        this.writeFloat32(e, o.BIG_ENDIAN);
        break;
      case "float64be":
        this.writeFloat64(e, o.BIG_ENDIAN);
        break;
      case "uint16le":
        this.writeUint16(e, o.LITTLE_ENDIAN);
        break;
      case "int16le":
        this.writeInt16(e, o.LITTLE_ENDIAN);
        break;
      case "uint32le":
        this.writeUint32(e, o.LITTLE_ENDIAN);
        break;
      case "int32le":
        this.writeInt32(e, o.LITTLE_ENDIAN);
        break;
      case "float32le":
        this.writeFloat32(e, o.LITTLE_ENDIAN);
        break;
      case "float64le":
        this.writeFloat64(e, o.LITTLE_ENDIAN);
        break;
      case "cstring":
        this.writeCString(e, d);
        break;
      case "string":
        this.writeString(e, f, d);
        break;
      case "u16string":
        this.writeUCS2String(e, this.endianness, d);
        break;
      case "u16stringle":
        this.writeUCS2String(e, o.LITTLE_ENDIAN, d);
        break;
      case "u16stringbe":
        this.writeUCS2String(e, o.BIG_ENDIAN, d);
        break;
      default:
        if (t.length == 3) {
          for (var v = t[1], m = 0; m < e.length; m++)
            this.writeType(v, e[m]);
          break;
        } else {
          this.writeStruct(t, e);
          break;
        }
    }
    d != null && (this.position = _, this._realloc(d), this.position = _ + d);
  }, o.prototype.writeUint64 = function(t) {
    var e = Math.floor(t / u);
    this.writeUint32(e), this.writeUint32(t & 4294967295);
  }, o.prototype.writeUint24 = function(t) {
    this.writeUint8((t & 16711680) >> 16), this.writeUint8((t & 65280) >> 8), this.writeUint8(t & 255);
  }, o.prototype.adjustUint32 = function(t, e) {
    var n = this.position;
    this.seek(t), this.writeUint32(e), this.seek(n);
  }, o.prototype.mapInt32Array = function(t, e) {
    this._realloc(t * 4);
    var n = new Int32Array(this._buffer, this.byteOffset + this.position, t);
    return o.arrayToNative(n, e ?? this.endianness), this.position += t * 4, n;
  }, o.prototype.mapInt16Array = function(t, e) {
    this._realloc(t * 2);
    var n = new Int16Array(this._buffer, this.byteOffset + this.position, t);
    return o.arrayToNative(n, e ?? this.endianness), this.position += t * 2, n;
  }, o.prototype.mapInt8Array = function(t) {
    this._realloc(t * 1);
    var e = new Int8Array(this._buffer, this.byteOffset + this.position, t);
    return this.position += t * 1, e;
  }, o.prototype.mapUint32Array = function(t, e) {
    this._realloc(t * 4);
    var n = new Uint32Array(this._buffer, this.byteOffset + this.position, t);
    return o.arrayToNative(n, e ?? this.endianness), this.position += t * 4, n;
  }, o.prototype.mapUint16Array = function(t, e) {
    this._realloc(t * 2);
    var n = new Uint16Array(this._buffer, this.byteOffset + this.position, t);
    return o.arrayToNative(n, e ?? this.endianness), this.position += t * 2, n;
  }, o.prototype.mapFloat64Array = function(t, e) {
    this._realloc(t * 8);
    var n = new Float64Array(this._buffer, this.byteOffset + this.position, t);
    return o.arrayToNative(n, e ?? this.endianness), this.position += t * 8, n;
  }, o.prototype.mapFloat32Array = function(t, e) {
    this._realloc(t * 4);
    var n = new Float32Array(this._buffer, this.byteOffset + this.position, t);
    return o.arrayToNative(n, e ?? this.endianness), this.position += t * 4, n;
  };
  var h = function(t) {
    this.buffers = [], this.bufferIndex = -1, t && (this.insertBuffer(t), this.bufferIndex = 0);
  };
  h.prototype = new o(new ArrayBuffer(), 0, o.BIG_ENDIAN), h.prototype.initialized = function() {
    var t;
    return this.bufferIndex > -1 ? true : this.buffers.length > 0 ? (t = this.buffers[0], t.fileStart === 0 ? (this.buffer = t, this.bufferIndex = 0, s.debug("MultiBufferStream", "Stream ready for parsing"), true) : (s.warn("MultiBufferStream", "The first buffer should have a fileStart of 0"), this.logBufferLevel(), false)) : (s.warn("MultiBufferStream", "No buffer to start parsing from"), this.logBufferLevel(), false);
  }, ArrayBuffer.concat = function(t, e) {
    s.debug("ArrayBuffer", "Trying to create a new buffer of size: " + (t.byteLength + e.byteLength));
    var n = new Uint8Array(t.byteLength + e.byteLength);
    return n.set(new Uint8Array(t), 0), n.set(new Uint8Array(e), t.byteLength), n.buffer;
  }, h.prototype.reduceBuffer = function(t, e, n) {
    var a;
    return a = new Uint8Array(n), a.set(new Uint8Array(t, e, n)), a.buffer.fileStart = t.fileStart + e, a.buffer.usedBytes = 0, a.buffer;
  }, h.prototype.insertBuffer = function(t) {
    for (var e = true, n = 0; n < this.buffers.length; n++) {
      var a = this.buffers[n];
      if (t.fileStart <= a.fileStart) {
        if (t.fileStart === a.fileStart)
          if (t.byteLength > a.byteLength) {
            this.buffers.splice(n, 1), n--;
            continue;
          } else
            s.warn("MultiBufferStream", "Buffer (fileStart: " + t.fileStart + " - Length: " + t.byteLength + ") already appended, ignoring");
        else
          t.fileStart + t.byteLength <= a.fileStart || (t = this.reduceBuffer(t, 0, a.fileStart - t.fileStart)), s.debug("MultiBufferStream", "Appending new buffer (fileStart: " + t.fileStart + " - Length: " + t.byteLength + ")"), this.buffers.splice(n, 0, t), n === 0 && (this.buffer = t);
        e = false;
        break;
      } else if (t.fileStart < a.fileStart + a.byteLength) {
        var d = a.fileStart + a.byteLength - t.fileStart, f = t.byteLength - d;
        if (f > 0)
          t = this.reduceBuffer(t, d, f);
        else {
          e = false;
          break;
        }
      }
    }
    e && (s.debug("MultiBufferStream", "Appending new buffer (fileStart: " + t.fileStart + " - Length: " + t.byteLength + ")"), this.buffers.push(t), n === 0 && (this.buffer = t));
  }, h.prototype.logBufferLevel = function(t) {
    var e, n, a, d, f = [], _, v = "";
    for (a = 0, d = 0, e = 0; e < this.buffers.length; e++)
      n = this.buffers[e], e === 0 ? (_ = {}, f.push(_), _.start = n.fileStart, _.end = n.fileStart + n.byteLength, v += "[" + _.start + "-") : _.end === n.fileStart ? _.end = n.fileStart + n.byteLength : (_ = {}, _.start = n.fileStart, v += f[f.length - 1].end - 1 + "], [" + _.start + "-", _.end = n.fileStart + n.byteLength, f.push(_)), a += n.usedBytes, d += n.byteLength;
    f.length > 0 && (v += _.end - 1 + "]");
    var m = t ? s.info : s.debug;
    this.buffers.length === 0 ? m("MultiBufferStream", "No more buffer in memory") : m("MultiBufferStream", "" + this.buffers.length + " stored buffer(s) (" + a + "/" + d + " bytes), continuous ranges: " + v);
  }, h.prototype.cleanBuffers = function() {
    var t, e;
    for (t = 0; t < this.buffers.length; t++)
      e = this.buffers[t], e.usedBytes === e.byteLength && (s.debug("MultiBufferStream", "Removing buffer #" + t), this.buffers.splice(t, 1), t--);
  }, h.prototype.mergeNextBuffer = function() {
    var t;
    if (this.bufferIndex + 1 < this.buffers.length)
      if (t = this.buffers[this.bufferIndex + 1], t.fileStart === this.buffer.fileStart + this.buffer.byteLength) {
        var e = this.buffer.byteLength, n = this.buffer.usedBytes, a = this.buffer.fileStart;
        return this.buffers[this.bufferIndex] = ArrayBuffer.concat(this.buffer, t), this.buffer = this.buffers[this.bufferIndex], this.buffers.splice(this.bufferIndex + 1, 1), this.buffer.usedBytes = n, this.buffer.fileStart = a, s.debug("ISOFile", "Concatenating buffer for box parsing (length: " + e + "->" + this.buffer.byteLength + ")"), true;
      } else
        return false;
    else
      return false;
  }, h.prototype.findPosition = function(t, e, n) {
    var a, d = null, f = -1;
    for (t === true ? a = 0 : a = this.bufferIndex; a < this.buffers.length && (d = this.buffers[a], d.fileStart <= e); ) {
      f = a, n && (d.fileStart + d.byteLength <= e ? d.usedBytes = d.byteLength : d.usedBytes = e - d.fileStart, this.logBufferLevel());
      a++;
    }
    return f !== -1 ? (d = this.buffers[f], d.fileStart + d.byteLength >= e ? (s.debug("MultiBufferStream", "Found position in existing buffer #" + f), f) : -1) : -1;
  }, h.prototype.findEndContiguousBuf = function(t) {
    var e, n, a, d = t !== void 0 ? t : this.bufferIndex;
    if (n = this.buffers[d], this.buffers.length > d + 1)
      for (e = d + 1; e < this.buffers.length && (a = this.buffers[e], a.fileStart === n.fileStart + n.byteLength); e++)
        n = a;
    return n.fileStart + n.byteLength;
  }, h.prototype.getEndFilePositionAfter = function(t) {
    var e = this.findPosition(true, t, false);
    return e !== -1 ? this.findEndContiguousBuf(e) : t;
  }, h.prototype.addUsedBytes = function(t) {
    this.buffer.usedBytes += t, this.logBufferLevel();
  }, h.prototype.setAllUsedBytes = function() {
    this.buffer.usedBytes = this.buffer.byteLength, this.logBufferLevel();
  }, h.prototype.seek = function(t, e, n) {
    var a;
    return a = this.findPosition(e, t, n), a !== -1 ? (this.buffer = this.buffers[a], this.bufferIndex = a, this.position = t - this.buffer.fileStart, s.debug("MultiBufferStream", "Repositioning parser at buffer position: " + this.position), true) : (s.debug("MultiBufferStream", "Position " + t + " not found in buffered data"), false);
  }, h.prototype.getPosition = function() {
    if (this.bufferIndex === -1 || this.buffers[this.bufferIndex] === null)
      throw "Error accessing position in the MultiBufferStream";
    return this.buffers[this.bufferIndex].fileStart + this.position;
  }, h.prototype.getLength = function() {
    return this.byteLength;
  }, h.prototype.getEndPosition = function() {
    if (this.bufferIndex === -1 || this.buffers[this.bufferIndex] === null)
      throw "Error accessing position in the MultiBufferStream";
    return this.buffers[this.bufferIndex].fileStart + this.byteLength;
  }, c.MultiBufferStream = h;
  var p = function() {
    var t = 3, e = 4, n = 5, a = 6, d = [];
    d[t] = "ES_Descriptor", d[e] = "DecoderConfigDescriptor", d[n] = "DecoderSpecificInfo", d[a] = "SLConfigDescriptor", this.getDescriptorName = function(v) {
      return d[v];
    };
    var f = this, _ = {};
    return this.parseOneDescriptor = function(v) {
      var m = 0, T, U, $;
      for (T = v.readUint8(), $ = v.readUint8(); $ & 128; )
        m = ($ & 127) << 7, $ = v.readUint8();
      return m += $ & 127, s.debug("MPEG4DescriptorParser", "Found " + (d[T] || "Descriptor " + T) + ", size " + m + " at position " + v.getPosition()), d[T] ? U = new _[d[T]](m) : U = new _.Descriptor(m), U.parse(v), U;
    }, _.Descriptor = function(v, m) {
      this.tag = v, this.size = m, this.descs = [];
    }, _.Descriptor.prototype.parse = function(v) {
      this.data = v.readUint8Array(this.size);
    }, _.Descriptor.prototype.findDescriptor = function(v) {
      for (var m = 0; m < this.descs.length; m++)
        if (this.descs[m].tag == v)
          return this.descs[m];
      return null;
    }, _.Descriptor.prototype.parseRemainingDescriptors = function(v) {
      for (var m = v.position; v.position < m + this.size; ) {
        var T = f.parseOneDescriptor(v);
        this.descs.push(T);
      }
    }, _.ES_Descriptor = function(v) {
      _.Descriptor.call(this, t, v);
    }, _.ES_Descriptor.prototype = new _.Descriptor(), _.ES_Descriptor.prototype.parse = function(v) {
      if (this.ES_ID = v.readUint16(), this.flags = v.readUint8(), this.size -= 3, this.flags & 128 ? (this.dependsOn_ES_ID = v.readUint16(), this.size -= 2) : this.dependsOn_ES_ID = 0, this.flags & 64) {
        var m = v.readUint8();
        this.URL = v.readString(m), this.size -= m + 1;
      } else
        this.URL = "";
      this.flags & 32 ? (this.OCR_ES_ID = v.readUint16(), this.size -= 2) : this.OCR_ES_ID = 0, this.parseRemainingDescriptors(v);
    }, _.ES_Descriptor.prototype.getOTI = function(v) {
      var m = this.findDescriptor(e);
      return m ? m.oti : 0;
    }, _.ES_Descriptor.prototype.getAudioConfig = function(v) {
      var m = this.findDescriptor(e);
      if (!m) return null;
      var T = m.findDescriptor(n);
      if (T && T.data) {
        var U = (T.data[0] & 248) >> 3;
        return U === 31 && T.data.length >= 2 && (U = 32 + ((T.data[0] & 7) << 3) + ((T.data[1] & 224) >> 5)), U;
      } else
        return null;
    }, _.DecoderConfigDescriptor = function(v) {
      _.Descriptor.call(this, e, v);
    }, _.DecoderConfigDescriptor.prototype = new _.Descriptor(), _.DecoderConfigDescriptor.prototype.parse = function(v) {
      this.oti = v.readUint8(), this.streamType = v.readUint8(), this.upStream = (this.streamType >> 1 & 1) !== 0, this.streamType = this.streamType >>> 2, this.bufferSize = v.readUint24(), this.maxBitrate = v.readUint32(), this.avgBitrate = v.readUint32(), this.size -= 13, this.parseRemainingDescriptors(v);
    }, _.DecoderSpecificInfo = function(v) {
      _.Descriptor.call(this, n, v);
    }, _.DecoderSpecificInfo.prototype = new _.Descriptor(), _.SLConfigDescriptor = function(v) {
      _.Descriptor.call(this, a, v);
    }, _.SLConfigDescriptor.prototype = new _.Descriptor(), this;
  };
  c.MPEG4DescriptorParser = p;
  var r = {
    ERR_INVALID_DATA: -1,
    ERR_NOT_ENOUGH_DATA: 0,
    OK: 1,
    // Boxes to be created with default parsing
    BASIC_BOXES: ["mdat", "idat", "free", "skip", "meco", "strk"],
    FULL_BOXES: ["hmhd", "nmhd", "iods", "xml ", "bxml", "ipro", "mere"],
    CONTAINER_BOXES: [
      ["moov", ["trak", "pssh"]],
      ["trak"],
      ["edts"],
      ["mdia"],
      ["minf"],
      ["dinf"],
      ["stbl", ["sgpd", "sbgp"]],
      ["mvex", ["trex"]],
      ["moof", ["traf"]],
      ["traf", ["trun", "sgpd", "sbgp"]],
      ["vttc"],
      ["tref"],
      ["iref"],
      ["mfra", ["tfra"]],
      ["meco"],
      ["hnti"],
      ["hinf"],
      ["strk"],
      ["strd"],
      ["sinf"],
      ["rinf"],
      ["schi"],
      ["trgr"],
      ["udta", ["kind"]],
      ["iprp", ["ipma"]],
      ["ipco"],
      ["grpl"],
      ["j2kH"],
      ["etyp", ["tyco"]]
    ],
    // Boxes effectively created
    boxCodes: [],
    fullBoxCodes: [],
    containerBoxCodes: [],
    sampleEntryCodes: {},
    sampleGroupEntryCodes: [],
    trackGroupTypes: [],
    UUIDBoxes: {},
    UUIDs: [],
    initialize: function() {
      r.FullBox.prototype = new r.Box(), r.ContainerBox.prototype = new r.Box(), r.SampleEntry.prototype = new r.Box(), r.TrackGroupTypeBox.prototype = new r.FullBox(), r.BASIC_BOXES.forEach(function(t) {
        r.createBoxCtor(t);
      }), r.FULL_BOXES.forEach(function(t) {
        r.createFullBoxCtor(t);
      }), r.CONTAINER_BOXES.forEach(function(t) {
        r.createContainerBoxCtor(t[0], null, t[1]);
      });
    },
    Box: function(t, e, n) {
      this.type = t, this.size = e, this.uuid = n;
    },
    FullBox: function(t, e, n) {
      r.Box.call(this, t, e, n), this.flags = 0, this.version = 0;
    },
    ContainerBox: function(t, e, n) {
      r.Box.call(this, t, e, n), this.boxes = [];
    },
    SampleEntry: function(t, e, n, a) {
      r.ContainerBox.call(this, t, e), this.hdr_size = n, this.start = a;
    },
    SampleGroupEntry: function(t) {
      this.grouping_type = t;
    },
    TrackGroupTypeBox: function(t, e) {
      r.FullBox.call(this, t, e);
    },
    createBoxCtor: function(t, e) {
      r.boxCodes.push(t), r[t + "Box"] = function(n) {
        r.Box.call(this, t, n);
      }, r[t + "Box"].prototype = new r.Box(), e && (r[t + "Box"].prototype.parse = e);
    },
    createFullBoxCtor: function(t, e) {
      r[t + "Box"] = function(n) {
        r.FullBox.call(this, t, n);
      }, r[t + "Box"].prototype = new r.FullBox(), r[t + "Box"].prototype.parse = function(n) {
        this.parseFullHeader(n), e && e.call(this, n);
      };
    },
    addSubBoxArrays: function(t) {
      if (t) {
        this.subBoxNames = t;
        for (var e = t.length, n = 0; n < e; n++)
          this[t[n] + "s"] = [];
      }
    },
    createContainerBoxCtor: function(t, e, n) {
      r[t + "Box"] = function(a) {
        r.ContainerBox.call(this, t, a), r.addSubBoxArrays.call(this, n);
      }, r[t + "Box"].prototype = new r.ContainerBox(), e && (r[t + "Box"].prototype.parse = e);
    },
    createMediaSampleEntryCtor: function(t, e, n) {
      r.sampleEntryCodes[t] = [], r[t + "SampleEntry"] = function(a, d) {
        r.SampleEntry.call(this, a, d), r.addSubBoxArrays.call(this, n);
      }, r[t + "SampleEntry"].prototype = new r.SampleEntry(), e && (r[t + "SampleEntry"].prototype.parse = e);
    },
    createSampleEntryCtor: function(t, e, n, a) {
      r.sampleEntryCodes[t].push(e), r[e + "SampleEntry"] = function(d) {
        r[t + "SampleEntry"].call(this, e, d), r.addSubBoxArrays.call(this, a);
      }, r[e + "SampleEntry"].prototype = new r[t + "SampleEntry"](), n && (r[e + "SampleEntry"].prototype.parse = n);
    },
    createEncryptedSampleEntryCtor: function(t, e, n) {
      r.createSampleEntryCtor.call(this, t, e, n, ["sinf"]);
    },
    createSampleGroupCtor: function(t, e) {
      r[t + "SampleGroupEntry"] = function(n) {
        r.SampleGroupEntry.call(this, t, n);
      }, r[t + "SampleGroupEntry"].prototype = new r.SampleGroupEntry(), e && (r[t + "SampleGroupEntry"].prototype.parse = e);
    },
    createTrackGroupCtor: function(t, e) {
      r[t + "TrackGroupTypeBox"] = function(n) {
        r.TrackGroupTypeBox.call(this, t, n);
      }, r[t + "TrackGroupTypeBox"].prototype = new r.TrackGroupTypeBox(), e && (r[t + "TrackGroupTypeBox"].prototype.parse = e);
    },
    createUUIDBox: function(t, e, n, a) {
      r.UUIDs.push(t), r.UUIDBoxes[t] = function(d) {
        e ? r.FullBox.call(this, "uuid", d, t) : n ? r.ContainerBox.call(this, "uuid", d, t) : r.Box.call(this, "uuid", d, t);
      }, r.UUIDBoxes[t].prototype = e ? new r.FullBox() : n ? new r.ContainerBox() : new r.Box(), a && (e ? r.UUIDBoxes[t].prototype.parse = function(d) {
        this.parseFullHeader(d), a && a.call(this, d);
      } : r.UUIDBoxes[t].prototype.parse = a);
    }
  };
  r.initialize(), r.TKHD_FLAG_ENABLED = 1, r.TKHD_FLAG_IN_MOVIE = 2, r.TKHD_FLAG_IN_PREVIEW = 4, r.TFHD_FLAG_BASE_DATA_OFFSET = 1, r.TFHD_FLAG_SAMPLE_DESC = 2, r.TFHD_FLAG_SAMPLE_DUR = 8, r.TFHD_FLAG_SAMPLE_SIZE = 16, r.TFHD_FLAG_SAMPLE_FLAGS = 32, r.TFHD_FLAG_DUR_EMPTY = 65536, r.TFHD_FLAG_DEFAULT_BASE_IS_MOOF = 131072, r.TRUN_FLAGS_DATA_OFFSET = 1, r.TRUN_FLAGS_FIRST_FLAG = 4, r.TRUN_FLAGS_DURATION = 256, r.TRUN_FLAGS_SIZE = 512, r.TRUN_FLAGS_FLAGS = 1024, r.TRUN_FLAGS_CTS_OFFSET = 2048, r.Box.prototype.add = function(t) {
    return this.addBox(new r[t + "Box"]());
  }, r.Box.prototype.addBox = function(t) {
    return this.boxes.push(t), this[t.type + "s"] ? this[t.type + "s"].push(t) : this[t.type] = t, t;
  }, r.Box.prototype.set = function(t, e) {
    return this[t] = e, this;
  }, r.Box.prototype.addEntry = function(t, e) {
    var n = e || "entries";
    return this[n] || (this[n] = []), this[n].push(t), this;
  }, c.BoxParser = r, r.parseUUID = function(t) {
    return r.parseHex16(t);
  }, r.parseHex16 = function(t) {
    for (var e = "", n = 0; n < 16; n++) {
      var a = t.readUint8().toString(16);
      e += a.length === 1 ? "0" + a : a;
    }
    return e;
  }, r.parseOneBox = function(t, e, n) {
    var a, d = t.getPosition(), f = 0, _, v;
    if (t.getEndPosition() - d < 8)
      return s.debug("BoxParser", "Not enough data in stream to parse the type and size of the box"), { code: r.ERR_NOT_ENOUGH_DATA };
    if (n && n < 8)
      return s.debug("BoxParser", "Not enough bytes left in the parent box to parse a new box"), { code: r.ERR_NOT_ENOUGH_DATA };
    var m = t.readUint32(), T = t.readString(4), U = T;
    if (s.debug("BoxParser", "Found box of type '" + T + "' and size " + m + " at position " + d), f = 8, T == "uuid") {
      if (t.getEndPosition() - t.getPosition() < 16 || n - f < 16)
        return t.seek(d), s.debug("BoxParser", "Not enough bytes left in the parent box to parse a UUID box"), { code: r.ERR_NOT_ENOUGH_DATA };
      v = r.parseUUID(t), f += 16, U = v;
    }
    if (m == 1) {
      if (t.getEndPosition() - t.getPosition() < 8 || n && n - f < 8)
        return t.seek(d), s.warn("BoxParser", 'Not enough data in stream to parse the extended size of the "' + T + '" box'), { code: r.ERR_NOT_ENOUGH_DATA };
      m = t.readUint64(), f += 8;
    } else if (m === 0) {
      if (n)
        m = n;
      else if (T !== "mdat")
        return s.error("BoxParser", "Unlimited box size not supported for type: '" + T + "'"), a = new r.Box(T, m), { code: r.OK, box: a, size: a.size };
    }
    return m !== 0 && m < f ? (s.error("BoxParser", "Box of type " + T + " has an invalid size " + m + " (too small to be a box)"), { code: r.ERR_NOT_ENOUGH_DATA, type: T, size: m, hdr_size: f, start: d }) : m !== 0 && n && m > n ? (s.error("BoxParser", "Box of type '" + T + "' has a size " + m + " greater than its container size " + n), { code: r.ERR_NOT_ENOUGH_DATA, type: T, size: m, hdr_size: f, start: d }) : m !== 0 && d + m > t.getEndPosition() ? (t.seek(d), s.info("BoxParser", "Not enough data in stream to parse the entire '" + T + "' box"), { code: r.ERR_NOT_ENOUGH_DATA, type: T, size: m, hdr_size: f, start: d }) : e ? { code: r.OK, type: T, size: m, hdr_size: f, start: d } : (r[T + "Box"] ? a = new r[T + "Box"](m) : T !== "uuid" ? (s.warn("BoxParser", "Unknown box type: '" + T + "'"), a = new r.Box(T, m), a.has_unparsed_data = true) : r.UUIDBoxes[v] ? a = new r.UUIDBoxes[v](m) : (s.warn("BoxParser", "Unknown uuid type: '" + v + "'"), a = new r.Box(T, m), a.uuid = v, a.has_unparsed_data = true), a.hdr_size = f, a.start = d, a.write === r.Box.prototype.write && a.type !== "mdat" && (s.info("BoxParser", "'" + U + "' box writing not yet implemented, keeping unparsed data in memory for later write"), a.parseDataAndRewind(t)), a.parse(t), _ = t.getPosition() - (a.start + a.size), _ < 0 ? (s.warn("BoxParser", "Parsing of box '" + U + "' did not read the entire indicated box data size (missing " + -_ + " bytes), seeking forward"), t.seek(a.start + a.size)) : _ > 0 && (s.error("BoxParser", "Parsing of box '" + U + "' read " + _ + " more bytes than the indicated box data size, seeking backwards"), a.size !== 0 && t.seek(a.start + a.size)), { code: r.OK, box: a, size: a.size });
  }, r.Box.prototype.parse = function(t) {
    this.type != "mdat" ? this.data = t.readUint8Array(this.size - this.hdr_size) : this.size === 0 ? t.seek(t.getEndPosition()) : t.seek(this.start + this.size);
  }, r.Box.prototype.parseDataAndRewind = function(t) {
    this.data = t.readUint8Array(this.size - this.hdr_size), t.position -= this.size - this.hdr_size;
  }, r.FullBox.prototype.parseDataAndRewind = function(t) {
    this.parseFullHeader(t), this.data = t.readUint8Array(this.size - this.hdr_size), this.hdr_size -= 4, t.position -= this.size - this.hdr_size;
  }, r.FullBox.prototype.parseFullHeader = function(t) {
    this.version = t.readUint8(), this.flags = t.readUint24(), this.hdr_size += 4;
  }, r.FullBox.prototype.parse = function(t) {
    this.parseFullHeader(t), this.data = t.readUint8Array(this.size - this.hdr_size);
  }, r.ContainerBox.prototype.parse = function(t) {
    for (var e, n; t.getPosition() < this.start + this.size; )
      if (e = r.parseOneBox(t, false, this.size - (t.getPosition() - this.start)), e.code === r.OK)
        if (n = e.box, this.boxes.push(n), this.subBoxNames && this.subBoxNames.indexOf(n.type) != -1)
          this[this.subBoxNames[this.subBoxNames.indexOf(n.type)] + "s"].push(n);
        else {
          var a = n.type !== "uuid" ? n.type : n.uuid;
          this[a] ? s.warn("Box of type " + a + " already stored in field of this type") : this[a] = n;
        }
      else
        return;
  }, r.Box.prototype.parseLanguage = function(t) {
    this.language = t.readUint16();
    var e = [];
    e[0] = this.language >> 10 & 31, e[1] = this.language >> 5 & 31, e[2] = this.language & 31, this.languageString = String.fromCharCode(e[0] + 96, e[1] + 96, e[2] + 96);
  }, r.SAMPLE_ENTRY_TYPE_VISUAL = "Visual", r.SAMPLE_ENTRY_TYPE_AUDIO = "Audio", r.SAMPLE_ENTRY_TYPE_HINT = "Hint", r.SAMPLE_ENTRY_TYPE_METADATA = "Metadata", r.SAMPLE_ENTRY_TYPE_SUBTITLE = "Subtitle", r.SAMPLE_ENTRY_TYPE_SYSTEM = "System", r.SAMPLE_ENTRY_TYPE_TEXT = "Text", r.SampleEntry.prototype.parseHeader = function(t) {
    t.readUint8Array(6), this.data_reference_index = t.readUint16(), this.hdr_size += 8;
  }, r.SampleEntry.prototype.parse = function(t) {
    this.parseHeader(t), this.data = t.readUint8Array(this.size - this.hdr_size);
  }, r.SampleEntry.prototype.parseDataAndRewind = function(t) {
    this.parseHeader(t), this.data = t.readUint8Array(this.size - this.hdr_size), this.hdr_size -= 8, t.position -= this.size - this.hdr_size;
  }, r.SampleEntry.prototype.parseFooter = function(t) {
    r.ContainerBox.prototype.parse.call(this, t);
  }, r.createMediaSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_HINT), r.createMediaSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_METADATA), r.createMediaSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_SUBTITLE), r.createMediaSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_SYSTEM), r.createMediaSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_TEXT), r.createMediaSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_VISUAL, function(t) {
    var e;
    this.parseHeader(t), t.readUint16(), t.readUint16(), t.readUint32Array(3), this.width = t.readUint16(), this.height = t.readUint16(), this.horizresolution = t.readUint32(), this.vertresolution = t.readUint32(), t.readUint32(), this.frame_count = t.readUint16(), e = Math.min(31, t.readUint8()), this.compressorname = t.readString(e), e < 31 && t.readString(31 - e), this.depth = t.readUint16(), t.readUint16(), this.parseFooter(t);
  }), r.createMediaSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_AUDIO, function(t) {
    this.parseHeader(t), t.readUint32Array(2), this.channel_count = t.readUint16(), this.samplesize = t.readUint16(), t.readUint16(), t.readUint16(), this.samplerate = t.readUint32() / 65536, this.parseFooter(t);
  }), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_VISUAL, "avc1"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_VISUAL, "avc2"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_VISUAL, "avc3"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_VISUAL, "avc4"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_VISUAL, "av01"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_VISUAL, "dav1"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_VISUAL, "hvc1"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_VISUAL, "hev1"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_VISUAL, "hvt1"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_VISUAL, "lhe1"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_VISUAL, "dvh1"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_VISUAL, "dvhe"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_VISUAL, "vvc1"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_VISUAL, "vvi1"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_VISUAL, "vvs1"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_VISUAL, "vvcN"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_VISUAL, "vp08"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_VISUAL, "vp09"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_VISUAL, "avs3"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_VISUAL, "j2ki"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_VISUAL, "mjp2"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_VISUAL, "mjpg"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_VISUAL, "uncv"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_AUDIO, "mp4a"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_AUDIO, "ac-3"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_AUDIO, "ac-4"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_AUDIO, "ec-3"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_AUDIO, "Opus"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_AUDIO, "mha1"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_AUDIO, "mha2"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_AUDIO, "mhm1"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_AUDIO, "mhm2"), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_AUDIO, "fLaC"), r.createEncryptedSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_VISUAL, "encv"), r.createEncryptedSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_AUDIO, "enca"), r.createEncryptedSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_SUBTITLE, "encu"), r.createEncryptedSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_SYSTEM, "encs"), r.createEncryptedSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_TEXT, "enct"), r.createEncryptedSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_METADATA, "encm"), r.createBoxCtor("a1lx", function(t) {
    var e = t.readUint8() & 1, n = ((e & 1) + 1) * 16;
    this.layer_size = [];
    for (var a = 0; a < 3; a++)
      n == 16 ? this.layer_size[a] = t.readUint16() : this.layer_size[a] = t.readUint32();
  }), r.createBoxCtor("a1op", function(t) {
    this.op_index = t.readUint8();
  }), r.createFullBoxCtor("auxC", function(t) {
    this.aux_type = t.readCString();
    var e = this.size - this.hdr_size - (this.aux_type.length + 1);
    this.aux_subtype = t.readUint8Array(e);
  }), r.createBoxCtor("av1C", function(t) {
    var e = t.readUint8();
    if (e >> 7 & false) {
      s.error("av1C marker problem");
      return;
    }
    if (this.version = e & 127, this.version !== 1) {
      s.error("av1C version " + this.version + " not supported");
      return;
    }
    if (e = t.readUint8(), this.seq_profile = e >> 5 & 7, this.seq_level_idx_0 = e & 31, e = t.readUint8(), this.seq_tier_0 = e >> 7 & 1, this.high_bitdepth = e >> 6 & 1, this.twelve_bit = e >> 5 & 1, this.monochrome = e >> 4 & 1, this.chroma_subsampling_x = e >> 3 & 1, this.chroma_subsampling_y = e >> 2 & 1, this.chroma_sample_position = e & 3, e = t.readUint8(), this.reserved_1 = e >> 5 & 7, this.reserved_1 !== 0) {
      s.error("av1C reserved_1 parsing problem");
      return;
    }
    if (this.initial_presentation_delay_present = e >> 4 & 1, this.initial_presentation_delay_present === 1)
      this.initial_presentation_delay_minus_one = e & 15;
    else if (this.reserved_2 = e & 15, this.reserved_2 !== 0) {
      s.error("av1C reserved_2 parsing problem");
      return;
    }
    var n = this.size - this.hdr_size - 4;
    this.configOBUs = t.readUint8Array(n);
  }), r.createBoxCtor("avcC", function(t) {
    var e, n;
    for (this.configurationVersion = t.readUint8(), this.AVCProfileIndication = t.readUint8(), this.profile_compatibility = t.readUint8(), this.AVCLevelIndication = t.readUint8(), this.lengthSizeMinusOne = t.readUint8() & 3, this.nb_SPS_nalus = t.readUint8() & 31, n = this.size - this.hdr_size - 6, this.SPS = [], e = 0; e < this.nb_SPS_nalus; e++)
      this.SPS[e] = {}, this.SPS[e].length = t.readUint16(), this.SPS[e].nalu = t.readUint8Array(this.SPS[e].length), n -= 2 + this.SPS[e].length;
    for (this.nb_PPS_nalus = t.readUint8(), n--, this.PPS = [], e = 0; e < this.nb_PPS_nalus; e++)
      this.PPS[e] = {}, this.PPS[e].length = t.readUint16(), this.PPS[e].nalu = t.readUint8Array(this.PPS[e].length), n -= 2 + this.PPS[e].length;
    n > 0 && (this.ext = t.readUint8Array(n));
  }), r.createBoxCtor("btrt", function(t) {
    this.bufferSizeDB = t.readUint32(), this.maxBitrate = t.readUint32(), this.avgBitrate = t.readUint32();
  }), r.createFullBoxCtor("ccst", function(t) {
    var e = t.readUint8();
    this.all_ref_pics_intra = (e & 128) == 128, this.intra_pred_used = (e & 64) == 64, this.max_ref_per_pic = (e & 63) >> 2, t.readUint24();
  }), r.createBoxCtor("cdef", function(t) {
    var e;
    for (this.channel_count = t.readUint16(), this.channel_indexes = [], this.channel_types = [], this.channel_associations = [], e = 0; e < this.channel_count; e++)
      this.channel_indexes.push(t.readUint16()), this.channel_types.push(t.readUint16()), this.channel_associations.push(t.readUint16());
  }), r.createBoxCtor("clap", function(t) {
    this.cleanApertureWidthN = t.readUint32(), this.cleanApertureWidthD = t.readUint32(), this.cleanApertureHeightN = t.readUint32(), this.cleanApertureHeightD = t.readUint32(), this.horizOffN = t.readUint32(), this.horizOffD = t.readUint32(), this.vertOffN = t.readUint32(), this.vertOffD = t.readUint32();
  }), r.createBoxCtor("clli", function(t) {
    this.max_content_light_level = t.readUint16(), this.max_pic_average_light_level = t.readUint16();
  }), r.createFullBoxCtor("cmex", function(t) {
    this.flags & 1 && (this.pos_x = t.readInt32()), this.flags & 2 && (this.pos_y = t.readInt32()), this.flags & 4 && (this.pos_z = t.readInt32()), this.flags & 8 && (this.version == 0 ? this.flags & 16 ? (this.quat_x = t.readInt32(), this.quat_y = t.readInt32(), this.quat_z = t.readInt32()) : (this.quat_x = t.readInt16(), this.quat_y = t.readInt16(), this.quat_z = t.readInt16()) : this.version == 1), this.flags & 32 && (this.id = t.readUint32());
  }), r.createFullBoxCtor("cmin", function(t) {
    this.focal_length_x = t.readInt32(), this.principal_point_x = t.readInt32(), this.principal_point_y = t.readInt32(), this.flags & 1 && (this.focal_length_y = t.readInt32(), this.skew_factor = t.readInt32());
  }), r.createBoxCtor("cmpd", function(t) {
    for (this.component_count = t.readUint32(), this.component_types = [], this.component_type_urls = [], i = 0; i < this.component_count; i++) {
      var e = t.readUint16();
      this.component_types.push(e), e >= 32768 && this.component_type_urls.push(t.readCString());
    }
  }), r.createFullBoxCtor("co64", function(t) {
    var e, n;
    if (e = t.readUint32(), this.chunk_offsets = [], this.version === 0)
      for (n = 0; n < e; n++)
        this.chunk_offsets.push(t.readUint64());
  }), r.createFullBoxCtor("CoLL", function(t) {
    this.maxCLL = t.readUint16(), this.maxFALL = t.readUint16();
  }), r.createBoxCtor("colr", function(t) {
    if (this.colour_type = t.readString(4), this.colour_type === "nclx") {
      this.colour_primaries = t.readUint16(), this.transfer_characteristics = t.readUint16(), this.matrix_coefficients = t.readUint16();
      var e = t.readUint8();
      this.full_range_flag = e >> 7;
    } else this.colour_type === "rICC" ? this.ICC_profile = t.readUint8Array(this.size - 4) : this.colour_type === "prof" && (this.ICC_profile = t.readUint8Array(this.size - 4));
  }), r.createFullBoxCtor("cprt", function(t) {
    this.parseLanguage(t), this.notice = t.readCString();
  }), r.createFullBoxCtor("cslg", function(t) {
    this.version === 0 && (this.compositionToDTSShift = t.readInt32(), this.leastDecodeToDisplayDelta = t.readInt32(), this.greatestDecodeToDisplayDelta = t.readInt32(), this.compositionStartTime = t.readInt32(), this.compositionEndTime = t.readInt32());
  }), r.createFullBoxCtor("ctts", function(t) {
    var e, n;
    if (e = t.readUint32(), this.sample_counts = [], this.sample_offsets = [], this.version === 0)
      for (n = 0; n < e; n++) {
        this.sample_counts.push(t.readUint32());
        var a = t.readInt32();
        a < 0 && s.warn("BoxParser", "ctts box uses negative values without using version 1"), this.sample_offsets.push(a);
      }
    else if (this.version == 1)
      for (n = 0; n < e; n++)
        this.sample_counts.push(t.readUint32()), this.sample_offsets.push(t.readInt32());
  }), r.createBoxCtor("dac3", function(t) {
    var e = t.readUint8(), n = t.readUint8(), a = t.readUint8();
    this.fscod = e >> 6, this.bsid = e >> 1 & 31, this.bsmod = (e & 1) << 2 | n >> 6 & 3, this.acmod = n >> 3 & 7, this.lfeon = n >> 2 & 1, this.bit_rate_code = n & 3 | a >> 5 & 7;
  }), r.createBoxCtor("dec3", function(t) {
    var e = t.readUint16();
    this.data_rate = e >> 3, this.num_ind_sub = e & 7, this.ind_subs = [];
    for (var n = 0; n < this.num_ind_sub + 1; n++) {
      var a = {};
      this.ind_subs.push(a);
      var d = t.readUint8(), f = t.readUint8(), _ = t.readUint8();
      a.fscod = d >> 6, a.bsid = d >> 1 & 31, a.bsmod = (d & 1) << 4 | f >> 4 & 15, a.acmod = f >> 1 & 7, a.lfeon = f & 1, a.num_dep_sub = _ >> 1 & 15, a.num_dep_sub > 0 && (a.chan_loc = (_ & 1) << 8 | t.readUint8());
    }
  }), r.createFullBoxCtor("dfLa", function(t) {
    var e = 127, n = 128, a = [], d = [
      "STREAMINFO",
      "PADDING",
      "APPLICATION",
      "SEEKTABLE",
      "VORBIS_COMMENT",
      "CUESHEET",
      "PICTURE",
      "RESERVED"
    ];
    do {
      var f = t.readUint8(), _ = Math.min(
        f & e,
        d.length - 1
      );
      if (_ ? t.readUint8Array(t.readUint24()) : (t.readUint8Array(13), this.samplerate = t.readUint32() >> 12, t.readUint8Array(20)), a.push(d[_]), f & n)
        break;
    } while (true);
    this.numMetadataBlocks = a.length + " (" + a.join(", ") + ")";
  }), r.createBoxCtor("dimm", function(t) {
    this.bytessent = t.readUint64();
  }), r.createBoxCtor("dmax", function(t) {
    this.time = t.readUint32();
  }), r.createBoxCtor("dmed", function(t) {
    this.bytessent = t.readUint64();
  }), r.createBoxCtor("dOps", function(t) {
    if (this.Version = t.readUint8(), this.OutputChannelCount = t.readUint8(), this.PreSkip = t.readUint16(), this.InputSampleRate = t.readUint32(), this.OutputGain = t.readInt16(), this.ChannelMappingFamily = t.readUint8(), this.ChannelMappingFamily !== 0) {
      this.StreamCount = t.readUint8(), this.CoupledCount = t.readUint8(), this.ChannelMapping = [];
      for (var e = 0; e < this.OutputChannelCount; e++)
        this.ChannelMapping[e] = t.readUint8();
    }
  }), r.createFullBoxCtor("dref", function(t) {
    var e, n;
    this.entries = [];
    for (var a = t.readUint32(), d = 0; d < a; d++)
      if (e = r.parseOneBox(t, false, this.size - (t.getPosition() - this.start)), e.code === r.OK)
        n = e.box, this.entries.push(n);
      else
        return;
  }), r.createBoxCtor("drep", function(t) {
    this.bytessent = t.readUint64();
  }), r.createFullBoxCtor("elng", function(t) {
    this.extended_language = t.readString(this.size - this.hdr_size);
  }), r.createFullBoxCtor("elst", function(t) {
    this.entries = [];
    for (var e = t.readUint32(), n = 0; n < e; n++) {
      var a = {};
      this.entries.push(a), this.version === 1 ? (a.segment_duration = t.readUint64(), a.media_time = t.readInt64()) : (a.segment_duration = t.readUint32(), a.media_time = t.readInt32()), a.media_rate_integer = t.readInt16(), a.media_rate_fraction = t.readInt16();
    }
  }), r.createFullBoxCtor("emsg", function(t) {
    this.version == 1 ? (this.timescale = t.readUint32(), this.presentation_time = t.readUint64(), this.event_duration = t.readUint32(), this.id = t.readUint32(), this.scheme_id_uri = t.readCString(), this.value = t.readCString()) : (this.scheme_id_uri = t.readCString(), this.value = t.readCString(), this.timescale = t.readUint32(), this.presentation_time_delta = t.readUint32(), this.event_duration = t.readUint32(), this.id = t.readUint32());
    var e = this.size - this.hdr_size - (4 * 4 + (this.scheme_id_uri.length + 1) + (this.value.length + 1));
    this.version == 1 && (e -= 4), this.message_data = t.readUint8Array(e);
  }), r.createEntityToGroupCtor = function(t, e) {
    r[t + "Box"] = function(n) {
      r.FullBox.call(this, t, n);
    }, r[t + "Box"].prototype = new r.FullBox(), r[t + "Box"].prototype.parse = function(n) {
      if (this.parseFullHeader(n), e)
        e.call(this, n);
      else
        for (this.group_id = n.readUint32(), this.num_entities_in_group = n.readUint32(), this.entity_ids = [], i = 0; i < this.num_entities_in_group; i++) {
          var a = n.readUint32();
          this.entity_ids.push(a);
        }
    };
  }, r.createEntityToGroupCtor("aebr"), r.createEntityToGroupCtor("afbr"), r.createEntityToGroupCtor("albc"), r.createEntityToGroupCtor("altr"), r.createEntityToGroupCtor("brst"), r.createEntityToGroupCtor("dobr"), r.createEntityToGroupCtor("eqiv"), r.createEntityToGroupCtor("favc"), r.createEntityToGroupCtor("fobr"), r.createEntityToGroupCtor("iaug"), r.createEntityToGroupCtor("pano"), r.createEntityToGroupCtor("slid"), r.createEntityToGroupCtor("ster"), r.createEntityToGroupCtor("tsyn"), r.createEntityToGroupCtor("wbbr"), r.createEntityToGroupCtor("prgr"), r.createEntityToGroupCtor("pymd", function(t) {
    this.group_id = t.readUint32(), this.num_entities_in_group = t.readUint32(), this.entity_ids = [];
    for (var e = 0; e < this.num_entities_in_group; e++) {
      var n = t.readUint32();
      this.entity_ids.push(n);
    }
    for (this.tile_size_x = t.readUint16(), this.tile_size_y = t.readUint16(), this.layer_binning = [], this.tiles_in_layer_column_minus1 = [], this.tiles_in_layer_row_minus1 = [], e = 0; e < this.num_entities_in_group; e++)
      this.layer_binning[e] = t.readUint16(), this.tiles_in_layer_row_minus1[e] = t.readUint16(), this.tiles_in_layer_column_minus1[e] = t.readUint16();
  }), r.createFullBoxCtor("esds", function(t) {
    var e = t.readUint8Array(this.size - this.hdr_size);
    if (this.data = e, typeof p < "u") {
      var n = new p();
      this.esd = n.parseOneDescriptor(new o(e.buffer, 0, o.BIG_ENDIAN));
    }
  }), r.createBoxCtor("fiel", function(t) {
    this.fieldCount = t.readUint8(), this.fieldOrdering = t.readUint8();
  }), r.createBoxCtor("frma", function(t) {
    this.data_format = t.readString(4);
  }), r.createBoxCtor("ftyp", function(t) {
    var e = this.size - this.hdr_size;
    this.major_brand = t.readString(4), this.minor_version = t.readUint32(), e -= 8, this.compatible_brands = [];
    for (var n = 0; e >= 4; )
      this.compatible_brands[n] = t.readString(4), e -= 4, n++;
  }), r.createFullBoxCtor("hdlr", function(t) {
    this.version === 0 && (t.readUint32(), this.handler = t.readString(4), t.readUint32Array(3), this.name = t.readString(this.size - this.hdr_size - 20), this.name[this.name.length - 1] === "\0" && (this.name = this.name.slice(0, -1)));
  }), r.createBoxCtor("hvcC", function(t) {
    var e, n, a, d;
    this.configurationVersion = t.readUint8(), d = t.readUint8(), this.general_profile_space = d >> 6, this.general_tier_flag = (d & 32) >> 5, this.general_profile_idc = d & 31, this.general_profile_compatibility = t.readUint32(), this.general_constraint_indicator = t.readUint8Array(6), this.general_level_idc = t.readUint8(), this.min_spatial_segmentation_idc = t.readUint16() & 4095, this.parallelismType = t.readUint8() & 3, this.chroma_format_idc = t.readUint8() & 3, this.bit_depth_luma_minus8 = t.readUint8() & 7, this.bit_depth_chroma_minus8 = t.readUint8() & 7, this.avgFrameRate = t.readUint16(), d = t.readUint8(), this.constantFrameRate = d >> 6, this.numTemporalLayers = (d & 13) >> 3, this.temporalIdNested = (d & 4) >> 2, this.lengthSizeMinusOne = d & 3, this.nalu_arrays = [];
    var f = t.readUint8();
    for (e = 0; e < f; e++) {
      var _ = [];
      this.nalu_arrays.push(_), d = t.readUint8(), _.completeness = (d & 128) >> 7, _.nalu_type = d & 63;
      var v = t.readUint16();
      for (n = 0; n < v; n++) {
        var m = {};
        _.push(m), a = t.readUint16(), m.data = t.readUint8Array(a);
      }
    }
  }), r.createFullBoxCtor("iinf", function(t) {
    var e;
    this.version === 0 ? this.entry_count = t.readUint16() : this.entry_count = t.readUint32(), this.item_infos = [];
    for (var n = 0; n < this.entry_count; n++)
      if (e = r.parseOneBox(t, false, this.size - (t.getPosition() - this.start)), e.code === r.OK)
        e.box.type !== "infe" && s.error("BoxParser", "Expected 'infe' box, got " + e.box.type), this.item_infos[n] = e.box;
      else
        return;
  }), r.createFullBoxCtor("iloc", function(t) {
    var e;
    e = t.readUint8(), this.offset_size = e >> 4 & 15, this.length_size = e & 15, e = t.readUint8(), this.base_offset_size = e >> 4 & 15, this.version === 1 || this.version === 2 ? this.index_size = e & 15 : this.index_size = 0, this.items = [];
    var n = 0;
    if (this.version < 2)
      n = t.readUint16();
    else if (this.version === 2)
      n = t.readUint32();
    else
      throw "version of iloc box not supported";
    for (var a = 0; a < n; a++) {
      var d = {};
      if (this.items.push(d), this.version < 2)
        d.item_ID = t.readUint16();
      else if (this.version === 2)
        d.item_ID = t.readUint32();
      else
        throw "version of iloc box not supported";
      switch (this.version === 1 || this.version === 2 ? d.construction_method = t.readUint16() & 15 : d.construction_method = 0, d.data_reference_index = t.readUint16(), this.base_offset_size) {
        case 0:
          d.base_offset = 0;
          break;
        case 4:
          d.base_offset = t.readUint32();
          break;
        case 8:
          d.base_offset = t.readUint64();
          break;
        default:
          throw "Error reading base offset size";
      }
      var f = t.readUint16();
      d.extents = [];
      for (var _ = 0; _ < f; _++) {
        var v = {};
        if (d.extents.push(v), this.version === 1 || this.version === 2)
          switch (this.index_size) {
            case 0:
              v.extent_index = 0;
              break;
            case 4:
              v.extent_index = t.readUint32();
              break;
            case 8:
              v.extent_index = t.readUint64();
              break;
            default:
              throw "Error reading extent index";
          }
        switch (this.offset_size) {
          case 0:
            v.extent_offset = 0;
            break;
          case 4:
            v.extent_offset = t.readUint32();
            break;
          case 8:
            v.extent_offset = t.readUint64();
            break;
          default:
            throw "Error reading extent index";
        }
        switch (this.length_size) {
          case 0:
            v.extent_length = 0;
            break;
          case 4:
            v.extent_length = t.readUint32();
            break;
          case 8:
            v.extent_length = t.readUint64();
            break;
          default:
            throw "Error reading extent index";
        }
      }
    }
  }), r.createBoxCtor("imir", function(t) {
    var e = t.readUint8();
    this.reserved = e >> 7, this.axis = e & 1;
  }), r.createFullBoxCtor("infe", function(t) {
    if ((this.version === 0 || this.version === 1) && (this.item_ID = t.readUint16(), this.item_protection_index = t.readUint16(), this.item_name = t.readCString(), this.content_type = t.readCString(), this.content_encoding = t.readCString()), this.version === 1) {
      this.extension_type = t.readString(4), s.warn("BoxParser", "Cannot parse extension type"), t.seek(this.start + this.size);
      return;
    }
    this.version >= 2 && (this.version === 2 ? this.item_ID = t.readUint16() : this.version === 3 && (this.item_ID = t.readUint32()), this.item_protection_index = t.readUint16(), this.item_type = t.readString(4), this.item_name = t.readCString(), this.item_type === "mime" ? (this.content_type = t.readCString(), this.content_encoding = t.readCString()) : this.item_type === "uri " && (this.item_uri_type = t.readCString()));
  }), r.createFullBoxCtor("ipma", function(t) {
    var e, n;
    for (entry_count = t.readUint32(), this.associations = [], e = 0; e < entry_count; e++) {
      var a = {};
      this.associations.push(a), this.version < 1 ? a.id = t.readUint16() : a.id = t.readUint32();
      var d = t.readUint8();
      for (a.props = [], n = 0; n < d; n++) {
        var f = t.readUint8(), _ = {};
        a.props.push(_), _.essential = (f & 128) >> 7 === 1, this.flags & 1 ? _.property_index = (f & 127) << 8 | t.readUint8() : _.property_index = f & 127;
      }
    }
  }), r.createFullBoxCtor("iref", function(t) {
    var e, n;
    for (this.references = []; t.getPosition() < this.start + this.size; )
      if (e = r.parseOneBox(t, true, this.size - (t.getPosition() - this.start)), e.code === r.OK)
        this.version === 0 ? n = new r.SingleItemTypeReferenceBox(e.type, e.size, e.hdr_size, e.start) : n = new r.SingleItemTypeReferenceBoxLarge(e.type, e.size, e.hdr_size, e.start), n.write === r.Box.prototype.write && n.type !== "mdat" && (s.warn("BoxParser", n.type + " box writing not yet implemented, keeping unparsed data in memory for later write"), n.parseDataAndRewind(t)), n.parse(t), this.references.push(n);
      else
        return;
  }), r.createBoxCtor("irot", function(t) {
    this.angle = t.readUint8() & 3;
  }), r.createFullBoxCtor("ispe", function(t) {
    this.image_width = t.readUint32(), this.image_height = t.readUint32();
  }), r.createFullBoxCtor("kind", function(t) {
    this.schemeURI = t.readCString(), this.value = t.readCString();
  }), r.createFullBoxCtor("leva", function(t) {
    var e = t.readUint8();
    this.levels = [];
    for (var n = 0; n < e; n++) {
      var a = {};
      this.levels[n] = a, a.track_ID = t.readUint32();
      var d = t.readUint8();
      switch (a.padding_flag = d >> 7, a.assignment_type = d & 127, a.assignment_type) {
        case 0:
          a.grouping_type = t.readString(4);
          break;
        case 1:
          a.grouping_type = t.readString(4), a.grouping_type_parameter = t.readUint32();
          break;
        case 2:
          break;
        case 3:
          break;
        case 4:
          a.sub_track_id = t.readUint32();
          break;
        default:
          s.warn("BoxParser", "Unknown leva assignement type");
      }
    }
  }), r.createBoxCtor("lhvC", function(t) {
    var e, n, a;
    this.configurationVersion = t.readUint8(), this.min_spatial_segmentation_idc = t.readUint16() & 4095, this.parallelismType = t.readUint8() & 3, a = t.readUint8(), this.numTemporalLayers = (a & 13) >> 3, this.temporalIdNested = (a & 4) >> 2, this.lengthSizeMinusOne = a & 3, this.nalu_arrays = [];
    var d = t.readUint8();
    for (e = 0; e < d; e++) {
      var f = [];
      this.nalu_arrays.push(f), a = t.readUint8(), f.completeness = (a & 128) >> 7, f.nalu_type = a & 63;
      var _ = t.readUint16();
      for (n = 0; n < _; n++) {
        var v = {};
        f.push(v);
        var m = t.readUint16();
        v.data = t.readUint8Array(m);
      }
    }
  }), r.createBoxCtor("lsel", function(t) {
    this.layer_id = t.readUint16();
  }), r.createBoxCtor("maxr", function(t) {
    this.period = t.readUint32(), this.bytes = t.readUint32();
  });
  function S(t, e) {
    this.x = t, this.y = e;
  }
  S.prototype.toString = function() {
    return "(" + this.x + "," + this.y + ")";
  }, r.createBoxCtor("mdcv", function(t) {
    this.display_primaries = [], this.display_primaries[0] = new S(t.readUint16(), t.readUint16()), this.display_primaries[1] = new S(t.readUint16(), t.readUint16()), this.display_primaries[2] = new S(t.readUint16(), t.readUint16()), this.white_point = new S(t.readUint16(), t.readUint16()), this.max_display_mastering_luminance = t.readUint32(), this.min_display_mastering_luminance = t.readUint32();
  }), r.createFullBoxCtor("mdhd", function(t) {
    this.version == 1 ? (this.creation_time = t.readUint64(), this.modification_time = t.readUint64(), this.timescale = t.readUint32(), this.duration = t.readUint64()) : (this.creation_time = t.readUint32(), this.modification_time = t.readUint32(), this.timescale = t.readUint32(), this.duration = t.readUint32()), this.parseLanguage(t), t.readUint16();
  }), r.createFullBoxCtor("mehd", function(t) {
    this.flags & 1 && (s.warn("BoxParser", "mehd box incorrectly uses flags set to 1, converting version to 1"), this.version = 1), this.version == 1 ? this.fragment_duration = t.readUint64() : this.fragment_duration = t.readUint32();
  }), r.createFullBoxCtor("meta", function(t) {
    this.boxes = [], r.ContainerBox.prototype.parse.call(this, t);
  }), r.createFullBoxCtor("mfhd", function(t) {
    this.sequence_number = t.readUint32();
  }), r.createFullBoxCtor("mfro", function(t) {
    this._size = t.readUint32();
  }), r.createFullBoxCtor("mskC", function(t) {
    this.bits_per_pixel = t.readUint8();
  }), r.createFullBoxCtor("mvhd", function(t) {
    this.version == 1 ? (this.creation_time = t.readUint64(), this.modification_time = t.readUint64(), this.timescale = t.readUint32(), this.duration = t.readUint64()) : (this.creation_time = t.readUint32(), this.modification_time = t.readUint32(), this.timescale = t.readUint32(), this.duration = t.readUint32()), this.rate = t.readUint32(), this.volume = t.readUint16() >> 8, t.readUint16(), t.readUint32Array(2), this.matrix = t.readUint32Array(9), t.readUint32Array(6), this.next_track_id = t.readUint32();
  }), r.createBoxCtor("npck", function(t) {
    this.packetssent = t.readUint32();
  }), r.createBoxCtor("nump", function(t) {
    this.packetssent = t.readUint64();
  }), r.createFullBoxCtor("padb", function(t) {
    var e = t.readUint32();
    this.padbits = [];
    for (var n = 0; n < Math.floor((e + 1) / 2); n++)
      this.padbits = t.readUint8();
  }), r.createBoxCtor("pasp", function(t) {
    this.hSpacing = t.readUint32(), this.vSpacing = t.readUint32();
  }), r.createBoxCtor("payl", function(t) {
    this.text = t.readString(this.size - this.hdr_size);
  }), r.createBoxCtor("payt", function(t) {
    this.payloadID = t.readUint32();
    var e = t.readUint8();
    this.rtpmap_string = t.readString(e);
  }), r.createFullBoxCtor("pdin", function(t) {
    var e = (this.size - this.hdr_size) / 8;
    this.rate = [], this.initial_delay = [];
    for (var n = 0; n < e; n++)
      this.rate[n] = t.readUint32(), this.initial_delay[n] = t.readUint32();
  }), r.createFullBoxCtor("pitm", function(t) {
    this.version === 0 ? this.item_id = t.readUint16() : this.item_id = t.readUint32();
  }), r.createFullBoxCtor("pixi", function(t) {
    var e;
    for (this.num_channels = t.readUint8(), this.bits_per_channels = [], e = 0; e < this.num_channels; e++)
      this.bits_per_channels[e] = t.readUint8();
  }), r.createBoxCtor("pmax", function(t) {
    this.bytes = t.readUint32();
  }), r.createFullBoxCtor("prdi", function(t) {
    if (this.step_count = t.readUint16(), this.item_count = [], this.flags & 2)
      for (var e = 0; e < this.step_count; e++)
        this.item_count[e] = t.readUint16();
  }), r.createFullBoxCtor("prft", function(t) {
    this.ref_track_id = t.readUint32(), this.ntp_timestamp = t.readUint64(), this.version === 0 ? this.media_time = t.readUint32() : this.media_time = t.readUint64();
  }), r.createFullBoxCtor("pssh", function(t) {
    if (this.system_id = r.parseHex16(t), this.version > 0) {
      var e = t.readUint32();
      this.kid = [];
      for (var n = 0; n < e; n++)
        this.kid[n] = r.parseHex16(t);
    }
    var a = t.readUint32();
    a > 0 && (this.data = t.readUint8Array(a));
  }), r.createFullBoxCtor("clef", function(t) {
    this.width = t.readUint32(), this.height = t.readUint32();
  }), r.createFullBoxCtor("enof", function(t) {
    this.width = t.readUint32(), this.height = t.readUint32();
  }), r.createFullBoxCtor("prof", function(t) {
    this.width = t.readUint32(), this.height = t.readUint32();
  }), r.createContainerBoxCtor("tapt", null, ["clef", "prof", "enof"]), r.createBoxCtor("rtp ", function(t) {
    this.descriptionformat = t.readString(4), this.sdptext = t.readString(this.size - this.hdr_size - 4);
  }), r.createFullBoxCtor("saio", function(t) {
    this.flags & 1 && (this.aux_info_type = t.readUint32(), this.aux_info_type_parameter = t.readUint32());
    var e = t.readUint32();
    this.offset = [];
    for (var n = 0; n < e; n++)
      this.version === 0 ? this.offset[n] = t.readUint32() : this.offset[n] = t.readUint64();
  }), r.createFullBoxCtor("saiz", function(t) {
    this.flags & 1 && (this.aux_info_type = t.readUint32(), this.aux_info_type_parameter = t.readUint32()), this.default_sample_info_size = t.readUint8();
    var e = t.readUint32();
    if (this.sample_info_size = [], this.default_sample_info_size === 0)
      for (var n = 0; n < e; n++)
        this.sample_info_size[n] = t.readUint8();
  }), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_METADATA, "mett", function(t) {
    this.parseHeader(t), this.content_encoding = t.readCString(), this.mime_format = t.readCString(), this.parseFooter(t);
  }), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_METADATA, "metx", function(t) {
    this.parseHeader(t), this.content_encoding = t.readCString(), this.namespace = t.readCString(), this.schema_location = t.readCString(), this.parseFooter(t);
  }), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_SUBTITLE, "sbtt", function(t) {
    this.parseHeader(t), this.content_encoding = t.readCString(), this.mime_format = t.readCString(), this.parseFooter(t);
  }), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_SUBTITLE, "stpp", function(t) {
    this.parseHeader(t), this.namespace = t.readCString(), this.schema_location = t.readCString(), this.auxiliary_mime_types = t.readCString(), this.parseFooter(t);
  }), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_SUBTITLE, "stxt", function(t) {
    this.parseHeader(t), this.content_encoding = t.readCString(), this.mime_format = t.readCString(), this.parseFooter(t);
  }), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_SUBTITLE, "tx3g", function(t) {
    this.parseHeader(t), this.displayFlags = t.readUint32(), this.horizontal_justification = t.readInt8(), this.vertical_justification = t.readInt8(), this.bg_color_rgba = t.readUint8Array(4), this.box_record = t.readInt16Array(4), this.style_record = t.readUint8Array(12), this.parseFooter(t);
  }), r.createSampleEntryCtor(r.SAMPLE_ENTRY_TYPE_METADATA, "wvtt", function(t) {
    this.parseHeader(t), this.parseFooter(t);
  }), r.createSampleGroupCtor("alst", function(t) {
    var e, n = t.readUint16();
    for (this.first_output_sample = t.readUint16(), this.sample_offset = [], e = 0; e < n; e++)
      this.sample_offset[e] = t.readUint32();
    var a = this.description_length - 4 - 4 * n;
    for (this.num_output_samples = [], this.num_total_samples = [], e = 0; e < a / 4; e++)
      this.num_output_samples[e] = t.readUint16(), this.num_total_samples[e] = t.readUint16();
  }), r.createSampleGroupCtor("avll", function(t) {
    this.layerNumber = t.readUint8(), this.accurateStatisticsFlag = t.readUint8(), this.avgBitRate = t.readUint16(), this.avgFrameRate = t.readUint16();
  }), r.createSampleGroupCtor("avss", function(t) {
    this.subSequenceIdentifier = t.readUint16(), this.layerNumber = t.readUint8();
    var e = t.readUint8();
    this.durationFlag = e >> 7, this.avgRateFlag = e >> 6 & 1, this.durationFlag && (this.duration = t.readUint32()), this.avgRateFlag && (this.accurateStatisticsFlag = t.readUint8(), this.avgBitRate = t.readUint16(), this.avgFrameRate = t.readUint16()), this.dependency = [];
    for (var n = t.readUint8(), a = 0; a < n; a++) {
      var d = {};
      this.dependency.push(d), d.subSeqDirectionFlag = t.readUint8(), d.layerNumber = t.readUint8(), d.subSequenceIdentifier = t.readUint16();
    }
  }), r.createSampleGroupCtor("dtrt", function(t) {
    s.warn("BoxParser", "Sample Group type: " + this.grouping_type + " not fully parsed");
  }), r.createSampleGroupCtor("mvif", function(t) {
    s.warn("BoxParser", "Sample Group type: " + this.grouping_type + " not fully parsed");
  }), r.createSampleGroupCtor("prol", function(t) {
    this.roll_distance = t.readInt16();
  }), r.createSampleGroupCtor("rap ", function(t) {
    var e = t.readUint8();
    this.num_leading_samples_known = e >> 7, this.num_leading_samples = e & 127;
  }), r.createSampleGroupCtor("rash", function(t) {
    if (this.operation_point_count = t.readUint16(), this.description_length !== 2 + (this.operation_point_count === 1 ? 2 : this.operation_point_count * 6) + 9)
      s.warn("BoxParser", "Mismatch in " + this.grouping_type + " sample group length"), this.data = t.readUint8Array(this.description_length - 2);
    else {
      if (this.operation_point_count === 1)
        this.target_rate_share = t.readUint16();
      else {
        this.target_rate_share = [], this.available_bitrate = [];
        for (var e = 0; e < this.operation_point_count; e++)
          this.available_bitrate[e] = t.readUint32(), this.target_rate_share[e] = t.readUint16();
      }
      this.maximum_bitrate = t.readUint32(), this.minimum_bitrate = t.readUint32(), this.discard_priority = t.readUint8();
    }
  }), r.createSampleGroupCtor("roll", function(t) {
    this.roll_distance = t.readInt16();
  }), r.SampleGroupEntry.prototype.parse = function(t) {
    s.warn("BoxParser", "Unknown Sample Group type: " + this.grouping_type), this.data = t.readUint8Array(this.description_length);
  }, r.createSampleGroupCtor("scif", function(t) {
    s.warn("BoxParser", "Sample Group type: " + this.grouping_type + " not fully parsed");
  }), r.createSampleGroupCtor("scnm", function(t) {
    s.warn("BoxParser", "Sample Group type: " + this.grouping_type + " not fully parsed");
  }), r.createSampleGroupCtor("seig", function(t) {
    this.reserved = t.readUint8();
    var e = t.readUint8();
    this.crypt_byte_block = e >> 4, this.skip_byte_block = e & 15, this.isProtected = t.readUint8(), this.Per_Sample_IV_Size = t.readUint8(), this.KID = r.parseHex16(t), this.constant_IV_size = 0, this.constant_IV = 0, this.isProtected === 1 && this.Per_Sample_IV_Size === 0 && (this.constant_IV_size = t.readUint8(), this.constant_IV = t.readUint8Array(this.constant_IV_size));
  }), r.createSampleGroupCtor("stsa", function(t) {
    s.warn("BoxParser", "Sample Group type: " + this.grouping_type + " not fully parsed");
  }), r.createSampleGroupCtor("sync", function(t) {
    var e = t.readUint8();
    this.NAL_unit_type = e & 63;
  }), r.createSampleGroupCtor("tele", function(t) {
    var e = t.readUint8();
    this.level_independently_decodable = e >> 7;
  }), r.createSampleGroupCtor("tsas", function(t) {
    s.warn("BoxParser", "Sample Group type: " + this.grouping_type + " not fully parsed");
  }), r.createSampleGroupCtor("tscl", function(t) {
    s.warn("BoxParser", "Sample Group type: " + this.grouping_type + " not fully parsed");
  }), r.createSampleGroupCtor("vipr", function(t) {
    s.warn("BoxParser", "Sample Group type: " + this.grouping_type + " not fully parsed");
  }), r.createFullBoxCtor("sbgp", function(t) {
    this.grouping_type = t.readString(4), this.version === 1 ? this.grouping_type_parameter = t.readUint32() : this.grouping_type_parameter = 0, this.entries = [];
    for (var e = t.readUint32(), n = 0; n < e; n++) {
      var a = {};
      this.entries.push(a), a.sample_count = t.readInt32(), a.group_description_index = t.readInt32();
    }
  });
  function x(t, e) {
    this.bad_pixel_row = t, this.bad_pixel_column = e;
  }
  x.prototype.toString = function() {
    return "[row: " + this.bad_pixel_row + ", column: " + this.bad_pixel_column + "]";
  }, r.createFullBoxCtor("sbpm", function(t) {
    var e;
    for (this.component_count = t.readUint16(), this.component_index = [], e = 0; e < this.component_count; e++)
      this.component_index.push(t.readUint16());
    var n = t.readUint8();
    for (this.correction_applied = (n & 128) == 128, this.num_bad_rows = t.readUint32(), this.num_bad_cols = t.readUint32(), this.num_bad_pixels = t.readUint32(), this.bad_rows = [], this.bad_columns = [], this.bad_pixels = [], e = 0; e < this.num_bad_rows; e++)
      this.bad_rows.push(t.readUint32());
    for (e = 0; e < this.num_bad_cols; e++)
      this.bad_columns.push(t.readUint32());
    for (e = 0; e < this.num_bad_pixels; e++) {
      var a = t.readUint32(), d = t.readUint32();
      this.bad_pixels.push(new x(a, d));
    }
  }), r.createFullBoxCtor("schm", function(t) {
    this.scheme_type = t.readString(4), this.scheme_version = t.readUint32(), this.flags & 1 && (this.scheme_uri = t.readString(this.size - this.hdr_size - 8));
  }), r.createBoxCtor("sdp ", function(t) {
    this.sdptext = t.readString(this.size - this.hdr_size);
  }), r.createFullBoxCtor("sdtp", function(t) {
    var e, n = this.size - this.hdr_size;
    this.is_leading = [], this.sample_depends_on = [], this.sample_is_depended_on = [], this.sample_has_redundancy = [];
    for (var a = 0; a < n; a++)
      e = t.readUint8(), this.is_leading[a] = e >> 6, this.sample_depends_on[a] = e >> 4 & 3, this.sample_is_depended_on[a] = e >> 2 & 3, this.sample_has_redundancy[a] = e & 3;
  }), r.createFullBoxCtor(
    "senc"
    /*, function(stream) {
    	this.parseFullHeader(stream);
    	var sample_count = stream.readUint32();
    	this.samples = [];
    	for (var i = 0; i < sample_count; i++) {
    		var sample = {};
    		// tenc.default_Per_Sample_IV_Size or seig.Per_Sample_IV_Size
    		sample.InitializationVector = this.readUint8Array(Per_Sample_IV_Size*8);
    		if (this.flags & 0x2) {
    			sample.subsamples = [];
    			subsample_count = stream.readUint16();
    			for (var j = 0; j < subsample_count; j++) {
    				var subsample = {};
    				subsample.BytesOfClearData = stream.readUint16();
    				subsample.BytesOfProtectedData = stream.readUint32();
    				sample.subsamples.push(subsample);
    			}
    		}
    		// TODO
    		this.samples.push(sample);
    	}
    }*/
  ), r.createFullBoxCtor("sgpd", function(t) {
    this.grouping_type = t.readString(4), s.debug("BoxParser", "Found Sample Groups of type " + this.grouping_type), this.version === 1 ? this.default_length = t.readUint32() : this.default_length = 0, this.version >= 2 && (this.default_group_description_index = t.readUint32()), this.entries = [];
    for (var e = t.readUint32(), n = 0; n < e; n++) {
      var a;
      r[this.grouping_type + "SampleGroupEntry"] ? a = new r[this.grouping_type + "SampleGroupEntry"](this.grouping_type) : a = new r.SampleGroupEntry(this.grouping_type), this.entries.push(a), this.version === 1 ? this.default_length === 0 ? a.description_length = t.readUint32() : a.description_length = this.default_length : a.description_length = this.default_length, a.write === r.SampleGroupEntry.prototype.write && (s.info("BoxParser", "SampleGroup for type " + this.grouping_type + " writing not yet implemented, keeping unparsed data in memory for later write"), a.data = t.readUint8Array(a.description_length), t.position -= a.description_length), a.parse(t);
    }
  }), r.createFullBoxCtor("sidx", function(t) {
    this.reference_ID = t.readUint32(), this.timescale = t.readUint32(), this.version === 0 ? (this.earliest_presentation_time = t.readUint32(), this.first_offset = t.readUint32()) : (this.earliest_presentation_time = t.readUint64(), this.first_offset = t.readUint64()), t.readUint16(), this.references = [];
    for (var e = t.readUint16(), n = 0; n < e; n++) {
      var a = {};
      this.references.push(a);
      var d = t.readUint32();
      a.reference_type = d >> 31 & 1, a.referenced_size = d & 2147483647, a.subsegment_duration = t.readUint32(), d = t.readUint32(), a.starts_with_SAP = d >> 31 & 1, a.SAP_type = d >> 28 & 7, a.SAP_delta_time = d & 268435455;
    }
  }), r.SingleItemTypeReferenceBox = function(t, e, n, a) {
    r.Box.call(this, t, e), this.hdr_size = n, this.start = a;
  }, r.SingleItemTypeReferenceBox.prototype = new r.Box(), r.SingleItemTypeReferenceBox.prototype.parse = function(t) {
    this.from_item_ID = t.readUint16();
    var e = t.readUint16();
    this.references = [];
    for (var n = 0; n < e; n++)
      this.references[n] = {}, this.references[n].to_item_ID = t.readUint16();
  }, r.SingleItemTypeReferenceBoxLarge = function(t, e, n, a) {
    r.Box.call(this, t, e), this.hdr_size = n, this.start = a;
  }, r.SingleItemTypeReferenceBoxLarge.prototype = new r.Box(), r.SingleItemTypeReferenceBoxLarge.prototype.parse = function(t) {
    this.from_item_ID = t.readUint32();
    var e = t.readUint16();
    this.references = [];
    for (var n = 0; n < e; n++)
      this.references[n] = {}, this.references[n].to_item_ID = t.readUint32();
  }, r.createFullBoxCtor("SmDm", function(t) {
    this.primaryRChromaticity_x = t.readUint16(), this.primaryRChromaticity_y = t.readUint16(), this.primaryGChromaticity_x = t.readUint16(), this.primaryGChromaticity_y = t.readUint16(), this.primaryBChromaticity_x = t.readUint16(), this.primaryBChromaticity_y = t.readUint16(), this.whitePointChromaticity_x = t.readUint16(), this.whitePointChromaticity_y = t.readUint16(), this.luminanceMax = t.readUint32(), this.luminanceMin = t.readUint32();
  }), r.createFullBoxCtor("smhd", function(t) {
    this.balance = t.readUint16(), t.readUint16();
  }), r.createFullBoxCtor("ssix", function(t) {
    this.subsegments = [];
    for (var e = t.readUint32(), n = 0; n < e; n++) {
      var a = {};
      this.subsegments.push(a), a.ranges = [];
      for (var d = t.readUint32(), f = 0; f < d; f++) {
        var _ = {};
        a.ranges.push(_), _.level = t.readUint8(), _.range_size = t.readUint24();
      }
    }
  }), r.createFullBoxCtor("stco", function(t) {
    var e;
    if (e = t.readUint32(), this.chunk_offsets = [], this.version === 0)
      for (var n = 0; n < e; n++)
        this.chunk_offsets.push(t.readUint32());
  }), r.createFullBoxCtor("stdp", function(t) {
    var e = (this.size - this.hdr_size) / 2;
    this.priority = [];
    for (var n = 0; n < e; n++)
      this.priority[n] = t.readUint16();
  }), r.createFullBoxCtor("sthd"), r.createFullBoxCtor("stri", function(t) {
    this.switch_group = t.readUint16(), this.alternate_group = t.readUint16(), this.sub_track_id = t.readUint32();
    var e = (this.size - this.hdr_size - 8) / 4;
    this.attribute_list = [];
    for (var n = 0; n < e; n++)
      this.attribute_list[n] = t.readUint32();
  }), r.createFullBoxCtor("stsc", function(t) {
    var e, n;
    if (e = t.readUint32(), this.first_chunk = [], this.samples_per_chunk = [], this.sample_description_index = [], this.version === 0)
      for (n = 0; n < e; n++)
        this.first_chunk.push(t.readUint32()), this.samples_per_chunk.push(t.readUint32()), this.sample_description_index.push(t.readUint32());
  }), r.createFullBoxCtor("stsd", function(t) {
    var e, n, a, d;
    for (this.entries = [], a = t.readUint32(), e = 1; e <= a; e++)
      if (n = r.parseOneBox(t, true, this.size - (t.getPosition() - this.start)), n.code === r.OK)
        r[n.type + "SampleEntry"] ? (d = new r[n.type + "SampleEntry"](n.size), d.hdr_size = n.hdr_size, d.start = n.start) : (s.warn("BoxParser", "Unknown sample entry type: " + n.type), d = new r.SampleEntry(n.type, n.size, n.hdr_size, n.start)), d.write === r.SampleEntry.prototype.write && (s.info("BoxParser", "SampleEntry " + d.type + " box writing not yet implemented, keeping unparsed data in memory for later write"), d.parseDataAndRewind(t)), d.parse(t), this.entries.push(d);
      else
        return;
  }), r.createFullBoxCtor("stsg", function(t) {
    this.grouping_type = t.readUint32();
    var e = t.readUint16();
    this.group_description_index = [];
    for (var n = 0; n < e; n++)
      this.group_description_index[n] = t.readUint32();
  }), r.createFullBoxCtor("stsh", function(t) {
    var e, n;
    if (e = t.readUint32(), this.shadowed_sample_numbers = [], this.sync_sample_numbers = [], this.version === 0)
      for (n = 0; n < e; n++)
        this.shadowed_sample_numbers.push(t.readUint32()), this.sync_sample_numbers.push(t.readUint32());
  }), r.createFullBoxCtor("stss", function(t) {
    var e, n;
    if (n = t.readUint32(), this.version === 0)
      for (this.sample_numbers = [], e = 0; e < n; e++)
        this.sample_numbers.push(t.readUint32());
  }), r.createFullBoxCtor("stsz", function(t) {
    var e;
    if (this.sample_sizes = [], this.version === 0)
      for (this.sample_size = t.readUint32(), this.sample_count = t.readUint32(), e = 0; e < this.sample_count; e++)
        this.sample_size === 0 ? this.sample_sizes.push(t.readUint32()) : this.sample_sizes[e] = this.sample_size;
  }), r.createFullBoxCtor("stts", function(t) {
    var e, n, a;
    if (e = t.readUint32(), this.sample_counts = [], this.sample_deltas = [], this.version === 0)
      for (n = 0; n < e; n++)
        this.sample_counts.push(t.readUint32()), a = t.readInt32(), a < 0 && (s.warn("BoxParser", "File uses negative stts sample delta, using value 1 instead, sync may be lost!"), a = 1), this.sample_deltas.push(a);
  }), r.createFullBoxCtor("stvi", function(t) {
    var e = t.readUint32();
    this.single_view_allowed = e & 3, this.stereo_scheme = t.readUint32();
    var n = t.readUint32();
    this.stereo_indication_type = t.readString(n);
    var a, d;
    for (this.boxes = []; t.getPosition() < this.start + this.size; )
      if (a = r.parseOneBox(t, false, this.size - (t.getPosition() - this.start)), a.code === r.OK)
        d = a.box, this.boxes.push(d), this[d.type] = d;
      else
        return;
  }), r.createBoxCtor("styp", function(t) {
    r.ftypBox.prototype.parse.call(this, t);
  }), r.createFullBoxCtor("stz2", function(t) {
    var e, n;
    if (this.sample_sizes = [], this.version === 0)
      if (this.reserved = t.readUint24(), this.field_size = t.readUint8(), n = t.readUint32(), this.field_size === 4)
        for (e = 0; e < n; e += 2) {
          var a = t.readUint8();
          this.sample_sizes[e] = a >> 4 & 15, this.sample_sizes[e + 1] = a & 15;
        }
      else if (this.field_size === 8)
        for (e = 0; e < n; e++)
          this.sample_sizes[e] = t.readUint8();
      else if (this.field_size === 16)
        for (e = 0; e < n; e++)
          this.sample_sizes[e] = t.readUint16();
      else
        s.error("BoxParser", "Error in length field in stz2 box");
  }), r.createFullBoxCtor("subs", function(t) {
    var e, n, a, d;
    for (a = t.readUint32(), this.entries = [], e = 0; e < a; e++) {
      var f = {};
      if (this.entries[e] = f, f.sample_delta = t.readUint32(), f.subsamples = [], d = t.readUint16(), d > 0)
        for (n = 0; n < d; n++) {
          var _ = {};
          f.subsamples.push(_), this.version == 1 ? _.size = t.readUint32() : _.size = t.readUint16(), _.priority = t.readUint8(), _.discardable = t.readUint8(), _.codec_specific_parameters = t.readUint32();
        }
    }
  }), r.createFullBoxCtor("tenc", function(t) {
    if (t.readUint8(), this.version === 0)
      t.readUint8();
    else {
      var e = t.readUint8();
      this.default_crypt_byte_block = e >> 4 & 15, this.default_skip_byte_block = e & 15;
    }
    this.default_isProtected = t.readUint8(), this.default_Per_Sample_IV_Size = t.readUint8(), this.default_KID = r.parseHex16(t), this.default_isProtected === 1 && this.default_Per_Sample_IV_Size === 0 && (this.default_constant_IV_size = t.readUint8(), this.default_constant_IV = t.readUint8Array(this.default_constant_IV_size));
  }), r.createFullBoxCtor("tfdt", function(t) {
    this.version == 1 ? this.baseMediaDecodeTime = t.readUint64() : this.baseMediaDecodeTime = t.readUint32();
  }), r.createFullBoxCtor("tfhd", function(t) {
    var e = 0;
    this.track_id = t.readUint32(), this.size - this.hdr_size > e && this.flags & r.TFHD_FLAG_BASE_DATA_OFFSET ? (this.base_data_offset = t.readUint64(), e += 8) : this.base_data_offset = 0, this.size - this.hdr_size > e && this.flags & r.TFHD_FLAG_SAMPLE_DESC ? (this.default_sample_description_index = t.readUint32(), e += 4) : this.default_sample_description_index = 0, this.size - this.hdr_size > e && this.flags & r.TFHD_FLAG_SAMPLE_DUR ? (this.default_sample_duration = t.readUint32(), e += 4) : this.default_sample_duration = 0, this.size - this.hdr_size > e && this.flags & r.TFHD_FLAG_SAMPLE_SIZE ? (this.default_sample_size = t.readUint32(), e += 4) : this.default_sample_size = 0, this.size - this.hdr_size > e && this.flags & r.TFHD_FLAG_SAMPLE_FLAGS ? (this.default_sample_flags = t.readUint32(), e += 4) : this.default_sample_flags = 0;
  }), r.createFullBoxCtor("tfra", function(t) {
    this.track_ID = t.readUint32(), t.readUint24();
    var e = t.readUint8();
    this.length_size_of_traf_num = e >> 4 & 3, this.length_size_of_trun_num = e >> 2 & 3, this.length_size_of_sample_num = e & 3, this.entries = [];
    for (var n = t.readUint32(), a = 0; a < n; a++)
      this.version === 1 ? (this.time = t.readUint64(), this.moof_offset = t.readUint64()) : (this.time = t.readUint32(), this.moof_offset = t.readUint32()), this.traf_number = t["readUint" + 8 * (this.length_size_of_traf_num + 1)](), this.trun_number = t["readUint" + 8 * (this.length_size_of_trun_num + 1)](), this.sample_number = t["readUint" + 8 * (this.length_size_of_sample_num + 1)]();
  }), r.createFullBoxCtor("tkhd", function(t) {
    this.version == 1 ? (this.creation_time = t.readUint64(), this.modification_time = t.readUint64(), this.track_id = t.readUint32(), t.readUint32(), this.duration = t.readUint64()) : (this.creation_time = t.readUint32(), this.modification_time = t.readUint32(), this.track_id = t.readUint32(), t.readUint32(), this.duration = t.readUint32()), t.readUint32Array(2), this.layer = t.readInt16(), this.alternate_group = t.readInt16(), this.volume = t.readInt16() >> 8, t.readUint16(), this.matrix = t.readInt32Array(9), this.width = t.readUint32(), this.height = t.readUint32();
  }), r.createBoxCtor("tmax", function(t) {
    this.time = t.readUint32();
  }), r.createBoxCtor("tmin", function(t) {
    this.time = t.readUint32();
  }), r.createBoxCtor("totl", function(t) {
    this.bytessent = t.readUint32();
  }), r.createBoxCtor("tpay", function(t) {
    this.bytessent = t.readUint32();
  }), r.createBoxCtor("tpyl", function(t) {
    this.bytessent = t.readUint64();
  }), r.TrackGroupTypeBox.prototype.parse = function(t) {
    this.parseFullHeader(t), this.track_group_id = t.readUint32();
  }, r.createTrackGroupCtor("msrc"), r.TrackReferenceTypeBox = function(t, e, n, a) {
    r.Box.call(this, t, e), this.hdr_size = n, this.start = a;
  }, r.TrackReferenceTypeBox.prototype = new r.Box(), r.TrackReferenceTypeBox.prototype.parse = function(t) {
    this.track_ids = t.readUint32Array((this.size - this.hdr_size) / 4);
  }, r.trefBox.prototype.parse = function(t) {
    for (var e, n; t.getPosition() < this.start + this.size; )
      if (e = r.parseOneBox(t, true, this.size - (t.getPosition() - this.start)), e.code === r.OK)
        n = new r.TrackReferenceTypeBox(e.type, e.size, e.hdr_size, e.start), n.write === r.Box.prototype.write && n.type !== "mdat" && (s.info("BoxParser", "TrackReference " + n.type + " box writing not yet implemented, keeping unparsed data in memory for later write"), n.parseDataAndRewind(t)), n.parse(t), this.boxes.push(n);
      else
        return;
  }, r.createFullBoxCtor("trep", function(t) {
    for (this.track_ID = t.readUint32(), this.boxes = []; t.getPosition() < this.start + this.size; )
      if (ret = r.parseOneBox(t, false, this.size - (t.getPosition() - this.start)), ret.code === r.OK)
        box = ret.box, this.boxes.push(box);
      else
        return;
  }), r.createFullBoxCtor("trex", function(t) {
    this.track_id = t.readUint32(), this.default_sample_description_index = t.readUint32(), this.default_sample_duration = t.readUint32(), this.default_sample_size = t.readUint32(), this.default_sample_flags = t.readUint32();
  }), r.createBoxCtor("trpy", function(t) {
    this.bytessent = t.readUint64();
  }), r.createFullBoxCtor("trun", function(t) {
    var e = 0;
    if (this.sample_count = t.readUint32(), e += 4, this.size - this.hdr_size > e && this.flags & r.TRUN_FLAGS_DATA_OFFSET ? (this.data_offset = t.readInt32(), e += 4) : this.data_offset = 0, this.size - this.hdr_size > e && this.flags & r.TRUN_FLAGS_FIRST_FLAG ? (this.first_sample_flags = t.readUint32(), e += 4) : this.first_sample_flags = 0, this.sample_duration = [], this.sample_size = [], this.sample_flags = [], this.sample_composition_time_offset = [], this.size - this.hdr_size > e)
      for (var n = 0; n < this.sample_count; n++)
        this.flags & r.TRUN_FLAGS_DURATION && (this.sample_duration[n] = t.readUint32()), this.flags & r.TRUN_FLAGS_SIZE && (this.sample_size[n] = t.readUint32()), this.flags & r.TRUN_FLAGS_FLAGS && (this.sample_flags[n] = t.readUint32()), this.flags & r.TRUN_FLAGS_CTS_OFFSET && (this.version === 0 ? this.sample_composition_time_offset[n] = t.readUint32() : this.sample_composition_time_offset[n] = t.readInt32());
  }), r.createFullBoxCtor("tsel", function(t) {
    this.switch_group = t.readUint32();
    var e = (this.size - this.hdr_size - 4) / 4;
    this.attribute_list = [];
    for (var n = 0; n < e; n++)
      this.attribute_list[n] = t.readUint32();
  }), r.createFullBoxCtor("txtC", function(t) {
    this.config = t.readCString();
  }), r.createBoxCtor("tyco", function(t) {
    var e = (this.size - this.hdr_size) / 4;
    this.compatible_brands = [];
    for (var n = 0; n < e; n++)
      this.compatible_brands[n] = t.readString(4);
  }), r.createFullBoxCtor("udes", function(t) {
    this.lang = t.readCString(), this.name = t.readCString(), this.description = t.readCString(), this.tags = t.readCString();
  }), r.createFullBoxCtor("uncC", function(t) {
    var e;
    if (this.profile = t.readUint32(), this.version != 1) {
      if (this.version == 0) {
        for (this.component_count = t.readUint32(), this.component_index = [], this.component_bit_depth_minus_one = [], this.component_format = [], this.component_align_size = [], e = 0; e < this.component_count; e++)
          this.component_index.push(t.readUint16()), this.component_bit_depth_minus_one.push(t.readUint8()), this.component_format.push(t.readUint8()), this.component_align_size.push(t.readUint8());
        this.sampling_type = t.readUint8(), this.interleave_type = t.readUint8(), this.block_size = t.readUint8();
        var n = t.readUint8();
        this.component_little_endian = n >> 7 & 1, this.block_pad_lsb = n >> 6 & 1, this.block_little_endian = n >> 5 & 1, this.block_reversed = n >> 4 & 1, this.pad_unknown = n >> 3 & 1, this.pixel_size = t.readUint32(), this.row_align_size = t.readUint32(), this.tile_align_size = t.readUint32(), this.num_tile_cols_minus_one = t.readUint32(), this.num_tile_rows_minus_one = t.readUint32();
      }
    }
  }), r.createFullBoxCtor("url ", function(t) {
    this.flags !== 1 && (this.location = t.readCString());
  }), r.createFullBoxCtor("urn ", function(t) {
    this.name = t.readCString(), this.size - this.hdr_size - this.name.length - 1 > 0 && (this.location = t.readCString());
  }), r.createUUIDBox("a5d40b30e81411ddba2f0800200c9a66", true, false, function(t) {
    this.LiveServerManifest = t.readString(this.size - this.hdr_size).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }), r.createUUIDBox("d08a4f1810f34a82b6c832d8aba183d3", true, false, function(t) {
    this.system_id = r.parseHex16(t);
    var e = t.readUint32();
    e > 0 && (this.data = t.readUint8Array(e));
  }), r.createUUIDBox(
    "a2394f525a9b4f14a2446c427c648df4",
    true,
    false
    /*, function(stream) {
    	if (this.flags & 0x1) {
    		this.AlgorithmID = stream.readUint24();
    		this.IV_size = stream.readUint8();
    		this.KID = BoxParser.parseHex16(stream);
    	}
    	var sample_count = stream.readUint32();
    	this.samples = [];
    	for (var i = 0; i < sample_count; i++) {
    		var sample = {};
    		sample.InitializationVector = this.readUint8Array(this.IV_size*8);
    		if (this.flags & 0x2) {
    			sample.subsamples = [];
    			sample.NumberOfEntries = stream.readUint16();
    			for (var j = 0; j < sample.NumberOfEntries; j++) {
    				var subsample = {};
    				subsample.BytesOfClearData = stream.readUint16();
    				subsample.BytesOfProtectedData = stream.readUint32();
    				sample.subsamples.push(subsample);
    			}
    		}
    		this.samples.push(sample);
    	}
    }*/
  ), r.createUUIDBox("8974dbce7be74c5184f97148f9882554", true, false, function(t) {
    this.default_AlgorithmID = t.readUint24(), this.default_IV_size = t.readUint8(), this.default_KID = r.parseHex16(t);
  }), r.createUUIDBox("d4807ef2ca3946958e5426cb9e46a79f", true, false, function(t) {
    this.fragment_count = t.readUint8(), this.entries = [];
    for (var e = 0; e < this.fragment_count; e++) {
      var n = {}, a = 0, d = 0;
      this.version === 1 ? (a = t.readUint64(), d = t.readUint64()) : (a = t.readUint32(), d = t.readUint32()), n.absolute_time = a, n.absolute_duration = d, this.entries.push(n);
    }
  }), r.createUUIDBox("6d1d9b0542d544e680e2141daff757b2", true, false, function(t) {
    this.version === 1 ? (this.absolute_time = t.readUint64(), this.duration = t.readUint64()) : (this.absolute_time = t.readUint32(), this.duration = t.readUint32());
  }), r.createFullBoxCtor("vmhd", function(t) {
    this.graphicsmode = t.readUint16(), this.opcolor = t.readUint16Array(3);
  }), r.createFullBoxCtor("vpcC", function(t) {
    var e;
    this.version === 1 ? (this.profile = t.readUint8(), this.level = t.readUint8(), e = t.readUint8(), this.bitDepth = e >> 4, this.chromaSubsampling = e >> 1 & 7, this.videoFullRangeFlag = e & 1, this.colourPrimaries = t.readUint8(), this.transferCharacteristics = t.readUint8(), this.matrixCoefficients = t.readUint8(), this.codecIntializationDataSize = t.readUint16(), this.codecIntializationData = t.readUint8Array(this.codecIntializationDataSize)) : (this.profile = t.readUint8(), this.level = t.readUint8(), e = t.readUint8(), this.bitDepth = e >> 4 & 15, this.colorSpace = e & 15, e = t.readUint8(), this.chromaSubsampling = e >> 4 & 15, this.transferFunction = e >> 1 & 7, this.videoFullRangeFlag = e & 1, this.codecIntializationDataSize = t.readUint16(), this.codecIntializationData = t.readUint8Array(this.codecIntializationDataSize));
  }), r.createBoxCtor("vttC", function(t) {
    this.text = t.readString(this.size - this.hdr_size);
  }), r.createFullBoxCtor("vvcC", function(t) {
    var e, n, a = {
      held_bits: void 0,
      num_held_bits: 0,
      stream_read_1_bytes: function(F) {
        this.held_bits = F.readUint8(), this.num_held_bits = 8;
      },
      stream_read_2_bytes: function(F) {
        this.held_bits = F.readUint16(), this.num_held_bits = 16;
      },
      extract_bits: function(F) {
        var Y = this.held_bits >> this.num_held_bits - F & (1 << F) - 1;
        return this.num_held_bits -= F, Y;
      }
    };
    if (a.stream_read_1_bytes(t), a.extract_bits(5), this.lengthSizeMinusOne = a.extract_bits(2), this.ptl_present_flag = a.extract_bits(1), this.ptl_present_flag) {
      a.stream_read_2_bytes(t), this.ols_idx = a.extract_bits(9), this.num_sublayers = a.extract_bits(3), this.constant_frame_rate = a.extract_bits(2), this.chroma_format_idc = a.extract_bits(2), a.stream_read_1_bytes(t), this.bit_depth_minus8 = a.extract_bits(3), a.extract_bits(5);
      {
        if (a.stream_read_2_bytes(t), a.extract_bits(2), this.num_bytes_constraint_info = a.extract_bits(6), this.general_profile_idc = a.extract_bits(7), this.general_tier_flag = a.extract_bits(1), this.general_level_idc = t.readUint8(), a.stream_read_1_bytes(t), this.ptl_frame_only_constraint_flag = a.extract_bits(1), this.ptl_multilayer_enabled_flag = a.extract_bits(1), this.general_constraint_info = new Uint8Array(this.num_bytes_constraint_info), this.num_bytes_constraint_info) {
          for (e = 0; e < this.num_bytes_constraint_info - 1; e++) {
            var d = a.extract_bits(6);
            a.stream_read_1_bytes(t);
            var f = a.extract_bits(2);
            this.general_constraint_info[e] = d << 2 | f;
          }
          this.general_constraint_info[this.num_bytes_constraint_info - 1] = a.extract_bits(6);
        } else
          a.extract_bits(6);
        if (this.num_sublayers > 1) {
          for (a.stream_read_1_bytes(t), this.ptl_sublayer_present_mask = 0, n = this.num_sublayers - 2; n >= 0; --n) {
            var _ = a.extract_bits(1);
            this.ptl_sublayer_present_mask |= _ << n;
          }
          for (n = this.num_sublayers; n <= 8 && this.num_sublayers > 1; ++n)
            a.extract_bits(1);
          for (this.sublayer_level_idc = [], n = this.num_sublayers - 2; n >= 0; --n)
            this.ptl_sublayer_present_mask & 1 << n && (this.sublayer_level_idc[n] = t.readUint8());
        }
        if (this.ptl_num_sub_profiles = t.readUint8(), this.general_sub_profile_idc = [], this.ptl_num_sub_profiles)
          for (e = 0; e < this.ptl_num_sub_profiles; e++)
            this.general_sub_profile_idc.push(t.readUint32());
      }
      this.max_picture_width = t.readUint16(), this.max_picture_height = t.readUint16(), this.avg_frame_rate = t.readUint16();
    }
    var v = 12, m = 13;
    this.nalu_arrays = [];
    var T = t.readUint8();
    for (e = 0; e < T; e++) {
      var U = [];
      this.nalu_arrays.push(U), a.stream_read_1_bytes(t), U.completeness = a.extract_bits(1), a.extract_bits(2), U.nalu_type = a.extract_bits(5);
      var $ = 1;
      for (U.nalu_type != m && U.nalu_type != v && ($ = t.readUint16()), n = 0; n < $; n++) {
        var V = t.readUint16();
        U.push({
          data: t.readUint8Array(V),
          length: V
        });
      }
    }
  }), r.createFullBoxCtor("vvnC", function(t) {
    var e = strm.readUint8();
    this.lengthSizeMinusOne = e & 3;
  }), r.SampleEntry.prototype.isVideo = function() {
    return false;
  }, r.SampleEntry.prototype.isAudio = function() {
    return false;
  }, r.SampleEntry.prototype.isSubtitle = function() {
    return false;
  }, r.SampleEntry.prototype.isMetadata = function() {
    return false;
  }, r.SampleEntry.prototype.isHint = function() {
    return false;
  }, r.SampleEntry.prototype.getCodec = function() {
    return this.type.replace(".", "");
  }, r.SampleEntry.prototype.getWidth = function() {
    return "";
  }, r.SampleEntry.prototype.getHeight = function() {
    return "";
  }, r.SampleEntry.prototype.getChannelCount = function() {
    return "";
  }, r.SampleEntry.prototype.getSampleRate = function() {
    return "";
  }, r.SampleEntry.prototype.getSampleSize = function() {
    return "";
  }, r.VisualSampleEntry.prototype.isVideo = function() {
    return true;
  }, r.VisualSampleEntry.prototype.getWidth = function() {
    return this.width;
  }, r.VisualSampleEntry.prototype.getHeight = function() {
    return this.height;
  }, r.AudioSampleEntry.prototype.isAudio = function() {
    return true;
  }, r.AudioSampleEntry.prototype.getChannelCount = function() {
    return this.channel_count;
  }, r.AudioSampleEntry.prototype.getSampleRate = function() {
    return this.samplerate;
  }, r.AudioSampleEntry.prototype.getSampleSize = function() {
    return this.samplesize;
  }, r.SubtitleSampleEntry.prototype.isSubtitle = function() {
    return true;
  }, r.MetadataSampleEntry.prototype.isMetadata = function() {
    return true;
  }, r.decimalToHex = function(t, e) {
    var n = Number(t).toString(16);
    for (e = typeof e > "u" || e === null ? e = 2 : e; n.length < e; )
      n = "0" + n;
    return n;
  }, r.avc1SampleEntry.prototype.getCodec = r.avc2SampleEntry.prototype.getCodec = r.avc3SampleEntry.prototype.getCodec = r.avc4SampleEntry.prototype.getCodec = function() {
    var t = r.SampleEntry.prototype.getCodec.call(this);
    return this.avcC ? t + "." + r.decimalToHex(this.avcC.AVCProfileIndication) + r.decimalToHex(this.avcC.profile_compatibility) + r.decimalToHex(this.avcC.AVCLevelIndication) : t;
  }, r.hev1SampleEntry.prototype.getCodec = r.hvc1SampleEntry.prototype.getCodec = function() {
    var t, e = r.SampleEntry.prototype.getCodec.call(this);
    if (this.hvcC) {
      switch (e += ".", this.hvcC.general_profile_space) {
        case 0:
          e += "";
          break;
        case 1:
          e += "A";
          break;
        case 2:
          e += "B";
          break;
        case 3:
          e += "C";
          break;
      }
      e += this.hvcC.general_profile_idc, e += ".";
      var n = this.hvcC.general_profile_compatibility, a = 0;
      for (t = 0; t < 32 && (a |= n & 1, t != 31); t++)
        a <<= 1, n >>= 1;
      e += r.decimalToHex(a, 0), e += ".", this.hvcC.general_tier_flag === 0 ? e += "L" : e += "H", e += this.hvcC.general_level_idc;
      var d = false, f = "";
      for (t = 5; t >= 0; t--)
        (this.hvcC.general_constraint_indicator[t] || d) && (f = "." + r.decimalToHex(this.hvcC.general_constraint_indicator[t], 0) + f, d = true);
      e += f;
    }
    return e;
  }, r.vvc1SampleEntry.prototype.getCodec = r.vvi1SampleEntry.prototype.getCodec = function() {
    var t, e = r.SampleEntry.prototype.getCodec.call(this);
    if (this.vvcC) {
      e += "." + this.vvcC.general_profile_idc, this.vvcC.general_tier_flag ? e += ".H" : e += ".L", e += this.vvcC.general_level_idc;
      var n = "";
      if (this.vvcC.general_constraint_info) {
        var a = [], d = 0;
        d |= this.vvcC.ptl_frame_only_constraint << 7, d |= this.vvcC.ptl_multilayer_enabled << 6;
        var f;
        for (t = 0; t < this.vvcC.general_constraint_info.length; ++t)
          d |= this.vvcC.general_constraint_info[t] >> 2 & 63, a.push(d), d && (f = t), d = this.vvcC.general_constraint_info[t] >> 2 & 3;
        if (f === void 0)
          n = ".CA";
        else {
          n = ".C";
          var _ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567", v = 0, m = 0;
          for (t = 0; t <= f; ++t)
            for (v = v << 8 | a[t], m += 8; m >= 5; ) {
              var T = v >> m - 5 & 31;
              n += _[T], m -= 5, v &= (1 << m) - 1;
            }
          m && (v <<= 5 - m, n += _[v & 31]);
        }
      }
      e += n;
    }
    return e;
  }, r.mp4aSampleEntry.prototype.getCodec = function() {
    var t = r.SampleEntry.prototype.getCodec.call(this);
    if (this.esds && this.esds.esd) {
      var e = this.esds.esd.getOTI(), n = this.esds.esd.getAudioConfig();
      return t + "." + r.decimalToHex(e) + (n ? "." + n : "");
    } else
      return t;
  }, r.stxtSampleEntry.prototype.getCodec = function() {
    var t = r.SampleEntry.prototype.getCodec.call(this);
    return this.mime_format ? t + "." + this.mime_format : t;
  }, r.vp08SampleEntry.prototype.getCodec = r.vp09SampleEntry.prototype.getCodec = function() {
    var t = r.SampleEntry.prototype.getCodec.call(this), e = this.vpcC.level;
    e == 0 && (e = "00");
    var n = this.vpcC.bitDepth;
    return n == 8 && (n = "08"), t + ".0" + this.vpcC.profile + "." + e + "." + n;
  }, r.av01SampleEntry.prototype.getCodec = function() {
    var t = r.SampleEntry.prototype.getCodec.call(this), e = this.av1C.seq_level_idx_0;
    e < 10 && (e = "0" + e);
    var n;
    return this.av1C.seq_profile === 2 && this.av1C.high_bitdepth === 1 ? n = this.av1C.twelve_bit === 1 ? "12" : "10" : this.av1C.seq_profile <= 2 && (n = this.av1C.high_bitdepth === 1 ? "10" : "08"), t + "." + this.av1C.seq_profile + "." + e + (this.av1C.seq_tier_0 ? "H" : "M") + "." + n;
  }, r.Box.prototype.writeHeader = function(t, e) {
    this.size += 8, this.size > u && (this.size += 8), this.type === "uuid" && (this.size += 16), s.debug("BoxWriter", "Writing box " + this.type + " of size: " + this.size + " at position " + t.getPosition() + (e || "")), this.size > u ? t.writeUint32(1) : (this.sizePosition = t.getPosition(), t.writeUint32(this.size)), t.writeString(this.type, null, 4), this.type === "uuid" && t.writeUint8Array(this.uuid), this.size > u && t.writeUint64(this.size);
  }, r.FullBox.prototype.writeHeader = function(t) {
    this.size += 4, r.Box.prototype.writeHeader.call(this, t, " v=" + this.version + " f=" + this.flags), t.writeUint8(this.version), t.writeUint24(this.flags);
  }, r.Box.prototype.write = function(t) {
    this.type === "mdat" ? this.data && (this.size = this.data.length, this.writeHeader(t), t.writeUint8Array(this.data)) : (this.size = this.data ? this.data.length : 0, this.writeHeader(t), this.data && t.writeUint8Array(this.data));
  }, r.ContainerBox.prototype.write = function(t) {
    this.size = 0, this.writeHeader(t);
    for (var e = 0; e < this.boxes.length; e++)
      this.boxes[e] && (this.boxes[e].write(t), this.size += this.boxes[e].size);
    s.debug("BoxWriter", "Adjusting box " + this.type + " with new size " + this.size), t.adjustUint32(this.sizePosition, this.size);
  }, r.TrackReferenceTypeBox.prototype.write = function(t) {
    this.size = this.track_ids.length * 4, this.writeHeader(t), t.writeUint32Array(this.track_ids);
  }, r.avcCBox.prototype.write = function(t) {
    var e;
    for (this.size = 7, e = 0; e < this.SPS.length; e++)
      this.size += 2 + this.SPS[e].length;
    for (e = 0; e < this.PPS.length; e++)
      this.size += 2 + this.PPS[e].length;
    for (this.ext && (this.size += this.ext.length), this.writeHeader(t), t.writeUint8(this.configurationVersion), t.writeUint8(this.AVCProfileIndication), t.writeUint8(this.profile_compatibility), t.writeUint8(this.AVCLevelIndication), t.writeUint8(this.lengthSizeMinusOne + 252), t.writeUint8(this.SPS.length + 224), e = 0; e < this.SPS.length; e++)
      t.writeUint16(this.SPS[e].length), t.writeUint8Array(this.SPS[e].nalu);
    for (t.writeUint8(this.PPS.length), e = 0; e < this.PPS.length; e++)
      t.writeUint16(this.PPS[e].length), t.writeUint8Array(this.PPS[e].nalu);
    this.ext && t.writeUint8Array(this.ext);
  }, r.co64Box.prototype.write = function(t) {
    var e;
    for (this.version = 0, this.flags = 0, this.size = 4 + 8 * this.chunk_offsets.length, this.writeHeader(t), t.writeUint32(this.chunk_offsets.length), e = 0; e < this.chunk_offsets.length; e++)
      t.writeUint64(this.chunk_offsets[e]);
  }, r.cslgBox.prototype.write = function(t) {
    this.version = 0, this.flags = 0, this.size = 4 * 5, this.writeHeader(t), t.writeInt32(this.compositionToDTSShift), t.writeInt32(this.leastDecodeToDisplayDelta), t.writeInt32(this.greatestDecodeToDisplayDelta), t.writeInt32(this.compositionStartTime), t.writeInt32(this.compositionEndTime);
  }, r.cttsBox.prototype.write = function(t) {
    var e;
    for (this.version = 0, this.flags = 0, this.size = 4 + 8 * this.sample_counts.length, this.writeHeader(t), t.writeUint32(this.sample_counts.length), e = 0; e < this.sample_counts.length; e++)
      t.writeUint32(this.sample_counts[e]), this.version === 1 ? t.writeInt32(this.sample_offsets[e]) : t.writeUint32(this.sample_offsets[e]);
  }, r.drefBox.prototype.write = function(t) {
    this.version = 0, this.flags = 0, this.size = 4, this.writeHeader(t), t.writeUint32(this.entries.length);
    for (var e = 0; e < this.entries.length; e++)
      this.entries[e].write(t), this.size += this.entries[e].size;
    s.debug("BoxWriter", "Adjusting box " + this.type + " with new size " + this.size), t.adjustUint32(this.sizePosition, this.size);
  }, r.elngBox.prototype.write = function(t) {
    this.version = 0, this.flags = 0, this.size = this.extended_language.length, this.writeHeader(t), t.writeString(this.extended_language);
  }, r.elstBox.prototype.write = function(t) {
    this.version = 0, this.flags = 0, this.size = 4 + 12 * this.entries.length, this.writeHeader(t), t.writeUint32(this.entries.length);
    for (var e = 0; e < this.entries.length; e++) {
      var n = this.entries[e];
      t.writeUint32(n.segment_duration), t.writeInt32(n.media_time), t.writeInt16(n.media_rate_integer), t.writeInt16(n.media_rate_fraction);
    }
  }, r.emsgBox.prototype.write = function(t) {
    this.version = 0, this.flags = 0, this.size = 4 * 4 + this.message_data.length + (this.scheme_id_uri.length + 1) + (this.value.length + 1), this.writeHeader(t), t.writeCString(this.scheme_id_uri), t.writeCString(this.value), t.writeUint32(this.timescale), t.writeUint32(this.presentation_time_delta), t.writeUint32(this.event_duration), t.writeUint32(this.id), t.writeUint8Array(this.message_data);
  }, r.ftypBox.prototype.write = function(t) {
    this.size = 8 + 4 * this.compatible_brands.length, this.writeHeader(t), t.writeString(this.major_brand, null, 4), t.writeUint32(this.minor_version);
    for (var e = 0; e < this.compatible_brands.length; e++)
      t.writeString(this.compatible_brands[e], null, 4);
  }, r.hdlrBox.prototype.write = function(t) {
    this.size = 5 * 4 + this.name.length + 1, this.version = 0, this.flags = 0, this.writeHeader(t), t.writeUint32(0), t.writeString(this.handler, null, 4), t.writeUint32(0), t.writeUint32(0), t.writeUint32(0), t.writeCString(this.name);
  }, r.hvcCBox.prototype.write = function(t) {
    var e, n;
    for (this.size = 23, e = 0; e < this.nalu_arrays.length; e++)
      for (this.size += 3, n = 0; n < this.nalu_arrays[e].length; n++)
        this.size += 2 + this.nalu_arrays[e][n].data.length;
    for (this.writeHeader(t), t.writeUint8(this.configurationVersion), t.writeUint8((this.general_profile_space << 6) + (this.general_tier_flag << 5) + this.general_profile_idc), t.writeUint32(this.general_profile_compatibility), t.writeUint8Array(this.general_constraint_indicator), t.writeUint8(this.general_level_idc), t.writeUint16(this.min_spatial_segmentation_idc + (15 << 24)), t.writeUint8(this.parallelismType + 252), t.writeUint8(this.chroma_format_idc + 252), t.writeUint8(this.bit_depth_luma_minus8 + 248), t.writeUint8(this.bit_depth_chroma_minus8 + 248), t.writeUint16(this.avgFrameRate), t.writeUint8((this.constantFrameRate << 6) + (this.numTemporalLayers << 3) + (this.temporalIdNested << 2) + this.lengthSizeMinusOne), t.writeUint8(this.nalu_arrays.length), e = 0; e < this.nalu_arrays.length; e++)
      for (t.writeUint8((this.nalu_arrays[e].completeness << 7) + this.nalu_arrays[e].nalu_type), t.writeUint16(this.nalu_arrays[e].length), n = 0; n < this.nalu_arrays[e].length; n++)
        t.writeUint16(this.nalu_arrays[e][n].data.length), t.writeUint8Array(this.nalu_arrays[e][n].data);
  }, r.kindBox.prototype.write = function(t) {
    this.version = 0, this.flags = 0, this.size = this.schemeURI.length + 1 + (this.value.length + 1), this.writeHeader(t), t.writeCString(this.schemeURI), t.writeCString(this.value);
  }, r.mdhdBox.prototype.write = function(t) {
    this.size = 4 * 4 + 2 * 2, this.flags = 0, this.version = 0, this.writeHeader(t), t.writeUint32(this.creation_time), t.writeUint32(this.modification_time), t.writeUint32(this.timescale), t.writeUint32(this.duration), t.writeUint16(this.language), t.writeUint16(0);
  }, r.mehdBox.prototype.write = function(t) {
    this.version = 0, this.flags = 0, this.size = 4, this.writeHeader(t), t.writeUint32(this.fragment_duration);
  }, r.mfhdBox.prototype.write = function(t) {
    this.version = 0, this.flags = 0, this.size = 4, this.writeHeader(t), t.writeUint32(this.sequence_number);
  }, r.mvhdBox.prototype.write = function(t) {
    this.version = 0, this.flags = 0, this.size = 23 * 4 + 2 * 2, this.writeHeader(t), t.writeUint32(this.creation_time), t.writeUint32(this.modification_time), t.writeUint32(this.timescale), t.writeUint32(this.duration), t.writeUint32(this.rate), t.writeUint16(this.volume << 8), t.writeUint16(0), t.writeUint32(0), t.writeUint32(0), t.writeUint32Array(this.matrix), t.writeUint32(0), t.writeUint32(0), t.writeUint32(0), t.writeUint32(0), t.writeUint32(0), t.writeUint32(0), t.writeUint32(this.next_track_id);
  }, r.SampleEntry.prototype.writeHeader = function(t) {
    this.size = 8, r.Box.prototype.writeHeader.call(this, t), t.writeUint8(0), t.writeUint8(0), t.writeUint8(0), t.writeUint8(0), t.writeUint8(0), t.writeUint8(0), t.writeUint16(this.data_reference_index);
  }, r.SampleEntry.prototype.writeFooter = function(t) {
    for (var e = 0; e < this.boxes.length; e++)
      this.boxes[e].write(t), this.size += this.boxes[e].size;
    s.debug("BoxWriter", "Adjusting box " + this.type + " with new size " + this.size), t.adjustUint32(this.sizePosition, this.size);
  }, r.SampleEntry.prototype.write = function(t) {
    this.writeHeader(t), t.writeUint8Array(this.data), this.size += this.data.length, s.debug("BoxWriter", "Adjusting box " + this.type + " with new size " + this.size), t.adjustUint32(this.sizePosition, this.size);
  }, r.VisualSampleEntry.prototype.write = function(t) {
    this.writeHeader(t), this.size += 2 * 7 + 6 * 4 + 32, t.writeUint16(0), t.writeUint16(0), t.writeUint32(0), t.writeUint32(0), t.writeUint32(0), t.writeUint16(this.width), t.writeUint16(this.height), t.writeUint32(this.horizresolution), t.writeUint32(this.vertresolution), t.writeUint32(0), t.writeUint16(this.frame_count), t.writeUint8(Math.min(31, this.compressorname.length)), t.writeString(this.compressorname, null, 31), t.writeUint16(this.depth), t.writeInt16(-1), this.writeFooter(t);
  }, r.AudioSampleEntry.prototype.write = function(t) {
    this.writeHeader(t), this.size += 2 * 4 + 3 * 4, t.writeUint32(0), t.writeUint32(0), t.writeUint16(this.channel_count), t.writeUint16(this.samplesize), t.writeUint16(0), t.writeUint16(0), t.writeUint32(this.samplerate << 16), this.writeFooter(t);
  }, r.stppSampleEntry.prototype.write = function(t) {
    this.writeHeader(t), this.size += this.namespace.length + 1 + this.schema_location.length + 1 + this.auxiliary_mime_types.length + 1, t.writeCString(this.namespace), t.writeCString(this.schema_location), t.writeCString(this.auxiliary_mime_types), this.writeFooter(t);
  }, r.SampleGroupEntry.prototype.write = function(t) {
    t.writeUint8Array(this.data);
  }, r.sbgpBox.prototype.write = function(t) {
    this.version = 1, this.flags = 0, this.size = 12 + 8 * this.entries.length, this.writeHeader(t), t.writeString(this.grouping_type, null, 4), t.writeUint32(this.grouping_type_parameter), t.writeUint32(this.entries.length);
    for (var e = 0; e < this.entries.length; e++) {
      var n = this.entries[e];
      t.writeInt32(n.sample_count), t.writeInt32(n.group_description_index);
    }
  }, r.sgpdBox.prototype.write = function(t) {
    var e, n;
    for (this.flags = 0, this.size = 12, e = 0; e < this.entries.length; e++)
      n = this.entries[e], this.version === 1 && (this.default_length === 0 && (this.size += 4), this.size += n.data.length);
    for (this.writeHeader(t), t.writeString(this.grouping_type, null, 4), this.version === 1 && t.writeUint32(this.default_length), this.version >= 2 && t.writeUint32(this.default_sample_description_index), t.writeUint32(this.entries.length), e = 0; e < this.entries.length; e++)
      n = this.entries[e], this.version === 1 && this.default_length === 0 && t.writeUint32(n.description_length), n.write(t);
  }, r.sidxBox.prototype.write = function(t) {
    this.version = 0, this.flags = 0, this.size = 4 * 4 + 2 + 2 + 12 * this.references.length, this.writeHeader(t), t.writeUint32(this.reference_ID), t.writeUint32(this.timescale), t.writeUint32(this.earliest_presentation_time), t.writeUint32(this.first_offset), t.writeUint16(0), t.writeUint16(this.references.length);
    for (var e = 0; e < this.references.length; e++) {
      var n = this.references[e];
      t.writeUint32(n.reference_type << 31 | n.referenced_size), t.writeUint32(n.subsegment_duration), t.writeUint32(n.starts_with_SAP << 31 | n.SAP_type << 28 | n.SAP_delta_time);
    }
  }, r.smhdBox.prototype.write = function(t) {
    this.version = 0, this.flags = 1, this.size = 4, this.writeHeader(t), t.writeUint16(this.balance), t.writeUint16(0);
  }, r.stcoBox.prototype.write = function(t) {
    this.version = 0, this.flags = 0, this.size = 4 + 4 * this.chunk_offsets.length, this.writeHeader(t), t.writeUint32(this.chunk_offsets.length), t.writeUint32Array(this.chunk_offsets);
  }, r.stscBox.prototype.write = function(t) {
    var e;
    for (this.version = 0, this.flags = 0, this.size = 4 + 12 * this.first_chunk.length, this.writeHeader(t), t.writeUint32(this.first_chunk.length), e = 0; e < this.first_chunk.length; e++)
      t.writeUint32(this.first_chunk[e]), t.writeUint32(this.samples_per_chunk[e]), t.writeUint32(this.sample_description_index[e]);
  }, r.stsdBox.prototype.write = function(t) {
    var e;
    for (this.version = 0, this.flags = 0, this.size = 0, this.writeHeader(t), t.writeUint32(this.entries.length), this.size += 4, e = 0; e < this.entries.length; e++)
      this.entries[e].write(t), this.size += this.entries[e].size;
    s.debug("BoxWriter", "Adjusting box " + this.type + " with new size " + this.size), t.adjustUint32(this.sizePosition, this.size);
  }, r.stshBox.prototype.write = function(t) {
    var e;
    for (this.version = 0, this.flags = 0, this.size = 4 + 8 * this.shadowed_sample_numbers.length, this.writeHeader(t), t.writeUint32(this.shadowed_sample_numbers.length), e = 0; e < this.shadowed_sample_numbers.length; e++)
      t.writeUint32(this.shadowed_sample_numbers[e]), t.writeUint32(this.sync_sample_numbers[e]);
  }, r.stssBox.prototype.write = function(t) {
    this.version = 0, this.flags = 0, this.size = 4 + 4 * this.sample_numbers.length, this.writeHeader(t), t.writeUint32(this.sample_numbers.length), t.writeUint32Array(this.sample_numbers);
  }, r.stszBox.prototype.write = function(t) {
    var e, n = true;
    if (this.version = 0, this.flags = 0, this.sample_sizes.length > 0)
      for (e = 0; e + 1 < this.sample_sizes.length; )
        if (this.sample_sizes[e + 1] !== this.sample_sizes[0]) {
          n = false;
          break;
        } else
          e++;
    else
      n = false;
    this.size = 8, n || (this.size += 4 * this.sample_sizes.length), this.writeHeader(t), n ? t.writeUint32(this.sample_sizes[0]) : t.writeUint32(0), t.writeUint32(this.sample_sizes.length), n || t.writeUint32Array(this.sample_sizes);
  }, r.sttsBox.prototype.write = function(t) {
    var e;
    for (this.version = 0, this.flags = 0, this.size = 4 + 8 * this.sample_counts.length, this.writeHeader(t), t.writeUint32(this.sample_counts.length), e = 0; e < this.sample_counts.length; e++)
      t.writeUint32(this.sample_counts[e]), t.writeUint32(this.sample_deltas[e]);
  }, r.tfdtBox.prototype.write = function(t) {
    var e = Math.pow(2, 32) - 1;
    this.version = this.baseMediaDecodeTime > e ? 1 : 0, this.flags = 0, this.size = 4, this.version === 1 && (this.size += 4), this.writeHeader(t), this.version === 1 ? t.writeUint64(this.baseMediaDecodeTime) : t.writeUint32(this.baseMediaDecodeTime);
  }, r.tfhdBox.prototype.write = function(t) {
    this.version = 0, this.size = 4, this.flags & r.TFHD_FLAG_BASE_DATA_OFFSET && (this.size += 8), this.flags & r.TFHD_FLAG_SAMPLE_DESC && (this.size += 4), this.flags & r.TFHD_FLAG_SAMPLE_DUR && (this.size += 4), this.flags & r.TFHD_FLAG_SAMPLE_SIZE && (this.size += 4), this.flags & r.TFHD_FLAG_SAMPLE_FLAGS && (this.size += 4), this.writeHeader(t), t.writeUint32(this.track_id), this.flags & r.TFHD_FLAG_BASE_DATA_OFFSET && t.writeUint64(this.base_data_offset), this.flags & r.TFHD_FLAG_SAMPLE_DESC && t.writeUint32(this.default_sample_description_index), this.flags & r.TFHD_FLAG_SAMPLE_DUR && t.writeUint32(this.default_sample_duration), this.flags & r.TFHD_FLAG_SAMPLE_SIZE && t.writeUint32(this.default_sample_size), this.flags & r.TFHD_FLAG_SAMPLE_FLAGS && t.writeUint32(this.default_sample_flags);
  }, r.tkhdBox.prototype.write = function(t) {
    this.version = 0, this.size = 4 * 18 + 2 * 4, this.writeHeader(t), t.writeUint32(this.creation_time), t.writeUint32(this.modification_time), t.writeUint32(this.track_id), t.writeUint32(0), t.writeUint32(this.duration), t.writeUint32(0), t.writeUint32(0), t.writeInt16(this.layer), t.writeInt16(this.alternate_group), t.writeInt16(this.volume << 8), t.writeUint16(0), t.writeInt32Array(this.matrix), t.writeUint32(this.width), t.writeUint32(this.height);
  }, r.trexBox.prototype.write = function(t) {
    this.version = 0, this.flags = 0, this.size = 4 * 5, this.writeHeader(t), t.writeUint32(this.track_id), t.writeUint32(this.default_sample_description_index), t.writeUint32(this.default_sample_duration), t.writeUint32(this.default_sample_size), t.writeUint32(this.default_sample_flags);
  }, r.trunBox.prototype.write = function(t) {
    this.version = 0, this.size = 4, this.flags & r.TRUN_FLAGS_DATA_OFFSET && (this.size += 4), this.flags & r.TRUN_FLAGS_FIRST_FLAG && (this.size += 4), this.flags & r.TRUN_FLAGS_DURATION && (this.size += 4 * this.sample_duration.length), this.flags & r.TRUN_FLAGS_SIZE && (this.size += 4 * this.sample_size.length), this.flags & r.TRUN_FLAGS_FLAGS && (this.size += 4 * this.sample_flags.length), this.flags & r.TRUN_FLAGS_CTS_OFFSET && (this.size += 4 * this.sample_composition_time_offset.length), this.writeHeader(t), t.writeUint32(this.sample_count), this.flags & r.TRUN_FLAGS_DATA_OFFSET && (this.data_offset_position = t.getPosition(), t.writeInt32(this.data_offset)), this.flags & r.TRUN_FLAGS_FIRST_FLAG && t.writeUint32(this.first_sample_flags);
    for (var e = 0; e < this.sample_count; e++)
      this.flags & r.TRUN_FLAGS_DURATION && t.writeUint32(this.sample_duration[e]), this.flags & r.TRUN_FLAGS_SIZE && t.writeUint32(this.sample_size[e]), this.flags & r.TRUN_FLAGS_FLAGS && t.writeUint32(this.sample_flags[e]), this.flags & r.TRUN_FLAGS_CTS_OFFSET && (this.version === 0 ? t.writeUint32(this.sample_composition_time_offset[e]) : t.writeInt32(this.sample_composition_time_offset[e]));
  }, r["url Box"].prototype.write = function(t) {
    this.version = 0, this.location ? (this.flags = 0, this.size = this.location.length + 1) : (this.flags = 1, this.size = 0), this.writeHeader(t), this.location && t.writeCString(this.location);
  }, r["urn Box"].prototype.write = function(t) {
    this.version = 0, this.flags = 0, this.size = this.name.length + 1 + (this.location ? this.location.length + 1 : 0), this.writeHeader(t), t.writeCString(this.name), this.location && t.writeCString(this.location);
  }, r.vmhdBox.prototype.write = function(t) {
    this.version = 0, this.flags = 1, this.size = 8, this.writeHeader(t), t.writeUint16(this.graphicsmode), t.writeUint16Array(this.opcolor);
  }, r.vpcCBox.prototype.write = function(t) {
    this.version = 1;
    const e = 8 + this.codecIntializationDataSize;
    this.size = e, this.writeHeader(t), t.writeUint8(this.profile), t.writeUint8(this.level);
    let n = this.bitDepth << 4 | (this.chromaSubsampling & 7) << 1 | this.videoFullRangeFlag & 1;
    t.writeUint8(n), t.writeUint8(this.colourPrimaries), t.writeUint8(this.transferCharacteristics), t.writeUint8(this.matrixCoefficients), t.writeUint16(this.codecIntializationDataSize), this.codecIntializationDataSize > 0 && t.writeUint8Array(this.codecIntializationData);
  }, r.cttsBox.prototype.unpack = function(t) {
    var e, n, a;
    for (a = 0, e = 0; e < this.sample_counts.length; e++)
      for (n = 0; n < this.sample_counts[e]; n++)
        t[a].pts = t[a].dts + this.sample_offsets[e], a++;
  }, r.sttsBox.prototype.unpack = function(t) {
    var e, n, a;
    for (a = 0, e = 0; e < this.sample_counts.length; e++)
      for (n = 0; n < this.sample_counts[e]; n++)
        a === 0 ? t[a].dts = 0 : t[a].dts = t[a - 1].dts + this.sample_deltas[e], a++;
  }, r.stcoBox.prototype.unpack = function(t) {
    var e;
    for (e = 0; e < this.chunk_offsets.length; e++)
      t[e].offset = this.chunk_offsets[e];
  }, r.stscBox.prototype.unpack = function(t) {
    var e, n, a, d, f;
    for (d = 0, f = 0, e = 0; e < this.first_chunk.length; e++)
      for (n = 0; n < (e + 1 < this.first_chunk.length ? this.first_chunk[e + 1] : 1 / 0); n++)
        for (f++, a = 0; a < this.samples_per_chunk[e]; a++) {
          if (t[d])
            t[d].description_index = this.sample_description_index[e], t[d].chunk_index = f;
          else
            return;
          d++;
        }
  }, r.stszBox.prototype.unpack = function(t) {
    var e;
    for (e = 0; e < this.sample_sizes.length; e++)
      t[e].size = this.sample_sizes[e];
  }, r.DIFF_BOXES_PROP_NAMES = [
    "boxes",
    "entries",
    "references",
    "subsamples",
    "items",
    "item_infos",
    "extents",
    "associations",
    "subsegments",
    "ranges",
    "seekLists",
    "seekPoints",
    "esd",
    "levels"
  ], r.DIFF_PRIMITIVE_ARRAY_PROP_NAMES = [
    "compatible_brands",
    "matrix",
    "opcolor",
    "sample_counts",
    "sample_counts",
    "sample_deltas",
    "first_chunk",
    "samples_per_chunk",
    "sample_sizes",
    "chunk_offsets",
    "sample_offsets",
    "sample_description_index",
    "sample_duration"
  ], r.boxEqualFields = function(t, e) {
    if (t && !e) return false;
    var n;
    for (n in t)
      if (!(r.DIFF_BOXES_PROP_NAMES.indexOf(n) > -1)) {
        if (t[n] instanceof r.Box || e[n] instanceof r.Box)
          continue;
        if (typeof t[n] > "u" || typeof e[n] > "u")
          continue;
        if (typeof t[n] == "function" || typeof e[n] == "function")
          continue;
        if (t.subBoxNames && t.subBoxNames.indexOf(n.slice(0, 4)) > -1 || e.subBoxNames && e.subBoxNames.indexOf(n.slice(0, 4)) > -1)
          continue;
        if (n === "data" || n === "start" || n === "size" || n === "creation_time" || n === "modification_time")
          continue;
        if (r.DIFF_PRIMITIVE_ARRAY_PROP_NAMES.indexOf(n) > -1)
          continue;
        if (t[n] !== e[n])
          return false;
      }
    return true;
  }, r.boxEqual = function(t, e) {
    if (!r.boxEqualFields(t, e))
      return false;
    for (var n = 0; n < r.DIFF_BOXES_PROP_NAMES.length; n++) {
      var a = r.DIFF_BOXES_PROP_NAMES[n];
      if (t[a] && e[a] && !r.boxEqual(t[a], e[a]))
        return false;
    }
    return true;
  };
  var b = function() {
  };
  b.prototype.parseSample = function(t) {
    var e = {}, n;
    e.resources = [];
    var a = new l(t.data.buffer);
    if (!t.subsamples || t.subsamples.length === 0)
      e.documentString = a.readString(t.data.length);
    else if (e.documentString = a.readString(t.subsamples[0].size), t.subsamples.length > 1)
      for (n = 1; n < t.subsamples.length; n++)
        e.resources[n] = a.readUint8Array(t.subsamples[n].size);
    return typeof DOMParser < "u" && (e.document = new DOMParser().parseFromString(e.documentString, "application/xml")), e;
  };
  var I = function() {
  };
  I.prototype.parseSample = function(t) {
    var e, n = new l(t.data.buffer);
    return e = n.readString(t.data.length), e;
  }, I.prototype.parseConfig = function(t) {
    var e, n = new l(t.buffer);
    return n.readUint32(), e = n.readCString(), e;
  }, c.XMLSubtitlein4Parser = b, c.Textin4Parser = I;
  var y = function(t) {
    this.stream = t || new h(), this.boxes = [], this.mdats = [], this.moofs = [], this.isProgressive = false, this.moovStartFound = false, this.onMoovStart = null, this.moovStartSent = false, this.onReady = null, this.readySent = false, this.onSegment = null, this.onSamples = null, this.onError = null, this.sampleListBuilt = false, this.fragmentedTracks = [], this.extractedTracks = [], this.isFragmentationInitialized = false, this.sampleProcessingStarted = false, this.nextMoofNumber = 0, this.itemListBuilt = false, this.onSidx = null, this.sidxSent = false;
  };
  y.prototype.setSegmentOptions = function(t, e, n) {
    var a = this.getTrackById(t);
    if (a) {
      var d = {};
      this.fragmentedTracks.push(d), d.id = t, d.user = e, d.trak = a, a.nextSample = 0, d.segmentStream = null, d.nb_samples = 1e3, d.rapAlignement = true, n && (n.nbSamples && (d.nb_samples = n.nbSamples), n.rapAlignement && (d.rapAlignement = n.rapAlignement));
    }
  }, y.prototype.unsetSegmentOptions = function(t) {
    for (var e = -1, n = 0; n < this.fragmentedTracks.length; n++) {
      var a = this.fragmentedTracks[n];
      a.id == t && (e = n);
    }
    e > -1 && this.fragmentedTracks.splice(e, 1);
  }, y.prototype.setExtractionOptions = function(t, e, n) {
    var a = this.getTrackById(t);
    if (a) {
      var d = {};
      this.extractedTracks.push(d), d.id = t, d.user = e, d.trak = a, a.nextSample = 0, d.nb_samples = 1e3, d.samples = [], n && n.nbSamples && (d.nb_samples = n.nbSamples);
    }
  }, y.prototype.unsetExtractionOptions = function(t) {
    for (var e = -1, n = 0; n < this.extractedTracks.length; n++) {
      var a = this.extractedTracks[n];
      a.id == t && (e = n);
    }
    e > -1 && this.extractedTracks.splice(e, 1);
  }, y.prototype.parse = function() {
    var t, e, n = false;
    if (!(this.restoreParsePosition && !this.restoreParsePosition()))
      for (; ; )
        if (this.hasIncompleteMdat && this.hasIncompleteMdat()) {
          if (this.processIncompleteMdat())
            continue;
          return;
        } else if (this.saveParsePosition && this.saveParsePosition(), t = r.parseOneBox(this.stream, n), t.code === r.ERR_NOT_ENOUGH_DATA)
          if (this.processIncompleteBox) {
            if (this.processIncompleteBox(t))
              continue;
            return;
          } else
            return;
        else {
          var a;
          switch (e = t.box, a = e.type !== "uuid" ? e.type : e.uuid, this.boxes.push(e), a) {
            case "mdat":
              this.mdats.push(e);
              break;
            case "moof":
              this.moofs.push(e);
              break;
            case "moov":
              this.moovStartFound = true, this.mdats.length === 0 && (this.isProgressive = true);
            default:
              this[a] !== void 0 && s.warn("ISOFile", "Duplicate Box of type: " + a + ", overriding previous occurrence"), this[a] = e;
              break;
          }
          this.updateUsedBytes && this.updateUsedBytes(e, t);
        }
  }, y.prototype.checkBuffer = function(t) {
    if (t == null)
      throw "Buffer must be defined and non empty";
    if (t.fileStart === void 0)
      throw "Buffer must have a fileStart property";
    return t.byteLength === 0 ? (s.warn("ISOFile", "Ignoring empty buffer (fileStart: " + t.fileStart + ")"), this.stream.logBufferLevel(), false) : (s.info("ISOFile", "Processing buffer (fileStart: " + t.fileStart + ")"), t.usedBytes = 0, this.stream.insertBuffer(t), this.stream.logBufferLevel(), this.stream.initialized() ? true : (s.warn("ISOFile", "Not ready to start parsing"), false));
  }, y.prototype.appendBuffer = function(t, e) {
    var n;
    if (this.checkBuffer(t))
      return this.parse(), this.moovStartFound && !this.moovStartSent && (this.moovStartSent = true, this.onMoovStart && this.onMoovStart()), this.moov ? (this.sampleListBuilt || (this.buildSampleLists(), this.sampleListBuilt = true), this.updateSampleLists(), this.onReady && !this.readySent && (this.readySent = true, this.onReady(this.getInfo())), this.processSamples(e), this.nextSeekPosition ? (n = this.nextSeekPosition, this.nextSeekPosition = void 0) : n = this.nextParsePosition, this.stream.getEndFilePositionAfter && (n = this.stream.getEndFilePositionAfter(n))) : this.nextParsePosition ? n = this.nextParsePosition : n = 0, this.sidx && this.onSidx && !this.sidxSent && (this.onSidx(this.sidx), this.sidxSent = true), this.meta && (this.flattenItemInfo && !this.itemListBuilt && (this.flattenItemInfo(), this.itemListBuilt = true), this.processItems && this.processItems(this.onItem)), this.stream.cleanBuffers && (s.info("ISOFile", "Done processing buffer (fileStart: " + t.fileStart + ") - next buffer to fetch should have a fileStart position of " + n), this.stream.logBufferLevel(), this.stream.cleanBuffers(), this.stream.logBufferLevel(true), s.info("ISOFile", "Sample data size in memory: " + this.getAllocatedSampleDataSize())), n;
  }, y.prototype.getInfo = function() {
    var t, e, n = {}, a, d, f, _, v = (/* @__PURE__ */ new Date("1904-01-01T00:00:00Z")).getTime();
    if (this.moov)
      for (n.hasMoov = true, n.duration = this.moov.mvhd.duration, n.timescale = this.moov.mvhd.timescale, n.isFragmented = this.moov.mvex != null, n.isFragmented && this.moov.mvex.mehd && (n.fragment_duration = this.moov.mvex.mehd.fragment_duration), n.isProgressive = this.isProgressive, n.hasIOD = this.moov.iods != null, n.brands = [], n.brands.push(this.ftyp.major_brand), n.brands = n.brands.concat(this.ftyp.compatible_brands), n.created = new Date(v + this.moov.mvhd.creation_time * 1e3), n.modified = new Date(v + this.moov.mvhd.modification_time * 1e3), n.tracks = [], n.audioTracks = [], n.videoTracks = [], n.subtitleTracks = [], n.metadataTracks = [], n.hintTracks = [], n.otherTracks = [], t = 0; t < this.moov.traks.length; t++) {
        if (a = this.moov.traks[t], _ = a.mdia.minf.stbl.stsd.entries[0], d = {}, n.tracks.push(d), d.id = a.tkhd.track_id, d.name = a.mdia.hdlr.name, d.references = [], a.tref)
          for (e = 0; e < a.tref.boxes.length; e++)
            f = {}, d.references.push(f), f.type = a.tref.boxes[e].type, f.track_ids = a.tref.boxes[e].track_ids;
        a.edts && (d.edits = a.edts.elst.entries), d.created = new Date(v + a.tkhd.creation_time * 1e3), d.modified = new Date(v + a.tkhd.modification_time * 1e3), d.movie_duration = a.tkhd.duration, d.movie_timescale = n.timescale, d.layer = a.tkhd.layer, d.alternate_group = a.tkhd.alternate_group, d.volume = a.tkhd.volume, d.matrix = a.tkhd.matrix, d.track_width = a.tkhd.width / 65536, d.track_height = a.tkhd.height / 65536, d.timescale = a.mdia.mdhd.timescale, d.cts_shift = a.mdia.minf.stbl.cslg, d.duration = a.mdia.mdhd.duration, d.samples_duration = a.samples_duration, d.codec = _.getCodec(), d.kind = a.udta && a.udta.kinds.length ? a.udta.kinds[0] : { schemeURI: "", value: "" }, d.language = a.mdia.elng ? a.mdia.elng.extended_language : a.mdia.mdhd.languageString, d.nb_samples = a.samples.length, d.size = a.samples_size, d.bitrate = d.size * 8 * d.timescale / d.samples_duration, _.isAudio() ? (d.type = "audio", n.audioTracks.push(d), d.audio = {}, d.audio.sample_rate = _.getSampleRate(), d.audio.channel_count = _.getChannelCount(), d.audio.sample_size = _.getSampleSize()) : _.isVideo() ? (d.type = "video", n.videoTracks.push(d), d.video = {}, d.video.width = _.getWidth(), d.video.height = _.getHeight()) : _.isSubtitle() ? (d.type = "subtitles", n.subtitleTracks.push(d)) : _.isHint() ? (d.type = "metadata", n.hintTracks.push(d)) : _.isMetadata() ? (d.type = "metadata", n.metadataTracks.push(d)) : (d.type = "metadata", n.otherTracks.push(d));
      }
    else
      n.hasMoov = false;
    if (n.mime = "", n.hasMoov && n.tracks) {
      for (n.videoTracks && n.videoTracks.length > 0 ? n.mime += 'video/mp4; codecs="' : n.audioTracks && n.audioTracks.length > 0 ? n.mime += 'audio/mp4; codecs="' : n.mime += 'application/mp4; codecs="', t = 0; t < n.tracks.length; t++)
        t !== 0 && (n.mime += ","), n.mime += n.tracks[t].codec;
      n.mime += '"; profiles="', n.mime += this.ftyp.compatible_brands.join(), n.mime += '"';
    }
    return n;
  }, y.prototype.setNextSeekPositionFromSample = function(t) {
    t && (this.nextSeekPosition ? this.nextSeekPosition = Math.min(t.offset + t.alreadyRead, this.nextSeekPosition) : this.nextSeekPosition = t.offset + t.alreadyRead);
  }, y.prototype.processSamples = function(t) {
    var e, n;
    if (this.sampleProcessingStarted) {
      if (this.isFragmentationInitialized && this.onSegment !== null)
        for (e = 0; e < this.fragmentedTracks.length; e++) {
          var a = this.fragmentedTracks[e];
          for (n = a.trak; n.nextSample < n.samples.length && this.sampleProcessingStarted; ) {
            s.debug("ISOFile", "Creating media fragment on track #" + a.id + " for sample " + n.nextSample);
            var d = this.createFragment(a.id, n.nextSample, a.segmentStream);
            if (d)
              a.segmentStream = d, n.nextSample++;
            else
              break;
            if ((n.nextSample % a.nb_samples === 0 || t || n.nextSample >= n.samples.length) && (s.info("ISOFile", "Sending fragmented data on track #" + a.id + " for samples [" + Math.max(0, n.nextSample - a.nb_samples) + "," + (n.nextSample - 1) + "]"), s.info("ISOFile", "Sample data size in memory: " + this.getAllocatedSampleDataSize()), this.onSegment && this.onSegment(a.id, a.user, a.segmentStream.buffer, n.nextSample, t || n.nextSample >= n.samples.length), a.segmentStream = null, a !== this.fragmentedTracks[e]))
              break;
          }
        }
      if (this.onSamples !== null)
        for (e = 0; e < this.extractedTracks.length; e++) {
          var f = this.extractedTracks[e];
          for (n = f.trak; n.nextSample < n.samples.length && this.sampleProcessingStarted; ) {
            s.debug("ISOFile", "Exporting on track #" + f.id + " sample #" + n.nextSample);
            var _ = this.getSample(n, n.nextSample);
            if (_)
              n.nextSample++, f.samples.push(_);
            else {
              this.setNextSeekPositionFromSample(n.samples[n.nextSample]);
              break;
            }
            if ((n.nextSample % f.nb_samples === 0 || n.nextSample >= n.samples.length) && (s.debug("ISOFile", "Sending samples on track #" + f.id + " for sample " + n.nextSample), this.onSamples && this.onSamples(f.id, f.user, f.samples), f.samples = [], f !== this.extractedTracks[e]))
              break;
          }
        }
    }
  }, y.prototype.getBox = function(t) {
    var e = this.getBoxes(t, true);
    return e.length ? e[0] : null;
  }, y.prototype.getBoxes = function(t, e) {
    var n = [];
    return y._sweep.call(this, t, n, e), n;
  }, y._sweep = function(t, e, n) {
    this.type && this.type == t && e.push(this);
    for (var a in this.boxes) {
      if (e.length && n) return;
      y._sweep.call(this.boxes[a], t, e, n);
    }
  }, y.prototype.getTrackSamplesInfo = function(t) {
    var e = this.getTrackById(t);
    if (e)
      return e.samples;
  }, y.prototype.getTrackSample = function(t, e) {
    var n = this.getTrackById(t), a = this.getSample(n, e);
    return a;
  }, y.prototype.releaseUsedSamples = function(t, e) {
    var n = 0, a = this.getTrackById(t);
    a.lastValidSample || (a.lastValidSample = 0);
    for (var d = a.lastValidSample; d < e; d++)
      n += this.releaseSample(a, d);
    s.info("ISOFile", "Track #" + t + " released samples up to " + e + " (released size: " + n + ", remaining: " + this.samplesDataSize + ")"), a.lastValidSample = e;
  }, y.prototype.start = function() {
    this.sampleProcessingStarted = true, this.processSamples(false);
  }, y.prototype.stop = function() {
    this.sampleProcessingStarted = false;
  }, y.prototype.flush = function() {
    s.info("ISOFile", "Flushing remaining samples"), this.updateSampleLists(), this.processSamples(true), this.stream.cleanBuffers(), this.stream.logBufferLevel(true);
  }, y.prototype.seekTrack = function(t, e, n) {
    var a, d, f = 1 / 0, _ = 0, v = 0, m;
    if (n.samples.length === 0)
      return s.info("ISOFile", "No sample in track, cannot seek! Using time " + s.getDurationString(0, 1) + " and offset: 0"), { offset: 0, time: 0 };
    for (a = 0; a < n.samples.length; a++) {
      if (d = n.samples[a], a === 0)
        v = 0, m = d.timescale;
      else if (d.cts > t * d.timescale) {
        v = a - 1;
        break;
      }
      e && d.is_sync && (_ = a);
    }
    for (e && (v = _), t = n.samples[v].cts, n.nextSample = v; n.samples[v].alreadyRead === n.samples[v].size && n.samples[v + 1]; )
      v++;
    return f = n.samples[v].offset + n.samples[v].alreadyRead, s.info("ISOFile", "Seeking to " + (e ? "RAP" : "") + " sample #" + n.nextSample + " on track " + n.tkhd.track_id + ", time " + s.getDurationString(t, m) + " and offset: " + f), { offset: f, time: t / m };
  }, y.prototype.getTrackDuration = function(t) {
    var e;
    return t.samples ? (e = t.samples[t.samples.length - 1], (e.cts + e.duration) / e.timescale) : 1 / 0;
  }, y.prototype.seek = function(t, e) {
    var n = this.moov, a, d, f, _ = { offset: 1 / 0, time: 1 / 0 };
    if (this.moov) {
      for (f = 0; f < n.traks.length; f++)
        a = n.traks[f], !(t > this.getTrackDuration(a)) && (d = this.seekTrack(t, e, a), d.offset < _.offset && (_.offset = d.offset), d.time < _.time && (_.time = d.time));
      return s.info("ISOFile", "Seeking at time " + s.getDurationString(_.time, 1) + " needs a buffer with a fileStart position of " + _.offset), _.offset === 1 / 0 ? _ = { offset: this.nextParsePosition, time: 0 } : _.offset = this.stream.getEndFilePositionAfter(_.offset), s.info("ISOFile", "Adjusted seek position (after checking data already in buffer): " + _.offset), _;
    } else
      throw "Cannot seek: moov not received!";
  }, y.prototype.equal = function(t) {
    for (var e = 0; e < this.boxes.length && e < t.boxes.length; ) {
      var n = this.boxes[e], a = t.boxes[e];
      if (!r.boxEqual(n, a))
        return false;
      e++;
    }
    return true;
  }, c.ISOFile = y, y.prototype.lastBoxStartPosition = 0, y.prototype.parsingMdat = null, y.prototype.nextParsePosition = 0, y.prototype.discardMdatData = false, y.prototype.processIncompleteBox = function(t) {
    var e, n, a;
    return t.type === "mdat" ? (e = new r[t.type + "Box"](t.size), this.parsingMdat = e, this.boxes.push(e), this.mdats.push(e), e.start = t.start, e.hdr_size = t.hdr_size, this.stream.addUsedBytes(e.hdr_size), this.lastBoxStartPosition = e.start + e.size, a = this.stream.seek(e.start + e.size, false, this.discardMdatData), a ? (this.parsingMdat = null, true) : (this.moovStartFound ? this.nextParsePosition = this.stream.findEndContiguousBuf() : this.nextParsePosition = e.start + e.size, false)) : (t.type === "moov" && (this.moovStartFound = true, this.mdats.length === 0 && (this.isProgressive = true)), n = this.stream.mergeNextBuffer ? this.stream.mergeNextBuffer() : false, n ? (this.nextParsePosition = this.stream.getEndPosition(), true) : (t.type ? this.moovStartFound ? this.nextParsePosition = this.stream.getEndPosition() : this.nextParsePosition = this.stream.getPosition() + t.size : this.nextParsePosition = this.stream.getEndPosition(), false));
  }, y.prototype.hasIncompleteMdat = function() {
    return this.parsingMdat !== null;
  }, y.prototype.processIncompleteMdat = function() {
    var t, e;
    return t = this.parsingMdat, e = this.stream.seek(t.start + t.size, false, this.discardMdatData), e ? (s.debug("ISOFile", "Found 'mdat' end in buffered data"), this.parsingMdat = null, true) : (this.nextParsePosition = this.stream.findEndContiguousBuf(), false);
  }, y.prototype.restoreParsePosition = function() {
    return this.stream.seek(this.lastBoxStartPosition, true, this.discardMdatData);
  }, y.prototype.saveParsePosition = function() {
    this.lastBoxStartPosition = this.stream.getPosition();
  }, y.prototype.updateUsedBytes = function(t, e) {
    this.stream.addUsedBytes && (t.type === "mdat" ? (this.stream.addUsedBytes(t.hdr_size), this.discardMdatData && this.stream.addUsedBytes(t.size - t.hdr_size)) : this.stream.addUsedBytes(t.size));
  }, y.prototype.add = r.Box.prototype.add, y.prototype.addBox = r.Box.prototype.addBox, y.prototype.init = function(t) {
    var e = t || {};
    this.add("ftyp").set("major_brand", e.brands && e.brands[0] || "iso4").set("minor_version", 0).set("compatible_brands", e.brands || ["iso4"]);
    var n = this.add("moov");
    return n.add("mvhd").set("timescale", e.timescale || 600).set("rate", e.rate || 65536).set("creation_time", 0).set("modification_time", 0).set("duration", e.duration || 0).set("volume", e.width ? 0 : 256).set("matrix", [65536, 0, 0, 0, 65536, 0, 0, 0, 1073741824]).set("next_track_id", 1), n.add("mvex"), this;
  }, y.prototype.addTrack = function(t) {
    this.moov || this.init(t);
    var e = t || {};
    e.width = e.width || 320, e.height = e.height || 320, e.id = e.id || this.moov.mvhd.next_track_id, e.type = e.type || "avc1";
    var n = this.moov.add("trak");
    this.moov.mvhd.next_track_id = e.id + 1, n.add("tkhd").set("flags", r.TKHD_FLAG_ENABLED | r.TKHD_FLAG_IN_MOVIE | r.TKHD_FLAG_IN_PREVIEW).set("creation_time", 0).set("modification_time", 0).set("track_id", e.id).set("duration", e.duration || 0).set("layer", e.layer || 0).set("alternate_group", 0).set("volume", 1).set("matrix", [65536, 0, 0, 0, 65536, 0, 0, 0, 1073741824]).set("width", e.width << 16).set("height", e.height << 16);
    var a = n.add("mdia");
    a.add("mdhd").set("creation_time", 0).set("modification_time", 0).set("timescale", e.timescale || 1).set("duration", e.media_duration || 0).set("language", e.language || "und"), a.add("hdlr").set("handler", e.hdlr || "vide").set("name", e.name || "Track created with MP4Box.js"), a.add("elng").set("extended_language", e.language || "fr-FR");
    var d = a.add("minf");
    if (r[e.type + "SampleEntry"] !== void 0) {
      var f = new r[e.type + "SampleEntry"]();
      f.data_reference_index = 1;
      var _ = "";
      for (var v in r.sampleEntryCodes)
        for (var m = r.sampleEntryCodes[v], T = 0; T < m.length; T++)
          if (m.indexOf(e.type) > -1) {
            _ = v;
            break;
          }
      switch (_) {
        case "Visual":
          if (d.add("vmhd").set("graphicsmode", 0).set("opcolor", [0, 0, 0]), f.set("width", e.width).set("height", e.height).set("horizresolution", 72 << 16).set("vertresolution", 72 << 16).set("frame_count", 1).set("compressorname", e.type + " Compressor").set("depth", 24), e.avcDecoderConfigRecord) {
            var U = new r.avcCBox();
            U.parse(new l(e.avcDecoderConfigRecord)), f.addBox(U);
          } else if (e.hevcDecoderConfigRecord) {
            var $ = new r.hvcCBox();
            $.parse(new l(e.hevcDecoderConfigRecord)), f.addBox($);
          } else if (e.vpcDecoderConfigRecord) {
            var V = new r.vpcCBox();
            V.parse(new l(e.vpcDecoderConfigRecord)), f.addBox(V);
          }
          break;
        case "Audio":
          d.add("smhd").set("balance", e.balance || 0), f.set("channel_count", e.channel_count || 2).set("samplesize", e.samplesize || 16).set("samplerate", e.samplerate || 65536);
          break;
        case "Hint":
          d.add("hmhd");
          break;
        case "Subtitle":
          switch (d.add("sthd"), e.type) {
            case "stpp":
              f.set("namespace", e.namespace || "nonamespace").set("schema_location", e.schema_location || "").set("auxiliary_mime_types", e.auxiliary_mime_types || "");
              break;
          }
          break;
        case "Metadata":
          d.add("nmhd");
          break;
        case "System":
          d.add("nmhd");
          break;
        default:
          d.add("nmhd");
          break;
      }
      e.description && f.addBox(e.description), e.description_boxes && e.description_boxes.forEach(function(Y) {
        f.addBox(Y);
      }), d.add("dinf").add("dref").addEntry(new r["url Box"]().set("flags", 1));
      var F = d.add("stbl");
      return F.add("stsd").addEntry(f), F.add("stts").set("sample_counts", []).set("sample_deltas", []), F.add("stsc").set("first_chunk", []).set("samples_per_chunk", []).set("sample_description_index", []), F.add("stco").set("chunk_offsets", []), F.add("stsz").set("sample_sizes", []), this.moov.mvex.add("trex").set("track_id", e.id).set("default_sample_description_index", e.default_sample_description_index || 1).set("default_sample_duration", e.default_sample_duration || 0).set("default_sample_size", e.default_sample_size || 0).set("default_sample_flags", e.default_sample_flags || 0), this.buildTrakSampleLists(n), e.id;
    }
  }, r.Box.prototype.computeSize = function(t) {
    var e = t || new o();
    e.endianness = o.BIG_ENDIAN, this.write(e);
  }, y.prototype.addSample = function(t, e, n) {
    var a = n || {}, d = {}, f = this.getTrackById(t);
    if (f !== null) {
      d.number = f.samples.length, d.track_id = f.tkhd.track_id, d.timescale = f.mdia.mdhd.timescale, d.description_index = a.sample_description_index ? a.sample_description_index - 1 : 0, d.description = f.mdia.minf.stbl.stsd.entries[d.description_index], d.data = e, d.size = e.byteLength, d.alreadyRead = d.size, d.duration = a.duration || 1, d.cts = a.cts || 0, d.dts = a.dts || 0, d.is_sync = a.is_sync || false, d.is_leading = a.is_leading || 0, d.depends_on = a.depends_on || 0, d.is_depended_on = a.is_depended_on || 0, d.has_redundancy = a.has_redundancy || 0, d.degradation_priority = a.degradation_priority || 0, d.offset = 0, d.subsamples = a.subsamples, f.samples.push(d), f.samples_size += d.size, f.samples_duration += d.duration, f.first_dts === void 0 && (f.first_dts = a.dts), this.processSamples();
      var _ = this.createSingleSampleMoof(d);
      return this.addBox(_), _.computeSize(), _.trafs[0].truns[0].data_offset = _.size + 8, this.add("mdat").data = new Uint8Array(e), d;
    }
  }, y.prototype.createSingleSampleMoof = function(t) {
    var e = 0;
    t.is_sync ? e = 1 << 25 : e = 65536;
    var n = new r.moofBox();
    n.add("mfhd").set("sequence_number", this.nextMoofNumber), this.nextMoofNumber++;
    var a = n.add("traf"), d = this.getTrackById(t.track_id);
    return a.add("tfhd").set("track_id", t.track_id).set("flags", r.TFHD_FLAG_DEFAULT_BASE_IS_MOOF), a.add("tfdt").set("baseMediaDecodeTime", t.dts - (d.first_dts || 0)), a.add("trun").set("flags", r.TRUN_FLAGS_DATA_OFFSET | r.TRUN_FLAGS_DURATION | r.TRUN_FLAGS_SIZE | r.TRUN_FLAGS_FLAGS | r.TRUN_FLAGS_CTS_OFFSET).set("data_offset", 0).set("first_sample_flags", 0).set("sample_count", 1).set("sample_duration", [t.duration]).set("sample_size", [t.size]).set("sample_flags", [e]).set("sample_composition_time_offset", [t.cts - t.dts]), n;
  }, y.prototype.lastMoofIndex = 0, y.prototype.samplesDataSize = 0, y.prototype.resetTables = function() {
    var t, e, n, a, d, f, _, v;
    for (this.initial_duration = this.moov.mvhd.duration, this.moov.mvhd.duration = 0, t = 0; t < this.moov.traks.length; t++) {
      e = this.moov.traks[t], e.tkhd.duration = 0, e.mdia.mdhd.duration = 0, n = e.mdia.minf.stbl.stco || e.mdia.minf.stbl.co64, n.chunk_offsets = [], a = e.mdia.minf.stbl.stsc, a.first_chunk = [], a.samples_per_chunk = [], a.sample_description_index = [], d = e.mdia.minf.stbl.stsz || e.mdia.minf.stbl.stz2, d.sample_sizes = [], f = e.mdia.minf.stbl.stts, f.sample_counts = [], f.sample_deltas = [], _ = e.mdia.minf.stbl.ctts, _ && (_.sample_counts = [], _.sample_offsets = []), v = e.mdia.minf.stbl.stss;
      var m = e.mdia.minf.stbl.boxes.indexOf(v);
      m != -1 && (e.mdia.minf.stbl.boxes[m] = null);
    }
  }, y.initSampleGroups = function(t, e, n, a, d) {
    var f, _, v, m;
    function T(U, $, V) {
      this.grouping_type = U, this.grouping_type_parameter = $, this.sbgp = V, this.last_sample_in_run = -1, this.entry_index = -1;
    }
    for (e && (e.sample_groups_info = []), t.sample_groups_info || (t.sample_groups_info = []), _ = 0; _ < n.length; _++) {
      for (m = n[_].grouping_type + "/" + n[_].grouping_type_parameter, v = new T(n[_].grouping_type, n[_].grouping_type_parameter, n[_]), e && (e.sample_groups_info[m] = v), t.sample_groups_info[m] || (t.sample_groups_info[m] = v), f = 0; f < a.length; f++)
        a[f].grouping_type === n[_].grouping_type && (v.description = a[f], v.description.used = true);
      if (d)
        for (f = 0; f < d.length; f++)
          d[f].grouping_type === n[_].grouping_type && (v.fragment_description = d[f], v.fragment_description.used = true, v.is_fragment = true);
    }
    if (e) {
      if (d)
        for (_ = 0; _ < d.length; _++)
          !d[_].used && d[_].version >= 2 && (m = d[_].grouping_type + "/0", v = new T(d[_].grouping_type, 0), v.is_fragment = true, e.sample_groups_info[m] || (e.sample_groups_info[m] = v));
    } else
      for (_ = 0; _ < a.length; _++)
        !a[_].used && a[_].version >= 2 && (m = a[_].grouping_type + "/0", v = new T(a[_].grouping_type, 0), t.sample_groups_info[m] || (t.sample_groups_info[m] = v));
  }, y.setSampleGroupProperties = function(t, e, n, a) {
    var d, f;
    e.sample_groups = [];
    for (d in a)
      if (e.sample_groups[d] = {}, e.sample_groups[d].grouping_type = a[d].grouping_type, e.sample_groups[d].grouping_type_parameter = a[d].grouping_type_parameter, n >= a[d].last_sample_in_run && (a[d].last_sample_in_run < 0 && (a[d].last_sample_in_run = 0), a[d].entry_index++, a[d].entry_index <= a[d].sbgp.entries.length - 1 && (a[d].last_sample_in_run += a[d].sbgp.entries[a[d].entry_index].sample_count)), a[d].entry_index <= a[d].sbgp.entries.length - 1 ? e.sample_groups[d].group_description_index = a[d].sbgp.entries[a[d].entry_index].group_description_index : e.sample_groups[d].group_description_index = -1, e.sample_groups[d].group_description_index !== 0) {
        var _;
        a[d].fragment_description ? _ = a[d].fragment_description : _ = a[d].description, e.sample_groups[d].group_description_index > 0 ? (e.sample_groups[d].group_description_index > 65535 ? f = (e.sample_groups[d].group_description_index >> 16) - 1 : f = e.sample_groups[d].group_description_index - 1, _ && f >= 0 && (e.sample_groups[d].description = _.entries[f])) : _ && _.version >= 2 && _.default_group_description_index > 0 && (e.sample_groups[d].description = _.entries[_.default_group_description_index - 1]);
      }
  }, y.process_sdtp = function(t, e, n) {
    e && (t ? (e.is_leading = t.is_leading[n], e.depends_on = t.sample_depends_on[n], e.is_depended_on = t.sample_is_depended_on[n], e.has_redundancy = t.sample_has_redundancy[n]) : (e.is_leading = 0, e.depends_on = 0, e.is_depended_on = 0, e.has_redundancy = 0));
  }, y.prototype.buildSampleLists = function() {
    var t, e;
    for (t = 0; t < this.moov.traks.length; t++)
      e = this.moov.traks[t], this.buildTrakSampleLists(e);
  }, y.prototype.buildTrakSampleLists = function(t) {
    var e, n, a, d, f, _, v, m, T, U, $, V, F, Y, W, ut, _t, rt, R, P, k, L, j, C;
    if (t.samples = [], t.samples_duration = 0, t.samples_size = 0, n = t.mdia.minf.stbl.stco || t.mdia.minf.stbl.co64, a = t.mdia.minf.stbl.stsc, d = t.mdia.minf.stbl.stsz || t.mdia.minf.stbl.stz2, f = t.mdia.minf.stbl.stts, _ = t.mdia.minf.stbl.ctts, v = t.mdia.minf.stbl.stss, m = t.mdia.minf.stbl.stsd, T = t.mdia.minf.stbl.subs, V = t.mdia.minf.stbl.stdp, U = t.mdia.minf.stbl.sbgps, $ = t.mdia.minf.stbl.sgpds, rt = -1, R = -1, P = -1, k = -1, L = 0, j = 0, C = 0, y.initSampleGroups(t, null, U, $), !(typeof d > "u")) {
      for (e = 0; e < d.sample_sizes.length; e++) {
        var z = {};
        z.number = e, z.track_id = t.tkhd.track_id, z.timescale = t.mdia.mdhd.timescale, z.alreadyRead = 0, t.samples[e] = z, z.size = d.sample_sizes[e], t.samples_size += z.size, e === 0 ? (Y = 1, F = 0, z.chunk_index = Y, z.chunk_run_index = F, _t = a.samples_per_chunk[F], ut = 0, F + 1 < a.first_chunk.length ? W = a.first_chunk[F + 1] - 1 : W = 1 / 0) : e < _t ? (z.chunk_index = Y, z.chunk_run_index = F) : (Y++, z.chunk_index = Y, ut = 0, Y <= W || (F++, F + 1 < a.first_chunk.length ? W = a.first_chunk[F + 1] - 1 : W = 1 / 0), z.chunk_run_index = F, _t += a.samples_per_chunk[F]), z.description_index = a.sample_description_index[z.chunk_run_index] - 1, z.description = m.entries[z.description_index], z.offset = n.chunk_offsets[z.chunk_index - 1] + ut, ut += z.size, e > rt && (R++, rt < 0 && (rt = 0), rt += f.sample_counts[R]), e > 0 ? (t.samples[e - 1].duration = f.sample_deltas[R], t.samples_duration += t.samples[e - 1].duration, z.dts = t.samples[e - 1].dts + t.samples[e - 1].duration) : z.dts = 0, _ ? (e >= P && (k++, P < 0 && (P = 0), P += _.sample_counts[k]), z.cts = t.samples[e].dts + _.sample_offsets[k]) : z.cts = z.dts, v ? (e == v.sample_numbers[L] - 1 ? (z.is_sync = true, L++) : (z.is_sync = false, z.degradation_priority = 0), T && T.entries[j].sample_delta + C == e + 1 && (z.subsamples = T.entries[j].subsamples, C += T.entries[j].sample_delta, j++)) : z.is_sync = true, y.process_sdtp(t.mdia.minf.stbl.sdtp, z, z.number), V ? z.degradation_priority = V.priority[e] : z.degradation_priority = 0, T && T.entries[j].sample_delta + C == e && (z.subsamples = T.entries[j].subsamples, C += T.entries[j].sample_delta), (U.length > 0 || $.length > 0) && y.setSampleGroupProperties(t, z, e, t.sample_groups_info);
      }
      e > 0 && (t.samples[e - 1].duration = Math.max(t.mdia.mdhd.duration - t.samples[e - 1].dts, 0), t.samples_duration += t.samples[e - 1].duration);
    }
  }, y.prototype.updateSampleLists = function() {
    var t, e, n, a, d, f, _, v, m, T, U, $, V, F, Y;
    if (this.moov !== void 0) {
      for (; this.lastMoofIndex < this.moofs.length; )
        if (m = this.moofs[this.lastMoofIndex], this.lastMoofIndex++, m.type == "moof")
          for (T = m, t = 0; t < T.trafs.length; t++) {
            for (U = T.trafs[t], $ = this.getTrackById(U.tfhd.track_id), $.samples == null && ($.samples = []), V = this.getTrexById(U.tfhd.track_id), U.tfhd.flags & r.TFHD_FLAG_SAMPLE_DESC ? a = U.tfhd.default_sample_description_index : a = V ? V.default_sample_description_index : 1, U.tfhd.flags & r.TFHD_FLAG_SAMPLE_DUR ? d = U.tfhd.default_sample_duration : d = V ? V.default_sample_duration : 0, U.tfhd.flags & r.TFHD_FLAG_SAMPLE_SIZE ? f = U.tfhd.default_sample_size : f = V ? V.default_sample_size : 0, U.tfhd.flags & r.TFHD_FLAG_SAMPLE_FLAGS ? _ = U.tfhd.default_sample_flags : _ = V ? V.default_sample_flags : 0, U.sample_number = 0, U.sbgps.length > 0 && y.initSampleGroups($, U, U.sbgps, $.mdia.minf.stbl.sgpds, U.sgpds), e = 0; e < U.truns.length; e++) {
              var W = U.truns[e];
              for (n = 0; n < W.sample_count; n++) {
                F = {}, F.moof_number = this.lastMoofIndex, F.number_in_traf = U.sample_number, U.sample_number++, F.number = $.samples.length, U.first_sample_index = $.samples.length, $.samples.push(F), F.track_id = $.tkhd.track_id, F.timescale = $.mdia.mdhd.timescale, F.description_index = a - 1, F.description = $.mdia.minf.stbl.stsd.entries[F.description_index], F.size = f, W.flags & r.TRUN_FLAGS_SIZE && (F.size = W.sample_size[n]), $.samples_size += F.size, F.duration = d, W.flags & r.TRUN_FLAGS_DURATION && (F.duration = W.sample_duration[n]), $.samples_duration += F.duration, $.first_traf_merged || n > 0 ? F.dts = $.samples[$.samples.length - 2].dts + $.samples[$.samples.length - 2].duration : (U.tfdt ? F.dts = U.tfdt.baseMediaDecodeTime : F.dts = 0, $.first_traf_merged = true), F.cts = F.dts, W.flags & r.TRUN_FLAGS_CTS_OFFSET && (F.cts = F.dts + W.sample_composition_time_offset[n]), Y = _, W.flags & r.TRUN_FLAGS_FLAGS ? Y = W.sample_flags[n] : n === 0 && W.flags & r.TRUN_FLAGS_FIRST_FLAG && (Y = W.first_sample_flags), F.is_sync = !(Y >> 16 & 1), F.is_leading = Y >> 26 & 3, F.depends_on = Y >> 24 & 3, F.is_depended_on = Y >> 22 & 3, F.has_redundancy = Y >> 20 & 3, F.degradation_priority = Y & 65535;
                var ut = !!(U.tfhd.flags & r.TFHD_FLAG_BASE_DATA_OFFSET), _t = !!(U.tfhd.flags & r.TFHD_FLAG_DEFAULT_BASE_IS_MOOF), rt = !!(W.flags & r.TRUN_FLAGS_DATA_OFFSET), R = 0;
                ut ? R = U.tfhd.base_data_offset : _t || e === 0 ? R = T.start : R = v, e === 0 && n === 0 ? rt ? F.offset = R + W.data_offset : F.offset = R : F.offset = v, v = F.offset + F.size, (U.sbgps.length > 0 || U.sgpds.length > 0 || $.mdia.minf.stbl.sbgps.length > 0 || $.mdia.minf.stbl.sgpds.length > 0) && y.setSampleGroupProperties($, F, F.number_in_traf, U.sample_groups_info);
              }
            }
            if (U.subs) {
              $.has_fragment_subsamples = true;
              var P = U.first_sample_index;
              for (e = 0; e < U.subs.entries.length; e++)
                P += U.subs.entries[e].sample_delta, F = $.samples[P - 1], F.subsamples = U.subs.entries[e].subsamples;
            }
          }
    }
  }, y.prototype.getSample = function(t, e) {
    var n, a = t.samples[e];
    if (!this.moov)
      return null;
    if (!a.data)
      a.data = new Uint8Array(a.size), a.alreadyRead = 0, this.samplesDataSize += a.size, s.debug("ISOFile", "Allocating sample #" + e + " on track #" + t.tkhd.track_id + " of size " + a.size + " (total: " + this.samplesDataSize + ")");
    else if (a.alreadyRead == a.size)
      return a;
    for (; ; ) {
      var d = this.stream.findPosition(true, a.offset + a.alreadyRead, false);
      if (d > -1) {
        n = this.stream.buffers[d];
        var f = n.byteLength - (a.offset + a.alreadyRead - n.fileStart);
        if (a.size - a.alreadyRead <= f)
          return s.debug("ISOFile", "Getting sample #" + e + " data (alreadyRead: " + a.alreadyRead + " offset: " + (a.offset + a.alreadyRead - n.fileStart) + " read size: " + (a.size - a.alreadyRead) + " full size: " + a.size + ")"), o.memcpy(
            a.data.buffer,
            a.alreadyRead,
            n,
            a.offset + a.alreadyRead - n.fileStart,
            a.size - a.alreadyRead
          ), n.usedBytes += a.size - a.alreadyRead, this.stream.logBufferLevel(), a.alreadyRead = a.size, a;
        if (f === 0) return null;
        s.debug("ISOFile", "Getting sample #" + e + " partial data (alreadyRead: " + a.alreadyRead + " offset: " + (a.offset + a.alreadyRead - n.fileStart) + " read size: " + f + " full size: " + a.size + ")"), o.memcpy(
          a.data.buffer,
          a.alreadyRead,
          n,
          a.offset + a.alreadyRead - n.fileStart,
          f
        ), a.alreadyRead += f, n.usedBytes += f, this.stream.logBufferLevel();
      } else
        return null;
    }
  }, y.prototype.releaseSample = function(t, e) {
    var n = t.samples[e];
    return n.data ? (this.samplesDataSize -= n.size, n.data = null, n.alreadyRead = 0, n.size) : 0;
  }, y.prototype.getAllocatedSampleDataSize = function() {
    return this.samplesDataSize;
  }, y.prototype.getCodecs = function() {
    var t, e = "";
    for (t = 0; t < this.moov.traks.length; t++) {
      var n = this.moov.traks[t];
      t > 0 && (e += ","), e += n.mdia.minf.stbl.stsd.entries[0].getCodec();
    }
    return e;
  }, y.prototype.getTrexById = function(t) {
    var e;
    if (!this.moov || !this.moov.mvex) return null;
    for (e = 0; e < this.moov.mvex.trexs.length; e++) {
      var n = this.moov.mvex.trexs[e];
      if (n.track_id == t) return n;
    }
    return null;
  }, y.prototype.getTrackById = function(t) {
    if (this.moov === void 0)
      return null;
    for (var e = 0; e < this.moov.traks.length; e++) {
      var n = this.moov.traks[e];
      if (n.tkhd.track_id == t) return n;
    }
    return null;
  }, y.prototype.items = [], y.prototype.entity_groups = [], y.prototype.itemsDataSize = 0, y.prototype.flattenItemInfo = function() {
    var t = this.items, e = this.entity_groups, n, a, d, f = this.meta;
    if (f != null && f.hdlr !== void 0 && f.iinf !== void 0) {
      for (n = 0; n < f.iinf.item_infos.length; n++)
        d = {}, d.id = f.iinf.item_infos[n].item_ID, t[d.id] = d, d.ref_to = [], d.name = f.iinf.item_infos[n].item_name, f.iinf.item_infos[n].protection_index > 0 && (d.protection = f.ipro.protections[f.iinf.item_infos[n].protection_index - 1]), f.iinf.item_infos[n].item_type ? d.type = f.iinf.item_infos[n].item_type : d.type = "mime", d.content_type = f.iinf.item_infos[n].content_type, d.content_encoding = f.iinf.item_infos[n].content_encoding;
      if (f.grpl)
        for (n = 0; n < f.grpl.boxes.length; n++)
          entity_group = {}, entity_group.id = f.grpl.boxes[n].group_id, entity_group.entity_ids = f.grpl.boxes[n].entity_ids, entity_group.type = f.grpl.boxes[n].type, e[entity_group.id] = entity_group;
      if (f.iloc)
        for (n = 0; n < f.iloc.items.length; n++) {
          var _ = f.iloc.items[n];
          switch (d = t[_.item_ID], _.data_reference_index !== 0 && (s.warn("Item storage with reference to other files: not supported"), d.source = f.dinf.boxes[_.data_reference_index - 1]), _.construction_method) {
            case 0:
              break;
            case 1:
              s.warn("Item storage with construction_method : not supported");
              break;
            case 2:
              s.warn("Item storage with construction_method : not supported");
              break;
          }
          for (d.extents = [], d.size = 0, a = 0; a < _.extents.length; a++)
            d.extents[a] = {}, d.extents[a].offset = _.extents[a].extent_offset + _.base_offset, d.extents[a].length = _.extents[a].extent_length, d.extents[a].alreadyRead = 0, d.size += d.extents[a].length;
        }
      if (f.pitm && (t[f.pitm.item_id].primary = true), f.iref)
        for (n = 0; n < f.iref.references.length; n++) {
          var v = f.iref.references[n];
          for (a = 0; a < v.references.length; a++)
            t[v.from_item_ID].ref_to.push({ type: v.type, id: v.references[a] });
        }
      if (f.iprp)
        for (var m = 0; m < f.iprp.ipmas.length; m++) {
          var T = f.iprp.ipmas[m];
          for (n = 0; n < T.associations.length; n++) {
            var U = T.associations[n];
            if (d = t[U.id], d || (d = e[U.id]), d)
              for (d.properties === void 0 && (d.properties = {}, d.properties.boxes = []), a = 0; a < U.props.length; a++) {
                var $ = U.props[a];
                if ($.property_index > 0 && $.property_index - 1 < f.iprp.ipco.boxes.length) {
                  var V = f.iprp.ipco.boxes[$.property_index - 1];
                  d.properties[V.type] = V, d.properties.boxes.push(V);
                }
              }
          }
        }
    }
  }, y.prototype.getItem = function(t) {
    var e, n;
    if (!this.meta)
      return null;
    if (n = this.items[t], !n.data && n.size)
      n.data = new Uint8Array(n.size), n.alreadyRead = 0, this.itemsDataSize += n.size, s.debug("ISOFile", "Allocating item #" + t + " of size " + n.size + " (total: " + this.itemsDataSize + ")");
    else if (n.alreadyRead === n.size)
      return n;
    for (var a = 0; a < n.extents.length; a++) {
      var d = n.extents[a];
      if (d.alreadyRead !== d.length) {
        var f = this.stream.findPosition(true, d.offset + d.alreadyRead, false);
        if (f > -1) {
          e = this.stream.buffers[f];
          var _ = e.byteLength - (d.offset + d.alreadyRead - e.fileStart);
          if (d.length - d.alreadyRead <= _)
            s.debug("ISOFile", "Getting item #" + t + " extent #" + a + " data (alreadyRead: " + d.alreadyRead + " offset: " + (d.offset + d.alreadyRead - e.fileStart) + " read size: " + (d.length - d.alreadyRead) + " full extent size: " + d.length + " full item size: " + n.size + ")"), o.memcpy(
              n.data.buffer,
              n.alreadyRead,
              e,
              d.offset + d.alreadyRead - e.fileStart,
              d.length - d.alreadyRead
            ), e.usedBytes += d.length - d.alreadyRead, this.stream.logBufferLevel(), n.alreadyRead += d.length - d.alreadyRead, d.alreadyRead = d.length;
          else
            return s.debug("ISOFile", "Getting item #" + t + " extent #" + a + " partial data (alreadyRead: " + d.alreadyRead + " offset: " + (d.offset + d.alreadyRead - e.fileStart) + " read size: " + _ + " full extent size: " + d.length + " full item size: " + n.size + ")"), o.memcpy(
              n.data.buffer,
              n.alreadyRead,
              e,
              d.offset + d.alreadyRead - e.fileStart,
              _
            ), d.alreadyRead += _, n.alreadyRead += _, e.usedBytes += _, this.stream.logBufferLevel(), null;
        } else
          return null;
      }
    }
    return n.alreadyRead === n.size ? n : null;
  }, y.prototype.releaseItem = function(t) {
    var e = this.items[t];
    if (e.data) {
      this.itemsDataSize -= e.size, e.data = null, e.alreadyRead = 0;
      for (var n = 0; n < e.extents.length; n++) {
        var a = e.extents[n];
        a.alreadyRead = 0;
      }
      return e.size;
    } else
      return 0;
  }, y.prototype.processItems = function(t) {
    for (var e in this.items) {
      var n = this.items[e];
      this.getItem(n.id), t && !n.sent && (t(n), n.sent = true, n.data = null);
    }
  }, y.prototype.hasItem = function(t) {
    for (var e in this.items) {
      var n = this.items[e];
      if (n.name === t)
        return n.id;
    }
    return -1;
  }, y.prototype.getMetaHandler = function() {
    return this.meta ? this.meta.hdlr.handler : null;
  }, y.prototype.getPrimaryItem = function() {
    return !this.meta || !this.meta.pitm ? null : this.getItem(this.meta.pitm.item_id);
  }, y.prototype.itemToFragmentedTrackFile = function(t) {
    var e = t || {}, n = null;
    if (e.itemId ? n = this.getItem(e.itemId) : n = this.getPrimaryItem(), n == null) return null;
    var a = new y();
    a.discardMdatData = false;
    var d = { type: n.type, description_boxes: n.properties.boxes };
    n.properties.ispe && (d.width = n.properties.ispe.image_width, d.height = n.properties.ispe.image_height);
    var f = a.addTrack(d);
    return f ? (a.addSample(f, n.data), a) : null;
  }, y.prototype.write = function(t) {
    for (var e = 0; e < this.boxes.length; e++)
      this.boxes[e].write(t);
  }, y.prototype.createFragment = function(t, e, n) {
    var a = this.getTrackById(t), d = this.getSample(a, e);
    if (d == null)
      return this.setNextSeekPositionFromSample(a.samples[e]), null;
    var f = n || new o();
    f.endianness = o.BIG_ENDIAN;
    var _ = this.createSingleSampleMoof(d);
    _.write(f), _.trafs[0].truns[0].data_offset = _.size + 8, s.debug("MP4Box", "Adjusting data_offset with new value " + _.trafs[0].truns[0].data_offset), f.adjustUint32(_.trafs[0].truns[0].data_offset_position, _.trafs[0].truns[0].data_offset);
    var v = new r.mdatBox();
    return v.data = d.data, v.write(f), f;
  }, y.writeInitializationSegment = function(t, e, n, a) {
    var d;
    s.debug("ISOFile", "Generating initialization segment");
    var f = new o();
    f.endianness = o.BIG_ENDIAN, t.write(f);
    var _ = e.add("mvex");
    for (n && _.add("mehd").set("fragment_duration", n), d = 0; d < e.traks.length; d++)
      _.add("trex").set("track_id", e.traks[d].tkhd.track_id).set("default_sample_description_index", 1).set("default_sample_duration", a).set("default_sample_size", 0).set("default_sample_flags", 65536);
    return e.write(f), f.buffer;
  }, y.prototype.save = function(t) {
    var e = new o();
    e.endianness = o.BIG_ENDIAN, this.write(e), e.save(t);
  }, y.prototype.getBuffer = function() {
    var t = new o();
    return t.endianness = o.BIG_ENDIAN, this.write(t), t.buffer;
  }, y.prototype.initializeSegmentation = function() {
    var t, e, n, a;
    for (this.onSegment === null && s.warn("MP4Box", "No segmentation callback set!"), this.isFragmentationInitialized || (this.isFragmentationInitialized = true, this.nextMoofNumber = 0, this.resetTables()), e = [], t = 0; t < this.fragmentedTracks.length; t++) {
      var d = new r.moovBox();
      d.mvhd = this.moov.mvhd, d.boxes.push(d.mvhd), n = this.getTrackById(this.fragmentedTracks[t].id), d.boxes.push(n), d.traks.push(n), a = {}, a.id = n.tkhd.track_id, a.user = this.fragmentedTracks[t].user, a.buffer = y.writeInitializationSegment(this.ftyp, d, this.moov.mvex && this.moov.mvex.mehd ? this.moov.mvex.mehd.fragment_duration : void 0, this.moov.traks[t].samples.length > 0 ? this.moov.traks[t].samples[0].duration : 0), e.push(a);
    }
    return e;
  }, r.Box.prototype.printHeader = function(t) {
    this.size += 8, this.size > u && (this.size += 8), this.type === "uuid" && (this.size += 16), t.log(t.indent + "size:" + this.size), t.log(t.indent + "type:" + this.type);
  }, r.FullBox.prototype.printHeader = function(t) {
    this.size += 4, r.Box.prototype.printHeader.call(this, t), t.log(t.indent + "version:" + this.version), t.log(t.indent + "flags:" + this.flags);
  }, r.Box.prototype.print = function(t) {
    this.printHeader(t);
  }, r.ContainerBox.prototype.print = function(t) {
    this.printHeader(t);
    for (var e = 0; e < this.boxes.length; e++)
      if (this.boxes[e]) {
        var n = t.indent;
        t.indent += " ", this.boxes[e].print(t), t.indent = n;
      }
  }, y.prototype.print = function(t) {
    t.indent = "";
    for (var e = 0; e < this.boxes.length; e++)
      this.boxes[e] && this.boxes[e].print(t);
  }, r.mvhdBox.prototype.print = function(t) {
    r.FullBox.prototype.printHeader.call(this, t), t.log(t.indent + "creation_time: " + this.creation_time), t.log(t.indent + "modification_time: " + this.modification_time), t.log(t.indent + "timescale: " + this.timescale), t.log(t.indent + "duration: " + this.duration), t.log(t.indent + "rate: " + this.rate), t.log(t.indent + "volume: " + (this.volume >> 8)), t.log(t.indent + "matrix: " + this.matrix.join(", ")), t.log(t.indent + "next_track_id: " + this.next_track_id);
  }, r.tkhdBox.prototype.print = function(t) {
    r.FullBox.prototype.printHeader.call(this, t), t.log(t.indent + "creation_time: " + this.creation_time), t.log(t.indent + "modification_time: " + this.modification_time), t.log(t.indent + "track_id: " + this.track_id), t.log(t.indent + "duration: " + this.duration), t.log(t.indent + "volume: " + (this.volume >> 8)), t.log(t.indent + "matrix: " + this.matrix.join(", ")), t.log(t.indent + "layer: " + this.layer), t.log(t.indent + "alternate_group: " + this.alternate_group), t.log(t.indent + "width: " + this.width), t.log(t.indent + "height: " + this.height);
  };
  var A = {};
  A.createFile = function(t, e) {
    var n = t !== void 0 ? t : true, a = new y(e);
    return a.discardMdatData = !n, a;
  }, c.createFile = A.createFile;
})(zn);
const Zi = /* @__PURE__ */ cs(zn), ds = () => {
  let c, s = 16.6;
  self.onmessage = (l) => {
    l.data.event === "start" && (self.clearInterval(c), c = self.setInterval(() => {
      self.postMessage({});
    }, s)), l.data.event === "stop" && self.clearInterval(c);
  };
}, us = () => {
  const c = new Blob([`(${ds.toString()})()`]), s = URL.createObjectURL(c);
  return new Worker(s);
}, Ye = /* @__PURE__ */ new Map();
let Ki = 1, ge = null;
globalThis.Worker != null && (ge = us(), ge.onmessage = () => {
  Ki += 1;
  for (const [c, s] of Ye)
    if (Ki % c === 0) for (const l of s) l();
});
const hs = (c, s) => {
  const l = Math.round(s / 16.6), o = Ye.get(l) ?? /* @__PURE__ */ new Set();
  return o.add(c), Ye.set(l, o), Ye.size === 1 && o.size === 1 && (ge == null || ge.postMessage({ event: "start" })), () => {
    o.delete(c), o.size === 0 && Ye.delete(l), Ye.size === 0 && (Ki = 0, ge == null || ge.postMessage({ event: "stop" }));
  };
};
function fs(c) {
  return c instanceof Error ? String(c) : typeof c == "object" ? JSON.stringify(c, (s, l) => l instanceof Error ? String(l) : l) : String(c);
}
function ps() {
  const c = /* @__PURE__ */ new Date();
  return `${c.getHours()}:${c.getMinutes()}:${c.getSeconds()}.${c.getMilliseconds()}`;
}
let Fn = 1;
const Bn = [], gn = ["debug", "info", "warn", "error"].reduce(
  (c, s, l) => Object.assign(c, {
    [s]: (...o) => {
      Fn <= l && (console[s](...o), Bn.push({
        lvName: s,
        timeStr: ps(),
        args: o
      }));
    }
  }),
  {}
), bi = /* @__PURE__ */ new Map(), bt = {
  /**
   * 设置记录日志的级别
   *
   * @example
   * Log.setLogLevel(Log.warn) // 记录 warn，error 日志
   */
  setLogLevel: (c) => {
    Fn = bi.get(c) ?? 1;
  },
  ...gn,
  /**
   * 生成一个 log 实例，所有输出前都会附加 tag
   *
   * @example
   * const log = Log.create('<prefix>')
   * log.info('xxx') // '<prefix> xxx'
   */
  create: (c) => Object.fromEntries(
    Object.entries(gn).map(([s, l]) => [
      s,
      (...o) => l(c, ...o)
    ])
  ),
  /**
   * 将所有日志导出为一个字符串
   *
   * @example
   * Log.dump() // => [level][time]  内容...
   *
   */
  async dump() {
    return Bn.reduce(
      (c, { lvName: s, timeStr: l, args: o }) => c + `[${s}][${l}]  ${o.map((u) => fs(u)).join(" ")}
`,
      ""
    );
  }
};
bi.set(bt.debug, 0);
bi.set(bt.info, 1);
bi.set(bt.warn, 2);
bi.set(bt.error, 3);
(async function() {
  if (await Promise.resolve(), !(globalThis.navigator == null || globalThis.document == null) && (bt.info(
    `@webav version: 1.2.7, date: ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`
  ), bt.info(globalThis.navigator.userAgent), document.addEventListener("visibilitychange", () => {
    bt.info(`visibilitychange: ${document.visibilityState}`);
  }), "PressureObserver" in globalThis)) {
    let c = "";
    new PressureObserver((s) => {
      const l = JSON.stringify(s.map((o) => o.state));
      l !== c && (bt.info(`cpu state change: ${l}`), c = l);
    }).observe("cpu");
  }
})();
class _s {
  /**
   * @param {number} scaleFrom the length of the original array.
   * @param {number} scaleTo The length of the new array.
   * @param {?Object} details The extra configuration, if needed.
   */
  constructor(s, l, o) {
    this.length_ = s, this.scaleFactor_ = (s - 1) / l, this.interpolate = this.cubic, o.method === "point" ? this.interpolate = this.point : o.method === "linear" ? this.interpolate = this.linear : o.method === "sinc" && (this.interpolate = this.sinc), this.tangentFactor_ = 1 - Math.max(0, Math.min(1, o.tension || 0)), this.sincFilterSize_ = o.sincFilterSize || 1, this.kernel_ = vs(o.sincWindow || ms);
  }
  /**
   * @param {number} t The index to interpolate.
   * @param {Array|TypedArray} samples the original array.
   * @return {number} The interpolated value.
   */
  point(s, l) {
    return this.getClippedInput_(Math.round(this.scaleFactor_ * s), l);
  }
  /**
   * @param {number} t The index to interpolate.
   * @param {Array|TypedArray} samples the original array.
   * @return {number} The interpolated value.
   */
  linear(s, l) {
    s = this.scaleFactor_ * s;
    let o = Math.floor(s);
    return s -= o, (1 - s) * this.getClippedInput_(o, l) + s * this.getClippedInput_(o + 1, l);
  }
  /**
   * @param {number} t The index to interpolate.
   * @param {Array|TypedArray} samples the original array.
   * @return {number} The interpolated value.
   */
  cubic(s, l) {
    s = this.scaleFactor_ * s;
    let o = Math.floor(s), u = [this.getTangent_(o, l), this.getTangent_(o + 1, l)], h = [
      this.getClippedInput_(o, l),
      this.getClippedInput_(o + 1, l)
    ];
    s -= o;
    let p = s * s, r = s * p;
    return (2 * r - 3 * p + 1) * h[0] + (r - 2 * p + s) * u[0] + (-2 * r + 3 * p) * h[1] + (r - p) * u[1];
  }
  /**
   * @param {number} t The index to interpolate.
   * @param {Array|TypedArray} samples the original array.
   * @return {number} The interpolated value.
   */
  sinc(s, l) {
    s = this.scaleFactor_ * s;
    let o = Math.floor(s), u = o - this.sincFilterSize_ + 1, h = o + this.sincFilterSize_, p = 0;
    for (let r = u; r <= h; r++)
      p += this.kernel_(s - r) * this.getClippedInput_(r, l);
    return p;
  }
  /**
   * @param {number} k The scaled index to interpolate.
   * @param {Array|TypedArray} samples the original array.
   * @return {number} The tangent.
   * @private
   */
  getTangent_(s, l) {
    return this.tangentFactor_ * (this.getClippedInput_(s + 1, l) - this.getClippedInput_(s - 1, l)) / 2;
  }
  /**
   * @param {number} t The scaled index to interpolate.
   * @param {Array|TypedArray} samples the original array.
   * @return {number} The interpolated value.
   * @private
   */
  getClippedInput_(s, l) {
    return 0 <= s && s < this.length_ ? l[s] : 0;
  }
}
function ms(c) {
  return Math.exp(-c / 2 * c / 2);
}
function vs(c) {
  return function(s) {
    return gs(s) * c(s);
  };
}
function gs(c) {
  return c === 0 ? 1 : Math.sin(Math.PI * c) / (Math.PI * c);
}
class ys {
  /**
   * @param {number} order The order of the filter.
   * @param {number} sampleRate The sample rate.
   * @param {number} cutOff The cut off frequency.
   */
  constructor(s, l, o) {
    let u = 2 * Math.PI * o / l, h = 0;
    this.filters = [];
    for (let p = 0; p <= s; p++)
      p - s / 2 === 0 ? this.filters[p] = u : (this.filters[p] = Math.sin(u * (p - s / 2)) / (p - s / 2), this.filters[p] *= 0.54 - 0.46 * Math.cos(2 * Math.PI * p / s)), h = h + this.filters[p];
    for (let p = 0; p <= s; p++)
      this.filters[p] /= h;
    this.z = this.initZ_();
  }
  /**
   * @param {number} sample A sample of a sequence.
   * @return {number}
   */
  filter(s) {
    this.z.buf[this.z.pointer] = s;
    let l = 0;
    for (let o = 0, u = this.z.buf.length; o < u; o++)
      l += this.filters[o] * this.z.buf[(this.z.pointer + o) % this.z.buf.length];
    return this.z.pointer = (this.z.pointer + 1) % this.z.buf.length, l;
  }
  /**
   * Reset the filter.
   */
  reset() {
    this.z = this.initZ_();
  }
  /**
   * Return the default value for z.
   * @private
   */
  initZ_() {
    let s = [];
    for (let l = 0; l < this.filters.length - 1; l++)
      s.push(0);
    return {
      buf: s,
      pointer: 0
    };
  }
}
class bs {
  /**
   * @param {number} order The order of the filter.
   * @param {number} sampleRate The sample rate.
   * @param {number} cutOff The cut off frequency.
   */
  constructor(s, l, o) {
    let u = [];
    for (let h = 0; h < s; h++)
      u.push(this.getCoeffs_({
        Fs: l,
        Fc: o,
        Q: 0.5 / Math.sin(Math.PI / (s * 2) * (h + 0.5))
      }));
    this.stages = [];
    for (let h = 0; h < u.length; h++)
      this.stages[h] = {
        b0: u[h].b[0],
        b1: u[h].b[1],
        b2: u[h].b[2],
        a1: u[h].a[0],
        a2: u[h].a[1],
        k: u[h].k,
        z: [0, 0]
      };
  }
  /**
   * @param {number} sample A sample of a sequence.
   * @return {number}
   */
  filter(s) {
    let l = s;
    for (let o = 0, u = this.stages.length; o < u; o++)
      l = this.runStage_(o, l);
    return l;
  }
  getCoeffs_(s) {
    let l = {};
    l.z = [0, 0], l.a = [], l.b = [];
    let o = this.preCalc_(s, l);
    return l.k = 1, l.b.push((1 - o.cw) / (2 * o.a0)), l.b.push(2 * l.b[0]), l.b.push(l.b[0]), l;
  }
  preCalc_(s, l) {
    let o = {}, u = 2 * Math.PI * s.Fc / s.Fs;
    return o.alpha = Math.sin(u) / (2 * s.Q), o.cw = Math.cos(u), o.a0 = 1 + o.alpha, l.a0 = o.a0, l.a.push(-2 * o.cw / o.a0), l.k = 1, l.a.push((1 - o.alpha) / o.a0), o;
  }
  runStage_(s, l) {
    let o = l * this.stages[s].k - this.stages[s].a1 * this.stages[s].z[0] - this.stages[s].a2 * this.stages[s].z[1], u = this.stages[s].b0 * o + this.stages[s].b1 * this.stages[s].z[0] + this.stages[s].b2 * this.stages[s].z[1];
    return this.stages[s].z[1] = this.stages[s].z[0], this.stages[s].z[0] = o, u;
  }
  /**
   * Reset the filter.
   */
  reset() {
    for (let s = 0; s < this.stages.length; s++)
      this.stages[s].z = [0, 0];
  }
}
const Ss = {
  point: false,
  linear: false,
  cubic: true,
  sinc: true
}, yn = {
  IIR: 16,
  FIR: 71
}, xs = {
  IIR: bs,
  FIR: ys
};
function ws(c, s, l, o = {}) {
  let u = (l - s) / s + 1, h = new Float64Array(c.length * u);
  o.method = o.method || "cubic";
  let p = new _s(
    c.length,
    h.length,
    {
      method: o.method,
      tension: o.tension || 0,
      sincFilterSize: o.sincFilterSize || 6,
      sincWindow: o.sincWindow || void 0
    }
  );
  if (o.LPF === void 0 && (o.LPF = Ss[o.method]), o.LPF) {
    o.LPFType = o.LPFType || "IIR";
    const r = xs[o.LPFType];
    if (l > s) {
      let S = new r(
        o.LPFOrder || yn[o.LPFType],
        l,
        s / 2
      );
      Ts(
        c,
        h,
        p,
        S
      );
    } else {
      let S = new r(
        o.LPFOrder || yn[o.LPFType],
        s,
        l / 2
      );
      Cs(
        c,
        h,
        p,
        S
      );
    }
  } else
    Pn(c, h, p);
  return h;
}
function Pn(c, s, l) {
  for (let o = 0, u = s.length; o < u; o++)
    s[o] = l.interpolate(o, c);
}
function Ts(c, s, l, o) {
  for (let u = 0, h = s.length; u < h; u++)
    s[u] = o.filter(l.interpolate(u, c));
  o.reset();
  for (let u = s.length - 1; u >= 0; u--)
    s[u] = o.filter(s[u]);
}
function Cs(c, s, l, o) {
  for (let u = 0, h = c.length; u < h; u++)
    c[u] = o.filter(c[u]);
  o.reset();
  for (let u = c.length - 1; u >= 0; u--)
    c[u] = o.filter(c[u]);
  Pn(c, s, l);
}
var Dn = (c) => {
  throw TypeError(c);
}, Ln = (c, s, l) => s.has(c) || Dn("Cannot " + l), mt = (c, s, l) => (Ln(c, s, "read from private field"), l ? l.call(c) : s.get(c)), Vt = (c, s, l) => s.has(c) ? Dn("Cannot add the same private member more than once") : s instanceof WeakSet ? s.add(c) : s.set(c, l), Bt = (c, s, l, o) => (Ln(c, s, "write to private field"), s.set(c, l), l);
const Mn = "KGZ1bmN0aW9uKCl7InVzZSBzdHJpY3QiO2Z1bmN0aW9uIHUobil7aWYobj09PSIvIilyZXR1cm57cGFyZW50Om51bGwsbmFtZToiIn07Y29uc3QgZT1uLnNwbGl0KCIvIikuZmlsdGVyKGk9PmkubGVuZ3RoPjApO2lmKGUubGVuZ3RoPT09MCl0aHJvdyBFcnJvcigiSW52YWxpZCBwYXRoIik7Y29uc3QgYT1lW2UubGVuZ3RoLTFdLHI9Ii8iK2Uuc2xpY2UoMCwtMSkuam9pbigiLyIpO3JldHVybntuYW1lOmEscGFyZW50OnJ9fWFzeW5jIGZ1bmN0aW9uIHcobixlKXtjb25zdHtwYXJlbnQ6YSxuYW1lOnJ9PXUobik7aWYoYT09bnVsbClyZXR1cm4gYXdhaXQgbmF2aWdhdG9yLnN0b3JhZ2UuZ2V0RGlyZWN0b3J5KCk7Y29uc3QgaT1hLnNwbGl0KCIvIikuZmlsdGVyKHQ9PnQubGVuZ3RoPjApO3RyeXtsZXQgdD1hd2FpdCBuYXZpZ2F0b3Iuc3RvcmFnZS5nZXREaXJlY3RvcnkoKTtmb3IoY29uc3QgcyBvZiBpKXQ9YXdhaXQgdC5nZXREaXJlY3RvcnlIYW5kbGUocyx7Y3JlYXRlOmUuY3JlYXRlfSk7aWYoZS5pc0ZpbGUpcmV0dXJuIGF3YWl0IHQuZ2V0RmlsZUhhbmRsZShyLHtjcmVhdGU6ZS5jcmVhdGV9KX1jYXRjaCh0KXtpZih0Lm5hbWU9PT0iTm90Rm91bmRFcnJvciIpcmV0dXJuIG51bGw7dGhyb3cgdH19Y29uc3QgZj17fTtzZWxmLm9ubWVzc2FnZT1hc3luYyBuPT57dmFyIGk7Y29uc3R7ZXZ0VHlwZTplLGFyZ3M6YX09bi5kYXRhO2xldCByPWZbYS5maWxlSWRdO3RyeXtsZXQgdDtjb25zdCBzPVtdO2lmKGU9PT0icmVnaXN0ZXIiKXtjb25zdCBsPWF3YWl0IHcoYS5maWxlUGF0aCx7Y3JlYXRlOiEwLGlzRmlsZTohMH0pO2lmKGw9PW51bGwpdGhyb3cgRXJyb3IoYG5vdCBmb3VuZCBmaWxlOiAke2EuZmlsZUlkfWApO3I9YXdhaXQgbC5jcmVhdGVTeW5jQWNjZXNzSGFuZGxlKHttb2RlOmEubW9kZX0pLGZbYS5maWxlSWRdPXJ9ZWxzZSBpZihlPT09ImNsb3NlIilhd2FpdCByLmNsb3NlKCksZGVsZXRlIGZbYS5maWxlSWRdO2Vsc2UgaWYoZT09PSJ0cnVuY2F0ZSIpYXdhaXQgci50cnVuY2F0ZShhLm5ld1NpemUpO2Vsc2UgaWYoZT09PSJ3cml0ZSIpe2NvbnN0e2RhdGE6bCxvcHRzOm99PW4uZGF0YS5hcmdzO3Q9YXdhaXQgci53cml0ZShsLG8pfWVsc2UgaWYoZT09PSJyZWFkIil7Y29uc3R7b2Zmc2V0Omwsc2l6ZTpvfT1uLmRhdGEuYXJncyxnPW5ldyBVaW50OEFycmF5KG8pLGQ9YXdhaXQgci5yZWFkKGcse2F0Omx9KSxjPWcuYnVmZmVyO3Q9ZD09PW8/YzooKGk9Yy50cmFuc2Zlcik9PW51bGw/dm9pZCAwOmkuY2FsbChjLGQpKT8/Yy5zbGljZSgwLGQpLHMucHVzaCh0KX1lbHNlIGU9PT0iZ2V0U2l6ZSI/dD1hd2FpdCByLmdldFNpemUoKTplPT09ImZsdXNoIiYmYXdhaXQgci5mbHVzaCgpO3NlbGYucG9zdE1lc3NhZ2Uoe2V2dFR5cGU6ImNhbGxiYWNrIixjYklkOm4uZGF0YS5jYklkLHJldHVyblZhbDp0fSxzKX1jYXRjaCh0KXtjb25zdCBzPXQ7c2VsZi5wb3N0TWVzc2FnZSh7ZXZ0VHlwZToidGhyb3dFcnJvciIsY2JJZDpuLmRhdGEuY2JJZCxlcnJNc2c6cy5uYW1lKyI6ICIrcy5tZXNzYWdlK2AKYCtKU09OLnN0cmluZ2lmeShuLmRhdGEpfSl9fX0pKCk7Ci8vIyBzb3VyY2VNYXBwaW5nVVJMPW9wZnMtd29ya2VyLUY0UldscWNfLmpzLm1hcAo=", ks = (c) => Uint8Array.from(atob(c), (s) => s.charCodeAt(0)), bn = typeof self < "u" && self.Blob && new Blob([ks(Mn)], { type: "text/javascript;charset=utf-8" });
function Us(c) {
  let s;
  try {
    if (s = bn && (self.URL || self.webkitURL).createObjectURL(bn), !s) throw "";
    const l = new Worker(s, {
      name: c == null ? void 0 : c.name
    });
    return l.addEventListener("error", () => {
      (self.URL || self.webkitURL).revokeObjectURL(s);
    }), l;
  } catch {
    return new Worker(
      "data:text/javascript;base64," + Mn,
      {
        name: c == null ? void 0 : c.name
      }
    );
  } finally {
    s && (self.URL || self.webkitURL).revokeObjectURL(s);
  }
}
async function Es(c, s, l) {
  const o = Is();
  return await o("register", { fileId: c, filePath: s, mode: l }), {
    read: async (u, h) => await o("read", {
      fileId: c,
      offset: u,
      size: h
    }),
    write: async (u, h) => await o(
      "write",
      {
        fileId: c,
        data: u,
        opts: h
      },
      [ArrayBuffer.isView(u) ? u.buffer : u]
    ),
    close: async () => await o("close", {
      fileId: c
    }),
    truncate: async (u) => await o("truncate", {
      fileId: c,
      newSize: u
    }),
    getSize: async () => await o("getSize", {
      fileId: c
    }),
    flush: async () => await o("flush", {
      fileId: c
    })
  };
}
const Ti = [];
let Yi = 0;
function Is() {
  if (Ti.length < 3) {
    const s = c();
    return Ti.push(s), s;
  } else {
    const s = Ti[Yi];
    return Yi = (Yi + 1) % Ti.length, s;
  }
  function c() {
    const s = new Us();
    let l = 0, o = {};
    return s.onmessage = ({
      data: u
    }) => {
      var h, p;
      u.evtType === "callback" ? (h = o[u.cbId]) == null || h.resolve(u.returnVal) : u.evtType === "throwError" && ((p = o[u.cbId]) == null || p.reject(Error(u.errMsg))), delete o[u.cbId];
    }, async function(u, h, p = []) {
      l += 1;
      const r = new Promise((S, x) => {
        o[l] = { resolve: S, reject: x };
      });
      return s.postMessage(
        {
          cbId: l,
          evtType: u,
          args: h
        },
        p
      ), r;
    };
  }
}
function Ri(c) {
  if (c === "/") return { parent: null, name: "" };
  const s = c.split("/").filter((u) => u.length > 0);
  if (s.length === 0) throw Error("Invalid path");
  const l = s[s.length - 1], o = "/" + s.slice(0, -1).join("/");
  return { name: l, parent: o };
}
async function Te(c, s) {
  const { parent: l, name: o } = Ri(c);
  if (l == null) return await navigator.storage.getDirectory();
  const u = l.split("/").filter((h) => h.length > 0);
  try {
    let h = await navigator.storage.getDirectory();
    for (const p of u)
      h = await h.getDirectoryHandle(p, {
        create: s.create
      });
    return s.isFile ? await h.getFileHandle(o, {
      create: s.create
    }) : await h.getDirectoryHandle(o, {
      create: s.create
    });
  } catch (h) {
    if (h.name === "NotFoundError")
      return null;
    throw h;
  }
}
async function Ji(c) {
  const { parent: s, name: l } = Ri(c);
  if (s == null) {
    const u = await navigator.storage.getDirectory();
    for await (const h of u.keys())
      await u.removeEntry(h, { recursive: true });
    return;
  }
  const o = await Te(s, {
    create: false,
    isFile: false
  });
  if (o != null)
    try {
      await o.removeEntry(l, { recursive: !0 });
    } catch (u) {
      if (u.name === "NotFoundError") return;
      throw u;
    }
}
function qi(c, s) {
  return `${c}/${s}`.replace("//", "/");
}
function Ve(c) {
  return new On(c);
}
var ee, ki, ri;
const As = class Rn {
  constructor(s) {
    Vt(this, ee), Vt(this, ki), Vt(this, ri), Bt(this, ee, s);
    const { parent: l, name: o } = Ri(s);
    Bt(this, ki, o), Bt(this, ri, l);
  }
  get kind() {
    return "dir";
  }
  get name() {
    return mt(this, ki);
  }
  get path() {
    return mt(this, ee);
  }
  get parent() {
    return mt(this, ri) == null ? null : Ve(mt(this, ri));
  }
  /**
   * Creates the directory.
   * return A promise that resolves when the directory is created.
   */
  async create() {
    return await Te(mt(this, ee), {
      create: true,
      isFile: false
    }), Ve(mt(this, ee));
  }
  /**
   * Checks if the directory exists.
   * return A promise that resolves to true if the directory exists, otherwise false.
   */
  async exists() {
    return await Te(mt(this, ee), {
      create: false,
      isFile: false
    }) instanceof FileSystemDirectoryHandle;
  }
  /**
   * Removes the directory.
   * return A promise that resolves when the directory is removed.
   */
  async remove(s = {}) {
    for (const l of await this.children())
      try {
        await l.remove(s);
      } catch (o) {
        console.warn(o);
      }
    try {
      await Ji(mt(this, ee));
    } catch (l) {
      console.warn(l);
    }
  }
  /**
   * Retrieves the children of the directory.
   * return A promise that resolves to an array of objects representing the children.
   */
  async children() {
    const s = await Te(mt(this, ee), {
      create: false,
      isFile: false
    });
    if (s == null) return [];
    const l = [];
    for await (const o of s.values())
      l.push((o.kind === "file" ? Si : Ve)(qi(mt(this, ee), o.name)));
    return l;
  }
  async copyTo(s) {
    if (!await this.exists())
      throw Error(`dir ${this.path} not exists`);
    if (s instanceof Rn) {
      const l = await s.exists() ? Ve(qi(s.path, this.name)) : s;
      return await l.create(), await Promise.all((await this.children()).map((o) => o.copyTo(l))), l;
    } else if (s instanceof FileSystemDirectoryHandle)
      return await Promise.all(
        (await this.children()).map(async (l) => {
          l.kind === "file" ? await l.copyTo(
            await s.getFileHandle(l.name, { create: true })
          ) : await l.copyTo(
            await s.getDirectoryHandle(l.name, { create: true })
          );
        })
      ), null;
    throw Error("Illegal target type");
  }
  /**
   * move directory, copy then remove current
   */
  async moveTo(s) {
    const l = await this.copyTo(s);
    return await this.remove(), l;
  }
};
ee = /* @__PURE__ */ new WeakMap(), ki = /* @__PURE__ */ new WeakMap(), ri = /* @__PURE__ */ new WeakMap();
let On = As;
const Qi = /* @__PURE__ */ new Map();
function Si(c, s = "rw") {
  if (s === "rw") {
    const l = Qi.get(c) ?? new zi(c, s);
    return Qi.set(c, l), l;
  }
  return new zi(c, s);
}
async function an(c, s, l = { overwrite: true }) {
  if (s instanceof zi) {
    await an(c, await s.stream(), l);
    return;
  }
  const o = await (c instanceof zi ? c : Si(c, "rw")).createWriter();
  try {
    if (l.overwrite && await o.truncate(0), s instanceof ReadableStream) {
      const u = s.getReader();
      for (; ; ) {
        const { done: h, value: p } = await u.read();
        if (h) break;
        await o.write(p);
      }
    } else
      await o.write(s);
  } catch (u) {
    throw u;
  } finally {
    await o.close();
  }
}
let zs = 0;
const Fs = () => ++zs;
var $t, si, Ui, ai, Ei, fe, Ii, Ai, $e;
const Bs = class Nn {
  constructor(s, l) {
    Vt(this, $t), Vt(this, si), Vt(this, Ui), Vt(this, ai), Vt(this, Ei), Vt(this, fe, 0), Vt(this, Ii, async () => {
    }), Vt(this, Ai, /* @__PURE__ */ (() => {
      let h = null;
      return () => (Bt(this, fe, mt(this, fe) + 1), h != null || (h = new Promise(async (p, r) => {
        try {
          const S = await Es(
            mt(this, Ei),
            mt(this, $t),
            mt(this, ai)
          );
          Bt(this, Ii, async () => {
            h != null && (h = null, Bt(this, fe, 0), await S.close().catch(console.error));
          }), p([
            S,
            async () => {
              Bt(this, fe, mt(this, fe) - 1), !(mt(this, fe) > 0) && (h = null, await S.close());
            }
          ]);
        } catch (S) {
          r(S);
        }
      })), h);
    })()), Vt(this, $e, false), Bt(this, Ei, Fs()), Bt(this, $t, s), Bt(this, ai, {
      r: "read-only",
      rw: "readwrite",
      "rw-unsafe": "readwrite-unsafe"
    }[l]);
    const { parent: o, name: u } = Ri(s);
    if (o == null) throw Error("Invalid path");
    Bt(this, Ui, u), Bt(this, si, o);
  }
  get kind() {
    return "file";
  }
  get path() {
    return mt(this, $t);
  }
  get name() {
    return mt(this, Ui);
  }
  get parent() {
    return mt(this, si) == null ? null : Ve(mt(this, si));
  }
  /**
   * Random write to file
   */
  async createWriter() {
    if (mt(this, ai) === "read-only") throw Error("file is read-only");
    if (mt(this, $e)) throw Error("Other writer have not been closed");
    Bt(this, $e, true);
    try {
      const s = new TextEncoder(), [l, o] = await mt(this, Ai).call(this);
      let u = await l.getSize(), h = !1;
      return {
        write: async (p, r = {}) => {
          if (h) throw Error("Writer is closed");
          const S = typeof p == "string" ? s.encode(p) : p, x = r.at ?? u, b = S.byteLength;
          return u = x + b, await l.write(S, { at: x });
        },
        truncate: async (p) => {
          if (h) throw Error("Writer is closed");
          await l.truncate(p), u > p && (u = p);
        },
        flush: async () => {
          if (h) throw Error("Writer is closed");
          await l.flush();
        },
        close: async () => {
          if (h) throw Error("Writer is closed");
          h = !0, Bt(this, $e, !1), await o();
        }
      };
    } catch (s) {
      throw Bt(this, $e, false), s;
    }
  }
  /**
   * Random access to file
   */
  async createReader() {
    const [s, l] = await mt(this, Ai).call(this);
    let o = false, u = 0;
    return {
      read: async (h, p = {}) => {
        if (o) throw Error("Reader is closed");
        const r = p.at ?? u, S = await s.read(r, h);
        return u = r + S.byteLength, S;
      },
      getSize: async () => {
        if (o) throw Error("Reader is closed");
        return await s.getSize();
      },
      close: async () => {
        o || (o = true, await l());
      }
    };
  }
  async text() {
    return new TextDecoder().decode(await this.arrayBuffer());
  }
  async arrayBuffer() {
    const s = await Te(mt(this, $t), { create: false, isFile: true });
    return s == null ? new ArrayBuffer(0) : (await s.getFile()).arrayBuffer();
  }
  async stream() {
    const s = await this.getOriginFile();
    return s == null ? new ReadableStream({
      pull: (l) => {
        l.close();
      }
    }) : s.stream();
  }
  async getOriginFile() {
    var s;
    return (s = await Te(mt(this, $t), { create: false, isFile: true })) == null ? void 0 : s.getFile();
  }
  async getSize() {
    const s = await Te(mt(this, $t), { create: false, isFile: true });
    return s == null ? 0 : (await s.getFile()).size;
  }
  async exists() {
    return await Te(mt(this, $t), {
      create: false,
      isFile: true
    }) instanceof FileSystemFileHandle;
  }
  async remove(s = {}) {
    if (s.force === true) {
      await mt(this, Ii).call(this), await Ji(mt(this, $t)), Qi.delete(mt(this, $t));
      return;
    }
    if (mt(this, fe) > 0) throw Error("exists unclosed reader/writer");
    await Ji(mt(this, $t));
  }
  async copyTo(s) {
    if (s instanceof Nn)
      return s.path === this.path ? this : (await an(s, this), s);
    if (s instanceof On) {
      if (!await this.exists())
        throw Error(`file ${this.path} not exists`);
      return await this.copyTo(Si(qi(s.path, this.name)));
    } else if (s instanceof FileSystemFileHandle)
      return await (await this.stream()).pipeTo(await s.createWritable()), null;
    throw Error("Illegal target type");
  }
  /**
   * move file, copy then remove current
   */
  async moveTo(s) {
    const l = await this.copyTo(s);
    return await this.remove(), l;
  }
};
$t = /* @__PURE__ */ new WeakMap(), si = /* @__PURE__ */ new WeakMap(), Ui = /* @__PURE__ */ new WeakMap(), ai = /* @__PURE__ */ new WeakMap(), Ei = /* @__PURE__ */ new WeakMap(), fe = /* @__PURE__ */ new WeakMap(), Ii = /* @__PURE__ */ new WeakMap(), Ai = /* @__PURE__ */ new WeakMap(), $e = /* @__PURE__ */ new WeakMap();
let zi = Bs;
const on = "/.opfs-tools-temp-dir";
async function Gn(c) {
  try {
    if (c.kind === "file") {
      if (!await c.exists()) return !0;
      const s = await c.createWriter();
      await s.truncate(0), await s.close(), await c.remove();
    } else
      await c.remove();
    return !0;
  } catch (s) {
    return console.warn(s), false;
  }
}
function Ps() {
  setInterval(async () => {
    for (const c of await Ve(on).children()) {
      const s = /^\d+-(\d+)$/.exec(c.name);
      (s == null || Date.now() - Number(s[1]) > 2592e5) && await Gn(c);
    }
  }, 60 * 1e3);
}
const tn = [];
let Sn = false;
async function Ds() {
  if (globalThis.localStorage == null) return;
  const c = "OPFS_TOOLS_EXPIRES_TMP_FILES";
  Sn || (Sn = true, globalThis.addEventListener("unload", () => {
    tn.length !== 0 && localStorage.setItem(
      c,
      `${localStorage.getItem(c) ?? ""},${tn.join(",")}`
    );
  }));
  let s = localStorage.getItem(c) ?? "";
  for (const l of s.split(","))
    l.length !== 0 && await Gn(Si(`${on}/${l}`)) && (s = s.replace(l, ""));
  localStorage.setItem(c, s.replace(/,{2,}/g, ","));
}
(async function() {
  var c;
  globalThis.__opfs_tools_tmpfile_init__ !== true && (globalThis.__opfs_tools_tmpfile_init__ = true, !(globalThis.FileSystemDirectoryHandle == null || globalThis.FileSystemFileHandle == null || ((c = globalThis.navigator) == null ? void 0 : c.storage.getDirectory) == null) && (Ps(), await Ds()));
})();
function Ls() {
  const c = `${Math.random().toString().slice(2)}-${Date.now()}`;
  return tn.push(c), Si(`${on}/${c}`);
}
function Ms(c) {
  const s = new Float32Array(
    c.map((o) => o.length).reduce((o, u) => o + u)
  );
  let l = 0;
  for (const o of c)
    s.set(o, l), l += o.length;
  return s;
}
function Rs(c) {
  const s = [];
  for (let l = 0; l < c.length; l += 1)
    for (let o = 0; o < c[l].length; o += 1)
      s[o] == null && (s[o] = []), s[o].push(c[l][o]);
  return s.map(Ms);
}
function Os(c) {
  if (c.format === "f32-planar") {
    const s = [];
    for (let l = 0; l < c.numberOfChannels; l += 1) {
      const o = c.allocationSize({ planeIndex: l }), u = new ArrayBuffer(o);
      c.copyTo(u, { planeIndex: l }), s.push(new Float32Array(u));
    }
    return s;
  } else if (c.format === "f32") {
    const s = new ArrayBuffer(c.allocationSize({ planeIndex: 0 }));
    return c.copyTo(s, { planeIndex: 0 }), Gs(new Float32Array(s), c.numberOfChannels);
  } else if (c.format === "s16") {
    const s = new ArrayBuffer(c.allocationSize({ planeIndex: 0 }));
    return c.copyTo(s, { planeIndex: 0 }), Ns(new Int16Array(s), c.numberOfChannels);
  }
  throw Error("Unsupported audio data format");
}
function Ns(c, s) {
  const l = c.length / s, o = Array.from(
    { length: s },
    () => new Float32Array(l)
  );
  for (let u = 0; u < l; u++)
    for (let h = 0; h < s; h++) {
      const p = c[u * s + h];
      o[h][u] = p / 32768;
    }
  return o;
}
function Gs(c, s) {
  const l = c.length / s, o = Array.from(
    { length: s },
    () => new Float32Array(l)
  );
  for (let u = 0; u < l; u++)
    for (let h = 0; h < s; h++)
      o[h][u] = c[u * s + h];
  return o;
}
function Hn(c) {
  return Array(c.numberOfChannels).fill(0).map((s, l) => c.getChannelData(l));
}
async function Hs(c, s, l) {
  const o = c.length, u = Array(l.chanCount).fill(0).map(() => new Float32Array(0));
  if (o === 0) return u;
  const h = Math.max(...c.map((x) => x.length));
  if (h === 0) return u;
  if (globalThis.OfflineAudioContext == null)
    return c.map(
      (x) => new Float32Array(
        ws(x, s, l.rate, {
          method: "sinc",
          LPF: false
        })
      )
    );
  const p = new globalThis.OfflineAudioContext(
    l.chanCount,
    h * l.rate / s,
    l.rate
  ), r = p.createBufferSource(), S = p.createBuffer(o, h, s);
  return c.forEach((x, b) => S.copyToChannel(x, b)), r.buffer = S, r.connect(p.destination), r.start(), Hn(await p.startRendering());
}
function Yn(c) {
  return new Promise((s) => {
    const l = hs(() => {
      l(), s();
    }, c);
  });
}
function xn(c, s, l) {
  const o = l - s, u = new Float32Array(o);
  let h = 0;
  for (; h < o; )
    u[h] = c[(s + h) % c.length], h += 1;
  return u;
}
const jt = {
  sampleRate: 48e3,
  channelCount: 2,
  codec: "mp4a.40.2"
};
function Ys(c, s) {
  var h;
  const l = s.videoTracks[0], o = {};
  if (l != null) {
    const p = (h = $s(c.getTrackById(l.id))) == null ? void 0 : h.buffer, { descKey: r, type: S } = l.codec.startsWith("avc1") ? { descKey: "avcDecoderConfigRecord", type: "avc1" } : l.codec.startsWith("hvc1") ? { descKey: "hevcDecoderConfigRecord", type: "hvc1" } : { descKey: "", type: "" };
    r !== "" && (o.videoTrackConf = {
      timescale: l.timescale,
      duration: l.duration,
      width: l.video.width,
      height: l.video.height,
      brands: s.brands,
      type: S,
      [r]: p
    }), o.videoDecoderConf = {
      codec: l.codec,
      codedHeight: l.video.height,
      codedWidth: l.video.width,
      description: p
    };
  }
  const u = s.audioTracks[0];
  if (u != null) {
    const p = Vs(c), r = p == null ? {} : Ws(p);
    o.audioTrackConf = {
      timescale: u.timescale,
      samplerate: r.sampleRate ?? u.audio.sample_rate,
      channel_count: r.numberOfChannels ?? u.audio.channel_count,
      hdlr: "soun",
      type: u.codec.startsWith("mp4a") ? "mp4a" : u.codec,
      description: p
    }, o.audioDecoderConf = {
      codec: r.codec ?? jt.codec,
      numberOfChannels: r.numberOfChannels ?? u.audio.channel_count,
      sampleRate: r.sampleRate ?? u.audio.sample_rate
    };
  }
  return o;
}
function $s(c) {
  for (const s of c.mdia.minf.stbl.stsd.entries) {
    const l = s.avcC ?? s.hvcC ?? s.av1C ?? s.vpcC;
    if (l != null) {
      const o = new Zi.DataStream(
        void 0,
        0,
        Zi.DataStream.BIG_ENDIAN
      );
      return l.write(o), new Uint8Array(o.buffer.slice(8));
    }
  }
}
function Vs(c, s = "mp4a") {
  var l, o;
  return (o = (l = c.moov) == null ? void 0 : l.traks.map((u) => u.mdia.minf.stbl.stsd.entries).flat().find(({ type: u }) => u === s)) == null ? void 0 : o.esds;
}
function Ws(c) {
  let s = "mp4a";
  const l = c.esd.descs[0];
  if (l == null) return {};
  s += "." + l.oti.toString(16);
  const o = l.descs[0];
  if (o == null)
    return s.endsWith("40") && (s += ".2"), { codec: s };
  const u = (o.data[0] & 248) >> 3;
  s += "." + u;
  const [h, p] = o.data, r = ((h & 7) << 1) + (p >> 7), S = (p & 127) >> 3;
  return {
    codec: s,
    sampleRate: [
      96e3,
      88200,
      64e3,
      48e3,
      44100,
      32e3,
      24e3,
      22050,
      16e3,
      12e3,
      11025,
      8e3,
      7350
    ][r],
    numberOfChannels: S
  };
}
async function js(c, s, l) {
  const o = Zi.createFile(false);
  o.onReady = (h) => {
    var S, x;
    s({ mp4boxFile: o, info: h });
    const p = (S = h.videoTracks[0]) == null ? void 0 : S.id;
    p != null && o.setExtractionOptions(p, "video", { nbSamples: 100 });
    const r = (x = h.audioTracks[0]) == null ? void 0 : x.id;
    r != null && o.setExtractionOptions(r, "audio", { nbSamples: 100 }), o.start();
  }, o.onSamples = l, await u();
  async function u() {
    let h = 0;
    const p = 30 * 1024 * 1024;
    for (; ; ) {
      const r = await c.read(p, {
        at: h
      });
      if (r.byteLength === 0) break;
      r.fileStart = h;
      const S = o.appendBuffer(r);
      if (S == null) break;
      h = S;
    }
    o.stop();
  }
}
function Xs(c) {
  if ((c == null ? void 0 : c.length) !== 9) return {};
  const s = new Int32Array(c.buffer), l = s[0] / 65536, o = s[1] / 65536, u = s[3] / 65536, h = s[4] / 65536, p = s[6] / 65536, r = s[7] / 65536, S = s[8] / (1 << 30), x = Math.sqrt(l * l + u * u), b = Math.sqrt(o * o + h * h), I = Math.atan2(u, l), y = I * 180 / Math.PI;
  return {
    scaleX: x,
    scaleY: b,
    rotationRad: I,
    rotationDeg: y,
    translateX: p,
    translateY: r,
    perspective: S
  };
}
function Zs(c, s, l) {
  const o = (Math.round(l / 90) * 90 + 360) % 360;
  if (o === 0) return (S) => S;
  const u = o === 90 || o === 270 ? s : c, h = o === 90 || o === 270 ? c : s, p = new OffscreenCanvas(u, h), r = p.getContext("2d");
  return r.translate(u / 2, h / 2), r.rotate(-o * Math.PI / 180), r.translate(-c / 2, -s / 2), (S) => {
    if (S == null) return null;
    r.drawImage(S, 0, 0);
    const x = new VideoFrame(p, {
      timestamp: S.timestamp,
      duration: S.duration ?? void 0
    });
    return S.close(), x;
  };
}
let ln = 0;
function $i(c) {
  return c.kind === "file" && c.createReader instanceof Function;
}
var Pi, oi, li, Jt, Pt, ne, pe, ci, di, qt, ye, Xe, Ie, re, Dt, Ze;
const Ee = class Ee {
  constructor(s, l = {}) {
    dt(this, Pi, ln++);
    dt(this, oi, bt.create(`MP4Clip id:${w(this, Pi)},`));
    Kt(this, "ready");
    dt(this, li, false);
    dt(this, Jt, {
      // 微秒
      duration: 0,
      width: 0,
      height: 0,
      audioSampleRate: 0,
      audioChanCount: 0
    });
    dt(this, Pt);
    /** 存储视频头（box: ftyp, moov）的二进制数据 */
    dt(this, ne, []);
    /**存储视频平移旋转信息，目前只还原旋转 */
    dt(this, pe, {
      perspective: 1,
      rotationRad: 0,
      rotationDeg: 0,
      scaleX: 1,
      scaleY: 1,
      translateX: 0,
      translateY: 0
    });
    dt(this, ci, (s) => s);
    dt(this, di, 1);
    dt(this, qt, []);
    dt(this, ye, []);
    dt(this, Xe, null);
    dt(this, Ie, null);
    dt(this, re, {
      video: null,
      audio: null
    });
    dt(this, Dt, { audio: true });
    /**
     * 拦截 {@link MP4Clip.tick} 方法返回的数据，用于对图像、音频数据二次处理
     * @param time 调用 tick 的时间
     * @param tickRet tick 返回的数据
     *
     * @see [移除视频绿幕背景](https://webav-tech.github.io/WebAV/demo/3_2-chromakey-video)
     */
    Kt(this, "tickInterceptor", async (s, l) => l);
    dt(this, Ze, new AbortController());
    if (!(s instanceof ReadableStream) && !$i(s) && !Array.isArray(s.videoSamples))
      throw Error("Illegal argument");
    ot(this, Dt, { audio: true, ...l }), ot(this, di, typeof l.audio == "object" && "volume" in l.audio ? l.audio.volume : 1);
    const o = async (u) => (await an(w(this, Pt), u), w(this, Pt));
    ot(this, Pt, $i(s) ? s : "localFile" in s ? s.localFile : Ls()), this.ready = (s instanceof ReadableStream ? o(s).then(
      (u) => wn(u, w(this, Dt))
    ) : $i(s) ? wn(s, w(this, Dt)) : Promise.resolve(s)).then(
      async ({
        videoSamples: u,
        audioSamples: h,
        decoderConf: p,
        headerBoxPos: r,
        parsedMatrix: S
      }) => {
        ot(this, qt, u), ot(this, ye, h), ot(this, re, p), ot(this, ne, r), ot(this, pe, S);
        const { videoFrameFinder: x, audioFrameFinder: b } = Js(
          {
            video: p.video == null ? null : {
              ...p.video,
              hardwareAcceleration: w(this, Dt).__unsafe_hardwareAcceleration__
            },
            audio: p.audio
          },
          await w(this, Pt).createReader(),
          u,
          h,
          w(this, Dt).audio !== false ? w(this, di) : 0
        );
        ot(this, Xe, x), ot(this, Ie, b);
        const { codedWidth: I, codedHeight: y } = p.video ?? {};
        return I && y && ot(this, ci, Zs(
          I,
          y,
          S.rotationDeg
        )), ot(this, Jt, Ks(
          p,
          u,
          h,
          S.rotationDeg
        )), w(this, oi).info("MP4Clip meta:", w(this, Jt)), { ...w(this, Jt) };
      }
    );
  }
  get meta() {
    return { ...w(this, Jt) };
  }
  /**
   * 提供视频头（box: ftyp, moov）的二进制数据
   * 使用任意 mp4 demxer 解析即可获得详细的视频信息
   * 单元测试包含使用 mp4box.js 解析示例代码
   */
  async getFileHeaderBinData() {
    await this.ready;
    const s = await w(this, Pt).getOriginFile();
    if (s == null) throw Error("MP4Clip localFile is not origin file");
    return await new Blob(
      w(this, ne).map(
        ({ start: l, size: o }) => s.slice(l, l + o)
      )
    ).arrayBuffer();
  }
  /**
   * 获取素材指定时刻的图像帧、音频数据
   * @param time 微秒
   */
  async tick(s) {
    var u, h, p;
    if (s >= w(this, Jt).duration)
      return await this.tickInterceptor(s, {
        audio: await ((u = w(this, Ie)) == null ? void 0 : u.find(s)) ?? [],
        state: "done"
      });
    const [l, o] = await Promise.all([
      ((h = w(this, Ie)) == null ? void 0 : h.find(s)) ?? [],
      (p = w(this, Xe)) == null ? void 0 : p.find(s).then(w(this, ci))
    ]);
    return o == null ? await this.tickInterceptor(s, {
      audio: l,
      state: "success"
    }) : await this.tickInterceptor(s, {
      video: o,
      audio: l,
      state: "success"
    });
  }
  /**
   * 生成缩略图，默认每个关键帧生成一个 100px 宽度的缩略图。
   *
   * @param imgWidth 缩略图宽度，默认 100
   * @param opts Partial<ThumbnailOpts>
   * @returns Promise<Array<{ ts: number; img: Blob }>>
   */
  async thumbnails(s = 100, l) {
    w(this, Ze).abort(), ot(this, Ze, new AbortController());
    const o = w(this, Ze).signal;
    await this.ready;
    const u = "generate thumbnails aborted";
    if (o.aborted) throw Error(u);
    const { width: h, height: p } = w(this, Jt), r = ia(
      s,
      Math.round(p * (s / h)),
      { quality: 0.1, type: "image/png" }
    );
    return new Promise(
      async (S, x) => {
        let b = [];
        const I = w(this, re).video;
        if (I == null || w(this, qt).length === 0) {
          y();
          return;
        }
        o.addEventListener("abort", () => {
          x(Error(u));
        });
        async function y() {
          o.aborted || S(
            await Promise.all(
              b.map(async (a) => ({
                ts: a.ts,
                img: await a.img
              }))
            )
          );
        }
        function A(a) {
          b.push({
            ts: a.timestamp,
            img: r(a)
          });
        }
        const { start: t = 0, end: e = w(this, Jt).duration, step: n } = l ?? {};
        if (n) {
          let a = t;
          const d = new $n(
            await w(this, Pt).createReader(),
            w(this, qt),
            {
              ...I,
              hardwareAcceleration: w(this, Dt).__unsafe_hardwareAcceleration__
            }
          );
          for (; a <= e && !o.aborted; ) {
            const f = await d.find(a);
            f && A(f), a += n;
          }
          d.destroy(), y();
        } else
          await aa(
            w(this, qt),
            w(this, Pt),
            I,
            o,
            { start: t, end: e },
            (a, d) => {
              a != null && A(a), d && y();
            }
          );
      }
    );
  }
  async split(s) {
    if (await this.ready, s <= 0 || s >= w(this, Jt).duration)
      throw Error('"time" out of bounds');
    const [l, o] = na(
      w(this, qt),
      s
    ), [u, h] = ra(
      w(this, ye),
      s
    ), p = new Ee(
      {
        localFile: w(this, Pt),
        videoSamples: l ?? [],
        audioSamples: u ?? [],
        decoderConf: w(this, re),
        headerBoxPos: w(this, ne),
        parsedMatrix: w(this, pe)
      },
      w(this, Dt)
    ), r = new Ee(
      {
        localFile: w(this, Pt),
        videoSamples: o ?? [],
        audioSamples: h ?? [],
        decoderConf: w(this, re),
        headerBoxPos: w(this, ne),
        parsedMatrix: w(this, pe)
      },
      w(this, Dt)
    );
    return await Promise.all([p.ready, r.ready]), [p, r];
  }
  async clone() {
    await this.ready;
    const s = new Ee(
      {
        localFile: w(this, Pt),
        videoSamples: [...w(this, qt)],
        audioSamples: [...w(this, ye)],
        decoderConf: w(this, re),
        headerBoxPos: w(this, ne),
        parsedMatrix: w(this, pe)
      },
      w(this, Dt)
    );
    return await s.ready, s.tickInterceptor = this.tickInterceptor, s;
  }
  /**
   * 拆分 MP4Clip 为仅包含视频轨道和音频轨道的 MP4Clip
   * @returns Mp4CLip[]
   */
  async splitTrack() {
    await this.ready;
    const s = [];
    if (w(this, qt).length > 0) {
      const l = new Ee(
        {
          localFile: w(this, Pt),
          videoSamples: [...w(this, qt)],
          audioSamples: [],
          decoderConf: {
            video: w(this, re).video,
            audio: null
          },
          headerBoxPos: w(this, ne),
          parsedMatrix: w(this, pe)
        },
        w(this, Dt)
      );
      await l.ready, l.tickInterceptor = this.tickInterceptor, s.push(l);
    }
    if (w(this, ye).length > 0) {
      const l = new Ee(
        {
          localFile: w(this, Pt),
          videoSamples: [],
          audioSamples: [...w(this, ye)],
          decoderConf: {
            audio: w(this, re).audio,
            video: null
          },
          headerBoxPos: w(this, ne),
          parsedMatrix: w(this, pe)
        },
        w(this, Dt)
      );
      await l.ready, l.tickInterceptor = this.tickInterceptor, s.push(l);
    }
    return s;
  }
  destroy() {
    var s, l;
    w(this, li) || (w(this, oi).info("MP4Clip destroy"), ot(this, li, true), (s = w(this, Xe)) == null || s.destroy(), (l = w(this, Ie)) == null || l.destroy());
  }
};
Pi = new WeakMap(), oi = new WeakMap(), li = new WeakMap(), Jt = new WeakMap(), Pt = new WeakMap(), ne = new WeakMap(), pe = new WeakMap(), ci = new WeakMap(), di = new WeakMap(), qt = new WeakMap(), ye = new WeakMap(), Xe = new WeakMap(), Ie = new WeakMap(), re = new WeakMap(), Dt = new WeakMap(), Ze = new WeakMap();
let Fi = Ee;
function Ks(c, s, l, o) {
  const u = {
    duration: 0,
    width: 0,
    height: 0,
    audioSampleRate: 0,
    audioChanCount: 0
  };
  if (c.video != null && s.length > 0) {
    u.width = c.video.codedWidth ?? 0, u.height = c.video.codedHeight ?? 0;
    const r = (Math.round(o / 90) * 90 + 360) % 360;
    (r === 90 || r === 270) && ([u.width, u.height] = [u.height, u.width]);
  }
  c.audio != null && l.length > 0 && (u.audioSampleRate = jt.sampleRate, u.audioChanCount = jt.channelCount);
  let h = 0, p = 0;
  if (s.length > 0)
    for (let r = s.length - 1; r >= 0; r--) {
      const S = s[r];
      if (!S.deleted) {
        h = S.cts + S.duration;
        break;
      }
    }
  if (l.length > 0) {
    const r = l.at(-1);
    p = r.cts + r.duration;
  }
  return u.duration = Math.max(h, p), u;
}
function Js(c, s, l, o, u) {
  return {
    audioFrameFinder: u === 0 || c.audio == null || o.length === 0 ? null : new Qs(
      s,
      o,
      c.audio,
      {
        volume: u,
        targetSampleRate: jt.sampleRate
      }
    ),
    videoFrameFinder: c.video == null || l.length === 0 ? null : new $n(
      s,
      l,
      c.video
    )
  };
}
async function wn(c, s = {}) {
  let l = null;
  const o = { video: null, audio: null };
  let u = [], h = [], p = [];
  const r = {
    perspective: 1,
    rotationRad: 0,
    rotationDeg: 0,
    scaleX: 1,
    scaleY: 1,
    translateX: 0,
    translateY: 0
  };
  let S = -1, x = -1;
  const b = await c.createReader();
  await js(
    b,
    async (y) => {
      var a;
      l = y.info;
      const A = y.mp4boxFile.ftyp;
      p.push({ start: A.start, size: A.size });
      const t = y.mp4boxFile.moov;
      p.push({ start: t.start, size: t.size }), Object.assign(r, Xs((a = l.videoTracks[0]) == null ? void 0 : a.matrix));
      let { videoDecoderConf: e, audioDecoderConf: n } = Ys(
        y.mp4boxFile,
        y.info
      );
      if (o.video = e ?? null, o.audio = n ?? null, e == null && n == null && bt.error("MP4Clip no video and audio track"), n != null) {
        const { supported: d } = await AudioDecoder.isConfigSupported(n);
        d || bt.error(`MP4Clip audio codec is not supported: ${n.codec}`);
      }
      if (e != null) {
        const { supported: d } = await VideoDecoder.isConfigSupported(e);
        d || bt.error(`MP4Clip video codec is not supported: ${e.codec}`);
      }
      bt.info(
        "mp4BoxFile moov ready",
        {
          ...y.info,
          tracks: null,
          videoTracks: null,
          audioTracks: null
        },
        o
      );
    },
    (y, A, t) => {
      if (A === "video") {
        S === -1 && (S = t[0].dts);
        for (const e of t)
          u.push(Tn(e, S, "video"));
      } else if (A === "audio" && s.audio) {
        x === -1 && (x = t[0].dts);
        for (const e of t)
          h.push(Tn(e, x, "audio"));
      }
    }
  ), await b.close();
  const I = u.at(-1) ?? h.at(-1);
  if (l == null)
    throw Error("MP4Clip stream is done, but not emit ready");
  if (I == null)
    throw Error("MP4Clip stream not contain any sample");
  return nn(u), bt.info("mp4 stream parsed"), {
    videoSamples: u,
    audioSamples: h,
    decoderConf: o,
    headerBoxPos: p,
    parsedMatrix: r
  };
}
function Tn(c, s = 0, l) {
  let o = c.offset;
  const u = l === "video" && c.is_sync ? sa(c.data, c.description.type) : -1;
  let h = c.size;
  return u > 0 && (o += u, h -= u), {
    ...c,
    is_idr: u >= 0,
    offset: o,
    size: h,
    cts: (c.cts - s) / c.timescale * 1e6,
    dts: (c.dts - s) / c.timescale * 1e6,
    duration: c.duration / c.timescale * 1e6,
    timescale: 1e6,
    // 音频数据量可控，直接保存在内存中
    data: l === "video" ? null : c.data
  };
}
var zt, Ae, ze, ui, Fe, se, Ot, be, Be, Ke, hi, Je, Se, fi, Pe, pi;
class $n {
  constructor(s, l, o) {
    dt(this, zt, null);
    dt(this, Ae, 0);
    dt(this, ze, { abort: false, st: performance.now() });
    Kt(this, "find", async (s) => {
      (w(this, zt) == null || w(this, zt).state === "closed" || s <= w(this, Ae) || s - w(this, Ae) > 3e6) && w(this, Pe).call(this, s), w(this, ze).abort = true, ot(this, Ae, s), ot(this, ze, { abort: false, st: performance.now() });
      const l = await w(this, Je).call(this, s, w(this, zt), w(this, ze));
      return ot(this, Ke, 0), l;
    });
    // fix VideoFrame duration is null
    dt(this, ui, 0);
    dt(this, Fe, false);
    dt(this, se, 0);
    dt(this, Ot, []);
    dt(this, be, 0);
    dt(this, Be, 0);
    dt(this, Ke, 0);
    dt(this, hi, false);
    dt(this, Je, async (s, l, o) => {
      if (l == null || l.state === "closed" || o.abort) return null;
      if (w(this, Ot).length > 0) {
        const u = w(this, Ot)[0];
        return s < u.timestamp ? null : (w(this, Ot).shift(), s > u.timestamp + (u.duration ?? 0) ? (u.close(), await w(this, Je).call(this, s, l, o)) : (!w(this, hi) && w(this, Ot).length < 10 && w(this, fi).call(this, l).catch((h) => {
          throw ot(this, hi, true), w(this, Pe).call(this, s), h;
        }), u));
      }
      if (w(this, Se) || w(this, be) < w(this, Be) && l.decodeQueueSize > 0) {
        if (performance.now() - o.st > 6e3)
          throw Error(
            `MP4Clip.tick video timeout, ${JSON.stringify(w(this, pi).call(this))}`
          );
        ot(this, Ke, w(this, Ke) + 1), await Yn(15);
      } else {
        if (w(this, se) >= this.samples.length)
          return null;
        try {
          await w(this, fi).call(this, l);
        } catch (u) {
          throw w(this, Pe).call(this, s), u;
        }
      }
      return await w(this, Je).call(this, s, l, o);
    });
    dt(this, Se, false);
    dt(this, fi, async (s) => {
      var u, h;
      if (w(this, Se) || s.decodeQueueSize > 600) return;
      let l = w(this, se) + 1;
      if (l > this.samples.length) return;
      ot(this, Se, true);
      let o = false;
      for (; l < this.samples.length; l++) {
        const p = this.samples[l];
        if (!o && !p.deleted && (o = true), p.is_idr) break;
      }
      if (o) {
        const p = this.samples.slice(w(this, se), l);
        if (((u = p[0]) == null ? void 0 : u.is_idr) !== true)
          bt.warn("First sample not idr frame");
        else {
          const r = performance.now(), S = await Vn(p, this.localFileReader), x = performance.now() - r;
          if (x > 1e3) {
            const b = p[0], I = p.at(-1), y = I.offset + I.size - b.offset;
            bt.warn(
              `Read video samples time cost: ${Math.round(x)}ms, file chunk size: ${y}`
            );
          }
          if (s.state === "closed") return;
          ot(this, ui, ((h = S[0]) == null ? void 0 : h.duration) ?? 0), en(s, S, {
            onDecodingError: (b) => {
              if (w(this, Fe))
                throw b;
              w(this, be) === 0 && (ot(this, Fe, true), bt.warn("Downgrade to software decode"), w(this, Pe).call(this));
            }
          }), ot(this, Be, w(this, Be) + S.length);
        }
      }
      ot(this, se, l), ot(this, Se, false);
    });
    dt(this, Pe, (s) => {
      var o, u;
      if (ot(this, Se, false), w(this, Ot).forEach((h) => h.close()), ot(this, Ot, []), s == null || s === 0)
        ot(this, se, 0);
      else {
        let h = 0;
        for (let p = 0; p < this.samples.length; p++) {
          const r = this.samples[p];
          if (r.is_idr && (h = p), !(r.cts < s)) {
            ot(this, se, h);
            break;
          }
        }
      }
      ot(this, Be, 0), ot(this, be, 0), ((o = w(this, zt)) == null ? void 0 : o.state) !== "closed" && ((u = w(this, zt)) == null || u.close());
      const l = {
        ...this.conf,
        ...w(this, Fe) ? { hardwareAcceleration: "prefer-software" } : {}
      };
      ot(this, zt, new VideoDecoder({
        output: (h) => {
          if (ot(this, be, w(this, be) + 1), h.timestamp === -1) {
            h.close();
            return;
          }
          let p = h;
          h.duration == null && (p = new VideoFrame(h, {
            duration: w(this, ui)
          }), h.close()), w(this, Ot).push(p);
        },
        error: (h) => {
          if (h.message.includes("Codec reclaimed due to inactivity")) {
            ot(this, zt, null), bt.warn(h.message);
            return;
          }
          const p = `VideoFinder VideoDecoder err: ${h.message}, config: ${JSON.stringify(l)}, state: ${JSON.stringify(w(this, pi).call(this))}`;
          throw bt.error(p), Error(p);
        }
      })), w(this, zt).configure(l);
    });
    dt(this, pi, () => {
      var s, l;
      return {
        time: w(this, Ae),
        decState: (s = w(this, zt)) == null ? void 0 : s.state,
        decQSize: (l = w(this, zt)) == null ? void 0 : l.decodeQueueSize,
        decCusorIdx: w(this, se),
        sampleLen: this.samples.length,
        inputCnt: w(this, Be),
        outputCnt: w(this, be),
        cacheFrameLen: w(this, Ot).length,
        softDeocde: w(this, Fe),
        clipIdCnt: ln,
        sleepCnt: w(this, Ke),
        memInfo: Wn()
      };
    });
    Kt(this, "destroy", () => {
      var s, l;
      ((s = w(this, zt)) == null ? void 0 : s.state) !== "closed" && ((l = w(this, zt)) == null || l.close()), ot(this, zt, null), w(this, ze).abort = true, w(this, Ot).forEach((o) => o.close()), ot(this, Ot, []), this.localFileReader.close();
    });
    this.localFileReader = s, this.samples = l, this.conf = o;
  }
}
zt = new WeakMap(), Ae = new WeakMap(), ze = new WeakMap(), ui = new WeakMap(), Fe = new WeakMap(), se = new WeakMap(), Ot = new WeakMap(), be = new WeakMap(), Be = new WeakMap(), Ke = new WeakMap(), hi = new WeakMap(), Je = new WeakMap(), Se = new WeakMap(), fi = new WeakMap(), Pe = new WeakMap(), pi = new WeakMap();
function qs(c, s) {
  for (let l = 0; l < s.length; l++) {
    const o = s[l];
    if (c >= o.cts && c < o.cts + o.duration)
      return l;
    if (o.cts > c) break;
  }
  return 0;
}
var _i, mi, Qt, De, ae, _e, Wt, qe, vi, gi, Di, Li;
class Qs {
  constructor(s, l, o, u) {
    dt(this, _i, 1);
    dt(this, mi);
    dt(this, Qt, null);
    dt(this, De, { abort: false, st: performance.now() });
    Kt(this, "find", async (s) => {
      const l = s <= w(this, ae) || s - w(this, ae) > 1e5;
      (w(this, Qt) == null || w(this, Qt).state === "closed" || l) && w(this, Di).call(this), l && (ot(this, ae, s), ot(this, _e, qs(s, this.samples))), w(this, De).abort = true;
      const o = s - w(this, ae);
      ot(this, ae, s), ot(this, De, { abort: false, st: performance.now() });
      const u = await w(this, vi).call(this, Math.ceil(o * (w(this, mi) / 1e6)), w(this, Qt), w(this, De));
      return ot(this, qe, 0), u;
    });
    dt(this, ae, 0);
    dt(this, _e, 0);
    dt(this, Wt, {
      frameCnt: 0,
      data: []
    });
    dt(this, qe, 0);
    dt(this, vi, async (s, l = null, o) => {
      if (l == null || o.abort || l.state === "closed" || s === 0)
        return [];
      const u = w(this, Wt).frameCnt - s;
      if (u > 0)
        return u < jt.sampleRate / 10 && w(this, gi).call(this, l), Cn(w(this, Wt), s);
      if (l.decoding) {
        if (performance.now() - o.st > 3e3)
          throw o.abort = true, Error(
            `MP4Clip.tick audio timeout, ${JSON.stringify(w(this, Li).call(this))}`
          );
        ot(this, qe, w(this, qe) + 1), await Yn(15);
      } else {
        if (w(this, _e) >= this.samples.length - 1)
          return Cn(w(this, Wt), w(this, Wt).frameCnt);
        w(this, gi).call(this, l);
      }
      return w(this, vi).call(this, s, l, o);
    });
    dt(this, gi, (s) => {
      if (s.decodeQueueSize > 10) return;
      const l = [];
      let o = w(this, _e);
      for (; o < this.samples.length; ) {
        const u = this.samples[o];
        if (o += 1, !u.deleted && (l.push(u), l.length >= 10))
          break;
      }
      ot(this, _e, o), s.decode(
        l.map(
          (u) => new EncodedAudioChunk({
            type: "key",
            timestamp: u.cts,
            duration: u.duration,
            data: u.data
          })
        )
      );
    });
    dt(this, Di, () => {
      var s;
      ot(this, ae, 0), ot(this, _e, 0), ot(this, Wt, {
        frameCnt: 0,
        data: []
      }), (s = w(this, Qt)) == null || s.close(), ot(this, Qt, ta(
        this.conf,
        {
          resampleRate: jt.sampleRate,
          volume: w(this, _i)
        },
        (l) => {
          w(this, Wt).data.push(l), w(this, Wt).frameCnt += l[0].length;
        }
      ));
    });
    dt(this, Li, () => {
      var s, l;
      return {
        time: w(this, ae),
        decState: (s = w(this, Qt)) == null ? void 0 : s.state,
        decQSize: (l = w(this, Qt)) == null ? void 0 : l.decodeQueueSize,
        decCusorIdx: w(this, _e),
        sampleLen: this.samples.length,
        pcmLen: w(this, Wt).frameCnt,
        clipIdCnt: ln,
        sleepCnt: w(this, qe),
        memInfo: Wn()
      };
    });
    Kt(this, "destroy", () => {
      ot(this, Qt, null), w(this, De).abort = true, ot(this, Wt, {
        frameCnt: 0,
        data: []
      }), this.localFileReader.close();
    });
    this.localFileReader = s, this.samples = l, this.conf = o, ot(this, _i, u.volume), ot(this, mi, u.targetSampleRate);
  }
}
_i = new WeakMap(), mi = new WeakMap(), Qt = new WeakMap(), De = new WeakMap(), ae = new WeakMap(), _e = new WeakMap(), Wt = new WeakMap(), qe = new WeakMap(), vi = new WeakMap(), gi = new WeakMap(), Di = new WeakMap(), Li = new WeakMap();
function ta(c, s, l) {
  let o = 0, u = 0;
  const h = (b) => {
    if (u += 1, b.length !== 0) {
      if (s.volume !== 1)
        for (const I of b)
          for (let y = 0; y < I.length; y++) I[y] *= s.volume;
      b.length === 1 && (b = [b[0], b[0]]), l(b);
    }
  }, p = ea(h), r = s.resampleRate !== c.sampleRate;
  let S = new AudioDecoder({
    output: (b) => {
      const I = Os(b);
      r ? p(
        () => Hs(I, b.sampleRate, {
          rate: s.resampleRate,
          chanCount: b.numberOfChannels
        })
      ) : h(I), b.close();
    },
    error: (b) => {
      b.message.includes("Codec reclaimed due to inactivity") || x("MP4Clip AudioDecoder err", b);
    }
  });
  S.configure(c);
  function x(b, I) {
    const y = `${b}: ${I.message}, state: ${JSON.stringify(
      {
        qSize: S.decodeQueueSize,
        state: S.state,
        inputCnt: o,
        outputCnt: u
      }
    )}`;
    throw bt.error(y), Error(y);
  }
  return {
    decode(b) {
      o += b.length;
      try {
        for (const I of b) S.decode(I);
      } catch (I) {
        x("decode audio chunk error", I);
      }
    },
    close() {
      S.state !== "closed" && S.close();
    },
    get decoding() {
      return o > u && S.decodeQueueSize > 0;
    },
    get state() {
      return S.state;
    },
    get decodeQueueSize() {
      return S.decodeQueueSize;
    }
  };
}
function ea(c) {
  const s = [];
  let l = 0;
  function o(p, r) {
    s[r] = p, u();
  }
  function u() {
    const p = s[l];
    p != null && (c(p), l += 1, u());
  }
  let h = 0;
  return (p) => {
    const r = h;
    h += 1, p().then((S) => o(S, r)).catch((S) => o(S, r));
  };
}
function Cn(c, s) {
  const l = [new Float32Array(s), new Float32Array(s)];
  let o = 0, u = 0;
  for (; u < c.data.length; ) {
    const [h, p] = c.data[u];
    if (o + h.length > s) {
      const r = s - o;
      l[0].set(h.subarray(0, r), o), l[1].set(p.subarray(0, r), o), c.data[u][0] = h.subarray(r, h.length), c.data[u][1] = p.subarray(r, p.length);
      break;
    } else
      l[0].set(h, o), l[1].set(p, o), o += h.length, u++;
  }
  return c.data = c.data.slice(u), c.frameCnt -= s, l;
}
async function Vn(c, s) {
  const l = c[0], o = c.at(-1);
  if (o == null) return [];
  const u = o.offset + o.size - l.offset;
  if (u < 3e7) {
    const h = new Uint8Array(
      await s.read(u, { at: l.offset })
    );
    return c.map((p) => {
      const r = p.offset - l.offset;
      return new EncodedVideoChunk({
        type: p.is_sync ? "key" : "delta",
        timestamp: p.cts,
        duration: p.duration,
        data: h.subarray(r, r + p.size)
      });
    });
  }
  return await Promise.all(
    c.map(async (h) => new EncodedVideoChunk({
      type: h.is_sync ? "key" : "delta",
      timestamp: h.cts,
      duration: h.duration,
      data: await s.read(h.size, {
        at: h.offset
      })
    }))
  );
}
function ia(c, s, l) {
  const o = new OffscreenCanvas(c, s), u = o.getContext("2d");
  return async (h) => (u.drawImage(h, 0, 0, c, s), h.close(), await o.convertToBlob(l));
}
function na(c, s) {
  if (c.length === 0) return [];
  let l = 0, o = 0, u = -1;
  for (let S = 0; S < c.length; S++) {
    const x = c[S];
    if (u === -1 && s < x.cts && (u = S - 1), x.is_idr)
      if (u === -1)
        l = S;
      else {
        o = S;
        break;
      }
  }
  const h = c[u];
  if (h == null) throw Error("Not found video sample by time");
  const p = c.slice(0, o === 0 ? c.length : o).map((S) => ({ ...S }));
  for (let S = l; S < p.length; S++) {
    const x = p[S];
    s < x.cts && (x.deleted = true, x.cts = -1);
  }
  nn(p);
  const r = c.slice(h.is_idr ? u : l).map((S) => ({ ...S, cts: S.cts - s }));
  for (const S of r)
    S.cts < 0 && (S.deleted = true, S.cts = -1);
  return nn(r), [p, r];
}
function ra(c, s) {
  if (c.length === 0) return [];
  let l = -1;
  for (let h = 0; h < c.length; h++) {
    const p = c[h];
    if (!(s > p.cts)) {
      l = h;
      break;
    }
  }
  if (l === -1) throw Error("Not found audio sample by time");
  const o = c.slice(0, l).map((h) => ({ ...h })), u = c.slice(l).map((h) => ({ ...h, cts: h.cts - s }));
  return [o, u];
}
function en(c, s, l) {
  if (c.state === "configured") {
    for (let o = 0; o < s.length; o++) c.decode(s[o]);
    c.flush().catch((o) => {
      if (!(o instanceof Error)) throw o;
      if (o.message.includes("Decoding error") && l.onDecodingError != null) {
        l.onDecodingError(o);
        return;
      }
      if (!o.message.includes("Aborted due to close"))
        throw o;
    });
  }
}
function sa(c, s) {
  if (s !== "avc1" && s !== "hvc1") return 0;
  const l = new DataView(c.buffer);
  for (let o = 0; o < c.byteLength - 4; ) {
    if (s === "avc1") {
      const u = l.getUint8(o + 4) & 31;
      if (u === 5 || u === 7 || u === 8) return o;
    } else if (s === "hvc1") {
      const u = l.getUint8(o + 4) >> 1 & 63;
      if (u === 19 || u === 20 || u === 32 || u === 33 || u === 34)
        return o;
    }
    o += l.getUint32(o) + 4;
  }
  return -1;
}
async function aa(c, s, l, o, u, h) {
  const p = await s.createReader(), r = await Vn(
    c.filter(
      (b) => !b.deleted && b.is_sync && b.cts >= u.start && b.cts <= u.end
    ),
    p
  );
  if (r.length === 0 || o.aborted) {
    h(null, true);
    return;
  }
  let S = 0;
  en(x(), r, {
    onDecodingError: (b) => {
      bt.warn("thumbnailsByKeyFrame", b), S === 0 ? en(x(true), r, {
        onDecodingError: (I) => {
          p.close(), bt.error("thumbnailsByKeyFrame retry soft deocde", I);
        }
      }) : (h(null, true), p.close());
    }
  });
  function x(b = false) {
    const I = {
      ...l,
      ...b ? { hardwareAcceleration: "prefer-software" } : {}
    }, y = new VideoDecoder({
      output: (A) => {
        S += 1;
        const t = S === r.length;
        h(A, t), t && (p.close(), y.state !== "closed" && y.close());
      },
      error: (A) => {
        const t = `thumbnails decoder error: ${A.message}, config: ${JSON.stringify(I)}, state: ${JSON.stringify(
          {
            qSize: y.decodeQueueSize,
            state: y.state,
            outputCnt: S,
            inputCnt: r.length
          }
        )}`;
        throw bt.error(t), Error(t);
      }
    });
    return o.addEventListener("abort", () => {
      p.close(), y.state !== "closed" && y.close();
    }), y.configure(I), y;
  }
}
function nn(c) {
  let s = 0, l = null;
  for (const o of c)
    if (!o.deleted) {
      if (o.is_sync && (s += 1), s >= 2) break;
      (l == null || o.cts < l.cts) && (l = o);
    }
  l != null && l.cts < 2e5 && (l.duration += l.cts, l.cts = 0);
}
function Wn() {
  try {
    const c = performance.memory;
    return {
      jsHeapSizeLimit: c.jsHeapSizeLimit,
      totalJSHeapSize: c.totalJSHeapSize,
      usedJSHeapSize: c.usedJSHeapSize,
      percentUsed: (c.usedJSHeapSize / c.jsHeapSizeLimit).toFixed(3),
      percentTotal: (c.totalJSHeapSize / c.jsHeapSizeLimit).toFixed(3)
    };
  } catch {
    return {};
  }
}
var Le, me, xe, oe, Mi, jn, we, le;
const ie = class ie {
  /**
   *
   * @param dataSource 音频文件流
   * @param opts 音频配置，控制音量、是否循环
   */
  constructor(s, l = {}) {
    dt(this, Mi);
    Kt(this, "ready");
    dt(this, Le, {
      // 微秒
      duration: 0,
      width: 0,
      height: 0
    });
    // 使用类型断言来避免 ArrayBufferLike 和 ArrayBuffer 的类型兼容性问题
    dt(this, me, new Float32Array());
    dt(this, xe, new Float32Array());
    dt(this, oe);
    /**
     * 拦截 {@link AudioClip.tick} 方法返回的数据，用于对音频数据二次处理
     * @param time 调用 tick 的时间
     * @param tickRet tick 返回的数据
     *
     * @see [移除视频绿幕背景](https://webav-tech.github.io/WebAV/demo/3_2-chromakey-video)
     */
    Kt(this, "tickInterceptor", async (s, l) => l);
    // 微秒
    dt(this, we, 0);
    dt(this, le, 0);
    ot(this, oe, {
      loop: false,
      volume: 1,
      ...l
    }), this.ready = fn(this, Mi, jn).call(this, s).then(() => ({
      // audio 没有宽高，无需绘制
      width: 0,
      height: 0,
      duration: l.loop ? 1 / 0 : w(this, Le).duration
    }));
  }
  /**
   * 音频元信息
   *
   * ⚠️ 注意，这里是转换后（标准化）的元信息，非原始音频元信息
   */
  get meta() {
    return {
      ...w(this, Le),
      sampleRate: jt.sampleRate,
      chanCount: 2
    };
  }
  /**
   * 获取音频素材完整的 PCM 数据
   */
  getPCMData() {
    return [w(this, me), w(this, xe)];
  }
  /**
   * 返回上次与当前时刻差对应的音频 PCM 数据；
   *
   * 若差值超过 3s 或当前时间小于上次时间，则重置状态
   * @example
   * tick(0) // => []
   * tick(1e6) // => [leftChanPCM(1s), rightChanPCM(1s)]
   *
   */
  async tick(s) {
    if (!w(this, oe).loop && s >= w(this, Le).duration)
      return await this.tickInterceptor(s, { audio: [], state: "done" });
    const l = s - w(this, we);
    if (s < w(this, we) || l > 3e6)
      return ot(this, we, s), ot(this, le, Math.ceil(
        w(this, we) / 1e6 * jt.sampleRate
      )), await this.tickInterceptor(s, {
        audio: [new Float32Array(0), new Float32Array(0)],
        state: "success"
      });
    ot(this, we, s);
    const o = Math.ceil(
      l / 1e6 * jt.sampleRate
    ), u = w(this, le) + o, h = w(this, oe).loop ? [
      xn(w(this, me), w(this, le), u),
      xn(w(this, xe), w(this, le), u)
    ] : [
      w(this, me).slice(w(this, le), u),
      w(this, xe).slice(w(this, le), u)
    ];
    return ot(this, le, u), await this.tickInterceptor(s, { audio: h, state: "success" });
  }
  /**
   * 按指定时间切割，返回前后两个音频素材
   * @param time 时间，单位微秒
   */
  async split(s) {
    await this.ready;
    const l = Math.ceil(s / 1e6 * jt.sampleRate), o = new ie(
      this.getPCMData().map((h) => h.slice(0, l)),
      w(this, oe)
    ), u = new ie(
      this.getPCMData().map((h) => h.slice(l)),
      w(this, oe)
    );
    return [o, u];
  }
  async clone() {
    await this.ready;
    const s = new ie(this.getPCMData(), w(this, oe));
    return await s.ready, s;
  }
  /**
   * 销毁实例，释放资源
   */
  destroy() {
    ot(this, me, new Float32Array(0)), ot(this, xe, new Float32Array(0)), bt.info("---- audioclip destroy ----");
  }
};
Le = new WeakMap(), me = new WeakMap(), xe = new WeakMap(), oe = new WeakMap(), Mi = new WeakSet(), jn = async function(s) {
  ie.ctx == null && (ie.ctx = new AudioContext({
    sampleRate: jt.sampleRate
  }));
  const l = performance.now(), o = s instanceof ReadableStream ? await la(s, ie.ctx) : s;
  bt.info("Audio clip decoded complete:", performance.now() - l);
  const u = w(this, oe).volume;
  if (u !== 1)
    for (const h of o)
      for (let p = 0; p < h.length; p += 1) h[p] *= u;
  w(this, Le).duration = o[0].length / jt.sampleRate * 1e6, ot(this, me, o[0]), ot(this, xe, o[1] ?? w(this, me)), bt.info(
    "Audio clip convert to AudioData, time:",
    performance.now() - l
  );
}, we = new WeakMap(), le = new WeakMap(), Kt(ie, "ctx", null), Kt(ie, "concatAudioClip", oa);
let Bi = ie;
async function oa(c, s) {
  const l = [];
  for (const o of c)
    await o.ready, l.push(o.getPCMData());
  return new Bi(Rs(l), s);
}
async function la(c, s) {
  const l = await new Response(c).arrayBuffer();
  return Hn(await s.decodeAudioData(l));
}
const Vi = /* @__PURE__ */ new Map(), je = /* @__PURE__ */ new Map(), Qe = /* @__PURE__ */ new Map();
async function ca(c, s = {}) {
  const { count: l = 10, width: o = 120 } = s, u = `${c}_${l}_${o}`;
  if (Vi.has(u))
    return {
      thumbnails: Vi.get(u),
      duration: Qe.get(c) || 0
    };
  try {
    const h = await fetch(c);
    if (!h.ok || !h.body)
      throw new Error(`Failed to fetch video: ${h.statusText}`);
    const p = new Fi(h.body);
    await p.ready;
    const r = p.meta.duration / 1e6, S = r * 1e6 / l, x = await p.thumbnails(o, {
      start: 0,
      end: r * 1e6,
      step: Math.max(S, 1e5)
      // 至少 0.1 秒间隔
    }), b = [];
    for (const I of x)
      if (I.img) {
        const y = URL.createObjectURL(I.img);
        b.push(y);
      }
    return p.destroy(), Vi.set(u, b), Qe.set(c, r), { thumbnails: b, duration: r };
  } catch (h) {
    return console.error("Error extracting thumbnails:", h), { thumbnails: [], duration: 0 };
  }
}
async function da(c, s = {}) {
  const { samples: l = 100 } = s, o = `${c}_${l}`;
  if (je.has(o))
    return {
      waveformData: je.get(o),
      duration: Qe.get(c) || 0
    };
  try {
    const u = await fetch(c);
    if (!u.ok || !u.body)
      throw new Error(`Failed to fetch audio: ${u.statusText}`);
    const h = new Bi(u.body);
    await h.ready;
    const p = h.meta.duration / 1e6, r = h.getPCMData(), S = ha(r, l);
    return h.destroy(), je.set(o, S), Qe.set(c, p), { waveformData: S, duration: p };
  } catch (u) {
    return console.error("Error extracting waveform:", u), { waveformData: [], duration: 0 };
  }
}
async function ua(c, s = {}) {
  const { samples: l = 100 } = s, o = `video_audio_${c}_${l}`;
  if (je.has(o))
    return {
      waveformData: je.get(o),
      duration: Qe.get(c) || 0
    };
  try {
    const u = await fetch(c);
    if (!u.ok || !u.body)
      throw new Error(`Failed to fetch video: ${u.statusText}`);
    const h = new Fi(u.body);
    await h.ready;
    const p = h.meta.duration / 1e6, r = [], S = p * 1e6 / l;
    for (let I = 0; I < l; I++) {
      const y = I * S;
      try {
        const { audio: A } = await h.tick(Math.floor(y));
        if (A && A.length > 0) {
          let t = 0, e = 0;
          for (const n of A)
            for (let a = 0; a < n.length; a++)
              t += Math.abs(n[a]), e++;
          r.push(e > 0 ? t / e : 0);
        } else
          r.push(0);
      } catch {
        r.push(0);
      }
    }
    const x = Math.max(...r, 1e-3), b = r.map((I) => I / x);
    return h.destroy(), je.set(o, b), Qe.set(c, p), { waveformData: b, duration: p };
  } catch (u) {
    return console.error("Error extracting video audio waveform:", u), { waveformData: [], duration: 0 };
  }
}
function ha(c, s) {
  if (!c || c.length === 0)
    return new Array(s).fill(0);
  const l = c[0].length, o = new Float32Array(l);
  for (let r = 0; r < l; r++) {
    let S = 0;
    for (const x of c)
      S += Math.abs(x[r] || 0);
    o[r] = S / c.length;
  }
  const u = Math.floor(l / s), h = [];
  for (let r = 0; r < s; r++) {
    const S = r * u, x = Math.min(S + u, l);
    let b = 0;
    for (let I = S; I < x; I++)
      b += o[I];
    h.push(b / (x - S));
  }
  const p = Math.max(...h, 1e-3);
  return h.map((r) => r / p);
}
const fa = { class: "video-clip" }, pa = {
  key: 0,
  class: "video-clip__loading"
}, _a = {
  key: 0,
  class: "video-clip__thumbnail-placeholder"
}, ma = { class: "video-clip__info" }, va = { class: "video-clip__name" }, ga = {
  key: 0,
  class: "video-clip__rate"
}, ya = 40, ba = 120, Sa = 80, xa = /* @__PURE__ */ defineComponent({
  __name: "VideoClip",
  props: {
    clip: {}
  },
  setup(c) {
    const s = c, l = Yt(), o = ref(), u = ref(false), h = ref([]), p = computed(() => s.clip), r = computed(() => {
      if (p.value.name) return p.value.name;
      const t = p.value.sourceUrl.split("/");
      return t[t.length - 1] || "Video";
    }), S = computed(() => (s.clip.endTime - s.clip.startTime) * l.actualPixelsPerSecond), x = computed(() => {
      const A = Math.sqrt(l.scale), t = Sa * A;
      return Math.max(ya, Math.min(ba, t));
    }), b = computed(() => p.value.thumbnails && p.value.thumbnails.length > 0 ? p.value.thumbnails : h.value), I = computed(() => {
      const A = b.value, t = p.value.originalDuration, e = p.value.trimStart ?? 0, a = (p.value.trimEnd ?? t) - e;
      if (!A || A.length === 0 || t <= 0 || a <= 0) {
        const m = Math.max(1, Math.ceil(S.value / x.value));
        return Array.from({ length: m }, () => ({
          url: "",
          width: S.value / m
        }));
      }
      const d = t / A.length, f = [];
      let _ = 0;
      const v = S.value;
      for (; _ < v; ) {
        const m = _ / v * a, T = e + m, U = Math.floor(T / d), $ = Math.max(0, Math.min(U, A.length - 1));
        let V = x.value;
        _ + V > v && (V = v - _), V > 0 && f.push({
          url: A[$],
          width: V
        }), _ += V;
      }
      return f;
    });
    async function y() {
      if (p.value.thumbnails && p.value.thumbnails.length > 0)
        return;
      const A = p.value.sourceUrl;
      if (A) {
        u.value = true;
        try {
          const t = await ca(A, {
            count: 20,
            width: 120
          });
          h.value = t.thumbnails;
        } catch (t) {
          console.error("Failed to load video thumbnails:", t);
        } finally {
          u.value = false;
        }
      }
    }
    return watch(() => p.value.sourceUrl, () => {
      h.value = [], y();
    }), onMounted(() => {
      y();
    }), onUnmounted(() => {
      for (const A of h.value)
        A.startsWith("blob:") && URL.revokeObjectURL(A);
    }), (A, t) => (openBlock(), createElementBlock("div", fa, [
      createBaseVNode("div", {
        class: "video-clip__thumbnails",
        ref_key: "thumbnailsRef",
        ref: o
      }, [
        u.value ? (openBlock(), createElementBlock("div", pa, [...t[0] || (t[0] = [
          createBaseVNode("span", { class: "video-clip__loading-spinner" }, null, -1),
          createBaseVNode("span", { class: "video-clip__loading-text" }, "加载中...", -1)
        ])])) : (openBlock(), createElementBlock("div", {
          key: 1,
          class: "video-clip__thumbnail-track",
          style: normalizeStyle({ width: S.value + "px" })
        }, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(I.value, (e, n) => (openBlock(), createElementBlock("div", {
            key: n,
            class: "video-clip__thumbnail",
            style: normalizeStyle({
              backgroundImage: e.url ? `url(${e.url})` : "none",
              width: e.width + "px",
              backgroundPosition: "center",
              backgroundSize: "cover"
            })
          }, [
            e.url ? createCommentVNode("", true) : (openBlock(), createElementBlock("div", _a, " 📹 "))
          ], 4))), 128))
        ], 4))
      ], 512),
      createBaseVNode("div", ma, [
        createBaseVNode("span", va, toDisplayString(r.value), 1),
        p.value.playbackRate && p.value.playbackRate !== 1 ? (openBlock(), createElementBlock("span", ga, toDisplayString(p.value.playbackRate) + "x ", 1)) : createCommentVNode("", true)
      ])
    ]));
  }
}), kn = /* @__PURE__ */ At(xa, [["__scopeId", "data-v-611ec10c"]]), wa = {
  key: 0,
  class: "audio-clip__loading"
}, Ta = ["width", "height"], Ca = { class: "audio-clip__info" }, ka = { class: "audio-clip__name" }, Ua = {
  key: 0,
  class: "audio-clip__volume"
}, Ea = /* @__PURE__ */ defineComponent({
  __name: "AudioClip",
  props: {
    clip: {}
  },
  setup(c) {
    const s = c, l = Yt(), o = ref(), u = ref(), h = ref(400), p = ref(32), r = ref(false), S = ref([]);
    let x = null;
    const b = computed(() => s.clip), I = computed(() => {
      if (b.value.name) return b.value.name;
      const _ = b.value.sourceUrl.split("/");
      return _[_.length - 1] || "Audio";
    }), y = computed(() => b.value.waveformData && b.value.waveformData.length > 0 ? b.value.waveformData : S.value), A = computed(() => {
      const f = y.value;
      if (!f || f.length === 0) return [];
      const _ = b.value.originalDuration;
      if (_ <= 0) return f;
      const v = b.value.trimStart ?? 0, m = b.value.trimEnd ?? _;
      if (v === 0 && m === _)
        return f;
      const T = f.length, U = v / _, $ = m / _;
      let V = Math.floor(U * T), F = Math.ceil($ * T);
      return V = Math.max(0, Math.min(V, T - 1)), F = Math.max(V + 1, Math.min(F, T)), f.slice(V, F);
    });
    function t() {
      if (!u.value) return;
      const f = u.value, _ = f.getContext("2d");
      _ && (_.clearRect(0, 0, f.width, f.height), A.value && A.value.length > 0 ? e(_, A.value) : n(_));
    }
    function e(f, _) {
      const v = h.value, m = p.value, T = v / _.length, U = Math.max(1, T * 0.75), $ = f.createLinearGradient(0, 0, 0, m);
      $.addColorStop(0, "rgba(16, 185, 129, 0.9)"), $.addColorStop(0.5, "rgba(16, 185, 129, 1)"), $.addColorStop(1, "rgba(16, 185, 129, 0.9)"), f.fillStyle = $;
      for (let V = 0; V < _.length; V++) {
        const F = V * T + (T - U) / 2, Y = _[V] * m * 0.85, W = (m - Y) / 2, ut = Math.min(1, U / 2);
        f.beginPath(), f.roundRect(F, W, U, Y, ut), f.fill();
      }
      f.strokeStyle = "rgba(255, 255, 255, 0.3)", f.lineWidth = 1, f.beginPath(), f.moveTo(0, m / 2), f.lineTo(v, m / 2), f.stroke();
    }
    function n(f) {
      const _ = h.value, v = p.value, m = Math.max(20, Math.floor(_ / 8));
      f.fillStyle = "rgba(16, 185, 129, 0.5)";
      const T = b.value.id.split("").reduce((U, $) => U + $.charCodeAt(0), 0);
      for (let U = 0; U < m; U++) {
        const $ = U / m * _, V = Math.sin(T + U * 0.5) * 0.3 + Math.sin(T + U * 1.3) * 0.2, F = (0.3 + Math.abs(V) * 0.5) * v, Y = (v - F) / 2;
        f.fillRect($, Y, _ / m - 1, F);
      }
    }
    function a() {
      if (!o.value) return;
      const f = o.value.getBoundingClientRect();
      h.value = Math.max(100, f.width), p.value = Math.max(24, f.height - 20), nextTick(() => {
        t();
      });
    }
    async function d() {
      if (b.value.waveformData && b.value.waveformData.length > 0)
        return;
      const f = b.value.sourceUrl;
      if (f) {
        r.value = true;
        try {
          const v = f.match(/\.(mp4|webm|mov|avi)$/i) ? await ua(f, { samples: 500 }) : await da(f, { samples: 500 });
          S.value = v.waveformData;
        } catch (_) {
          console.error("Failed to load audio waveform:", _);
        } finally {
          r.value = false, nextTick(() => {
            t();
          });
        }
      }
    }
    return watch(() => b.value.sourceUrl, () => {
      S.value = [], d();
    }), watch(A, () => {
      nextTick(() => {
        t();
      });
    }), watch(
      () => [b.value.trimStart, b.value.trimEnd],
      () => {
        nextTick(() => {
          t();
        });
      }
    ), watch(() => l.actualPixelsPerSecond, () => {
      a();
    }), onMounted(() => {
      o.value && (x = new ResizeObserver(() => {
        a();
      }), x.observe(o.value)), a(), d();
    }), onUnmounted(() => {
      x && (x.disconnect(), x = null);
    }), (f, _) => (openBlock(), createElementBlock("div", {
      class: "audio-clip",
      ref_key: "clipRef",
      ref: o
    }, [
      r.value ? (openBlock(), createElementBlock("div", wa, [..._[0] || (_[0] = [
        createBaseVNode("span", { class: "audio-clip__loading-spinner" }, null, -1),
        createBaseVNode("span", { class: "audio-clip__loading-text" }, "加载波形...", -1)
      ])])) : (openBlock(), createElementBlock("canvas", {
        key: 1,
        ref_key: "canvasRef",
        ref: u,
        class: "audio-clip__waveform",
        width: h.value,
        height: p.value
      }, null, 8, Ta)),
      createBaseVNode("div", Ca, [
        createBaseVNode("span", ka, toDisplayString(I.value), 1),
        b.value.volume !== void 0 ? (openBlock(), createElementBlock("span", Ua, " 🔊 " + toDisplayString(Math.round(b.value.volume * 100)) + "% ", 1)) : createCommentVNode("", true)
      ])
    ], 512));
  }
}), Ia = /* @__PURE__ */ At(Ea, [["__scopeId", "data-v-61d57c9d"]]), Aa = { class: "subtitle-clip__text" }, za = /* @__PURE__ */ defineComponent({
  __name: "SubtitleClip",
  props: {
    clip: {}
  },
  setup(c) {
    const s = c, l = computed(() => s.clip), o = (h, p) => {
      var S;
      const r = l.value[h];
      return r !== void 0 ? r : ((S = l.value.config) == null ? void 0 : S[h]) ?? p;
    }, u = computed(() => ({
      background: o("backgroundColor", void 0),
      textAlign: o("textAlign", "left")
    }));
    return (h, p) => (openBlock(), createElementBlock("div", {
      class: "subtitle-clip",
      style: normalizeStyle(u.value)
    }, [
      createBaseVNode("div", Aa, toDisplayString(l.value.text), 1)
    ], 4));
  }
}), Fa = /* @__PURE__ */ At(za, [["__scopeId", "data-v-863126a4"]]), Ba = { class: "text-clip__content" }, Pa = /* @__PURE__ */ defineComponent({
  __name: "TextClip",
  props: {
    clip: {}
  },
  setup(c) {
    const s = c, l = (p, r) => {
      var x;
      const S = s.clip[p];
      return S !== void 0 ? S : ((x = s.clip.config) == null ? void 0 : x[p]) ?? r;
    }, o = computed(() => s.clip.text || l("text", "自定义文本")), u = computed(() => ({
      background: l("backgroundColor", void 0),
      textAlign: l("textAlign", "center")
    })), h = computed(() => ({
      fontFamily: l("fontFamily", void 0),
      fontSize: l("fontSize", void 0) ? `${l("fontSize", 10)}px` : void 0,
      color: l("color", "#ffffff"),
      fontWeight: l("fontWeight", 600)
    }));
    return (p, r) => (openBlock(), createElementBlock("div", {
      class: "text-clip",
      style: normalizeStyle(u.value)
    }, [
      createBaseVNode("div", Ba, [
        createBaseVNode("span", {
          class: "text-clip__text",
          style: normalizeStyle(h.value)
        }, toDisplayString(o.value), 5)
      ])
    ], 4));
  }
}), Da = /* @__PURE__ */ At(Pa, [["__scopeId", "data-v-2824ba6a"]]), La = { class: "sticker-clip" }, Ma = {
  key: 1,
  class: "sticker-clip__placeholder"
}, Ra = { class: "sticker-clip__info" }, Oa = /* @__PURE__ */ defineComponent({
  __name: "StickerClip",
  props: {
    clip: {}
  },
  setup(c) {
    const s = c, l = computed(() => s.clip);
    return (o, u) => (openBlock(), createElementBlock("div", La, [
      l.value.sourceUrl ? (openBlock(), createElementBlock("div", {
        key: 0,
        class: "sticker-clip__image",
        style: normalizeStyle({ backgroundImage: `url(${l.value.sourceUrl})` })
      }, null, 4)) : (openBlock(), createElementBlock("div", Ma, " ✨ ")),
      createBaseVNode("div", Ra, toDisplayString(l.value.name || "Sticker"), 1)
    ]));
  }
}), Na = /* @__PURE__ */ At(Oa, [["__scopeId", "data-v-562f6596"]]), Ga = { class: "filter-clip" }, Ha = { class: "filter-clip__info" }, Ya = { class: "filter-clip__name" }, $a = { class: "filter-clip__type" }, Va = /* @__PURE__ */ defineComponent({
  __name: "FilterClip",
  props: {
    clip: {}
  },
  setup(c) {
    const s = c, l = computed(() => s.clip);
    return (o, u) => (openBlock(), createElementBlock("div", Ga, [
      u[0] || (u[0] = createBaseVNode("div", { class: "filter-clip__icon" }, " 🎨 ", -1)),
      createBaseVNode("div", Ha, [
        createBaseVNode("div", Ya, toDisplayString(l.value.name || "Filter"), 1),
        createBaseVNode("div", $a, toDisplayString(l.value.filterType), 1)
      ])
    ]));
  }
}), Wa = /* @__PURE__ */ At(Va, [["__scopeId", "data-v-0fe335d3"]]), ja = { class: "effect-clip" }, Xa = { class: "effect-clip__info" }, Za = { class: "effect-clip__name" }, Ka = { class: "effect-clip__type" }, Ja = /* @__PURE__ */ defineComponent({
  __name: "EffectClip",
  props: {
    clip: {}
  },
  setup(c) {
    const s = c, l = computed(() => s.clip);
    return (o, u) => (openBlock(), createElementBlock("div", ja, [
      u[0] || (u[0] = createBaseVNode("div", { class: "effect-clip__icon" }, " ⭐ ", -1)),
      createBaseVNode("div", Xa, [
        createBaseVNode("div", Za, toDisplayString(l.value.name || "Effect"), 1),
        createBaseVNode("div", Ka, toDisplayString(l.value.effectType), 1)
      ])
    ]));
  }
}), qa = /* @__PURE__ */ At(Ja, [["__scopeId", "data-v-41c88d2b"]]), Qa = { class: "transition-clip" }, to = { class: "transition-clip__info" }, eo = { class: "transition-clip__name" }, io = { class: "transition-clip__duration" }, no = /* @__PURE__ */ defineComponent({
  __name: "TransitionClip",
  props: {
    clip: {}
  },
  setup(c) {
    const s = c, l = computed(() => s.clip);
    return (o, u) => (openBlock(), createElementBlock("div", Qa, [
      u[0] || (u[0] = createBaseVNode("div", { class: "transition-clip__icon" }, " 🔀 ", -1)),
      createBaseVNode("div", to, [
        createBaseVNode("div", eo, toDisplayString(l.value.name || "Transition"), 1),
        createBaseVNode("div", io, toDisplayString(l.value.transitionDuration) + "s", 1)
      ])
    ]));
  }
}), ro = /* @__PURE__ */ At(no, [["__scopeId", "data-v-14c86e24"]]), so = { class: "clip__content" }, Un = 3, ao = /* @__PURE__ */ defineComponent({
  __name: "ClipItem",
  props: {
    clip: {},
    track: {}
  },
  emits: ["dragStart", "resizeStart", "contextMenu", "click", "dblclick", "addTransition"],
  setup(c, { emit: s }) {
    const l = c, o = s, u = Ht(), h = Yt(), p = ei(), r = inject("config", {}), S = ref(), x = ref(false), b = ref(false), I = ref({ x: 0, y: 0 });
    let y = false, A = null;
    const t = computed(() => u.selectedClipIds.has(l.clip.id)), e = computed(() => p.draggedClipIds.has(l.clip.id));
    watch(() => p.isDragging, (rt) => {
      rt || (f.value = null);
    });
    const n = computed(() => h.actualPixelsPerSecond), a = computed(() => (r.clipConfigs || {})[l.clip.type] || {}), d = computed(() => ({
      "clip--selected": t.value,
      "clip--locked": l.track.locked,
      "clip--dragging": e.value && p.isDragging,
      "clip--resizing": x.value,
      "clip--show-transition-btn": b.value
    })), f = ref(null), _ = computed(() => {
      var z, O, ft, D;
      const R = (l.clip.endTime - l.clip.startTime) * n.value, P = l.clip.startTime * n.value, k = a.value;
      let L = 32, j = 8;
      l.track.isMain ? (L = 64, j = 8) : l.clip.type === "video" || l.track.type === "video" ? (L = 48, j = 8) : (L = 32, j = 8), k.height && (L = k.height), k.top && (j = k.top);
      const C = {
        left: `${P}px`,
        width: `${R}px`,
        height: `${L}px`,
        top: `${j}px`,
        "--clip-bg-color": k.backgroundColor,
        "--clip-border-color": k.borderColor,
        "--clip-selected-bg-color": (z = k.selected) == null ? void 0 : z.backgroundColor,
        "--clip-selected-border-color": (O = k.selected) == null ? void 0 : O.borderColor,
        "--clip-hover-border-color": (ft = k.hover) == null ? void 0 : ft.borderColor,
        "--clip-border-width": k.borderWidth ? `${k.borderWidth}px` : "1px",
        "--clip-border-radius": typeof k.borderRadius == "number" ? `${k.borderRadius}px` : k.borderRadius || "var(--radius-sm)",
        "--clip-opacity": k.opacity,
        "--clip-selected-box-shadow": (D = k.selected) == null ? void 0 : D.boxShadow
      };
      if (e.value && p.isDragging && f.value) {
        const M = p.dragOffset, G = f.value;
        C.position = "fixed", C.left = `${G.left + M.x}px`, C.top = `${G.top + M.y}px`, C.width = `${G.width}px`, C.height = `${G.height}px`, C.zIndex = 1e3, C.pointerEvents = "none", C.transform = "none";
      }
      return C;
    }), v = computed(() => {
      const rt = a.value;
      return rt.component ? rt.component : {
        video: kn,
        audio: Ia,
        subtitle: Fa,
        text: Da,
        sticker: Na,
        filter: Wa,
        effect: qa,
        transition: ro
      }[l.clip.type] || kn;
    }), m = computed(() => l.clip.type === "transition" ? null : l.track.clips.filter((R) => R.type !== "transition").find(
      (R) => R.id !== l.clip.id && Math.abs(R.startTime - l.clip.endTime) < 0.01
      // 允许0.01秒的误差
    ) || null), T = computed(() => m.value ? l.track.clips.some(
      (rt) => rt.type === "transition" && rt.startTime < l.clip.endTime && rt.endTime > l.clip.endTime
    ) : false), U = computed(() => l.clip.type === "transition" ? true : a.value.resizable !== false);
    function $(rt) {
      var z;
      if (l.track.locked || (o("click", l.clip, rt), rt.button !== 0)) return;
      if (l.clip.type === "transition") {
        u.selectClip(l.clip.id);
        return;
      }
      y = true, A = rt;
      const R = rt.clientX, P = rt.clientY, k = ((z = S.value) == null ? void 0 : z.ownerDocument) || document, L = (O) => {
        if (!y) return;
        const ft = Math.abs(O.clientX - R), D = Math.abs(O.clientY - P);
        (ft > Un || D > Un) && (y = false, A && (S.value && (f.value = S.value.getBoundingClientRect()), o("dragStart", l.clip, A)), C());
      }, j = () => {
        y = false, A = null, C();
      }, C = () => {
        k.removeEventListener("mousemove", L), k.removeEventListener("mouseup", j);
      };
      k.addEventListener("mousemove", L), k.addEventListener("mouseup", j);
    }
    function V(rt, R) {
      var L;
      if (l.track.locked) return;
      u.selectClip(l.clip.id), x.value = true, o("resizeStart", l.clip, rt, R);
      const P = ((L = S.value) == null ? void 0 : L.ownerDocument) || document, k = () => {
        x.value = false, P.removeEventListener("mouseup", k);
      };
      P.addEventListener("mouseup", k);
    }
    function F(rt) {
      o("contextMenu", l.clip, rt);
    }
    function Y(rt) {
      if (!S.value) return;
      const R = S.value.getBoundingClientRect(), P = rt.clientX - R.left, k = h.actualPixelsPerSecond, L = P / k, j = l.clip.startTime + L, C = Math.max(l.clip.startTime, Math.min(j, l.clip.endTime));
      o("dblclick", l.clip, C);
    }
    function W(rt) {
      if (!m.value || T.value || l.track.locked) {
        b.value = false;
        return;
      }
      const P = rt.currentTarget.getBoundingClientRect(), k = rt.clientX - P.left, L = P.width;
      if (k >= L - 2 && k <= L) {
        b.value = true;
        const C = ((l.clip.endTime + m.value.startTime) / 2 - l.clip.startTime) * n.value;
        I.value = {
          x: C,
          // 两个clip的中间位置
          y: P.height / 2
        };
      } else
        b.value = false;
    }
    function ut() {
      b.value = false;
    }
    function _t(rt) {
      rt.stopPropagation(), m.value && o("addTransition", l.clip.id, m.value.id), b.value = false;
    }
    return (rt, R) => (openBlock(), createElementBlock("div", {
      class: normalizeClass(["clip", d.value]),
      ref_key: "clipRef",
      ref: S,
      style: normalizeStyle(_.value),
      onMousedown: $,
      onDblclick: Y,
      onMousemove: W,
      onMouseleave: ut,
      onContextmenu: withModifiers(F, ["prevent"])
    }, [
      !c.track.locked && U.value ? (openBlock(), createElementBlock("div", {
        key: 0,
        class: "clip__handle clip__handle--left",
        onMousedown: R[0] || (R[0] = withModifiers((P) => V("left", P), ["stop"]))
      }, null, 32)) : createCommentVNode("", true),
      createBaseVNode("div", so, [
        (openBlock(), createBlock(resolveDynamicComponent(v.value), {
          clip: c.clip
        }, null, 8, ["clip"]))
      ]),
      !c.track.locked && U.value ? (openBlock(), createElementBlock("div", {
        key: 1,
        class: "clip__handle clip__handle--right",
        onMousedown: R[1] || (R[1] = withModifiers((P) => V("right", P), ["stop"]))
      }, null, 32)) : createCommentVNode("", true),
      b.value && m.value && !T.value && c.clip.type === "video" ? (openBlock(), createElementBlock("div", {
        key: 2,
        class: "clip__transition-btn",
        style: normalizeStyle({
          left: I.value.x + "px",
          top: I.value.y + "px"
        }),
        onMousedown: R[2] || (R[2] = withModifiers(() => {
        }, ["stop"])),
        onClick: _t,
        title: "点击添加转场"
      }, [...R[3] || (R[3] = [
        createBaseVNode("span", { class: "clip__transition-icon" }, "🔀", -1)
      ])], 36)) : createCommentVNode("", true)
    ], 38));
  }
}), oo = /* @__PURE__ */ At(ao, [["__scopeId", "data-v-4b3e240e"]]), lo = { class: "drag-preview__inner" }, co = {
  key: 0,
  class: "drag-preview__label"
}, uo = /* @__PURE__ */ defineComponent({
  __name: "DragPreview",
  props: {
    track: {}
  },
  setup(c) {
    const s = c, l = ei(), o = Yt(), u = computed(() => {
      const h = l.previewPosition;
      if (!h.visible) return {};
      const p = h.startTime * o.actualPixelsPerSecond, r = (h.endTime - h.startTime) * o.actualPixelsPerSecond;
      let S = 32;
      s.track.isMain ? S = 64 : (h.clipType === "video" || s.track.type === "video") && (S = 48);
      const b = {
        left: `${p}px`,
        width: `${r}px`,
        height: `${S}px`,
        top: "8px"
      };
      return h.needNewTrack && (b.top = `-${S + 8}px`), b;
    });
    return (h, p) => (openBlock(), createElementBlock("div", {
      class: normalizeClass(["drag-preview", {
        "drag-preview--new-track": unref(l).previewPosition.needNewTrack
      }]),
      style: normalizeStyle(u.value)
    }, [
      createBaseVNode("div", lo, [
        unref(l).previewPosition.needNewTrack ? (openBlock(), createElementBlock("span", co, " 新建轨道 ")) : createCommentVNode("", true)
      ])
    ], 6));
  }
}), ho = /* @__PURE__ */ At(uo, [["__scopeId", "data-v-5766b4e2"]]), fo = ["data-track-id"], po = /* @__PURE__ */ defineComponent({
  __name: "TrackArea",
  props: {
    track: {},
    scrollLeft: { default: 0 }
  },
  emits: ["scroll", "contextMenu", "trackContextMenu", "addTransition", "dropMedia", "seek"],
  setup(c, { emit: s }) {
    const l = c, o = s, u = Yt(), h = Ht(), p = ei(), r = Ne(), { startResize: S } = ls(), x = ref(), b = ref(false), I = ref(null), y = computed(() => u.actualPixelsPerSecond), A = computed(() => !p.isDragging || !p.previewPosition.visible ? false : p.previewPosition.trackId === l.track.id), t = computed(() => {
      const Y = Math.max(
        h.totalDuration,
        p.previewEndTime,
        // 拖拽预览的结束时间
        60
        // 最少显示 60 秒
      );
      return Math.ceil(Y * y.value);
    }), e = computed(() => l.track.isMain ? 80 : l.track.clips.some((W) => W.type === "video") || l.track.type === "video" ? 64 : 48);
    function n() {
      x.value && o("scroll", x.value.scrollLeft);
    }
    watch(() => l.scrollLeft, (Y) => {
      x.value && x.value.scrollLeft !== Y && (x.value.scrollLeft = Y);
    });
    function a(Y, W) {
      var _t;
      const ut = ((_t = x.value) == null ? void 0 : _t.ownerDocument) || document;
      p.startDrag(Y, W, ut);
    }
    function d(Y, W, ut) {
      S(Y, W, ut);
    }
    function f(Y) {
      if (!(Y.button !== 0 || Y.target.closest(".clip")) && (h.clearSelection(), x.value)) {
        const ut = x.value.getBoundingClientRect(), _t = Y.clientX - ut.left + x.value.scrollLeft, rt = ct(_t / y.value);
        r.seekTo(rt), o("seek", rt);
      }
    }
    function _(Y, W) {
      h.selectClip(Y.id);
    }
    function v(Y, W) {
      r.seekTo(W), o("seek", W);
    }
    function m(Y, W) {
      o("contextMenu", Y, W);
    }
    function T(Y) {
      if (Y.target.closest(".clip") || !x.value) return;
      const ut = x.value.getBoundingClientRect(), rt = (Y.clientX - ut.left + x.value.scrollLeft) / y.value;
      o("trackContextMenu", l.track, rt, Y);
    }
    function U(Y, W) {
      o("addTransition", Y, W);
    }
    function $(Y) {
      if (!x.value) return;
      b.value = true;
      const W = x.value.getBoundingClientRect(), ut = Y.clientX - W.left + x.value.scrollLeft;
      I.value = ut;
    }
    function V(Y) {
      Y.target === x.value && (b.value = false, I.value = null);
    }
    function F(Y) {
      if (b.value = false, I.value = null, !(!x.value || !Y.dataTransfer))
        try {
          const W = Y.dataTransfer.getData("application/json");
          if (!W) return;
          const ut = JSON.parse(W), _t = x.value.getBoundingClientRect(), rt = Y.clientX - _t.left + x.value.scrollLeft, R = ct(rt / y.value);
          o("dropMedia", ut, l.track.id, R);
        } catch (W) {
          console.error("处理拖放失败:", W);
        }
    }
    return (Y, W) => (openBlock(), createElementBlock("div", {
      class: "track-area",
      ref_key: "trackAreaRef",
      ref: x,
      onScroll: n,
      onMousedown: f,
      onContextmenu: withModifiers(T, ["prevent"]),
      onDragover: withModifiers($, ["prevent"]),
      onDrop: withModifiers(F, ["prevent"]),
      onDragleave: V
    }, [
      createBaseVNode("div", {
        class: normalizeClass(["track-area__content", { "track-area__content--drag-over": b.value }]),
        style: normalizeStyle({ width: t.value + "px", minHeight: e.value + "px" }),
        "data-track-id": c.track.id
      }, [
        (openBlock(true), createElementBlock(Fragment, null, renderList(c.track.clips, (ut) => (openBlock(), createBlock(oo, {
          key: ut.id,
          clip: ut,
          track: c.track,
          "data-clip-id": ut.id,
          onDragStart: a,
          onResizeStart: d,
          onClick: _,
          onDblclick: v,
          onContextMenu: m,
          onAddTransition: U
        }, null, 8, ["clip", "track", "data-clip-id"]))), 128)),
        A.value ? (openBlock(), createBlock(ho, {
          key: 0,
          track: c.track
        }, null, 8, ["track"])) : createCommentVNode("", true)
      ], 14, fo)
    ], 544));
  }
}), _o = /* @__PURE__ */ At(po, [["__scopeId", "data-v-9f39c911"]]), mo = {
  key: 0,
  class: "tracks__empty"
}, vo = { class: "tracks__empty-content" }, go = { class: "tracks__empty-text" }, yo = ["data-track-id"], bo = { class: "tracks__track-area-cell" }, So = /* @__PURE__ */ defineComponent({
  __name: "index",
  props: {
    scrollLeft: { default: 0 },
    locale: { default: () => ({}) }
  },
  emits: ["scroll", "contextMenu", "trackContextMenu", "trackDelete", "addTransition", "dropMedia", "update:trackControlWidth", "seek"],
  setup(c, { emit: s }) {
    const l = c, o = s, u = Ht(), h = ti(), p = Yt(), r = ei();
    Ne();
    const S = inject("config", {}), x = ref(), b = ref(), I = ref(), y = ref(), A = ref(l.scrollLeft), t = ref(false), e = ref(null), n = computed(() => u.sortedTracks), a = computed(() => p.actualPixelsPerSecond), d = computed(() => {
      const k = Math.max(
        u.totalDuration,
        r.previewEndTime,
        // 拖拽预览的结束时间
        60
        // 最少显示 60 秒
      );
      return Math.ceil(k * a.value);
    }), f = ref(200);
    watch(() => l.scrollLeft, (k) => {
      !t.value && k !== A.value && (A.value = k, y.value && (y.value.scrollLeft = k));
    }), watch(n, (k, L) => {
      const j = !L || L.length === 0, C = k && k.length > 0;
      j && C && nextTick(() => {
        I.value && !v && (v = new ResizeObserver(() => {
          T();
        }), v.observe(I.value)), T();
      });
    }, { immediate: true });
    function _(k, L) {
      L === 0 && (e.value = k);
    }
    let v = null;
    function m(k) {
      t.value || (t.value = true, A.value = k, o("scroll", k), requestAnimationFrame(() => {
        t.value = false;
      }));
    }
    onMounted(() => {
      I.value && (v = new ResizeObserver(() => {
        T();
      }), v.observe(I.value)), nextTick(() => {
        r.setScrollContainers(
          x.value || null,
          y.value || null,
          m
        );
      }), nextTick(() => {
        U();
      });
    }), onUnmounted(() => {
      v && v.disconnect();
    });
    function T() {
      if (e.value) {
        const k = e.value.getBoundingClientRect().width;
        f.value = k, o("update:trackControlWidth", k);
      }
    }
    function U() {
      const k = u.mainTrack;
      if (!k || !I.value) return;
      const L = I.value.querySelector(`[data-track-id="${k.id}"]`);
      L && L.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    watch(() => u.mainTrack, (k) => {
      k && nextTick(() => {
        U();
      });
    });
    function $() {
    }
    function V() {
      y.value && !t.value && (t.value = true, A.value = y.value.scrollLeft, o("scroll", A.value), requestAnimationFrame(() => {
        t.value = false;
      }));
    }
    function F(k) {
      t.value || (t.value = true, A.value = k, y.value && y.value.scrollLeft !== k && (y.value.scrollLeft = k), o("scroll", k), requestAnimationFrame(() => {
        t.value = false;
      }));
    }
    function Y(k, L) {
      u.updateTrack(k, L), h.pushSnapshot("更新轨道");
    }
    function W(k) {
      const L = u.tracks.find((j) => j.id === k);
      if (L != null && L.isMain) {
        alert("主轨道不能删除");
        return;
      }
      u.removeTrack(k), h.pushSnapshot("删除轨道"), o("trackDelete", k);
    }
    function ut(k, L) {
      o("contextMenu", k, L);
    }
    function _t(k, L, j) {
      o("trackContextMenu", k, L, j);
    }
    function rt(k, L) {
      o("addTransition", k, L);
    }
    function R(k, L, j) {
      o("dropMedia", k, L, j);
    }
    function P(k) {
      o("seek", k);
    }
    return provide("config", S), (k, L) => {
      var j;
      return openBlock(), createElementBlock("div", {
        class: "tracks",
        ref_key: "tracksRef",
        ref: x
      }, [
        n.value.length === 0 ? (openBlock(), createElementBlock("div", mo, [
          createBaseVNode("div", vo, [
            L[0] || (L[0] = createBaseVNode("span", { class: "tracks__empty-icon" }, "🎬", -1)),
            createBaseVNode("span", go, toDisplayString(((j = c.locale) == null ? void 0 : j.emptyTip) || "拖拽媒体文件到此处添加"), 1)
          ])
        ])) : (openBlock(), createElementBlock("div", {
          key: 1,
          class: "tracks__scroll-container",
          ref_key: "scrollContainerRef",
          ref: b,
          onScroll: $
        }, [
          createBaseVNode("div", {
            class: "tracks__table",
            ref_key: "tableRef",
            ref: I
          }, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(n.value, (C, z) => (openBlock(), createElementBlock("div", {
              key: C.id,
              class: normalizeClass(["tracks__track", {
                "tracks__track--locked": C.locked,
                "tracks__track--hidden": !C.visible
              }]),
              "data-track-id": C.id
            }, [
              createBaseVNode("div", {
                class: "tracks__track-control-cell",
                ref_for: true,
                ref: (O) => _(O, z)
              }, [
                createVNode(os, {
                  track: C,
                  locale: c.locale,
                  onUpdate: Y,
                  onDelete: W
                }, null, 8, ["track", "locale"])
              ], 512),
              createBaseVNode("div", bo, [
                createVNode(_o, {
                  track: C,
                  "scroll-left": A.value,
                  onScroll: F,
                  onContextMenu: ut,
                  onTrackContextMenu: _t,
                  onAddTransition: rt,
                  onDropMedia: R,
                  onSeek: P
                }, null, 8, ["track", "scroll-left"])
              ])
            ], 10, yo))), 128))
          ], 512)
        ], 544)),
        createBaseVNode("div", {
          class: "tracks__scrollbar",
          onScroll: V,
          ref_key: "scrollbarRef",
          ref: y
        }, [
          createBaseVNode("div", {
            class: "tracks__scrollbar-content",
            style: normalizeStyle({ width: d.value + "px" })
          }, null, 4)
        ], 544)
      ], 512);
    };
  }
}), xo = /* @__PURE__ */ At(So, [["__scopeId", "data-v-88da3b13"]]), wo = ["onClick"], To = {
  key: 0,
  class: "context-menu__divider"
}, Co = {
  key: 0,
  class: "context-menu__icon"
}, ko = { class: "context-menu__label" }, Uo = {
  key: 1,
  class: "context-menu__shortcut"
}, Eo = /* @__PURE__ */ defineComponent({
  __name: "index",
  props: {
    items: { default: () => [] }
  },
  emits: ["select", "close"],
  setup(c, { expose: s, emit: l }) {
    const o = c, u = l, h = ref(false), p = ref({ x: 0, y: 0 }), r = computed(() => o.items), S = computed(() => ({
      left: `${p.value.x}px`,
      top: `${p.value.y}px`
    }));
    function x(t, e) {
      p.value = { x: t, y: e }, h.value = true, setTimeout(() => {
        I();
      }, 0);
    }
    function b() {
      h.value = false, u("close");
    }
    function I() {
      const t = document.querySelector(".context-menu");
      if (!t) return;
      const e = t.getBoundingClientRect(), n = window.innerWidth, a = window.innerHeight;
      let { x: d, y: f } = p.value;
      e.right > n && (d = n - e.width - 10), e.bottom > a && (f = a - e.height - 10), d < 0 && (d = 10), f < 0 && (f = 10), p.value = { x: d, y: f };
    }
    function y(t) {
      t.disabled || t.divider || (u("select", t.key), b());
    }
    function A(t) {
      const e = t.target;
      h.value && !e.closest(".context-menu") && t.button === 0 && b();
    }
    return onMounted(() => {
      document.addEventListener("click", A), document.addEventListener("contextmenu", A);
    }), onUnmounted(() => {
      document.removeEventListener("click", A), document.removeEventListener("contextmenu", A);
    }), s({
      show: x,
      hide: b
    }), (t, e) => (openBlock(), createBlock(Teleport, { to: "body" }, [
      h.value ? (openBlock(), createElementBlock("div", {
        key: 0,
        class: "context-menu",
        style: normalizeStyle(S.value),
        onContextmenu: e[0] || (e[0] = withModifiers(() => {
        }, ["prevent"]))
      }, [
        (openBlock(true), createElementBlock(Fragment, null, renderList(r.value, (n) => (openBlock(), createElementBlock("div", {
          key: n.key,
          class: normalizeClass(["context-menu__item", {
            "context-menu__item--disabled": n.disabled,
            "context-menu__item--divider": n.divider,
            "context-menu__item--danger": n.danger
          }]),
          onClick: (a) => y(n)
        }, [
          n.divider ? (openBlock(), createElementBlock("div", To)) : n.slot ? renderSlot(t.$slots, n.slot, {
            key: 1,
            item: n
          }) : (openBlock(), createElementBlock(Fragment, { key: 2 }, [
            n.icon ? (openBlock(), createElementBlock("span", Co, toDisplayString(n.icon), 1)) : createCommentVNode("", true),
            createBaseVNode("span", ko, toDisplayString(n.label), 1),
            n.shortcut ? (openBlock(), createElementBlock("span", Uo, toDisplayString(n.shortcut), 1)) : createCommentVNode("", true)
          ], 64))
        ], 10, wo))), 128))
      ], 36)) : createCommentVNode("", true)
    ]));
  }
}), En = {
  "zh-CN": {
    reset: "重置",
    undo: "撤销",
    redo: "重做",
    delete: "删除",
    play: "播放",
    pause: "暂停",
    snapOn: "关闭吸附",
    snapOff: "开启吸附",
    // 右键菜单 - Clip
    copy: "复制",
    cut: "剪切",
    paste: "粘贴",
    selectAll: "全选",
    splitClip: "分割",
    deleteClip: "删除片段",
    // 右键菜单 - 轨道
    deleteTrack: "删除轨道",
    lockTrack: "锁定轨道",
    unlockTrack: "解锁轨道",
    muteTrack: "静音轨道",
    unmuteTrack: "取消静音",
    // 轨道控制
    mainTrack: "主轨道",
    videoTrack: "视频轨道",
    audioTrack: "音频轨道",
    subtitleTrack: "字幕轨道",
    textTrack: "文本轨道",
    stickerTrack: "贴纸轨道",
    filterTrack: "滤镜轨道",
    effectTrack: "特效轨道",
    mainBadge: "主",
    show: "显示",
    hide: "隐藏",
    lock: "锁定",
    unlock: "解锁",
    // 提示
    emptyTip: "拖拽媒体文件到此处添加",
    emptyTrackHint: "拖拽媒体到这里",
    noClipSelected: "未选中片段",
    confirmDelete: "确定要删除吗？",
    confirmDeleteTrack: '确定要删除轨道"{name}"吗？'
  },
  "en-US": {
    reset: "Reset",
    undo: "Undo",
    redo: "Redo",
    delete: "Delete",
    play: "Play",
    pause: "Pause",
    snapOn: "Disable Snap",
    snapOff: "Enable Snap",
    // 右键菜单 - Clip
    copy: "Copy",
    cut: "Cut",
    paste: "Paste",
    selectAll: "Select All",
    splitClip: "Split",
    deleteClip: "Delete Clip",
    // 右键菜单 - 轨道
    deleteTrack: "Delete Track",
    lockTrack: "Lock Track",
    unlockTrack: "Unlock Track",
    muteTrack: "Mute Track",
    unmuteTrack: "Unmute Track",
    // 轨道控制
    mainTrack: "Main Track",
    videoTrack: "Video Track",
    audioTrack: "Audio Track",
    subtitleTrack: "Subtitle Track",
    textTrack: "Text Track",
    stickerTrack: "Sticker Track",
    filterTrack: "Filter Track",
    effectTrack: "Effect Track",
    mainBadge: "Main",
    show: "Show",
    hide: "Hide",
    lock: "Lock",
    unlock: "Unlock",
    // 提示
    emptyTip: "Drag and drop media files here to add",
    emptyTrackHint: "Drop media here",
    noClipSelected: "No clip selected",
    confirmDelete: "Are you sure to delete?",
    confirmDeleteTrack: 'Are you sure to delete track "{name}"?'
  }
}, Io = { class: "video-track__body" }, Ao = { class: "video-track__empty-hint" }, Wi = "1.0.0", zo = /* @__PURE__ */ defineComponent({
  __name: "index",
  props: {
    operationButtons: { default: () => ["reset", "undo", "redo", "delete"] },
    scaleConfigButtons: { default: () => ["snap"] },
    trackTypes: { default: () => ({
      video: { max: 5 },
      audio: { max: 3 },
      subtitle: { max: 2 }
    }) },
    clipConfigs: { default: void 0 },
    showToolsBar: { type: Boolean, default: true },
    enableMainTrackMode: { type: Boolean, default: false },
    enableCrossTrackDrag: { type: Boolean, default: true },
    maxDuration: {},
    fps: { default: 30 },
    pixelsPerSecond: { default: 100 },
    minScale: { default: 0.1 },
    maxScale: { default: 10 },
    defaultScale: { default: 1 },
    enableSnap: { type: Boolean, default: true },
    snapThreshold: { default: 10 },
    playbackRates: { default: () => [0.5, 1, 2, 4] },
    trackControlWidth: { default: 160 },
    trackContextMenu: { default: () => ({ enabled: true }) },
    clipContextMenu: { default: () => ({
      showCommonItems: true,
      commonItems: ["copy", "cut", "delete"]
    }) },
    locale: { default: "zh-CN" },
    theme: { default: void 0 }
  },
  emits: ["clipMove", "clipDelete", "clipSelect", "clipCopy", "clipCut", "clipPaste", "clipSplit", "clip:added", "clip:updated", "clip:removed", "clip:resize-start", "clip:resize-end", "clip:drag-start", "clip:drag-end", "trackCreate", "trackDelete", "track:added", "track:removed", "track:updated", "selection:changed", "playback:play", "playback:pause", "playback:seek", "playback:timeupdate", "playback:ratechange", "scale:changed", "history:changed", "addTransition", "transitionAdded", "dropMedia", "trackContextMenuSelect", "clipContextMenuSelect", "data:changed"],
  setup(c, { expose: s, emit: l }) {
    const o = {
      video: {
        name: "视频",
        backgroundColor: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
        borderColor: "rgba(255,255,255,0.2)",
        height: 32,
        top: 8,
        resizable: true,
        draggable: true,
        borderRadius: 6,
        selected: {
          borderColor: "#fff",
          boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.5), 0 4px 12px rgba(0,0,0,0.3)"
        },
        hover: {
          borderColor: "rgba(255,255,255,0.5)"
        }
      },
      audio: {
        name: "音频",
        backgroundColor: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
        borderColor: "rgba(255,255,255,0.2)",
        height: 24,
        top: 12,
        resizable: true,
        draggable: true,
        borderRadius: 4,
        selected: {
          borderColor: "#fff",
          boxShadow: "0 0 0 2px rgba(16, 185, 129, 0.5), 0 4px 12px rgba(0,0,0,0.3)"
        },
        hover: {
          borderColor: "rgba(255,255,255,0.5)"
        }
      },
      subtitle: {
        name: "字幕",
        backgroundColor: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        borderColor: "rgba(255,255,255,0.2)",
        height: 24,
        top: 12,
        resizable: true,
        draggable: true,
        borderRadius: 4,
        selected: {
          borderColor: "#fff",
          boxShadow: "0 0 0 2px rgba(245, 158, 11, 0.5), 0 4px 12px rgba(0,0,0,0.3)"
        },
        hover: {
          borderColor: "rgba(255,255,255,0.5)"
        }
      },
      sticker: {
        name: "贴纸",
        backgroundColor: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
        borderColor: "rgba(255,255,255,0.2)",
        height: 24,
        top: 12,
        resizable: false,
        draggable: true,
        borderRadius: 4,
        selected: {
          borderColor: "#fff",
          boxShadow: "0 0 0 2px rgba(139, 92, 246, 0.5), 0 4px 12px rgba(0,0,0,0.3)"
        },
        hover: {
          borderColor: "rgba(255,255,255,0.5)"
        }
      },
      filter: {
        name: "滤镜",
        backgroundColor: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
        borderColor: "rgba(255,255,255,0.2)",
        height: 16,
        top: 16,
        resizable: false,
        draggable: true,
        borderRadius: 4,
        selected: {
          borderColor: "#fff",
          boxShadow: "0 0 0 2px rgba(236, 72, 153, 0.5), 0 4px 12px rgba(0,0,0,0.3)"
        },
        hover: {
          borderColor: "rgba(255,255,255,0.5)"
        }
      },
      effect: {
        name: "特效",
        backgroundColor: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
        borderColor: "rgba(255,255,255,0.2)",
        height: 16,
        top: 16,
        resizable: false,
        draggable: true,
        borderRadius: 4,
        selected: {
          borderColor: "#fff",
          boxShadow: "0 0 0 2px rgba(99, 102, 241, 0.5), 0 4px 12px rgba(0,0,0,0.3)"
        },
        hover: {
          borderColor: "rgba(255,255,255,0.5)"
        }
      },
      transition: {
        name: "转场",
        backgroundColor: "transparent",
        borderColor: "transparent",
        height: 32,
        top: 8,
        resizable: false,
        draggable: false
      }
    };
    function u(g, B) {
      if (B === null || typeof B != "object" || g === null || typeof g != "object")
        return B;
      const q = { ...g };
      for (const ht in B)
        if (B.hasOwnProperty(ht)) {
          const gt = B[ht], te = q[ht];
          gt && typeof gt == "object" && !Array.isArray(gt) ? q[ht] = u(te || {}, gt) : q[ht] = gt;
        }
      return q;
    }
    function h(g) {
      if (!g) return o;
      const B = { ...o };
      for (const q in g)
        g.hasOwnProperty(q) && (B[q] = u(B[q] || {}, g[q]));
      return B;
    }
    const p = c, r = computed(() => {
      const g = En["zh-CN"];
      return typeof p.locale == "string" ? { ...g, ...En[p.locale] || {} } : p.locale ? { ...g, ...p.locale } : g;
    }), S = computed(() => h(p.clipConfigs)), x = l, b = Ht(), I = Ne(), y = ti(), A = Yt(), t = ei();
    watch(() => p.enableCrossTrackDrag, (g) => {
      t.setConfig({ enableCrossTrackDrag: g });
    }, { immediate: true });
    const e = ref();
    let n = [];
    watch(
      () => Array.from(b.selectedClipIds),
      (g) => {
        const B = new Set(g), q = new Set(n);
        (B.size !== q.size || g.some((gt) => !q.has(gt))) && (x("selection:changed", g, n), x("clipSelect", g), n = [...g]);
      },
      { deep: true }
    ), yr({ containerRef: e, callbacks: {
      onCopy: (g) => {
        x("clipCopy", g);
      },
      onCut: (g) => {
        x("clipCut", g);
      },
      onDelete: (g) => {
        g.forEach((B) => x("clipDelete", B));
      },
      onPaste: (g, B, q) => {
        x("clipPaste", g, B, q);
      },
      onPlay: () => {
        x("playback:play");
      },
      onPause: () => {
        x("playback:pause");
      }
    } });
    let d = /* @__PURE__ */ new Map();
    watch(() => t.isDragging, (g, B) => {
      g && !B ? (d.clear(), t.draggedClips.forEach((q) => {
        d.set(q.id, {
          startTime: q.startTime,
          trackId: q.trackId
        });
      })) : !g && B && (d.forEach((q, ht) => {
        const gt = b.getClip(ht);
        gt && (gt.startTime !== q.startTime || gt.trackId !== q.trackId) && (x("clipMove", ht, gt.trackId, gt.startTime), x("clip:drag-end", gt, q.trackId, gt.trackId));
      }), d.clear());
    });
    const f = ref(0), _ = ref(0), v = ref(p.trackControlWidth);
    br({
      scrollLeft: f,
      tracksWidth: _,
      setScrollLeft: (g) => {
        f.value = g;
      }
    });
    const m = ref([]), T = ref(null), U = ref(null), $ = ref(0), V = ref(null), F = ref();
    onMounted(() => {
      A.minScale = p.minScale, A.maxScale = p.maxScale, A.pixelsPerSecond = p.pixelsPerSecond, A.initScale(p.defaultScale), A.initSnapEnabled(p.enableSnap), A.snapThreshold = p.snapThreshold, y.initialize(), Y(p.theme), W(), window.addEventListener("resize", W);
    }), watch(() => p.theme, (g) => {
      Y(g);
    }, { deep: true });
    function Y(g) {
      if (!e.value || !g) return;
      const B = e.value;
      g.primaryHue !== void 0 && B.style.setProperty("--theme-hue", String(g.primaryHue)), g.primarySaturation !== void 0 && B.style.setProperty("--theme-saturation", `${g.primarySaturation}%`), g.primaryLightness !== void 0 && B.style.setProperty("--theme-lightness", `${g.primaryLightness}%`), g.primaryColor && B.style.setProperty("--color-primary", g.primaryColor), g.bgDark && B.style.setProperty("--color-bg-dark", g.bgDark), g.bgMedium && B.style.setProperty("--color-bg-medium", g.bgMedium), g.bgLight && B.style.setProperty("--color-bg-light", g.bgLight), g.bgElevated && B.style.setProperty("--color-bg-elevated", g.bgElevated), g.textPrimary && B.style.setProperty("--color-text-primary", g.textPrimary), g.textSecondary && B.style.setProperty("--color-text-secondary", g.textSecondary), g.textMuted && B.style.setProperty("--color-text-muted", g.textMuted), g.borderColor && B.style.setProperty("--color-border", g.borderColor), g.borderRadius && (g.borderRadius.sm !== void 0 && B.style.setProperty("--radius-sm", `${g.borderRadius.sm}px`), g.borderRadius.md !== void 0 && B.style.setProperty("--radius-md", `${g.borderRadius.md}px`), g.borderRadius.lg !== void 0 && B.style.setProperty("--radius-lg", `${g.borderRadius.lg}px`));
    }
    onUnmounted(() => {
      window.removeEventListener("resize", W);
    });
    function W() {
      if (e.value) {
        const g = e.value.getBoundingClientRect();
        _.value = g.width - v.value;
      }
    }
    function ut(g) {
      Math.abs(v.value - g) > 1 && (v.value = g, W());
    }
    function _t(g) {
      f.value = g;
    }
    function rt(g) {
      f.value = g;
    }
    function R(g) {
      switch (g) {
        case "reset":
          P();
          break;
        case "undo":
          y.undo();
          break;
        case "redo":
          y.redo();
          break;
        case "split":
          L();
          break;
        case "delete":
          k();
          break;
      }
    }
    function P() {
      b.reset(), I.reset(), y.reset(), A.reset(), p.enableMainTrackMode && b.addTrack({
        id: `track-main-${Date.now()}`,
        type: "video",
        name: "主轨道",
        visible: true,
        locked: false,
        clips: [],
        order: 0,
        isMain: true
      }), y.initialize();
    }
    function k() {
      const g = Array.from(b.selectedClipIds);
      g.length !== 0 && (b.removeClips(g), y.pushSnapshot("删除片段"), g.forEach((B) => {
        x("clipDelete", B);
      }));
    }
    function L() {
      const g = Array.from(b.selectedClipIds);
      if (g.length === 0) return;
      const B = I.currentTime;
      g.forEach((q) => {
        const ht = b.getClip(q);
        if (!ht || B <= ht.startTime || B >= ht.endTime)
          return;
        const gt = b.splitClip(q, B);
        gt && x("clipSplit", q, gt.leftClip, gt.rightClip, B);
      }), y.pushSnapshot("分割片段");
    }
    function j(g, B) {
      x("addTransition", g, B);
    }
    function C(g, B, q) {
      x("dropMedia", g, B, q);
    }
    function z(g) {
      x("playback:seek", g);
    }
    const O = () => ({
      copy: { key: "copy", label: r.value.copy || "复制", icon: "📋", shortcut: "Ctrl+C" },
      cut: { key: "cut", label: r.value.cut || "剪切", icon: "✂️", shortcut: "Ctrl+X" },
      delete: { key: "delete", label: r.value.deleteClip || "删除", icon: "🗑️", danger: true, shortcut: "Delete" }
    });
    function ft(g, B) {
      var te;
      T.value = g, U.value = null, V.value = "clip";
      const q = [], ht = p.clipContextMenu, gt = O();
      (ht == null ? void 0 : ht.showCommonItems) !== false && ((ht == null ? void 0 : ht.commonItems) || ["copy", "cut", "delete"]).forEach((He) => {
        if (typeof He == "string") {
          const un = gt[He];
          un && q.push({ ...un });
        } else
          q.push(He);
      }), ht != null && ht.byType && ht.byType[g.type] && (q.length > 0 && q.push({ key: "divider-type", label: "", divider: true }), q.push(...ht.byType[g.type])), ht != null && ht.extraItems && ht.extraItems.length > 0 && (q.length > 0 && q.push({ key: "divider-extra", label: "", divider: true }), q.push(...ht.extraItems)), m.value = q, (te = F.value) == null || te.show(B.clientX, B.clientY);
    }
    function D(g, B, q) {
      var te, Gi, He;
      if (((te = p.trackContextMenu) == null ? void 0 : te.enabled) === false)
        return;
      T.value = null, U.value = g, $.value = B, V.value = "track";
      const ht = [
        { key: "paste", label: r.value.paste || "粘贴", icon: "📋", shortcut: "Ctrl+V", disabled: !b.hasClipboardContent() },
        { key: "divider-1", label: "", divider: true },
        { key: "lockTrack", label: g.locked ? r.value.unlockTrack || "解锁轨道" : r.value.lockTrack || "锁定轨道", icon: g.locked ? "🔓" : "🔒" },
        { key: "deleteTrack", label: r.value.deleteTrack || "删除轨道", icon: "🗑️", danger: true, disabled: g.isMain }
      ], gt = ((Gi = p.trackContextMenu) == null ? void 0 : Gi.items) || ht;
      m.value = gt, (He = F.value) == null || He.show(q.clientX, q.clientY);
    }
    function M(g) {
      if (V.value === "clip" && T.value) {
        const B = T.value;
        switch (g) {
          case "copy":
            G(B);
            break;
          case "cut":
            J(B);
            break;
          case "delete":
            b.removeClip(B.id), y.pushSnapshot("删除片段"), x("clipDelete", B.id);
            break;
          default:
            x("clipContextMenuSelect", g, B);
        }
      }
      if (V.value === "track" && U.value) {
        const B = U.value, q = $.value;
        switch (g) {
          case "paste":
            E(B.id, q);
            break;
          case "lockTrack":
            X(B);
            break;
          case "deleteTrack":
            Z(B);
            break;
          default:
            x("trackContextMenuSelect", g, B, q);
        }
      }
      T.value = null, U.value = null, V.value = null, m.value = [];
    }
    function G(g) {
      if (!b.selectedClipIds.has(g.id))
        b.copyClips([g.id]), x("clipCopy", [g.id]);
      else {
        const B = Array.from(b.selectedClipIds);
        b.copyClips(B), x("clipCopy", B);
      }
    }
    function J(g) {
      if (!b.selectedClipIds.has(g.id))
        b.cutClips([g.id]), x("clipCut", [g.id]);
      else {
        const B = Array.from(b.selectedClipIds);
        b.cutClips(B), x("clipCut", B);
      }
    }
    function E(g, B) {
      const q = b.pasteClips(g, B);
      q && (y.pushSnapshot("粘贴片段"), x("clipPaste", q, g, B));
    }
    function X(g) {
      b.updateTrack(g.id, { locked: !g.locked }), y.pushSnapshot(g.locked ? "解锁轨道" : "锁定轨道");
    }
    function Z(g) {
      if (g.isMain) return;
      const B = (r.value.confirmDeleteTrack || '确定要删除轨道"{name}"吗？').replace("{name}", g.name);
      confirm(B) && (b.removeTrack(g.id), y.pushSnapshot("删除轨道"), x("trackDelete", g.id));
    }
    const nt = computed(() => ({
      trackTypes: p.trackTypes,
      clipConfigs: S.value,
      enableMainTrackMode: p.enableMainTrackMode,
      enableCrossTrackDrag: p.enableCrossTrackDrag,
      maxDuration: p.maxDuration,
      fps: p.fps,
      playbackRates: p.playbackRates,
      trackControlWidth: p.trackControlWidth
    }));
    provide("config", nt);
    function K(g, B) {
      S.value[g] ? S.value[g] = u(S.value[g], B) : S.value[g] = B;
    }
    function N(g, B, q) {
      x("transitionAdded", g, B, q);
    }
    function it() {
      return {
        version: Wi,
        tracks: JSON.parse(JSON.stringify(b.tracks)),
        currentTime: I.currentTime,
        scale: A.scale,
        snapEnabled: A.snapEnabled
      };
    }
    function lt(g) {
      g.version && g.version !== Wi && console.warn(`[VideoTrack] 数据版本不匹配: ${g.version} -> ${Wi}`), b.setTracks(g.tracks || []), g.currentTime !== void 0 && I.seekTo(g.currentTime), g.scale !== void 0 && A.setScale(g.scale), g.snapEnabled !== void 0 && A.setSnapEnabled(g.snapEnabled), y.initialize(), x("data:changed");
    }
    function st() {
      return JSON.stringify(it(), null, 2);
    }
    function pt(g) {
      try {
        const B = JSON.parse(g);
        return lt(B), !0;
      } catch (B) {
        return console.error("[VideoTrack] JSON 解析失败:", B), false;
      }
    }
    function St(g) {
      b.addTrack(g), y.pushSnapshot("添加轨道"), x("track:added", g), x("trackCreate", g.id);
    }
    function Tt(g) {
      const B = b.tracks.find((q) => q.id === g);
      B && (b.removeTrack(g), y.pushSnapshot("删除轨道"), x("track:removed", B), x("trackDelete", g));
    }
    function Ct(g, B) {
      b.updateTrack(g, B), y.pushSnapshot("更新轨道"), x("track:updated", g, B);
    }
    function Xt() {
      return b.tracks;
    }
    function ii() {
      return b.sortedTracks;
    }
    function ni(g) {
      return b.tracks.find((B) => B.id === g);
    }
    function Oi() {
      return b.mainTrack;
    }
    function xi(g, B) {
      b.addClip(g, B), y.pushSnapshot("添加片段"), x("clip:added", B, g);
    }
    function wi(g) {
      const B = b.getClip(g);
      if (B) {
        const q = B.trackId;
        b.removeClip(g), y.pushSnapshot("删除片段"), x("clip:removed", B, q), x("clipDelete", g);
      }
    }
    function xt(g, B) {
      const q = b.getClip(g);
      if (q) {
        const ht = { ...q };
        b.updateClip(g, B), y.pushSnapshot("更新片段"), x("clip:updated", g, B, ht);
      }
    }
    function wt(g) {
      return b.getClip(g);
    }
    function Ft(g, B, q) {
      const ht = b.getClip(g);
      if (!ht) return false;
      const gt = ht.trackId, te = ht.endTime - ht.startTime;
      return gt !== B && b.moveClipToTrack(g, B), b.updateClip(g, {
        startTime: q,
        endTime: q + te
      }), y.pushSnapshot("移动片段"), x("clipMove", g, B, q), x("clip:drag-end", ht, gt, B), true;
    }
    function Lt(g, B, q) {
      const ht = b.setClipPlaybackRate(g, B, q);
      return ht.success && (y.pushSnapshot("调整倍速"), b.getClip(g) && x("clip:updated", g, { playbackRate: B }, {})), ht;
    }
    function he(g, B) {
      return b.getClipDurationAtRate(g, B);
    }
    function Ge(g, B, q = true) {
      return b.checkPlaybackRateCollision(g, B, q);
    }
    function ve(g) {
      b.selectClip(g);
    }
    function Zt(g) {
      b.clearSelection(), g.forEach((B) => b.selectedClipIds.add(B));
    }
    function Mt() {
      b.clearSelection();
    }
    function Ce() {
      return b.selectedClips;
    }
    function Xn() {
      return Array.from(b.selectedClipIds);
    }
    function cn() {
      I.play(), x("playback:play");
    }
    function dn() {
      I.pause(), x("playback:pause");
    }
    function Zn() {
      I.isPlaying ? dn() : cn();
    }
    function Kn(g) {
      I.seekTo(g), x("playback:seek", g);
    }
    function Jn() {
      return I.currentTime;
    }
    function qn(g) {
      I.setPlaybackRate(g), x("playback:ratechange", g);
    }
    function Qn() {
      return I.playbackRate;
    }
    function tr() {
      return I.isPlaying;
    }
    function er() {
      return b.totalDuration;
    }
    function ir(g) {
      A.setScale(g), x("scale:changed", g);
    }
    function nr() {
      return A.scale;
    }
    function rr(g = 0.1) {
      A.zoomIn(g), x("scale:changed", A.scale);
    }
    function sr(g = 0.1) {
      A.zoomOut(g), x("scale:changed", A.scale);
    }
    function ar() {
      A.setSnapEnabled(true);
    }
    function or() {
      A.setSnapEnabled(false);
    }
    function lr() {
      return A.snapEnabled;
    }
    function Ni() {
      return {
        canUndo: y.canUndo,
        canRedo: y.canRedo
      };
    }
    function cr() {
      y.undo(), x("history:changed", Ni());
    }
    function dr() {
      y.redo(), x("history:changed", Ni());
    }
    return s({
      // 基础操作
      reset: P,
      registerClipType: K,
      emitTransitionAdded: N,
      // 数据导入/导出
      exportData: it,
      importData: lt,
      exportAsJSON: st,
      importFromJSON: pt,
      // 轨道操作
      addTrack: St,
      removeTrack: Tt,
      updateTrack: Ct,
      getTracks: Xt,
      getSortedTracks: ii,
      getTrackById: ni,
      getMainTrack: Oi,
      // Clip 操作
      addClip: xi,
      removeClip: wi,
      updateClip: xt,
      getClipById: wt,
      moveClip: Ft,
      setClipPlaybackRate: Lt,
      getClipDurationAtRate: he,
      checkPlaybackRateCollision: Ge,
      // 选择操作
      selectClip: ve,
      selectClips: Zt,
      clearSelection: Mt,
      getSelectedClips: Ce,
      getSelectedClipIds: Xn,
      // 播放控制
      play: cn,
      pause: dn,
      togglePlay: Zn,
      seekTo: Kn,
      getCurrentTime: Jn,
      setPlaybackRate: qn,
      getPlaybackRate: Qn,
      isPlaying: tr,
      getDuration: er,
      // 缩放控制
      setScale: ir,
      getScale: nr,
      zoomIn: rr,
      zoomOut: sr,
      enableSnap: ar,
      disableSnap: or,
      isSnapEnabled: lr,
      // 历史操作
      undo: cr,
      redo: dr,
      getHistoryState: Ni
    }), (g, B) => (openBlock(), createElementBlock("div", {
      class: "video-track",
      ref_key: "containerRef",
      ref: e
    }, [
      renderSlot(g.$slots, "toolbar-before", {}, void 0, true),
      c.showToolsBar ? (openBlock(), createBlock(Zr, {
        key: 0,
        "operation-buttons": c.operationButtons,
        "scale-config-buttons": c.scaleConfigButtons,
        locale: r.value,
        onOperation: R,
        "onPlayback:play": B[0] || (B[0] = () => x("playback:play")),
        "onPlayback:pause": B[1] || (B[1] = () => x("playback:pause"))
      }, createSlots({
        "operations-prepend": withCtx(() => [
          renderSlot(g.$slots, "operations-prepend", {}, void 0, !0)
        ]),
        "operations-append": withCtx(() => [
          renderSlot(g.$slots, "operations-append", {}, void 0, !0)
        ]),
        "playback-prepend": withCtx(() => [
          renderSlot(g.$slots, "playback-prepend", {}, void 0, !0)
        ]),
        "playback-append": withCtx(() => [
          renderSlot(g.$slots, "playback-append", {}, void 0, !0)
        ]),
        "scale-prepend": withCtx(() => [
          renderSlot(g.$slots, "scale-prepend", {}, void 0, !0)
        ]),
        "scale-append": withCtx(() => [
          renderSlot(g.$slots, "scale-append", {}, void 0, !0)
        ]),
        _: 2
      }, [
        renderList(g.$slots, (q, ht) => ({
          name: ht,
          fn: withCtx((gt) => [
            renderSlot(g.$slots, ht, normalizeProps(guardReactiveProps(gt)), void 0, !0)
          ])
        }))
      ]), 1032, ["operation-buttons", "scale-config-buttons", "locale"])) : createCommentVNode("", true),
      renderSlot(g.$slots, "toolbar-after", {}, void 0, true),
      renderSlot(g.$slots, "ruler-before", {}, void 0, true),
      createVNode(qr, {
        width: _.value,
        "scroll-left": f.value,
        "track-control-width": v.value,
        onScroll: _t,
        onSeek: z
      }, null, 8, ["width", "scroll-left", "track-control-width"]),
      renderSlot(g.$slots, "ruler-after", {}, void 0, true),
      createBaseVNode("div", Io, [
        renderSlot(g.$slots, "tracks-before", {}, void 0, true),
        createVNode(xo, {
          "scroll-left": f.value,
          locale: r.value,
          onScroll: rt,
          onContextMenu: ft,
          onTrackContextMenu: D,
          onAddTransition: j,
          onDropMedia: C,
          "onUpdate:trackControlWidth": ut,
          onSeek: z
        }, createSlots({
          "track-control": withCtx((q) => [
            renderSlot(g.$slots, "track-control", normalizeProps(guardReactiveProps(q)), void 0, !0)
          ]),
          "track-area": withCtx((q) => [
            renderSlot(g.$slots, "track-area", normalizeProps(guardReactiveProps(q)), void 0, !0)
          ]),
          "clip-content": withCtx((q) => [
            renderSlot(g.$slots, "clip-content", normalizeProps(guardReactiveProps(q)), void 0, !0)
          ]),
          "empty-track": withCtx((q) => [
            renderSlot(g.$slots, "empty-track", normalizeProps(guardReactiveProps(q)), () => [
              createBaseVNode("div", Ao, toDisplayString(r.value.emptyTrackHint), 1)
            ], !0)
          ]),
          _: 2
        }, [
          renderList(g.$slots, (q, ht) => ({
            name: ht,
            fn: withCtx((gt) => [
              renderSlot(g.$slots, ht, normalizeProps(guardReactiveProps(gt)), void 0, !0)
            ])
          }))
        ]), 1032, ["scroll-left", "locale"]),
        renderSlot(g.$slots, "tracks-after", {}, void 0, true)
      ]),
      createVNode(Eo, {
        ref_key: "contextMenuRef",
        ref: F,
        items: m.value,
        onSelect: M
      }, {
        "menu-item": withCtx((q) => [
          renderSlot(g.$slots, "context-menu-item", normalizeProps(guardReactiveProps(q)), void 0, !0)
        ]),
        _: 3
      }, 8, ["items"]),
      renderSlot(g.$slots, "statusbar", {}, void 0, true)
    ], 512));
  }
}), Fo = /* @__PURE__ */ At(zo, [["__scopeId", "data-v-aa0c76f8"]]);

export { Fo as F, Ht as H, Ne as N, _r as _, ct as a, ca as c, da as d, ti as t, ua as u };
