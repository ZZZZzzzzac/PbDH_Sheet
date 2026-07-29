import { readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(repoRoot, "dist");
const html = readFileSync(resolve(distDir, "index.html"), "utf8");
const entryUrl = readModuleEntry(html);
const eagerUrls = [entryUrl, ...readModulePreloads(html)];
const eagerFiles = [...new Set(eagerUrls.map(resolveBuiltAsset))];
const entryFile = resolveBuiltAsset(entryUrl);

const entryBytes = statSync(entryFile).size;
const eagerBytes = eagerFiles.reduce((total, file) => total + statSync(file).size, 0);
const eagerGzipBytes = eagerFiles.reduce((total, file) => total + gzipSync(readFileSync(file)).byteLength, 0);
const failures = [];

checkLimit("入口 JS", entryBytes, 500 * 1024);
checkLimit("首屏 JS", eagerBytes, 600 * 1024);
checkLimit("首屏 gzip JS", eagerGzipBytes, 190 * 1024);

for (const file of eagerFiles) {
  if (readFileSync(file, "utf8").includes("assets/cards/")) {
    failures.push(`首屏 JS 不应内嵌卡图文件清单：${relative(distDir, file)}`);
  }
}

console.log(
  `Bundle budget: entry ${formatBytes(entryBytes)}, eager ${formatBytes(eagerBytes)}, eager gzip ${formatBytes(eagerGzipBytes)}.`,
);

if (failures.length > 0) {
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
}

function readModuleEntry(document) {
  const tag = document.match(/<script\b[^>]*\btype=["']module["'][^>]*>/i)?.[0];
  const source = tag && readAttribute(tag, "src");
  if (!source) throw new Error("dist/index.html 中没有 module 入口脚本。");
  return source;
}

function readModulePreloads(document) {
  return [...document.matchAll(/<link\b[^>]*\brel=["']modulepreload["'][^>]*>/gi)]
    .map(([tag]) => readAttribute(tag, "href"))
    .filter((value) => value !== null);
}

function readAttribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, "i"))?.[1] ?? null;
}

function resolveBuiltAsset(url) {
  const segments = url.replace(/[?#].*$/, "").split("/").filter(Boolean);
  const assetsIndex = segments.lastIndexOf("assets");
  if (assetsIndex < 0) throw new Error(`无法定位构建资源：${url}`);
  return resolve(distDir, ...segments.slice(assetsIndex));
}

function checkLimit(label, actual, limit) {
  if (actual > limit) failures.push(`${label} ${formatBytes(actual)} 超过预算 ${formatBytes(limit)}`);
}

function formatBytes(bytes) {
  return `${(bytes / 1000).toFixed(2)} kB`;
}
