import { Archive, Copy, Download, FileText, Plus, Printer, ShieldCheck, Trash2, Type, Upload } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { exportCharacterData } from "./domain/characterData";
import { createCardTableLayout } from "./domain/cardEngine";
import type { PackageIssue } from "./domain/systemPackage";
import type { ValidationIssue } from "./domain/validationRunner";
import { buildReadonlyHtmlSnapshot, waitForVisibleImages } from "./export/output";
import { SheetRenderer } from "./rendering/SheetRenderer";
import { useRuntimeStore } from "./store/runtimeStore";

type OutputKind = "json" | "html" | "print";

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

function PackageIssuePanel({ issues }: { issues: PackageIssue[] }) {
  return (
    <section className="error-panel" role="alert" aria-label="System Package error">
      <h2>System Package 错误</h2>
      <ul>
        {issues.map((issue) => (
          <li key={`${issue.code}-${issue.path ?? issue.text}`}>
            <strong>{issue.code}</strong>
            {issue.path ? ` ${issue.path}: ` : " "}
            {issue.text}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ValidationIssueDialog({
  issues,
  open,
  onClose,
  onContinue,
}: {
  issues: ValidationIssue[];
  open: boolean;
  onClose: () => void;
  onContinue?: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="validation-dialog-backdrop">
      <section className="validation-dialog" role="dialog" aria-modal="true" aria-label="Validation Report">
        <header className="validation-dialog-header">
          <h2>检查报告</h2>
          <div className="dialog-actions">
            {onContinue ? (
              <button className="icon-button" type="button" onClick={onContinue} aria-label="继续输出">
                <span>继续</span>
              </button>
            ) : null}
            <button className="icon-button secondary-button" type="button" onClick={onClose} aria-label={onContinue ? "取消输出" : "关闭检查报告"}>
              <span>{onContinue ? "取消" : "关闭"}</span>
            </button>
          </div>
        </header>
        <div className="validation-dialog-body">
          {issues.length === 0 ? (
            <p className="validation-empty">未发现问题。</p>
          ) : (
            <ul>
              {issues.map((issue, index) => (
                <li className={`validation-issue validation-${issue.level}`} key={`${issue.source}-${issue.code ?? issue.text}-${index}`}>
                  <strong>{issue.level}</strong>
                  {issue.code ? ` ${issue.code}` : ""} {issue.path ? `${issue.path}: ` : ""}
                  {issue.text}
                  <span className="validation-source">{issue.source}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const characterFileInputRef = useRef<HTMLInputElement>(null);
  const packageFileInputRef = useRef<HTMLInputElement>(null);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [pendingOutput, setPendingOutput] = useState<OutputKind | null>(null);
  const [printMode, setPrintMode] = useState(false);
  const currentPackage = useRuntimeStore((state) => state.currentPackage);
  const characterData = useRuntimeStore((state) => state.characterData);
  const characterSaves = useRuntimeStore((state) => state.characterSaves);
  const activeCharacterSaveId = useRuntimeStore((state) => state.activeCharacterSaveId);
  const cardTableCardWidths = useRuntimeStore((state) => state.cardTableCardWidths);
  const bootStatus = useRuntimeStore((state) => state.bootStatus);
  const storageStatus = useRuntimeStore((state) => state.storageStatus);
  const packageIssues = useRuntimeStore((state) => state.packageIssues);
  const validationIssues = useRuntimeStore((state) => state.validationIssues);
  const validationStatus = useRuntimeStore((state) => state.validationStatus);
  const importError = useRuntimeStore((state) => state.importError);
  const importNotice = useRuntimeStore((state) => state.importNotice);
  const initialize = useRuntimeStore((state) => state.initialize);
  const createCharacterSave = useRuntimeStore((state) => state.createCharacterSave);
  const switchCharacterSave = useRuntimeStore((state) => state.switchCharacterSave);
  const renameCharacterSave = useRuntimeStore((state) => state.renameCharacterSave);
  const duplicateCharacterSave = useRuntimeStore((state) => state.duplicateCharacterSave);
  const deleteCharacterSave = useRuntimeStore((state) => state.deleteCharacterSave);
  const importCharacterDataFromText = useRuntimeStore((state) => state.importCharacterDataFromText);
  const uploadSystemPackageFromFile = useRuntimeStore((state) => state.uploadSystemPackageFromFile);
  const runValidationChecks = useRuntimeStore((state) => state.runValidationChecks);
  const runPreOutputValidation = useRuntimeStore((state) => state.runPreOutputValidation);
  const tidyCardTable = useRuntimeStore((state) => state.tidyCardTable);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (!printMode) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPrintMode(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [printMode]);

  const performOutput = async (kind: OutputKind) => {
    if (!characterData) {
      return;
    }

    if (kind === "json") {
      downloadText(exportCharacterData(characterData), `${characterData.character.id}.json`, "application/json");
      return;
    }

    if (kind === "html") {
      await preparePrintableContent();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const printableRoot = document.querySelector(".sheet-tool");
      await waitForVisibleImages(printableRoot ?? document);
      downloadText(buildReadonlyHtmlSnapshot(characterData, printableRoot ?? undefined), `${characterData.character.id}.html`, "text/html");
      return;
    }

    await preparePrintableContent();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await waitForVisibleImages(document.querySelector(".sheet-tool") ?? document);
    window.print();
  };

  const beginOutput = async (kind: OutputKind) => {
    const result = await runPreOutputValidation();
    if (result.shouldPrompt) {
      setPendingOutput(kind);
      setValidationDialogOpen(true);
      return;
    }

    await performOutput(kind);
  };

  const preparePrintableContent = async () => {
    if (!currentPackage) {
      return;
    }

    for (const module of currentPackage.modules) {
      if (module.类型 === "cardTable") {
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
    setPrintMode(true);
  };

  const handleValidation = async () => {
    await runValidationChecks();
    setValidationDialogOpen(true);
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await importCharacterDataFromText(await file.text());
    event.target.value = "";
  };

  const handleCreateSave = async () => {
    const name = window.prompt("新角色存档名称", "未命名角色")?.trim();
    await createCharacterSave(name || "未命名角色");
  };

  const handleRenameSave = async () => {
    if (!activeCharacterSaveId) {
      return;
    }
    const currentName = characterSaves.find((save) => save.id === activeCharacterSaveId)?.name ?? "未命名角色";
    const name = window.prompt("角色存档名称", currentName)?.trim();
    if (name) {
      await renameCharacterSave(activeCharacterSaveId, name);
    }
  };

  const handleDuplicateSave = async () => {
    if (!activeCharacterSaveId) {
      return;
    }
    await duplicateCharacterSave(activeCharacterSaveId);
  };

  const handleDeleteSave = async () => {
    if (!activeCharacterSaveId || !window.confirm("删除当前角色存档？")) {
      return;
    }
    await deleteCharacterSave(activeCharacterSaveId);
  };

  const handlePackageFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await uploadSystemPackageFromFile(file);
    event.target.value = "";
  };

  const hasBlockingPackageIssues = packageIssues.some((issue) => issue.level === "fatal" || issue.level === "error");

  return (
    <div className={`app-shell${printMode ? " print-mode" : ""}`}>
      <header className="top-bar">
        <div className="brand-block">
          <span className="brand-mark">PbDH</span>
          <div>
            <p className="eyebrow">Base Framework</p>
            <h1>Sheet Tool</h1>
          </div>
        </div>

        <div className="toolbar" aria-label="Character Data actions">
          <span className={`status-pill status-${storageStatus}`} aria-live="polite">
            {storageStatus === "saving"
              ? "保存中"
              : storageStatus === "saved"
                ? "已保存"
                : storageStatus === "error"
                  ? "保存错误"
                  : bootStatus === "loading"
                    ? "加载中"
                    : bootStatus === "error"
                      ? "加载错误"
                      : currentPackage
                        ? "就绪"
                        : "未加载"}
          </span>
          <button className="icon-button" type="button" onClick={() => void beginOutput("json")} aria-label="导出 Character JSON" disabled={!characterData}>
            <Download aria-hidden="true" size={18} />
            <span>JSON</span>
          </button>
          <button className="icon-button" type="button" onClick={() => void beginOutput("html")} aria-label="导出 HTML snapshot" disabled={!characterData}>
            <FileText aria-hidden="true" size={18} />
            <span>HTML</span>
          </button>
          <button className="icon-button" type="button" onClick={() => void preparePrintableContent()} aria-label="进入导出预览" disabled={!characterData}>
            <Printer aria-hidden="true" size={18} />
            <span>预览</span>
          </button>
          <button className="icon-button" type="button" onClick={() => void beginOutput("print")} aria-label="浏览器打印" disabled={!characterData}>
            <Printer aria-hidden="true" size={18} />
            <span>打印</span>
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={handleValidation}
            aria-label="运行 Validation Checks"
            disabled={!characterData || validationStatus === "running"}
          >
            <ShieldCheck aria-hidden="true" size={18} />
            <span>{validationStatus === "running" ? "检查中" : "检查"}</span>
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={() => characterFileInputRef.current?.click()}
            aria-label="导入 Character JSON"
            disabled={!currentPackage}
          >
            <Upload aria-hidden="true" size={18} />
            <span>导入</span>
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={() => packageFileInputRef.current?.click()}
            aria-label="导入 System Package zip"
            disabled={bootStatus === "loading"}
          >
            <Archive aria-hidden="true" size={18} />
            <span>系统包</span>
          </button>
          <input
            ref={characterFileInputRef}
            className="visually-hidden"
            type="file"
            accept="application/json,text/html,.json,.html,.htm"
            onChange={handleImportFile}
          />
          <input
            ref={packageFileInputRef}
            className="visually-hidden"
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            onChange={handlePackageFile}
          />
        </div>
      </header>

      {currentPackage && characterData ? (
        <section className="save-manager" aria-label="Character Saves">
          <select
            className="save-select"
            aria-label="选择 Character Save"
            value={activeCharacterSaveId ?? ""}
            onChange={(event) => void switchCharacterSave(event.target.value)}
          >
            {characterSaves.map((save) => (
              <option value={save.id} key={save.id}>
                {save.name}
              </option>
            ))}
          </select>
          <button className="icon-button secondary-button" type="button" onClick={() => void handleCreateSave()} aria-label="新建 Character Save">
            <Plus aria-hidden="true" size={16} />
            <span>新建</span>
          </button>
          <button className="icon-button secondary-button" type="button" onClick={() => void handleRenameSave()} aria-label="重命名 Character Save">
            <Type aria-hidden="true" size={16} />
            <span>重命名</span>
          </button>
          <button className="icon-button secondary-button" type="button" onClick={() => void handleDuplicateSave()} aria-label="复制 Character Save">
            <Copy aria-hidden="true" size={16} />
            <span>复制</span>
          </button>
          <button className="icon-button secondary-button" type="button" onClick={() => void handleDeleteSave()} aria-label="删除 Character Save">
            <Trash2 aria-hidden="true" size={16} />
            <span>删除</span>
          </button>
        </section>
      ) : null}

      {printMode ? (
        <section className="print-preview-bar" aria-label="导出预览">
          <span>导出预览</span>
          <button className="icon-button secondary-button" type="button" onClick={() => setPrintMode(false)} aria-label="退出导出预览">
            <span>退出</span>
          </button>
          <button className="icon-button" type="button" onClick={() => void beginOutput("print")} aria-label="从预览打印">
            <Printer aria-hidden="true" size={18} />
            <span>打印</span>
          </button>
        </section>
      ) : null}

      {currentPackage ? (
        <div className="runtime-strip">
          <span>{currentPackage.manifest.名称}</span>
          <span>{currentPackage.manifest.ID}</span>
          <span>v{currentPackage.manifest.版本}</span>
        </div>
      ) : null}

      {importError ? (
        <div className="message message-error" role="alert">
          {importError}
        </div>
      ) : null}

      {importNotice ? (
        <div className="message message-info" role="status">
          {importNotice}
        </div>
      ) : null}

      {bootStatus === "error" || hasBlockingPackageIssues ? <PackageIssuePanel issues={packageIssues} /> : null}
      <ValidationIssueDialog
        issues={validationIssues}
        open={validationDialogOpen}
        onClose={() => {
          setPendingOutput(null);
          setValidationDialogOpen(false);
        }}
        onContinue={
          pendingOutput
            ? () => {
                const output = pendingOutput;
                setPendingOutput(null);
                setValidationDialogOpen(false);
                void performOutput(output);
              }
            : undefined
        }
      />
      {currentPackage ? <SheetRenderer systemPackage={currentPackage} /> : null}
    </div>
  );
}

function readCardTableSurfaceWidth(moduleId: string): number {
  const moduleElement = [...document.querySelectorAll<HTMLElement>(".card-table-module")].find((element) => element.dataset.moduleId === moduleId);
  const surface = moduleElement?.querySelector<HTMLElement>(".card-table-surface");
  return surface?.clientWidth ?? 800;
}
