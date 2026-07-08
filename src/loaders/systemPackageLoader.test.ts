import { describe, expect, it, vi } from "vitest";
import { strToU8, zipSync } from "fflate";
import { minimalSystemPackage, moduleDemoSystemPackage } from "../test/fixtures";
import { loadSystemPackageFromUrl, loadSystemPackageFromZipFile } from "./systemPackageLoader";

describe("loadSystemPackageFromUrl", () => {
  it("loads and validates a static System Package directory", async () => {
    const fetchImpl = createPackageFetch();

    const result = await loadSystemPackageFromUrl("/system-packages/demo-minimal", fetchImpl);

    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith("/system-packages/demo-minimal/manifest.json");
    expect(fetchImpl).toHaveBeenCalledWith("/system-packages/demo-minimal/pages.json");
    expect(fetchImpl).toHaveBeenCalledWith("/system-packages/demo-minimal/layouts/main.html");
    expect(fetchImpl).toHaveBeenCalledWith("/system-packages/demo-minimal/layouts/main.css");
    expect(fetchImpl).toHaveBeenCalledWith("/system-packages/demo-minimal/modules.json");
    expect(fetchImpl).not.toHaveBeenCalledWith("/system-packages/demo-minimal/assets/readme.txt");
    if (result.ok) {
      expect(result.package.manifest).toEqual(minimalSystemPackage.manifest);
      expect(result.package.pages).toEqual(minimalSystemPackage.pages);
      expect(result.package.modules).toEqual(minimalSystemPackage.modules);
      expect(result.package.assets?.[0]).toEqual({ ID: "readme", 路径: "assets/readme.txt", 类型: "text/plain" });
      expect(result.packageAssets).toBeUndefined();
    }
  });

  it("normalizes static directory and zip packages to the same System Package", async () => {
    const directoryResult = await loadSystemPackageFromUrl("/system-packages/demo-minimal", createPackageFetch());
    const zipResult = await loadSystemPackageFromZipFile(createPackageZip());

    expect(directoryResult.ok).toBe(true);
    expect(zipResult.ok).toBe(true);
    if (directoryResult.ok && zipResult.ok) {
      expect(zipResult.package).toEqual(directoryResult.package);
    }
  });

  it("loads Resource Library and Dependency JSON files from static directory and zip packages", async () => {
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
        触发: { 类型: "resourceSelected", 来源模块ID: "domain-pick" },
        动作: [{ 类型: "fillText", 目标模块ID: "domain-name", 资源字段: "名称" }],
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
    const fetchImpl = createPackageFetch({ manifest, modules, pages, resources, dependencies });
    const directoryResult = await loadSystemPackageFromUrl("/system-packages/demo-minimal", fetchImpl);
    const zipResult = await loadSystemPackageFromZipFile(
      createPackageZip({
        manifest,
        modules,
        pages,
        resources,
        dependencies,
      }),
    );

    expect(directoryResult.ok).toBe(true);
    expect(zipResult.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith("/system-packages/demo-minimal/resources/domains.json");
    expect(fetchImpl).toHaveBeenCalledWith("/system-packages/demo-minimal/dependencies.json");
    if (directoryResult.ok && zipResult.ok) {
      expect(directoryResult.package.resourceLibraries?.[0].entries[0].fields.名称).toBe("利刃一");
      expect(directoryResult.package.dependencies?.[0].动作[0].目标模块ID).toBe("domain-name");
      expect(zipResult.package).toEqual(directoryResult.package);
    }
  });

  it("returns a fatal issue when the static manifest cannot be loaded", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 404, statusText: "Not Found" }));

    const result = await loadSystemPackageFromUrl("/missing", fetchImpl);

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

  it("returns a fatal issue when a static package reference cannot be loaded", async () => {
    const fetchImpl = createPackageFetch({
      manifest: {
        ...createManifest(),
        modules: "missing-modules.json",
      },
    });

    const result = await loadSystemPackageFromUrl("/system-packages/demo-minimal", fetchImpl);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PACKAGE_FETCH_FAILED",
          level: "fatal",
          path: "missing-modules.json",
        }),
      ]),
    );
  });

  it("returns a fatal issue when a static HTML layout file cannot be loaded", async () => {
    const fetchImpl = createPackageFetch({
      pages: [
        {
          ID: "main",
          名称: "角色卡",
          layout: {
            类型: "htmlTemplate",
            html: "layouts/missing.html",
          },
        },
      ],
    });

    const result = await loadSystemPackageFromUrl("/system-packages/demo-minimal", fetchImpl);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PACKAGE_FETCH_FAILED",
          level: "fatal",
          path: "layouts/missing.html",
        }),
      ]),
    );
  });

  it("loads a static HTML layout without optional CSS", async () => {
    const fetchImpl = createPackageFetch({
      pages: [
        {
          ID: "main",
          名称: "角色卡",
          layout: {
            类型: "htmlTemplate",
            html: "layouts/main.html",
          },
        },
      ],
    });

    const result = await loadSystemPackageFromUrl("/system-packages/demo-minimal", fetchImpl);

    expect(result.ok).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalledWith("/system-packages/demo-minimal/layouts/main.css");
    if (result.ok) {
      expect(result.package.pages[0].layout.cssContent).toBeUndefined();
    }
  });

  it("rejects unsafe static package references", async () => {
    const fetchImpl = createPackageFetch({
      manifest: {
        ...createManifest(),
        modules: "../modules.json",
      },
    });

    const result = await loadSystemPackageFromUrl("/system-packages/demo-minimal", fetchImpl);

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

  it("loads a minimal System Package zip through its manifest", async () => {
    const result = await loadSystemPackageFromZipFile(createPackageZip());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.package.manifest.ID).toBe("demo-minimal");
      expect(result.package.pages[0].layout.类型).toBe("htmlTemplate");
      expect(result.package.pages[0].layout.htmlContent).toContain("<pb-module id=\"character-name\"");
    }
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
  options: { manifest?: unknown; modules?: unknown; pages?: typeof minimalSystemPackage.pages; resources?: unknown; dependencies?: unknown } = {},
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

function createPackageFetch(options: { manifest?: unknown; modules?: unknown; pages?: unknown[]; resources?: unknown; dependencies?: unknown } = {}) {
  const pageLayout = (options.pages?.[0] as { layout?: { htmlContent?: string; cssContent?: string } } | undefined)?.layout;
  const files: Record<string, string> = {
    "/system-packages/demo-minimal/manifest.json": JSON.stringify(options.manifest ?? createManifest()),
    "/system-packages/demo-minimal/pages.json": options.pages ? JSON.stringify(options.pages) : packagePagesJson(minimalSystemPackage.pages),
    "/system-packages/demo-minimal/modules.json": JSON.stringify(options.modules ?? minimalSystemPackage.modules),
    "/system-packages/demo-minimal/layouts/main.html": pageLayout?.htmlContent ?? minimalSystemPackage.pages[0].layout.htmlContent,
    "/system-packages/demo-minimal/layouts/main.css": pageLayout?.cssContent ?? minimalSystemPackage.pages[0].layout.cssContent ?? "",
    "/system-packages/demo-minimal/assets/readme.txt": "hello",
  };

  if (options.resources) {
    files["/system-packages/demo-minimal/resources/domains.json"] = JSON.stringify(options.resources);
  }
  if (options.dependencies) {
    files["/system-packages/demo-minimal/dependencies.json"] = JSON.stringify(options.dependencies);
  }

  return vi.fn(async (url: string | URL | Request) => {
    const key = String(url);
    const body = files[key];
    return body === undefined
      ? new Response("", { status: 404, statusText: "Not Found" })
      : new Response(body, { status: 200, headers: { "content-type": key.endsWith(".txt") ? "text/plain" : "application/json" } });
  });
}

function packagePagesJson(pages: Array<{ layout: { 类型: "htmlTemplate"; html: string; css?: string } } & Record<string, unknown>>) {
  return JSON.stringify(
    pages.map((page) => ({
      ...page,
      layout: {
        类型: page.layout.类型,
        html: page.layout.html,
        css: page.layout.css,
      },
    })),
  );
}
