import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function assertVersion(version) {
  if (!VERSION_PATTERN.test(version)) {
    throw new Error(`版本号必须是 X.Y.Z，收到：${version}`);
  }
}

export function assertReleaseTag(tag, version) {
  assertVersion(version);
  const expected = `v${version}`;
  if (tag !== expected) {
    throw new Error(`Release tag 与 package.json.version 不一致：期望 ${expected}，收到 ${tag}`);
  }
}

export function verifyBuildHtml(html, version) {
  assertVersion(version);
  const versionMeta = `<meta name="pbdh-version" content="${version}">`;
  if (!html.includes(versionMeta)) {
    throw new Error(`构建产物缺少版本标记：${versionMeta}`);
  }

  const rootReferences = [...html.matchAll(/\b(?:src|href)=["'](\/[^"'#?]*)/g)].map((match) => match[1]);
  const invalidReferences = rootReferences.filter((reference) => !reference.startsWith("/pbdh/"));
  if (invalidReferences.length > 0) {
    throw new Error(`构建产物包含站点根路径资源：${invalidReferences.join(", ")}`);
  }
  if (!rootReferences.some((reference) => reference.startsWith("/pbdh/assets/"))) {
    throw new Error("构建产物没有 /pbdh/assets/ 入口资源。");
  }
}

async function readProjectVersions() {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  const packageLock = JSON.parse(await readFile("package-lock.json", "utf8"));
  const lockVersion = packageLock.packages?.[""]?.version;
  if (packageJson.version !== lockVersion) {
    throw new Error(`package.json.version (${packageJson.version}) 与 package-lock.json (${lockVersion}) 不一致。`);
  }
  return packageJson.version;
}

async function main() {
  const [command, argument] = process.argv.slice(2);

  if (command === "check-version") {
    if (!argument) throw new Error("缺少版本号参数。");
    assertVersion(argument);
    console.log(`版本号已验证：${argument}`);
    return;
  }

  if (command === "check-tag") {
    if (!argument) throw new Error("缺少 Release tag 参数。");
    const version = await readProjectVersions();
    assertReleaseTag(argument, version);
    console.log(`Release tag 已验证：${argument}`);
    return;
  }

  if (command === "verify-build") {
    const version = await readProjectVersions();
    const html = await readFile(argument ?? "dist/index.html", "utf8");
    verifyBuildHtml(html, version);
    console.log(`构建产物已验证：/pbdh/，版本 ${version}`);
    return;
  }

  throw new Error(`未知命令：${command ?? "<empty>"}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
