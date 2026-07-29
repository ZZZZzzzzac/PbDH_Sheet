import { useState } from "react";
import { exportCharacterData, type CharacterData } from "../../domain/characterData";
import { createCardTableLayout, type CardTableLayout } from "../../domain/cardEngine";
import type { SystemPackage } from "../../domain/systemPackage";
import type { ValidationIssue } from "../../domain/validationRunner";
import { printablePages } from "../pagePresentation";
import { waitForTextFits } from "../textFit";
import type { PendingCharacterExport } from "../CharacterExportDialog";
import { useRuntimeStore } from "../../store/runtimeStore";

export type OutputKind = "json" | "html" | "print";

interface SheetOutputOptions {
  currentPackage: SystemPackage | null;
  characterData: CharacterData | null;
  activeCharacterSaveName: string;
  cardTableCardWidths: Record<string, number>;
  tidyCardTable: (tableModuleId: string, layout: CardTableLayout) => void;
  runValidationChecks: () => Promise<void>;
  runPreOutputValidation: () => Promise<ValidationIssue[]>;
}

function downloadText(text: string, fileName: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function sanitizeFileName(name: string): string {
  const safe = name.trim().replace(/[<>:"/\\|?*]/g, "_");
  return safe || "character";
}

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function readCardTableSurfaceWidth(moduleId: string): number {
  const moduleElement = [...document.querySelectorAll<HTMLElement>(".card-table-module")].find((element) => element.dataset.moduleId === moduleId);
  return moduleElement?.querySelector<HTMLElement>(".card-table-surface")?.clientWidth ?? 800;
}

export function useSheetOutput({
  currentPackage,
  characterData,
  activeCharacterSaveName,
  cardTableCardWidths,
  tidyCardTable,
  runValidationChecks,
  runPreOutputValidation,
}: SheetOutputOptions) {
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [pendingOutput, setPendingOutput] = useState<OutputKind | null>(null);
  const [printMode, setPrintMode] = useState(false);
  const [pendingExternalExport, setPendingExternalExport] = useState<PendingCharacterExport | null>(null);

  const preparePrintableContent = async (tidyCardsForOutput = true) => {
    if (!currentPackage) return false;
    if (printablePages(currentPackage.pages, useRuntimeStore.getState().pageVisibility).length === 0) {
      useRuntimeStore.setState({ importNotice: "当前没有可打印页面。" });
      return false;
    }

    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setPrintMode(true);
    await nextFrame();
    await nextFrame();

    if (tidyCardsForOutput) {
      for (const module of currentPackage.modules) {
        if (module.类型 !== "cardTable") continue;
        const cardCount = characterData?.cards.instances.filter((instance) => instance.tableModuleId === module.ID).length ?? 0;
        tidyCardTable(
          module.ID,
          createCardTableLayout({
            surfaceWidthPx: readCardTableSurfaceWidth(module.ID),
            cardCount,
            preferredCardWidthPx: cardTableCardWidths[module.ID],
          }),
        );
      }
    }
    await nextFrame();
    await waitForTextFits(document.querySelector(".sheet-tool") ?? document);
    return true;
  };

  const performOutput = async (kind: OutputKind, printableContentPrepared = false) => {
    if (!characterData) return;
    const baseName = sanitizeFileName(activeCharacterSaveName);

    if (kind === "json") {
      downloadText(exportCharacterData(characterData), `${baseName}.json`, "application/json");
      return;
    }

    if (!printableContentPrepared && !(await preparePrintableContent())) return;
    const printableRoot = document.querySelector(".sheet-tool");
    if (kind === "html") {
      const { buildReadonlyHtmlSnapshot, waitForVisibleImages } = await import("../../export/output");
      try {
        await waitForVisibleImages(printableRoot ?? document);
        downloadText(await buildReadonlyHtmlSnapshot(characterData, printableRoot ?? undefined, activeCharacterSaveName), `${baseName}.html`, "text/html");
      } finally {
        setPrintMode(false);
      }
      return;
    }

    if (!printableRoot) {
      setPrintMode(false);
      return;
    }
    try {
      const { waitForVisibleImages } = await import("../../export/output");
      await waitForVisibleImages(printableRoot);
      window.print();
    } finally {
      setPrintMode(false);
    }
  };

  const beginOutput = async (kind: OutputKind) => {
    let frameworkIssues: ValidationIssue[] = [];
    let printableContentPrepared = false;
    if (kind !== "json") {
      printableContentPrepared = await preparePrintableContent();
      if (!printableContentPrepared) return;
      const { collectFrameworkValidationIssues } = await import("../frameworkChecks");
      frameworkIssues = collectFrameworkValidationIssues(document.querySelector(".sheet-tool") ?? document);
    }
    const issues = [...frameworkIssues, ...(await runPreOutputValidation())];
    useRuntimeStore.setState({ validationIssues: issues });
    if (issues.length > 0) {
      setPendingOutput(kind);
      setValidationDialogOpen(true);
      return;
    }
    await performOutput(kind, printableContentPrepared);
  };

  const exportWithCharacterAdapter = async (adapterId: string) => {
    if (!characterData || !currentPackage) return;
    const adapter = currentPackage.characterFormatAdapters?.find((candidate) => candidate.ID === adapterId);
    if (!adapter?.exportScriptContent) return;
    const { exportExternalCharacterData } = await import("../../domain/characterFormatAdapter");
    const result = await exportExternalCharacterData(characterData, adapter, currentPackage);
    if ("error" in result) {
      useRuntimeStore.setState({ importError: result.error.text });
      return;
    }
    const { report } = result;
    const fileName = `${sanitizeFileName(activeCharacterSaveName)}.${adapter.ID}.json`;
    if (report.skippedFields + report.skippedCards + report.skippedImages > 0) {
      setPendingExternalExport({ conversion: result, fileName });
      return;
    }
    downloadText(`${JSON.stringify(result.document, null, 2)}\n`, fileName, "application/json");
  };

  const handleValidation = async () => {
    let frameworkIssues: ValidationIssue[] = [];
    if (await preparePrintableContent(false)) {
      const { collectFrameworkValidationIssues } = await import("../frameworkChecks");
      frameworkIssues = collectFrameworkValidationIssues(document.querySelector(".sheet-tool") ?? document);
      setPrintMode(false);
    }
    await runValidationChecks();
    useRuntimeStore.setState({ validationIssues: [...frameworkIssues, ...useRuntimeStore.getState().validationIssues] });
    setValidationDialogOpen(true);
  };

  const closeValidationDialog = () => {
    if (pendingOutput) setPrintMode(false);
    setPendingOutput(null);
    setValidationDialogOpen(false);
  };

  const continuePendingOutput = pendingOutput
    ? () => {
        const output = pendingOutput;
        setPendingOutput(null);
        setValidationDialogOpen(false);
        void performOutput(output, output !== "json");
      }
    : undefined;

  const confirmExternalExport = () => {
    if (!pendingExternalExport) return;
    downloadText(`${JSON.stringify(pendingExternalExport.conversion.document, null, 2)}\n`, pendingExternalExport.fileName, "application/json");
    setPendingExternalExport(null);
  };

  return {
    printMode,
    validationDialogOpen,
    pendingExternalExport,
    beginOutput,
    exportWithCharacterAdapter,
    handleValidation,
    closeValidationDialog,
    continuePendingOutput,
    cancelExternalExport: () => setPendingExternalExport(null),
    confirmExternalExport,
  };
}
