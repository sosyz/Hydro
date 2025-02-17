import loadExternalModule from 'vj/utils/loadModule';

let loaded;
const loaders = {
  i18n: async () => {
    const { setLocaleData } = await import('vj/components/monaco/nls');
    let resource;
    const lang = UserContext.viewLang;
    if (lang === 'zh') {
      resource = await import('monaco-editor-nls/locale/zh-hans.json');
    } else if (lang === 'zh_TW') {
      resource = await import('monaco-editor-nls/locale/zh-hant.json');
    } else if (lang === 'ko') {
      resource = await import('monaco-editor-nls/locale/ko.json');
    }
    if (resource) setLocaleData(resource);
  },
  markdown: () => import('./languages/markdown'),
  typescript: () => import('./languages/typescript'),
  yaml: () => import('./languages/yaml'),
  external: async (monaco, feat) => {
    const items = Object.keys(window.externalModules).filter((i) => i === `monaco-${feat}` || i.startsWith(`monaco-${feat}@`));
    for (const item of items) {
      let apply = await loadExternalModule(window.externalModules[item]);
      if (typeof apply !== 'function') apply = apply.default || apply.apply;
      if (typeof apply === 'function') await apply(monaco);
    }
  },
};

let loadPromise = Promise.resolve();

export async function load(features = ['markdown']) {
  let s = Date.now();
  await loadPromise;
  let resolve;
  loadPromise = new Promise((r) => { resolve = r; });
  if (!loaded) {
    await loaders.i18n();
    console.log('Loading monaco editor');
  }
  const res = await import('./index');
  if (!loaded) {
    console.log('Loaded monaco editor in', Date.now() - s, 'ms');
    loaded = [];
  }
  for (const feat of features) {
    if (loaded.includes(feat)) continue;
    if (!loaders[feat]) {
      const items = Object.keys(window.externalModules).filter((i) => i === `monaco-${feat}` || i.startsWith(`monaco-${feat}@`));
      if (!items.length) {
        console.warn('Unknown monaco feature:', feat);
        continue;
      }
    }
    s = Date.now();
    console.log('Loading monaco feature:', feat);
    try {
      if (loaders[feat]) await loaders[feat]();
      else await loaders.external(res.default, feat);
      console.log('Loaded monaco feature:', feat, 'in', Date.now() - s, 'ms');
      loaded.push(feat);
    } catch (e) {
      console.log('Monaco feat', feat, 'failed to load:', e);
    }
  }
  await res.loadThemePromise;
  resolve();
  return { monaco: res.default, registerAction: res.registerAction, customOptions: {} };
}

export default load;
window.Hydro.components.loadMonaco = load;
