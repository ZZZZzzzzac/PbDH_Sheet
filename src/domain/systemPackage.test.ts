import { describe, expect, it } from "vitest";
import { minimalSystemPackage } from "../test/fixtures";
import { validateSystemPackage } from "./systemPackage";

describe("validateSystemPackage", () => {
  it("accepts the minimal demo System Package", () => {
    const result = validateSystemPackage(minimalSystemPackage);

    expect(result.ok).toBe(true);
  });

  it("reports a visible error for a missing Sheet Module reference", () => {
    const invalidPackage = {
      ...minimalSystemPackage,
      pages: [
        {
          ...minimalSystemPackage.pages[0],
          sections: [
            {
              ...minimalSystemPackage.pages[0].sections[0],
              modules: ["missing-module"],
            },
          ],
        },
      ],
    };

    const result = validateSystemPackage(invalidPackage);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MISSING_MODULE_REFERENCE",
          level: "error",
        }),
      ]),
    );
  });
});
