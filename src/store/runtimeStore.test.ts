import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StorageService } from "../storage/storageService";
import { minimalSystemPackage } from "../test/fixtures";
import { configureRuntimeDependencies, resetRuntimeDependencies, useRuntimeStore } from "./runtimeStore";

function createMemoryStorage(): StorageService {
  let savedData: Awaited<ReturnType<StorageService["loadCurrentCharacterData"]>> = null;

  return {
    async loadCurrentCharacterData(packageId) {
      if (savedData?.systemPackage.id !== packageId) {
        return null;
      }
      return savedData;
    },
    async saveCurrentCharacterData(data) {
      savedData = data;
    },
  };
}

describe("runtime store", () => {
  beforeEach(async () => {
    configureRuntimeDependencies({
      loadSystemPackage: async () => ({ ok: true, package: minimalSystemPackage, issues: [] }),
      storage: createMemoryStorage(),
    });
    useRuntimeStore.setState({
      currentPackage: null,
      characterData: null,
      packageIssues: [],
      bootStatus: "idle",
      storageStatus: "idle",
      importError: null,
      importNotice: null,
    });
    await useRuntimeStore.getState().initialize();
  });

  afterEach(() => {
    resetRuntimeDependencies();
    vi.restoreAllMocks();
  });

  it("updates Character Data through updateModuleValue and autosaves", async () => {
    renderHook(() => useRuntimeStore());

    act(() => {
      useRuntimeStore.getState().updateModuleValue("character-name", "阿青");
    });

    expect(useRuntimeStore.getState().characterData?.character.values["character-name"]).toBe("阿青");
    expect(useRuntimeStore.getState().storageStatus).toBe("saving");

    await waitFor(() => {
      expect(useRuntimeStore.getState().storageStatus).toBe("saved");
    });

    const characterData = useRuntimeStore.getState().characterData;
    expect(characterData).not.toBeNull();
    useRuntimeStore.setState({ characterData: characterData ? { ...characterData, character: { id: "current-character", values: {} } } : null });
    await useRuntimeStore.getState().initialize();

    expect(useRuntimeStore.getState().characterData?.character.values["character-name"]).toBe("阿青");
  });
});
