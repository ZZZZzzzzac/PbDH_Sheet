import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { loadSystemPackageFromZipFile } from "../loaders/systemPackageLoader";

const demoRoot = join(process.cwd(), "public", "system-packages", "demo");
const moduleTypes = [
  "freeText",
  "longText",
  "checkboxResource",
  "countableResource",
  "readOnlyDisplay",
  "imageField",
  "resourcePicker",
  "resourceComposer",
  "cardTable",
] as const;

describe("canonical demo System Package", () => {
  it("loads through the normal package pipeline without blocking issues", async () => {
    const result = await loadSystemPackageFromZipFile(new Blob([zipSync(readDirectory(demoRoot))]));

    expect(result.ok, JSON.stringify(result.issues, null, 2)).toBe(true);
    expect(result.issues.filter((issue) => issue.level === "fatal" || issue.level === "error")).toEqual([]);
    if (!result.ok) return;

    expect(result.package.manifest.ID).toBe("demo");
    expect(result.package.pages).toHaveLength(11);
    expect(result.package.characterCreationGuide?.步骤).toHaveLength(13);
    expect(new Set(result.package.modules.map((module) => module.类型))).toEqual(new Set(moduleTypes));
    expect(result.package.modules.find((module) => module.ID === "count-numeric-unbounded")).toMatchObject({
      标签: "无上限数值（步长 2）",
      步长: 2,
    });
    expect(result.package.modules.find((module) => module.ID === "count-numeric-editable")).toMatchObject({
      标签: "可改上限数值",
      最大值可改: true,
    });
  });

  it("documents every module type in the coverage matrix", () => {
    const readme = readFileSync(join(demoRoot, "README.md"), "utf8");
    expect(moduleTypes.filter((type) => !readme.includes(`\`${type}\``))).toEqual([]);
  });

  it("owns its content inset inside the framework A4 page box", () => {
    const css = readFileSync(join(demoRoot, "layouts", "demo.css"), "utf8");
    expect(css).toContain(":scope { width: min(100%, 210mm); height: 297mm;");
    expect(css).toContain("padding: 5mm 4mm;");
  });

  it("uses small original fixture libraries instead of daggerheart-core resources", () => {
    const classes = JSON.parse(readFileSync(join(demoRoot, "resources", "classes.json"), "utf8"));
    const specialties = JSON.parse(readFileSync(join(demoRoot, "resources", "subclasses.json"), "utf8"));
    const cards = JSON.parse(readFileSync(join(demoRoot, "resources", "demo_cards.json"), "utf8"));
    expect([classes.length, specialties.length, cards.length]).toEqual([3, 6, 6]);
    const legacyFiles = walkFiles(demoRoot)
      .map((file) => relative(demoRoot, file).replaceAll("\\", "/"))
      .filter((file) => file.includes("domain-level-1") || file.includes("domain_cards.json"));
    expect(legacyFiles).toEqual([]);
  });
});

function readDirectory(root: string) {
  return Object.fromEntries(walkFiles(root).map((file) => [relative(root, file).replaceAll("\\", "/"), readFileSync(file)]));
}

function walkFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walkFiles(path) : [path];
  });
}
