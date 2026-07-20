import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

export default defineConfig({
  base: "/pbdh/",
  plugins: [
    react(),
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
