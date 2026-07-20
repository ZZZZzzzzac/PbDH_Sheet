import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const packagesRoot = join(process.cwd(), "public", "system-packages");
const examplesRoot = join(process.cwd(), "docs", "system-package", "examples");

function packageCss(packageId: string, relativePath: string): string {
  return readFileSync(join(packagesRoot, packageId, relativePath), "utf8");
}

function examplePackageCss(packageId: string, relativePath: string): string {
  return readFileSync(join(examplesRoot, packageId, relativePath), "utf8");
}

function expectA4PreviewScope(css: string): void {
  expect(css).toMatch(/:scope\s*\{[^}]*width:\s*min\(100%,\s*210mm\);[^}]*margin-inline:\s*auto/s);
}

describe("built-in System Package print layout contract", () => {
  it("keeps Daggerheart Page geometry and content insets in Layout CSS", () => {
    const base = packageCss("daggerheart-core", "layouts/base.css");
    const beasts = packageCss("daggerheart-core", "layouts/beast-forms.css");
    const companion = packageCss("daggerheart-core", "layouts/ranger-companion.css");
    const shell = packageCss("daggerheart-core", "layouts/shell.css");

    for (const css of [base, beasts, companion]) expectA4PreviewScope(css);
    expect(base).toMatch(/\.daggerheart-sheet\s*\{[^}]*padding:\s*0\.4rem/s);
    expect(beasts).toMatch(/\.beast-reference-page\s*\{[^}]*padding:\s*0/s);
    expect(companion).toMatch(/\.companion-page\s*\{[^}]*padding:\s*3mm/s);
    expect(shell).toMatch(/\.print-mode :scope \.daggerheart-card-pane\s*\{[^}]*padding:\s*3mm/s);
    expect(shell).toMatch(/@media print\s*\{[\s\S]*?\.daggerheart-card-pane\s*\{[^}]*padding:\s*3mm/s);
  });

  it("keeps Demo and Demo Minimal content insets package-owned", () => {
    const demo = examplePackageCss("demo", "layouts/demo.css");
    const minimal = examplePackageCss("demo-minimal", "layouts/main.css");

    expectA4PreviewScope(demo);
    expect(demo).toMatch(/\.demo-page\s*\{[^}]*padding:\s*5mm 4mm/s);
    expectA4PreviewScope(minimal);
    expect(minimal).toMatch(/\.minimal-sheet\s*\{[^}]*padding:\s*5mm 4mm/s);
  });

  it("keeps Hopefind A4 geometry in Layout CSS and Skin spacing inside the Page", () => {
    const layout = packageCss("heart-of-hopefind", "layouts/base.css");
    const skins = [
      packageCss("heart-of-hopefind", "skins/survivor-notebook.css"),
      packageCss("heart-of-hopefind", "skins/dawn-survey/skin.css"),
    ];

    expect(layout).toMatch(/:scope\s*\{[^}]*width:\s*210mm;[^}]*max-width:\s*none;[^}]*margin-inline:\s*auto/s);
    expect(layout).toMatch(/\.hopefind-page\s*\{[^}]*padding:\s*6mm/s);
    for (const skin of skins) {
      expect(skin).not.toMatch(/\.sheet-page\s*\{/);
      expect(skin).toMatch(/\.character-sheet\s*\{[^}]*padding:\s*12px/s);
    }
  });

  it("keeps HOW'S MY DRIVING Page spacing shared by screen and print", () => {
    const layout = packageCss("hows-my-driving", "layouts/base.css");

    expectA4PreviewScope(layout);
    expect(layout).toMatch(/\.hmd-page\s*\{[^}]*padding:\s*6mm/s);
    expect(layout).not.toMatch(/@media print\s*\{[\s\S]*?\.hmd-page\s*\{[^}]*padding/s);
  });

  it("keeps Witchy spacing on package Page roots instead of the framework Page box", () => {
    const layout = packageCss("witchy", "layouts/base.css");
    const skin = packageCss("witchy", "skins/witching-hour/skin.css");

    expectA4PreviewScope(layout);
    expect(layout).toMatch(/\.witchy-page\s*\{[^}]*padding:\s*7mm/s);
    const printBlock = layout.match(/@media print\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
    expect(printBlock).not.toMatch(/\.witchy-page\s*\{[^}]*padding/s);
    expect(skin).not.toMatch(/\.sheet-page\s*\{/);
    expect(skin).toMatch(/\.witching-hour-sheet\s*\{[^}]*padding:\s*5mm 4mm/s);
  });
});
