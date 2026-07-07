import { expect, test, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

test("minimal loop edits, autosaves, exports and imports Character JSON", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByText("未加载")).toBeVisible();
  await expect(page.getByLabel("Sheet Tool")).not.toBeVisible();

  await uploadPackage(page, demoPackagePath());

  const nameInput = page.getByLabel("姓名");
  await expect(nameInput).toBeVisible();
  await nameInput.fill("阿青");
  await expect(page.getByText("已保存")).toBeVisible();

  await page.reload();
  await expect(page.getByText("demo-minimal")).toBeVisible();
  await expect(page.getByLabel("姓名")).toHaveValue("阿青");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 Character JSON" }).click();
  const download = await downloadPromise;
  const exportPath = path.join(testInfo.outputDir, "character.json");
  await download.saveAs(exportPath);

  await page.getByLabel("姓名").fill("改坏的名字");
  await expect(page.getByText("已保存")).toBeVisible();

  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "导入 Character JSON" }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(exportPath);

  await expect(page.getByLabel("姓名")).toHaveValue("阿青");
  await expect(page.getByText("Character Data 已导入。")).toBeVisible();
});

test("malformed import shows an error and keeps current Character Data", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadPackage(page, demoPackagePath());
  await page.getByLabel("姓名").fill("阿青");
  await expect(page.getByText("已保存")).toBeVisible();

  const badJsonPath = path.join(testInfo.outputDir, "bad.json");
  await mkdir(testInfo.outputDir, { recursive: true });
  await writeFile(badJsonPath, "{", "utf8");

  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "导入 Character JSON" }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(badJsonPath);

  await expect(page.getByRole("alert")).toContainText("JSON 格式错误");
  await expect(page.getByLabel("姓名")).toHaveValue("阿青");
});

test("uploads a minimal System Package zip and keeps the Character JSON loop", async ({ page }, testInfo) => {
  await page.goto("/");
  await uploadPackage(page, demoPackagePath());

  await expect(page.getByText("demo-minimal")).toBeVisible();
  await page.getByLabel("姓名").fill("Zip阿青");
  await expect(page.getByText("已保存")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 Character JSON" }).click();
  const download = await downloadPromise;
  const exportPath = path.join(testInfo.outputDir, "zip-character.json");
  await download.saveAs(exportPath);

  await page.getByLabel("姓名").fill("临时名字");
  await expect(page.getByText("已保存")).toBeVisible();

  const characterChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "导入 Character JSON" }).click();
  const characterChooser = await characterChooserPromise;
  await characterChooser.setFiles(exportPath);
  await expect(page.getByLabel("姓名")).toHaveValue("Zip阿青");
  await page.waitForTimeout(400);

  await page.reload();
  await expect(page.getByText("demo-minimal")).toBeVisible();
  await expect(page.getByLabel("姓名")).toHaveValue("Zip阿青");
});

const errorFixtures = [
  ["corrupt.zip", "ZIP_READ_FAILED"],
  ["missing-manifest.zip", "MANIFEST_MISSING"],
  ["invalid-manifest-json.zip", "MANIFEST_JSON_INVALID"],
  ["missing-modules-file.zip", "PACKAGE_FILE_MISSING"],
  ["unsafe-modules-path.zip", "PACKAGE_PATH_UNSAFE"],
  ["missing-module-reference.zip", "MISSING_MODULE_REFERENCE"],
] as const;

for (const [fileName, expectedCode] of errorFixtures) {
  test(`invalid System Package fixture ${fileName} shows ${expectedCode}`, async ({ page }) => {
    await page.goto("/");
    await uploadPackage(page, errorFixturePath(fileName));

    await expect(page.getByRole("alert", { name: "System Package error" })).toContainText(expectedCode);
    await expect(page.getByLabel("Sheet Tool")).not.toBeVisible();
  });
}

test("invalid System Package zip keeps the current sheet when one is already loaded", async ({ page }) => {
  await page.goto("/");
  await uploadPackage(page, demoPackagePath());
  await page.getByLabel("姓名").fill("阿青");

  await uploadPackage(page, errorFixturePath("missing-manifest.zip"));

  await expect(page.getByRole("alert", { name: "System Package error" })).toContainText("MANIFEST_MISSING");
  await expect(page.getByLabel("姓名")).toHaveValue("阿青");
});

async function uploadPackage(page: Page, packagePath: string) {
  const packageChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "导入 System Package zip" }).click();
  const packageChooser = await packageChooserPromise;
  await packageChooser.setFiles(packagePath);
}

function demoPackagePath() {
  return path.join(process.cwd(), "public", "system-packages", "demo-minimal.zip");
}

function errorFixturePath(fileName: string) {
  return path.join(process.cwd(), "public", "system-packages", "error-fixtures", fileName);
}
