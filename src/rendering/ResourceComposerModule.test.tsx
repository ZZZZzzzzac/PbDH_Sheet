import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { createEmptyCharacterData } from "../domain/characterData";
import type { ResourceComposerModule as ResourceComposerModuleConfig, SystemPackage } from "../domain/systemPackage";
import { minimalSystemPackage } from "../test/fixtures";
import { useRuntimeStore } from "../store/runtimeStore";
import { ResourceComposerModule } from "./ResourceComposerModule";

const module: ResourceComposerModuleConfig = {
  ID: "compose-ancestry", 类型: "resourceComposer", 按钮文本: "组合种族",
  来源槽位: [
    { ID: "a", 标签: "特性 A 来源", 资源库ID: "ancestries" },
    { ID: "b", 标签: "特性 B 来源", 资源库ID: "ancestries" },
  ],
  输出字段: [
    { 字段: "特性A", 来源槽位ID: "a", 来源字段: "特性A" },
    { 字段: "特性B", 来源槽位ID: "b", 来源字段: "特性B" },
  ],
};

const systemPackage: SystemPackage = {
  ...minimalSystemPackage,
  modules: [...minimalSystemPackage.modules, module],
  resourceLibraries: [{
    ID: "ancestries", 名称: "种族", 路径: "ancestries.json",
    fields: [
      { key: "ID", label: "ID", visible: false, filterable: false, sortable: false, searchable: false },
      { key: "名称", label: "名称", visible: true, filterable: true, sortable: true, searchable: true },
      { key: "特性A", label: "特性A", visible: true, filterable: true, sortable: true, searchable: true },
      { key: "特性B", label: "特性B", visible: true, filterable: true, sortable: true, searchable: true },
    ],
    entries: [
      { ID: "elf", fields: { ID: "elf", 名称: "精灵", 特性A: "敏锐", 特性B: "冥想" } },
      { ID: "human", fields: { ID: "human", 名称: "人类", 特性A: "活力", 特性B: "应变" } },
    ],
  }],
};

describe("ResourceComposerModule", () => {
  beforeEach(() => {
    useRuntimeStore.setState({ currentPackage: systemPackage, characterData: createEmptyCharacterData(systemPackage) });
  });

  it("opens each source Library in sequence and commits after the final selection", async () => {
    const user = userEvent.setup();
    render(<ResourceComposerModule module={module} systemPackage={systemPackage} />);

    await user.click(screen.getByRole("button", { name: "组合种族" }));
    expect(screen.getByRole("dialog", { name: "请选择特性 A 来源" })).toBeVisible();
    await user.click(screen.getByRole("row", { name: /选择.*精灵/ }));
    expect(screen.getByRole("dialog", { name: "请选择特性 B 来源" })).toBeVisible();
    await user.click(screen.getByRole("row", { name: /选择.*人类/ }));

    expect(useRuntimeStore.getState().characterData?.compositeResources["compose-ancestry"].fields).toMatchObject({ 特性A: "敏锐", 特性B: "应变" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
