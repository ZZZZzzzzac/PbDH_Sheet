import type { PackageIssue, SystemPackage } from "../domain/systemPackage";
import { inferMimeType } from "../utils";
import { createVirtualFileSystem, normalizePackagePath, packageArchiveLimits } from "./packageVfs";
import { loadSystemPackageFromVfs, type PackageLoadResult } from "./systemPackageLoader";

export interface PresetSystemPackage {
  id: string;
  name: string;
  version: string;
  directory: string;
  files: string[];
  loadingPresentation?: NonNullable<SystemPackage["manifest"]["加载展示"]>;
}

export interface PresetLoadProgress {
  completed: number;
  total: number;
}

export async function loadPresetSystemPackage(
  preset: PresetSystemPackage,
  baseUrl = import.meta.env.BASE_URL,
  fetchFile: typeof fetch = fetch,
  onProgress?: (progress: PresetLoadProgress) => void,
): Promise<PackageLoadResult> {
  if (preset.files.length > packageArchiveLimits.maxFiles) {
    return failedPreset("PACKAGE_ARCHIVE_FILE_COUNT_LIMIT", `预制 System Package ${preset.name} 的文件数量超过限制。`);
  }

  const files = new Map<string, Uint8Array>();
  const imagePaths: string[] = [];
  const metadataPaths: string[] = [];
  for (const file of preset.files) {
    const pathResult = normalizePackagePath(file);
    if (!pathResult.ok) return { ok: false, issues: [pathResult.issue] };
    if (isPresetImagePath(pathResult.path)) {
      imagePaths.push(pathResult.path);
      files.set(pathResult.path, new Uint8Array());
    } else {
      metadataPaths.push(pathResult.path);
    }
  }
  onProgress?.({ completed: 0, total: metadataPaths.length });
  let totalBytes = 0;
  let completed = 0;
  let nextIndex = 0;
  let failure: PackageIssue | undefined;
  const workers = Array.from({ length: Math.min(8, metadataPaths.length) }, async () => {
    while (!failure) {
      const index = nextIndex++;
      if (index >= metadataPaths.length) return;
      const pathResult = { ok: true as const, path: metadataPaths[index] };
      try {
        const response = await fetchFile(presetFileUrl(baseUrl, preset.directory, pathResult.path));
        if (!response.ok) {
          failure = presetFetchIssue(preset, pathResult.path, `HTTP ${response.status}`);
          return;
        }
        const bytes = new Uint8Array(await response.arrayBuffer());
        totalBytes += bytes.byteLength;
        if (totalBytes > packageArchiveLimits.maxExpandedBytes) {
          failure = {
            level: "fatal",
            code: "PACKAGE_ARCHIVE_EXPANDED_SIZE_LIMIT",
            text: `预制 System Package ${preset.name} 的总文件体积超过限制。`,
          };
          return;
        }
        files.set(pathResult.path, bytes);
        completed += 1;
        onProgress?.({ completed, total: metadataPaths.length });
      } catch (error) {
        failure = presetFetchIssue(preset, pathResult.path, error instanceof Error ? error.message : String(error));
        return;
      }
    }
  });
  await Promise.all(workers);
  if (failure) return { ok: false, issues: [failure] };
  const result = loadSystemPackageFromVfs(createVirtualFileSystem(files));
  if (!result.ok) return result;
  return {
    ...result,
    packageAssets: imagePaths.map((path) => ({
      路径: path,
      类型: inferMimeType(path),
      staticUrl: presetFileUrl(baseUrl, preset.directory, path),
    })),
  };
}

function isPresetImagePath(path: string): boolean {
  return path.startsWith("assets/") && /\.(?:png|jpe?g|webp|gif|avif|svg)$/iu.test(path);
}

function presetFileUrl(baseUrl: string, directory: string, path: string): string {
  const root = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const encodedPath = [directory, ...path.split("/")].map(encodeURIComponent).join("/");
  return `${root}system-packages/${encodedPath}`;
}

function presetFetchIssue(preset: PresetSystemPackage, path: string, reason: string): PackageIssue {
  return {
    level: "fatal",
    code: "PRESET_PACKAGE_FETCH_FAILED",
    text: `无法读取预制 System Package ${preset.name}：${path}（${reason}）`,
    path,
  };
}

function failedPreset(code: string, text: string): PackageLoadResult {
  return { ok: false, issues: [{ level: "fatal", code, text }] };
}
