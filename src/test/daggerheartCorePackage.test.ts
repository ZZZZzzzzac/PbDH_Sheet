import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { loadSystemPackageFromZipFile } from "../loaders/systemPackageLoader";

const packageRoot = join(process.cwd(), "public", "system-packages", "daggerheart-core");

describe("Daggerheart core System Package", () => {
  it("loads through the normal package pipeline without fatal or error diagnostics", async () => {
    const result = await loadSystemPackageFromZipFile(createPackageZip());

    expect(result.ok, result.ok ? undefined : JSON.stringify(result.issues, null, 2)).toBe(true);
    if (!result.ok) return;

    expect(result.issues.filter((issue) => issue.level === "fatal" || issue.level === "error")).toEqual([]);
  });
});

function createPackageZip(): Blob {
  const files = Object.fromEntries(
    walkFiles(packageRoot).map((path) => [relative(packageRoot, path).replaceAll("\\", "/"), readFileSync(path)]),
  );
  return new Blob([zipSync(files)], { type: "application/zip" });
}

function walkFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walkFiles(path) : [path];
  });
}
