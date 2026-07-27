import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { minimalSystemPackage } from "../test/fixtures";
import { createMemoryStorage } from "../test/memoryStorage";
import type { PackageDirectoryHandle } from "../loaders/packageVfs";
import type { SystemPackage } from "../domain/systemPackage";
import { loadResourceExtensionJson } from "../domain/resourceExtension";
import { createCardInstance } from "../domain/cardEngine";
import { createEmptyCharacterData } from "../domain/characterData";
import { configureRuntimeDependencies, resetRuntimeDependencies, useRuntimeStore } from "./runtimeStore";

describe("runtime store", () => {
  let memoryStorage: ReturnType<typeof createMemoryStorage>;

  beforeEach(async () => {
    sessionStorage.clear();
    memoryStorage = createMemoryStorage();
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({ ok: true, package: minimalSystemPackage, issues: [] }),
      storage: memoryStorage,
    });
    useRuntimeStore.setState({
      basePackage: null,
      currentPackage: null,
      selectedSkinId: null,
      frameworkColorSchemePreference: "follow-skin",
      resourceCatalog: null,
      installedResourceExtensions: [],
      resourceExtensionImport: null,
      pendingResourceExtensionReplacement: null,
      pendingResourceExtensionConversion: null,
      pendingResourceFormatSelection: null,
      pendingResourceExtensionRemoval: null,
      packageAssetUrls: {},
      characterData: null,
      packageIssues: [],
      derivedReadOnlyDisplayContent: {},
      derivedTextPlaceholders: {},
      moduleVisibility: {},
      pageVisibility: {},
      resourcePickerDefaultQueries: {},
      cardTableCardWidths: {},
      validationIssues: [],
      validationStatus: "idle",
      bootStatus: "idle",
      storageStatus: "idle",
      importError: null,
      importNotice: null,
      pendingCharacterConversion: null,
      pendingCharacterFormatSelection: null,
      pendingQuestionnaireResult: null,
      authorPreviewActive: false,
    });
    await useRuntimeStore.getState().initialize();
  });

  afterEach(() => {
    resetRuntimeDependencies();
    vi.restoreAllMocks();
  });

  it("starts without a default System Package", () => {
    expect(useRuntimeStore.getState().bootStatus).toBe("ready");
    expect(useRuntimeStore.getState().currentPackage).toBeNull();
    expect(useRuntimeStore.getState().characterData).toBeNull();
  });

  it("enters and exits Author Preview without restoring the previous package", async () => {
    const handle = { kind: "directory", name: "dev" } as PackageDirectoryHandle;
    const saveHandle = vi.fn(async () => {});
    configureRuntimeDependencies({
      storage: memoryStorage,
      savePreviewDirectoryHandle: saveHandle,
      loadSystemPackageFromDirectoryHandle: async () => ({ ok: true, package: minimalSystemPackage, issues: [] }),
    });
    await useRuntimeStore.getState().enterAuthorPreview(handle);
    expect(saveHandle).toHaveBeenCalledWith(handle);
    expect(useRuntimeStore.getState().authorPreviewActive).toBe(true);
    expect(useRuntimeStore.getState().currentPackage?.manifest.ID).toBe(minimalSystemPackage.manifest.ID);
    useRuntimeStore.getState().exitAuthorPreview();
    expect(useRuntimeStore.getState().authorPreviewActive).toBe(false);
    expect(useRuntimeStore.getState().currentPackage?.manifest.ID).toBe(minimalSystemPackage.manifest.ID);
  });

  it("restores Preview within the tab and blocks stale rendering on reload errors", async () => {
    const handle = { kind: "directory", name: "dev", queryPermission: async () => "granted" as PermissionState } as PackageDirectoryHandle;
    sessionStorage.setItem("pbdh-author-preview", "active");
    configureRuntimeDependencies({
      storage: memoryStorage,
      loadPreviewDirectoryHandle: async () => handle,
      loadSystemPackageFromDirectoryHandle: async () => ({ ok: false, issues: [{ level: "fatal", code: "MANIFEST_MISSING", text: "missing" }] }),
    });
    useRuntimeStore.setState({ currentPackage: minimalSystemPackage });
    await useRuntimeStore.getState().initialize();
    expect(useRuntimeStore.getState().authorPreviewActive).toBe(true);
    expect(useRuntimeStore.getState().bootStatus).toBe("error");
    expect(useRuntimeStore.getState().currentPackage).toBeNull();
    expect(useRuntimeStore.getState().packageIssues[0]?.code).toBe("MANIFEST_MISSING");
  });

});
