import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { loadSystemPackageFromZipFile } from "../loaders/systemPackageLoader";
import { composeResource } from "../domain/resourceComposer";

const packageRoot = join(process.cwd(), "public", "system-packages", "daggerheart-core");

describe("Daggerheart core System Package", () => {
  it("loads through the normal package pipeline without fatal or error diagnostics", async () => {
    const result = await loadSystemPackageFromZipFile(createPackageZip());

    expect(result.ok, result.ok ? undefined : JSON.stringify(result.issues, null, 2)).toBe(true);
    if (!result.ok) return;

    expect(result.issues.filter((issue) => issue.level === "fatal" || issue.level === "error")).toEqual([]);
  });

  it("routes pure and mixed ancestry features through one Resource Composer", async () => {
    const result = await loadSystemPackageFromZipFile(createPackageZip());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const composer = result.package.modules.find((module) => module.ID === "pick-ancestry");
    const library = result.package.resourceLibraries?.find((candidate) => candidate.ID === "ancestries");
    expect(composer?.类型).toBe("resourceComposer");
    if (composer?.类型 !== "resourceComposer" || !library) return;
    const elf = library.entries.find((entry) => entry.fields.名称 === "精灵")!;
    const human = library.entries.find((entry) => entry.fields.名称 === "人类")!;

    expect(composeResource(composer, { "ancestry-a": elf, "ancestry-b": elf })?.fields).toMatchObject({
      特性A: elf.fields.特性A,
      特性B: elf.fields.特性B,
    });
    expect(composeResource(composer, { "ancestry-a": elf, "ancestry-b": human })?.fields).toMatchObject({
      特性A: elf.fields.特性A,
      特性B: human.fields.特性B,
    });
  });

  it("styles the ancestry Composer like the compact Resource Picker buttons", () => {
    const css = readFileSync(join(packageRoot, "layouts", "base.css"), "utf8");
    expect(css).toContain(':is([data-module-type="resourcePicker"], [data-module-type="resourceComposer"])');
    expect(css).toMatch(/:is\(\[data-module-type="resourcePicker"\], \[data-module-type="resourceComposer"\]\)[\s\S]*?border:\s*0;/);
    expect(css).toMatch(/:is\(\[data-module-type="resourcePicker"\], \[data-module-type="resourceComposer"\]\) \[data-part="button"\][\s\S]*?font-size:\s*0;/);
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
