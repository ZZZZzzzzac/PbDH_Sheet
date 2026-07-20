import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const MAX_TEST_FILE_LINES = 1200;
export const REVIEW_TEST_FILE_LINES = 600;

const RAW_CSS_CONTRACT_FILES = new Set([
  "src/export/output.test.ts",
  "src/rendering/RestrictedMarkdown.test.tsx",
  "src/styles/guide.test.ts",
  "src/styles/modules.test.ts",
  "src/test/systemPackagePrintLayout.test.ts",
]);

function normalizePath(filePath) {
  return filePath.replaceAll("\\", "/");
}

function countMatches(content, pattern) {
  return [...content.matchAll(pattern)].length;
}

export function analyzeTestFiles(files) {
  const inventory = files.map(({ path: filePath, content }) => {
    const normalizedPath = normalizePath(filePath);
    const lines = content === "" ? 0 : content.replace(/\r\n/g, "\n").split("\n").length;
    const declarations = countMatches(content, /^\s*(?:it|test)(?:\.(?:skip|only|todo))?\s*\(/gm);
    const fixedSleeps = countMatches(content, /\bwaitForTimeout\s*\(/g);
    const packageLoads = countMatches(content, /\bloadSystemPackageFromZipFile\s*\(\s*createPackageZip\s*\(\s*\)\s*\)/g);
    const readsRawCss = /readFileSync\([^\n]*\.css|from\s+["'][^"']+\.css\?raw/.test(content);
    return {
      path: normalizedPath,
      kind: normalizedPath.startsWith("tests/") || normalizedPath.endsWith(".spec.ts") ? "playwright" : "vitest",
      lines,
      declarations,
      fixedSleeps,
      packageLoads,
      readsRawCss,
    };
  });

  const violations = [];
  for (const file of inventory) {
    if (file.lines > MAX_TEST_FILE_LINES) {
      violations.push(`${file.path}: ${file.lines} lines exceeds the ${MAX_TEST_FILE_LINES}-line structural limit`);
    }
    if (file.fixedSleeps > 0) {
      violations.push(`${file.path}: contains ${file.fixedSleeps} fixed Playwright sleep(s); poll observable state instead`);
    }
    if (file.packageLoads > 1) {
      violations.push(`${file.path}: loads the same generated System Package ${file.packageLoads} times; share one immutable normalized fixture`);
    }
    if (file.readsRawCss && !RAW_CSS_CONTRACT_FILES.has(file.path)) {
      violations.push(`${file.path}: reads raw CSS outside the documented presentation-contract allowlist`);
    }
  }

  const totals = inventory.reduce((result, file) => {
    result[file.kind].files += 1;
    result[file.kind].declarations += file.declarations;
    return result;
  }, {
    vitest: { files: 0, declarations: 0 },
    playwright: { files: 0, declarations: 0 },
  });

  return {
    totals,
    largest: [...inventory].sort((left, right) => right.lines - left.lines || left.path.localeCompare(right.path)).slice(0, 10),
    review: inventory.filter((file) => file.lines > REVIEW_TEST_FILE_LINES).sort((left, right) => right.lines - left.lines),
    violations,
  };
}

async function walk(directory, rootDirectory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(absolutePath, rootDirectory));
      continue;
    }
    if (!/\.(?:test\.(?:ts|tsx)|spec\.ts)$/.test(entry.name)) continue;
    files.push({
      path: normalizePath(path.relative(rootDirectory, absolutePath)),
      content: await readFile(absolutePath, "utf8"),
    });
  }
  return files;
}

export async function collectTestFiles(rootDirectory = process.cwd()) {
  const files = [];
  for (const directory of ["src", "tests"]) {
    files.push(...await walk(path.join(rootDirectory, directory), rootDirectory));
  }
  return files;
}

export function formatTestHealthReport(report) {
  const lines = [
    `Vitest: ${report.totals.vitest.files} files, ${report.totals.vitest.declarations} declarations`,
    `Playwright: ${report.totals.playwright.files} files, ${report.totals.playwright.declarations} declarations`,
    "Largest test Modules:",
    ...report.largest.map((file) => `  ${String(file.lines).padStart(4)}  ${file.path}`),
  ];
  if (report.review.length > 0) {
    lines.push(`Review candidates (>${REVIEW_TEST_FILE_LINES} lines, informational):`);
    lines.push(...report.review.map((file) => `  ${file.lines}  ${file.path}`));
  }
  if (report.violations.length === 0) lines.push("Structural guardrails: passed");
  else lines.push("Structural guardrails: failed", ...report.violations.map((violation) => `  - ${violation}`));
  return lines.join("\n");
}

async function main() {
  const report = analyzeTestFiles(await collectTestFiles());
  console.log(formatTestHealthReport(report));
  if (report.violations.length > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
