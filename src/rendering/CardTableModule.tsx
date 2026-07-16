import { Ellipsis, Layers, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import {
  clampCardTablePosition,
  createCardTableLayout,
  defaultCardWidthPx,
  maxCardIndicators,
  maxCardWidthPx,
  minCardWidthPx,
  readCardIndicators,
  type CardInstance,
  type CardTableLayout,
} from "../domain/cardEngine";
import { resolveCardPresentation, type CardPresentation } from "../domain/cardPresentation";
import { resolveResourceDefinition } from "../domain/resourceDefinition";
import { findResourceEntryProvenance } from "../domain/effectiveResourceCatalog";
import { resourceAssetUrlKey } from "../loaders/assetResolver";
import { type ResourceLibraryEntry } from "../domain/resourceLibrary";
import { findCardTableResourceLibrarySource, findResourceLibrary, type CardTableModule as CardTableModuleConfig, type SystemPackage } from "../domain/systemPackage";
import { useRuntimeStore } from "../store/runtimeStore";
import { RestrictedMarkdown } from "./RestrictedMarkdown";
import { useCardDescriptionFit } from "./cardDescriptionFit";
import { usePointerActions } from "./usePointerActions";

interface CardTableModuleProps {
  module: CardTableModuleConfig;
  systemPackage: SystemPackage;
}

interface DragState {
  instanceId: string;
  pointerId: number;
  offsetXPct: number;
  offsetYPct: number;
}

interface CardMenuState {
  instanceId: string;
  x: number;
  y: number;
}

export function CardTableModule({ module, systemPackage }: CardTableModuleProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [cardMenu, setCardMenu] = useState<CardMenuState | null>(null);
  const [detailInstanceId, setDetailInstanceId] = useState<string | null>(null);
  const characterData = useRuntimeStore((state) => state.characterData);
  const instances = characterData?.cards.instances ?? [];
  const updateCardInstancePosition = useRuntimeStore((state) => state.updateCardInstancePosition);
  const bringCardInstanceToFront = useRuntimeStore((state) => state.bringCardInstanceToFront);
  const tidyCardTable = useRuntimeStore((state) => state.tidyCardTable);
  const cardWidthPx = useRuntimeStore((state) => state.cardTableCardWidths[module.ID] ?? defaultCardWidthPx);
  const setCardTableCardWidth = useRuntimeStore((state) => state.setCardTableCardWidth);
  const visibleInstances = instances.filter((instance) => instance.tableModuleId === module.ID).sort(compareCards);
  const [surfaceWidthPx, setSurfaceWidthPx] = useState(0);
  const [surfaceViewportHeightPx, setSurfaceViewportHeightPx] = useState(0);
  const tableLayout = createCardTableLayout({
    surfaceWidthPx: surfaceWidthPx || 800,
    cardCount: visibleInstances.length,
    preferredCardWidthPx: cardWidthPx,
    minSurfaceHeightPx: surfaceViewportHeightPx,
  });

  useLayoutEffect(() => {
    const table = tableRef.current;
    if (!table) {
      return;
    }

    const updateSurfaceSize = () => {
      const rect = table.getBoundingClientRect();
      setSurfaceWidthPx(Math.max(0, table.clientWidth));
      setSurfaceViewportHeightPx(Math.max(420, window.innerHeight - rect.top - 16, table.parentElement?.clientHeight ?? 0));
    };

    updateSurfaceSize();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateSurfaceSize);
      return () => window.removeEventListener("resize", updateSurfaceSize);
    }

    window.addEventListener("resize", updateSurfaceSize);
    const observer = new ResizeObserver(updateSurfaceSize);
    observer.observe(table);
    if (table.parentElement) {
      observer.observe(table.parentElement);
    }
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSurfaceSize);
    };
  }, []);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current === null) {
      return;
    }

    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  const beginDrag = (event: PointerEvent<HTMLElement>, instance: CardInstance) => {
    if (!tableRef.current || event.button !== 0) {
      return;
    }

    const point = pointerToPct(event, tableRef.current);
    bringCardInstanceToFront(instance.instanceId);
    event.currentTarget.setPointerCapture(event.pointerId);
    closeCardMenu();
    if (event.pointerType === "touch") {
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTimerRef.current = null;
        setDragState(null);
        setCardMenu({
          instanceId: instance.instanceId,
          x: event.clientX,
          y: event.clientY,
        });
      }, 500);
    }
    setDragState({
      instanceId: instance.instanceId,
      pointerId: event.pointerId,
      offsetXPct: point.xPct - instance.xPct,
      offsetYPct: point.yPct - instance.yPct,
    });
  };

  const continueDrag = (event: PointerEvent<HTMLElement>) => {
    if (!dragState || dragState.pointerId !== event.pointerId || !tableRef.current) {
      return;
    }

    const point = pointerToPct(event, tableRef.current);
    const nextXPct = point.xPct - dragState.offsetXPct;
    const nextYPct = point.yPct - dragState.offsetYPct;
    const moved =
      Math.abs(nextXPct - getDraggingInstanceX(visibleInstances, dragState.instanceId)) > 0.8 ||
      Math.abs(nextYPct - getDraggingInstanceY(visibleInstances, dragState.instanceId)) > 0.8;
    if (moved) {
      clearLongPressTimer();
    }
    const nextPosition = clampCardTablePosition(tableLayout, nextXPct, nextYPct);
    updateCardInstancePosition(event.currentTarget.dataset.cardInstanceId ?? dragState.instanceId, nextPosition.xPct, nextPosition.yPct);
  };

  const endDrag = (event: PointerEvent<HTMLElement>) => {
    if (dragState?.pointerId === event.pointerId) {
      clearLongPressTimer();
      setDragState(null);
    }
  };

  const openCardMenu = (event: MouseEvent<HTMLElement>, instance: CardInstance) => {
    event.preventDefault();
    bringCardInstanceToFront(instance.instanceId);
    setCardMenu({
      instanceId: instance.instanceId,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const closeCardMenu = () => {
    clearLongPressTimer();
    setCardMenu(null);
  };

  return (
    <section className="card-table-module" data-module-id={module.ID} data-module-type={module.类型} data-part="container">
      <div
        className="card-table-surface"
        data-part="surface"
        ref={tableRef}
        style={cardTableSurfaceStyle(tableLayout)}
        aria-label={`${module.标签}自由桌面`}
        onPointerDown={closeCardMenu}
      >
        <div className="card-table-actions card-table-side-actions" data-part="actions" onPointerDown={(event) => event.stopPropagation()}>
          <button className="card-action-button" data-part="tidy-button" type="button" onClick={() => tidyCardTable(module.ID, tableLayout)}>
            <Layers aria-hidden="true" size={16} />
            <span>整理</span>
          </button>
          <label className="card-size-control" data-part="size-control">
            <span>大小</span>
            <input
              type="range"
              min={minCardWidthPx}
              max={maxCardWidthPx}
              step={10}
              value={cardWidthPx}
              onChange={(event) => setCardTableCardWidth(module.ID, Number(event.currentTarget.value))}
              aria-label={`${module.标签}卡牌大小`}
            />
            <output>{cardWidthPx}px</output>
          </label>
          <span className="card-count">{visibleInstances.length} 张</span>
        </div>
        {visibleInstances.length === 0 ? <p className="card-table-empty" data-part="empty">选择卡牌后会放到这里。</p> : null}
        {visibleInstances.map((instance) => (
          <CardView
            instance={instance}
            definition={resolveVisibleCardDefinition(systemPackage, characterData, module, instance)}
            module={module}
            presentation={findCardPresentation(systemPackage, module, instance)}
            onPointerDown={beginDrag}
            onPointerMove={continueDrag}
            onPointerUp={endDrag}
            onContextMenu={openCardMenu}
            key={instance.instanceId}
          />
        ))}
        {cardMenu ? createPortal(
          <CardContextMenu
            instance={visibleInstances.find((instance) => instance.instanceId === cardMenu.instanceId)}
            canFlip={hasReverseCardDefinition(systemPackage, characterData, module, visibleInstances.find((instance) => instance.instanceId === cardMenu.instanceId))}
            stateOptions={module.状态选项 ?? []}
            x={cardMenu.x}
            y={cardMenu.y}
            onClose={closeCardMenu}
            onViewDetail={(instanceId) => { setDetailInstanceId(instanceId); closeCardMenu(); }}
          />,
          document.body,
        ) : null}
      </div>
      {detailInstanceId ? (
        <CardDetailOverlay
          instance={visibleInstances.find((instance) => instance.instanceId === detailInstanceId)}
          definition={resolveVisibleCardDefinition(systemPackage, characterData, module, visibleInstances.find((instance) => instance.instanceId === detailInstanceId))}
          module={module}
          presentation={findCardPresentation(systemPackage, module, visibleInstances.find((instance) => instance.instanceId === detailInstanceId))}
          onClose={() => setDetailInstanceId(null)}
        />
      ) : null}
    </section>
  );
}

function CardView({
  instance,
  definition,
  module: moduleConfig,
  presentation,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onContextMenu,
}: {
  instance: CardInstance;
  definition?: ResourceLibraryEntry;
  module: CardTableModuleConfig;
  presentation?: CardPresentation;
  onPointerDown: (event: PointerEvent<HTMLElement>, instance: CardInstance) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onContextMenu: (event: MouseEvent<HTMLElement>, instance: CardInstance) => void;
}) {
  const deleteCardInstance = useRuntimeStore((state) => state.deleteCardInstance);
  const resolvedPresentation = resolvePresentation(definition, moduleConfig, presentation);
  const name = resolvedPresentation.name || definitionReferenceId(instance);

  return (
    <article
      className="play-card"
      data-card-instance-id={instance.instanceId}
      style={{
        left: `${instance.xPct}%`,
        top: `${instance.yPct}%`,
        zIndex: instance.zIndex,
        transform: `rotate(${instance.rotation}deg) scale(${instance.scale})`,
        "--card-control-counter-rotation": `${-instance.rotation}deg`,
        "--play-card-state-background": moduleConfig.状态背景色?.[instance.state],
      } as CSSProperties}
      onPointerDown={(event) => onPointerDown(event, instance)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={(event) => onContextMenu(event, instance)}
      aria-label={name}
    >
      <button
        className="play-card-delete"
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          deleteCardInstance(instance.instanceId);
        }}
        onPointerDown={(event) => event.stopPropagation()}
        aria-label={`删除 ${name}`}
      >
        <X aria-hidden="true" size={14} />
      </button>
      <CardIndicatorColumn instance={instance} />
      <CardFace definition={definition} definitionRef={instance.definitionRef} module={moduleConfig} presentation={presentation} fallbackName={name} />
    </article>
  );
}

function CardContextMenu({
  instance,
  canFlip,
  stateOptions,
  x,
  y,
  onClose,
  onViewDetail,
}: {
  instance?: CardInstance;
  canFlip: boolean;
  stateOptions: string[];
  x: number;
  y: number;
  onClose: () => void;
  onViewDetail: (instanceId: string) => void;
}) {
  const updateCardInstanceState = useRuntimeStore((state) => state.updateCardInstanceState);
  const flipCardInstance = useRuntimeStore((state) => state.flipCardInstance);
  const rotateCardInstance = useRuntimeStore((state) => state.rotateCardInstance);
  const setCardInstanceUpright = useRuntimeStore((state) => state.setCardInstanceUpright);
  const addCardIndicator = useRuntimeStore((state) => state.addCardIndicator);
  const deleteCardInstance = useRuntimeStore((state) => state.deleteCardInstance);

  if (!instance) {
    return null;
  }

  const nextState = nextCardState(stateOptions, instance.state);

  return (
    <div className="card-context-menu" style={{ left: x, top: y }} role="menu" onPointerDown={(event) => event.stopPropagation()}>
      <button type="button" role="menuitem" onClick={() => onViewDetail(instance.instanceId)}>查看详情</button>
      {canFlip ? (
        <button type="button" role="menuitem" onClick={() => { flipCardInstance(instance.instanceId); onClose(); }}>
          翻至{instance.face === "front" ? "背面" : "正面"}
        </button>
      ) : null}
      <button type="button" role="menuitem" onClick={() => { rotateCardInstance(instance.instanceId, 1); onClose(); }}>顺时针旋转 90°</button>
      {instance.rotation !== 0 ? (
        <button type="button" role="menuitem" onClick={() => { setCardInstanceUpright(instance.instanceId); onClose(); }}>恢复竖置</button>
      ) : null}
      <button
        type="button"
        role="menuitem"
        disabled={readCardIndicators(instance).length >= maxCardIndicators}
        onClick={() => { addCardIndicator(instance.instanceId); onClose(); }}
      >
        {readCardIndicators(instance).length >= maxCardIndicators ? "指示物已满（10）" : "添加指示物"}
      </button>
      {nextState !== instance.state ? (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            updateCardInstanceState(instance.instanceId, nextState);
            onClose();
          }}
        >
          标记为{nextState}
        </button>
      ) : null}
      <button
        className="danger"
        type="button"
        role="menuitem"
        onClick={() => {
          deleteCardInstance(instance.instanceId);
          onClose();
        }}
      >
        删除
      </button>
    </div>
  );
}

function resolveFrontCardDefinition(systemPackage: SystemPackage, characterData: ReturnType<typeof useRuntimeStore.getState>["characterData"], instance: CardInstance | undefined): ResourceLibraryEntry | undefined {
  if (!instance) {
    return undefined;
  }
  return resolveResourceDefinition(systemPackage, characterData, instance.definitionRef);
}

function CardFace({
  definition,
  definitionRef,
  module: moduleConfig,
  presentation,
  fallbackName,
  autoFitDescription = true,
}: {
  definition?: ResourceLibraryEntry;
  definitionRef?: CardInstance["definitionRef"];
  module: CardTableModuleConfig;
  presentation?: CardPresentation;
  fallbackName: string;
  autoFitDescription?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const assetUrls = useRuntimeStore((state) => state.packageAssetUrls);
  const resourceCatalog = useRuntimeStore((state) => state.resourceCatalog);
  const artField = moduleConfig.卡图字段 ?? "卡图";
  const cardArtRef = definition?.fields[artField] ?? "";
  const libraryId = definitionRef?.type === "resourceLibrary" ? definitionRef.libraryId : undefined;
  const provenance = findResourceEntryProvenance(resourceCatalog, libraryId, definition?.ID);
  const cardArtUrl = cardArtRef ? assetUrls[resourceAssetUrlKey(provenance?.type, provenance?.id, cardArtRef)] : undefined;
  const showImage = resolveCardDisplayMode(definition, moduleConfig) === "image" && cardArtUrl && !imageFailed;
  useEffect(() => setImageFailed(false), [cardArtRef]);
  return showImage ? <img className="play-card-image" src={cardArtUrl} alt={fallbackName} draggable={false} onError={() => setImageFailed(true)} /> : <TextCard definition={definition} module={moduleConfig} presentation={presentation} fallbackName={fallbackName} autoFitDescription={autoFitDescription} />;
}

function CardDetailOverlay({ instance, definition, module, presentation, onClose }: { instance?: CardInstance; definition?: ResourceLibraryEntry; module: CardTableModuleConfig; presentation?: CardPresentation; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  if (!instance) return null;
  const name = resolvePresentation(definition, module, presentation).name || definitionReferenceId(instance);
  return (
    <div className="card-detail-backdrop" data-output-exclude="true" onClick={onClose}>
      <section className="card-detail-dialog" role="dialog" aria-modal="true" aria-label={`${name}详情`} onClick={(event) => event.stopPropagation()}>
        <button className="card-detail-close" type="button" onClick={onClose} aria-label="关闭卡牌详情"><X aria-hidden="true" size={20} /></button>
        <div
          className="card-detail-face"
          style={{ "--play-card-state-background": module.状态背景色?.[instance.state] } as CSSProperties}
        >
          <CardFace definition={definition} definitionRef={instance.definitionRef} module={module} presentation={presentation} fallbackName={name} autoFitDescription={false} />
        </div>
      </section>
    </div>
  );
}

function TextCard({
  definition,
  module: moduleConfig,
  presentation,
  fallbackName,
  autoFitDescription,
}: {
  definition?: ResourceLibraryEntry;
  module: CardTableModuleConfig;
  presentation?: CardPresentation;
  fallbackName: string;
  autoFitDescription: boolean;
}) {
  const resolvedPresentation = resolvePresentation(definition, moduleConfig, presentation);

  return (
    <div className="play-card-text">
      <header>
        <RestrictedMarkdown className="play-card-name" value={resolvedPresentation.name || fallbackName} />
        {resolvedPresentation.tags.length > 0 ? (
          <div className="play-card-tags" aria-label="卡牌标签">
            {resolvedPresentation.tags.map((tag, index) => (
              <RestrictedMarkdown className="play-card-tag" value={tag} key={`${tag}:${index}`} />
            ))}
          </div>
        ) : null}
      </header>
      <CardDescription value={resolvedPresentation.description} autoFit={autoFitDescription} />
    </div>
  );
}

function resolveVisibleCardDefinition(
  systemPackage: SystemPackage,
  characterData: ReturnType<typeof useRuntimeStore.getState>["characterData"],
  module: CardTableModuleConfig,
  instance: CardInstance | undefined,
): ResourceLibraryEntry | undefined {
  const front = resolveFrontCardDefinition(systemPackage, characterData, instance);
  if (!front || !instance || instance.face === "front") {
    return front;
  }
  const reverseId = front.fields[module.背面卡牌ID字段 ?? "背面卡牌ID"]?.trim();
  const libraryId = instance.definitionRef.type === "resourceLibrary" ? instance.definitionRef.libraryId : undefined;
  return reverseId
    ? findResourceLibrary(systemPackage, libraryId ?? "")?.entries.find((entry) => entry.ID === reverseId) ?? front
    : front;
}

function hasReverseCardDefinition(systemPackage: SystemPackage, characterData: ReturnType<typeof useRuntimeStore.getState>["characterData"], module: CardTableModuleConfig, instance: CardInstance | undefined): boolean {
  const front = resolveFrontCardDefinition(systemPackage, characterData, instance);
  const reverseId = front?.fields[module.背面卡牌ID字段 ?? "背面卡牌ID"]?.trim();
  const libraryId = instance?.definitionRef.type === "resourceLibrary" ? instance.definitionRef.libraryId : undefined;
  return Boolean(reverseId && reverseId !== front?.ID
    && findResourceLibrary(systemPackage, libraryId ?? "")?.entries.some((entry) => entry.ID === reverseId));
}

const cardIndicatorColorNames = ["青色", "红色", "金色", "绿色", "蓝色", "紫色", "粉色", "灰色", "橙色", "湖蓝色"] as const;

function CardIndicatorColumn({ instance }: { instance: CardInstance }) {
  const transitionCardIndicator = useRuntimeStore((state) => state.transitionCardIndicator);
  const indicators = readCardIndicators(instance);

  return (
    <div className="card-indicator-column" data-part="indicator-column">
      {indicators.map((indicator) => (
        <CardIndicatorBadge
          key={indicator.indicatorId}
          colorIndex={indicator.colorIndex}
          colorName={cardIndicatorColorNames[indicator.colorIndex] ?? `颜色 ${indicator.colorIndex + 1}`}
          count={indicator.value}
          onIncrement={() => transitionCardIndicator(instance.instanceId, indicator.indicatorId, "increment")}
          onDecrement={() => transitionCardIndicator(instance.instanceId, indicator.indicatorId, "decrement")}
        />
      ))}
    </div>
  );
}

function CardIndicatorBadge({
  colorIndex,
  colorName,
  count,
  onIncrement,
  onDecrement,
}: {
  colorIndex: number;
  colorName: string;
  count: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const pointerActions = usePointerActions(onIncrement, onDecrement, true);
  const onKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "+" || event.key === "ArrowUp") {
      event.preventDefault();
      onIncrement();
    } else if (event.key === "-" || event.key === "ArrowDown") {
      event.preventDefault();
      onDecrement();
    }
  };

  return (
    <button
      className="card-indicator-badge"
      data-part="indicator"
      data-color-index={colorIndex}
      type="button"
      title={`${colorName}指示物：${count}；左键增加，右键减少`}
      aria-label={`${colorName}指示物：${count}；左键增加，右键减少${count === 0 ? "，再次减少会移除" : ""}`}
      onClick={(event) => { event.stopPropagation(); pointerActions.onClick(event); }}
      onContextMenu={(event) => { event.stopPropagation(); pointerActions.onContextMenu?.(event); }}
      onPointerDown={(event) => { event.stopPropagation(); pointerActions.onPointerDown?.(event); }}
      onPointerMove={pointerActions.onPointerMove}
      onPointerUp={pointerActions.onPointerUp}
      onPointerCancel={pointerActions.onPointerCancel}
      onPointerLeave={pointerActions.onPointerLeave}
      onKeyDown={onKeyDown}
    >
      <span className="card-indicator-count" aria-hidden="true">{count}</span>
    </button>
  );
}

function CardDescription({ value, autoFit }: { value: string; autoFit: boolean }) {
  const descriptionRef = useRef<HTMLDivElement>(null);
  const overflowing = useCardDescriptionFit(descriptionRef, value, autoFit);
  return (
    <>
      <RestrictedMarkdown className="play-card-description" value={value} elementRef={descriptionRef} />
      {autoFit && overflowing ? (
        <span
          className="play-card-description-overflow"
          role="img"
          aria-label="卡牌描述未完全显示；查看卡牌详情可阅读完整内容"
          title="卡牌描述未完全显示；查看卡牌详情可阅读完整内容"
        >
          <Ellipsis aria-hidden="true" size={16} />
        </span>
      ) : null}
    </>
  );
}

function resolveCardDisplayMode(definition: ResourceLibraryEntry | undefined, moduleConfig: CardTableModuleConfig): "image" | "text" {
  const displayModeField = moduleConfig.显示方式字段 ?? "卡牌显示方式";
  const entryMode = definition?.fields[displayModeField];
  if (entryMode === "image" || entryMode === "text") {
    return entryMode;
  }
  return moduleConfig.显示方式 ?? "image";
}

function resolvePresentation(
  definition: ResourceLibraryEntry | undefined,
  moduleConfig: CardTableModuleConfig,
  presentation?: CardPresentation,
) {
  const artField = moduleConfig.卡图字段 ?? "卡图";
  const displayModeField = moduleConfig.显示方式字段 ?? "卡牌显示方式";
  const reverseIdField = moduleConfig.背面卡牌ID字段 ?? "背面卡牌ID";
  return resolveCardPresentation(definition, presentation, [artField, displayModeField, reverseIdField]);
}

function findCardPresentation(systemPackage: SystemPackage, module: CardTableModuleConfig, instance: CardInstance | undefined): CardPresentation | undefined {
  if (!instance) return undefined;
  if (instance.definitionRef.type === "resourceLibrary") {
    return findCardTableResourceLibrarySource(systemPackage, module, instance.definitionRef.libraryId)?.卡牌展示;
  }
  const sourceId = instance.definitionRef.compositeResourceId.replace(/^composite:/, "");
  return module.资源来源.find((source) => source.类型 === "resourceComposer" && source.ID === sourceId)?.卡牌展示;
}

function definitionReferenceId(instance: CardInstance): string {
  return instance.definitionRef.type === "resourceLibrary" ? instance.definitionRef.entryId : instance.definitionRef.compositeResourceId;
}

function cardTableSurfaceStyle(layout: CardTableLayout): CSSProperties {
  return {
    "--play-card-width": `${layout.cardWidthPx}px`,
    height: `${layout.surfaceHeightPx}px`,
    minHeight: `${layout.surfaceHeightPx}px`,
  } as CSSProperties;
}

function compareCards(left: CardInstance, right: CardInstance): number {
  return left.zIndex - right.zIndex || left.instanceId.localeCompare(right.instanceId);
}

function pointerToPct(event: PointerEvent, element: HTMLElement): { xPct: number; yPct: number } {
  const rect = element.getBoundingClientRect();
  return {
    xPct: ((event.clientX - rect.left) / rect.width) * 100,
    yPct: ((event.clientY - rect.top) / rect.height) * 100,
  };
}

function getDraggingInstanceX(instances: CardInstance[], instanceId: string): number {
  return instances.find((instance) => instance.instanceId === instanceId)?.xPct ?? 0;
}

function getDraggingInstanceY(instances: CardInstance[], instanceId: string): number {
  return instances.find((instance) => instance.instanceId === instanceId)?.yPct ?? 0;
}

function nextCardState(stateOptions: string[], currentState: string): string {
  if (stateOptions.length === 0) {
    return currentState;
  }

  const currentIndex = stateOptions.indexOf(currentState);
  return stateOptions[(currentIndex + 1) % stateOptions.length] ?? stateOptions[0];
}
