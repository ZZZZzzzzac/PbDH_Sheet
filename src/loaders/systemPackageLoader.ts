import { z } from "zod";
import { resourceLibraryReferenceSchema, type ResourceLibraryReference } from "../domain/resourceLibrary";
import { validateSystemPackage, type PackageValidationResult } from "../domain/systemPackage";
import type { RuntimePackageAsset } from "./assetResolver";
import { createVirtualFileSystemFromZipFile, normalizePackagePath, type PackageVirtualFileSystem } from "./packageVfs";

export const demoSystemPackageUrl = "/system-packages/demo-minimal";
export const packageManifestPath = "manifest.json";
export type LoadedPackageAsset = RuntimePackageAsset;

export type PackageLoadResult = PackageValidationResult & { packageAssets?: LoadedPackageAsset[] };

const packageManifestSchema = z.object({
  ID: z.string().min(1),
  名称: z.string().min(1),
  版本: z.string().min(1),
  schemaVersion: z.string().min(1),
  pages: z.string().min(1),
  modules: z.string().min(1),
  dependencies: z.string().min(1).optional(),
  assets: z
    .array(
      z.object({
        ID: z.string().min(1),
        路径: z.string().min(1),
        类型: z.string().optional(),
      }),
    )
    .optional(),
  resourceLibraries: z.array(resourceLibraryReferenceSchema).optional(),
});

const pageLayoutReferenceSchema = z.array(
  z
    .object({
      ID: z.string().optional(),
      layout: z
        .object({
          类型: z.literal("htmlTemplate"),
          html: z.string().min(1),
          css: z.string().min(1).optional(),
        })
        .optional(),
    })
    .passthrough(),
);

export async function loadSystemPackageFromUrl(
  baseUrl: string = demoSystemPackageUrl,
  fetchImpl: typeof fetch = fetch,
): Promise<PackageLoadResult> {
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

  const pagesWithLayouts = await loadPageLayoutFilesFromUrl(baseUrl, pages.value, fetchImpl);
  if (!pagesWithLayouts.ok) {
    return { ok: false, issues: [pagesWithLayouts.issue] };
  }

  const modules = await fetchPackageReferenceJson(baseUrl, parsedManifest.data.modules, fetchImpl);
  if (!modules.ok) {
    return { ok: false, issues: [modules.issue] };
  }

  const dependencies = parsedManifest.data.dependencies
    ? await fetchPackageReferenceJson(baseUrl, parsedManifest.data.dependencies, fetchImpl)
    : undefined;
  if (dependencies && !dependencies.ok) {
    return { ok: false, issues: [dependencies.issue] };
  }

  const resourceLibraries = await loadResourceLibraryFilesFromUrl(baseUrl, parsedManifest.data.resourceLibraries ?? [], fetchImpl);
  if (!resourceLibraries.ok) {
    return { ok: false, issues: [resourceLibraries.issue] };
  }

  return normalizeManifestPackage(parsedManifest.data, pagesWithLayouts.value, modules.value, resourceLibraries.value, dependencies?.value);
}

export async function loadSystemPackageFromZipFile(file: Blob): Promise<PackageLoadResult> {
  const vfsResult = await createVirtualFileSystemFromZipFile(file);
  if (!vfsResult.ok) {
    return { ok: false, issues: vfsResult.issues };
  }

  return loadSystemPackageFromVfs(vfsResult.vfs);
}

export function loadSystemPackageFromVfs(vfs: PackageVirtualFileSystem): PackageLoadResult {
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

  const pagesWithLayouts = loadPageLayoutFilesFromVfs(vfs, pagesJson.value);
  if (!pagesWithLayouts.ok) {
    return { ok: false, issues: [pagesWithLayouts.issue] };
  }

  const modulesJson = readPackageJsonFile(vfs, manifest.data.modules);
  if (!modulesJson.ok) {
    return { ok: false, issues: [modulesJson.issue] };
  }

  const dependenciesJson = manifest.data.dependencies ? readPackageJsonFile(vfs, manifest.data.dependencies) : undefined;
  if (dependenciesJson && !dependenciesJson.ok) {
    return { ok: false, issues: [dependenciesJson.issue] };
  }

  const resourceLibraries = loadResourceLibraryFilesFromVfs(vfs, manifest.data.resourceLibraries ?? []);
  if (!resourceLibraries.ok) {
    return { ok: false, issues: [resourceLibraries.issue] };
  }

  const normalized = normalizeManifestPackage(manifest.data, pagesWithLayouts.value, modulesJson.value, resourceLibraries.value, dependenciesJson?.value);
  if (!normalized.ok) {
    return normalized;
  }

  return {
    ...normalized,
    packageAssets: resolvePackageAssets(manifest.data.assets ?? [], vfs),
  };
}

function normalizeManifestPackage(
  manifest: z.infer<typeof packageManifestSchema>,
  pages: unknown,
  modules: unknown,
  resourceLibraries: Array<ResourceLibraryReference & { entries: unknown }> = [],
  dependencies?: unknown,
): PackageValidationResult {
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
    resourceLibraries,
    dependencies,
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

async function fetchPackageReferenceText(baseUrl: string, packagePath: string, fetchImpl: typeof fetch) {
  const normalized = normalizePackagePath(packagePath);
  if (!normalized.ok) {
    return { ok: false as const, issue: normalized.issue };
  }

  return fetchPackageText(`${baseUrl.replace(/\/$/, "")}/${normalized.path}`, normalized.path, fetchImpl);
}

async function fetchPackageJson(url: string, path: string, fetchImpl: typeof fetch) {
  const text = await fetchPackageText(url, path, fetchImpl);
  if (!text.ok) {
    return text;
  }

  return parsePackageJson(text.value, path, path === packageManifestPath ? "MANIFEST_JSON_INVALID" : "PACKAGE_JSON_INVALID");
}

async function fetchPackageText(url: string, path: string, fetchImpl: typeof fetch) {
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
    return { ok: true as const, path, value: text };
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

async function loadPageLayoutFilesFromUrl(baseUrl: string, pages: unknown, fetchImpl: typeof fetch) {
  const parsed = pageLayoutReferenceSchema.safeParse(pages);
  if (!parsed.success) {
    return { ok: true as const, value: pages };
  }

  const normalizedPages = [];
  for (const page of parsed.data) {
    if (!page.layout) {
      normalizedPages.push(page);
      continue;
    }

    const html = await fetchPackageReferenceText(baseUrl, page.layout.html, fetchImpl);
    if (!html.ok) {
      return { ok: false as const, issue: html.issue };
    }

    const css = page.layout.css ? await fetchPackageReferenceText(baseUrl, page.layout.css, fetchImpl) : undefined;
    if (css && !css.ok) {
      return { ok: false as const, issue: css.issue };
    }

    normalizedPages.push({
      ...page,
      layout: {
        ...page.layout,
        htmlContent: html.value,
        cssContent: css?.value,
      },
    });
  }

  return { ok: true as const, value: normalizedPages };
}

function loadPageLayoutFilesFromVfs(vfs: PackageVirtualFileSystem, pages: unknown) {
  const parsed = pageLayoutReferenceSchema.safeParse(pages);
  if (!parsed.success) {
    return { ok: true as const, value: pages };
  }

  const normalizedPages = [];
  for (const page of parsed.data) {
    if (!page.layout) {
      normalizedPages.push(page);
      continue;
    }

    const html = vfs.readText(page.layout.html);
    if (!html.ok) {
      return { ok: false as const, issue: html.issue };
    }

    const css = page.layout.css ? vfs.readText(page.layout.css) : undefined;
    if (css && !css.ok) {
      return { ok: false as const, issue: css.issue };
    }

    normalizedPages.push({
      ...page,
      layout: {
        ...page.layout,
        htmlContent: html.value,
        cssContent: css?.value,
      },
    });
  }

  return { ok: true as const, value: normalizedPages };
}

async function loadResourceLibraryFilesFromUrl(
  baseUrl: string,
  libraries: ResourceLibraryReference[],
  fetchImpl: typeof fetch,
) {
  const normalizedLibraries = [];

  for (const library of libraries) {
    const entries = await fetchPackageReferenceJson(baseUrl, library.路径, fetchImpl);
    if (!entries.ok) {
      return { ok: false as const, issue: entries.issue };
    }

    normalizedLibraries.push({ ...library, entries: entries.value });
  }

  return { ok: true as const, value: normalizedLibraries };
}

function loadResourceLibraryFilesFromVfs(vfs: PackageVirtualFileSystem, libraries: ResourceLibraryReference[]) {
  const normalizedLibraries = [];

  for (const library of libraries) {
    const entries = readPackageJsonFile(vfs, library.路径);
    if (!entries.ok) {
      return { ok: false as const, issue: entries.issue };
    }

    normalizedLibraries.push({ ...library, entries: entries.value });
  }

  return { ok: true as const, value: normalizedLibraries };
}

function resolvePackageAssets(assets: NonNullable<z.infer<typeof packageManifestSchema>["assets"]>, vfs: PackageVirtualFileSystem): LoadedPackageAsset[] {
  const resolvedAssets: LoadedPackageAsset[] = [];

  for (const asset of assets) {
    const read = vfs.readBytes(asset.路径);
    if (!read.ok) {
      continue;
    }

    resolvedAssets.push({
      ID: asset.ID,
      路径: read.path,
      类型: asset.类型 ?? inferMimeType(read.path),
      bytes: read.value,
    });
  }

  return resolvedAssets;
}

function inferMimeType(path: string): string {
  const lowerPath = path.toLowerCase();
  if (lowerPath.endsWith(".png")) {
    return "image/png";
  }
  if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (lowerPath.endsWith(".webp")) {
    return "image/webp";
  }
  if (lowerPath.endsWith(".svg")) {
    return "image/svg+xml";
  }
  if (lowerPath.endsWith(".txt")) {
    return "text/plain";
  }
  return "application/octet-stream";
}
