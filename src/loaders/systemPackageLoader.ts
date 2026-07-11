import { z } from "zod";
import { resourceLibraryReferenceSchema, type ResourceLibraryReference } from "../domain/resourceLibrary";
import { validateSystemPackage, type PackageValidationResult } from "../domain/systemPackage";
import type { RuntimePackageAsset } from "./assetResolver";
import { createVirtualFileSystemFromDirectoryFiles, createVirtualFileSystemFromDirectoryHandle, createVirtualFileSystemFromZipFile, type PackageDirectoryHandle, type PackageVirtualFileSystem } from "./packageVfs";
import { inferMimeType } from "../utils";

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
  shell: z.object({ html: z.string().min(1), css: z.string().min(1).optional() }).optional(),
  dependencies: z.string().min(1).optional(),
  characterCreationGuide: z.string().min(1).optional(),
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
  validationChecks: z
    .array(
      z.object({
        ID: z.string().min(1),
        脚本: z.string().min(1),
      }),
    )
    .optional(),
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
  const shell = manifest.data.shell ? loadTemplateFilesFromVfs(vfs, manifest.data.shell) : undefined;
  if (shell && !shell.ok) return { ok: false, issues: [shell.issue] };

  const guideJson = manifest.data.characterCreationGuide
    ? readPackageJsonFile(vfs, manifest.data.characterCreationGuide)
    : undefined;
  if (guideJson && !guideJson.ok) {
    return { ok: false, issues: [guideJson.issue] };
  }

  const resourceLibraries = loadResourceLibraryFilesFromVfs(vfs, manifest.data.resourceLibraries ?? []);
  if (!resourceLibraries.ok) {
    return { ok: false, issues: [resourceLibraries.issue] };
  }

  const validationChecks = loadValidationScriptFilesFromVfs(vfs, manifest.data.validationChecks ?? []);
  if (!validationChecks.ok) {
    return { ok: false, issues: [validationChecks.issue] };
  }

  const normalized = normalizeManifestPackage(
    manifest.data,
    pagesWithLayouts.value,
    modulesJson.value,
    resourceLibraries.value,
    dependenciesJson?.value,
    validationChecks.value,
    guideJson?.value,
    shell?.value,
  );
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
  validationChecks?: Array<{ ID: string; 脚本: string; scriptContent: string }>,
  characterCreationGuide?: unknown,
  shell?: unknown,
): PackageValidationResult {
  return validateSystemPackage({
    manifest: {
      ID: manifest.ID,
      名称: manifest.名称,
      版本: manifest.版本,
      schemaVersion: manifest.schemaVersion,
    },
    pages,
    shell,
    modules,
    assets: manifest.assets ?? [],
    resourceLibraries,
    dependencies,
    validationChecks,
    characterCreationGuide,
  });
}

function loadTemplateFilesFromVfs(vfs: PackageVirtualFileSystem, reference: { html: string; css?: string }) {
  const html = vfs.readText(reference.html);
  if (!html.ok) return html;
  const css = reference.css ? vfs.readText(reference.css) : undefined;
  if (css && !css.ok) return css;
  return { ok: true as const, value: { 类型: "htmlTemplate" as const, htmlContent: html.value, ...(css?.ok ? { cssContent: css.value } : {}) } };
}

export async function loadSystemPackageFromDirectoryFiles(files: Iterable<File>): Promise<PackageLoadResult> {
  const vfsResult = await createVirtualFileSystemFromDirectoryFiles(files);
  if (!vfsResult.ok) return { ok: false, issues: vfsResult.issues };
  return loadSystemPackageFromVfs(vfsResult.vfs);
}

export async function loadSystemPackageFromDirectoryHandle(handle: PackageDirectoryHandle): Promise<PackageLoadResult> {
  const vfsResult = await createVirtualFileSystemFromDirectoryHandle(handle);
  if (!vfsResult.ok) return { ok: false, issues: vfsResult.issues };
  return loadSystemPackageFromVfs(vfsResult.vfs);
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
        类型: page.layout.类型,
        htmlContent: html.value,
        ...(css?.ok ? { cssContent: css.value } : {}),
      },
    });
  }

  return { ok: true as const, value: normalizedPages };
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

function loadValidationScriptFilesFromVfs(
  vfs: PackageVirtualFileSystem,
  checks: NonNullable<z.infer<typeof packageManifestSchema>["validationChecks"]>,
) {
  const normalizedChecks = [];

  for (const check of checks) {
    const script = vfs.readText(check.脚本);
    if (!script.ok) {
      return { ok: false as const, issue: script.issue };
    }

    normalizedChecks.push({ ...check, 脚本: script.path, scriptContent: script.value });
  }

  return { ok: true as const, value: normalizedChecks };
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
