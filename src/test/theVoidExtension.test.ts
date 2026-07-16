import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { applyEffectiveResourceCatalog, createEffectiveResourceCatalog } from "../domain/effectiveResourceCatalog";
import { getOtherResourceLibraries, getResourcePickerLinks } from "../domain/systemPackage";
import { loadResourceExtensionFromJsonText } from "../loaders/resourceExtensionLoader";
import { loadSystemPackageFromZipFile } from "../loaders/systemPackageLoader";

const packageRoot = join(process.cwd(), "public", "system-packages", "daggerheart-core");
const extensionPath = join(process.cwd(), "public", "resource-extensions", "the-void-20260710.json");

describe("The Void Resource Extension", () => {
  it("is a normalized 105-Entry, six-Library Extension for daggerheart-core", () => {
    const result = loadResourceExtensionFromJsonText(readFileSync(extensionPath, "utf8"), "daggerheart-core");
    expect(result.ok, result.ok ? undefined : JSON.stringify(result.issues)).toBe(true);
    if (!result.ok) return;

    expect(result.generatedIds).toEqual([]);
    expect(result.extension).toMatchObject({ ID: "daggerheart-core.the-void", 版本: "2026.07.10", 目标系统包ID: "daggerheart-core" });
    expect(Object.fromEntries(result.extension.resourceLibraries.map((library) => [library.ID, library.library.entries.length]))).toEqual({
      classes: 6,
      subclasses: 39,
      ancestries: 6,
      communities: 6,
      "domain-cards": 42,
      "void-transformations": 6,
    });
    const ids = result.extension.resourceLibraries.flatMap((library) => library.library.entries.map((entry) => `${library.ID}:${entry.ID}`));
    expect(new Set(ids).size).toBe(105);
  });

  it("maps class and ancestry fields without losing their rule text", () => {
    const result = loadResourceExtensionFromJsonText(readFileSync(extensionPath, "utf8"), "daggerheart-core");
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    const classes = result.extension.resourceLibraries.find((library) => library.ID === "classes")!.library;
    const ancestries = result.extension.resourceLibraries.find((library) => library.ID === "ancestries")!.library;
    const assassin = classes.entries.find((entry) => entry.fields.名称 === "刺客")!;

    expect(assassin.fields).toMatchObject({ 闪避值: "12", 生命点: "5" });
    expect(assassin.fields.初始闪避值).toBeUndefined();
    expect(assassin.fields.初始生命点).toBeUndefined();
    expect(assassin.fields.描述).toContain("致命打击");
    expect(classes.entries.some((entry) => entry.fields.推荐初始属性)).toBe(true);
    expect(classes.entries.some((entry) => entry.fields.背景问题1 && entry.fields.关系问题1)).toBe(true);
    for (const ancestry of ancestries.entries) {
      expect(ancestry.fields.简介).not.toBe("");
      expect(ancestry.fields.特性A).toMatch(/[:：]/u);
      expect(ancestry.fields.特性B).toMatch(/[:：]/u);
    }
  });

  it("merges five contributions and routes transformations to daggerheart-core Other Picker", async () => {
    const packageResult = await loadSystemPackageFromZipFile(createPackageZip());
    const extensionResult = loadResourceExtensionFromJsonText(readFileSync(extensionPath, "utf8"), "daggerheart-core");
    expect(packageResult.ok).toBe(true);
    expect(extensionResult.ok).toBe(true);
    if (!packageResult.ok || !extensionResult.ok) return;
    const catalog = createEffectiveResourceCatalog(packageResult.package, [extensionResult.extension]);
    const effectivePackage = applyEffectiveResourceCatalog(packageResult.package, catalog);

    expect(catalog.extensions[0].status).toBe("active");
    expect(catalog.libraries.filter((library) => library.contributors.some((item) => item.source.type === "resourceExtension"))).toHaveLength(6);
    expect(getOtherResourceLibraries(effectivePackage).map((library) => library.ID)).toContain("void-transformations");
    const otherPicker = effectivePackage.modules.find((module) => module.类型 === "resourcePicker" && module.资源库 === "其他");
    expect(otherPicker).toMatchObject({ ID: "pick-other-resources", 按钮文本: "选择其他资源" });
    for (const libraryId of ["classes", "subclasses", "communities", "domain-cards"]) {
      expect(effectivePackage.modules.some((module) => module.类型 === "resourcePicker" && getResourcePickerLinks(module).some((link) => link.ID === libraryId))).toBe(true);
    }
  });
});

function createPackageZip(): Blob {
  const files: Record<string, Uint8Array> = {};
  const visit = (directory: string) => {
    for (const name of readdirSync(directory)) {
      const path = join(directory, name);
      if (statSync(path).isDirectory()) visit(path);
      else files[relative(packageRoot, path).replaceAll("\\", "/")] = new Uint8Array(readFileSync(path));
    }
  };
  visit(packageRoot);
  return new Blob([zipSync(files)]);
}
