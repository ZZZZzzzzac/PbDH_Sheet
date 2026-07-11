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
});
