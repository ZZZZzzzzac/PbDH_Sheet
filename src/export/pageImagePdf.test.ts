import { describe, expect, it, vi } from "vitest";
import { exportSheetPagesToPdf } from "./pageImagePdf";

describe("Sheet Page image PDF export", () => {
  it("captures each Sheet Page once and writes one matching PDF page per image", async () => {
    document.body.innerHTML = '<main><article class="sheet-page">A</article><article class="sheet-page">B</article></main>';
    const pages = [...document.querySelectorAll<HTMLElement>(".sheet-page")];
    Object.defineProperties(pages[0], { scrollWidth: { value: 800 }, scrollHeight: { value: 1100 } });
    Object.defineProperties(pages[1], { scrollWidth: { value: 1200 }, scrollHeight: { value: 700 } });
    const capturePage = vi.fn(async (page: HTMLElement) => `data:image/png;base64,${page.textContent}`);
    const pdf = { addImage: vi.fn(), addPage: vi.fn(), save: vi.fn() };
    const createPdf = vi.fn(() => pdf);

    const count = await exportSheetPagesToPdf(document, "hero.pdf", { capturePage, createPdf });

    expect(count).toBe(2);
    expect(capturePage).toHaveBeenCalledTimes(2);
    expect(createPdf).toHaveBeenCalledWith(800, 1100);
    expect(pdf.addImage).toHaveBeenNthCalledWith(1, "data:image/png;base64,A", "PNG", 0, 0, 800, 1100);
    expect(pdf.addPage).toHaveBeenCalledWith([1200, 700], "landscape");
    expect(pdf.addImage).toHaveBeenNthCalledWith(2, "data:image/png;base64,B", "PNG", 0, 0, 1200, 700);
    expect(pdf.save).toHaveBeenCalledWith("hero.pdf");
  });

  it("rejects roots without a Sheet Page", async () => {
    await expect(exportSheetPagesToPdf(document.createElement("div"), "empty.pdf", {
      capturePage: vi.fn(),
      createPdf: vi.fn(),
    })).rejects.toThrow("没有找到可导出的 Sheet Page");
  });
});
