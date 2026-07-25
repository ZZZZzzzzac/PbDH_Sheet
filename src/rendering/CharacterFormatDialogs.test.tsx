import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createEmptyCharacterData } from "../domain/characterData";
import type { CharacterAdapterConversion, CharacterAdapterExport } from "../domain/characterFormatAdapter";
import type { CharacterFormatAdapter } from "../domain/formatAdapter";
import { minimalSystemPackage } from "../test/fixtures";
import { CharacterExportDialog } from "./CharacterExportDialog";
import { CharacterImportDialogs } from "./CharacterImportDialogs";

const adapter = { ID: "external", 名称: "External", 载体: [], 导入脚本: "adapters/import.js", importScriptContent: "module.exports=()=>({values:{}})", 导出文件后缀: ".json" } as unknown as CharacterFormatAdapter;

describe("Character format dialogs", () => {
  it("shows ambiguity choices and a structured lossy-import report", () => {
    const onSelect = vi.fn(async () => {});
    const onConfirm = vi.fn(async () => {});
    const onCancel = vi.fn();
    const { rerender } = render(<CharacterImportDialogs pendingConversion={null} pendingSelection={{ text: "{}", fileName: "source.json", adapters: [{ ID: "a", 名称: "A" }, { ID: "b", 名称: "B" }] }} onSelect={onSelect} onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByRole("dialog", { name: "选择人物卡格式" })).toHaveTextContent("不会自动猜测");
    fireEvent.click(screen.getByRole("button", { name: "B" }));
    expect(onSelect).toHaveBeenCalledWith("b");

    const conversion: CharacterAdapterConversion = { adapter, data: createEmptyCharacterData(minimalSystemPackage), report: { convertedFields: 8, skippedFields: 2, matchedCards: 3, skippedCards: 1, convertedImages: 1, skippedImages: 1, diagnostics: [{ level: "warning", code: "LOSS", text: "Skipped" }] } };
    rerender(<CharacterImportDialogs pendingConversion={conversion} pendingSelection={null} onSelect={onSelect} onConfirm={onConfirm} onCancel={onCancel} />);
    const dialog = screen.getByRole("alertdialog", { name: "确认有损人物卡转换" });
    expect(dialog).toHaveTextContent("字段 8 已转换 / 2 跳过");
    expect(dialog).toHaveTextContent("Cards 3 已匹配 / 1 跳过");
    fireEvent.click(screen.getByRole("button", { name: "确认并新建存档" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("shows structured export losses and does not confirm when cancelled", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const conversion: CharacterAdapterExport = { adapter, document: {}, report: { exportedFields: 7, skippedFields: 2, exportedCards: 3, skippedCards: 1, exportedImages: 1, skippedImages: 1, diagnostics: [{ level: "warning", code: "EXPORT_LOSS", text: "Skipped" }] } };
    render(<CharacterExportDialog pending={{ conversion, fileName: "character.json" }} onConfirm={onConfirm} onCancel={onCancel} />);
    const dialog = screen.getByRole("alertdialog", { name: "确认有损人物卡导出" });
    expect(dialog).toHaveTextContent("已导出 7 个字段、3 张 Card、1 张图片");
    expect(dialog).toHaveTextContent("将跳过 2 个字段、1 张 Card、1 张图片");
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
