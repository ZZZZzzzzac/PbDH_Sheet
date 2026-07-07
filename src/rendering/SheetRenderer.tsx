import type { CSSProperties } from "react";
import type { FlowColumn, FlowRow, FlowSection, LayoutStyle, ModulePlacement, SystemPackage } from "../domain/systemPackage";
import { findModule, getModulePlacementId } from "../domain/systemPackage";
import { RenderSheetModule } from "./moduleRegistry";

interface SheetRendererProps {
  systemPackage: SystemPackage;
}

function toLayoutStyle(style?: LayoutStyle): CSSProperties | undefined {
  if (!style) {
    return undefined;
  }

  return {
    width: style.宽度,
    minWidth: style.最小宽度,
    maxWidth: style.最大宽度,
    height: style.高度,
    minHeight: style.最小高度,
    maxHeight: style.最大高度,
    gap: style.间距,
    margin: style.外边距,
    padding: style.内边距,
    backgroundColor: style.背景色,
    border: style.边框,
    borderRadius: style.圆角,
    justifyItems: style.对齐,
    alignItems: style.垂直对齐,
  };
}

function columnTrack(column: FlowColumn): string {
  const width = column.宽度 ?? "1fr";
  return column.最小宽度 ? `minmax(min(100%, ${column.最小宽度}), ${width})` : width;
}

function renderModulePlacement(systemPackage: SystemPackage, placement: ModulePlacement, index: number) {
  const moduleId = getModulePlacementId(placement);
  const module = findModule(systemPackage, moduleId);
  if (!module) {
    return null;
  }

  const placementStyle = typeof placement === "string" ? undefined : placement.样式;

  return (
    <div className="module-slot" data-module-slot-id={module.ID} key={`${module.ID}-${index}`} style={toLayoutStyle(placementStyle)}>
      <RenderSheetModule module={module} systemPackage={systemPackage} />
    </div>
  );
}

function sectionContentStyle(section: FlowSection): CSSProperties | undefined {
  return section.样式?.间距 ? { gap: section.样式.间距 } : undefined;
}

function renderLegacySection(systemPackage: SystemPackage, section: FlowSection) {
  return (
    <div className="module-grid" style={sectionContentStyle(section)}>
      {(section.modules ?? []).map((moduleId, index) => renderModulePlacement(systemPackage, moduleId, index))}
    </div>
  );
}

function renderFlowRow(systemPackage: SystemPackage, row: FlowRow, rowIndex: number) {
  const rowStyle: CSSProperties = toLayoutStyle(row.样式) ?? {};
  rowStyle.gridTemplateColumns = row.columns.map((column) => columnTrack(column)).join(" ");

  return (
    <div className="flow-row" data-layout-row-id={row.ID ?? rowIndex} key={row.ID ?? rowIndex} style={rowStyle}>
      {row.columns.map((column, columnIndex) => renderFlowColumn(systemPackage, column, columnIndex))}
    </div>
  );
}

function renderFlowColumn(systemPackage: SystemPackage, column: FlowColumn, columnIndex: number) {
  return (
    <div className="flow-column" data-layout-column-id={column.ID ?? columnIndex} key={column.ID ?? columnIndex} style={toLayoutStyle(column.样式)}>
      {column.modules.map((placement, placementIndex) => renderModulePlacement(systemPackage, placement, placementIndex))}
    </div>
  );
}

function renderSectionLayout(systemPackage: SystemPackage, section: FlowSection) {
  if (!section.rows) {
    return renderLegacySection(systemPackage, section);
  }

  return (
    <div className="flow-rows" style={sectionContentStyle(section)}>
      {section.rows.map((row, rowIndex) => renderFlowRow(systemPackage, row, rowIndex))}
    </div>
  );
}

export function SheetRenderer({ systemPackage }: SheetRendererProps) {
  return (
    <main className="sheet-tool" aria-label="Sheet Tool">
      {systemPackage.pages.map((page) => (
        <article className="sheet-page" key={page.ID} style={toLayoutStyle(page.样式)}>
          <header className="page-header">
            <div>
              <p className="eyebrow">{systemPackage.manifest.名称}</p>
              <h1>{page.名称}</h1>
            </div>
          </header>

          {page.sections.map((section) => (
            <section className="sheet-section" key={section.ID} aria-labelledby={`section-${section.ID}`} style={toLayoutStyle(section.样式)}>
              <h2 id={`section-${section.ID}`}>{section.名称}</h2>
              {renderSectionLayout(systemPackage, section)}
            </section>
          ))}
        </article>
      ))}
    </main>
  );
}
