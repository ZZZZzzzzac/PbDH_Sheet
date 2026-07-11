import { Layers, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from "react";
import {
  clampCardTablePosition,
  createCardTableLayout,
  defaultCardWidthPx,
  maxCardWidthPx,
  minCardWidthPx,
  type CardInstance,
  type CardTableLayout,
} from "../domain/cardEngine";
import { type ResourceLibraryEntry } from "../domain/resourceLibrary";
import { findResourceLibrary, type CardTableModule as CardTableModuleConfig, type SystemPackage } from "../domain/systemPackage";
import { useRuntimeStore } from "../store/runtimeStore";

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
  const library = findResourceLibrary(systemPackage, module.资源库ID);
  const instances = useRuntimeStore((state) => state.characterData?.cards.instances ?? []);
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
      setSurfaceViewportHeightPx(Math.max(420, window.innerHeight - rect.top - 16));
    };

    updateSurfaceSize();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateSurfaceSize);
      return () => window.removeEventListener("resize", updateSurfaceSize);
    }

    window.addEventListener("resize", updateSurfaceSize);
    const observer = new ResizeObserver(updateSurfaceSize);
    observer.observe(table);
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
            definition={library?.entries.find((entry) => entry.ID === instance.definitionId)}
            module={module}
            onPointerDown={beginDrag}
            onPointerMove={continueDrag}
            onPointerUp={endDrag}
            onContextMenu={openCardMenu}
            key={instance.instanceId}
          />
        ))}
        {cardMenu ? (
          <CardContextMenu
            instance={visibleInstances.find((instance) => instance.instanceId === cardMenu.instanceId)}
            stateOptions={module.状态选项 ?? ["configured", "vault"]}
            x={cardMenu.x}
            y={cardMenu.y}
            onClose={closeCardMenu}
            onViewDetail={(instanceId) => { setDetailInstanceId(instanceId); closeCardMenu(); }}
          />
        ) : null}
      </div>
      {detailInstanceId ? (
        <CardDetailOverlay
          instance={visibleInstances.find((instance) => instance.instanceId === detailInstanceId)}
          definition={library?.entries.find((entry) => entry.ID === visibleInstances.find((instance) => instance.instanceId === detailInstanceId)?.definitionId)}
          module={module}
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
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onContextMenu,
}: {
  instance: CardInstance;
  definition?: ResourceLibraryEntry;
  module: CardTableModuleConfig;
  onPointerDown: (event: PointerEvent<HTMLElement>, instance: CardInstance) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onContextMenu: (event: MouseEvent<HTMLElement>, instance: CardInstance) => void;
}) {
  const deleteCardInstance = useRuntimeStore((state) => state.deleteCardInstance);
  const nameField = moduleConfig.卡名字段 ?? "名称";
  const name = definition?.fields[nameField] || instance.definitionId;

  return (
    <article
      className="play-card"
      data-card-instance-id={instance.instanceId}
      style={{
        left: `${instance.xPct}%`,
        top: `${instance.yPct}%`,
        zIndex: instance.zIndex,
        transform: `rotate(${instance.rotation}deg) scale(${instance.scale})`,
      }}
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
      <CardFace definition={definition} module={moduleConfig} fallbackName={name} />
    </article>
  );
}

function CardContextMenu({
  instance,
  stateOptions,
  x,
  y,
  onClose,
  onViewDetail,
}: {
  instance?: CardInstance;
  stateOptions: string[];
  x: number;
  y: number;
  onClose: () => void;
  onViewDetail: (instanceId: string) => void;
}) {
  const updateCardInstanceState = useRuntimeStore((state) => state.updateCardInstanceState);
  const deleteCardInstance = useRuntimeStore((state) => state.deleteCardInstance);

  if (!instance) {
    return null;
  }

  const nextState = nextCardState(stateOptions, instance.state);

  return (
    <div className="card-context-menu" style={{ left: x, top: y }} role="menu" onPointerDown={(event) => event.stopPropagation()}>
      <button type="button" role="menuitem" onClick={() => onViewDetail(instance.instanceId)}>查看详情</button>
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          updateCardInstanceState(instance.instanceId, nextState);
          onClose();
        }}
      >
        标记为{stateLabel(nextState)}
      </button>
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

function CardFace({ definition, module: moduleConfig, fallbackName }: { definition?: ResourceLibraryEntry; module: CardTableModuleConfig; fallbackName: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const assetUrls = useRuntimeStore((state) => state.packageAssetUrls);
  const artField = moduleConfig.卡图字段 ?? "卡图";
  const cardArtRef = definition?.fields[artField] ?? "";
  const cardArtUrl = cardArtRef ? assetUrls[cardArtRef] : undefined;
  const showImage = resolveCardDisplayMode(definition, moduleConfig) === "image" && cardArtUrl && !imageFailed;
  return showImage ? <img className="play-card-image" src={cardArtUrl} alt={fallbackName} draggable={false} onError={() => setImageFailed(true)} /> : <TextCard definition={definition} module={moduleConfig} fallbackName={fallbackName} />;
}

function CardDetailOverlay({ instance, definition, module, onClose }: { instance?: CardInstance; definition?: ResourceLibraryEntry; module: CardTableModuleConfig; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  if (!instance) return null;
  const name = definition?.fields[module.卡名字段 ?? "名称"] || instance.definitionId;
  return (
    <div className="card-detail-backdrop" data-output-exclude="true" onClick={onClose}>
      <section className="card-detail-dialog" role="dialog" aria-modal="true" aria-label={`${name}详情`} onClick={(event) => event.stopPropagation()}>
        <button className="card-detail-close" type="button" onClick={onClose} aria-label="关闭卡牌详情"><X aria-hidden="true" size={20} /></button>
        <div className="card-detail-face"><CardFace definition={definition} module={module} fallbackName={name} /></div>
      </section>
    </div>
  );
}

function TextCard({ definition, module: moduleConfig, fallbackName }: { definition?: ResourceLibraryEntry; module: CardTableModuleConfig; fallbackName: string }) {
  const nameField = moduleConfig.卡名字段 ?? "名称";
  const descField = moduleConfig.描述字段 ?? "描述";
  const tags = inferCardTags(definition, moduleConfig, nameField, descField);

  return (
    <div className="play-card-text">
      <header>
        <h4>{definition?.fields[nameField] ?? fallbackName}</h4>
        {tags.length > 0 ? (
          <div className="play-card-tags" aria-label="卡牌标签">
            {tags.map((tag) => (
              <span className="play-card-tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </header>
      <p className="play-card-description">{definition?.fields[descField] ?? "Card Definition 不存在。"}</p>
    </div>
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

function inferCardTags(
  definition: ResourceLibraryEntry | undefined,
  moduleConfig: CardTableModuleConfig,
  nameField: string,
  descField: string,
): string[] {
  if (!definition) {
    return [];
  }
  const excludeFields = new Set<string>(["ID", nameField, descField]);
  const artField = moduleConfig.卡图字段 ?? "卡图";
  const displayModeField = moduleConfig.显示方式字段 ?? "卡牌显示方式";
  excludeFields.add(artField);
  excludeFields.add(displayModeField);
  return Object.entries(definition.fields)
    .filter(([key, value]) => !excludeFields.has(key) && value)
    .map(([, value]) => value);
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

function stateLabel(state: string): string {
  if (state === "configured") {
    return "配置";
  }
  if (state === "vault") {
    return "宝库";
  }
  return state;
}
