declare module "virtual:preset-system-packages" {
  import type { PresetSystemPackage } from "./loaders/presetSystemPackageLoader";

  const presetSystemPackages: PresetSystemPackage[];
  export default presetSystemPackages;
}
