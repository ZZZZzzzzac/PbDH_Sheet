import { z } from "zod";
import { resourceLibraryReferenceSchema, type ResourceLibraryReference } from "../domain/resourceLibrary";
import { validateSystemPackage, type PackageSourceMap, type PackageValidationResult } from "../domain/systemPackage";
import type { RuntimePackageAsset } from "./assetResolver";
import { createVirtualFileSystemFromDirectoryFiles, createVirtualFileSystemFromDirectoryHandle, createVirtualFileSystemFromZipFile, type PackageDirectoryHandle, type PackageVirtualFileSystem } from "./packageVfs";
import { inferMimeType, isPlainObject } from "../utils";

export const packageManifestPath = "manifest.json";
export type LoadedPackageAsset = RuntimePackageAsset;

export type PackageLoadResult = PackageValidationResult & { packageAssets?: LoadedPackageAsset[] };

const packageManifestSchema = z.object({
  ID: z.string().min(1),
  名称: z.string().min(1),
  版本: z.string().min(1),
  schemaVersion: z.string().min(1),
  加载展示: z.object({
    标语: z.string().trim().min(1).max(80),
    强调色: z.string().regex(/^#[0-9a-f]{6}$/i),
  }).optional(),
  pages: z.string().min(1),
  modules: z.string().min(1),
  shell: z.object({ html: z.string().min(1), css: z.string().min(1).optional() }).optional(),
  skins: z.array(z.object({
    ID: z.string().min(1),
    名称: z.string().min(1),
    css: z.string().min(1),
    推荐框架配色: z.enum(["light", "dark"]),
    layoutOverrides: z.object({
      shell: z.object({ html: z.string().min(1) }).optional(),
      pages: z.array(z.object({ ID: z.string().min(1), html: z.string().min(1) })).min(1).optional(),
    }).optional(),
  })).min(1).optional(),
  defaultSkin: z.string().min(1).optional(),
  dependencies: z.string().min(1).optional(),
  characterCreationGuide: z.string().min(1).optional(),
  assets: z.never().optional(),
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
  const skins = loadSkinFilesFromVfs(vfs, manifest.data.skins ?? []);
  if (!skins.ok) return { ok: false, issues: [skins.issue] };

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

  const packageAssets = resolvePackageAssets(vfs);
  const normalized = normalizeManifestPackage(
    manifest.data,
    pagesWithLayouts.value,
    modulesJson.value,
    resourceLibraries.value,
    dependenciesJson?.value,
    validationChecks.value,
    guideJson?.value,
    shell?.value,
    skins.value,
    packageAssets,
    buildPackageSourceMap(manifest.data, pagesJson.value),
  );
  if (!normalized.ok) {
    return normalized;
  }

  return {
    ...normalized,
    packageAssets,
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
  skins?: Array<{ ID: string; 名称: string; cssContent: string; 推荐框架配色: "light" | "dark" }>,
  packageAssets: RuntimePackageAsset[] = [],
  sourceMap: PackageSourceMap = {},
): PackageValidationResult {
  return validateSystemPackage({
    manifest: {
      ID: manifest.ID,
      名称: manifest.名称,
      版本: manifest.版本,
      schemaVersion: manifest.schemaVersion,
      ...(manifest.加载展示 ? { 加载展示: manifest.加载展示 } : {}),
    },
    ...(skins && skins.length > 0 ? { skins } : {}),
    ...(manifest.defaultSkin ? { defaultSkin: manifest.defaultSkin } : {}),
    pages,
    shell,
    modules,
    assets: packageAssets.map(({ 路径, 类型 }) => ({ 路径, 类型 })),
    resourceLibraries,
    dependencies,
    validationChecks,
    characterCreationGuide,
  }, sourceMap);
}

function buildPackageSourceMap(manifest: z.infer<typeof packageManifestSchema>, pages: unknown): PackageSourceMap {
  const sourceMap: PackageSourceMap = {
    manifest: packageManifestPath,
    pages: manifest.pages,
    modules: manifest.modules,
    ...(manifest.dependencies ? { dependencies: manifest.dependencies } : {}),
    ...(manifest.characterCreationGuide ? { characterCreationGuide: manifest.characterCreationGuide } : {}),
    ...(manifest.shell ? { shell: manifest.shell.html } : {}),
  };
  manifest.resourceLibraries?.forEach((library) => {
    sourceMap[`resourceLibraries.${library.ID}`] = library.路径;
  });
  manifest.validationChecks?.forEach((check, index) => {
    sourceMap[`validationChecks.${index}`] = check.脚本;
  });
  manifest.skins?.forEach((skin) => {
    sourceMap[`skins.${skin.ID}.css`] = skin.css;
    if (skin.layoutOverrides?.shell) sourceMap[`skins.${skin.ID}.layoutOverrides.shell.html`] = skin.layoutOverrides.shell.html;
    skin.layoutOverrides?.pages?.forEach((page) => {
      sourceMap[`skins.${skin.ID}.layoutOverrides.pages.${page.ID}.html`] = page.html;
    });
  });
  if (Array.isArray(pages)) {
    pages.forEach((page) => {
      if (!isPlainObject(page) || typeof page.ID !== "string" || !isPlainObject(page.layout)) return;
      if (typeof page.layout.html === "string") sourceMap[`pages.${page.ID}.layout.html`] = page.layout.html;
      if (typeof page.layout.css === "string") sourceMap[`pages.${page.ID}.layout.css`] = page.layout.css;
    });
  }
  return sourceMap;
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

function resolvePackageAssets(vfs: PackageVirtualFileSystem): LoadedPackageAsset[] {
  const resolvedAssets: LoadedPackageAsset[] = [];

  for (const path of vfs.listFiles().filter(isSupportedPackageImagePath)) {
    const read = vfs.readBytes(path);
    if (!read.ok) {
      continue;
    }

    resolvedAssets.push({
      路径: read.path,
      类型: inferMimeType(read.path),
      bytes: read.value,
    });
  }

  return resolvedAssets;
}

function loadSkinFilesFromVfs(
  vfs: PackageVirtualFileSystem,
  skins: NonNullable<z.infer<typeof packageManifestSchema>["skins"]>,
) {
  const normalizedSkins = [];
  for (const skin of skins) {
    const css = vfs.readText(skin.css);
    if (!css.ok) return { ok: false as const, issue: css.issue };
    const shell = skin.layoutOverrides?.shell ? vfs.readText(skin.layoutOverrides.shell.html) : undefined;
    if (shell && !shell.ok) return { ok: false as const, issue: shell.issue };
    const pages = [];
    for (const page of skin.layoutOverrides?.pages ?? []) {
      const html = vfs.readText(page.html);
      if (!html.ok) return { ok: false as const, issue: html.issue };
      pages.push({ ID: page.ID, htmlContent: html.value });
    }
    normalizedSkins.push({
      ID: skin.ID,
      名称: skin.名称,
      cssContent: css.value,
      推荐框架配色: skin.推荐框架配色,
      ...((shell?.ok || pages.length > 0) ? { layoutOverrides: {
        ...(shell?.ok ? { shell: { htmlContent: shell.value } } : {}),
        ...(pages.length > 0 ? { pages } : {}),
      } } : {}),
    });
  }
  return { ok: true as const, value: normalizedSkins };
}

function isSupportedPackageImagePath(path: string): boolean {
  return path.startsWith("assets/") && /\.(?:png|jpe?g|webp|gif|avif|svg)$/iu.test(path);
}
