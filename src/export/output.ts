import { exportCharacterData, parseCharacterDataJson, type CharacterData, type CharacterImportResult } from "../domain/characterData";
import type { SystemPackage } from "../domain/systemPackage";

const embeddedCharacterDataId = "pbdh-character-data";

export function buildReadonlyHtmlSnapshot(data: CharacterData, printableRoot?: Element): string {
  const jsonText = exportCharacterData(data);
  const inertJson = jsonText.replace(/</g, "\\u003c");
  const title = htmlEscape(readCharacterName(data));
  const printableHtml = printableRoot ? serializePrintableRoot(printableRoot) : buildFallbackSnapshotBody(data);
  const documentStyles = printableRoot ? collectDocumentStyles(printableRoot.ownerDocument) : "";
  const snapshotStyles = buildSnapshotStyles();

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>${documentStyles}
${snapshotStyles}</style>
</head>
<body class="snapshot-body print-mode">
  <main class="snapshot-shell" aria-label="Read-only Character Snapshot">
    ${printableHtml}
  </main>
  <script id="${embeddedCharacterDataId}" type="application/json">${inertJson}</script>
</body>
</html>`;
}

function buildFallbackSnapshotBody(data: CharacterData): string {
  const title = htmlEscape(readCharacterName(data));
  const values = Object.entries(data.character.values)
    .map(([key, value]) => `<tr><th>${htmlEscape(key)}</th><td>${htmlEscape(formatSnapshotValue(value))}</td></tr>`)
    .join("");
  const cards = data.cards.instances
    .map((card) => `<li>${htmlEscape(card.definitionId)} <span>${htmlEscape(card.state)}</span></li>`)
    .join("");

  return `
    <h1>${title}</h1>
    <p>${htmlEscape(data.systemPackage.id)} v${htmlEscape(data.systemPackage.version)}</p>
    <table><tbody>${values}</tbody></table>
    <h2>Cards</h2>
    <ul>${cards || "<li>无卡牌</li>"}</ul>`;
}

export function parseCharacterDataText(text: string, currentPackage: SystemPackage): CharacterImportResult {
  if (looksLikeHtml(text)) {
    const extracted = extractEmbeddedCharacterJson(text);
    if (!extracted.ok) {
      return extracted;
    }
    return parseCharacterDataJson(extracted.text, currentPackage);
  }

  return parseCharacterDataJson(text, currentPackage);
}

export function extractEmbeddedCharacterJson(text: string): { ok: true; text: string } | { ok: false; error: string } {
  const match = text.match(new RegExp(`<script\\b[^>]*\\bid=["']${embeddedCharacterDataId}["'][^>]*>([\\s\\S]*?)<\\/script>`, "i"));
  if (!match) {
    return { ok: false, error: "导入失败：HTML snapshot 中没有嵌入的 Character JSON。" };
  }

  return { ok: true, text: htmlUnescape(match[1].trim()) };
}

export async function waitForVisibleImages(root: ParentNode, timeoutMs = 2000): Promise<void> {
  const images = [...root.querySelectorAll("img")].filter(isVisibleImage);
  if (images.length === 0) {
    return;
  }

  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          const timeout = window.setTimeout(done, timeoutMs);
          image.addEventListener("load", done, { once: true });
          image.addEventListener("error", done, { once: true });

          function done() {
            window.clearTimeout(timeout);
            image.removeEventListener("load", done);
            image.removeEventListener("error", done);
            resolve();
          }
        }),
    ),
  );
}

function isVisibleImage(image: HTMLImageElement): boolean {
  if (image.hidden || image.getAttribute("aria-hidden") === "true") {
    return false;
  }

  if (typeof image.getClientRects === "function" && image.getClientRects().length > 0) {
    return true;
  }

  return image.offsetWidth > 0 || image.offsetHeight > 0;
}

function looksLikeHtml(text: string): boolean {
  return /^\s*(<!doctype html>|<html|<main|<body)/i.test(text);
}

function readCharacterName(data: CharacterData): string {
  return data.character.id;
}

function formatSnapshotValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value, null, 2);
}

function serializePrintableRoot(root: Element): string {
  const clone = root.cloneNode(true) as Element;
  syncFormControls(root, clone);
  stripInteractiveRuntimeState(clone);
  return clone.outerHTML;
}

function syncFormControls(sourceRoot: Element, cloneRoot: Element) {
  const sourceControls = sourceRoot.querySelectorAll("input, textarea, select");
  const cloneControls = cloneRoot.querySelectorAll("input, textarea, select");

  sourceControls.forEach((source, index) => {
    const clone = cloneControls[index];
    if (!clone) {
      return;
    }

    if (source instanceof HTMLTextAreaElement && clone instanceof HTMLTextAreaElement) {
      clone.textContent = source.value;
      clone.setAttribute("readonly", "");
      return;
    }

    if (source instanceof HTMLSelectElement && clone instanceof HTMLSelectElement) {
      [...clone.options].forEach((option, optionIndex) => {
        option.toggleAttribute("selected", source.options[optionIndex]?.selected ?? false);
      });
      clone.setAttribute("disabled", "");
      return;
    }

    if (source instanceof HTMLInputElement && clone instanceof HTMLInputElement) {
      if (source.type === "checkbox" || source.type === "radio") {
        clone.toggleAttribute("checked", source.checked);
      } else {
        clone.setAttribute("value", source.value);
      }
      clone.setAttribute("readonly", "");
    }
  });
}

function stripInteractiveRuntimeState(clone: Element) {
  clone.querySelectorAll("button, input[type='file'], .resource-dialog-backdrop, .validation-dialog-backdrop, .card-context-menu").forEach((element) => {
    element.remove();
  });
  clone.querySelectorAll("[contenteditable]").forEach((element) => element.removeAttribute("contenteditable"));
  clone.querySelectorAll("[style]").forEach((element) => {
    const style = element.getAttribute("style");
    if (style) {
      element.setAttribute("style", style);
    }
  });
}

function collectDocumentStyles(sourceDocument: Document): string {
  const chunks: string[] = [];

  for (const styleSheet of [...sourceDocument.styleSheets]) {
    try {
      const rules = [...styleSheet.cssRules].map((rule) => rule.cssText).join("\n");
      if (rules) {
        chunks.push(rules);
      }
    } catch {
      const owner = styleSheet.ownerNode;
      if (owner instanceof HTMLStyleElement) {
        chunks.push(owner.textContent ?? "");
      }
    }
  }

  sourceDocument.querySelectorAll("style").forEach((styleElement) => {
    const text = styleElement.textContent ?? "";
    if (text && !chunks.includes(text)) {
      chunks.push(text);
    }
  });

  return chunks.join("\n");
}

function buildSnapshotStyles(): string {
  return `
body.snapshot-body {
  margin: 0;
  background: #ffffff;
}
.snapshot-shell {
  width: 100%;
  margin: 0;
}
.snapshot-shell button,
.snapshot-shell input,
.snapshot-shell textarea,
.snapshot-shell select {
  pointer-events: none;
}
.snapshot-shell .top-bar,
.snapshot-shell .top-menu-bar,
.snapshot-shell .print-preview-bar,
.snapshot-shell .message,
.snapshot-shell .resource-dialog-backdrop,
.snapshot-shell .validation-dialog-backdrop,
.snapshot-shell .resource-picker-module,
.snapshot-shell .image-actions,
.snapshot-shell .card-table-actions,
.snapshot-shell .play-card-delete {
  display: none !important;
}
.snapshot-shell .sheet-tool {
  padding: 0;
}
.snapshot-shell .sheet-page,
.snapshot-shell .module-slot,
.snapshot-shell .container,
.snapshot-shell .card-table-module,
.snapshot-shell .play-card {
  break-inside: avoid;
  page-break-inside: avoid;
}
@media print {
  @page {
    margin: 8mm 4mm 10mm;
  }

  .snapshot-shell .card-table-surface {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(0, var(--play-card-width)));
    align-items: start;
    align-content: start;
    gap: 4px;
    padding: 0;
    height: auto !important;
    min-height: 0 !important;
    overflow: visible;
  }
  .snapshot-shell .play-card {
    position: relative;
    left: auto !important;
    top: auto !important;
    z-index: auto !important;
    transform: none !important;
  }
  .snapshot-shell .sheet-page,
  .sheet-page {
    break-after: page;
  }
}`;
}

function htmlEscape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function htmlUnescape(value: string): string {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}
