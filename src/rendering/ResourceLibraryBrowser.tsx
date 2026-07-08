import { Check, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  queryResourceLibraryEntries,
  summarizeResourceEntry,
  uniqueResourceFieldValues,
  type ResourceLibrary,
  type ResourceLibraryEntry,
  type ResourceLibraryField,
  type ResourceLibraryQuery,
} from "../domain/resourceLibrary";

interface ResourceLibraryBrowserProps {
  library: ResourceLibrary;
  fields?: ResourceLibraryField[];
  multiSelect: boolean;
  selectedIds: string[];
  defaultQuery?: ResourceLibraryQuery;
  onCommit: (entries: ResourceLibraryEntry[]) => void;
  onClose: () => void;
}

export function ResourceLibraryBrowser({
  library,
  fields,
  multiSelect,
  selectedIds,
  defaultQuery,
  onCommit,
  onClose,
}: ResourceLibraryBrowserProps) {
  const [filters, setFilters] = useState<Record<string, string[]>>(defaultQuery?.filters ?? {});
  const [sort, setSort] = useState<ResourceLibraryQuery["sort"]>(normalizeSort(defaultQuery?.sort));
  const [draftSelectedIds, setDraftSelectedIds] = useState(selectedIds);
  const browserFields = fields ?? library.fields;
  const tableFields = browserFields.filter((field) => field.visible);
  const tableColumnFields = normalizeTableColumnWidths(tableFields);
  const filterableFields = browserFields.filter((field) => field.filterable);
  const sortableFields = browserFields.filter((field) => field.sortable);
  const rows = useMemo(() => queryResourceLibraryEntries(library, { filters, sort }), [filters, library, sort]);

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

  return (
    <div className="resource-dialog-backdrop">
      <section className="resource-dialog" role="dialog" aria-modal="true" aria-label={`${library.名称}资源库`}>
        <header className="resource-dialog-header">
          <div>
            <p className="eyebrow">Resource Library</p>
            <h2>{library.名称}</h2>
          </div>
          <button className="icon-button secondary-button" type="button" onClick={onClose} aria-label="关闭资源库">
            <X aria-hidden="true" size={18} />
            <span>关闭</span>
          </button>
        </header>

        <div className="resource-browser">
          <aside className="resource-controls" aria-label="资源库筛选排序">
            {filterableFields.map((field) => {
              const values = uniqueResourceFieldValues(library, field.key);
              if (values.length === 0) {
                return null;
              }

              return (
                <fieldset className="filter-group" key={field.key}>
                  <legend>{field.label}</legend>
                  {values.map((value) => (
                    <label className="checkbox-row" key={value}>
                      <input
                        type="checkbox"
                        checked={(filters[field.key] ?? []).includes(value)}
                        onChange={() => toggleFilter(field.key, value)}
                      />
                      <span>{value}</span>
                    </label>
                  ))}
                </fieldset>
              );
            })}

            {sortableFields.length > 0 ? (
              <div className="sort-controls">
                <label className="label compact-label" htmlFor={`sort-${library.ID}`}>
                  排序
                </label>
                <select
                  id={`sort-${library.ID}`}
                  className="input compact-input"
                  aria-label="排序字段"
                  value={sort?.field ?? ""}
                  onChange={(event) =>
                    setSort(event.target.value ? { field: event.target.value, direction: sort?.direction ?? "asc" } : undefined)
                  }
                >
                  <option value="">不排序</option>
                  {sortableFields.map((field) => (
                    <option value={field.key} key={field.key}>
                      {field.label}
                    </option>
                  ))}
                </select>
                <button
                  className="button sort-direction-button"
                  type="button"
                  disabled={!sort}
                  onClick={() => setSort((current) => (current ? { ...current, direction: current.direction === "asc" ? "desc" : "asc" } : current))}
                >
                  {sort?.direction === "desc" ? "降序" : "升序"}
                </button>
              </div>
            ) : null}
          </aside>

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
                      {field.label}
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
                        {entry.fields[field.key]}
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
