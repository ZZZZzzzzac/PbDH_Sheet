import type { CharacterData } from "./characterData";

export type CardContainerId = "configured" | "vault";
export type CardFace = "front" | "back";

export interface CardInstance {
  instanceId: string;
  tableModuleId: string;
  libraryId: string;
  definitionId: string;
  state: string;
  xPct: number;
  yPct: number;
  zIndex: number;
  face: CardFace;
  rotation: number;
  scale: number;
  tokenCount: number;
}

export interface CreateCardInstanceInput {
  instanceId: string;
  tableModuleId: string;
  libraryId: string;
  definitionId: string;
  state?: string;
}

export interface CardTableLayout {
  surfaceWidthPx: number;
  cardWidthPx: number;
  cardHeightPx: number;
  surfaceHeightPx: number;
  columns: number;
  insetXPct: number;
  insetYPct: number;
  stepXPct: number;
  stepYPct: number;
}

export interface CardTableLayoutInput {
  surfaceWidthPx: number;
  cardCount: number;
  preferredCardWidthPx?: number;
  minSurfaceHeightPx?: number;
}

const cardAspectHeightPerWidth = 88 / 63;
export const defaultCardWidthPx = 250;
export const minCardWidthPx = 140;
export const maxCardWidthPx = 320;
const defaultCardGapPx = 16;
const defaultCardInsetPx = 16;
const defaultCardSurfaceHeightPx = 520;

const defaultCardGridColumns = 5;
const defaultCardInsetXPct = 4;
const defaultCardInsetYPct = 6;
const defaultCardStepXPct = 18;
const defaultCardStepYPct = 24;

export function defaultCardPosition(index: number): { xPct: number; yPct: number } {
  return {
    xPct: defaultCardInsetXPct + (index % defaultCardGridColumns) * defaultCardStepXPct,
    yPct: defaultCardInsetYPct + Math.floor(index / defaultCardGridColumns) * defaultCardStepYPct,
  };
}

export function createCardInstance(data: CharacterData, input: CreateCardInstanceInput): CharacterData {
  const siblingCount = data.cards.instances.filter((instance) => instance.tableModuleId === input.tableModuleId).length;
  const instance: CardInstance = {
    instanceId: input.instanceId,
    tableModuleId: input.tableModuleId,
    libraryId: input.libraryId,
    definitionId: input.definitionId,
    state: input.state ?? "configured",
    ...defaultCardPosition(siblingCount),
    zIndex: nextZIndex(data.cards.instances),
    face: "front",
    rotation: 0,
    scale: 1,
    tokenCount: 0,
  };

  return updateCardInstances(data, [...data.cards.instances, instance]);
}

export function updateCardInstancePosition(data: CharacterData, instanceId: string, xPct: number, yPct: number): CharacterData {
  return updateCardInstances(
    data,
    data.cards.instances.map((instance) =>
      instance.instanceId === instanceId ? { ...instance, xPct: clampPct(xPct), yPct: clampPct(yPct), zIndex: nextZIndex(data.cards.instances) } : instance,
    ),
  );
}

export function bringCardInstanceToFront(data: CharacterData, instanceId: string): CharacterData {
  return updateCardInstances(
    data,
    data.cards.instances.map((instance) =>
      instance.instanceId === instanceId ? { ...instance, zIndex: nextZIndex(data.cards.instances) } : instance,
    ),
  );
}

export function updateCardInstanceState(data: CharacterData, instanceId: string, state: string): CharacterData {
  return updateCardInstances(
    data,
    data.cards.instances.map((instance) => (instance.instanceId === instanceId ? { ...instance, state } : instance)),
  );
}

export function createCardTableLayout(input: CardTableLayoutInput): CardTableLayout {
  const surfaceWidthPx = Number.isFinite(input.surfaceWidthPx) && input.surfaceWidthPx > 0 ? input.surfaceWidthPx : 800;
  const surfaceMaxCardWidthPx = Math.max(minCardWidthPx, surfaceWidthPx - defaultCardInsetPx * 2);
  const preferredCardWidthPx = clampCardWidth(input.preferredCardWidthPx ?? defaultCardWidthPx);
  const cardWidthPx = Math.min(preferredCardWidthPx, surfaceMaxCardWidthPx);
  const cardHeightPx = cardWidthPx * cardAspectHeightPerWidth;
  const usableWidthPx = Math.max(cardWidthPx, surfaceWidthPx - defaultCardInsetPx * 2);
  const columns = Math.max(1, Math.floor((usableWidthPx + defaultCardGapPx) / (cardWidthPx + defaultCardGapPx)));
  const rows = Math.max(1, Math.ceil(Math.max(0, input.cardCount) / columns));
  const surfaceHeightPx = Math.max(
    defaultCardSurfaceHeightPx,
    input.minSurfaceHeightPx ?? 0,
    defaultCardInsetPx * 2 + rows * cardHeightPx + Math.max(0, rows - 1) * defaultCardGapPx,
  );

  return {
    surfaceWidthPx,
    cardWidthPx,
    cardHeightPx,
    surfaceHeightPx,
    columns,
    insetXPct: (defaultCardInsetPx / surfaceWidthPx) * 100,
    insetYPct: (defaultCardInsetPx / surfaceHeightPx) * 100,
    stepXPct: ((cardWidthPx + defaultCardGapPx) / surfaceWidthPx) * 100,
    stepYPct: ((cardHeightPx + defaultCardGapPx) / surfaceHeightPx) * 100,
  };
}

export function clampCardTablePosition(layout: CardTableLayout, xPct: number, yPct: number): { xPct: number; yPct: number } {
  const maxXPct = 100 - (layout.cardWidthPx / layout.surfaceWidthPx) * 100;
  const maxYPct = 100 - (layout.cardHeightPx / layout.surfaceHeightPx) * 100;

  return {
    xPct: clampPctRange(xPct, 0, maxXPct),
    yPct: clampPctRange(yPct, 0, maxYPct),
  };
}

export function clampCardWidth(value: number): number {
  if (!Number.isFinite(value)) {
    return defaultCardWidthPx;
  }
  return Math.min(maxCardWidthPx, Math.max(minCardWidthPx, Math.round(value)));
}

export function tidyCardTable(data: CharacterData, tableModuleId: string, layout: CardTableLayout): CharacterData {
  let tableIndex = 0;

  return updateCardInstances(
    data,
    data.cards.instances.map((instance) => {
      if (instance.tableModuleId !== tableModuleId) {
        return instance;
      }

      const next = {
        ...instance,
        xPct: layout.insetXPct + (tableIndex % layout.columns) * layout.stepXPct,
        yPct: layout.insetYPct + Math.floor(tableIndex / layout.columns) * layout.stepYPct,
        zIndex: tableIndex + 1,
        rotation: 0,
      };
      tableIndex += 1;
      return next;
    }),
  );
}

export function deleteCardInstance(data: CharacterData, instanceId: string): CharacterData {
  return updateCardInstances(
    data,
    data.cards.instances.filter((instance) => instance.instanceId !== instanceId),
  );
}

function nextZIndex(instances: CardInstance[]): number {
  return Math.max(0, ...instances.map((instance) => instance.zIndex)) + 1;
}

function clampPct(value: number): number {
  return Math.min(96, Math.max(0, Number.isFinite(value) ? value : 0));
}

function clampPctRange(value: number, min: number, max: number): number {
  const safeValue = Number.isFinite(value) ? value : min;
  const safeMax = Math.max(min, Number.isFinite(max) ? max : min);
  return Math.min(safeMax, Math.max(min, safeValue));
}

function updateCardInstances(data: CharacterData, instances: CardInstance[]): CharacterData {
  return {
    ...data,
    cards: {
      ...data.cards,
      instances,
    },
    updatedAt: new Date().toISOString(),
  };
}
