import assert from "node:assert/strict";
import test from "node:test";
import { analyzeTestFiles, formatTestHealthReport, MAX_TEST_FILE_LINES } from "./test-health.mjs";

test("inventories Vitest and Playwright declarations without imposing a total-test ceiling", () => {
  const report = analyzeTestFiles([
    { path: "src/domain/example.test.ts", content: 'it("one", () => {});\ntest("two", () => {});' },
    { path: "tests/app.spec.ts", content: 'test("browser", async () => {});' },
  ]);

  assert.deepEqual(report.totals, {
    vitest: { files: 1, declarations: 2 },
    playwright: { files: 1, declarations: 1 },
  });
  assert.deepEqual(report.violations, []);
});

test("reports fixed sleeps, repeated package loading, raw CSS coupling, and extreme file size", () => {
  const report = analyzeTestFiles([{
    path: "tests/problem.spec.ts",
    content: [
      'import css from "../src/styles/example.css?raw";',
      "await page.waitForTimeout(500);",
      "loadSystemPackageFromZipFile(createPackageZip());",
      "loadSystemPackageFromZipFile(createPackageZip());",
      ...Array.from({ length: MAX_TEST_FILE_LINES }, () => "// filler"),
    ].join("\n"),
  }]);

  assert.equal(report.violations.length, 4);
  assert.match(report.violations.join("\n"), /fixed Playwright sleep/);
  assert.match(report.violations.join("\n"), /share one immutable normalized fixture/);
  assert.match(report.violations.join("\n"), /raw CSS/);
  assert.match(report.violations.join("\n"), /structural limit/);
});

test("allows raw CSS reads only for stable presentation-contract tests", () => {
  const report = analyzeTestFiles([{
    path: "src/export/output.test.ts",
    content: 'import printCss from "../styles/print.css?raw";',
  }]);

  assert.deepEqual(report.violations, []);
});

test("formats a deterministic human-readable report", () => {
  const report = analyzeTestFiles([
    { path: "src/a.test.ts", content: 'it("a", () => {});' },
  ]);

  assert.match(formatTestHealthReport(report), /Vitest: 1 files, 1 declarations/);
  assert.match(formatTestHealthReport(report), /Structural guardrails: passed/);
});
