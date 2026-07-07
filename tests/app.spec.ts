import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

test("minimal loop edits, autosaves, exports and imports Character JSON", async ({ page }, testInfo) => {
  await page.goto("/");

  const nameInput = page.getByLabel("姓名");
  await expect(nameInput).toBeVisible();
  await nameInput.fill("阿青");
  await expect(page.getByText("已保存")).toBeVisible();

  await page.reload();
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
