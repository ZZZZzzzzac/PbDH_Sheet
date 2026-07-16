import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadSystemPackageFromZipFile } from "./systemPackageLoader";

const cases: Array<[string, string[]]> = [
  ["duplicate-stable-ids", [
    "DUPLICATE_PAGE_ID",
    "DUPLICATE_VALIDATION_CHECK_ID",
    "DUPLICATE_CHECKBOX_OPTION_ID",
    "MISSING_CHECKBOX_OPTION_REFERENCE",
  ]],
  ["invalid-card-definition", ["MISSING_RESOURCE_FIELD_REFERENCE"]],
  ["invalid-dependency-field", ["MISSING_RESOURCE_FIELD_REFERENCE"]],
  ["invalid-validation-script", ["VALIDATION_SCRIPT_SYNTAX_INVALID"]],
];

describe("manual error System Package fixtures", () => {
  it.each(cases)("keeps %s.zip aligned with its expected diagnostics", async (name, expectedCodes) => {
    const bytes = readFileSync(join(process.cwd(), "public", "system-packages", "error-fixtures", `${name}.zip`));
    const result = await loadSystemPackageFromZipFile(new Blob([bytes]));

    expect(result.ok).toBe(false);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toEqual(expect.arrayContaining(expectedCodes));
    for (const issue of result.issues.filter((candidate) => expectedCodes.includes(candidate.code))) {
      expect(issue.location).toBeDefined();
      expect(issue.entities?.length).toBeGreaterThan(0);
      expect(issue.evidence?.length).toBeGreaterThan(0);
    }
  });
});
