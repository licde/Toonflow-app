const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./markdown-CDQfeHxT.js","./vue-vendor-Byo5TD6r.js","./dayjs-CuToSpIM.js"])))=>i.map(i=>d[i]);
import { _ as __vitePreload } from './markdown-CDQfeHxT.js';
import './vue-vendor-Byo5TD6r.js';
import './dayjs-CuToSpIM.js';

let setupPromise = null;
function setupMdEditor(handleLinkClick) {
  if (!setupPromise) {
    setupPromise = (async () => {
      await __vitePreload(() => import('./markdown-CDQfeHxT.js').then(n => n.s),true?__vite__mapDeps([0,1,2]):void 0,import.meta.url);
      const { config } = await __vitePreload(async () => { const { config } = await import('./markdown-CDQfeHxT.js').then(n => n.i);return { config }},true?__vite__mapDeps([0,1,2]):void 0,import.meta.url);
      window.handleLinkClick = handleLinkClick;
      config({
        markdownItConfig(md) {
          const defaultRender = md.renderer.rules.link_open || function(tokens, idx, options, env, self) {
            return self.renderToken(tokens, idx, options);
          };
          md.renderer.rules.link_open = function(tokens, idx, options, env, self) {
            const token = tokens[idx];
            const href = token.attrGet("href");
            if (href) {
              token.attrSet("target", "_blank");
              token.attrSet("rel", "noopener noreferrer");
              token.attrSet("data-link", href);
              token.attrSet("onclick", "return handleLinkClick(event)");
            }
            return defaultRender(tokens, idx, options, env, self);
          };
        }
      });
    })();
  }
  return setupPromise;
}

export { setupMdEditor };
