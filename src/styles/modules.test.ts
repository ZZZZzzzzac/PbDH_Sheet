import { describe, expect, it } from "vitest";
import cardTableCss from "./card-table.css?raw";
import modulesCss from "./modules.css?raw";

describe("Sheet Module sizing", () => {
  it("keeps two-row Long Text controls compact without changing their configured row count", () => {
    expect(modulesCss).toMatch(/\.textarea\s*\{[^}]*min-height:\s*48px[^}]*line-height:\s*1\.2/s);
  });

  it("uses Long Text rows as a fixed editor and preview height with scrolling overflow", () => {
    expect(modulesCss).toMatch(/\[data-module-type="longText"\]\s+\[data-part="input"\]\s*\{[^}]*height:\s*var\(--long-text-height[^}]*overflow:\s*auto/s);
  });

  it("raises the focused Sheet Module above adjacent controls", () => {
    expect(modulesCss).toMatch(/\.container:focus-within\s*\{[^}]*position:\s*relative[^}]*z-index:\s*[1-9]/s);
  });

  it("keeps Card Markdown lists in normal block flow", () => {
    expect(cardTableCss).not.toMatch(/\.play-card-description\s*\{[^}]*display:\s*-webkit-box/s);
    expect(cardTableCss).toMatch(/\.play-card-description\s*\{[^}]*white-space:\s*normal/s);
    expect(cardTableCss).toMatch(/\.play-card-description\s+(?:ul|ol)/);
  });

  it("lets Card descriptions use all remaining space at every Card size", () => {
    const descriptionRule = cardTableCss.match(/\.play-card-description\s*\{[^}]*\}/s)?.[0] ?? "";

    expect(descriptionRule).not.toMatch(/max-height/);
    expect(descriptionRule).toMatch(/min-height:\s*0/);
    expect(descriptionRule).toMatch(/overflow:\s*hidden/);
  });
});
