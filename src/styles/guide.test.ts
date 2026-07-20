import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Character Creation Guide styles", () => {
  it("uses Restricted Markdown break nodes as the only blank-line spacing", () => {
    const css = readFileSync("src/styles/guide.css", "utf8");

    expect(css).toMatch(/\.guide-instructions\s*\{[^}]*white-space:\s*normal/s);
    expect(css).toMatch(/\.guide-instructions\s*>\s*p\s*\{[^}]*margin:\s*0/s);
  });
});
