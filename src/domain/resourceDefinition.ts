import type { CharacterData } from "./characterData";
import type { ResourceDefinitionRef } from "./cardEngine";
import type { ResourceLibraryEntry } from "./resourceLibrary";
import { findResourceLibrary, type SystemPackage } from "./systemPackage";

export function resolveResourceDefinition(
  systemPackage: SystemPackage,
  characterData: CharacterData | null,
  reference: ResourceDefinitionRef | undefined,
): ResourceLibraryEntry | undefined {
  if (!reference) return undefined;
  if (reference.type === "resourceLibrary") {
    return findResourceLibrary(systemPackage, reference.libraryId)?.entries.find((entry) => entry.ID === reference.entryId);
  }
  return Object.values(characterData?.compositeResources ?? {}).find((resource) => resource.ID === reference.compositeResourceId);
}
