import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { zipSync } from "fflate";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

test("invalid System Package fixture missing-manifest.zip shows MANIFEST_MISSING", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadPackage(page, await packageArchive(
    testInfo,
    path.join(errorFixtureRoot, "missing-manifest"),
    "missing-manifest.zip",
  ));

  await expect(page.getByRole("alert", { name: "System Package error" })).toContainText("MANIFEST_MISSING");
  await expect(page.getByLabel("Sheet Tool", { exact: true })).toHaveAttribute("data-system-package-id", "daggerheart-core");
});

test("invalid System Package zip keeps the current sheet when one is already loaded", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadPackage(page, await packageArchive(
    testInfo,
    path.join(process.cwd(), "templates", "system-package-minimal"),
    "demo-minimal.zip",
  ));
  await expect(page.getByLabel("Sheet Tool", { exact: true })).toHaveAttribute("data-system-package-id", "demo-minimal");
  await page.getByLabel("姓名").fill("阿青");
  await waitForAutosave(page, "character-name", "阿青");

  await uploadPackage(page, await packageArchive(
    testInfo,
    path.join(errorFixtureRoot, "missing-manifest"),
    "missing-manifest.zip",
  ));

  await expect(page.getByRole("alert", { name: "System Package error" })).toContainText("MANIFEST_MISSING");
  await expect(page.locator('[data-module-id="character-name"]')).toContainText("阿青");
});

test("invalid cached System Package is cleared before falling back to the default preset", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await putInvalidCachedPackage(page);
  await page.reload();

  await expect(page.getByRole("button", { name: /System Package zip/ })).toBeEnabled();
  await expect(page.getByLabel("Sheet Tool", { exact: true })).toHaveAttribute("data-system-package-id", "daggerheart-core");
  expect(pageErrors).toEqual([]);

  await page.reload();
  await expect(page.getByLabel("Sheet Tool", { exact: true })).toHaveAttribute("data-system-package-id", "daggerheart-core");
  expect(pageErrors).toEqual([]);
});

const errorFixtureRoot = path.join(process.cwd(), "tests", "fixtures", "system-packages", "errors");

async function uploadPackage(page: Page, packagePath: string) {
  await page.getByRole("button", { name: "系统包", exact: true }).click();
  const packageChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /System Package zip/ }).click();
  const packageChooser = await packageChooserPromise;
  await packageChooser.setFiles(packagePath);
}

async function waitForAutosave(page: Page, moduleId: string, expected: string) {
  await expect.poll(() => page.evaluate(async ({ moduleId, expected }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("pbdh-sheet");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const records = await new Promise<Array<{ data?: { character?: { values?: Record<string, unknown> } } }>>((resolve, reject) => {
        const request = db.transaction("characterSaves", "readonly").objectStore("characterSaves").getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      return records.some((record) => record.data?.character?.values?.[moduleId] === expected);
    } finally {
      db.close();
    }
  }, { moduleId, expected })).toBe(true);
}

async function putInvalidCachedPackage(page: Page) {
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("pbdh-sheet");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      if (!db.objectStoreNames.contains("systemPackages")) {
        db.close();
        reject(new Error("systemPackages object store missing"));
        return;
      }

      const transaction = db.transaction("systemPackages", "readwrite");
      transaction.objectStore("systemPackages").put({
        id: "current-system-package",
        packageId: "invalid-current-contract",
        data: {
          manifest: { ID: "invalid-current-contract", 名称: "无效缓存包", 版本: "1.0.0", schemaVersion: "0.2.0" },
          pages: [{
            ID: "main",
            名称: "Main",
            layout: {
              类型: "htmlTemplate",
              html: "layouts/main.html",
              htmlContent: '<pb-module id="broken-module"></pb-module>',
            },
          }],
          modules: [{ ID: "broken-module", 类型: "unknownModule", 标签: "无效模块" }],
        },
      });
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
      transaction.onabort = () => {
        db.close();
        reject(transaction.error);
      };
    });
  });
}

async function packageArchive(testInfo: TestInfo, packageRoot: string, fileName: string): Promise<string> {
  const files = Object.fromEntries(
    await Promise.all((await walkFiles(packageRoot)).map(async (file) => [
      path.relative(packageRoot, file).replaceAll("\\", "/"),
      await readFile(file),
    ])),
  );
  const packagePath = path.join(testInfo.outputDir, fileName);
  await mkdir(testInfo.outputDir, { recursive: true });
  await writeFile(packagePath, zipSync(files));
  return packagePath;
}

async function walkFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(entryPath) : [entryPath];
  }))).flat();
}
