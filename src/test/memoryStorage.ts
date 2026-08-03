import type { StorageService, SystemPackageCacheMetadata } from "../storage/storageService";
import { minimalSystemPackage } from "./fixtures";

export function createMemoryStorage(cachedPackage: unknown = null, initial?: {
  cacheMetadata?: SystemPackageCacheMetadata | null;
  packageAssets?: Awaited<ReturnType<StorageService["loadCurrentPackageAssets"]>>;
}): StorageService & {
  getCachedPackage: () => unknown;
  getCacheMetadata: () => SystemPackageCacheMetadata | null;
} {
  let savedData: Awaited<ReturnType<StorageService["loadCurrentCharacterData"]>> = null;
  const characterSaves = new Map<string, { id: string; packageId: string; name: string; updatedAt: string; data: NonNullable<typeof savedData> }>();
  const activeSaveIds = new Map<string, string>();
  const skinPreferences = new Map<string, string>();
  const cardTableSurfaceHeights = new Map<string, Record<string, number>>();
  let frameworkColorSchemePreference: "follow-skin" | "light" | "dark" = "follow-skin";
  let savedPackage = cachedPackage;
  let savedPackageAssets: Awaited<ReturnType<StorageService["loadCurrentPackageAssets"]>> = initial?.packageAssets ?? [];
  let cacheMetadata = initial?.cacheMetadata ?? null;
  const playerImages = new Map<string, Awaited<ReturnType<StorageService["loadPlayerImageBlob"]>>>();
  const resourceExtensions = new Map<string, Awaited<ReturnType<StorageService["listResourceExtensions"]>>[number]>();
  const resourceExtensionAssets = new Map<string, Awaited<ReturnType<StorageService["loadResourceExtensionAssets"]>>>();

  return {
    async loadCurrentSystemPackage() {
      return savedPackage as typeof minimalSystemPackage | null;
    },
    async loadCurrentSystemPackageCacheMetadata() {
      return cacheMetadata;
    },
    async saveCurrentSystemPackage(systemPackage, packageAssets = [], metadata = { source: "imported" }) {
      savedPackage = systemPackage;
      savedPackageAssets = packageAssets;
      cacheMetadata = metadata;
    },
    async clearCurrentSystemPackage() {
      savedPackage = null;
      savedPackageAssets = [];
      cacheMetadata = null;
    },
    async loadCurrentPackageAssets(packageId) {
      const packageIdFromCache =
        typeof savedPackage === "object" && savedPackage !== null && "manifest" in savedPackage
          ? (savedPackage as typeof minimalSystemPackage).manifest.ID
          : undefined;
      return packageIdFromCache === packageId ? savedPackageAssets : [];
    },
    async loadCurrentCharacterData(packageId) {
      const activeId = activeSaveIds.get(packageId);
      return (activeId ? characterSaves.get(activeId)?.data : savedData?.systemPackage.id === packageId ? savedData : null) ?? null;
    },
    async saveCurrentCharacterData(data) {
      savedData = data;
      const activeId = activeSaveIds.get(data.systemPackage.id) ?? data.character.id;
      characterSaves.set(activeId, {
        id: activeId,
        packageId: data.systemPackage.id,
        name: "未命名角色",
        updatedAt: data.updatedAt,
        data: { ...data, character: { ...data.character, id: activeId } },
      });
      activeSaveIds.set(data.systemPackage.id, activeId);
    },
    async listCharacterSaves(packageId) {
      return [...characterSaves.values()]
        .filter((save) => save.packageId === packageId)
        .map(({ data: _data, ...summary }) => summary);
    },
    async loadCharacterSave(packageId, saveId) {
      const save = characterSaves.get(saveId);
      return save?.packageId === packageId ? save.data : null;
    },
    async saveCharacterSave(record) {
      characterSaves.set(record.id, record);
      savedData = record.data;
    },
    async renameCharacterSave(packageId, saveId, name) {
      const save = characterSaves.get(saveId);
      if (save?.packageId === packageId) characterSaves.set(saveId, { ...save, name });
    },
    async deleteCharacterSave(packageId, saveId) {
      const save = characterSaves.get(saveId);
      if (save?.packageId === packageId) characterSaves.delete(saveId);
    },
    async loadActiveCharacterSaveId(packageId) {
      return activeSaveIds.get(packageId) ?? null;
    },
    async setActiveCharacterSaveId(packageId, saveId) {
      activeSaveIds.set(packageId, saveId);
    },
    loadSystemPackageSkinPreference(packageId) {
      return skinPreferences.get(packageId) ?? null;
    },
    setSystemPackageSkinPreference(packageId, skinId) {
      skinPreferences.set(packageId, skinId);
    },
    loadCardTableSurfaceHeights(packageId) {
      return { ...(cardTableSurfaceHeights.get(packageId) ?? {}) };
    },
    setCardTableSurfaceHeight(packageId, tableModuleId, heightPx) {
      const next = { ...(cardTableSurfaceHeights.get(packageId) ?? {}) };
      if (heightPx === null) delete next[tableModuleId];
      else next[tableModuleId] = Math.max(420, Math.round(heightPx));
      cardTableSurfaceHeights.set(packageId, next);
    },
    loadFrameworkColorSchemePreference() {
      return frameworkColorSchemePreference;
    },
    setFrameworkColorSchemePreference(preference) {
      frameworkColorSchemePreference = preference;
    },
    async savePlayerImageBlob(image) {
      playerImages.set(image.id, image);
    },
    async loadPlayerImageBlob(imageId) {
      return playerImages.get(imageId) ?? null;
    },
    async deletePlayerImageBlob(imageId) {
      playerImages.delete(imageId);
    },
    async listResourceExtensions(targetSystemPackageId) {
      return [...resourceExtensions.values()].filter((extension) => extension.目标系统包ID === targetSystemPackageId);
    },
    async loadResourceExtensionAssets(targetSystemPackageId) {
      return [...resourceExtensionAssets.entries()].filter(([key]) => key.startsWith(`${targetSystemPackageId}:`)).flatMap(([, assets]) => assets);
    },
    async saveResourceExtension(extension, assets = []) {
      const key = `${extension.目标系统包ID}:${extension.ID}`;
      resourceExtensions.set(key, extension);
      resourceExtensionAssets.set(key, assets);
    },
    async deleteResourceExtension(targetSystemPackageId, extensionId) {
      const key = `${targetSystemPackageId}:${extensionId}`;
      resourceExtensions.delete(key);
      resourceExtensionAssets.delete(key);
    },
    getCachedPackage() {
      return savedPackage;
    },
    getCacheMetadata() {
      return cacheMetadata;
    },
  };
}
