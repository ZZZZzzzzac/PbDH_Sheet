import { z } from "zod";
import { validateSystemPackage, type PackageValidationResult } from "../domain/systemPackage";
import { createVirtualFileSystemFromZipFile, normalizePackagePath, type PackageVirtualFileSystem } from "./packageVfs";

export const demoSystemPackageUrl = "/system-packages/demo-minimal";
export const packageManifestPath = "manifest.json";

const packageManifestSchema = z.object({
  ID: z.string().min(1),
  名称: z.string().min(1),
  版本: z.string().min(1),
  schemaVersion: z.string().min(1),
  pages: z.string().min(1),
  modules: z.string().min(1),
  assets: z
    .array(
      z.object({
        ID: z.string().min(1),
        路径: z.string().min(1),
        类型: z.string().optional(),
      }),
    )
    .optional(),
});

export async function loadSystemPackageFromUrl(
  baseUrl: string = demoSystemPackageUrl,
  fetchImpl: typeof fetch = fetch,
): Promise<PackageValidationResult> {
  const manifest = await fetchPackageJson(`${baseUrl.replace(/\/$/, "")}/${packageManifestPath}`, packageManifestPath, fetchImpl);
  if (!manifest.ok) {
    if (manifest.issue.code === "PACKAGE_FETCH_FAILED") {
      return {
        ok: false,
        issues: [
          {
            level: "fatal",
            code: "MANIFEST_MISSING",
            text: "System Package 缺少 manifest.json。",
            path: packageManifestPath,
          },
        ],
      };
    }
    return { ok: false, issues: [manifest.issue] };
  }

  const parsedManifest = packageManifestSchema.safeParse(manifest.value);
  if (!parsedManifest.success) {
    return {
      ok: false,
      issues: parsedManifest.error.issues.map((issue) => ({
        level: "fatal",
        code: "MANIFEST_SHAPE_INVALID",
        text: issue.message,
        path: [packageManifestPath, ...issue.path].join("."),
      })),
    };
  }

  const pages = await fetchPackageReferenceJson(baseUrl, parsedManifest.data.pages, fetchImpl);
  if (!pages.ok) {
    return { ok: false, issues: [pages.issue] };
  }

  const modules = await fetchPackageReferenceJson(baseUrl, parsedManifest.data.modules, fetchImpl);
  if (!modules.ok) {
    return { ok: false, issues: [modules.issue] };
  }

  return normalizeManifestPackage(parsedManifest.data, pages.value, modules.value);
}

export async function loadSystemPackageFromZipFile(file: Blob): Promise<PackageValidationResult> {
  const vfsResult = await createVirtualFileSystemFromZipFile(file);
  if (!vfsResult.ok) {
    return { ok: false, issues: vfsResult.issues };
  }

  return loadSystemPackageFromVfs(vfsResult.vfs);
}

export function loadSystemPackageFromVfs(vfs: PackageVirtualFileSystem): PackageValidationResult {
  const manifestText = vfs.readText(packageManifestPath);
  if (!manifestText.ok) {
    if (manifestText.issue.code === "PACKAGE_FILE_MISSING") {
      return {
        ok: false,
        issues: [
          {
            level: "fatal",
            code: "MANIFEST_MISSING",
            text: "System Package 缺少 manifest.json。",
            path: packageManifestPath,
          },
        ],
      };
    }

    return { ok: false, issues: [manifestText.issue] };
  }

  const manifestJson = parsePackageJson(manifestText.value, packageManifestPath, "MANIFEST_JSON_INVALID");
  if (!manifestJson.ok) {
    return { ok: false, issues: [manifestJson.issue] };
  }

  const manifest = packageManifestSchema.safeParse(manifestJson.value);
  if (!manifest.success) {
    return {
      ok: false,
      issues: manifest.error.issues.map((issue) => ({
        level: "fatal",
        code: "MANIFEST_SHAPE_INVALID",
        text: issue.message,
        path: [packageManifestPath, ...issue.path].join("."),
      })),
    };
  }

  const pagesJson = readPackageJsonFile(vfs, manifest.data.pages);
  if (!pagesJson.ok) {
    return { ok: false, issues: [pagesJson.issue] };
  }

  const modulesJson = readPackageJsonFile(vfs, manifest.data.modules);
  if (!modulesJson.ok) {
    return { ok: false, issues: [modulesJson.issue] };
  }

  return normalizeManifestPackage(manifest.data, pagesJson.value, modulesJson.value);
}

function normalizeManifestPackage(manifest: z.infer<typeof packageManifestSchema>, pages: unknown, modules: unknown): PackageValidationResult {
  return validateSystemPackage({
    manifest: {
      ID: manifest.ID,
      名称: manifest.名称,
      版本: manifest.版本,
      schemaVersion: manifest.schemaVersion,
    },
    pages,
    modules,
    assets: manifest.assets ?? [],
  });
}

function readPackageJsonFile(vfs: PackageVirtualFileSystem, path: string) {
  const text = vfs.readText(path);
  if (!text.ok) {
    return text;
  }

  return parsePackageJson(text.value, text.path, "PACKAGE_JSON_INVALID");
}

function parsePackageJson(text: string, path: string, code: string) {
  try {
    return { ok: true as const, value: JSON.parse(text) as unknown };
  } catch {
    return {
      ok: false as const,
      issue: {
        level: "fatal" as const,
        code,
        text: `System Package JSON 格式错误：${path}`,
        path,
      },
    };
  }
}

async function fetchPackageReferenceJson(baseUrl: string, packagePath: string, fetchImpl: typeof fetch) {
  const normalized = normalizePackagePath(packagePath);
  if (!normalized.ok) {
    return { ok: false as const, issue: normalized.issue };
  }

  return fetchPackageJson(`${baseUrl.replace(/\/$/, "")}/${normalized.path}`, normalized.path, fetchImpl);
}

async function fetchPackageJson(url: string, path: string, fetchImpl: typeof fetch) {
  try {
    const response = await fetchImpl(url);

    if (!response.ok) {
      return {
        ok: false as const,
        issue: {
          level: "fatal" as const,
          code: "PACKAGE_FETCH_FAILED",
          text: `无法加载 System Package 文件：${response.status} ${response.statusText}`,
          path,
        },
      };
    }

    const text = await response.text();
    return parsePackageJson(text, path, path === packageManifestPath ? "MANIFEST_JSON_INVALID" : "PACKAGE_JSON_INVALID");
  } catch {
    return {
      ok: false as const,
      issue: {
        level: "fatal" as const,
        code: "PACKAGE_FETCH_FAILED",
        text: "无法加载 System Package 文件。",
        path,
      },
    };
  }
}
