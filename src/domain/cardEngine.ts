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

export function createCardInstance(data: CharacterData, input: CreateCardInstanceInput): CharacterData {
  const siblingCount = data.cards.instances.filter((instance) => instance.tableModuleId === input.tableModuleId).length;
  const instance: CardInstance = {
    instanceId: input.instanceId,
    tableModuleId: input.tableModuleId,
    libraryId: input.libraryId,
    definitionId: input.definitionId,
    state: input.state ?? "configured",
    xPct: 4 + (siblingCount % 5) * 18,
    yPct: 6 + Math.floor(siblingCount / 5) * 24,
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

export function tidyCardTable(data: CharacterData, tableModuleId: string): CharacterData {
  let tableIndex = 0;

  return updateCardInstances(
    data,
    data.cards.instances.map((instance) => {
      if (instance.tableModuleId !== tableModuleId) {
        return instance;
      }

      const next = {
        ...instance,
        xPct: 4 + (tableIndex % 5) * 18,
        yPct: 6 + Math.floor(tableIndex / 5) * 26,
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
