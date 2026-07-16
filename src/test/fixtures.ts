import type { SystemPackage } from "../domain/systemPackage";
import manifest from "../../public/system-packages/demo-minimal/manifest.json";
import pages from "../../public/system-packages/demo-minimal/pages.json";
import modules from "../../public/system-packages/demo-minimal/modules.json";
import minimalLayoutCss from "../../public/system-packages/demo-minimal/layouts/main.css?raw";
import minimalLayoutHtml from "../../public/system-packages/demo-minimal/layouts/main.html?raw";
import moduleDemoManifest from "../../public/system-packages/demo-modules/manifest.json";
import moduleDemoPages from "../../public/system-packages/demo-modules/pages.json";
import moduleDemoModules from "../../public/system-packages/demo-modules/modules.json";
import moduleDemoLayoutCss from "../../public/system-packages/demo-modules/layouts/main.css?raw";
import moduleDemoLayoutHtml from "../../public/system-packages/demo-modules/layouts/main.html?raw";

function withHtmlTemplateContent<TPage extends { layout: { 类型: string; html: string; css?: string } }>(
  pagesInput: TPage[],
  htmlContent: string,
  cssContent?: string,
) {
  return pagesInput.map((page) => ({
    ...page,
    layout: {
      类型: "htmlTemplate" as const,
      htmlContent,
      ...(cssContent ? { cssContent } : {}),
    },
  }));
}

export const minimalSystemPackage = {
  manifest: {
    ID: manifest.ID,
    名称: manifest.名称,
    版本: manifest.版本,
    schemaVersion: manifest.schemaVersion,
  },
  pages: withHtmlTemplateContent(pages, minimalLayoutHtml, minimalLayoutCss),
  modules,
} as SystemPackage;

export const moduleDemoSystemPackage = {
  manifest: {
    ID: moduleDemoManifest.ID,
    名称: moduleDemoManifest.名称,
    版本: moduleDemoManifest.版本,
    schemaVersion: moduleDemoManifest.schemaVersion,
  },
  pages: withHtmlTemplateContent(moduleDemoPages, moduleDemoLayoutHtml, moduleDemoLayoutCss),
  modules: moduleDemoModules,
  assets: [{ 路径: "assets/demo-emblem.svg", 类型: "image/svg+xml" }],
} as SystemPackage;
