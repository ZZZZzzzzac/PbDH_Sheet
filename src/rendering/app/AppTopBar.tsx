import { Archive, Copy, Download, Eye, FileText, Library, Map, Plus, Printer, ShieldCheck, Sparkles, Trash2, Type, Upload, X } from "lucide-react";
import type { ChangeEvent, InputHTMLAttributes, RefObject } from "react";
import type { SystemPackage } from "../../domain/systemPackage";
import type { PresetSystemPackage } from "../../loaders/presetSystemPackageLoader";
import type { CharacterSaveSummary } from "../../storage/storageService";
import type { BootStatus, FrameworkColorSchemePreference, ValidationStatus } from "../../store/runtimeTypes";
import type { OutputKind } from "./useSheetOutput";

interface AppTopBarProps {
  characterFileInputRef: RefObject<HTMLInputElement | null>;
  packageFileInputRef: RefObject<HTMLInputElement | null>;
  packageDirectoryInputRef: RefObject<HTMLInputElement | null>;
  guideButtonRef: RefObject<HTMLButtonElement | null>;
  resourceManagerButtonRef: RefObject<HTMLButtonElement | null>;
  currentPackage: SystemPackage | null;
  characterDataAvailable: boolean;
  resourceCatalogAvailable: boolean;
  characterSaves: CharacterSaveSummary[];
  activeCharacterSaveId: string | null;
  activeCharacterSaveName: string;
  selectedSkinId: string | null;
  frameworkColorSchemePreference: FrameworkColorSchemePreference;
  bootStatus: BootStatus;
  validationStatus: ValidationStatus;
  authorPreviewActive: boolean;
  systemPackageLabel: string;
  presetSystemPackages: PresetSystemPackage[];
  defaultPresetSystemPackageId: string | null;
  onOpenResourceManager: () => void;
  onValidation: () => void;
  onStartGuide: () => void;
  onStartQuestionnaire: () => void;
  onSwitchCharacterSave: (saveId: string) => void;
  onCreateSave: () => void;
  onRenameSave: () => void;
  onDuplicateSave: () => void;
  onDeleteSave: () => void;
  onBeginOutput: (kind: OutputKind) => void;
  onExportWithCharacterAdapter: (adapterId: string) => void;
  onPresetSystemPackage: (event: ChangeEvent<HTMLSelectElement>) => void;
  onSelectSkin: (skinId: string) => void;
  onSetFrameworkColorScheme: (preference: FrameworkColorSchemePreference) => void;
  onEnterAuthorPreview: () => void;
  onExitAuthorPreview: () => void;
  onImportFile: (event: ChangeEvent<HTMLInputElement>) => void;
  onPackageFile: (event: ChangeEvent<HTMLInputElement>) => void;
  onPackageDirectory: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function AppTopBar(props: AppTopBarProps) {
  const {
    characterFileInputRef,
    packageFileInputRef,
    packageDirectoryInputRef,
    guideButtonRef,
    resourceManagerButtonRef,
    currentPackage,
    characterDataAvailable,
    resourceCatalogAvailable,
    characterSaves,
    activeCharacterSaveId,
    activeCharacterSaveName,
    selectedSkinId,
    frameworkColorSchemePreference,
    bootStatus,
    validationStatus,
    authorPreviewActive,
    systemPackageLabel,
    presetSystemPackages,
    defaultPresetSystemPackageId,
  } = props;

  return (
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
            <button ref={resourceManagerButtonRef} className="menu-item" type="button" onClick={props.onOpenResourceManager} disabled={!currentPackage || !resourceCatalogAvailable}>
              <Library aria-hidden="true" size={16} />
              <span>资源管理器</span>
            </button>
            <button className="menu-item" type="button" onClick={props.onValidation} aria-label="运行 Validation Checks" disabled={!characterDataAvailable || validationStatus === "running"}>
              <ShieldCheck aria-hidden="true" size={16} />
              <span>{validationStatus === "running" ? "检查中" : "车卡检查"}</span>
            </button>
            {currentPackage?.characterCreationGuide ? (
              <button ref={guideButtonRef} className="menu-item" type="button" onClick={props.onStartGuide} aria-label="启动车卡指引">
                <Map aria-hidden="true" size={16} />
                <span>车卡指引</span>
              </button>
            ) : null}
            {currentPackage?.questionnaireCharacterCreation ? (
              <button
                className="menu-item"
                type="button"
                onClick={props.onStartQuestionnaire}
                disabled={!characterDataAvailable}
                aria-label={`打开问卷：${currentPackage.questionnaireCharacterCreation.名称}`}
              >
                <Sparkles aria-hidden="true" size={16} />
                <span>{currentPackage.questionnaireCharacterCreation.名称}</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="top-menu">
          <button className="menu-trigger" type="button" aria-haspopup="true" disabled={!currentPackage || !characterDataAvailable}>
            <span className="menu-trigger-text">玩家存档</span>
          </button>
          <div className="menu-panel" role="menu">
            <div className="menu-field menu-field-compact" title={activeCharacterSaveName}>当前存档：{activeCharacterSaveName}</div>
            <label className="menu-field menu-field-compact">
              <select
                className="menu-select"
                aria-label="选择 Character Save"
                value={activeCharacterSaveId ?? ""}
                onChange={(event) => props.onSwitchCharacterSave(event.target.value)}
                disabled={characterSaves.length === 0}
              >
                {characterSaves.map((save) => <option value={save.id} key={save.id}>{save.name}</option>)}
              </select>
            </label>
            <button className="menu-item" type="button" onClick={props.onCreateSave} aria-label="新建 Character Save" disabled={!currentPackage}>
              <Plus aria-hidden="true" size={16} /><span>新建</span>
            </button>
            <button className="menu-item" type="button" onClick={props.onRenameSave} aria-label="重命名 Character Save" disabled={!activeCharacterSaveId}>
              <Type aria-hidden="true" size={16} /><span>重命名</span>
            </button>
            <button className="menu-item" type="button" onClick={props.onDuplicateSave} aria-label="复制 Character Save" disabled={!activeCharacterSaveId}>
              <Copy aria-hidden="true" size={16} /><span>复制</span>
            </button>
            <button className="menu-item danger" type="button" onClick={props.onDeleteSave} aria-label="删除 Character Save" disabled={!activeCharacterSaveId}>
              <Trash2 aria-hidden="true" size={16} /><span>删除</span>
            </button>
          </div>
        </div>

        <div className="top-menu">
          <button className="menu-trigger" type="button" aria-haspopup="true" disabled={!characterDataAvailable}>
            <Download aria-hidden="true" size={17} />
            <span className="menu-trigger-text">导入导出</span>
          </button>
          <div className="menu-panel" role="menu">
            <button className="menu-item" type="button" onClick={() => props.onBeginOutput("print")} aria-label="打开浏览器打印 PDF" disabled={!characterDataAvailable}>
              <Printer aria-hidden="true" size={16} /><span>打印 PDF</span>
            </button>
            <button className="menu-item" type="button" onClick={() => characterFileInputRef.current?.click()} aria-label="导入 Character JSON" disabled={!currentPackage}>
              <Upload aria-hidden="true" size={16} /><span>导入</span>
            </button>
            <button className="menu-item" type="button" onClick={() => props.onBeginOutput("json")} aria-label="导出 Character JSON" disabled={!characterDataAvailable}>
              <Download aria-hidden="true" size={16} /><span>导出 PbDH</span>
            </button>
            {currentPackage?.characterFormatAdapters?.filter((adapter) => adapter.exportScriptContent).map((adapter) => (
              <button className="menu-item" type="button" key={adapter.ID} onClick={() => props.onExportWithCharacterAdapter(adapter.ID)} disabled={!characterDataAvailable}>
                <Download aria-hidden="true" size={16} /><span>导出 {adapter.名称.replace(/\s+format$/iu, "")}</span>
              </button>
            ))}
            <button className="menu-item" type="button" onClick={() => props.onBeginOutput("html")} aria-label="导出 HTML snapshot" disabled={!characterDataAvailable}>
              <FileText aria-hidden="true" size={16} /><span>导出 HTML</span>
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
            <label className="menu-field">
              <span>预制系统包</span>
              <select
                className="menu-select"
                aria-label="预制系统包"
                value={presetSystemPackages.some((preset) => preset.id === currentPackage?.manifest.ID)
                  ? currentPackage?.manifest.ID
                  : currentPackage ? "" : defaultPresetSystemPackageId ?? ""}
                onChange={props.onPresetSystemPackage}
                disabled={bootStatus === "loading"}
              >
                {presetSystemPackages.map((preset) => <option value={preset.id} key={preset.id}>{preset.name} · v{preset.version}</option>)}
              </select>
            </label>
            {currentPackage?.skins && currentPackage.skins.length > 1 ? (
              <label className="menu-field">
                <span>人物卡皮肤</span>
                <select className="menu-select" value={selectedSkinId ?? currentPackage.defaultSkin ?? ""} onChange={(event) => props.onSelectSkin(event.target.value)}>
                  {currentPackage.skins.map((skin) => <option value={skin.ID} key={skin.ID}>{skin.名称}</option>)}
                </select>
              </label>
            ) : null}
            <label className="menu-field">
              <span>框架配色</span>
              <select className="menu-select" value={frameworkColorSchemePreference} onChange={(event) => props.onSetFrameworkColorScheme(event.target.value as FrameworkColorSchemePreference)}>
                <option value="follow-skin">跟随人物卡皮肤</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <button className="menu-item" type="button" onClick={() => packageFileInputRef.current?.click()} aria-label="上传 System Package zip" disabled={bootStatus === "loading"}>
              <Upload aria-hidden="true" size={16} /><span>上传系统包(zip)</span>
            </button>
            <button className="menu-item" type="button" onClick={() => packageDirectoryInputRef.current?.click()} disabled={bootStatus === "loading"}>
              <Upload aria-hidden="true" size={16} /><span>上传系统包(文件夹)</span>
            </button>
            {authorPreviewActive ? (
              <>
                <button className="menu-item" type="button" onClick={props.onEnterAuthorPreview}>
                  <Eye aria-hidden="true" size={16} /><span>重新选择预览目录</span>
                </button>
                <button className="menu-item" type="button" onClick={props.onExitAuthorPreview}>
                  <X aria-hidden="true" size={16} /><span>退出预览</span>
                </button>
              </>
            ) : (
              <button className="menu-item" type="button" onClick={props.onEnterAuthorPreview}>
                <Eye aria-hidden="true" size={16} /><span>系统包预览</span>
              </button>
            )}
          </div>
        </div>
        <input ref={characterFileInputRef} className="visually-hidden" type="file" accept="application/json,text/html,.json,.html,.htm" onChange={props.onImportFile} />
        <input ref={packageFileInputRef} className="visually-hidden" type="file" accept=".zip,application/zip,application/x-zip-compressed" onChange={props.onPackageFile} />
        <input
          ref={packageDirectoryInputRef}
          className="visually-hidden"
          type="file"
          multiple
          {...({ webkitdirectory: "" } as InputHTMLAttributes<HTMLInputElement>)}
          onChange={props.onPackageDirectory}
        />
      </nav>
    </header>
  );
}
