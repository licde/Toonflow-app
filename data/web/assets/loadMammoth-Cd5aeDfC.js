const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./mammoth-qyhJBxxk.js","./dayjs-CuToSpIM.js"])))=>i.map(i=>d[i]);
import { _ as __vitePreload } from './markdown-S9HtUHKW.js';

let mammothPromise = null;
function loadMammoth() {
  if (!mammothPromise) {
    mammothPromise = __vitePreload(() => import('./mammoth-qyhJBxxk.js').then(n => n.i),true?__vite__mapDeps([0,1]):void 0,import.meta.url);
  }
  return mammothPromise;
}

export { loadMammoth as l };
