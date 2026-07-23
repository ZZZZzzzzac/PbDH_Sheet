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

function presetSystemPackagesPlugin(): Plugin {
  const publicId = "virtual:preset-system-packages";
  const resolvedId = `\0${publicId}`;

  return {
    name: "pbdh-preset-system-packages",
    resolveId(id) {
      return id === publicId ? resolvedId : undefined;
    },
    load(id) {
      if (id !== resolvedId) return undefined;
      const catalog = readdirSync(presetPackagesRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => {
          const root = join(fileURLToPath(presetPackagesRoot), entry.name);
          const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")) as PresetManifest;
          if (!manifest.ID || !manifest.名称 || !manifest.版本) {
            throw new Error(`预制 System Package ${entry.name} 的 manifest 缺少 ID、名称或版本。`);
          }
          return {
            id: manifest.ID,
            name: manifest.名称,
            version: manifest.版本,
            directory: entry.name,
            ...(manifest.加载展示 ? { loadingPresentation: manifest.加载展示 } : {}),
            files: walkPresetFiles(root).map((file) => relative(root, file).replaceAll("\\", "/")),
          };
        })
        .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));
      const duplicateIds = catalog.filter((item, index) => catalog.findIndex((candidate) => candidate.id === item.id) !== index);
      if (duplicateIds.length > 0) throw new Error(`预制 System Package ID 重复：${duplicateIds.map((item) => item.id).join(", ")}`);
      return `export default ${JSON.stringify(catalog)};`;
    },
  };
}

function walkPresetFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walkPresetFiles(path) : [path];
  }).sort();
}

export default defineConfig({
  base: "/pbdh/",
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
