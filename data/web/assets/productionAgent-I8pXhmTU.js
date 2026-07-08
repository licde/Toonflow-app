import { i as instance } from './axios-BzO0kuq-.js';
import { p as projectStore } from './project-C_OB2JAu.js';
import { s as settingStore } from './index-BvNjvLGR.js';
import { _ as __vitePreload } from './markdown-S9HtUHKW.js';
import { o as onMounted, b as onUnmounted, aj as shallowRef, c as computed, r as ref, bD as defineStore, w as watch, bX as useThrottleFn } from './vue-vendor-Cj7sXJnb.js';

function useChat(options) {
  const {
    url,
    auth,
    autoConnect = true,
    xmlTags = [],
    keepXmlInMessage = true,
    onXmlTag,
    onError,
    onConnect,
    onDisconnect,
    manageLifecycle = true
  } = options;
  const socket = shallowRef(null);
  const connected = ref(false);
  const connecting = ref(false);
  const messages = ref([]);
  const currentMessageId = ref(null);
  const status = ref("idle");
  const xmlData = ref({});
  const xmlDataByMessage = ref({});
  const normalizedXmlTagOptions = Array.from(
    new Map(
      xmlTags.map((item) => typeof item === "string" ? { tag: item } : item).filter((item) => Boolean(item?.tag)).map((item) => [item.tag, item])
    ).values()
  );
  const normalizedXmlTags = normalizedXmlTagOptions.map((item) => item.tag);
  const hiddenXmlTags = normalizedXmlTagOptions.filter((item) => item.keepInMessage ?? keepXmlInMessage ? false : true).map((item) => item.tag);
  const emittedXmlState = /* @__PURE__ */ new Map();
  const rawContentState = /* @__PURE__ */ new Map();
  const isGenerating = computed(() => {
    const lastMsg = messages.value[messages.value.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant") return false;
    const status2 = lastMsg.status;
    if (status2 === "pending" || status2 === "streaming") return true;
    const aiMsg = lastMsg;
    if (aiMsg.content?.some((c) => c.status === "pending" || c.status === "streaming")) {
      return true;
    }
    return false;
  });
  const lastMessage = computed(() => messages.value[messages.value.length - 1]);
  const findMessage = (id) => {
    return messages.value.find((m) => m.id === id);
  };
  const findMessageIndex = (id) => {
    return messages.value.findIndex((m) => m.id === id);
  };
  const findContent = (msg, contentId) => {
    return msg.content?.find((c) => c.id === contentId);
  };
  const isEmptyMessageContent = (msg) => {
    if (!msg || msg.role !== "assistant") return false;
    const aiMsg = msg;
    if (!aiMsg.content || aiMsg.content.length === 0) return true;
    return aiMsg.content.every((item) => {
      if (item.data === null || item.data === void 0) return true;
      if (typeof item.data === "string") return item.data.trim() === "";
      return false;
    });
  };
  const isXmlTextContent = (content) => {
    return (content.type === "text" || content.type === "markdown") && typeof content.data === "string";
  };
  const getContentKey = (messageId, content) => `${messageId}:${content.id ?? content.type}`;
  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parseXmlAttributes = (tagStr) => {
    const attrs = {};
    const attrRegex = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let match;
    while ((match = attrRegex.exec(tagStr)) !== null) {
      attrs[match[1]] = match[2] ?? match[3];
    }
    return attrs;
  };
  const parseXmlChildren = (content) => {
    const children = [];
    const childRegex = /<(\w+)((?:\s+[\w-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(?:\/>|>([\s\S]*?)<\/\1>)/g;
    let match;
    let lastIndex = 0;
    while ((match = childRegex.exec(content)) !== null) {
      children.push({
        tag: match[1],
        attrs: parseXmlAttributes(match[2]),
        value: match[3] ?? ""
      });
      lastIndex = childRegex.lastIndex;
    }
    const remaining = content.slice(lastIndex);
    const unclosedMatch = remaining.match(/<(\w+)((?:\s+[\w-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*>([\s\S]*)$/);
    if (unclosedMatch) {
      children.push({
        tag: unclosedMatch[1],
        attrs: parseXmlAttributes(unclosedMatch[2]),
        value: unclosedMatch[3]
      });
    }
    return children;
  };
  const parseXmlTag = (text, tag) => {
    const escapedTag = escapeRegExp(tag);
    const openRegex = new RegExp(`<${escapedTag}(\\s[^>]*)?>`, "g");
    let lastMatch = null;
    let m;
    while ((m = openRegex.exec(text)) !== null) {
      lastMatch = m;
    }
    if (!lastMatch) return null;
    const attrs = parseXmlAttributes(lastMatch[1] ?? "");
    const contentStart = lastMatch.index + lastMatch[0].length;
    const closeTag = `</${tag}>`;
    const closeIndex = text.indexOf(closeTag, contentStart);
    const isComplete = closeIndex !== -1;
    const value = text.slice(contentStart, isComplete ? closeIndex : text.length).trim();
    const children = parseXmlChildren(value);
    return {
      value,
      attrs,
      children,
      isComplete
    };
  };
  const stripXmlFromMessage = (text) => {
    let sanitized = text;
    for (const tag of hiddenXmlTags) {
      const escapedTag = escapeRegExp(tag);
      sanitized = sanitized.replace(new RegExp(`<${escapedTag}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${escapedTag}>`, "g"), "");
      sanitized = sanitized.replace(new RegExp(`<${escapedTag}(?:\\s[^>]*)?>[\\s\\S]*$`, "g"), "");
    }
    return sanitized;
  };
  const getRawContentData = (messageId, content) => {
    if (!isXmlTextContent(content)) return null;
    return rawContentState.get(getContentKey(messageId, content)) ?? content.data;
  };
  const syncContentDisplay = (messageId, content) => {
    if (!isXmlTextContent(content)) return;
    const rawText = getRawContentData(messageId, content) ?? "";
    content.data = hiddenXmlTags.length ? stripXmlFromMessage(rawText) : rawText;
  };
  const syncXmlData = (messageId, content, messageStatus) => {
    if (!normalizedXmlTags.length) return;
    if (!isXmlTextContent(content)) return;
    const contentKey = getContentKey(messageId, content);
    const prevState = emittedXmlState.get(contentKey) ?? {};
    const nextState = { ...prevState };
    const nextMessageData = { ...xmlDataByMessage.value[messageId] ?? {} };
    const status2 = content.status ?? messageStatus ?? "pending";
    const rawText = getRawContentData(messageId, content);
    if (rawText === null) return;
    let changed = false;
    for (const tag of normalizedXmlTags) {
      const parsed = parseXmlTag(rawText, tag);
      if (parsed === null) continue;
      const { value, isComplete } = parsed;
      const eventStatus = isComplete ? status2 === "error" || status2 === "stop" ? status2 : "complete" : status2;
      const shouldEmit = prevState[tag] !== value || eventStatus === "complete";
      if (!shouldEmit) continue;
      nextState[tag] = value;
      nextMessageData[tag] = value;
      xmlData.value = { ...xmlData.value, [tag]: value };
      changed = true;
      onXmlTag?.({
        messageId,
        contentId: content.id,
        type: content.type,
        tag,
        value,
        attrs: parsed.attrs,
        children: parsed.children,
        status: eventStatus
      });
    }
    if (!changed) return;
    emittedXmlState.set(contentKey, nextState);
    xmlDataByMessage.value = {
      ...xmlDataByMessage.value,
      [messageId]: nextMessageData
    };
  };
  const syncMessageXmlData = (messageId, message, messageStatus) => {
    if (!message || message.role !== "assistant") return;
    const aiMessage = message;
    aiMessage.content?.forEach((content) => syncXmlData(messageId, content, messageStatus ?? aiMessage.status));
  };
  const deepMerge = (target, source) => {
    if (typeof source !== "object" || source === null) return source;
    const result = { ...target };
    for (const key in source) {
      const sourceVal = source[key];
      const targetVal = result[key];
      if (Array.isArray(sourceVal)) {
        result[key] = [...Array.isArray(targetVal) ? targetVal : [], ...sourceVal];
      } else if (typeof sourceVal === "object" && sourceVal !== null) {
        const base = typeof targetVal === "object" && targetVal !== null ? targetVal : {};
        result[key] = deepMerge(base, sourceVal);
      } else if (sourceVal !== void 0) {
        result[key] = sourceVal;
      }
    }
    return result;
  };
  const appendStringData = (content, delta) => {
    if (typeof content.data === "string") {
      content.data += delta;
    } else if (typeof content.data === "object" && content.data !== null) {
      if ("text" in content.data && typeof delta === "string") {
        content.data.text = (content.data.text || "") + delta;
      }
    }
  };
  const handleContentUpdate = (event) => {
    const { messageId, contentId, type, data, strategy, status: eventStatus } = event;
    const msg = findMessage(messageId);
    if (!msg || msg.role !== "assistant") return;
    const content = findContent(msg, contentId);
    if (!content) return;
    if (eventStatus) {
      content.status = eventStatus;
    }
    if (eventStatus === "streaming" || strategy === "append" && data) {
      if (msg.status === "pending") {
        msg.status = "streaming";
      }
      if (currentMessageId.value === messageId) {
        status.value = "streaming";
      }
    }
    if (data === void 0 || data === null) {
      syncXmlData(messageId, content, msg.status);
      return;
    }
    if (isXmlTextContent(content) && typeof data === "string") {
      const contentKey = getContentKey(messageId, content);
      const previousRaw = rawContentState.get(contentKey) ?? content.data;
      const nextRaw = strategy === "append" ? previousRaw + data : data;
      rawContentState.set(contentKey, nextRaw);
      syncContentDisplay(messageId, content);
    } else if (strategy === "append") {
      if (typeof data === "string") {
        appendStringData(content, data);
      } else if (typeof data === "object") {
        content.data = deepMerge(content.data, data);
      }
    } else {
      if (typeof content.data === "object" && typeof data === "object") {
        content.data = { ...content.data, ...data };
      } else {
        content.data = data;
      }
    }
    if (!eventStatus && strategy === "append") {
      content.status = "streaming";
    }
    syncXmlData(messageId, content, msg.status);
  };
  const setupHandlers = () => {
    if (!socket.value) return;
    socket.value.on("message", (data) => {
      const newMessage = {
        id: data.id,
        role: data.role,
        name: data.name,
        status: data.status || "pending",
        datetime: data.datetime,
        content: data.content || [],
        ext: data.ext
      };
      if (newMessage.status === "complete" && isEmptyMessageContent(newMessage)) {
        return;
      }
      if (data.role === "assistant") {
        const aiMessage = newMessage;
        aiMessage.content?.forEach((content) => {
          if (!isXmlTextContent(content)) return;
          rawContentState.set(getContentKey(data.id, content), content.data);
          syncContentDisplay(data.id, content);
        });
      }
      messages.value.push(newMessage);
      if (data.role === "assistant") {
        const aiMessage = newMessage;
        aiMessage.content?.forEach((content) => syncXmlData(data.id, content, aiMessage.status));
      }
      if (data.role === "assistant") {
        currentMessageId.value = data.id;
        status.value = data.status === "streaming" ? "streaming" : "pending";
      }
    });
    socket.value.on("message:update", (data) => {
      const msg = findMessage(data.id);
      if (!msg) return;
      if (data.status) {
        msg.status = data.status;
      }
      if (data.ext) {
        msg.ext = { ...msg.ext, ...data.ext };
      }
      if (data.status) {
        syncMessageXmlData(data.id, msg, data.status);
      }
      if (data.status === "complete" && isEmptyMessageContent(msg)) {
        removeMessage(data.id);
        if (currentMessageId.value === data.id) {
          currentMessageId.value = null;
          status.value = "idle";
        }
        return;
      }
      if (data.status === "streaming") {
        status.value = "streaming";
      }
      if (data.status === "complete" || data.status === "error" || data.status === "stop") {
        if (currentMessageId.value === data.id) {
          currentMessageId.value = null;
          status.value = "idle";
        }
      }
    });
    socket.value.on("content:add", (data) => {
      const msg = findMessage(data.messageId);
      if (!msg || msg.role !== "assistant") return;
      if (!msg.content) {
        msg.content = [];
      }
      const content = {
        ...data.content,
        status: data.content.status || "pending",
        // thinking 内容块默认折叠
        ...data.content.type === "thinking" ? { ext: { collapsed: true, ...data.content.ext } } : {}
      };
      if (isXmlTextContent(content)) {
        rawContentState.set(getContentKey(data.messageId, content), content.data);
        syncContentDisplay(data.messageId, content);
      }
      if (content.type === "thinking") {
        const firstNonThinkingIndex = msg.content.findIndex((c) => c.type !== "thinking");
        if (firstNonThinkingIndex === -1) {
          msg.content.push(content);
        } else {
          msg.content.splice(firstNonThinkingIndex, 0, content);
        }
      } else {
        msg.content.push(content);
      }
      syncXmlData(data.messageId, content, msg.status);
      if (content.status === "streaming") {
        if (msg.status === "pending") {
          msg.status = "streaming";
        }
      }
    });
    socket.value.on("content:update", handleContentUpdate);
    socket.value.on("error", (error) => {
      console.error("[Chat Error]", error);
      onError?.(error);
    });
    socket.value.on("connect", () => {
      connected.value = true;
      connecting.value = false;
      onConnect?.();
    });
    socket.value.on("disconnect", (reason) => {
      connected.value = false;
      connecting.value = false;
      onDisconnect?.();
      console.log("[Chat Disconnected]", reason);
    });
    socket.value.on("connect_error", (error) => {
      connected.value = false;
      connecting.value = false;
      console.error("[Chat Connect Error]", error);
    });
  };
  const connect = async () => {
    if (socket.value?.connected || connecting.value) return;
    connecting.value = true;
    if (!socket.value) {
      const { io } = await __vitePreload(async () => { const { io } = await import('./socketio-BKwWEeG7.js');return { io }},true?[]:void 0,import.meta.url);
      socket.value = io(url, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1e3,
        reconnectionDelayMax: 5e3,
        timeout: 1e4,
        auth: { token: localStorage.getItem("token"), ...typeof auth === "function" ? auth() : auth }
      });
      setupHandlers();
    } else {
      socket.value.connect();
    }
  };
  const disconnect = () => {
    socket.value?.disconnect();
    connected.value = false;
    connecting.value = false;
  };
  const reconnect = () => {
    disconnect();
    setTimeout(() => void connect(), 100);
  };
  const emit = (event, data) => {
    if (!socket.value?.connected) {
      console.warn("[Chat] Socket not connected");
      return false;
    }
    socket.value.emit(event, data);
    return true;
  };
  const on = (event, callback) => {
    socket.value?.on(event, callback);
    return () => socket.value?.off(event, callback);
  };
  const once = (event, callback) => {
    socket.value?.once(event, callback);
  };
  const off = (event, callback) => {
    socket.value?.off(event, callback);
  };
  const chat = (content, attachments) => {
    if (!content.trim() && !attachments?.length) return false;
    const userMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      status: "complete",
      datetime: (/* @__PURE__ */ new Date()).toISOString(),
      content: [{ type: "text", data: content, status: "complete" }]
    };
    if (attachments?.length) {
      userMessage.content.push({
        type: "attachment",
        data: attachments,
        status: "complete"
      });
    }
    messages.value.push(userMessage);
    return emit("chat", { content, attachments });
  };
  const stopGenerate = (messageId) => {
    const id = messageId || currentMessageId.value;
    if (!id) return false;
    const msg = findMessage(id);
    if (msg) {
      msg.status = "stop";
    }
    currentMessageId.value = null;
    status.value = "idle";
    return emit("stop", { messageId: id });
  };
  const regenerate = (messageId) => {
    return emit("regenerate", { messageId });
  };
  const clearMessages = () => {
    messages.value = [];
    currentMessageId.value = null;
    status.value = "idle";
    xmlData.value = {};
    xmlDataByMessage.value = {};
    emittedXmlState.clear();
    rawContentState.clear();
  };
  const removeMessage = (id) => {
    const idx = findMessageIndex(id);
    if (idx > -1) {
      const msg = messages.value[idx];
      msg?.content?.forEach((content) => {
        emittedXmlState.delete(getContentKey(id, content));
        rawContentState.delete(getContentKey(id, content));
      });
      const nextByMessage = { ...xmlDataByMessage.value };
      delete nextByMessage[id];
      xmlDataByMessage.value = nextByMessage;
      messages.value.splice(idx, 1);
    }
  };
  const removeMessagesAfter = (id) => {
    const idx = findMessageIndex(id);
    if (idx > -1) {
      messages.value.splice(idx + 1);
    }
  };
  const updateMessage = (id, updates) => {
    const msg = findMessage(id);
    if (msg) {
      Object.assign(msg, updates);
    }
  };
  const getContentByType = (messageId, type) => {
    const msg = findMessage(messageId);
    if (!msg || msg.role !== "assistant") return [];
    return msg.content?.filter((c) => c.type === type) || [];
  };
  if (manageLifecycle) {
    onMounted(() => {
      if (autoConnect) void connect();
    });
    onUnmounted(() => {
      disconnect();
      socket.value?.removeAllListeners();
      socket.value = null;
    });
  } else if (autoConnect) {
    void connect();
  }
  return {
    socket,
    connected,
    connecting,
    status,
    messages,
    currentMessageId,
    xmlData,
    xmlDataByMessage,
    isGenerating,
    lastMessage,
    connect,
    disconnect,
    reconnect,
    emit,
    on,
    once,
    off,
    chat,
    stopGenerate,
    regenerate,
    clearMessages,
    removeMessage,
    removeMessagesAfter,
    updateMessage,
    findMessage,
    getContentByType
  };
}

function makeProductionAgentStore(projectId) {
  return defineStore(`productionAgent-${projectId}`, () => {
    const defMsg = [
      {
        id: "welcome",
        role: "assistant",
        content: [
          { type: "text", status: "complete", data: $t("workbench.production.chatBox.welcomeMessage") },
          {
            type: "suggestion",
            status: "complete",
            data: [{ title: $t("workbench.production.chatBox.startMakingVideo"), prompt: $t("workbench.production.chatBox.startMakingVideoPrompt") }]
          }
        ]
      }
    ];
    onMounted(() => {
      if (messages.value.length <= 0) messages.value = [...defMsg, ...messages.value];
    });
    const flowData = ref({
      script: "",
      // 剧本
      scriptPlan: "",
      //导演计划
      storyboardTable: "",
      //分镜表
      assets: [],
      // 衍生资产
      storyboard: [],
      //分镜面板
      workbench: {
        videoList: []
      }
      // 工作台数据
    });
    const episodesId = ref();
    const { connected, messages, chat, stopGenerate, socket, status, reconnect, connect} = useChat({
      url: `${settingStore().baseUrl}/socket/productionAgent`,
      auth: () => ({
        isolationKey: `${projectId}:productionAgent:${episodesId.value}`,
        projectId,
        scriptId: episodesId.value
      }),
      manageLifecycle: false,
      autoConnect: false,
      xmlTags: [
        { tag: "script", keepInMessage: false },
        { tag: "scriptPlan", keepInMessage: false },
        { tag: "storyboardTable", keepInMessage: false },
        { tag: "storyboardItem", keepInMessage: false }
      ],
      onXmlTag: async (data) => {
        const { tag, value, children, attrs, status: status2 } = data;
        if (tag === "script") {
          flowData.value.script = value ?? "";
        } else if (tag === "scriptPlan") {
          flowData.value.scriptPlan = value ?? "";
        } else if (tag === "storyboardTable") {
          flowData.value.storyboardTable = value ?? "";
        }
        if (status2 == "complete") {
          throttledFn();
        }
      }
    });
    const throttledFn = useThrottleFn(
      () => {
        setFlowData(episodesId.value);
      },
      500,
      true,
      true
    );
    watch(
      socket,
      (s) => {
        if (s) {
          s.on("connect", () => {
            getHistory();
          });
          s.on("getFlowData", (_, callback) => {
            const returnData = JSON.parse(JSON.stringify(flowData.value));
            returnData.assets.forEach((item) => {
              delete item.prompt;
              delete item.flowId;
              delete item.src;
              if (item.derive && item.derive.length) {
                item.derive.forEach((deriveItem) => {
                  delete deriveItem.prompt;
                  delete deriveItem.flowId;
                  delete deriveItem.src;
                });
              }
            });
            returnData.storyboard.forEach((item) => {
              delete item.prompt;
              delete item.src;
              delete item.flowId;
            });
            callback(returnData);
          });
          s.on("addDeriveAsset", async (data, callback) => {
            const assets = flowData.value.assets.find((a) => a.id === data.assetsId);
            if (!assets) return callback({ success: false, message: $t("storyboard.assets.notExist") });
            const deriveAssetList = assets.derive || [];
            const item = deriveAssetList.find((d) => d.id === data.id);
            if (item) {
              if (!item) return callback({ success: false, message: $t("storyboard.assets.notDerivativeExist") });
              item.name = data.name;
              item.type = assets.type;
              callback({ success: true, message: $t("storyboard.assets.derivativeUpdateSuccess") });
            } else {
              deriveAssetList.push({
                assetsId: data.assetsId,
                id: data.id,
                name: data.name,
                type: assets.type,
                desc: data.describe,
                prompt: "",
                state: "未生成",
                src: ""
              });
              callback({ success: true, message: $t("storyboard.assets.derivativeAddSuccess") });
            }
          });
          s.on("delDeriveAsset", async (data, callback) => {
            const assets = flowData.value.assets.find((a) => a.id === data.assetsId);
            if (!assets) return callback({ success: false, message: $t("storyboard.assets.notExist") });
            const deriveAssetList = assets.derive || [];
            const index = deriveAssetList.findIndex((d) => d.id === data.id);
            if (index === -1) return callback({ success: false, message: $t("storyboard.assets.notDerivativeExist") });
            deriveAssetList.splice(index, 1);
            callback({ success: true, message: $t("storyboard.assets.derivativeDelSuccess") });
          });
          s.on("generateDeriveAsset", async (data, callback) => {
            const assetsData = await batchGenerateAssets(data.ids);
            callback({ success: true, message: assetsData });
          });
          s.on("generateStoryboard", async (data, callback) => {
            const storyData = await batchGenerateStoryboard(data.ids);
            callback({ success: true, message: storyData });
          });
          s.on("addStoryboard", async (data, callback) => {
            const insertVal = {
              prompt: data.prompt || "",
              duration: Number(data.duration) || 0,
              track: data.track || "",
              state: "未生成",
              src: null,
              videoDesc: data.videoDesc,
              shouldGenerateImage: typeof data.shouldGenerateImage == "boolean" && data.shouldGenerateImage || String(data.shouldGenerateImage).toLowerCase() == "true" ? 1 : 0,
              associateAssetsIds: data.associateAssetsIds || []
            };
            flowData.value.storyboard.push(insertVal);
            await addStoryboardInfo([insertVal]);
            throttledFn();
            callback({ success: true, message: $t("storyboard.assets.derivativeAddSuccess") });
          });
        }
      },
      { immediate: true }
    );
    async function setFlowData(scriptId) {
      await instance.post("/production/saveFlowData", {
        projectId,
        data: flowData.value,
        episodesId: scriptId || episodesId.value
      });
    }
    async function getFlowData() {
      const { data } = await instance.post("/production/getFlowData", {
        projectId,
        episodesId: episodesId.value
      });
      flowData.value = data;
    }
    async function batchGenerateStoryboard(allIds, compulsory = false) {
      try {
        const { data } = await instance.post("/production/storyboard/batchGenerateImage", {
          scriptId: episodesId.value,
          projectId,
          storyboardIds: allIds,
          concurrentCount: settingStore().otherSetting.assetsBatchGenereateSize,
          compulsory
        });
        if (data) {
          if (flowData.value.storyboard.length === 0) {
            flowData.value.storyboard = data;
            return data;
          } else {
            flowData.value.storyboard.forEach((item) => {
              const findData = data.find((i) => i.id == item.id);
              if (findData) {
                item.state = findData.state;
                item.src = findData.src;
              }
            });
          }
        }
        return data;
      } catch (e) {
        window.$message.error(e?.message);
      }
    }
    async function batchGenerateAssets(allIds) {
      flowData.value.assets.forEach((asset) => {
        if (asset.derive) {
          asset.derive.forEach((derive) => {
            if (allIds.includes(derive.id)) {
              derive.state = "生成中";
            }
          });
        }
      });
      try {
        const { data } = await instance.post("/production/assets/batchGenerateAssetsImage", {
          assetIds: allIds,
          projectId,
          scriptId: episodesId.value,
          concurrentCount: settingStore().otherSetting.assetsBatchGenereateSize
        });
        if (data) {
          data.forEach((record) => {
            flowData.value.assets.forEach((asset) => {
              if (asset.derive) {
                asset.derive.forEach((derive) => {
                  if (derive.id === record.id) {
                    derive.state = record.state;
                    derive.src = record.src;
                  }
                });
              }
            });
          });
        }
        return data;
      } catch (e) {
      }
    }
    const assetsNotStateImageIds = computed(() => {
      const ids = [];
      flowData.value.assets.forEach((asset) => {
        if (asset.derive) {
          asset.derive.forEach((derive) => {
            if (derive.state == "生成中") {
              ids.push(derive.id);
            }
          });
        }
      });
      return ids;
    });
    const storyboardNotStateImageIds = computed(() => {
      const ids = [];
      flowData.value.storyboard.forEach((asset) => {
        if (asset.state == "生成中" && asset.id) {
          ids.push(asset.id);
        }
      });
      return ids;
    });
    let assetsPollingTimer = null;
    let assetsPollingInFlight = false;
    async function pollAssetsImages() {
      const ids = assetsNotStateImageIds.value;
      if (ids.length === 0 || assetsPollingInFlight) return;
      assetsPollingInFlight = true;
      try {
        const { data } = await instance.post("/production/assets/pollingImage", {
          ids
        });
        if (!data || data.length === 0) return;
        const records = data;
        records.forEach((record) => {
          flowData.value.assets.forEach((asset) => {
            if (!asset.derive) return;
            asset.derive.forEach((derive) => {
              if (derive.id === record.id) {
                derive.state = record.state;
                if (record.src) derive.src = record.src;
                derive.errorReason = record?.errorReason ?? "";
                derive.prompt = record?.prompt ?? "";
              }
            });
          });
        });
      } catch (e) {
        console.error("[assetsPolling] error", e);
      } finally {
        assetsPollingInFlight = false;
      }
    }
    function startAssetsPolling() {
      if (assetsPollingTimer) return;
      assetsPollingTimer = window.setInterval(async () => {
        if (assetsNotStateImageIds.value.length === 0) {
          stopAssetsPolling();
          return;
        }
        await pollAssetsImages();
      }, 5e3);
      pollAssetsImages();
    }
    function stopAssetsPolling() {
      if (assetsPollingTimer) {
        clearInterval(assetsPollingTimer);
        assetsPollingTimer = null;
      }
    }
    watch(
      () => assetsNotStateImageIds.value,
      (ids) => {
        if (ids.length > 0) {
          startAssetsPolling();
        } else {
          stopAssetsPolling();
        }
      }
    );
    let storyboardPollingTimer = null;
    let storyboardPollingInFlight = false;
    async function pollStoryboardImages() {
      const ids = storyboardNotStateImageIds.value;
      if (ids.length === 0 || storyboardPollingInFlight) return;
      storyboardPollingInFlight = true;
      try {
        const { data } = await instance.post("/production/storyboard/pollingImage", {
          ids
        });
        if (!data || data.length === 0) return;
        const records = data;
        records.forEach((record) => {
          const item = flowData.value.storyboard.find((s) => s.id === record.id);
          if (item) {
            item.state = record.state;
            if (record.src) item.src = record.src;
            item.reason = record?.reason ?? "";
          }
        });
      } catch (e) {
        console.error("[storyboardPolling] error", e);
      } finally {
        storyboardPollingInFlight = false;
      }
    }
    function startStoryboardPolling() {
      if (storyboardPollingTimer) return;
      storyboardPollingTimer = window.setInterval(async () => {
        if (storyboardNotStateImageIds.value.length === 0) {
          stopStoryboardPolling();
          return;
        }
        await pollStoryboardImages();
      }, 5e3);
      pollStoryboardImages();
    }
    function stopStoryboardPolling() {
      if (storyboardPollingTimer) {
        clearInterval(storyboardPollingTimer);
        storyboardPollingTimer = null;
      }
    }
    watch(
      () => storyboardNotStateImageIds.value,
      (ids) => {
        if (ids.length > 0) {
          startStoryboardPolling();
        } else {
          stopStoryboardPolling();
        }
      }
    );
    function updateContext() {
      if (episodesId.value < 0) return;
      const ctx = {
        isolationKey: `${projectId}:productionAgent:${episodesId.value}`,
        projectId,
        scriptId: episodesId.value
      };
      if (!connected.value) connect();
      socket.value.emit("updateContext", ctx);
    }
    async function addStoryboardInfo(items) {
      const { data } = await instance.post("/production/storyboard/batchAddStoryboardInfo", {
        scriptId: episodesId.value,
        data: items,
        projectId
      });
      flowData.value.storyboard.forEach((item) => {
        const updated = data.find((d) => d.prompt == item.prompt && d.duration == item.duration && d.videoDesc == item.videoDesc);
        if (updated) {
          item.id = updated.id;
          item.trackId = updated.trackId;
          item.src = updated.src;
          item.state = updated.state;
          item.associateAssetsIds = updated.associateAssetsIds;
        }
      });
    }
    const loadingHistory = ref(false);
    async function getHistory() {
      loadingHistory.value = true;
      const { data } = await instance.post(`/agents/getMemory`, {
        projectId,
        episodesId: episodesId.value,
        agentType: "productionAgent"
      });
      messages.value = [];
      messages.value = [...defMsg, ...data];
      loadingHistory.value = false;
    }
    const thinkLevel = ref(0);
    function updateThinkConfig(value) {
      thinkLevel.value = value;
      if (socket.value) {
        socket.value.emit("updateThinkConfig", { think: value > 0, thinlLevel: value });
      }
    }
    return {
      connected,
      messages,
      chat,
      stopGenerate,
      socket,
      status,
      flowData,
      setFlowData,
      getFlowData,
      episodesId,
      stopAssetsPolling,
      stopStoryboardPolling,
      updateContext,
      getHistory,
      loadingHistory,
      batchGenerateStoryboard,
      reconnect,
      thinkLevel,
      updateThinkConfig
    };
  });
}
const storeMap = /* @__PURE__ */ new Map();
function createProductionAgentStore(projectId) {
  if (!storeMap.has(projectId)) {
    storeMap.set(projectId, makeProductionAgentStore(projectId));
  }
  return storeMap.get(projectId);
}
function useProductionAgentStore() {
  const id = projectStore().project?.id;
  if (!id) throw new Error("No project selected");
  return createProductionAgentStore(id)();
}

export { useProductionAgentStore as a, useChat as u };
