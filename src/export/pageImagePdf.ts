import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

interface PdfPageWriter {
  addImage(dataUrl: string, format: "PNG", x: number, y: number, width: number, height: number): void;
  addPage(format: [number, number], orientation: "portrait" | "landscape"): void;
  save(fileName: string): void;
}

interface PageImagePdfDependencies {
  capturePage: (page: HTMLElement) => Promise<string>;
  createPdf: (width: number, height: number) => PdfPageWriter;
}

const defaultDependencies: PageImagePdfDependencies = {
  capturePage: (page) => toPng(page, {
    backgroundColor: "#ffffff",
    cacheBust: true,
    pixelRatio: 2,
    width: page.scrollWidth,
    height: page.scrollHeight,
  }),
  createPdf: (width, height) => new jsPDF({
    orientation: orientationFor(width, height),
    unit: "px",
    format: [width, height],
    hotfixes: ["px_scaling"],
    compress: true,
  }),
};

export async function exportSheetPagesToPdf(
  root: ParentNode,
  fileName: string,
  dependencies: PageImagePdfDependencies = defaultDependencies,
): Promise<number> {
  const pages = [...root.querySelectorAll<HTMLElement>(".sheet-page")];
  if (pages.length === 0) throw new Error("没有找到可导出的 Sheet Page。");

  await document.fonts?.ready;
  let pdf: PdfPageWriter | null = null;

  for (const page of pages) {
    const width = Math.max(1, page.scrollWidth || page.clientWidth);
    const height = Math.max(1, page.scrollHeight || page.clientHeight);
    const image = await dependencies.capturePage(page);
    if (!pdf) pdf = dependencies.createPdf(width, height);
    else pdf.addPage([width, height], orientationFor(width, height));
    pdf.addImage(image, "PNG", 0, 0, width, height);
  }

  pdf!.save(fileName);
  return pages.length;
}

function orientationFor(width: number, height: number): "portrait" | "landscape" {
  return width > height ? "landscape" : "portrait";
}
