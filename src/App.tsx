import { Download, Upload } from "lucide-react";
import { useEffect, useRef, type ChangeEvent } from "react";
import { exportCharacterData } from "./domain/characterData";
import type { PackageIssue } from "./domain/systemPackage";
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

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentPackage = useRuntimeStore((state) => state.currentPackage);
  const characterData = useRuntimeStore((state) => state.characterData);
  const bootStatus = useRuntimeStore((state) => state.bootStatus);
  const storageStatus = useRuntimeStore((state) => state.storageStatus);
  const packageIssues = useRuntimeStore((state) => state.packageIssues);
  const importError = useRuntimeStore((state) => state.importError);
  const importNotice = useRuntimeStore((state) => state.importNotice);
  const initialize = useRuntimeStore((state) => state.initialize);
  const importCharacterDataFromText = useRuntimeStore((state) => state.importCharacterDataFromText);

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

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await importCharacterDataFromText(await file.text());
    event.target.value = "";
  };

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
                      : "就绪"}
          </span>
          <button className="icon-button" type="button" onClick={handleExport} aria-label="导出 Character JSON" disabled={!characterData}>
            <Download aria-hidden="true" size={18} />
            <span>导出</span>
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="导入 Character JSON"
            disabled={!currentPackage}
          >
            <Upload aria-hidden="true" size={18} />
            <span>导入</span>
          </button>
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
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

      {bootStatus === "error" ? <PackageIssuePanel issues={packageIssues} /> : null}
      {currentPackage ? <SheetRenderer systemPackage={currentPackage} /> : null}
    </div>
  );
}
