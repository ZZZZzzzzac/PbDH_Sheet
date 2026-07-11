import { describe, expect, it } from "vitest";
import type { PackagePage } from "../domain/systemPackage";
import { printablePages, resolveCurrentPageId, runtimeVisiblePages } from "./pagePresentation";

const page = (ID: string, options: Partial<PackagePage> = {}): PackagePage => ({ ID, 名称: ID, layout: { 类型: "htmlTemplate", htmlContent: "<main></main>" }, ...options });

describe("page presentation policy", () => {
  it("keeps visible declaration order and falls back current page", () => {
    const visible = runtimeVisiblePages([page("a"), page("b", { 默认隐藏: true }), page("c")], { b: true });
    expect(visible.map((item) => item.ID)).toEqual(["a", "b", "c"]);
    expect(resolveCurrentPageId(visible, "missing")).toBe("a");
  });
  it("applies print overrides before runtime visibility", () => {
    const pages = [page("visible"), page("hidden", { 默认隐藏: true }), page("forced", { 默认隐藏: true, 打印: true }), page("excluded", { 打印: false })];
    expect(printablePages(pages, {}).map((item) => item.ID)).toEqual(["visible", "forced"]);
  });
});
