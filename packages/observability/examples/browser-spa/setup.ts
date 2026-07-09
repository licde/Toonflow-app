/**
 * 浏览器 SPA 示例：配合 @toonflow/observability-browser
 * 在 Vite/Vue 项目 main.ts 中参考此文件
 */
import {
  createBrowserReporter,
  installGlobalErrorHandlers,
  axiosTraceInterceptor,
} from "@toonflow/observability-browser";

export function setupObservabilityBrowser(getToken: () => string) {
  createBrowserReporter({
    ingestUrl: "/api/logs/ingest",
    getToken,
    appModule: "toonflow-web",
  });
  installGlobalErrorHandlers("spa");
  return axiosTraceInterceptor();
}

// axios 用法:
// const { onFulfilled, onRejected } = setupObservabilityBrowser(() => localStorage.getItem("token")!);
// axios.interceptors.response.use(onFulfilled, onRejected);
