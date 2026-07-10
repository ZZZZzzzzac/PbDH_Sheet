import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { minimalSystemPackage, moduleDemoSystemPackage } from "../test/fixtures";
import { loadSystemPackageFromZipFile } from "./systemPackageLoader";

describe("loadSystemPackageFromZipFile", () => {
  it("loads a minimal System Package zip through its manifest", async () => {
    const result = await loadSystemPackageFromZipFile(createPackageZip());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.package.manifest).toEqual(minimalSystemPackage.manifest);
      expect(result.package.pages).toEqual(minimalSystemPackage.pages);
      expect(result.package.modules).toEqual(minimalSystemPackage.modules);
      expect(result.package.assets?.[0]).toEqual({ ID: "readme", 路径: "assets/readme.txt", 类型: "text/plain" });
      expect(result.packageAssets?.[0]).toEqual(
        expect.objectContaining({ ID: "readme", 路径: "assets/readme.txt", 类型: "text/plain" }),
      );
    }
  });

  it("loads Resource Library and Dependency JSON files from zip", async () => {
    const manifest = {
      ...createManifest(),
      dependencies: "dependencies.json",
      resourceLibraries: [
        {
          ID: "domains",
          名称: "领域",
          路径: "resources/domains.json",
        },
      ],
    };
    const modules = [
      ...minimalSystemPackage.modules,
      {
        ID: "domain-pick",
        类型: "resourcePicker",
        按钮文本: "选择领域",
        资源库ID: "domains",
      },
      {
        ID: "domain-name",
        类型: "freeText",
        标签: "领域名",
      },
    ];
    const dependencies = [
      {
        ID: "fill-domain",
        sources: [{ 类型: "resourcePicker", 模块ID: "domain-pick" }],
        targets: [{ 类型: "module", 模块ID: "domain-name" }],
        触发: { 类型: "resourceSelected", 来源模块ID: "domain-pick" },
        条件: { 类型: "always" },
        动作: [{ 类型: "fillText", 目标模块ID: "domain-name", 内容: { 类型: "selectedResourceField", 字段: "名称" } }],
      },
    ];
    const pages = [
      {
        ...minimalSystemPackage.pages[0],
        layout: {
          ...minimalSystemPackage.pages[0].layout,
          htmlContent:
            '<main><pb-module id="character-name"></pb-module><pb-module id="domain-pick"></pb-module><pb-module id="domain-name"></pb-module></main>',
        },
      },
    ];
    const resources = [{ ID: "blade-1", 名称: "利刃一", 领域: "利刃" }];
    const result = await loadSystemPackageFromZipFile(
      createPackageZip({ manifest, modules, pages, resources, dependencies }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.package.resourceLibraries?.[0].entries[0].fields.名称).toBe("利刃一");
      expect(result.package.dependencies?.[0].动作[0].目标模块ID).toBe("domain-name");
    }
  });

  it("loads Validation Script files from zip", async () => {
    const manifest = {
      ...createManifest(),
      validationChecks: [{ ID: "demo-check", 脚本: "checks/demo.js" }],
    };
    const validationScripts = { "checks/demo.js": "module.exports = () => [];" };
    const result = await loadSystemPackageFromZipFile(createPackageZip({ manifest, validationScripts }));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.package.validationChecks?.[0]).toEqual({
        ID: "demo-check",
        脚本: "checks/demo.js",
        scriptContent: "module.exports = () => [];",
      });
    }
  });

  it("loads a Character Creation Guide from the manifest reference", async () => {
    const manifest = { ...createManifest(), characterCreationGuide: "guides/character-creation.json" };
    const guide = { 步骤: [{ ID: "intro", 标题: "开始", 说明: "第一行\n第二行" }] };
    const result = await loadSystemPackageFromZipFile(createPackageZip({ manifest, guide }));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.package.characterCreationGuide).toEqual(guide);
    }
  });

  it("returns a fatal issue for a missing referenced Guide file", async () => {
    const manifest = { ...createManifest(), characterCreationGuide: "guides/missing.json" };
    const result = await loadSystemPackageFromZipFile(createPackageZip({ manifest }));

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "PACKAGE_FILE_MISSING", level: "fatal", path: "guides/missing.json" }),
      ]),
    );
  });

  it("returns a fatal issue for invalid Guide JSON", async () => {
    const result = await loadSystemPackageFromZipFile(
      zipBlob({
        "manifest.json": JSON.stringify({ ...createManifest(), characterCreationGuide: "guides/character-creation.json" }),
        "pages.json": packagePagesJson(minimalSystemPackage.pages),
        "modules.json": JSON.stringify(minimalSystemPackage.modules),
        "layouts/main.html": minimalSystemPackage.pages[0].layout.htmlContent,
        "layouts/main.css": minimalSystemPackage.pages[0].layout.cssContent ?? "",
        "guides/character-creation.json": "{",
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "PACKAGE_JSON_INVALID", level: "fatal", path: "guides/character-creation.json" }),
      ]),
    );
  });

  it("loads the phase 5 module demo zip and keeps asset bytes outside System Package", async () => {
    const result = await loadSystemPackageFromZipFile(createModuleDemoZip());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.package.manifest.ID).toBe("demo-modules");
      expect(result.package.modules.map((module) => module.类型)).toEqual([
        "freeText",
        "longText",
        "checkboxResource",
        "countableResource",
        "readOnlyDisplay",
        "readOnlyDisplay",
        "imageField",
      ]);
      expect(result.package.assets?.[0]).toEqual({ ID: "demo-emblem", 路径: "assets/demo-emblem.svg", 类型: "image/svg+xml" });
      expect(result.packageAssets?.[0]).toEqual(
        expect.objectContaining({
          ID: "demo-emblem",
          路径: "assets/demo-emblem.svg",
          类型: "image/svg+xml",
        }),
      );
      expect(result.packageAssets?.[0].bytes.length).toBeGreaterThan(0);
    }
  });

  it("loads a zip whose manifest is nested one directory deep", async () => {
    const nestedZip = new Blob(
      [
        zipSync({
          "my-package/manifest.json": strToU8(JSON.stringify(createManifest())),
          "my-package/pages.json": strToU8(packagePagesJson(minimalSystemPackage.pages)),
          "my-package/modules.json": strToU8(JSON.stringify(minimalSystemPackage.modules)),
          "my-package/layouts/main.html": strToU8(minimalSystemPackage.pages[0].layout.htmlContent),
          "my-package/layouts/main.css": strToU8(minimalSystemPackage.pages[0].layout.cssContent ?? ""),
          "my-package/assets/readme.txt": strToU8("hello"),
        }),
      ],
      { type: "application/zip" },
    );

    const result = await loadSystemPackageFromZipFile(nestedZip);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.package.manifest.ID).toBe("demo-minimal");
      expect(result.package.pages[0].layout.htmlContent).toContain("<pb-module id=\"character-name\"");
    }
  });

  it("returns a fatal issue for a missing manifest", async () => {
    const result = await loadSystemPackageFromZipFile(
      zipBlob({
        "pages.json": JSON.stringify(minimalSystemPackage.pages),
        "modules.json": JSON.stringify(minimalSystemPackage.modules),
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MANIFEST_MISSING",
          level: "fatal",
        }),
      ]),
    );
  });

  it("returns a fatal issue for invalid manifest JSON", async () => {
    const result = await loadSystemPackageFromZipFile(
      zipBlob({
        "manifest.json": "{",
        "pages.json": JSON.stringify(minimalSystemPackage.pages),
        "modules.json": JSON.stringify(minimalSystemPackage.modules),
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MANIFEST_JSON_INVALID",
          level: "fatal",
          path: "manifest.json",
        }),
      ]),
    );
  });

  it("returns a fatal issue for a missing referenced file", async () => {
    const result = await loadSystemPackageFromZipFile(
      createPackageZip({
        manifest: {
          ...createManifest(),
          modules: "missing-modules.json",
        },
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PACKAGE_FILE_MISSING",
          level: "fatal",
          path: "missing-modules.json",
        }),
      ]),
    );
  });

  it("returns a fatal issue when a zip HTML layout file is missing", async () => {
    const result = await loadSystemPackageFromZipFile(
      zipBlob({
        "manifest.json": JSON.stringify(createManifest()),
        "pages.json": JSON.stringify([
          {
            ID: "main",
            名称: "角色卡",
            layout: {
              类型: "htmlTemplate",
              html: "layouts/missing.html",
            },
          },
        ]),
        "modules.json": JSON.stringify(minimalSystemPackage.modules),
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PACKAGE_FILE_MISSING",
          level: "fatal",
          path: "layouts/missing.html",
        }),
      ]),
    );
  });

  it("rejects unsafe manifest paths", async () => {
    const result = await loadSystemPackageFromZipFile(
      createPackageZip({
        manifest: {
          ...createManifest(),
          modules: "../modules.json",
        },
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PACKAGE_PATH_UNSAFE",
          level: "fatal",
        }),
      ]),
    );
  });

  it("returns a fatal issue for unreadable zip input", async () => {
    const result = await loadSystemPackageFromZipFile(new Blob([new Uint8Array([1, 2, 3])], { type: "application/zip" }));

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "ZIP_READ_FAILED",
          level: "fatal",
        }),
      ]),
    );
  });
});

function createManifest() {
  return {
    ...minimalSystemPackage.manifest,
    pages: "pages.json",
    modules: "modules.json",
    assets: [
      {
        ID: "readme",
        路径: "assets/readme.txt",
        类型: "text/plain",
      },
    ],
  };
}

function createPackageZip(
  options: {
    manifest?: unknown;
    modules?: unknown;
    pages?: typeof minimalSystemPackage.pages;
    resources?: unknown;
    dependencies?: unknown;
    validationScripts?: Record<string, string>;
    guide?: unknown;
  } = {},
) {
  return zipBlob({
    "manifest.json": JSON.stringify(options.manifest ?? createManifest()),
    "pages.json": packagePagesJson(options.pages ?? minimalSystemPackage.pages),
    "modules.json": JSON.stringify(options.modules ?? minimalSystemPackage.modules),
    "layouts/main.html": (options.pages ?? minimalSystemPackage.pages)[0].layout.htmlContent,
    "layouts/main.css": (options.pages ?? minimalSystemPackage.pages)[0].layout.cssContent ?? "",
    "assets/readme.txt": "hello",
    ...(options.resources ? { "resources/domains.json": JSON.stringify(options.resources) } : {}),
    ...(options.dependencies ? { "dependencies.json": JSON.stringify(options.dependencies) } : {}),
    ...(options.validationScripts ?? {}),
    ...(options.guide ? { "guides/character-creation.json": JSON.stringify(options.guide) } : {}),
  });
}

function createModuleDemoZip() {
  return zipBlob({
    "manifest.json": JSON.stringify({
      ...moduleDemoSystemPackage.manifest,
      pages: "pages.json",
      modules: "modules.json",
      assets: moduleDemoSystemPackage.assets,
    }),
    "pages.json": packagePagesJson(moduleDemoSystemPackage.pages),
    "modules.json": JSON.stringify(moduleDemoSystemPackage.modules),
    "layouts/main.html": moduleDemoSystemPackage.pages[0].layout.htmlContent,
    "layouts/main.css": moduleDemoSystemPackage.pages[0].layout.cssContent ?? "",
    "assets/demo-emblem.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1 1\"></svg>",
  });
}

function zipBlob(files: Record<string, string>) {
  const entries = Object.fromEntries(Object.entries(files).map(([path, text]) => [path, strToU8(text)]));
  return new Blob([zipSync(entries)], { type: "application/zip" });
}

function packagePagesJson(pages: Array<{ layout: { 类型: string; htmlContent: string; cssContent?: string } } & Record<string, unknown>>) {
  return JSON.stringify(
    pages.map((page) => ({
      ...page,
      layout: {
        类型: page.layout.类型,
        html: "layouts/main.html",
        ...(page.layout.cssContent ? { css: "layouts/main.css" } : {}),
      },
    })),
  );
}
