import { describe, expect, it, vi } from "vitest";
import { minimalSystemPackage } from "../test/fixtures";
import { loadSystemPackageFromUrl } from "./systemPackageLoader";

describe("loadSystemPackageFromUrl", () => {
  it("loads and validates a System Package JSON file", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(minimalSystemPackage), { status: 200 }));

    const result = await loadSystemPackageFromUrl("/demo.json", fetchImpl);

    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith("/demo.json");
  });

  it("returns a fatal issue when the package file cannot be loaded", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 404, statusText: "Not Found" }));

    const result = await loadSystemPackageFromUrl("/missing.json", fetchImpl);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PACKAGE_FETCH_FAILED",
          level: "fatal",
        }),
      ]),
    );
  });
});
