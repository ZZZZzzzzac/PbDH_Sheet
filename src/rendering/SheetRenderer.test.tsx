import { act, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createEmptyCharacterData } from "../domain/characterData";
import { useRuntimeStore } from "../store/runtimeStore";
import { moduleDemoSystemPackage } from "../test/fixtures";
import { renderModuleDemo, resetModuleRegistryTestState } from "./moduleRegistry.testSupport";

afterEach(() => {
  cleanup();
  resetModuleRegistryTestState();
});

describe("SheetRenderer sheet value data attributes", () => {
  it("omits data-value attributes for empty freeText values", () => {
    const { container } = renderModuleDemo();
    const root = container.querySelector("[data-system-package-id]");
    expect(root).not.toBeNull();
    expect(root?.hasAttribute("data-value-character-name")).toBe(false);
  });

  it("exposes trimmed non-empty freeText values and skips non-freeText modules", () => {
    const { container } = renderModuleDemo();
    const characterData = createEmptyCharacterData(moduleDemoSystemPackage);
    characterData.character.values["character-name"] = "  奇迹  ";
    characterData.character.values["background"] = "longText 不应暴露";

    act(() => {
      useRuntimeStore.setState({ characterData });
    });

    const root = container.querySelector("[data-system-package-id]");
    expect(root?.getAttribute("data-value-character-name")).toBe("奇迹");
    expect(root?.hasAttribute("data-value-background")).toBe(false);

    act(() => {
      useRuntimeStore.setState({ characterData: createEmptyCharacterData(moduleDemoSystemPackage) });
    });
    expect(root?.hasAttribute("data-value-character-name")).toBe(false);
  });
});
