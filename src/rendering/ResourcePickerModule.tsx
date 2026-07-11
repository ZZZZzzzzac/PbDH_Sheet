import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { findResourceLibrary, type ResourcePickerModule as ResourcePickerModuleConfig, type SystemPackage } from "../domain/systemPackage";
import { getResourceLibraryFields, type ResourceLibraryEntry, type ResourceLibraryQuery } from "../domain/resourceLibrary";
import { useRuntimeStore } from "../store/runtimeStore";
import { ResourceLibraryBrowser } from "./ResourceLibraryBrowser";

interface ResourcePickerModuleProps {
  module: ResourcePickerModuleConfig;
  systemPackage: SystemPackage;
}

export function ResourcePickerModule({ module, systemPackage }: ResourcePickerModuleProps) {
  const [open, setOpen] = useState(false);
  const library = findResourceLibrary(systemPackage, module.资源库ID);
  const commitResourceSelection = useRuntimeStore((state) => state.commitResourceSelection);
  const runtimeDefaultQuery = useRuntimeStore((state) => state.resourcePickerDefaultQueries[module.ID]);
  const browserFields = useMemo(() => (library ? getResourceLibraryFields(library, module.字段模板) : []), [library, module.字段模板]);
  const defaultQuery = useMemo(
    () => mergeResourcePickerQuery(module.默认查询, runtimeDefaultQuery),
    [module.默认查询, runtimeDefaultQuery],
  );

  const commitSelection = (entries: ResourceLibraryEntry[]) => {
    if (!library) {
      return;
    }

    commitResourceSelection(module.ID, library.ID, entries);
    setOpen(false);
  };

  return (
    <div className="container resource-picker-module" data-module-id={module.ID} data-module-type={module.类型} data-part="container">
      <button className="icon-button resource-picker-button" data-part="button" type="button" disabled={!library} onClick={() => setOpen(true)}>
        <Search aria-hidden="true" size={18} />
        <span>{library ? module.按钮文本 : "资源库不可用"}</span>
      </button>
      {open && library ? (
        <ResourceLibraryBrowser
          library={library}
          fields={browserFields}
          multiSelect={module.多选 ?? false}
          selectedIds={[]}
          defaultQuery={defaultQuery}
          onCommit={commitSelection}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

function mergeResourcePickerQuery(baseQuery: ResourceLibraryQuery | undefined, runtimeQuery: ResourceLibraryQuery | undefined): ResourceLibraryQuery | undefined {
  if (!baseQuery && !runtimeQuery) {
    return undefined;
  }

  return {
    ...baseQuery,
    ...runtimeQuery,
    filters: {
      ...(baseQuery?.filters ?? {}),
      ...(runtimeQuery?.filters ?? {}),
    },
    sort: runtimeQuery?.sort ?? baseQuery?.sort,
  };
}
