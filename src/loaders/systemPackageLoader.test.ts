import { describe, expect, it, vi } from "vitest";
import { strToU8, zipSync } from "fflate";
import { minimalSystemPackage } from "../test/fixtures";
import { loadSystemPackageFromUrl, loadSystemPackageFromZipFile } from "./systemPackageLoader";

describe("loadSystemPackageFromUrl", () => {
  it("loads and validates a static System Package directory", async () => {
    const fetchImpl = createPackageFetch();

    const result = await loadSystemPackageFromUrl("/system-packages/demo-minimal", fetchImpl);

    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith("/system-packages/demo-minimal/manifest.json");
    expect(fetchImpl).toHaveBeenCalledWith("/system-packages/demo-minimal/pages.json");
    expect(fetchImpl).toHaveBeenCalledWith("/system-packages/demo-minimal/modules.json");
    if (result.ok) {
      expect(result.package).toEqual(minimalSystemPackage);
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
      expect(result.package.pages[0].sections[0].modules).toEqual(["character-name"]);
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

function createPackageZip(options: { manifest?: unknown } = {}) {
  return zipBlob({
    "manifest.json": JSON.stringify(options.manifest ?? createManifest()),
    "pages.json": JSON.stringify(minimalSystemPackage.pages),
    "modules.json": JSON.stringify(minimalSystemPackage.modules),
    "assets/readme.txt": "hello",
  });
}

function zipBlob(files: Record<string, string>) {
  const entries = Object.fromEntries(Object.entries(files).map(([path, text]) => [path, strToU8(text)]));
  return new Blob([zipSync(entries)], { type: "application/zip" });
}

function createPackageFetch(options: { manifest?: unknown } = {}) {
  const files: Record<string, string> = {
    "/system-packages/demo-minimal/manifest.json": JSON.stringify(options.manifest ?? createManifest()),
    "/system-packages/demo-minimal/pages.json": JSON.stringify(minimalSystemPackage.pages),
    "/system-packages/demo-minimal/modules.json": JSON.stringify(minimalSystemPackage.modules),
  };

  return vi.fn(async (url: string | URL | Request) => {
    const key = String(url);
    const body = files[key];
    return body === undefined ? new Response("", { status: 404, statusText: "Not Found" }) : new Response(body, { status: 200 });
  });
}
