import { describe, expect, it } from "vitest";
import modulesCss from "./modules.css?raw";

describe("Sheet Module sizing", () => {
  it("keeps two-row Long Text controls compact without changing their configured row count", () => {
    expect(modulesCss).toMatch(/\.textarea\s*\{[^}]*min-height:\s*48px[^}]*line-height:\s*1\.2/s);
  });
});
