import type { SystemPackage } from "../domain/systemPackage";
import manifest from "../../public/system-packages/demo-minimal/manifest.json";
import pages from "../../public/system-packages/demo-minimal/pages.json";
import modules from "../../public/system-packages/demo-minimal/modules.json";
import moduleDemoManifest from "../../public/system-packages/demo-modules/manifest.json";
import moduleDemoPages from "../../public/system-packages/demo-modules/pages.json";
import moduleDemoModules from "../../public/system-packages/demo-modules/modules.json";

export const minimalSystemPackage = {
  manifest: {
    ID: manifest.ID,
    名称: manifest.名称,
    版本: manifest.版本,
    schemaVersion: manifest.schemaVersion,
  },
  pages,
  modules,
  assets: manifest.assets,
} as SystemPackage;

export const moduleDemoSystemPackage = {
  manifest: {
    ID: moduleDemoManifest.ID,
    名称: moduleDemoManifest.名称,
    版本: moduleDemoManifest.版本,
    schemaVersion: moduleDemoManifest.schemaVersion,
  },
  pages: moduleDemoPages,
  modules: moduleDemoModules,
  assets: moduleDemoManifest.assets,
} as SystemPackage;
