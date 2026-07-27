import { runValidationChecks } from "../domain/validationRunner";
import { createRuntimeAssetResolver, type RuntimeAssetResolver } from "../loaders/assetResolver";
import { loadAuthorPreviewDirectoryHandle, saveAuthorPreviewDirectoryHandle, storageService } from "../storage/storageService";
import { loadSystemPackageFromDirectoryFiles, loadSystemPackageFromDirectoryHandle, loadSystemPackageFromZipFile } from "../loaders/systemPackageLoader";
import { loadPresetSystemPackage } from "../loaders/presetSystemPackageLoader";
import type { RuntimeDependencies } from "./runtimeTypes";

export interface RuntimeEnvironment {
  dependencies: RuntimeDependencies;
  autosaveTimer: ReturnType<typeof setTimeout> | undefined;
  activePackageAssetResolver: RuntimeAssetResolver | undefined;
}

export const defaultRuntimeDependencies: RuntimeDependencies = {
  loadSystemPackageFromFile: (file) => loadSystemPackageFromZipFile(file),
  loadSystemPackageFromDirectory: (files) => loadSystemPackageFromDirectoryFiles(files),
  loadSystemPackageFromDirectoryHandle: (handle) => loadSystemPackageFromDirectoryHandle(handle),
  loadPresetSystemPackage: (preset, onProgress) => loadPresetSystemPackage(preset, import.meta.env.BASE_URL, fetch, onProgress),
  loadPreviewDirectoryHandle: () => loadAuthorPreviewDirectoryHandle(),
  savePreviewDirectoryHandle: (handle) => saveAuthorPreviewDirectoryHandle(handle),
  storage: storageService,
  runValidationChecks,
};

export function createRuntimeEnvironment(): RuntimeEnvironment {
  return {
    dependencies: defaultRuntimeDependencies,
    autosaveTimer: undefined,
    activePackageAssetResolver: undefined,
  };
}

export function configureRuntimeEnvironment(
  environment: RuntimeEnvironment,
  dependencies: Partial<RuntimeDependencies>,
): void {
  environment.dependencies = { ...defaultRuntimeDependencies, ...dependencies };
}

export function resetRuntimeEnvironment(environment: RuntimeEnvironment): void {
  environment.dependencies = defaultRuntimeDependencies;
  if (environment.autosaveTimer) clearTimeout(environment.autosaveTimer);
  environment.autosaveTimer = undefined;
  environment.activePackageAssetResolver?.revokeAll();
  environment.activePackageAssetResolver = undefined;
}

export async function reloadRuntimeAssets(
  environment: RuntimeEnvironment,
  packageId: string,
): Promise<RuntimeAssetResolver> {
  environment.activePackageAssetResolver?.revokeAll();
  environment.activePackageAssetResolver = createRuntimeAssetResolver([
    ...await environment.dependencies.storage.loadCurrentPackageAssets(packageId),
    ...await environment.dependencies.storage.loadResourceExtensionAssets(packageId),
  ]);
  return environment.activePackageAssetResolver;
}
