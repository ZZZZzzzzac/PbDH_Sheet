import { Layers, X } from "lucide-react";
import { useRef, useState, type MouseEvent, type PointerEvent } from "react";
import type { CardInstance } from "../domain/cardEngine";
import { type ResourceLibraryEntry, summarizeResourceEntry } from "../domain/resourceLibrary";
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
  const library = findResourceLibrary(systemPackage, module.资源库ID);
  const instances = useRuntimeStore((state) => state.characterData?.cards.instances ?? []);
  const updateCardInstancePosition = useRuntimeStore((state) => state.updateCardInstancePosition);
  const bringCardInstanceToFront = useRuntimeStore((state) => state.bringCardInstanceToFront);
  const tidyCardTable = useRuntimeStore((state) => state.tidyCardTable);
  const visibleInstances = instances.filter((instance) => instance.tableModuleId === module.ID).sort(compareCards);

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
    updateCardInstancePosition(event.currentTarget.dataset.cardInstanceId ?? dragState.instanceId, point.xPct - dragState.offsetXPct, point.yPct - dragState.offsetYPct);
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
    <section className="card-table-module" data-module-id={module.ID} data-module-type={module.类型}>
      <header className="card-table-header">
        <div>
          <p className="eyebrow">Card Table</p>
          <h2>{module.标签}</h2>
        </div>
        <div className="card-table-actions">
          <span className="card-count">{visibleInstances.length} 张</span>
          <button className="card-action-button" type="button" onClick={() => tidyCardTable(module.ID)}>
            <Layers aria-hidden="true" size={16} />
            <span>整理</span>
          </button>
        </div>
      </header>
      <div className="card-table-surface" ref={tableRef} aria-label={`${module.标签}自由桌面`} onPointerDown={closeCardMenu}>
        {visibleInstances.length === 0 ? <p className="card-table-empty">选择卡牌后会放到这里。</p> : null}
        {visibleInstances.map((instance) => (
          <CardView
            instance={instance}
            definition={library?.entries.find((entry) => entry.ID === instance.definitionId)}
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
          />
        ) : null}
      </div>
    </section>
  );
}

function CardView({
  instance,
  definition,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onContextMenu,
}: {
  instance: CardInstance;
  definition?: ResourceLibraryEntry;
  onPointerDown: (event: PointerEvent<HTMLElement>, instance: CardInstance) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onContextMenu: (event: MouseEvent<HTMLElement>, instance: CardInstance) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const assetUrls = useRuntimeStore((state) => state.packageAssetUrls);
  const deleteCardInstance = useRuntimeStore((state) => state.deleteCardInstance);
  const cardArtRef = definition?.fields.卡图 ?? "";
  const cardArtUrl = cardArtRef ? assetUrls[cardArtRef] : undefined;
  const shouldShowImage = definition?.fields.等级 === "1" && cardArtUrl && !imageFailed;
  const name = definition ? summarizeResourceEntry(definition) : instance.definitionId;

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
      {shouldShowImage ? (
        <img className="play-card-image" src={cardArtUrl} alt={name} draggable={false} onError={() => setImageFailed(true)} />
      ) : (
        <TextCard definition={definition} fallbackName={name} />
      )}
    </article>
  );
}

function CardContextMenu({
  instance,
  stateOptions,
  x,
  y,
  onClose,
}: {
  instance?: CardInstance;
  stateOptions: string[];
  x: number;
  y: number;
  onClose: () => void;
}) {
  const updateCardInstanceState = useRuntimeStore((state) => state.updateCardInstanceState);
  const deleteCardInstance = useRuntimeStore((state) => state.deleteCardInstance);

  if (!instance) {
    return null;
  }

  const nextState = nextCardState(stateOptions, instance.state);

  return (
    <div className="card-context-menu" style={{ left: x, top: y }} role="menu" onPointerDown={(event) => event.stopPropagation()}>
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

function TextCard({ definition, fallbackName }: { definition?: ResourceLibraryEntry; fallbackName: string }) {
  return (
    <div className="play-card-text">
      <header>
        <h4>{definition?.fields.名称 ?? fallbackName}</h4>
        <p>
          {[definition?.fields.领域, definition?.fields.等级 ? `${definition.fields.等级}级` : "", definition?.fields.属性]
            .filter(Boolean)
            .join(" / ")}
        </p>
      </header>
      <p className="play-card-recall">回想 {definition?.fields.回想 ?? "-"}</p>
      <p className="play-card-description">{definition?.fields.描述 ?? "Card Definition 不存在。"}</p>
    </div>
  );
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
