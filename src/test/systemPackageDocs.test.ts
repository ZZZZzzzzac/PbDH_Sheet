import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadSystemPackageFromVfs } from "../loaders/systemPackageLoader";
import { createVirtualFileSystem } from "../loaders/packageVfs";

const repoRoot = process.cwd();
const docsRoot = join(repoRoot, "docs", "system-package");

function walk(directory: string, extension?: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path, extension) : !extension || extname(path) === extension ? [path] : [];
  });
}

const markdownFiles = walk(docsRoot, ".md");

describe("System Package documentation", () => {
  it("keeps one canonical information architecture", () => {
    expect(existsSync(join(docsRoot, "author-guide"))).toBe(false);
    expect(existsSync(join(docsRoot, "reference"))).toBe(false);
    expect(existsSync(join(docsRoot, "examples"))).toBe(false);
    expect(existsSync(join(docsRoot, "generated"))).toBe(false);
    expect(existsSync(join(docsRoot, "contract", "schemas"))).toBe(false);
    expect(markdownFiles.map((file) => relative(docsRoot, file).replaceAll("\\", "/")).sort()).toEqual([
      "README.md",
      "authoring-workflow.md",
      "contract/dependencies.md",
      "contract/extensions-adapters.md",
      "contract/guides-validation.md",
      "contract/modules-character-data.md",
      "contract/modules/card-table.md",
      "contract/modules/checkbox-resource.md",
      "contract/modules/countable-resource.md",
      "contract/modules/free-text.md",
      "contract/modules/image-field.md",
      "contract/modules/long-text.md",
      "contract/modules/read-only-display.md",
      "contract/modules/resource-composer.md",
      "contract/modules/resource-picker.md",
      "contract/package-and-assets.md",
      "contract/pages-layout-skins.md",
      "contract/questionnaire-character-creation.md",
      "contract/resources-cards.md",
      "getting-started.md",
    ]);
  });

  it("keeps prose and generated precision in one contract file per topic", () => {
    const contractFiles = markdownFiles.filter((file) => relative(docsRoot, file).replaceAll("\\", "/").startsWith("contract/"));
    const invalid = contractFiles.flatMap((file) => {
      const markdown = readFileSync(file, "utf8");
      const starts = [...markdown.matchAll(/<!-- BEGIN GENERATED CONTRACT -->/g)];
      const ends = [...markdown.matchAll(/<!-- END GENERATED CONTRACT -->/g)];
      return starts.length === 1 && ends.length === 1 && markdown.indexOf("---") < (starts[0]?.index ?? -1)
        ? []
        : [relative(repoRoot, file)];
    });
    expect(invalid).toEqual([]);
  });

  it("keeps relative Markdown links resolvable", () => {
    const broken: string[] = [];
    for (const file of markdownFiles) {
      const markdown = readFileSync(file, "utf8");
      for (const match of markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
        const href = match[1]?.trim();
        if (!href || /^(?:https?:|#)/.test(href)) continue;
        const target = resolve(dirname(file), decodeURIComponent(href.split("#")[0] ?? ""));
        if (!existsSync(target)) broken.push(`${relative(repoRoot, file)}: ${href}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("keeps every fenced JSON example parseable", () => {
    const invalid: string[] = [];
    for (const file of markdownFiles) {
      const markdown = readFileSync(file, "utf8");
      for (const [index, match] of [...markdown.matchAll(/```json\s*\r?\n([\s\S]*?)```/g)].entries()) {
        try {
          JSON.parse(match[1] ?? "");
        } catch (error) {
          invalid.push(`${relative(repoRoot, file)} block ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
    expect(invalid).toEqual([]);
  });

  it("keeps the author contract self-contained instead of sending readers into source", () => {
    const sourceEscapes = markdownFiles.flatMap((file) => {
      const markdown = readFileSync(file, "utf8");
      return /`src\//u.test(markdown) ? [relative(repoRoot, file)] : [];
    });
    expect(sourceEscapes).toEqual([]);
  });

  it("publishes the previously missing field and Package Script contracts", () => {
    const contract = walk(join(docsRoot, "contract"), ".md").map((file) => readFileSync(file, "utf8")).join("\n");
    const scriptApi = readFileSync(join(docsRoot, "contract", "script-api.d.ts"), "utf8");
    const presentation = readFileSync(join(docsRoot, "contract", "pages-layout-skins.md"), "utf8");
    const requiredReferenceTerms = [
      "JSON成员", "开始标记", "结束标记包含字符数", "Character Creation Guide", "retainedAssets",
      "sourceEntries", "cardState", "packageMetadata", "characterAdapterImportOutput",
    ];
    const requiredScriptTypes = [
      "ValidationInput", "ValidationOutput", "ResourceAdapterImportInput", "ResourceAdapterImportOutput",
      "CharacterAdapterImportInput", "CharacterAdapterImportOutput", "CharacterAdapterExportInput", "CharacterAdapterExportOutput",
    ];
    expect(requiredReferenceTerms.filter((term) => !contract.includes(term))).toEqual([]);
    expect(requiredScriptTypes.filter((term) => !scriptApi.includes(`type ${term}`))).toEqual([]);
    expect(["data-guide-region-id", "@font-face", "data-part", "--restricted-markdown-blue"].filter((term) => !presentation.includes(term))).toEqual([]);
  });

  it.each([
    ["minimal template", join(repoRoot, "templates", "system-package-minimal"), "demo-minimal"],
    ["kitchen-sink fixture", join(repoRoot, "tests", "fixtures", "system-packages", "kitchen-sink"), "demo"],
  ])("loads and validates the %s through the real package pipeline", (_name, packageRoot, expectedId) => {
    const files = new Map(walk(packageRoot).map((file) => [
      relative(packageRoot, file).replaceAll("\\", "/"),
      new Uint8Array(readFileSync(file)),
    ]));
    const result = loadSystemPackageFromVfs(createVirtualFileSystem(files));

    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.package.manifest.ID).toBe(expectedId);
  });

  it("only names concrete Validator codes that exist in source", () => {
    const diagnostics = readFileSync(join(docsRoot, "contract", "guides-validation.md"), "utf8");
    const documented = new Set([...diagnostics.matchAll(/`([A-Z][A-Z0-9_]+)`/g)].map((match) => match[1] as string));
    const sourceText = walk(join(repoRoot, "src"), ".ts").map((file) => readFileSync(file, "utf8")).join("\n");
    expect([...documented].filter((code) => !sourceText.includes(`"${code}"`)).sort()).toEqual([]);
  });
});
