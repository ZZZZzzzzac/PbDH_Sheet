import { Archive, Download, ShieldCheck, Upload } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { exportCharacterData } from "./domain/characterData";
import type { PackageIssue } from "./domain/systemPackage";
import type { ValidationIssue } from "./domain/validationRunner";
import { SheetRenderer } from "./rendering/SheetRenderer";
import { useRuntimeStore } from "./store/runtimeStore";

function downloadCharacterJson(jsonText: string, fileName: string) {
  const blob = new Blob([jsonText], { type: "application/json" });
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

function ValidationIssueDialog({ issues, open, onClose }: { issues: ValidationIssue[]; open: boolean; onClose: () => void }) {
  if (!open) {
    return null;
  }

  return (
    <div className="validation-dialog-backdrop">
      <section className="validation-dialog" role="dialog" aria-modal="true" aria-label="Validation Report">
        <header className="validation-dialog-header">
          <h2>检查报告</h2>
          <button className="icon-button secondary-button" type="button" onClick={onClose} aria-label="关闭检查报告">
            <span>关闭</span>
          </button>
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
  const currentPackage = useRuntimeStore((state) => state.currentPackage);
  const characterData = useRuntimeStore((state) => state.characterData);
  const bootStatus = useRuntimeStore((state) => state.bootStatus);
  const storageStatus = useRuntimeStore((state) => state.storageStatus);
  const packageIssues = useRuntimeStore((state) => state.packageIssues);
  const validationIssues = useRuntimeStore((state) => state.validationIssues);
  const validationStatus = useRuntimeStore((state) => state.validationStatus);
  const importError = useRuntimeStore((state) => state.importError);
  const importNotice = useRuntimeStore((state) => state.importNotice);
  const initialize = useRuntimeStore((state) => state.initialize);
  const importCharacterDataFromText = useRuntimeStore((state) => state.importCharacterDataFromText);
  const uploadSystemPackageFromFile = useRuntimeStore((state) => state.uploadSystemPackageFromFile);
  const runValidationChecks = useRuntimeStore((state) => state.runValidationChecks);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const handleExport = () => {
    if (!characterData) {
      return;
    }

    const jsonText = exportCharacterData(characterData);
    downloadCharacterJson(jsonText, `${characterData.character.id}.json`);
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
    <div className="app-shell">
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
          <button className="icon-button" type="button" onClick={handleExport} aria-label="导出 Character JSON" disabled={!characterData}>
            <Download aria-hidden="true" size={18} />
            <span>导出</span>
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
            accept="application/json,.json"
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
      <ValidationIssueDialog issues={validationIssues} open={validationDialogOpen} onClose={() => setValidationDialogOpen(false)} />
      {currentPackage ? <SheetRenderer systemPackage={currentPackage} /> : null}
    </div>
  );
}
