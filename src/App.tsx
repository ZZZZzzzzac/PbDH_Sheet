import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  nextGuideStep,
  previousGuideStep,
  startGuideSession,
  type GuideSession,
} from "./domain/characterCreationGuide";
import type { PackageDirectoryHandle } from "./loaders/packageVfs";
import { SheetRenderer } from "./rendering/SheetRenderer";
import { GuideSpotlight } from "./rendering/GuideSpotlight";
import type { QuestionnaireHostSession } from "./rendering/questionnaireHost";
import { AppTopBar } from "./rendering/app/AppTopBar";
import { PackageIssuePanel, ValidationIssueDialog } from "./rendering/app/AppDiagnostics";
import { PackageLoadingSurface } from "./rendering/app/PackageLoadingSurface";
import { resolveGuideTargetPageId } from "./rendering/app/guideTarget";
import { useSheetOutput } from "./rendering/app/useSheetOutput";
import { useRuntimeStore } from "./store/runtimeStore";
import presetSystemPackages from "virtual:preset-system-packages";

const defaultPresetSystemPackage = presetSystemPackages.find((preset) => preset.id === "daggerheart-core");
const ResourceManager = lazy(() => import("./rendering/ResourceManager").then((module) => ({ default: module.ResourceManager })));
const CharacterImportDialogs = lazy(() => import("./rendering/CharacterImportDialogs").then((module) => ({ default: module.CharacterImportDialogs })));
const CharacterExportDialog = lazy(() => import("./rendering/CharacterExportDialog").then((module) => ({ default: module.CharacterExportDialog })));
const QuestionnaireResultDialog = lazy(() => import("./rendering/QuestionnaireResultDialog").then((module) => ({ default: module.QuestionnaireResultDialog })));

export default function App() {
  const characterFileInputRef = useRef<HTMLInputElement>(null);
  const packageFileInputRef = useRef<HTMLInputElement>(null);
  const packageDirectoryInputRef = useRef<HTMLInputElement>(null);
  const guideButtonRef = useRef<HTMLButtonElement>(null);
  const resourceManagerButtonRef = useRef<HTMLButtonElement>(null);
  const questionnaireSessionRef = useRef<QuestionnaireHostSession | null>(null);
  const [guideSession, setGuideSession] = useState<GuideSession | null>(null);
  const [resourceManagerOpen, setResourceManagerOpen] = useState(false);
  const currentPackage = useRuntimeStore((state) => state.currentPackage);
  const selectedSkinId = useRuntimeStore((state) => state.selectedSkinId);
  const frameworkColorSchemePreference = useRuntimeStore((state) => state.frameworkColorSchemePreference);
  const resourceCatalog = useRuntimeStore((state) => state.resourceCatalog);
  const resourceExtensionImport = useRuntimeStore((state) => state.resourceExtensionImport);
  const pendingResourceExtensionReplacement = useRuntimeStore((state) => state.pendingResourceExtensionReplacement);
  const pendingResourceExtensionConversion = useRuntimeStore((state) => state.pendingResourceExtensionConversion);
  const pendingResourceFormatSelection = useRuntimeStore((state) => state.pendingResourceFormatSelection);
  const pendingResourceExtensionRemoval = useRuntimeStore((state) => state.pendingResourceExtensionRemoval);
  const resourceReferenceIssues = useRuntimeStore((state) => state.resourceReferenceIssues);
  const packageAssetUrls = useRuntimeStore((state) => state.packageAssetUrls);
  const characterData = useRuntimeStore((state) => state.characterData);
  const characterSaves = useRuntimeStore((state) => state.characterSaves);
  const activeCharacterSaveId = useRuntimeStore((state) => state.activeCharacterSaveId);
  const cardTableCardWidths = useRuntimeStore((state) => state.cardTableCardWidths);
  const bootStatus = useRuntimeStore((state) => state.bootStatus);
  const packageLoadProgress = useRuntimeStore((state) => state.packageLoadProgress);
  const packageLoadingPresentation = useRuntimeStore((state) => state.packageLoadingPresentation);
  const packageIssues = useRuntimeStore((state) => state.packageIssues);
  const validationIssues = useRuntimeStore((state) => state.validationIssues);
  const validationStatus = useRuntimeStore((state) => state.validationStatus);
  const importError = useRuntimeStore((state) => state.importError);
  const importNotice = useRuntimeStore((state) => state.importNotice);
  const pendingQuestionnaireResult = useRuntimeStore((state) => state.pendingQuestionnaireResult);
  const initialize = useRuntimeStore((state) => state.initialize);
  const createCharacterSave = useRuntimeStore((state) => state.createCharacterSave);
  const switchCharacterSave = useRuntimeStore((state) => state.switchCharacterSave);
  const renameCharacterSave = useRuntimeStore((state) => state.renameCharacterSave);
  const duplicateCharacterSave = useRuntimeStore((state) => state.duplicateCharacterSave);
  const deleteCharacterSave = useRuntimeStore((state) => state.deleteCharacterSave);
  const importCharacterDataFromFile = useRuntimeStore((state) => state.importCharacterDataFromFile);
  const pendingCharacterConversion = useRuntimeStore((state) => state.pendingCharacterConversion);
  const pendingCharacterFormatSelection = useRuntimeStore((state) => state.pendingCharacterFormatSelection);
  const selectCharacterFormatAdapter = useRuntimeStore((state) => state.selectCharacterFormatAdapter);
  const confirmCharacterConversion = useRuntimeStore((state) => state.confirmCharacterConversion);
  const cancelCharacterConversion = useRuntimeStore((state) => state.cancelCharacterConversion);
  const prepareQuestionnaireResult = useRuntimeStore((state) => state.prepareQuestionnaireResult);
  const confirmQuestionnaireResult = useRuntimeStore((state) => state.confirmQuestionnaireResult);
  const cancelQuestionnaireResult = useRuntimeStore((state) => state.cancelQuestionnaireResult);
  const uploadSystemPackageFromFile = useRuntimeStore((state) => state.uploadSystemPackageFromFile);
  const uploadSystemPackageFromDirectory = useRuntimeStore((state) => state.uploadSystemPackageFromDirectory);
  const switchToPresetSystemPackage = useRuntimeStore((state) => state.switchToPresetSystemPackage);
  const selectSystemPackageSkin = useRuntimeStore((state) => state.selectSystemPackageSkin);
  const setFrameworkColorSchemePreference = useRuntimeStore((state) => state.setFrameworkColorSchemePreference);
  const uploadResourceExtensionFromFile = useRuntimeStore((state) => state.uploadResourceExtensionFromFile);
  const confirmResourceExtensionReplacement = useRuntimeStore((state) => state.confirmResourceExtensionReplacement);
  const cancelResourceExtensionReplacement = useRuntimeStore((state) => state.cancelResourceExtensionReplacement);
  const selectResourceFormatAdapter = useRuntimeStore((state) => state.selectResourceFormatAdapter);
  const confirmResourceExtensionConversion = useRuntimeStore((state) => state.confirmResourceExtensionConversion);
  const cancelResourceExtensionConversion = useRuntimeStore((state) => state.cancelResourceExtensionConversion);
  const requestResourceExtensionRemoval = useRuntimeStore((state) => state.requestResourceExtensionRemoval);
  const confirmResourceExtensionRemoval = useRuntimeStore((state) => state.confirmResourceExtensionRemoval);
  const cancelResourceExtensionRemoval = useRuntimeStore((state) => state.cancelResourceExtensionRemoval);
  const authorPreviewActive = useRuntimeStore((state) => state.authorPreviewActive);
  const enterAuthorPreview = useRuntimeStore((state) => state.enterAuthorPreview);
  const exitAuthorPreview = useRuntimeStore((state) => state.exitAuthorPreview);
  const runValidationChecks = useRuntimeStore((state) => state.runValidationChecks);
  const runPreOutputValidation = useRuntimeStore((state) => state.runPreOutputValidation);
  const tidyCardTable = useRuntimeStore((state) => state.tidyCardTable);
  const activeCharacterSaveName = characterSaves.find((save) => save.id === activeCharacterSaveId)?.name ?? "无角色存档";
  const {
    printMode,
    validationDialogOpen,
    pendingExternalExport,
    beginOutput,
    exportCharacterText,
    exportWithCharacterAdapter,
    handleValidation,
    closeValidationDialog,
    continuePendingOutput,
    cancelExternalExport,
    confirmExternalExport,
  } = useSheetOutput({
    currentPackage,
    characterData,
    activeCharacterSaveName,
    cardTableCardWidths,
    tidyCardTable,
    runValidationChecks,
    runPreOutputValidation,
  });

  useEffect(() => {
    void initialize(presetSystemPackages).then(async () => {
      const state = useRuntimeStore.getState();
      if (!state.currentPackage && state.bootStatus === "ready" && defaultPresetSystemPackage) {
        await state.switchToPresetSystemPackage(defaultPresetSystemPackage);
      }
    });
  }, [initialize]);

  useEffect(() => {
    setGuideSession(null);
    questionnaireSessionRef.current?.close();
    questionnaireSessionRef.current = null;
  }, [currentPackage?.manifest.ID, currentPackage?.manifest.版本]);

  useEffect(() => () => questionnaireSessionRef.current?.close(), []);

  const startQuestionnaire = async () => {
    const questionnaire = currentPackage?.questionnaireCharacterCreation;
    if (!questionnaire || !characterData) return;
    questionnaireSessionRef.current?.close();
    const { openQuestionnaireHost } = await import("./rendering/questionnaireHost");
    const opened = openQuestionnaireHost(questionnaire, (result) => {
      questionnaireSessionRef.current = null;
      prepareQuestionnaireResult(questionnaire.ID, result);
    });
    if (!opened.ok) {
      useRuntimeStore.setState({ importError: opened.error, importNotice: null });
      return;
    }
    questionnaireSessionRef.current = opened.session;
    useRuntimeStore.setState({ importError: null, importNotice: null });
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await importCharacterDataFromFile(file);
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

  const handlePresetSystemPackage = async (event: ChangeEvent<HTMLSelectElement>) => {
    const preset = presetSystemPackages.find((candidate) => candidate.id === event.target.value);
    if (preset) await switchToPresetSystemPackage(preset);
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
      {bootStatus === "loading" ? (
        <PackageLoadingSurface progress={packageLoadProgress} presentation={packageLoadingPresentation} />
      ) : null}
      <AppTopBar
        characterFileInputRef={characterFileInputRef}
        packageFileInputRef={packageFileInputRef}
        packageDirectoryInputRef={packageDirectoryInputRef}
        guideButtonRef={guideButtonRef}
        resourceManagerButtonRef={resourceManagerButtonRef}
        currentPackage={currentPackage}
        characterDataAvailable={Boolean(characterData)}
        resourceCatalogAvailable={Boolean(resourceCatalog)}
        characterSaves={characterSaves}
        activeCharacterSaveId={activeCharacterSaveId}
        activeCharacterSaveName={activeCharacterSaveName}
        selectedSkinId={selectedSkinId}
        frameworkColorSchemePreference={frameworkColorSchemePreference}
        bootStatus={bootStatus}
        validationStatus={validationStatus}
        authorPreviewActive={authorPreviewActive}
        systemPackageLabel={systemPackageLabel}
        presetSystemPackages={presetSystemPackages}
        defaultPresetSystemPackageId={defaultPresetSystemPackage?.id ?? null}
        onOpenResourceManager={() => setResourceManagerOpen(true)}
        onValidation={() => void handleValidation()}
        onStartGuide={() => setGuideSession(startGuideSession())}
        onStartQuestionnaire={() => void startQuestionnaire()}
        onSwitchCharacterSave={(saveId) => void switchCharacterSave(saveId)}
        onCreateSave={() => void handleCreateSave()}
        onRenameSave={() => void handleRenameSave()}
        onDuplicateSave={() => void handleDuplicateSave()}
        onDeleteSave={() => void handleDeleteSave()}
        onBeginOutput={(kind) => void beginOutput(kind)}
        onExportCharacterText={(exportId) => void exportCharacterText(exportId)}
        onExportWithCharacterAdapter={(adapterId) => void exportWithCharacterAdapter(adapterId)}
        onPresetSystemPackage={(event) => void handlePresetSystemPackage(event)}
        onSelectSkin={selectSystemPackageSkin}
        onSetFrameworkColorScheme={setFrameworkColorSchemePreference}
        onEnterAuthorPreview={() => void handleEnterAuthorPreview()}
        onExitAuthorPreview={exitAuthorPreview}
        onImportFile={(event) => void handleImportFile(event)}
        onPackageFile={(event) => void handlePackageFile(event)}
        onPackageDirectory={(event) => void handlePackageDirectory(event)}
      />

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
        onClose={closeValidationDialog}
        onContinue={continuePendingOutput}
      />
      {currentPackage ? (
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
        <Suspense fallback={null}>
          <ResourceManager
            catalog={resourceCatalog}
            systemPackage={currentPackage}
            assetUrls={packageAssetUrls}
            importState={resourceExtensionImport}
            pendingReplacement={pendingResourceExtensionReplacement}
            pendingConversion={pendingResourceExtensionConversion}
            pendingSelection={pendingResourceFormatSelection}
            pendingRemoval={pendingResourceExtensionRemoval}
            referenceIssues={resourceReferenceIssues}
            onUpload={uploadResourceExtensionFromFile}
            onConfirmReplacement={confirmResourceExtensionReplacement}
            onCancelReplacement={cancelResourceExtensionReplacement}
            onSelectFormat={selectResourceFormatAdapter}
            onConfirmConversion={confirmResourceExtensionConversion}
            onCancelConversion={cancelResourceExtensionConversion}
            onRequestRemoval={requestResourceExtensionRemoval}
            onConfirmRemoval={confirmResourceExtensionRemoval}
            onCancelRemoval={cancelResourceExtensionRemoval}
            onClose={closeResourceManager}
          />
        </Suspense>
      ) : null}
      {pendingCharacterConversion || pendingCharacterFormatSelection ? (
        <Suspense fallback={null}>
          <CharacterImportDialogs
            pendingConversion={pendingCharacterConversion}
            pendingSelection={pendingCharacterFormatSelection}
            onSelect={selectCharacterFormatAdapter}
            onConfirm={confirmCharacterConversion}
            onCancel={cancelCharacterConversion}
          />
        </Suspense>
      ) : null}
      {pendingExternalExport ? (
        <Suspense fallback={null}>
          <CharacterExportDialog
            pending={pendingExternalExport}
            onCancel={cancelExternalExport}
            onConfirm={confirmExternalExport}
          />
        </Suspense>
      ) : null}
      {pendingQuestionnaireResult ? (
        <Suspense fallback={null}>
          <QuestionnaireResultDialog
            pending={pendingQuestionnaireResult}
            onConfirm={confirmQuestionnaireResult}
            onCancel={cancelQuestionnaireResult}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
