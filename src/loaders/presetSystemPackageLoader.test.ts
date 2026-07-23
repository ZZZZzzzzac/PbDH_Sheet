import { describe, expect, it, vi } from "vitest";
import { loadPresetSystemPackage, type PresetSystemPackage } from "./presetSystemPackageLoader";

const preset: PresetSystemPackage = {
  id: "preset-test",
  name: "预制测试包",
  version: "1.0.0",
  directory: "preset test",
  files: ["manifest.json", "pages.json", "modules.json", "layouts/main.html"],
};

const packageFiles: Record<string, string> = {
  "manifest.json": JSON.stringify({ ID: preset.id, 名称: preset.name, 版本: preset.version, schemaVersion: "0.2.0", pages: "pages.json", modules: "modules.json" }),
  "pages.json": JSON.stringify([{ ID: "main", 名称: "首页", layout: { 类型: "htmlTemplate", html: "layouts/main.html" } }]),
  "modules.json": JSON.stringify([{ ID: "intro", 类型: "readOnlyDisplay", 标签: "简介", 内容: "Preset" }]),
  "layouts/main.html": "<main><pb-module id=\"intro\"></pb-module></main>",
};

describe("preset System Package loader", () => {
  it("fetches catalog files and runs the shared VFS package pipeline", async () => {
    const fetchFile = vi.fn(async (url: string | URL | Request) => {
      const path = decodeURIComponent(String(url).split("/preset%20test/")[1]);
      return new Response(packageFiles[path], { status: packageFiles[path] === undefined ? 404 : 200 });
    });

    const result = await loadPresetSystemPackage(preset, "/pbdh/", fetchFile as typeof fetch);

    expect(result.ok, JSON.stringify(result.issues)).toBe(true);
    if (!result.ok) return;
    expect(result.package.manifest).toMatchObject({ ID: preset.id, 名称: preset.name, 版本: preset.version });
    expect(fetchFile).toHaveBeenCalledWith("/pbdh/system-packages/preset%20test/manifest.json");
  });

  it("returns an actionable issue when a preset file cannot be fetched", async () => {
    const result = await loadPresetSystemPackage(preset, "/", async () => new Response(null, { status: 404 }));

    expect(result.ok).toBe(false);
    expect(result.issues[0]).toMatchObject({ code: "PRESET_PACKAGE_FETCH_FAILED", level: "fatal" });
  });
});
