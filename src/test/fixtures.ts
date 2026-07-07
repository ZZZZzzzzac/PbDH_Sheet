import type { SystemPackage } from "../domain/systemPackage";
import manifest from "../../public/system-packages/demo-minimal/manifest.json";
import pages from "../../public/system-packages/demo-minimal/pages.json";
import modules from "../../public/system-packages/demo-minimal/modules.json";

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
