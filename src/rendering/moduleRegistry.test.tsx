import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createEmptyCharacterData } from "../domain/characterData";
import type { SystemPackage } from "../domain/systemPackage";
import { moduleDemoSystemPackage } from "../test/fixtures";
import { useRuntimeStore } from "../store/runtimeStore";
import { SheetRenderer } from "./SheetRenderer";

function renderModuleDemo(systemPackage: SystemPackage = moduleDemoSystemPackage, packageAssetUrls: Record<string, string> = {}) {
  useRuntimeStore.setState({
    currentPackage: systemPackage,
    packageAssetUrls,
    characterData: createEmptyCharacterData(systemPackage),
    packageIssues: [],
    bootStatus: "ready",
    storageStatus: "idle",
    importError: null,
    importNotice: null,
  });

  return render(<SheetRenderer systemPackage={systemPackage} />);
}

describe("Module Registry rendering", () => {
  beforeEach(() => {
    useRuntimeStore.setState({
      currentPackage: null,
      packageAssetUrls: {},
      characterData: null,
      packageIssues: [],
      bootStatus: "idle",
      storageStatus: "idle",
      importError: null,
      importNotice: null,
    });
  });

  it("renders the phase 5 simple module set through SheetRenderer", () => {
    renderModuleDemo(moduleDemoSystemPackage, { "demo-emblem": "data:image/svg+xml;base64,PHN2Zy8+" });

    expect(screen.getByLabelText("姓名")).toBeVisible();
    expect(screen.getByLabelText("背景")).toBeVisible();
    expect(screen.getByRole("group", { name: "标记" })).toBeVisible();
    expect(screen.getByLabelText("气力")).toHaveValue("3");
    expect(screen.getByText("只读展示模块不会写入 Character Data。这里适合放规则提示、检查清单或静态说明。")).toBeVisible();
    expect(screen.getByAltText("阶段5示例徽记")).toBeVisible();
    expect(screen.getByRole("button", { name: "上传图片" })).toBeVisible();
  });

  it("renders HTML Layout Template content and module slots", () => {
    const result = renderModuleDemo(moduleDemoSystemPackage, { "demo-emblem": "data:image/svg+xml;base64,PHN2Zy8+" });

    expect(result.container.querySelector(".demo-sheet")).not.toBeNull();
    expect(result.container.querySelector(".identity")).not.toBeNull();
    expect(result.container.querySelector('[data-module-slot-id="background"]')).not.toBeNull();
    expect(result.container.querySelector("style")?.textContent).toContain('[data-template-page-id="main"] .identity');
  });

  it("updates editable module state by module ID and leaves read-only display unstored", () => {
    renderModuleDemo();

    fireEvent.change(screen.getByLabelText("背景"), {
      target: { value: "第一行\n第二行" },
    });
    fireEvent.click(screen.getByLabelText("受伤"));
    fireEvent.click(screen.getByRole("button", { name: "气力增加" }));
    fireEvent.click(screen.getByRole("button", { name: "气力增加" }));
    fireEvent.click(screen.getByRole("button", { name: "气力增加" }));
    fireEvent.click(screen.getByRole("button", { name: "气力增加" }));

    const values = useRuntimeStore.getState().characterData?.character.values;
    expect(values?.background).toBe("第一行\n第二行");
    expect(values?.conditions).toEqual({
      wounded: true,
      exhausted: false,
      inspired: true,
    });
    expect(values?.vitality).toEqual({ current: 6, max: 6 });
    expect(screen.getByRole("button", { name: "气力增加" })).toBeDisabled();
    expect(values?.["rule-note"]).toBeUndefined();
    expect(values?.["sect-emblem"]).toBeUndefined();
    expect(values?.portrait).toBeUndefined();
  });

  it("shows an image fallback when the package asset has no resolved URL", () => {
    renderModuleDemo();

    expect(screen.getByRole("img", { name: "阶段5示例徽记" })).toHaveTextContent("图片不可用");
  });

  it("lets the player edit the countable resource max when configured", () => {
    renderModuleDemo();

    const maxInput = screen.getByLabelText("气力上限");
    expect(maxInput).toHaveValue("6");

    fireEvent.change(maxInput, { target: { value: "10" } });
    expect(screen.getByRole("button", { name: "气力增加" })).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "气力增加" }));
    fireEvent.click(screen.getByRole("button", { name: "气力增加" }));
    fireEvent.click(screen.getByRole("button", { name: "气力增加" }));
    fireEvent.click(screen.getByRole("button", { name: "气力增加" }));

    const values = useRuntimeStore.getState().characterData?.character.values;
    expect(values?.vitality).toEqual({ current: 7, max: 10 });
  });
});
