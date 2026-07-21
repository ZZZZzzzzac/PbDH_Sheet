import { describe, expect, it } from "vitest";
import appShellCss from "./app-shell.css?raw";

describe("Base Framework page navigation layout", () => {
  it("centers navigation on the shared A4 page preview width", () => {
    expect(appShellCss).toMatch(/\.page-navigation\s*\{[^}]*box-sizing:\s*border-box[^}]*width:\s*min\(100%,\s*210mm\)[^}]*margin-inline:\s*auto/s);
  });
});
