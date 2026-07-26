import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { loadSystemPackageFromVfs, type PackageLoadResult } from "../src/loaders/systemPackageLoader";
import { createVirtualFileSystem, createVirtualFileSystemFromZipBytes } from "../src/loaders/packageVfs";

export interface SystemPackageValidationReport {
  path: string;
  ok: boolean;
  package?: { id: string; name: string; version: string; schemaVersion: string };
  issues: PackageLoadResult["issues"];
}

export function validateSystemPackagePath(inputPath: string): SystemPackageValidationReport {
  const absolutePath = resolve(inputPath);
  const stat = statSync(absolutePath);
  let result: PackageLoadResult;

  if (stat.isDirectory()) {
    const files = new Map(walkFiles(absolutePath).map((file) => [
      relative(absolutePath, file).replaceAll("\\", "/"),
      new Uint8Array(readFileSync(file)),
    ]));
    result = loadSystemPackageFromVfs(createVirtualFileSystem(files));
  } else {
    if (extname(absolutePath).toLocaleLowerCase() !== ".zip") {
      throw new Error("System Package 文件必须是 .zip；也可以传入目录。 ");
    }
    const vfs = createVirtualFileSystemFromZipBytes(new Uint8Array(readFileSync(absolutePath)));
    result = vfs.ok ? loadSystemPackageFromVfs(vfs.vfs) : { ok: false, issues: vfs.issues };
  }

  return {
    path: absolutePath,
    ok: result.ok,
    ...(result.ok ? { package: {
      id: result.package.manifest.ID,
      name: result.package.manifest.名称,
      version: result.package.manifest.版本,
      schemaVersion: result.package.manifest.schemaVersion,
    } } : {}),
    issues: result.issues,
  };
}

export function formatSystemPackageValidationReport(report: SystemPackageValidationReport): string {
  const lines = [
    `${report.ok ? "PASS" : "FAIL"} ${report.path}`,
    ...(report.package ? [`Package: ${report.package.name} (${report.package.id}) ${report.package.version}; schema ${report.package.schemaVersion}`] : []),
  ];
  if (report.issues.length === 0) lines.push("Issues: none");
  for (const issue of report.issues) {
    const location = [issue.location?.file ?? issue.path, issue.location?.line, issue.location?.column].filter((value) => value !== undefined).join(":");
    lines.push(`[${issue.level.toUpperCase()}] ${issue.code}${location ? ` ${location}` : ""}: ${issue.text}`);
    for (const evidence of issue.evidence ?? []) lines.push(`  ${evidence.label}: ${JSON.stringify(evidence.value)}`);
  }
  return `${lines.join("\n")}\n`;
}

export function systemPackageValidationExitCode(report: SystemPackageValidationReport): 0 | 1 {
  return report.ok ? 0 : 1;
}

function walkFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walkFiles(path) : [path];
  });
}
