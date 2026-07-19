import { ArrowDown, ArrowUp, Check, Filter, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  queryResourceLibraryEntries,
  summarizeResourceEntry,
  uniqueResourceFieldValues,
  type ResourceLibrary,
  type ResourceLibraryEntry,
  type ResourceLibraryField,
  type ResourceLibraryQuery,
} from "../domain/resourceLibrary";
import { RestrictedMarkdown } from "./RestrictedMarkdown";

interface ResourceLibraryBrowserProps {
  library: ResourceLibrary;
  title?: string;
  fields?: ResourceLibraryField[];
  multiSelect: boolean;
  selectedIds: string[];
  defaultQuery?: ResourceLibraryQuery;
  libraryChoices?: Array<{ ID: string; 名称: string }>;
  onLibraryChange?: (libraryId: string) => void;
  onQueryChange?: (query: ResourceLibraryQuery) => void;
  onCommit: (entries: ResourceLibraryEntry[]) => void;
  onClose: () => void;
}

export function ResourceLibraryBrowser({
  library,
  title,
  fields,
  multiSelect,
  selectedIds,
  defaultQuery,
  libraryChoices,
  onLibraryChange,
  onQueryChange,
  onCommit,
  onClose,
}: ResourceLibraryBrowserProps) {
  const dialogTitle = title ?? library.名称;
  const dialogLabel = title ?? `${library.名称}资源库`;
  const [filters, setFilters] = useState<Record<string, string[]>>(defaultQuery?.filters ?? {});
  const [sort, setSort] = useState<ResourceLibraryQuery["sort"]>(normalizeSort(defaultQuery?.sort));
  const [keywords, setKeywords] = useState(defaultQuery?.keywords ?? "");
  const [openFilterField, setOpenFilterField] = useState<string | null>(null);
  const [draftSelectedIds, setDraftSelectedIds] = useState(selectedIds);
  const browserFields = fields ?? library.fields;
  const tableFields = browserFields.filter((field) => field.visible);
  const tableColumnFields = normalizeTableColumnWidths(tableFields);
  const rows = useMemo(() => queryResourceLibraryEntries(library, { filters, sort, keywords }, browserFields), [browserFields, filters, keywords, library, sort]);

  useEffect(() => {
    setFilters(defaultQuery?.filters ?? {});
    setSort(normalizeSort(defaultQuery?.sort));
    setKeywords(defaultQuery?.keywords ?? "");
    setOpenFilterField(null);
    setDraftSelectedIds(selectedIds);
  }, [library.ID]);

  useEffect(() => {
    onQueryChange?.({ filters, sort, keywords });
  }, [filters, keywords, sort]);

  useEffect(() => {
    if (!openFilterField) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-filter-ui]")) return;
      setOpenFilterField(null);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
  }, [openFilterField]);

  const toggleFilter = (field: string, value: string) => {
    setFilters((current) => {
      const currentValues = current[field] ?? [];
      const nextValues = currentValues.includes(value) ? currentValues.filter((item) => item !== value) : [...currentValues, value];
      const next = { ...current, [field]: nextValues };
      if (nextValues.length === 0) {
        delete next[field];
      }
      return next;
    });
  };

  const toggleDraftSelection = (entryId: string) => {
    setDraftSelectedIds((current) => (current.includes(entryId) ? current.filter((id) => id !== entryId) : [...current, entryId]));
  };

  const commitDraftSelection = () => {
    onCommit(library.entries.filter((entry) => draftSelectedIds.includes(entry.ID)));
  };

  const handleRowSelect = (entry: ResourceLibraryEntry) => {
    if (multiSelect) {
      toggleDraftSelection(entry.ID);
      return;
    }
    onCommit([entry]);
  };

  const cycleSort = (field: string) => {
    setSort((current) => current?.field !== field ? { field, direction: "asc" } : current.direction === "asc" ? { field, direction: "desc" } : undefined);
  };

  return (
    <div className="resource-dialog-backdrop" data-output-exclude="true">
      <section className="resource-dialog" role="dialog" aria-modal="true" aria-label={dialogLabel} data-guide-interaction-surface>
        <header className="resource-dialog-header">
          {libraryChoices && libraryChoices.length > 1 ? (
            <select className="input compact-input" aria-label="选择资源库" value={library.ID} onChange={(event) => onLibraryChange?.(event.target.value)}>
              {libraryChoices.map((choice) => <option value={choice.ID} key={choice.ID}>{choice.名称}</option>)}
            </select>
          ) : <h2>{dialogTitle}</h2>}
          <div className="resource-header-search">
            <input id={`search-${library.ID}`} className="input compact-input" type="search" value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="搜索" aria-label="搜索资源库" />
            <span role="status">{rows.length} 条结果</span>
          </div>
          <button className="icon-button secondary-button" type="button" onClick={onClose} aria-label="关闭资源库">
            <X aria-hidden="true" size={18} />
            <span>关闭</span>
          </button>
        </header>

        <div className="resource-browser">
          <div className="resource-table-wrap">
            <table className="resource-table">
              <colgroup>
                {tableColumnFields.map((field) => (
                  <col className={`resource-table-col-${field.effectiveWidth}`} key={field.key} style={{ width: field.columnWidth }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {tableColumnFields.map((field) => (
                    <th scope="col" key={field.key}>
                      <div className="resource-column-header">
                        <div className="resource-column-tools">
                          {field.sortable ? <button type="button" className="column-tool-button" onClick={() => cycleSort(field.key)} aria-label={`${field.label}${sort?.field === field.key ? (sort.direction === "desc" ? "降序" : "升序") : "不排序"}`}>{sort?.field === field.key ? (sort.direction === "desc" ? <ArrowDown size={14} /> : <ArrowUp size={14} />) : <ArrowUp className="inactive-sort" size={14} />}</button> : <span className="column-tool-placeholder" />}
                          {field.filterable ? <button type="button" data-filter-ui className={`column-tool-button${(filters[field.key]?.length ?? 0) > 0 ? " active" : ""}`} onClick={() => setOpenFilterField((current) => current === field.key ? null : field.key)} aria-label={`筛选${field.label}`} aria-expanded={openFilterField === field.key}><Filter size={14} /></button> : <span className="column-tool-placeholder" />}
                        </div>
                        <span>{field.label}</span>
                        {openFilterField === field.key ? (
                          <div className="column-filter-menu" data-filter-ui onClick={(event) => event.stopPropagation()}>
                            {uniqueResourceFieldValues(library, field.key).map((value) => <label className="checkbox-row" key={value}><input type="checkbox" checked={(filters[field.key] ?? []).includes(value)} onChange={() => toggleFilter(field.key, value)} /><span>{value}</span></label>)}
                          </div>
                        ) : null}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => (
                  <tr
                    aria-label={`选择 ${summarizeResourceEntry(entry)}`}
                    aria-selected={draftSelectedIds.includes(entry.ID)}
                    className={draftSelectedIds.includes(entry.ID) ? "selected-row" : undefined}
                    key={entry.ID}
                    onClick={() => handleRowSelect(entry)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") {
                        return;
                      }
                      event.preventDefault();
                      handleRowSelect(entry);
                    }}
                    tabIndex={0}
                  >
                    {tableColumnFields.map((field) => (
                      <td className={`resource-table-cell-${field.effectiveWidth}`} key={field.key}>
                        <RestrictedMarkdown value={entry.fields[field.key]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 ? <p className="resource-empty">无匹配条目</p> : null}
          </div>
        </div>

        {multiSelect ? (
          <footer className="resource-dialog-footer">
            <button className="icon-button" type="button" onClick={commitDraftSelection}>
              <Check aria-hidden="true" size={18} />
              <span>确认选择</span>
            </button>
          </footer>
        ) : null}
      </section>
    </div>
  );
}

function normalizeSort(sort: ResourceLibraryQuery["sort"] | undefined) {
  return sort ? { field: sort.field, direction: sort.direction ?? "asc" } : undefined;
}

type TableColumnField = ResourceLibraryField & {
  effectiveWidth: NonNullable<ResourceLibraryField["width"]>;
  columnWidth: string;
};

const resourceTableColumnWidthWeights = {
  compact: 0.7,
  normal: 1.4,
  wide: 2.2,
  fill: 5.5,
} as const;

function normalizeTableColumnWidths(fields: ResourceLibraryField[]): TableColumnField[] {
  const lastFillIndex = fields.reduce((lastIndex, field, index) => ((field.width ?? "normal") === "fill" ? index : lastIndex), -1);

  const effectiveFields = fields.map((field, index) => {
    const width = field.width ?? "normal";
    return {
      ...field,
      effectiveWidth: width === "fill" && index !== lastFillIndex ? "wide" : width,
    };
  });
  const totalWeight = effectiveFields.reduce((sum, field) => sum + resourceTableColumnWidthWeights[field.effectiveWidth], 0) || 1;

  return effectiveFields.map((field) => ({
    ...field,
    columnWidth: `${(resourceTableColumnWidthWeights[field.effectiveWidth] / totalWeight) * 100}%`,
  }));
}
