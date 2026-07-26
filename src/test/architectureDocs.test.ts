import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const docsRoot = join(repoRoot, "docs");
const adrRoot = join(docsRoot, "adr");

const durableEntryFiles = [
  join(repoRoot, "README.md"),
  join(repoRoot, "AGENTS.md"),
  join(repoRoot, "CONTEXT.md"),
  join(docsRoot, "README.md"),
  join(docsRoot, "PRD.md"),
  join(docsRoot, "architecture.md"),
  join(adrRoot, "README.md"),
];

function relativeMarkdownTargets(file: string): string[] {
  const markdown = readFileSync(file, "utf8");
  return [...markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)]
    .map((match) => match[1]?.trim())
    .filter((target): target is string => Boolean(target) && !/^(?:https?:|#)/.test(target ?? ""));
}

describe("architecture documentation", () => {
  it("keeps durable documentation entry links resolvable", () => {
    const broken = durableEntryFiles.flatMap((file) =>
      relativeMarkdownTargets(file)
        .map((target) => target.split("#")[0] ?? "")
        .filter(Boolean)
        .filter((target) => !existsSync(resolve(dirname(file), decodeURIComponent(target))))
        .map((target) => `${basename(file)}: ${target}`),
    );

    expect(broken).toEqual([]);
  });

  it("keeps one current architecture document", () => {
    expect(existsSync(join(docsRoot, "architecture.md"))).toBe(true);
    expect(existsSync(join(docsRoot, "c4.md"))).toBe(false);
    expect(existsSync(join(docsRoot, "PRD-raw.md"))).toBe(false);
    expect(existsSync(join(docsRoot, "migration"))).toBe(false);

    const entryText = durableEntryFiles.map((file) => readFileSync(file, "utf8")).join("\n");
    expect(entryText).not.toContain("docs/c4.md");
    expect(entryText).not.toContain("docs/PRD-raw.md");
    expect(entryText).not.toContain("当前还没有实现代码");
  });

  it("indexes every numbered ADR exactly once", () => {
    const adrFiles = readdirSync(adrRoot)
      .filter((name) => /^\d{4}-.+\.md$/.test(name))
      .sort();
    const index = readFileSync(join(adrRoot, "README.md"), "utf8");
    const indexedTargets = [...index.matchAll(/\[\d{4}\]\((\d{4}-[^)]+\.md)\)/g)]
      .map((match) => match[1] as string)
      .sort();

    expect(indexedTargets).toEqual(adrFiles);
  });

  it("keeps every ADR in the documented lifecycle format", () => {
    const malformed = readdirSync(adrRoot)
      .filter((name) => /^\d{4}-.+\.md$/.test(name))
      .filter((name) => {
        const number = name.slice(0, 4);
        const markdown = readFileSync(join(adrRoot, name), "utf8");
        const hasTitle = new RegExp(`^# ADR-${number}: .+`, "m").test(markdown);
        const hasDate = /^日期：\d{4}-\d{2}-\d{2}\s*$/m.test(markdown);
        const status = markdown.match(/^状态：(.+)$/m)?.[1]?.trim();
        const hasStatus = status === "Accepted"
          || status === "Deprecated"
          || /^Superseded by \[ADR-\d{4}\]\([^)]+\.md\)$/.test(status ?? "");
        return !hasTitle || !hasDate || !hasStatus;
      });

    expect(malformed).toEqual([]);
  });

  it("keeps superseded ADR targets resolvable", () => {
    const broken = readdirSync(adrRoot)
      .filter((name) => /^\d{4}-.+\.md$/.test(name))
      .flatMap((name) => {
        const markdown = readFileSync(join(adrRoot, name), "utf8");
        const target = markdown.match(/^状态：Superseded by \[ADR-\d{4}\]\(([^)]+\.md)\)$/m)?.[1];
        return target && !existsSync(join(adrRoot, target)) ? [`${name}: ${target}`] : [];
      });

    expect(broken).toEqual([]);
  });

  it("records the current non-PWA deployment decision", () => {
    const architecture = readFileSync(join(docsRoot, "architecture.md"), "utf8");
    const currentDecision = readFileSync(join(adrRoot, "0030-static-web-without-pwa-or-server-api.md"), "utf8");
    const originalDecision = readFileSync(join(adrRoot, "0001-static-pwa-no-server-api.md"), "utf8");

    expect(architecture).toContain("不注册 Service Worker");
    expect(architecture).toContain("0030-static-web-without-pwa-or-server-api.md");
    expect(currentDecision).toContain("状态：Accepted");
    expect(originalDecision).toContain("状态：Superseded by [ADR-0030]");

    for (const amended of ["0006-local-storage-and-assets.md", "0009-frontend-technology-baseline.md"]) {
      expect(readFileSync(join(adrRoot, amended), "utf8")).toContain("0030-static-web-without-pwa-or-server-api.md");
    }
  });
});
