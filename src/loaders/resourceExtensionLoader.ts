import { strToU8, zipSync } from "fflate";
import type { GeneratedResourceId, ResourceExtension, ResourceExtensionIdContext, ResourceExtensionIssue } from "../domain/resourceExtension";
import { loadResourceExtensionJson } from "../domain/resourceExtension";
import { inferMimeType } from "../utils";
import type { RuntimePackageAsset } from "./assetResolver";
import { createVirtualFileSystemFromZipFile, type PackageVirtualFileSystem } from "./packageVfs";

export interface NormalizedResourceExtensionArtifact {
  fileName: string;
  mimeType: "application/json" | "application/zip";
  bytes: Uint8Array;
}

export type ResourceExtensionFileLoadResult =
  | {
      ok: true;
      extension: ResourceExtension;
      assets: RuntimePackageAsset[];
      issues: ResourceExtensionIssue[];
      generatedIds: GeneratedResourceId[];
      normalizedArtifact: NormalizedResourceExtensionArtifact;
    }
  | { ok: false; issues: ResourceExtensionIssue[] };

export function loadResourceExtensionFromJsonText(
  text: string,
  currentSystemPackageId: string,
  context: ResourceExtensionIdContext = {},
): ResourceExtensionFileLoadResult {
  const loaded = loadResourceExtensionJson(text, currentSystemPackageId, context);
  if (!loaded.ok) return loaded;
  const contentIssues = validateJsonExtensionContent(loaded.extension);
  if (contentIssues.length > 0) return { ok: false, issues: contentIssues };
  return {
    ok: true,
    extension: loaded.extension,
    assets: [],
    issues: [],
    generatedIds: loaded.generatedIds,
    normalizedArtifact: {
      fileName: `${loaded.extension.ID}.normalized.json`,
      mimeType: "application/json",
      bytes: strToU8(loaded.normalizedJson),
    },
  };
}

export async function loadResourceExtensionFromZipFile(
  file: Blob,
  currentSystemPackageId: string,
  context: ResourceExtensionIdContext = {},
): Promise<ResourceExtensionFileLoadResult> {
  const vfsResult = await createVirtualFileSystemFromZipFile(file);
  if (!vfsResult.ok) return { ok: false, issues: vfsResult.issues.map(toExtensionIssue) };
  const vfs = vfsResult.vfs;
  const document = vfs.readText("extension.json");
  if (!document.ok) {
    return { ok: false, issues: [{ level: "error", code: "RESOURCE_EXTENSION_MANIFEST_MISSING", text: "ZIP 根目录缺少 extension.json。", path: "extension.json" }] };
  }
  const loaded = loadResourceExtensionJson(document.value, currentSystemPackageId, context);
  if (!loaded.ok) return loaded;

  const issues: ResourceExtensionIssue[] = [];
  const assets: RuntimePackageAsset[] = [];
  for (const path of vfs.listFiles()) {
    if (path === "extension.json") continue;
    if (!path.startsWith("assets/") || !isSupportedImagePath(path)) {
      issues.push({ level: "error", code: "RESOURCE_EXTENSION_FILE_UNSUPPORTED", text: `Resource Extension 不支持文件：${path}`, path });
      continue;
    }
    const read = vfs.readBytes(path);
    if (!read.ok) {
      issues.push(toExtensionIssue(read.issue));
      continue;
    }
    if (path.toLocaleLowerCase().endsWith(".svg") && !isSafeSvg(read.value)) {
      issues.push({ level: "error", code: "RESOURCE_EXTENSION_SVG_UNSAFE", text: `SVG 包含不安全内容：${path}`, path });
      continue;
    }
    assets.push({
      路径: read.path,
      类型: inferMimeType(read.path),
      bytes: read.value,
      sourceType: "resourceExtension",
      sourceId: loaded.extension.ID,
    });
  }

  const referencedPaths = collectExtensionImageReferences(loaded.extension);
  const assetPaths = new Set(assets.map((asset) => asset.路径));
  for (const path of referencedPaths) {
    if (!assetPaths.has(path)) issues.push({ level: "error", code: "RESOURCE_EXTENSION_IMAGE_MISSING", text: `Resource Extension 引用了不存在的图片：${path}`, path });
  }
  for (const path of assetPaths) {
    if (!referencedPaths.has(path)) issues.push({ level: "warning", code: "RESOURCE_EXTENSION_IMAGE_UNUSED", text: `Resource Extension 图片未被引用：${path}`, path });
  }
  if (issues.some((issue) => issue.level === "error")) return { ok: false, issues };

  return {
    ok: true,
    extension: { ...loaded.extension, sourceType: "zip" },
    assets,
    issues,
    generatedIds: loaded.generatedIds,
    normalizedArtifact: buildNormalizedZip(vfs, loaded.extension.ID, loaded.normalizedJson),
  };
}

function validateJsonExtensionContent(extension: ResourceExtension): ResourceExtensionIssue[] {
  const issues: ResourceExtensionIssue[] = [];
  for (const contribution of extension.resourceLibraries) {
    contribution.entries.forEach((entry, entryIndex) => {
      for (const value of collectStrings(entry)) {
        if (value.startsWith("data:image/")) {
          issues.push({ level: "error", code: "RESOURCE_EXTENSION_INLINE_IMAGE_UNSUPPORTED", text: "JSON Resource Extension 不接受 base64 图片；请改用 ZIP assets。", path: `resourceLibraries.${contribution.ID}.entries.${entryIndex}` });
        } else if (isSupportedImagePath(value) && value.startsWith("assets/")) {
          issues.push({ level: "error", code: "RESOURCE_EXTENSION_IMAGE_REQUIRES_ZIP", text: `JSON Resource Extension 无法携带图片：${value}`, path: value });
        }
      }
    });
  }
  return issues;
}

function collectExtensionImageReferences(extension: ResourceExtension): Set<string> {
  const paths = new Set<string>();
  for (const contribution of extension.resourceLibraries) {
    for (const entry of contribution.entries) {
      for (const value of collectStrings(entry)) {
        if (value.startsWith("assets/") && isSupportedImagePath(value)) paths.add(value);
        if (value.startsWith("data:image/")) paths.add(value);
      }
    }
  }
  return paths;
}

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (typeof value === "object" && value !== null) return Object.values(value).flatMap(collectStrings);
  return [];
}

function isSupportedImagePath(path: string): boolean {
  return /\.(?:png|jpe?g|webp|gif|avif|svg)$/iu.test(path);
}

function isSafeSvg(bytes: Uint8Array): boolean {
  const svg = new TextDecoder().decode(bytes);
  if (!/<svg\b/iu.test(svg)) return false;
  return !/<(?:script|foreignObject)\b|\bon[a-z]+\s*=|<!ENTITY|<\?xml-stylesheet|\b(?:href|src)\s*=\s*["']\s*(?:https?:|\/\/|data:|javascript:)|url\(\s*["']?\s*(?:https?:|\/\/|data:|javascript:)/iu.test(svg);
}

function buildNormalizedZip(vfs: PackageVirtualFileSystem, extensionId: string, normalizedJson: string): NormalizedResourceExtensionArtifact {
  const files: Record<string, Uint8Array> = { "extension.json": strToU8(normalizedJson) };
  for (const path of vfs.listFiles().filter((path) => path.startsWith("assets/") && isSupportedImagePath(path))) {
    const read = vfs.readBytes(path);
    if (read.ok) files[path] = read.value;
  }
  return { fileName: `${extensionId}.normalized.zip`, mimeType: "application/zip", bytes: zipSync(files, { level: 6 }) };
}

function toExtensionIssue(issue: { code: string; text: string; path?: string }): ResourceExtensionIssue {
  return { level: "error", code: issue.code, text: issue.text.replaceAll("System Package", "Resource Extension"), path: issue.path };
}
