import { createElement, useEffect, useState, type ReactNode } from "react";
import type { SystemPackage } from "../domain/systemPackage";
import { allowedHtmlTags, findModule } from "../domain/systemPackage";
import { useRuntimeStore } from "../store/runtimeStore";
import { RenderSheetModule } from "./moduleRegistry";
import { printablePages, resolveCurrentPageId, runtimeVisiblePages } from "./pagePresentation";

interface SheetRendererProps {
  systemPackage: SystemPackage;
  outputMode?: boolean;
}

const allowedTemplateAttributes = new Set(["alt", "aria-label", "class", "colspan", "rowspan", "src", "title"]);
const reactAttributeNames = new Map([
  ["class", "className"],
  ["colspan", "colSpan"],
  ["rowspan", "rowSpan"],
]);

function renderTemplateNode(systemPackage: SystemPackage, node: ChildNode, key: string, moduleVisibility: Record<string, boolean>, pageOutlet?: ReactNode): ReactNode {
  if (node.nodeType === 3) {
    return node.textContent;
  }

  if (node.nodeType !== 1) {
    return null;
  }

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();

  if (tagName === "pb-module") {
    return renderModulePlaceholder(systemPackage, element.getAttribute("id"), key, moduleVisibility);
  }
  if (tagName === "pb-page-outlet") return <div className="page-outlet" key={key}>{pageOutlet}</div>;

  if (!allowedHtmlTags.has(tagName)) {
    return null;
  }

  const props = templateElementProps(element);
  const children = [...element.childNodes].map((child, index) => renderTemplateNode(systemPackage, child, `${key}-${index}`, moduleVisibility, pageOutlet));

  return createTemplateElement(tagName, key, props, children);
}

function renderModulePlaceholder(systemPackage: SystemPackage, moduleId: string | null, key: string, moduleVisibility: Record<string, boolean>) {
  if (!moduleId) {
    return null;
  }

  const module = findModule(systemPackage, moduleId);
  if (!module) {
    return null;
  }
  if (!isRuntimeVisible(module.默认隐藏, moduleVisibility[module.ID])) {
    return null;
  }

  return (
    <div className="module-slot" data-module-slot-id={module.ID} key={key}>
      <RenderSheetModule module={module} systemPackage={systemPackage} />
    </div>
  );
}

function templateElementProps(element: Element) {
  const props: Record<string, string> = {};

  for (const attribute of [...element.attributes]) {
    const name = attribute.name.toLowerCase();
    if (name.startsWith("on")) {
      continue;
    }
    if (name.startsWith("data-") || allowedTemplateAttributes.has(name)) {
      props[reactAttributeNames.get(name) ?? name] = attribute.value;
    }
  }

  return props;
}

function createTemplateElement(tagName: string, key: string, props: Record<string, string>, children: ReactNode[]) {
  return createElement(tagName, { key, ...props }, ...children);
}

function renderHtmlTemplate(systemPackage: SystemPackage, html: string, moduleVisibility: Record<string, boolean>, pageOutlet?: ReactNode) {
  const document = new DOMParser().parseFromString(html, "text/html");
  return [...document.body.childNodes].map((node, index) => renderTemplateNode(systemPackage, node, String(index), moduleVisibility, pageOutlet));
}

function scopeTemplateCss(pageId: string, css?: string): string {
  if (!css) {
    return "";
  }

  const scope = `[data-template-page-id="${cssStringEscape(pageId)}"]`;
  return scopeCssBlock(css, scope);
}

function scopeCssBlock(css: string, scope: string): string {
  let result = "";
  let cursor = 0;

  while (cursor < css.length) {
    const openIndex = css.indexOf("{", cursor);
    if (openIndex === -1) {
      result += css.slice(cursor);
      break;
    }

    const selector = css.slice(cursor, openIndex).trim();
    const closeIndex = findMatchingBrace(css, openIndex);
    if (closeIndex === -1) {
      result += css.slice(cursor);
      break;
    }

    const body = css.slice(openIndex + 1, closeIndex);
    if (selector.startsWith("@media")) {
      result += `${selector} {${scopeCssBlock(body, scope)}}`;
    } else if (selector.startsWith("@")) {
      result += `${selector} {${body}}`;
    } else if (selector) {
      result += `${scopeSelectors(selector, scope)} {${body}}`;
    }

    cursor = closeIndex + 1;
  }

  return result;
}

function findMatchingBrace(css: string, openIndex: number): number {
  let depth = 0;

  for (let index = openIndex; index < css.length; index += 1) {
    if (css[index] === "{") {
      depth += 1;
    }
    if (css[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function scopeSelectors(selectors: string, scope: string): string {
  return selectors
    .split(",")
    .map((selector) => `${scope} ${selector.trim()}`)
    .join(", ");
}

function cssStringEscape(value: string): string {
  return value.replace(/["\\]/g, "\\$&");
}

export function SheetRenderer({ systemPackage, outputMode = false }: SheetRendererProps) {
  const pageVisibility = useRuntimeStore((state) => state.pageVisibility);
  const moduleVisibility = useRuntimeStore((state) => state.moduleVisibility);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const visiblePages = runtimeVisiblePages(systemPackage.pages, pageVisibility);
  const resolvedCurrentPageId = resolveCurrentPageId(visiblePages, currentPageId);
  const renderedPages = outputMode ? printablePages(systemPackage.pages, pageVisibility) : visiblePages.filter((page) => page.ID === resolvedCurrentPageId);
  useEffect(() => setCurrentPageId(null), [systemPackage.manifest.ID, systemPackage.manifest.版本]);
  useEffect(() => { if (currentPageId !== resolvedCurrentPageId) setCurrentPageId(resolvedCurrentPageId); }, [currentPageId, resolvedCurrentPageId]);

  const outlet = <>
    {!outputMode && visiblePages.length > 1 ? <nav className="page-navigation" aria-label="页面导航">{visiblePages.map((page) => <button type="button" className={page.ID === resolvedCurrentPageId ? "active" : undefined} aria-current={page.ID === resolvedCurrentPageId ? "page" : undefined} onClick={() => setCurrentPageId(page.ID)} key={page.ID}>{page.名称}</button>)}</nav> : null}
    {!outputMode && visiblePages.length === 0 ? <p className="empty-page-state">当前没有可见页面。</p> : null}
    {renderedPages.map((page) =>
      (
          <article className="sheet-page" data-template-page-id={page.ID} key={page.ID}>
            <style>{scopeTemplateCss(page.ID, page.layout.cssContent)}</style>
            {renderHtmlTemplate(systemPackage, page.layout.htmlContent, moduleVisibility)}
          </article>
      ),
    )}
  </>;
  return (
    <main className="sheet-tool" aria-label="Sheet Tool">
      {systemPackage.shell ? <div className="sheet-shell" data-template-shell="true"><style>{scopeCssBlock(systemPackage.shell.cssContent ?? "", '[data-template-shell="true"]')}</style>{renderHtmlTemplate(systemPackage, systemPackage.shell.htmlContent, moduleVisibility, outlet)}</div> : outlet}
    </main>
  );
}

function isRuntimeVisible(defaultHidden: boolean | undefined, runtimeVisible: boolean | undefined): boolean {
  return runtimeVisible ?? !defaultHidden;
}
