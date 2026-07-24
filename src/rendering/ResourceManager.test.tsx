import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createEffectiveResourceCatalog } from "../domain/effectiveResourceCatalog";
import { loadResourceExtensionJson } from "../domain/resourceExtension";
import { minimalSystemPackage } from "../test/fixtures";
import { ResourceManager } from "./ResourceManager";

describe("Resource Manager", () => {
  const workflowProps = {
    systemPackage: minimalSystemPackage,
    assetUrls: {},
    pendingReplacement: null,
    pendingConversion: null,
    pendingSelection: null,
    pendingRemoval: null,
    referenceIssues: [],
    onConfirmReplacement: async () => {},
    onCancelReplacement: () => {},
    onSelectFormat: async () => {},
    onConfirmConversion: async () => {},
    onCancelConversion: () => {},
    onRequestRemoval: () => {},
    onConfirmRemoval: async () => {},
    onCancelRemoval: () => {},
  };

  it("lists effective Libraries by contributor and uploads JSON Extensions", async () => {
    const loaded = loadResourceExtensionJson(JSON.stringify({
      ID: "void", 名称: "虚空", 版本: "1", 目标系统包ID: minimalSystemPackage.manifest.ID,
      resourceLibraries: [{ ID: "void-library", 名称: "虚空资源", entries: [{ ID: "void-entry", 名称: "虚空条目" }] }],
    }), minimalSystemPackage.manifest.ID);
    if (!loaded.ok) throw new Error(JSON.stringify(loaded.issues));
    const onUpload = vi.fn(async () => {});
    render(<ResourceManager {...workflowProps} catalog={createEffectiveResourceCatalog(minimalSystemPackage, [loaded.extension])} importState={null} onUpload={onUpload} onClose={() => {}} />);

    expect(screen.getByRole("dialog", { name: "Resource Manager" })).toHaveTextContent("虚空资源");
    expect(screen.getByText("void-library")).toBeVisible();
    expect(screen.getByText("Extension")).toBeVisible();
    expect(screen.getByText("void")).toBeVisible();

    const file = new File([loaded.normalizedJson], "void.json", { type: "application/json" });
    fireEvent.change(screen.getByLabelText("上传 Resource Extension"), { target: { files: [file] } });
    await waitFor(() => expect(onUpload).toHaveBeenCalledWith(file));
  });

  it("shows atomic errors and generated-ID download affordance", () => {
    const catalog = createEffectiveResourceCatalog(minimalSystemPackage, []);
    const { rerender } = render(<ResourceManager {...workflowProps} catalog={catalog} importState={{
      status: "error",
      issues: [{ level: "error", code: "RESOURCE_ENTRY_ID_CONFLICT", text: "冲突" }],
    }} onUpload={async () => {}} onClose={() => {}} />);
    expect(screen.getByRole("alert")).toHaveTextContent("现有资源未改变");
    expect(screen.getByRole("alert")).toHaveTextContent("RESOURCE_ENTRY_ID_CONFLICT");

    rerender(<ResourceManager {...workflowProps} catalog={catalog} importState={{
      status: "success",
      extensionId: "generated",
      contributionCount: 1,
      entryCount: 2,
      generatedIds: [{ kind: "extension", path: "ID", value: "generated" }],
      normalizedArtifact: { fileName: "generated.normalized.json", mimeType: "application/json", bytes: new TextEncoder().encode("{}\n") },
      issues: [],
    }} onUpload={async () => {}} onClose={() => {}} />);
    expect(screen.getByRole("button", { name: "下载规范化 JSON" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("原文件不适合作为可靠更新源");
  });

  it("shows replacement and uninstall impact before calling domain workflow actions", () => {
    const loaded = loadResourceExtensionJson(JSON.stringify({
      ID: "replace", 名称: "替换测试", 版本: "2", 目标系统包ID: minimalSystemPackage.manifest.ID,
      resourceLibraries: [{ ID: "library", 名称: "资源", entries: [{ ID: "entry", 名称: "条目" }] }],
    }), minimalSystemPackage.manifest.ID);
    if (!loaded.ok) throw new Error(JSON.stringify(loaded.issues));
    const cancelReplacement = vi.fn();
    const confirmRemoval = vi.fn(async () => {});
    const catalog = createEffectiveResourceCatalog(minimalSystemPackage, [loaded.extension]);
    const { rerender } = render(<ResourceManager {...workflowProps} catalog={catalog} importState={null} pendingReplacement={{
      extension: loaded.extension, assets: [], generatedIds: [], issues: [],
      normalizedArtifact: { fileName: "replace.json", mimeType: "application/json", bytes: new Uint8Array() },
      differences: [{ libraryId: "library", added: 1, removed: 2, retained: 3 }], previousImageCount: 4, nextImageCount: 5,
    }} onCancelReplacement={cancelReplacement} onUpload={async () => {}} onClose={() => {}} />);
    expect(screen.getByRole("alertdialog", { name: "确认替换 Resource Extension" })).toHaveTextContent("新增 1 / 删除 2 / 保留 3");
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(cancelReplacement).toHaveBeenCalledOnce();

    rerender(<ResourceManager {...workflowProps} catalog={catalog} importState={null} pendingRemoval={{
      extensionId: "replace", extensionName: "替换测试", libraries: [{ libraryId: "library", entryCount: 3 }], imageCount: 2, staleReferenceCount: 1,
    }} onConfirmRemoval={confirmRemoval} onUpload={async () => {}} onClose={() => {}} />);
    expect(screen.getByRole("alertdialog", { name: "确认卸载 Resource Extension" })).toHaveTextContent("Character Data 不会修改");
    fireEvent.click(screen.getByRole("button", { name: "确认卸载" }));
    expect(confirmRemoval).toHaveBeenCalledOnce();
  });

  it("requires explicit format selection and confirmation before an external conversion", () => {
    const loaded = loadResourceExtensionJson(JSON.stringify({
      ID: "converted", 名称: "Converted", 版本: "1", 目标系统包ID: minimalSystemPackage.manifest.ID,
      resourceLibraries: [{ ID: "library", 名称: "Library", entries: [{ ID: "entry", 名称: "Entry" }] }],
    }), minimalSystemPackage.manifest.ID);
    if (!loaded.ok) throw new Error(JSON.stringify(loaded.issues));
    const onSelect = vi.fn(async () => {});
    const onConfirm = vi.fn(async () => {});
    const onCancel = vi.fn();
    const catalog = createEffectiveResourceCatalog(minimalSystemPackage, []);
    const { rerender } = render(<ResourceManager {...workflowProps} catalog={catalog} importState={null} pendingSelection={{ file: new File(["[]"], "source.json"), adapters: [{ ID: "a", 名称: "Format A" }, { ID: "b", 名称: "Format B" }] }} onSelectFormat={onSelect} onCancelConversion={onCancel} onUpload={async () => {}} onClose={() => {}} />);
    expect(screen.getByRole("alertdialog", { name: "选择资源格式" })).toHaveTextContent("选择前不会写入资源目录");
    fireEvent.click(screen.getByRole("button", { name: "Format B" }));
    expect(onSelect).toHaveBeenCalledWith("b");

    rerender(<ResourceManager {...workflowProps} catalog={catalog} importState={null} pendingConversion={{ loaded: {
      ok: true, extension: loaded.extension, assets: [], generatedIds: [], issues: [{ level: "warning", code: "LOSS", text: "Skipped" }],
      normalizedArtifact: { fileName: "converted.json", mimeType: "application/json", bytes: new Uint8Array() },
      conversion: { adapterId: "a", adapterName: "Format A", counts: { sourceEntries: 3, convertedEntries: 2, skippedEntries: 1, convertedFields: 4, skippedFields: 1, boundImages: 1, orphanImages: 2 } },
    } }} onConfirmConversion={onConfirm} onCancelConversion={onCancel} onUpload={async () => {}} onClose={() => {}} />);
    expect(screen.getByRole("alertdialog", { name: "确认外部资源转换" })).toHaveTextContent("来源 3 · 已转换 2 · 跳过 1");
    expect(screen.getByRole("alertdialog", { name: "确认外部资源转换" })).toHaveTextContent("图片 1 绑定 / 2 孤立");
    fireEvent.click(screen.getByRole("button", { name: "确认安装" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
