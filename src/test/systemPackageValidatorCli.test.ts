import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import {
  formatSystemPackageValidationReport,
  systemPackageValidationExitCode,
  validateSystemPackagePath,
} from "../../scripts/system-package-validator-lib";

const repoRoot = process.cwd();
const minimalRoot = join(repoRoot, "templates", "system-package-minimal");
const invalidRoot = join(repoRoot, "tests", "fixtures", "system-packages", "errors", "missing-manifest");

describe("System Package validator CLI library", () => {
  it("validates a directory through the production VFS, Loader and Validator", () => {
    const report = validateSystemPackagePath(minimalRoot);
    expect(report.ok).toBe(true);
    expect(report.package?.id).toBe("demo-minimal");
    expect(report.issues).toEqual([]);
    expect(systemPackageValidationExitCode(report)).toBe(0);
    expect(formatSystemPackageValidationReport(report)).toContain("PASS");
  });

  it("returns blocking diagnostics and a failing exit code", () => {
    const report = validateSystemPackagePath(invalidRoot);
    expect(report.ok).toBe(false);
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "MANIFEST_MISSING" })]));
    expect(systemPackageValidationExitCode(report)).toBe(1);
  });

  it("validates zip input", () => {
    const files = Object.fromEntries(walkFiles(minimalRoot).map((file) => [relative(minimalRoot, file).replaceAll("\\", "/"), readFileSync(file)]));
    const temporaryDirectory = mkdtempSync(join(tmpdir(), "pbdh-validator-"));
    const zipPath = join(temporaryDirectory, "minimal.zip");
    try {
      writeFileSync(zipPath, zipSync(files));
      const report = validateSystemPackagePath(zipPath);
      expect(report.ok).toBe(true);
      expect(report.package?.id).toBe("demo-minimal");
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });
});

function walkFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walkFiles(path) : [path];
  });
}
