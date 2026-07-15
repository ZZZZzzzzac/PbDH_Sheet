import type { ResourceLibraryEntry } from "./resourceLibrary";
import type { ResourceComposerModule } from "./systemPackage";

export interface CompositeResource extends ResourceLibraryEntry {
  composerModuleId: string;
}

export type ResourceComposerSelections = Record<string, ResourceLibraryEntry>;

export function composeResource(module: ResourceComposerModule, selections: ResourceComposerSelections): CompositeResource | null {
  if (module.来源槽位.some((slot) => !selections[slot.ID])) return null;
  const ID = `composite:${module.ID}`;
  const fields: Record<string, string> = { ID };
  for (const mapping of module.输出字段) {
    fields[mapping.字段] = selections[mapping.来源槽位ID]?.fields[mapping.来源字段] ?? "";
  }
  return { ID, composerModuleId: module.ID, fields };
}
