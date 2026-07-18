import { Archive, Copy, Download, Eye, FileText, Library, Map, Plus, Printer, ShieldCheck, Trash2, Type, Upload, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type InputHTMLAttributes } from "react";
import { exportCharacterData } from "./domain/characterData";
import { createCardTableLayout } from "./domain/cardEngine";
import {
  nextGuideStep,
  previousGuideStep,
  startGuideSession,
  type GuideStep,
  type GuideSession,
} from "./domain/characterCreationGuide";
import {
  getHtmlTemplateGuideRegionIds,
  getHtmlTemplateModuleReferences,
  type PackageIssue,
  type SystemPackage,
} from "./domain/systemPackage";
import type { PackageDirectoryHandle } from "./loaders/packageVfs";
import type { ValidationIssue } from "./domain/validationRunner";
import { buildReadonlyHtmlSnapshot, waitForVisibleImages } from "./export/output";
import { collectFrameworkValidationIssues } from "./rendering/frameworkChecks";
import { waitForMarkerPresentationFits } from "./rendering/markerPresentationFit";
import { SheetRenderer } from "./rendering/SheetRenderer";
import { printablePages } from "./rendering/pagePresentation";
import { waitForTextFits } from "./rendering/textFit";
import { GuideSpotlight } from "./rendering/GuideSpotlight";
import { ResourceManager } from "./rendering/ResourceManager";
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

function sanitizeFileName(name: string): string {
  const trimmed = name.trim();
  const safe = trimmed.replace(/[<>:"/\\|?*]/g, "_");
  return safe || "character";
}

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function PackageIssuePanel({ issues }: { issues: PackageIssue[] }) {
  const blocking = issues.some((issue) => issue.level === "fatal" || issue.level === "error");
  return (
    <section className="error-panel" role={blocking ? "alert" : "status"} aria-label={blocking ? "System Package error" : "System Package warnings"}>
      <h2>{blocking ? "System Package 错误" : "System Package 警告"}</h2>
      <ul>
        {issues.map((issue) => (
          <li key={`${issue.code}-${issue.path ?? issue.text}`}>
            <strong>{issue.code}</strong>
            {issue.location?.file ? ` ${issue.location.file}` : ""}
            {issue.path ? ` ${issue.path}: ` : " "}
            {issue.text}
            {(issue.entities?.length || issue.evidence?.length) ? (
              <details>
                <summary>诊断上下文</summary>
                <pre>{JSON.stringify({ location: issue.location, entities: issue.entities, evidence: issue.evidence }, null, 2)}</pre>
              </details>
            ) : null}
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
    <div className="validation-dialog-backdrop" data-output-exclude="true">
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
  const packageDirectoryInputRef = useRef<HTMLInputElement>(null);
  const guideButtonRef = useRef<HTMLButtonElement>(null);
  const resourceManagerButtonRef = useRef<HTMLButtonElement>(null);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [pendingOutput, setPendingOutput] = useState<OutputKind | null>(null);
  const [printMode, setPrintMode] = useState(false);
  const [guideSession, setGuideSession] = useState<GuideSession | null>(null);
  const [resourceManagerOpen, setResourceManagerOpen] = useState(false);
  const currentPackage = useRuntimeStore((state) => state.currentPackage);
  const selectedSkinId = useRuntimeStore((state) => state.selectedSkinId);
  const frameworkColorSchemePreference = useRuntimeStore((state) => state.frameworkColorSchemePreference);
  const resourceCatalog = useRuntimeStore((state) => state.resourceCatalog);
  const resourceExtensionImport = useRuntimeStore((state) => state.resourceExtensionImport);
  const pendingResourceExtensionReplacement = useRuntimeStore((state) => state.pendingResourceExtensionReplacement);
  const pendingResourceExtensionRemoval = useRuntimeStore((state) => state.pendingResourceExtensionRemoval);
  const resourceReferenceIssues = useRuntimeStore((state) => state.resourceReferenceIssues);
  const packageAssetUrls = useRuntimeStore((state) => state.packageAssetUrls);
  const characterData = useRuntimeStore((state) => state.characterData);
  const characterSaves = useRuntimeStore((state) => state.characterSaves);
  const activeCharacterSaveId = useRuntimeStore((state) => state.activeCharacterSaveId);
  const cardTableCardWidths = useRuntimeStore((state) => state.cardTableCardWidths);
  const bootStatus = useRuntimeStore((state) => state.bootStatus);
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
  const uploadSystemPackageFromDirectory = useRuntimeStore((state) => state.uploadSystemPackageFromDirectory);
  const selectSystemPackageSkin = useRuntimeStore((state) => state.selectSystemPackageSkin);
  const setFrameworkColorSchemePreference = useRuntimeStore((state) => state.setFrameworkColorSchemePreference);
  const uploadResourceExtensionFromFile = useRuntimeStore((state) => state.uploadResourceExtensionFromFile);
  const confirmResourceExtensionReplacement = useRuntimeStore((state) => state.confirmResourceExtensionReplacement);
  const cancelResourceExtensionReplacement = useRuntimeStore((state) => state.cancelResourceExtensionReplacement);
  const requestResourceExtensionRemoval = useRuntimeStore((state) => state.requestResourceExtensionRemoval);
  const confirmResourceExtensionRemoval = useRuntimeStore((state) => state.confirmResourceExtensionRemoval);
  const cancelResourceExtensionRemoval = useRuntimeStore((state) => state.cancelResourceExtensionRemoval);
  const authorPreviewActive = useRuntimeStore((state) => state.authorPreviewActive);
  const enterAuthorPreview = useRuntimeStore((state) => state.enterAuthorPreview);
  const exitAuthorPreview = useRuntimeStore((state) => state.exitAuthorPreview);
  const runValidationChecks = useRuntimeStore((state) => state.runValidationChecks);
  const runPreOutputValidation = useRuntimeStore((state) => state.runPreOutputValidation);
  const tidyCardTable = useRuntimeStore((state) => state.tidyCardTable);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    setGuideSession(null);
  }, [currentPackage?.manifest.ID, currentPackage?.manifest.版本]);

  const performOutput = async (kind: OutputKind, printableContentPrepared = false) => {
    if (!characterData) {
      return;
    }

    const baseName = sanitizeFileName(activeCharacterSaveName);

    if (kind === "json") {
      downloadText(exportCharacterData(characterData), `${baseName}.json`, "application/json");
      return;
    }

    if (kind === "html") {
      if (!printableContentPrepared && !(await preparePrintableContent())) return;
      try {
        const printableRoot = document.querySelector(".sheet-tool");
        await waitForVisibleImages(printableRoot ?? document);
        downloadText(buildReadonlyHtmlSnapshot(characterData, printableRoot ?? undefined, activeCharacterSaveName), `${baseName}.html`, "text/html");
      } finally {
        setPrintMode(false);
      }
      return;
    }

    if (!printableContentPrepared && !(await preparePrintableContent())) return;
    const printableRoot = document.querySelector(".sheet-tool");
    if (!printableRoot) {
      setPrintMode(false);
      return;
    }

    try {
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
      frameworkIssues = collectFrameworkValidationIssues(document.querySelector(".sheet-tool") ?? document);
    }
    const scriptIssues = await runPreOutputValidation();
    const issues = [...frameworkIssues, ...scriptIssues];
    useRuntimeStore.setState({ validationIssues: issues });
    if (issues.length > 0) {
      setPendingOutput(kind);
      setValidationDialogOpen(true);
      return;
    }

    await performOutput(kind, printableContentPrepared);
  };

  const preparePrintableContent = async (tidyCardsForOutput = true) => {
    if (!currentPackage) {
      return false;
    }
    const packageSnapshot = currentPackage;
    if (printablePages(packageSnapshot.pages, useRuntimeStore.getState().pageVisibility).length === 0) {
      useRuntimeStore.setState({ importNotice: "当前没有可打印页面。" });
      return false;
    }

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setPrintMode(true);
    await nextFrame();
    await nextFrame();

    if (tidyCardsForOutput) {
      for (const module of packageSnapshot.modules) {
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
    const root = document.querySelector(".sheet-tool") ?? document;
    await waitForTextFits(root);
    await waitForMarkerPresentationFits(root);
    return true;
  };

  const handleValidation = async () => {
    let frameworkIssues: ValidationIssue[] = [];
    if (await preparePrintableContent(false)) {
      frameworkIssues = collectFrameworkValidationIssues(document.querySelector(".sheet-tool") ?? document);
      setPrintMode(false);
    }
    await runValidationChecks();
    useRuntimeStore.setState({
      validationIssues: [...frameworkIssues, ...useRuntimeStore.getState().validationIssues],
    });
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

  const handlePackageDirectory = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? [...event.target.files] : [];
    if (files.length > 0) await uploadSystemPackageFromDirectory(files);
    event.target.value = "";
  };

  const handleEnterAuthorPreview = async () => {
    const previewWindow = window as typeof window & { showDirectoryPicker?: () => Promise<PackageDirectoryHandle> };
    if (!previewWindow.showDirectoryPicker) {
      useRuntimeStore.setState({ importNotice: "warning：当前浏览器不支持 File System Access API，无法进入预览。普通系统包导入仍可使用。" });
      return;
    }
    try {
      await enterAuthorPreview(await previewWindow.showDirectoryPicker());
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      useRuntimeStore.setState({ importError: "无法选择或授权预览开发目录。" });
    }
  };

  const closeGuide = () => {
    setGuideSession(null);
    window.requestAnimationFrame(() => guideButtonRef.current?.focus());
  };

  const closeResourceManager = useCallback(() => {
    setResourceManagerOpen(false);
    window.requestAnimationFrame(() => resourceManagerButtonRef.current?.focus());
  }, []);

  const activeCharacterSaveName = characterSaves.find((save) => save.id === activeCharacterSaveId)?.name ?? "无角色存档";
  const systemPackageLabel = currentPackage ? `${currentPackage.manifest.名称} · v${currentPackage.manifest.版本}` : bootStatus === "loading" ? "系统包加载中" : "未加载系统包";
  const selectedSkin = currentPackage?.skins?.find((skin) => skin.ID === selectedSkinId)
    ?? currentPackage?.skins?.find((skin) => skin.ID === currentPackage.defaultSkin);
  const resolvedFrameworkColorScheme = frameworkColorSchemePreference === "follow-skin"
    ? selectedSkin?.推荐框架配色 ?? "light"
    : frameworkColorSchemePreference;
  const guideTargetPageId = currentPackage?.characterCreationGuide && guideSession
    ? resolveGuideTargetPageId(currentPackage, currentPackage.characterCreationGuide.步骤[guideSession.stepIndex])
    : null;

  return (
    <div className={`app-shell${printMode ? " print-mode" : ""}`} data-framework-color-scheme={resolvedFrameworkColorScheme}>
      <header className="top-bar">
        <div className="brand-block">
          <span className="brand-mark">PbDH</span>
          <div>
            <p className="eyebrow">Base Framework</p>
            <h1>Sheet Tool</h1>
          </div>
        </div>

        <nav className="top-menu-bar" aria-label="Sheet Tool actions">
          <div className="top-menu">
            <button className="menu-trigger" type="button" aria-haspopup="true">
              <Map aria-hidden="true" size={17} />
              <span className="menu-trigger-text">玩家功能</span>
            </button>
            <div className="menu-panel" role="menu">
              <button ref={resourceManagerButtonRef} className="menu-item" type="button" onClick={() => setResourceManagerOpen(true)} disabled={!currentPackage || !resourceCatalog}>
                <Library aria-hidden="true" size={16} />
                <span>资源管理器</span>
              </button>
              <button
                className="menu-item"
                type="button"
                onClick={handleValidation}
                aria-label="运行 Validation Checks"
                disabled={!characterData || validationStatus === "running"}
              >
                <ShieldCheck aria-hidden="true" size={16} />
                <span>{validationStatus === "running" ? "检查中" : "车卡检查"}</span>
              </button>
              {currentPackage?.characterCreationGuide ? (
                <button
                  ref={guideButtonRef}
                  className="menu-item"
                  type="button"
                  onClick={() => setGuideSession(startGuideSession())}
                  aria-label="启动车卡指引"
                >
                  <Map aria-hidden="true" size={16} />
                  <span>车卡指引</span>
                </button>
              ) : null}
            </div>
          </div>

          <div className="top-menu">
            <button className="menu-trigger" type="button" aria-haspopup="true" disabled={!currentPackage || !characterData}>
              <span className="menu-trigger-text">玩家存档</span>
            </button>
            <div className="menu-panel" role="menu">
              <div className="menu-field menu-field-compact" title={activeCharacterSaveName}>当前存档：{activeCharacterSaveName}</div>
              <label className="menu-field menu-field-compact">
                <select
                  className="menu-select"
                  aria-label="选择 Character Save"
                  value={activeCharacterSaveId ?? ""}
                  onChange={(event) => void switchCharacterSave(event.target.value)}
                  disabled={characterSaves.length === 0}
                >
                  {characterSaves.map((save) => (
                    <option value={save.id} key={save.id}>
                      {save.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="menu-item" type="button" onClick={() => void handleCreateSave()} aria-label="新建 Character Save" disabled={!currentPackage}>
                <Plus aria-hidden="true" size={16} />
                <span>新建</span>
              </button>
              <button
                className="menu-item"
                type="button"
                onClick={() => void handleRenameSave()}
                aria-label="重命名 Character Save"
                disabled={!activeCharacterSaveId}
              >
                <Type aria-hidden="true" size={16} />
                <span>重命名</span>
              </button>
              <button
                className="menu-item"
                type="button"
                onClick={() => void handleDuplicateSave()}
                aria-label="复制 Character Save"
                disabled={!activeCharacterSaveId}
              >
                <Copy aria-hidden="true" size={16} />
                <span>复制</span>
              </button>
              <button
                className="menu-item danger"
                type="button"
                onClick={() => void handleDeleteSave()}
                aria-label="删除 Character Save"
                disabled={!activeCharacterSaveId}
              >
                <Trash2 aria-hidden="true" size={16} />
                <span>删除</span>
              </button>
            </div>
          </div>

          <div className="top-menu">
            <button className="menu-trigger" type="button" aria-haspopup="true" disabled={!characterData}>
              <Download aria-hidden="true" size={17} />
              <span className="menu-trigger-text">导入导出</span>
            </button>
            <div className="menu-panel" role="menu">
              <button className="menu-item" type="button" onClick={() => void beginOutput("print")} aria-label="打开浏览器打印 PDF" disabled={!characterData}>
                <Printer aria-hidden="true" size={16} />
                <span>打印 PDF</span>
              </button>
              <button
                className="menu-item"
                type="button"
                onClick={() => characterFileInputRef.current?.click()}
                aria-label="导入 Character JSON"
                disabled={!currentPackage}
              >
                <Upload aria-hidden="true" size={16} />
                <span>导入</span>
              </button>
              <button className="menu-item" type="button" onClick={() => void beginOutput("json")} aria-label="导出 Character JSON" disabled={!characterData}>
                <Download aria-hidden="true" size={16} />
                <span>导出 JSON</span>
              </button>
              <button className="menu-item" type="button" onClick={() => void beginOutput("html")} aria-label="导出 HTML snapshot" disabled={!characterData}>
                <FileText aria-hidden="true" size={16} />
                <span>导出 HTML</span>
              </button>
            </div>
          </div>

          <div className="top-menu">
            <button className="menu-trigger" type="button" aria-haspopup="true">
              <Archive aria-hidden="true" size={17} />
              <span className="menu-trigger-text">系统包</span>
            </button>
            <div className="menu-panel menu-panel-right" role="menu">
              <div className="menu-field menu-field-compact" title={systemPackageLabel}>{systemPackageLabel}</div>
              {currentPackage?.skins && currentPackage.skins.length > 1 ? (
                <label className="menu-field">
                  <span>人物卡皮肤</span>
                  <select className="menu-select" value={selectedSkinId ?? currentPackage.defaultSkin ?? ""} onChange={(event) => selectSystemPackageSkin(event.target.value)}>
                    {currentPackage.skins.map((skin) => <option value={skin.ID} key={skin.ID}>{skin.名称}</option>)}
                  </select>
                </label>
              ) : null}
              <label className="menu-field">
                <span>框架配色</span>
                <select className="menu-select" value={frameworkColorSchemePreference} onChange={(event) => setFrameworkColorSchemePreference(event.target.value as "follow-skin" | "light" | "dark")}>
                  <option value="follow-skin">跟随人物卡皮肤</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
              <button
                className="menu-item"
                type="button"
                onClick={() => packageFileInputRef.current?.click()}
                aria-label="上传 System Package zip"
                disabled={bootStatus === "loading"}
              >
                <Upload aria-hidden="true" size={16} />
                <span>上传系统包(zip)</span>
              </button>
              <button className="menu-item" type="button" onClick={() => packageDirectoryInputRef.current?.click()} disabled={bootStatus === "loading"}>
                <Upload aria-hidden="true" size={16} />
                <span>上传系统包(文件夹)</span>
              </button>
              {authorPreviewActive ? (
                <>
                  <button className="menu-item" type="button" onClick={() => void handleEnterAuthorPreview()}>
                    <Eye aria-hidden="true" size={16} /><span>重新选择预览目录</span>
                  </button>
                  <button className="menu-item" type="button" onClick={exitAuthorPreview}>
                    <X aria-hidden="true" size={16} /><span>退出预览</span>
                  </button>
                </>
              ) : (
                <button className="menu-item" type="button" onClick={() => void handleEnterAuthorPreview()}>
                  <Eye aria-hidden="true" size={16} /><span>系统包预览</span>
                </button>
              )}
            </div>
          </div>
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
          <input
            ref={packageDirectoryInputRef}
            className="visually-hidden"
            type="file"
            multiple
            {...({ webkitdirectory: "" } as InputHTMLAttributes<HTMLInputElement>)}
            onChange={handlePackageDirectory}
          />
        </nav>
      </header>

      {authorPreviewActive ? <div className="message message-info" role="status">预览中 · 刷新页面可重新读取开发目录</div> : null}

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

      {packageIssues.length > 0 ? <PackageIssuePanel issues={packageIssues} /> : null}
      <ValidationIssueDialog
        issues={validationIssues}
        open={validationDialogOpen}
        onClose={() => {
          if (pendingOutput) setPrintMode(false);
          setPendingOutput(null);
          setValidationDialogOpen(false);
        }}
        onContinue={
          pendingOutput
              ? () => {
                const output = pendingOutput;
                setPendingOutput(null);
                setValidationDialogOpen(false);
                void performOutput(output, output !== "json");
              }
            : undefined
        }
      />
      {!importError && currentPackage ? (
        <SheetRenderer
          systemPackage={currentPackage}
          outputMode={printMode}
          requestedPageId={guideTargetPageId}
        />
      ) : null}
      {currentPackage?.characterCreationGuide && guideSession ? (
        <GuideSpotlight
          guide={currentPackage.characterCreationGuide}
          session={guideSession}
          onPrevious={() => setGuideSession((current) => (current ? previousGuideStep(current) : current))}
          onNext={() =>
            setGuideSession((current) =>
              current ? nextGuideStep(current, currentPackage.characterCreationGuide?.步骤.length ?? 0) : current,
            )
          }
          onFinish={closeGuide}
          onExit={closeGuide}
        />
      ) : null}
      {resourceManagerOpen && resourceCatalog && currentPackage ? (
        <ResourceManager
          catalog={resourceCatalog}
          systemPackage={currentPackage}
          assetUrls={packageAssetUrls}
          importState={resourceExtensionImport}
          pendingReplacement={pendingResourceExtensionReplacement}
          pendingRemoval={pendingResourceExtensionRemoval}
          referenceIssues={resourceReferenceIssues}
          onUpload={uploadResourceExtensionFromFile}
          onConfirmReplacement={confirmResourceExtensionReplacement}
          onCancelReplacement={cancelResourceExtensionReplacement}
          onRequestRemoval={requestResourceExtensionRemoval}
          onConfirmRemoval={confirmResourceExtensionRemoval}
          onCancelRemoval={cancelResourceExtensionRemoval}
          onClose={closeResourceManager}
        />
      ) : null}
    </div>
  );
}

function resolveGuideTargetPageId(systemPackage: SystemPackage, step: GuideStep | undefined): string | null {
  const target = step?.目标;
  if (!target) return null;
  if (target.类型 === "page") return target.页面ID;

  const references = target.类型 === "module" ? getHtmlTemplateModuleReferences : getHtmlTemplateGuideRegionIds;
  const targetId = target.类型 === "module" ? target.模块ID : target.区域ID;
  if (systemPackage.shell && references(systemPackage.shell.htmlContent).includes(targetId)) return null;
  return systemPackage.pages.find((page) => references(page.layout.htmlContent).includes(targetId))?.ID ?? null;
}

function readCardTableSurfaceWidth(moduleId: string): number {
  const moduleElement = [...document.querySelectorAll<HTMLElement>(".card-table-module")].find((element) => element.dataset.moduleId === moduleId);
  const surface = moduleElement?.querySelector<HTMLElement>(".card-table-surface");
  return surface?.clientWidth ?? 800;
}
