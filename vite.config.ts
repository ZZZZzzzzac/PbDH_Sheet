import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };
const presetPackagesRoot = new URL("./public/system-packages/", import.meta.url);

interface PresetManifest {
  ID: string;
  名称: string;
  版本: string;
  加载展示?: { 标语: string; 强调色: string };
}

interface PresetBuildRecord {
  catalog: {
    id: string;
    urlPath: string;
    name: string;
    version: string;
    releaseVersion: string;
    directory: string;
    inventoryPath: string;
    fileCount: number;
    metadataFileCount: number;
    loadingPresentation?: PresetManifest["加载展示"];
  };
  files: string[];
  inventoryJson: string;
}

// 直达链接短路径别名：URL 段 -> 预制包 id。无别名的包直接使用 id 作为路径段。
const presetUrlPathAliases: Record<string, string> = {
  "daggerheart-core": "daggerheart",
  "heart-of-hopefind": "hopefind",
  "hows-my-driving": "driving",
  "witchy-omega-1": "witchy",
};

const presetInventoryFileName = ".pbdh-files.json";

function presetSystemPackagesPlugin(): Plugin {
  const publicId = "virtual:preset-system-packages";
  const resolvedId = `\0${publicId}`;
  const packages = readPresetBuildRecords();
  let resolvedBase = "/";

  return {
    name: "pbdh-preset-system-packages",
    configResolved(config) {
      resolvedBase = config.base;
    },
    configureServer(server) {
      const inventories = new Map(packages.map((item) => [
        `${resolvedBase}system-packages/${encodeURIComponent(item.catalog.directory)}/${presetInventoryFileName}`,
        item.inventoryJson,
      ]));
      server.middlewares.use((request, response, next) => {
        if (!request.url) return next();
        const pathname = new URL(request.url, "http://localhost").pathname;
        const inventory = inventories.get(pathname);
        if (inventory === undefined) return next();
        response.statusCode = 200;
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.setHeader("Cache-Control", "no-cache");
        response.end(inventory);
      });
    },
    resolveId(id) {
      return id === publicId ? resolvedId : undefined;
    },
    load(id) {
      if (id !== resolvedId) return undefined;
      const catalog = packages.map((item) => item.catalog);
      const duplicateIds = catalog.filter((item, index) => catalog.findIndex((candidate) => candidate.id === item.id) !== index);
      if (duplicateIds.length > 0) throw new Error(`预制 System Package ID 重复：${duplicateIds.map((item) => item.id).join(", ")}`);
      return `export default ${JSON.stringify(catalog)};`;
    },
    generateBundle() {
      for (const item of packages) {
        this.emitFile({
          type: "asset",
          fileName: `system-packages/${item.catalog.directory}/${presetInventoryFileName}`,
          source: item.inventoryJson,
        });
      }
    },
  };
}

function readPresetBuildRecords(): PresetBuildRecord[] {
  return readdirSync(presetPackagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const root = join(fileURLToPath(presetPackagesRoot), entry.name);
      const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")) as PresetManifest;
      if (!manifest.ID || !manifest.名称 || !manifest.版本) {
        throw new Error(`预制 System Package ${entry.name} 的 manifest 缺少 ID、名称或版本。`);
      }
      const files = walkPresetFiles(root).map((file) => relative(root, file).replaceAll("\\", "/"));
      return {
        catalog: {
          id: manifest.ID,
          urlPath: presetUrlPathAliases[manifest.ID] ?? manifest.ID,
          name: manifest.名称,
          version: manifest.版本,
          releaseVersion: packageJson.version,
          directory: entry.name,
          inventoryPath: presetInventoryFileName,
          fileCount: files.length,
          metadataFileCount: files.filter((file) => !file.startsWith("assets/")).length,
          ...(manifest.加载展示 ? { loadingPresentation: manifest.加载展示 } : {}),
        },
        files,
        inventoryJson: `${JSON.stringify({ schemaVersion: 1, files })}\n`,
      };
    })
    .sort((left, right) => left.catalog.name.localeCompare(right.catalog.name, "zh-CN"));
}

function walkPresetFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walkPresetFiles(path) : [path];
  }).sort();
}

export default defineConfig({
  base: "/pbdh/",
  define: {
    __PBDH_VERSION__: JSON.stringify(packageJson.version),
  },
  plugins: [
    react(),
    presetSystemPackagesPlugin(),
    {
      name: "pbdh-release-version",
      transformIndexHtml() {
        return [{ tag: "meta", attrs: { name: "pbdh-version", content: packageJson.version }, injectTo: "head" }];
      },
    },
  ],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    globals: true,
    css: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
