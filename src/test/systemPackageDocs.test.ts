import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const docsRoot = join(repoRoot, "docs", "system-package");

function walk(directory: string, extension: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path, extension) : extname(path) === extension ? [path] : [];
  });
}

const markdownFiles = walk(docsRoot, ".md");

describe("System Package documentation", () => {
  it("keeps relative Markdown links resolvable", () => {
    const broken: string[] = [];
    for (const file of markdownFiles) {
      const markdown = readFileSync(file, "utf8");
      for (const match of markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
        const href = match[1]?.trim();
        if (!href || /^(?:https?:|#)/.test(href)) continue;
        const target = resolve(dirname(file), decodeURIComponent(href.split("#")[0] ?? ""));
        if (!existsSync(target)) broken.push(`${file}: ${href}`);
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
          invalid.push(`${file} block ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
    expect(invalid).toEqual([]);
  });

  it("only documents concrete Validator codes that exist in source", () => {
    const reference = readFileSync(join(docsRoot, "reference", "validator-diagnostics.md"), "utf8");
    const documented = new Set([...reference.matchAll(/`([A-Z][A-Z0-9_]+)`/g)].map((match) => match[1] as string));
    const sourceText = walk(join(repoRoot, "src"), ".ts").map((file) => readFileSync(file, "utf8")).join("\n");
    const missing = [...documented].filter((code) => !sourceText.includes(`"${code}"`)).sort();
    expect(missing).toEqual([]);
  });

  it("keeps example documents self-contained instead of redirecting to demo packages", () => {
    const examplesRoot = join(docsRoot, "examples");
    const examples = walk(examplesRoot, ".md").map((file) => ({ file, markdown: readFileSync(file, "utf8") }));
    const externalPackageReferences = examples.filter(({ markdown }) =>
      /public\/system-packages|error-fixtures|demo-(?:minimal|modules|selection)/.test(markdown),
    );

    expect(externalPackageReferences.map(({ file }) => file)).toEqual([]);
  });

  it("covers current optional System Package contracts in the complete inline example", () => {
    const complete = readFileSync(join(docsRoot, "examples", "complete-package.md"), "utf8");
    const requiredExamples = [
      '"shell"', '"dependencies"', '"characterCreationGuide"', '"resourceLibraries"', '"validationChecks"', '"assets"',
      '"默认隐藏"', '"打印"', '"freeText"', '"longText"', '"checkboxResource"', '"countableResource"',
      '"readOnlyDisplay"', '"imageField"', '"resourcePicker"', '"cardTable"', '"字段模板"', '"默认查询"',
      '"创建卡牌"', '"fillText"', '"fillCountable"', '"setVisibility"', '"setResourceDefaultFilter"',
      '"selectedResourceFieldEquals"', '"selectedResourceFieldNotEquals"', '"selectedResourceFieldIn"',
      '"checkboxOptionChecked"', '"checkboxOptionUnchecked"', '<pb-page-outlet>', 'module.exports = async',
    ];

    expect(requiredExamples.filter((example) => !complete.includes(example))).toEqual([]);
  });
});
