import { describe, expect, it } from "vitest";
import cardTableCss from "./card-table.css?raw";
import countableResourceCss from "./countable-resource.css?raw";
import modulesCss from "./modules.css?raw";

describe("Sheet Module sizing", () => {
  it("uses Long Text rows as a fixed editor and preview height with scrolling overflow", () => {
    expect(modulesCss).toMatch(/\[data-module-type="longText"\]\s+\[data-part="input"\]\s*\{[^}]*height:\s*var\(--long-text-height[^}]*overflow:\s*auto/s);
  });

  it("keeps Countable Resource text and image markers in equal square cells", () => {
    expect(countableResourceCss).toMatch(/\.marker-group\s*\{[^}]*font-size:\s*var\(--countable-marker-size,\s*inherit\)/s);
    expect(countableResourceCss).toMatch(/\.marker-cell\s*\{[^}]*flex:\s*0 0 1em[^}]*width:\s*1em[^}]*height:\s*1em/s);
    expect(countableResourceCss).not.toMatch(/\.marker-cell\[data-marker-type="(?:text|image)"\]\s*\{[^}]*(?:width|flex-basis)/s);
    expect(countableResourceCss).toMatch(/\.marker-image\s*\{[^}]*width:\s*100%[^}]*height:\s*100%[^}]*object-fit:\s*contain/s);
    expect(countableResourceCss).toMatch(/\[data-countable-print-strategy="clear-uniform-squares"\]\s+\.marker-cell\s+\.marker-glyph\s*\{[^}]*display:\s*none/s);
  });

  it("raises the focused Sheet Module above adjacent controls", () => {
    expect(modulesCss).toMatch(/\.container:focus-within\s*\{[^}]*position:\s*relative[^}]*z-index:\s*[1-9]/s);
  });

  it("stretches Free Text editors and inputs to the Module content area", () => {
    expect(modulesCss).toMatch(/\[data-module-type="freeText"\]\s*>\s*\[data-markdown-editor="true"\]\s*\{[^}]*align-self:\s*stretch[^}]*min-height:\s*0/s);
    expect(modulesCss).toMatch(/\[data-module-type="freeText"\]\s*>\s*\[data-markdown-editor="true"\]\s*>\s*\[data-part="input"\][^\{]*\{[^}]*align-self:\s*stretch[^}]*height:\s*100%[^}]*min-height:\s*0[^}]*text-align:\s*center/s);
  });

  it("centers Free Text values in both editing and preview states", () => {
    expect(modulesCss).toMatch(/\[data-module-type="freeText"\]\s*>\s*\[data-markdown-editor="true"\]\s*>\s*\[data-part="input"\][^\{]*\{[^}]*text-align:\s*center/s);
    expect(modulesCss).toMatch(/\[data-module-type="freeText"\]\s*>\s*\[data-markdown-preview="true"\]:not\(\[hidden\]\)\s*\{[^}]*display:\s*flex[^}]*align-items:\s*center[^}]*justify-content:\s*center/s);
    expect(modulesCss).not.toMatch(/\[data-module-type="freeText"\]\s*>\s*\[data-markdown-preview="true"\]\s*\{[^}]*display:/s);
  });

  it("keeps Card Markdown lists in normal block flow", () => {
    expect(cardTableCss).not.toMatch(/\.play-card-description\s*\{[^}]*display:\s*-webkit-box/s);
    expect(cardTableCss).toMatch(/\.play-card-description\s*\{[^}]*white-space:\s*normal/s);
    expect(cardTableCss).toMatch(/\.play-card-description\s+(?:ul|ol)/);
  });

  it("keeps light text Cards readable when the surrounding Skin uses dark text variables", () => {
    expect(cardTableCss).toMatch(/\.play-card-text\s*\{[^}]*background:\s*#fffdf7[^}]*color:\s*#202426/s);
    expect(cardTableCss).toMatch(/\.play-card-name\s*\{[^}]*color:\s*inherit/s);
    expect(cardTableCss).toMatch(/\.play-card-description\s*\{[^}]*color:\s*inherit/s);
  });

  it("lets Card descriptions use all remaining space at every Card size", () => {
    const descriptionRule = cardTableCss.match(/\.play-card-description\s*\{[^}]*\}/s)?.[0] ?? "";

    expect(descriptionRule).not.toMatch(/max-height/);
    expect(descriptionRule).toMatch(/min-height:\s*0/);
    expect(descriptionRule).toMatch(/overflow:\s*hidden/);
  });

  it("renders Card state appearance as an image-safe outline and badge instead of a background", () => {
    expect(cardTableCss).toMatch(/\.play-card\.has-card-state-appearance::after[\s\S]*?border:\s*4px solid var\(--play-card-state-color\)/);
    expect(cardTableCss).toMatch(/\.play-card-state-badge\s*\{[^}]*top:\s*-10px[^}]*right:\s*22px[^}]*border:\s*2px solid var\(--play-card-state-color\)/s);
    expect(cardTableCss).not.toContain("--play-card-state-background");
  });
});
