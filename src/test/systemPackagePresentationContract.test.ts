import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  allowedGlobalHtmlAttributes,
  allowedHtmlAttributesByTag,
  allowedHtmlTags,
  forbiddenHtmlTags,
} from "../domain/systemPackage";
import {
  stableSystemPackageCssVariables,
  stableSystemPackageCssVariableDefinitions,
  stableSystemPackageDataAttributes,
  stableModuleDataParts,
} from "../domain/systemPackagePresentationContract";

const repoRoot = process.cwd();

describe("System Package presentation contract", () => {
  it("keeps generated HTML policy backed by the Validator allowlists", () => {
    expect(allowedHtmlTags.size).toBeGreaterThan(0);
    expect(allowedHtmlTags.has("pb-module")).toBe(true);
    expect(allowedHtmlTags.has("pb-page-outlet")).toBe(true);
    expect(forbiddenHtmlTags.has("script")).toBe(true);
    expect(allowedGlobalHtmlAttributes).toEqual(new Set(["aria-label", "class", "title"]));
    expect(allowedHtmlAttributesByTag.get("pb-module")).toEqual(new Set(["id"]));
  });

  it("keeps every promised data-part hook present in its module renderer", () => {
    const rendererByModule = {
      freeText: ["FreeTextModule.tsx"],
      longText: ["LongTextModule.tsx"],
      checkboxResource: ["CheckboxResourceModule.tsx"],
      countableResource: ["CountableResourceModule.tsx"],
      readOnlyDisplay: ["ReadOnlyDisplayModule.tsx"],
      imageField: ["ImageFieldModule.tsx"],
      resourcePicker: ["ResourcePickerModule.tsx"],
      resourceComposer: ["ResourceComposerModule.tsx"],
      cardTable: ["CardTableModule.tsx", "cardTable"],
    } satisfies Record<keyof typeof stableModuleDataParts, string[]>;
    const missing = Object.entries(stableModuleDataParts).flatMap(([moduleType, parts]) => {
      const source = rendererByModule[moduleType as keyof typeof rendererByModule].map((rendererPath) => {
        const path = join(repoRoot, "src", "rendering", rendererPath);
        return statSync(path).isDirectory() ? readSources(path, new Set([".ts", ".tsx"])) : readFileSync(path, "utf8");
      }).join("\n");
      return parts.filter((part) => !source.includes(`data-part=\"${part}\"`)).map((part) => `${moduleType}:${part}`);
    });
    expect(missing).toEqual([]);
  });

  it("keeps stable CSS variables and data attributes present in production source", () => {
    const source = readSources(join(repoRoot, "src"), new Set([".ts", ".tsx", ".css"]));
    expect(stableSystemPackageCssVariables.filter((name) => !source.includes(name))).toEqual([]);
    expect(stableSystemPackageCssVariableDefinitions.filter(({ name, defaultValue }) => {
      const declaration = `${name}: ${defaultValue}`;
      const fallback = `var(${name}, ${defaultValue})`;
      return !source.includes(declaration) && !source.includes(fallback);
    })).toEqual([]);
    expect(stableSystemPackageDataAttributes.filter((name) => !source.includes(name))).toEqual([]);
  });
});

function readSources(directory: string, extensions: Set<string>): string {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return [readSources(path, extensions)];
    return extensions.has(extname(path)) ? [readFileSync(path, "utf8")] : [];
  }).join("\n");
}
