import type { ReactNode } from "react";
import type { SystemPackage } from "../domain/systemPackage";
import { findModule } from "../domain/systemPackage";
import { RenderSheetModule } from "./moduleRegistry";

interface SheetRendererProps {
  systemPackage: SystemPackage;
}

const allowedTemplateTags = new Set([
  "article",
  "div",
  "em",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "img",
  "li",
  "main",
  "ol",
  "p",
  "section",
  "small",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
]);

const allowedTemplateAttributes = new Set(["alt", "aria-label", "class", "colspan", "rowspan", "src", "title"]);
const reactAttributeNames = new Map([
  ["class", "className"],
  ["colspan", "colSpan"],
  ["rowspan", "rowSpan"],
]);

function renderTemplateNode(systemPackage: SystemPackage, node: ChildNode, key: string): ReactNode {
  if (node.nodeType === 3) {
    return node.textContent;
  }

  if (node.nodeType !== 1) {
    return null;
  }

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();

  if (tagName === "pb-module") {
    return renderModulePlaceholder(systemPackage, element.getAttribute("id"), key);
  }

  if (!allowedTemplateTags.has(tagName)) {
    return null;
  }

  const props = templateElementProps(element, key);
  const children = [...element.childNodes].map((child, index) => renderTemplateNode(systemPackage, child, `${key}-${index}`));

  return createTemplateElement(tagName, props, children);
}

function renderModulePlaceholder(systemPackage: SystemPackage, moduleId: string | null, key: string) {
  if (!moduleId) {
    return null;
  }

  const module = findModule(systemPackage, moduleId);
  if (!module) {
    return null;
  }

  return (
    <div className="module-slot" data-module-slot-id={module.ID} key={key}>
      <RenderSheetModule module={module} systemPackage={systemPackage} />
    </div>
  );
}

function templateElementProps(element: Element, key: string) {
  const props: Record<string, string> = { key };

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

function createTemplateElement(tagName: string, props: Record<string, string>, children: ReactNode[]) {
  switch (tagName) {
    case "article":
      return <article {...props}>{children}</article>;
    case "div":
      return <div {...props}>{children}</div>;
    case "em":
      return <em {...props}>{children}</em>;
    case "footer":
      return <footer {...props}>{children}</footer>;
    case "h1":
      return <h1 {...props}>{children}</h1>;
    case "h2":
      return <h2 {...props}>{children}</h2>;
    case "h3":
      return <h3 {...props}>{children}</h3>;
    case "h4":
      return <h4 {...props}>{children}</h4>;
    case "h5":
      return <h5 {...props}>{children}</h5>;
    case "h6":
      return <h6 {...props}>{children}</h6>;
    case "header":
      return <header {...props}>{children}</header>;
    case "hr":
      return <hr {...props} />;
    case "img":
      return <img {...props} />;
    case "li":
      return <li {...props}>{children}</li>;
    case "main":
      return <main {...props}>{children}</main>;
    case "ol":
      return <ol {...props}>{children}</ol>;
    case "p":
      return <p {...props}>{children}</p>;
    case "section":
      return <section {...props}>{children}</section>;
    case "small":
      return <small {...props}>{children}</small>;
    case "span":
      return <span {...props}>{children}</span>;
    case "strong":
      return <strong {...props}>{children}</strong>;
    case "table":
      return <table {...props}>{children}</table>;
    case "tbody":
      return <tbody {...props}>{children}</tbody>;
    case "td":
      return <td {...props}>{children}</td>;
    case "th":
      return <th {...props}>{children}</th>;
    case "thead":
      return <thead {...props}>{children}</thead>;
    case "tr":
      return <tr {...props}>{children}</tr>;
    case "ul":
      return <ul {...props}>{children}</ul>;
    default:
      return null;
  }
}

function renderHtmlTemplate(systemPackage: SystemPackage, html: string) {
  const document = new DOMParser().parseFromString(html, "text/html");
  return [...document.body.childNodes].map((node, index) => renderTemplateNode(systemPackage, node, String(index)));
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

export function SheetRenderer({ systemPackage }: SheetRendererProps) {
  return (
    <main className="sheet-tool" aria-label="Sheet Tool">
      {systemPackage.pages.map((page) => (
        <article className="sheet-page" data-template-page-id={page.ID} key={page.ID}>
          <style>{scopeTemplateCss(page.ID, page.layout.cssContent)}</style>
          {renderHtmlTemplate(systemPackage, page.layout.htmlContent)}
        </article>
      ))}
    </main>
  );
}
