import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import type { CardInstance } from "./domain/cardEngine";
import { createCardTablePackage } from "./test/cardTablePackage";
import { createMemoryStorage } from "./test/memoryStorage";
import { configureRuntimeDependencies, resetRuntimeDependencies, useRuntimeStore } from "./store/runtimeStore";

afterEach(() => {
  resetRuntimeDependencies();
  vi.restoreAllMocks();
});

function cardInstance(instanceId: string, xPct: number, yPct: number, zIndex: number, rotation: number): CardInstance {
  return {
    instanceId,
    tableModuleId: "print-card-table",
    definitionRef: { type: "resourceLibrary", libraryId: "print-cards", entryId: `print-card:${instanceId}` },
    state: "configured",
    xPct,
    yPct,
    zIndex,
    face: "front",
    rotation,
    scale: 1,
    indicators: [],
  };
}

describe("App Card Table output layout", () => {
  it("restores Card Table positions, stacking, and rotation after print mode", async () => {
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({ ok: true, package: createCardTablePackage(), issues: [] }),
      storage: createMemoryStorage(),
      runValidationChecks: async () => [],
    });
    const printSpy = vi.fn();
    Object.defineProperty(window, "print", { value: printSpy, configurable: true });
    const user = userEvent.setup();
    render(<App />);

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });

    const data = useRuntimeStore.getState().characterData!;
    const instances = [cardInstance("card-1", 10, 20, 3, 90), cardInstance("card-2", 40, 50, 1, 0)];
    await act(async () => {
      useRuntimeStore.setState({ characterData: { ...data, cards: { instances } } });
    });

    await user.click(screen.getByRole("button", { name: "打开浏览器打印 PDF" }));
    await waitFor(() => expect(printSpy).toHaveBeenCalledTimes(1));
    const tidied = useRuntimeStore.getState().characterData!.cards.instances;
    expect(tidied.find((card) => card.instanceId === "card-1")).toMatchObject({ rotation: 0, zIndex: 1 });

    act(() => window.dispatchEvent(new Event("afterprint")));

    await waitFor(() => {
      const restored = useRuntimeStore.getState().characterData!.cards.instances;
      expect(restored.find((card) => card.instanceId === "card-1")).toMatchObject({ xPct: 10, yPct: 20, zIndex: 3, rotation: 90 });
      expect(restored.find((card) => card.instanceId === "card-2")).toMatchObject({ xPct: 40, yPct: 50, zIndex: 1, rotation: 0 });
    });
  });

  it("restores Card Table layout after exiting long screenshot mode", async () => {
    configureRuntimeDependencies({
      loadSystemPackageFromFile: async () => ({ ok: true, package: createCardTablePackage(), issues: [] }),
      storage: createMemoryStorage(),
      runValidationChecks: async () => [],
    });
    const user = userEvent.setup();
    render(<App />);

    await act(async () => {
      await useRuntimeStore.getState().uploadSystemPackageFromFile(new Blob());
    });

    const data = useRuntimeStore.getState().characterData!;
    const instances = [cardInstance("card-1", 12, 34, 5, 180)];
    await act(async () => {
      useRuntimeStore.setState({ characterData: { ...data, cards: { instances } } });
    });

    await user.click(screen.getByRole("button", { name: "进入长截图模式" }));
    await waitFor(() => expect(document.querySelector(".app-shell")).toHaveClass("long-screenshot-mode"));
    await waitFor(() => {
      expect(useRuntimeStore.getState().characterData!.cards.instances[0]).toMatchObject({ rotation: 0 });
    });

    await user.click(screen.getByRole("button", { name: "退出长截图模式" }));

    await waitFor(() => {
      expect(useRuntimeStore.getState().characterData!.cards.instances[0]).toMatchObject({ xPct: 12, yPct: 34, zIndex: 5, rotation: 180 });
    });
  });
});
